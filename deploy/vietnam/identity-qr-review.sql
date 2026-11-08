create or replace function public.reloo_review_qr_identity(p_actor text,p_id uuid,p_reason text,p_fields text,p_holder_hash text,p_national_hash text,p_expiry date) returns void
language plpgsql security definer set search_path=public as $$
begin
 if not reloo_staff_permission(p_actor,'kyc.write') then raise exception 'PERMISSION_REQUIRED';end if;
 if p_expiry is null or p_expiry<(now() at time zone 'Asia/Ho_Chi_Minh')::date then raise exception 'VALID_EXPIRY_REQUIRED';end if;
 perform 1 from kyc_submissions where id=p_id and status='REVIEW' and superseded_at is null for update;
 if not found then raise exception 'SUBMISSION_REQUIRED';end if;
 update kyc_submissions set declared_expiry=p_expiry where id=p_id and declared_expiry is null;
 perform reloo_review_kyc_identity(p_actor,p_id,p_reason,p_fields,p_holder_hash,p_national_hash);
end $$;
revoke all on function public.reloo_review_qr_identity(text,uuid,text,text,text,text,date) from public,anon,authenticated;
grant execute on function public.reloo_review_qr_identity(text,uuid,text,text,text,text,date) to service_role;
notify pgrst,'reload schema';
