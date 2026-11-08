create table if not exists public.kyc_photo_sessions (
  id uuid primary key default gen_random_uuid(), profile_id text not null references public.profiles(id),
  issued_at timestamptz not null default now(), expires_at timestamptz not null default now()+interval '15 minutes', consumed_at timestamptz
);
alter table public.kyc_photo_sessions enable row level security;
alter table public.kyc_photo_sessions add column if not exists capture_version integer not null default 1;
revoke all on public.kyc_photo_sessions from anon,authenticated;
grant all on public.kyc_photo_sessions to service_role;
alter table public.kyc_submissions add column if not exists declared_expiry date;
alter table public.kyc_submissions add column if not exists review_due_at timestamptz;
alter table public.kyc_submissions add column if not exists reviewed_at timestamptz;
alter table public.kyc_submissions add column if not exists superseded_at timestamptz;
alter table public.kyc_submissions add column if not exists photo_session_id uuid references public.kyc_photo_sessions(id);
alter table public.kyc_submissions alter column review_due_at set default now()+interval '3 days';
update public.kyc_submissions set provider='MANUAL',checks=coalesce(checks,'{}')||'{"eligible":false,"manualReview":true}',review_due_at=coalesce(review_due_at,created_at+interval '3 days'),reason='Hồ sơ đang chờ admin kiểm duyệt. Cần bổ sung đủ số căn cước và ngày hết hạn theo mẫu khai báo.'
where status in ('QUEUED','PROCESSING','REVIEW') and provider is distinct from 'MANUAL';
update public.kyc_submissions set status='REVIEW' where status in ('QUEUED','PROCESSING') and provider='MANUAL';
update public.kyc_submissions set review_due_at=created_at+interval '3 days' where status='REVIEW' and review_due_at is null;
update public.kyc_submissions s set superseded_at=now() where s.status='REVIEW' and s.superseded_at is null and exists(select 1 from public.kyc_submissions later where later.profile_id=s.profile_id and later.status='REVIEW' and (later.created_at,later.id)>(s.created_at,s.id));
create unique index if not exists kyc_one_manual_pending on public.kyc_submissions(profile_id) where provider='MANUAL' and status='REVIEW' and superseded_at is null;
create index if not exists kyc_review_by_deadline on public.kyc_submissions(review_due_at) where status='REVIEW' and superseded_at is null;
create or replace function public.reloo_submit_manual_kyc(p_profile text,p_id uuid,p_national text,p_hash text,p_expiry date,p_paths jsonb,p_session uuid) returns timestamptz
language plpgsql security definer set search_path=public as $$
declare deadline timestamptz;
begin
  perform 1 from profiles where id=p_profile for update;
  if not found or exists(select 1 from profiles where id=p_profile and activation_status='RESTRICTED') then raise exception 'ACCOUNT_RESTRICTED';end if;
  if p_expiry is null or p_expiry<(now() at time zone 'Asia/Ho_Chi_Minh')::date or p_hash !~ '^[a-f0-9]{64}$' or length(p_national)<20 then raise exception 'DECLARATION_REQUIRED';end if;
  if p_paths->>'front' is distinct from p_id::text||'-front.enc' or p_paths->>'back' is distinct from p_id::text||'-back.enc' or p_paths->>'selfie' is distinct from p_id::text||'-selfie.enc' or p_paths->>'portraitSource' is distinct from 'CAMERA_CAPTURE' or p_paths->>'mode' is distinct from 'MANUAL' or p_paths ? 'video' then raise exception 'THREE_PHOTOS_REQUIRED';end if;
  perform 1 from kyc_photo_sessions where id=p_session and profile_id=p_profile and consumed_at is null and issued_at<=now() and expires_at>now() and capture_version=2 for update;
  if not found then raise exception 'PHOTO_SESSION_EXPIRED';end if;
  update kyc_photo_sessions set consumed_at=now() where id=p_session;
  update kyc_submissions set superseded_at=now() where profile_id=p_profile and status in ('QUEUED','PROCESSING','REVIEW') and superseded_at is null;
  deadline=now()+interval '3 days';
  insert into kyc_submissions(id,profile_id,national_id_encrypted,national_id_hash,declared_expiry,document_paths,photo_session_id,consent_at,status,provider,checks,review_due_at,reason)
  values(p_id,p_profile,p_national,p_hash,p_expiry,p_paths,p_session,now(),'REVIEW','MANUAL','{"eligible":false,"manualReview":true}',deadline,'Hồ sơ đã tiếp nhận. Admin kiểm duyệt tối đa 3 ngày.');
  insert into security_audit(actor_id,subject_id,action,details) values(p_profile,p_profile,'KYC_MANUAL_SUBMITTED',jsonb_build_object('id',p_id,'reviewDueAt',deadline,'portraitSource','CAMERA_CAPTURE'));
  return deadline;
end $$;
create or replace function public.reloo_review_kyc(p_actor text,p_id uuid,p_action text,p_reason text) returns void
language plpgsql security definer set search_path=public as $$
declare item kyc_submissions; subject text;
begin
  if not reloo_staff_permission(p_actor,'kyc.write') then raise exception 'PERMISSION_REQUIRED';end if;
  select profile_id into subject from kyc_submissions where id=p_id;
  perform 1 from profiles where id=subject for update;
  select * into item from kyc_submissions where id=p_id and status='REVIEW' and superseded_at is null and (expires_at is null or expires_at>now()) for update;
  if not found or p_action not in ('APPROVED','REJECTED') or length(trim(p_reason))<20 then raise exception 'INVALID_REVIEW';end if;
  if p_action='APPROVED' then
    if item.declared_expiry is null or item.declared_expiry<(now() at time zone 'Asia/Ho_Chi_Minh')::date then raise exception 'VALID_EXPIRY_REQUIRED';end if;
    if exists(select 1 from unnest(array['front','back','selfie']) kind where not exists(select 1 from security_audit where actor_id=p_actor and action='KYC_DOCUMENT_VIEWED' and details->>'id'=p_id::text and details->>'kind'=kind)) then raise exception 'REVIEW_ALL_DOCUMENTS';end if;
  end if;
  update kyc_submissions set status=p_action,reason=p_reason,reviewed_by=p_actor,reviewed_at=now() where id=p_id;
  if p_action='APPROVED' then update profiles set kyc_level='L2' where id=item.profile_id;end if;
  insert into security_audit(actor_id,subject_id,action,details) values(p_actor,item.profile_id,'KYC_'||p_action,jsonb_build_object('id',p_id,'reason',p_reason,'method','MANUAL'));
end $$;
create or replace function public.reloo_review_kyc_identity(p_actor text,p_id uuid,p_reason text,p_fields text,p_holder_hash text,p_national_hash text) returns void
language plpgsql security definer set search_path=public as $$
declare item kyc_submissions; prior verified_identities; expiry timestamptz; subject text;
begin
  if not reloo_staff_permission(p_actor,'kyc.write') then raise exception 'PERMISSION_REQUIRED';end if;
  select profile_id into subject from kyc_submissions where id=p_id;
  perform 1 from profiles where id=subject for update;
  select * into item from kyc_submissions where id=p_id for update;if not found then raise exception 'SUBMISSION_REQUIRED';end if;
  if p_national_hash is distinct from item.national_id_hash then raise exception 'DECLARED_NUMBER_MISMATCH';end if;
  select * into prior from verified_identities where profile_id=item.profile_id for update;
  if prior.national_id_hash is not null and prior.national_id_hash<>p_national_hash then raise exception 'IDENTITY_CHANGE_REQUIRES_SEPARATE_REVIEW';end if;
  perform reloo_review_kyc(p_actor,p_id,'APPROVED',p_reason);
  expiry=((item.declared_expiry+1)::timestamp at time zone 'Asia/Ho_Chi_Minh');
  insert into verified_identities(profile_id,submission_id,fields_encrypted,holder_name_hash,national_id_hash,expires_at) values(item.profile_id,p_id,p_fields,p_holder_hash,p_national_hash,expiry)
  on conflict(profile_id) do update set submission_id=p_id,fields_encrypted=p_fields,holder_name_hash=p_holder_hash,national_id_hash=p_national_hash,expires_at=expiry,verified_at=now();
  update profile_bank_accounts set name_status='DECLARED_NAME_MATCH' where profile_id=item.profile_id and holder_name_hash=p_holder_hash;
end $$;
create unique index if not exists kyc_overdue_audit_once on public.security_audit((details->>'id')) where action='KYC_REVIEW_OVERDUE';
create or replace function public.reloo_mark_overdue_kyc() returns void language plpgsql security definer set search_path=public as $$
begin
  insert into security_audit(subject_id,action,details)
  select profile_id,'KYC_REVIEW_OVERDUE',jsonb_build_object('id',id,'reviewDueAt',review_due_at) from kyc_submissions where status='REVIEW' and superseded_at is null and review_due_at<now() and (expires_at is null or expires_at>now())
  on conflict do nothing;
end $$;
revoke all on function public.reloo_submit_manual_kyc(text,uuid,text,text,date,jsonb,uuid),public.reloo_review_kyc(text,uuid,text,text),public.reloo_review_kyc_identity(text,uuid,text,text,text,text),public.reloo_mark_overdue_kyc() from public,anon,authenticated;
grant execute on function public.reloo_submit_manual_kyc(text,uuid,text,text,date,jsonb,uuid),public.reloo_review_kyc(text,uuid,text,text),public.reloo_review_kyc_identity(text,uuid,text,text,text,text),public.reloo_mark_overdue_kyc() to service_role;
notify pgrst,'reload schema';
