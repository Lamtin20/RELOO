create or replace function reloo_deletion_eligibility(p_profile text) returns jsonb language plpgsql security definer set search_path=public as $$
declare reasons jsonb:='[]';
begin
 if exists(select 1 from rental_agreements where p_profile in (lender_id,renter_id) and status not in ('CLOSED','CANCELLED')) then reasons:=reasons||'"Hợp đồng thuê hoặc tranh chấp chưa hoàn tất"'::jsonb;end if;
 if exists(select 1 from transactions where p_profile in (renter_id,lender_id) and status not in ('completed','cancelled')) then reasons:=reasons||'"Giao dịch chưa hoàn tất"'::jsonb;end if;
 if exists(select 1 from wallet_withdrawal_records where profile_id=p_profile and status in ('REQUESTED','APPROVED','PROCESSING')) then reasons:=reasons||'"Yêu cầu chi trả đang xử lý"'::jsonb;end if;
 if ((reloo_cash_summary(p_profile)->>'net')::numeric+reloo_promotion_credit_total(p_profile))<>0 or (reloo_payout_available(p_profile)->>'total')::numeric>0 then reasons:=reasons||'"Cần đối soát và xử lý số dư trước khi xóa"'::jsonb;end if;
 if exists(select 1 from crm_staff where profile_id=p_profile and enabled) then reasons:=reasons||'"Cần bàn giao quyền quản trị trước khi xóa"'::jsonb;end if;
 if exists(select 1 from customer_va_links where profile_id=p_profile and status='ACTIVE' and (expires_at is null or expires_at>now())) then reasons:=reasons||'"Cần ngừng tài khoản ảo tại ngân hàng và đối soát trước khi xóa"'::jsonb;end if;
 if exists(select 1 from promotion_redemptions where profile_id=p_profile and status='RESERVED') then reasons:=reasons||'"Coupon hoặc báo giá dịch vụ đang được giữ chỗ"'::jsonb;end if;
 return jsonb_build_object('allowed',jsonb_array_length(reasons)=0,'reasons',reasons);
end $$;
