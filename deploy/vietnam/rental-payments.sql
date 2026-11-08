create table if not exists rental_payment_intents (
 id uuid primary key default gen_random_uuid(),agreement_id uuid not null references rental_agreements(id),payer_id text not null references profiles(id),beneficiary_id text not null references profiles(id),va_link_id uuid not null references customer_va_links(id),kind text not null check(kind in ('RENTAL','DEPOSIT')),amount bigint not null check(amount>0 and amount<=9007199254740991),reference text not null unique,expires_at timestamptz not null,status text not null default 'PENDING' check(status in ('PENDING','PAID','REVIEW')),paid_source_id uuid unique references finance_sources(id),created_at timestamptz not null default now(),unique(agreement_id,kind)
);
create table if not exists rental_payment_allocations (
 id uuid primary key default gen_random_uuid(),intent_id uuid not null unique references rental_payment_intents(id),source_id uuid not null unique references finance_sources(id),profile_id text not null references profiles(id),entry_id uuid not null unique references customer_cash_entries(id),kind text not null check(kind in ('RENTAL','DEPOSIT')),debit_account text not null default '3388' check(debit_account='3388'),credit_account text not null check(credit_account in ('3388','344')),debit bigint not null check(debit>0),credit bigint not null check(credit=debit),created_at timestamptz not null default now(),check((kind='RENTAL' and credit_account='3388') or (kind='DEPOSIT' and credit_account='344'))
);
do $$declare t text;begin foreach t in array array['rental_payment_intents','rental_payment_allocations'] loop execute format('alter table %I enable row level security',t);execute format('revoke all on %I from anon,authenticated',t);execute format('grant all on %I to service_role',t);end loop;end $$;
drop trigger if exists rental_allocation_immutable on rental_payment_allocations;
create trigger rental_allocation_immutable before update or delete on rental_payment_allocations for each row execute function reloo_immutable_record();
create or replace function reloo_create_payment_intent(p_profile text,p_agreement uuid,p_va uuid) returns uuid language plpgsql security definer set search_path=public as $$
declare rental rental_agreements;va customer_va_links;prior rental_payment_intents;new_id uuid:=gen_random_uuid();
begin
 perform reloo_assert_active(p_profile);
 select * into rental from rental_agreements where id=p_agreement for update;
 if not found or rental.renter_id<>p_profile or rental.status not in ('ACCEPTED','ACTIVE') or not exists(select 1 from brand_settings where id=true and rental_payments_enabled) then raise exception 'PAYMENT_NOT_ENABLED';end if;
 if not exists(select 1 from verified_identities where profile_id=p_profile and expires_at>now()) then raise exception 'VALID_IDENTITY_REQUIRED';end if;
 select * into va from customer_va_links where id=p_va and profile_id=p_profile and status='ACTIVE' and (expires_at is null or expires_at>now()) for share;
 if not found then raise exception 'OWN_ACTIVE_VA_REQUIRED';end if;
 select * into prior from rental_payment_intents where agreement_id=p_agreement and kind='RENTAL';
 if found then if prior.amount<>rental.rent_amount or prior.va_link_id<>p_va or prior.payer_id<>p_profile then raise exception 'PAYMENT_INTENT_CONFLICT';end if;return prior.id;end if;
 insert into rental_payment_intents(id,agreement_id,payer_id,beneficiary_id,va_link_id,kind,amount,reference,expires_at) values(new_id,p_agreement,p_profile,rental.lender_id,p_va,'RENTAL',rental.rent_amount,'RELOO'||upper(replace(new_id::text,'-','')),least(now()+interval '1 day',coalesce(va.expires_at,now()+interval '1 day')));
 return new_id;
end $$;
create or replace function reloo_allocate_rental_payment(p_source uuid,p_payer text,p_reference text) returns boolean language plpgsql security definer set search_path=public as $$
declare intent rental_payment_intents;source finance_sources;va customer_va_links;entry_id uuid;existing customer_cash_entries;rental rental_agreements;
begin
 select * into source from finance_sources where id=p_source;if not found then raise exception 'VERIFIED_SOURCE_REQUIRED';end if;
 select * into intent from rental_payment_intents where payer_id=p_payer and position(reference in upper(p_reference))>0 order by created_at desc limit 1 for update;
 if not found then return false;end if;
 if intent.status='PAID' then
   if intent.paid_source_id<>p_source then insert into security_audit(subject_id,action,details) values(p_payer,'RENTAL_PAYMENT_DUPLICATE',jsonb_build_object('intentId',intent.id,'sourceId',p_source));end if;
   return intent.paid_source_id=p_source;
 end if;
 select * into rental from rental_agreements where id=intent.agreement_id for update;
 select * into va from customer_va_links where id=intent.va_link_id;
 if source.direction<>'IN' or source.bank_account_id<>va.bank_account_id or source.amount<>intent.amount or source.occurred_at<intent.created_at or source.occurred_at>intent.expires_at or rental.status not in ('ACCEPTED','ACTIVE') then
   if intent.status<>'PAID' then update rental_payment_intents set status='REVIEW' where id=intent.id;end if;
   insert into security_audit(subject_id,action,details) values(p_payer,'RENTAL_PAYMENT_REVIEW',jsonb_build_object('intentId',intent.id,'sourceId',p_source));return false;
 end if;
 if intent.status='REVIEW' then return false;end if;
 select * into existing from customer_cash_entries where source_id=p_source;
 if found then raise exception 'PAYMENT_ALREADY_ATTRIBUTED';end if;
 insert into customer_cash_entries(profile_id,source_id,direction,amount,reference,occurred_at) values(intent.beneficiary_id,p_source,'IN',source.amount,intent.reference,source.occurred_at) returning id into entry_id;
 insert into wallet_category_events(entry_id,profile_id,source_code,reason,created_by) values(entry_id,intent.beneficiary_id,intent.kind,'Phân bổ tự động từ QR VA theo thỏa thuận và bằng chứng ngân hàng',p_payer);
 insert into rental_payment_allocations(intent_id,source_id,profile_id,entry_id,kind,credit_account,debit,credit) values(intent.id,p_source,intent.beneficiary_id,entry_id,intent.kind,case when intent.kind='DEPOSIT' then '344' else '3388' end,source.amount,source.amount);
 update rental_payment_intents set status='PAID',paid_source_id=p_source where id=intent.id;
 insert into security_audit(subject_id,action,details) values(p_payer,'RENTAL_PAYMENT_ALLOCATED',jsonb_build_object('intentId',intent.id,'sourceId',p_source,'category',intent.kind));return true;
end $$;
revoke all on function reloo_create_payment_intent(text,uuid,uuid),reloo_allocate_rental_payment(uuid,text,text) from public,anon,authenticated;
grant execute on function reloo_create_payment_intent(text,uuid,uuid),reloo_allocate_rental_payment(uuid,text,text) to service_role;
notify pgrst,'reload schema';
