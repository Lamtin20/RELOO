-- Persist QR and the submission together only after explicit final consent.
create or replace function public.reloo_submit_kyc_reviewed_qr(p_profile text,p_id uuid,p_national text,p_hash text,p_expiry date,p_paths jsonb,p_session uuid,p_qr_fields text) returns timestamptz
language plpgsql security definer set search_path=public as $$
begin
 if p_paths->>'consentVersion' is distinct from 'RELOO_KYC_QR_REVIEW_V3' or p_paths->>'qrAcknowledged' is distinct from 'true' or p_paths->>'collectionPolicyVersion' is distinct from '2026-10-17.1' then raise exception 'CONSENT_REQUIRED';end if;
 perform 1 from profiles where id=p_profile for update;
 perform reloo_store_identity_qr(p_profile,p_session,p_hash,p_qr_fields);
 return reloo_submit_manual_kyc(p_profile,p_id,p_national,p_hash,p_expiry,p_paths,p_session);
end $$;
revoke all on function public.reloo_submit_kyc_reviewed_qr(text,uuid,text,text,date,jsonb,uuid,text) from PUBLIC,anon,authenticated;
grant execute on function public.reloo_submit_kyc_reviewed_qr(text,uuid,text,text,date,jsonb,uuid,text) to service_role;
notify pgrst,'reload schema';
