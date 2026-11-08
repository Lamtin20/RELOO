-- QR-only business approval. Never creates approval merely by running migration.
create or replace function public.reloo_resolve_kyc_qr(p_id uuid,p_fields text,p_holder_hash text,p_national_hash text) returns text
language plpgsql security definer set search_path=public as $$
declare item kyc_submissions; subject text; prior verified_identities;
begin
 select profile_id into subject from kyc_submissions where id=p_id;
 perform 1 from profiles where id=subject for update;
 select * into item from kyc_submissions where id=p_id for update;
 if not found then raise exception 'SUBMISSION_REQUIRED';end if;
 if item.status<>'REVIEW' or item.superseded_at is not null or item.expires_at<=now() then return item.status;end if;
 if item.provider<>'MANUAL' or item.consent_at is null or item.document_paths->>'consentVersion' not in ('RELOO_KYC_OCR_QR_V4','RELOO_KYC_QR_V5') or coalesce(item.document_paths->>'qrAcknowledged','false')<>'true' then raise exception 'QR_CONSENT_REQUIRED';end if;
 if coalesce(p_national_hash,'')!~'^[a-f0-9]{64}$' or p_national_hash is distinct from item.national_id_hash or coalesce(p_holder_hash,'')!~'^[a-f0-9]{64}$' or length(coalesce(p_fields,'')) not between 20 and 20000 then raise exception 'QR_IDENTITY_INVALID';end if;
 if item.declared_expiry is null or item.declared_expiry<(now() at time zone 'Asia/Ho_Chi_Minh')::date then
  update kyc_submissions set reason='Cần admin kiểm tra ngày hết hạn trên thẻ.',checks=coalesce(checks,'{}')||'{"method":"QR_ONLY_V1","qrValid":true,"eligible":false,"manualReview":true,"reason":"EXPIRY_REVIEW"}'::jsonb where id=p_id;return 'REVIEW';end if;
 if exists(select 1 from profiles where id=subject and (activation_status='RESTRICTED' or deleted_at is not null)) then return 'REVIEW';end if;
 if not exists(select 1 from kyc_photo_sessions where id=item.photo_session_id and profile_id=subject and consumed_at is not null and capture_version=2 and qr_national_hash=p_national_hash and qr_fields_encrypted=item.extracted_encrypted) then raise exception 'CAPTURE_REQUIRED';end if;
 if exists(select 1 from unnest(array['front','back','selfie','video']) kind where item.document_paths->>kind is distinct from p_id::text||'-'||kind||'.enc') then raise exception 'CAPTURE_REQUIRED';end if;
 select * into prior from verified_identities where profile_id=subject for update;
 if prior.national_id_hash is not null and prior.national_id_hash<>p_national_hash then return 'REVIEW';end if;
 if exists(select 1 from verified_identities where profile_id<>subject and national_id_hash=p_national_hash) then raise exception 'IDENTIFIER_EXISTS';end if;
 update kyc_submissions set status='APPROVED',reviewed_at=now(),reason='Đã duyệt thông tin QR, bộ ảnh trực tiếp và ngày hết hạn khai báo.',checks=coalesce(checks,'{}')||'{"method":"QR_ONLY_V1","qrValid":true,"eligible":true,"manualReview":false,"biometricVerified":false,"expiryKnown":true,"reason":"QR_VALID"}'::jsonb where id=p_id;
 insert into verified_identities(profile_id,submission_id,fields_encrypted,holder_name_hash,national_id_hash,expires_at,verified_at)
 values(subject,p_id,p_fields,p_holder_hash,p_national_hash,((item.declared_expiry+1)::timestamp at time zone 'Asia/Ho_Chi_Minh'),now())
 on conflict(profile_id) do update set submission_id=p_id,fields_encrypted=p_fields,holder_name_hash=p_holder_hash,national_id_hash=p_national_hash,expires_at=excluded.expires_at,verified_at=now();
 update profiles set kyc_level='L2' where id=subject;
 update profile_bank_accounts set name_status='DECLARED_NAME_MATCH' where profile_id=subject and holder_name_hash=p_holder_hash;
 insert into security_audit(actor_id,subject_id,action,details) values(null,subject,'KYC_AUTO_APPROVED',jsonb_build_object('id',p_id,'method','QR_ONLY_V1','biometricVerified',false,'expiryKnown',true));
 return 'APPROVED';
end $$;
revoke all on function public.reloo_resolve_kyc_qr(uuid,text,text,text) from PUBLIC,anon,authenticated;
grant execute on function public.reloo_resolve_kyc_qr(uuid,text,text,text) to service_role;

create or replace function public.reloo_submit_kyc_reviewed_qr(p_profile text,p_id uuid,p_national text,p_hash text,p_expiry date,p_paths jsonb,p_session uuid,p_qr_fields text) returns timestamptz
language plpgsql security definer set search_path=public as $$
begin
 if not ((p_paths->>'consentVersion'='RELOO_KYC_QR_V5' and p_paths->>'collectionPolicyVersion'='2026-10-22.1' and p_paths->>'qrPolicy'='V1') or (p_paths->>'consentVersion'='RELOO_KYC_OCR_QR_V4' and p_paths->>'collectionPolicyVersion'='2026-10-21.1' and p_paths->>'ocrQrPolicy'='V1')) or p_paths->>'qrAcknowledged' is distinct from 'true' then raise exception 'CONSENT_REQUIRED';end if;
 perform 1 from profiles where id=p_profile for update;
 perform reloo_store_identity_qr(p_profile,p_session,p_hash,p_qr_fields);
 return reloo_submit_manual_kyc(p_profile,p_id,p_national,p_hash,p_expiry,p_paths,p_session);
end $$;
revoke all on function public.reloo_submit_kyc_reviewed_qr(text,uuid,text,text,date,jsonb,uuid,text) from PUBLIC,anon,authenticated;
grant execute on function public.reloo_submit_kyc_reviewed_qr(text,uuid,text,text,date,jsonb,uuid,text) to service_role;
notify pgrst,'reload schema';

-- Admin supplies the expiry read from the card for submissions missing it.
create or replace function public.reloo_review_kyc_qr(p_actor text,p_id uuid,p_expiry date,p_fields text,p_holder_hash text,p_national_hash text) returns text
language plpgsql security definer set search_path=public as $$
declare subject text; result text;
begin
 if not reloo_staff_permission(p_actor,'kyc.write') then raise exception 'PERMISSION_REQUIRED';end if;
 if p_expiry is null or p_expiry<(now() at time zone 'Asia/Ho_Chi_Minh')::date then raise exception 'EXPIRY_REQUIRED';end if;
 select profile_id into subject from kyc_submissions where id=p_id;
 perform 1 from profiles where id=subject for update;
 perform 1 from kyc_submissions where id=p_id and status='REVIEW' and superseded_at is null for update;
 if not found then raise exception 'SUBMISSION_ALREADY_REVIEWED';end if;
 update kyc_submissions set declared_expiry=p_expiry where id=p_id;
 result=reloo_resolve_kyc_qr(p_id,p_fields,p_holder_hash,p_national_hash);
 if result<>'APPROVED' then raise exception 'IDENTITY_REVIEW_REQUIRED';end if;
 update kyc_submissions set reviewed_by=p_actor where id=p_id;
 insert into security_audit(actor_id,subject_id,action,details) values(p_actor,subject,'KYC_QR_MANUAL_APPROVED',jsonb_build_object('id',p_id,'expirySource','ADMIN_CARD_REVIEW'));
 return result;
end $$;
revoke all on function public.reloo_review_kyc_qr(text,uuid,date,text,text,text) from PUBLIC,anon,authenticated;
grant execute on function public.reloo_review_kyc_qr(text,uuid,date,text,text,text) to service_role;
notify pgrst,'reload schema';
