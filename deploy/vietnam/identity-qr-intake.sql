-- QR is required at intake. Expiry stays unknown until document extraction/review.
create or replace function public.reloo_submit_manual_kyc(p_profile text,p_id uuid,p_national text,p_hash text,p_expiry date,p_paths jsonb,p_session uuid) returns timestamptz
language plpgsql security definer set search_path=public as $$
declare deadline timestamptz;
begin
  perform 1 from profiles where id=p_profile for update;
  if not found or exists(select 1 from profiles where id=p_profile and activation_status='RESTRICTED') then raise exception 'ACCOUNT_RESTRICTED';end if;
  if (p_expiry is not null and p_expiry<(now() at time zone 'Asia/Ho_Chi_Minh')::date) or p_hash !~ '^[a-f0-9]{64}$' or length(p_national)<20 then raise exception 'DECLARATION_REQUIRED';end if;
  if p_paths->>'front' is distinct from p_id::text||'-front.enc' or p_paths->>'back' is distinct from p_id::text||'-back.enc' or p_paths->>'selfie' is distinct from p_id::text||'-selfie.enc' or p_paths->>'portraitSource' is distinct from 'CAMERA_CAPTURE' or p_paths->>'mode' is distinct from 'MANUAL' then raise exception 'THREE_PHOTOS_REQUIRED';end if;
  perform 1 from kyc_photo_sessions where id=p_session and profile_id=p_profile and consumed_at is null and issued_at<=now() and expires_at>now() and capture_version=2 and qr_fields_encrypted is not null and qr_national_hash=p_hash for update;
  if not found then raise exception 'PHOTO_SESSION_EXPIRED';end if;
  if exists(select 1 from kyc_photo_sessions where id=p_session and challenge_poses is not null) and (p_paths->>'video' is distinct from p_id::text||'-video.enc' or p_paths->'challengePoses' is distinct from (select challenge_poses from kyc_photo_sessions where id=p_session)) then raise exception 'LIVE_VIDEO_REQUIRED';end if;
  update kyc_photo_sessions set consumed_at=now() where id=p_session;
  update kyc_submissions set superseded_at=now() where profile_id=p_profile and status in ('QUEUED','PROCESSING','REVIEW') and superseded_at is null;
  deadline=now()+interval '3 days';
  insert into kyc_submissions(id,profile_id,national_id_encrypted,national_id_hash,declared_expiry,document_paths,photo_session_id,consent_at,status,provider,checks,review_due_at,reason)
  values(p_id,p_profile,p_national,p_hash,p_expiry,p_paths,p_session,now(),'REVIEW','MANUAL','{"eligible":false,"manualReview":true}',deadline,'Hồ sơ đã tiếp nhận. Admin kiểm duyệt tối đa 3 ngày.');
  insert into security_audit(actor_id,subject_id,action,details) values(p_profile,p_profile,'KYC_MANUAL_SUBMITTED',jsonb_build_object('id',p_id,'reviewDueAt',deadline,'portraitSource','CAMERA_CAPTURE'));
  insert into automation_jobs(kind,payload) values('KYC_QR_ANALYZE',jsonb_build_object('submissionId',p_id));
  return deadline;
end $$;

notify pgrst,'reload schema';
