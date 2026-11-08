alter table public.kyc_submissions alter column expires_at drop not null;
alter table public.kyc_submissions alter column expires_at drop default;
update public.kyc_submissions set expires_at=null where status<>'EXPIRED';
alter table public.profiles add column if not exists deleted_at timestamptz;
create or replace function public.reloo_assert_active(p_profile_id text) returns void language plpgsql security definer set search_path=public as $$
begin
 perform 1 from profiles where id=p_profile_id for share;
 if exists(select 1 from verified_identities where profile_id=p_profile_id and expires_at<=now()) then raise exception 'IDENTITY_EXPIRED' using errcode='42501';end if;
 if not exists(select 1 from profiles where id=p_profile_id and deleted_at is null and status='active' and activation_status='ACTIVE' and screening_valid_until>now() and reloo_normalize_phone(phone) is not null)
 or exists(select 1 from risk_cases where profile_id=p_profile_id and status<>'CLEARED')
 or exists(select 1 from risk_blacklist where profile_id=p_profile_id and status<>'CLEARED' and (expires_at is null or expires_at>now())) then raise exception 'ACCOUNT_RESTRICTED' using errcode='42501';end if;
end $$;
create or replace function public.reloo_asset_gate() returns trigger language plpgsql set search_path=public as $$
begin
 if tg_op='UPDATE' and new.owner_id=old.owner_id and new.status='removed' and exists(select 1 from profiles where id=new.owner_id and deleted_at is not null) then return new;end if;
 perform reloo_assert_active(new.owner_id);return new;
end $$;
create table if not exists public.account_deletion_requests (
 id uuid primary key default gen_random_uuid(),profile_id text not null unique references profiles(id),auth_user_id uuid,
 evidence_paths jsonb not null default '[]',status text not null default 'PENDING' check(status in ('PENDING','COMPLETE')),created_at timestamptz not null default now(),completed_at timestamptz
);
alter table account_deletion_requests enable row level security;
revoke all on account_deletion_requests from anon,authenticated;
grant all on account_deletion_requests to service_role;
create or replace function reloo_deletion_eligibility(p_profile text) returns jsonb language plpgsql security definer set search_path=public as $$
declare reasons jsonb:='[]';
begin
 if exists(select 1 from rental_agreements where p_profile in (lender_id,renter_id) and status not in ('CLOSED','CANCELLED')) then reasons:=reasons||'"Hợp đồng thuê hoặc tranh chấp chưa hoàn tất"'::jsonb;end if;
 if exists(select 1 from transactions where p_profile in (renter_id,lender_id) and status not in ('completed','cancelled')) then reasons:=reasons||'"Giao dịch chưa hoàn tất"'::jsonb;end if;
 if exists(select 1 from wallet_withdrawal_records where profile_id=p_profile and status in ('REQUESTED','APPROVED','PROCESSING')) then reasons:=reasons||'"Yêu cầu chi trả đang xử lý"'::jsonb;end if;
 if (reloo_cash_summary(p_profile)->>'net')::numeric<>0 or (reloo_payout_available(p_profile)->>'total')::numeric>0 then reasons:=reasons||'"Cần đối soát và xử lý số dư trước khi xóa"'::jsonb;end if;
 if exists(select 1 from crm_staff where profile_id=p_profile and enabled) then reasons:=reasons||'"Cần bàn giao quyền quản trị trước khi xóa"'::jsonb;end if;
 if exists(select 1 from customer_va_links where profile_id=p_profile and status='ACTIVE' and (expires_at is null or expires_at>now())) then reasons:=reasons||'"Cần ngừng tài khoản ảo tại ngân hàng và đối soát trước khi xóa"'::jsonb;end if;
 return jsonb_build_object('allowed',jsonb_array_length(reasons)=0,'reasons',reasons);
end $$;
create or replace function reloo_request_account_deletion(p_profile text) returns uuid language plpgsql security definer set search_path=public as $$
declare request_id uuid;auth_id uuid;paths jsonb;
begin
 perform pg_advisory_xact_lock(hashtext('payout:'||p_profile));
 perform 1 from profiles where id=p_profile for update;
 select id into request_id from account_deletion_requests where profile_id=p_profile;if found then return request_id;end if;
 if (reloo_deletion_eligibility(p_profile)->>'allowed')::boolean is not true then raise exception 'UNRESOLVED_OBLIGATIONS';end if;
 select auth_user_id into auth_id from profiles where id=p_profile;
 select coalesce(jsonb_agg(filename),'[]') into paths from (select value filename from kyc_submissions s cross join lateral jsonb_each_text(s.document_paths) d where s.profile_id=p_profile and d.key in ('front','back','selfie','video','vnpt-check')) q;
 insert into account_deletion_requests(profile_id,auth_user_id,evidence_paths) values(p_profile,auth_id,paths) returning id into request_id;
 update profiles set deleted_at=now(),activation_status='RESTRICTED',phone_screening_status='UNKNOWN',screening_valid_until=null,name='Tài khoản đã xóa',email='deleted-'||request_id||'@deleted.invalid',phone=null,avatar_url=null,profile_data='{}',kyc_level='L0' where id=p_profile;
 delete from verified_identities where profile_id=p_profile;
 delete from profile_bank_accounts where profile_id=p_profile;
 update kyc_submissions set national_id_encrypted='',national_id_hash='',extracted_encrypted=null,document_paths='{}',face_result=null,checks='{}',declared_expiry=null,reason=null,status='EXPIRED',photo_session_id=null,challenge_id=null where profile_id=p_profile;
 delete from kyc_photo_sessions where profile_id=p_profile;
 delete from kyc_challenges where profile_id=p_profile;
 update customer_va_links set status='INACTIVE',va_encrypted='',holder_encrypted=null where profile_id=p_profile;
 update short_videos set status='ARCHIVED' where profile_id=p_profile;
 update assets set status='removed' where owner_id=p_profile;
 delete from account_access_devices where profile_id=p_profile;
 update risk_identifiers set value_encrypted='',masked_value='',source_results='[]' where profile_id=p_profile;
 insert into security_audit(subject_id,action,details) values(p_profile,'ACCOUNT_DELETION_REQUESTED',jsonb_build_object('requestId',request_id,'retained','Minimal records necessary for statutory accounting and closed transaction evidence'));
 return request_id;
end $$;
create or replace function reloo_finish_account_deletion(p_id uuid) returns void language plpgsql security definer set search_path=public as $$
begin
 update account_deletion_requests set status='COMPLETE',completed_at=now(),evidence_paths='[]',auth_user_id=null where id=p_id and status='PENDING';
end $$;
revoke all on function reloo_deletion_eligibility(text),reloo_request_account_deletion(text),reloo_finish_account_deletion(uuid) from public,anon,authenticated;
grant execute on function reloo_deletion_eligibility(text),reloo_request_account_deletion(text),reloo_finish_account_deletion(uuid) to service_role;
notify pgrst,'reload schema';
