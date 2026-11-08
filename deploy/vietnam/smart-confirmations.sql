create or replace function public.reloo_confirm_purchase(p_actor text,p_id uuid,p_version integer,p_status text,p_receipt uuid) returns void language plpgsql security definer set search_path=public as $$begin
 perform reloo_consume_smart_key(p_actor,p_receipt);perform reloo_purchase_action(p_actor,p_id,p_version,p_status);
end$$;
create or replace function public.reloo_confirm_rental(p_actor text,p_id uuid,p_action text,p_request uuid,p_record jsonb,p_receipt uuid) returns text language plpgsql security definer set search_path=public as $$begin
 perform reloo_consume_smart_key(p_actor,p_receipt);return reloo_change_rental(p_actor,p_id,p_action,p_request,p_record);
end$$;
create or replace function public.reloo_confirm_account_deletion(p_actor text,p_receipt uuid) returns uuid language plpgsql security definer set search_path=public as $$begin
 perform reloo_consume_smart_key(p_actor,p_receipt);return reloo_request_account_deletion(p_actor);
end$$;
create or replace function public.reloo_confirm_payout(p_actor text,p_source text,p_amount bigint,p_bank uuid,p_key uuid,p_receipt uuid) returns uuid language plpgsql security definer set search_path=public as $$begin
 perform reloo_consume_smart_key(p_actor,p_receipt);return reloo_request_payout(p_actor,p_source,p_amount,p_bank,p_key);
end$$;
create or replace function public.reloo_confirm_payout_cancel(p_actor text,p_id uuid,p_receipt uuid) returns void language plpgsql security definer set search_path=public as $$begin
 perform reloo_consume_smart_key(p_actor,p_receipt);perform reloo_cancel_payout(p_actor,p_id);
end$$;
revoke all on function reloo_confirm_purchase(text,uuid,integer,text,uuid),reloo_confirm_rental(text,uuid,text,uuid,jsonb,uuid),reloo_confirm_account_deletion(text,uuid),reloo_confirm_payout(text,text,bigint,uuid,uuid,uuid),reloo_confirm_payout_cancel(text,uuid,uuid) from public,anon,authenticated;
grant execute on function reloo_confirm_purchase(text,uuid,integer,text,uuid),reloo_confirm_rental(text,uuid,text,uuid,jsonb,uuid),reloo_confirm_account_deletion(text,uuid),reloo_confirm_payout(text,text,bigint,uuid,uuid,uuid),reloo_confirm_payout_cancel(text,uuid,uuid) to service_role;
notify pgrst,'reload schema';

create or replace function reloo_deletion_eligibility(p_profile text) returns jsonb language plpgsql security definer set search_path=public as $$
declare reasons jsonb:='[]';
begin
 if exists(select 1 from rental_agreements where p_profile in (lender_id,renter_id) and status not in ('CLOSED','CANCELLED')) then reasons:=reasons||'"Hợp đồng thuê hoặc tranh chấp chưa hoàn tất"'::jsonb;end if;
 if exists(select 1 from transactions where p_profile in (renter_id,lender_id) and status not in ('completed','cancelled')) then reasons:=reasons||'"Giao dịch chưa hoàn tất"'::jsonb;end if;
 if exists(select 1 from wallet_withdrawal_records where profile_id=p_profile and status in ('REQUESTED','APPROVED','PROCESSING')) then reasons:=reasons||'"Yêu cầu chi trả đang xử lý"'::jsonb;end if;
 if (reloo_cash_summary(p_profile)->>'net')::numeric<>0 or (reloo_payout_available(p_profile)->>'total')::numeric>0 then reasons:=reasons||'"Cần đối soát và xử lý số dư trước khi xóa"'::jsonb;end if;
 if exists(select 1 from crm_staff where profile_id=p_profile and enabled) then reasons:=reasons||'"Cần bàn giao quyền quản trị trước khi xóa"'::jsonb;end if;
 if exists(select 1 from customer_va_links where profile_id=p_profile and status='ACTIVE' and (expires_at is null or expires_at>now())) then reasons:=reasons||'"Cần ngừng tài khoản ảo tại ngân hàng và đối soát trước khi xóa"'::jsonb;end if;
 if exists(select 1 from purchase_orders where p_profile in (buyer_id,seller_id) and status in ('CONFIRMED','HANDED_OVER','DISPUTED')) then reasons:=reasons||'"Cần hoàn tất hoặc giải quyết đơn mua trước khi xóa tài khoản"'::jsonb;end if;
 return jsonb_build_object('allowed',jsonb_array_length(reasons)=0,'reasons',reasons);
end $$;
