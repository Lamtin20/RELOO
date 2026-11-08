-- Server-only OCR/QR decision. No profile is verified by this migration itself.
create or replace function public.reloo_resolve_kyc_ocr(p_id uuid,p_checks jsonb,p_expiry date,p_fields text,p_holder_hash text,p_national_hash text) returns text
language plpgsql security definer set search_path=public as $$
declare item kyc_submissions; subject text; prior verified_identities; deadline timestamptz;
begin
 select profile_id into subject from kyc_submissions where id=p_id;
 perform 1 from profiles where id=subject for update;
 select * into item from kyc_submissions where id=p_id for update;
 if not found then raise exception 'SUBMISSION_REQUIRED';end if;
 if item.status<>'REVIEW' or item.superseded_at is not null or item.expires_at<=now() then return item.status;end if;
 if item.document_paths->>'ocrQrPolicy' is distinct from 'V1' or item.document_paths->>'consentVersion' is distinct from 'RELOO_KYC_OCR_QR_V4' or item.consent_at is null then raise exception 'OCR_CONSENT_REQUIRED';end if;
 if p_checks->>'method' is distinct from 'OCR_QR_V1' then raise exception 'OCR_POLICY_REQUIRED';end if;
 deadline=coalesce(item.review_due_at,item.created_at+interval '3 days');
 update kyc_submissions set checks=coalesce(checks,'{}')||p_checks,review_due_at=deadline where id=p_id;
 if p_checks->>'eligible' is distinct from 'true' then
  update kyc_submissions set reason='Thông tin chưa khớp hoặc ảnh chưa đủ rõ. Admin xử lý tối đa 3 ngày.' where id=p_id;
  return 'REVIEW';
 end if;
 if p_checks->>'nationalIdMatches' is distinct from 'true' or p_checks->>'nameMatches' is distinct from 'true' or p_checks->>'ocrConfident' is distinct from 'true' or p_checks->>'expiryValid' is distinct from 'true' or coalesce(p_checks->>'cardType','') not in ('CCCD','CAN_CUOC') or p_checks->>'manualReview' is distinct from 'false' then raise exception 'OCR_MATCH_REQUIRED';end if;
 if p_expiry is null or p_expiry<(now() at time zone 'Asia/Ho_Chi_Minh')::date or p_national_hash is distinct from item.national_id_hash or coalesce(p_national_hash,'')!~'^[a-f0-9]{64}$' or length(coalesce(p_fields,'')) not between 20 and 20000 or coalesce(p_holder_hash,'')!~'^[a-f0-9]{64}$' then raise exception 'OCR_IDENTITY_INVALID';end if;
 if exists(select 1 from profiles where id=subject and (activation_status='RESTRICTED' or deleted_at is not null)) then
  update kyc_submissions set checks=checks||'{"eligible":false,"manualReview":true,"reason":"ACCOUNT_REVIEW"}' where id=p_id;return 'REVIEW';end if;
 if not exists(select 1 from kyc_photo_sessions where id=item.photo_session_id and profile_id=subject and consumed_at is not null and capture_version=2) then raise exception 'CAPTURE_REQUIRED';end if;
 if exists(select 1 from unnest(array['front','back','selfie','video']) kind where item.document_paths->>kind is distinct from p_id::text||'-'||kind||'.enc') then raise exception 'CAPTURE_REQUIRED';end if;
 select * into prior from verified_identities where profile_id=subject for update;
 if prior.national_id_hash is not null and prior.national_id_hash<>p_national_hash then
  update kyc_submissions set checks=checks||'{"eligible":false,"manualReview":true,"reason":"IDENTITY_CHANGE_REVIEW"}' where id=p_id;return 'REVIEW';end if;
 update kyc_submissions set status='APPROVED',declared_expiry=p_expiry,reviewed_at=now(),reason='Số định danh và họ tên trên mặt trước đã khớp QR. Duyệt tự động theo OCR_QR_V1.' where id=p_id;
 insert into verified_identities(profile_id,submission_id,fields_encrypted,holder_name_hash,national_id_hash,expires_at,verified_at)
 values(subject,p_id,p_fields,p_holder_hash,p_national_hash,((p_expiry+1)::timestamp at time zone 'Asia/Ho_Chi_Minh'),now())
 on conflict(profile_id) do update set submission_id=p_id,fields_encrypted=p_fields,holder_name_hash=p_holder_hash,national_id_hash=p_national_hash,expires_at=excluded.expires_at,verified_at=now();
 update profiles set kyc_level='L2' where id=subject;
 update profile_bank_accounts set name_status='DECLARED_NAME_MATCH' where profile_id=subject and holder_name_hash=p_holder_hash;
 insert into security_audit(actor_id,subject_id,action,details) values(null,subject,'KYC_AUTO_APPROVED',jsonb_build_object('id',p_id,'method','OCR_QR_V1','biometricVerified',false));
 return 'APPROVED';
end $$;
revoke all on function public.reloo_resolve_kyc_ocr(uuid,jsonb,date,text,text,text) from PUBLIC,anon,authenticated;
grant execute on function public.reloo_resolve_kyc_ocr(uuid,jsonb,date,text,text,text) to service_role;

create or replace function public.reloo_submit_kyc_reviewed_qr(p_profile text,p_id uuid,p_national text,p_hash text,p_expiry date,p_paths jsonb,p_session uuid,p_qr_fields text) returns timestamptz
language plpgsql security definer set search_path=public as $$
begin
 if p_paths->>'consentVersion' is distinct from 'RELOO_KYC_OCR_QR_V4' or p_paths->>'qrAcknowledged' is distinct from 'true' or p_paths->>'collectionPolicyVersion' is distinct from '2026-10-21.1' or p_paths->>'ocrQrPolicy' is distinct from 'V1' then raise exception 'CONSENT_REQUIRED';end if;
 perform 1 from profiles where id=p_profile for update;
 perform reloo_store_identity_qr(p_profile,p_session,p_hash,p_qr_fields);
 return reloo_submit_manual_kyc(p_profile,p_id,p_national,p_hash,p_expiry,p_paths,p_session);
end $$;
revoke all on function public.reloo_submit_kyc_reviewed_qr(text,uuid,text,text,date,jsonb,uuid,text) from PUBLIC,anon,authenticated;
grant execute on function public.reloo_submit_kyc_reviewed_qr(text,uuid,text,text,date,jsonb,uuid,text) to service_role;
notify pgrst,'reload schema';
