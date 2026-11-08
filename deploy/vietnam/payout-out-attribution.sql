create or replace function reloo_attribute_payout_out(p_source uuid,p_reference text) returns boolean language plpgsql security definer set search_path=public as $$
declare source finance_sources;request wallet_withdrawal_records;prior customer_cash_entries;entry_id uuid;category text;
begin
 select * into source from finance_sources where id=p_source;
 if not found or source.direction<>'OUT' then return false;end if;
 select * into request from wallet_withdrawal_records where reference=p_reference and status in ('PROCESSING','PAID');
 if not found then return false;end if;
 perform pg_advisory_xact_lock(hashtext('payout:'||request.profile_id));
 select * into request from wallet_withdrawal_records where id=request.id for update;
 if request.status not in ('PROCESSING','PAID') or source.amount<>request.amount or source.occurred_at<request.created_at or not exists(select 1 from cashflow_payout_credits c join finance_sources s on s.id=c.funding_source_id where c.profile_id=request.profile_id and c.source_code=request.source_code and s.bank_account_id=source.bank_account_id) then return false;end if;
 if request.status='PAID' and request.paid_source_id<>p_source then insert into security_audit(subject_id,action,details) values(request.profile_id,'PAYOUT_DUPLICATE_BANK_OUT',jsonb_build_object('withdrawalId',request.id,'sourceId',p_source));return false;end if;
 select * into prior from customer_cash_entries where source_id=p_source;
 if found then if prior.profile_id<>request.profile_id then raise exception 'PAYOUT_ATTRIBUTION_CONFLICT';end if;return true;end if;
 insert into customer_cash_entries(profile_id,source_id,direction,amount,reference,occurred_at) values(request.profile_id,source.id,'OUT',source.amount,request.reference,source.occurred_at) returning id into entry_id;
 category=case when request.source_code in ('DEPOSIT','REFUND','RENTAL') then request.source_code else 'BANK' end;
 insert into wallet_category_events(entry_id,profile_id,source_code,reason,created_by) values(entry_id,request.profile_id,category,'Đối soát tiền ra theo mã yêu cầu rút và nguồn ngân hàng đã xác minh',request.profile_id);
 insert into security_audit(subject_id,action,details) values(request.profile_id,'PAYOUT_BANK_OUT_ATTRIBUTED',jsonb_build_object('withdrawalId',request.id,'sourceId',p_source));return true;
end $$;
revoke all on function reloo_attribute_payout_out(uuid,text) from public,anon,authenticated;
grant execute on function reloo_attribute_payout_out(uuid,text) to service_role;
notify pgrst,'reload schema';
