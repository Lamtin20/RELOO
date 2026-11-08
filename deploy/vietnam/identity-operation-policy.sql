-- Additive operation policy. Run transactionally as postgres, then security-lockdown.sql.
create or replace function public.reloo_assert_identity(p_profile_id text) returns void language plpgsql security definer set search_path=public as $$
begin
 if exists(select 1 from verified_identities where profile_id=p_profile_id and expires_at<=now()) then raise exception 'IDENTITY_EXPIRED' using errcode='42501';end if;
 if not exists(select 1 from verified_identities where profile_id=p_profile_id and submission_id is not null and (expires_at is null or expires_at>now())) then raise exception 'IDENTITY_REQUIRED' using errcode='42501';end if;
end $$;

-- Preserve every existing account/risk/phone check, removing only the identity-expiry
-- clause for buyers/chat. Abort on unknown source instead of silently replacing policy.
do $migration$
declare original text; changed text;
begin
 select pg_get_functiondef('public.reloo_assert_active(text)'::regprocedure) into original;
 changed:=regexp_replace(original,'FUNCTION public.reloo_assert_active\(','FUNCTION public.reloo_assert_buyer_active(','i');
 changed:=regexp_replace(changed,'if\s+exists\s*\(select 1 from verified_identities where profile_id=p_profile_id and expires_at<=now\(\)\)\s*then raise exception ''IDENTITY_EXPIRED'' using errcode=''42501'';\s*end if;','','i');
 if changed=original or position('IDENTITY_EXPIRED' in changed)>0 then raise exception 'IDENTITY_POLICY_SOURCE_CHANGED';end if;
 execute changed;
end $migration$;

do $migration$
declare definition text; updated text; item text;
begin
 foreach item in array array['public.reloo_request_purchase(text,text,jsonb)','public.reloo_purchase_action(text,uuid,integer,text)','public.reloo_create_inquiry(text,text,jsonb)','public.reloo_send_message(text,text,jsonb)','public.reloo_change_rental(text,uuid,text,uuid,jsonb)','public.reloo_create_nearby_request(text,uuid,jsonb)'] loop
  select pg_get_functiondef(item::regprocedure) into definition;
  if position('reloo_assert_buyer_active' in definition)>0 then continue;end if;
  updated:=definition;
  if item like '%reloo_request_purchase%' then
   updated:=regexp_replace(updated,'perform (public\.)?reloo_assert_active\(p_buyer\);','perform reloo_assert_buyer_active(p_buyer);','i');
   updated:=regexp_replace(updated,'perform (public\.)?reloo_assert_active\(a.owner_id\);','perform reloo_assert_active(a.owner_id);perform reloo_assert_identity(a.owner_id);','i');
  elsif item like '%reloo_purchase_action%' then
   updated:=regexp_replace(updated,'perform (public\.)?reloo_assert_active\(p_actor\);','if p_actor=o.buyer_id then perform reloo_assert_buyer_active(p_actor);else perform reloo_assert_active(p_actor);if p_status not in (''CANCELLED'',''DISPUTED'') then perform reloo_assert_identity(p_actor);end if;end if;','i');
   updated:=regexp_replace(updated,'perform (public\.)?reloo_assert_active\(o.buyer_id\);','perform reloo_assert_buyer_active(o.buyer_id);','i');
  elsif item like '%reloo_create_inquiry%' then
   updated:=regexp_replace(updated,'perform (public\.)?reloo_assert_active\(p_profile_id\);','if p_message->>''transactionMode''=''SALE'' then perform reloo_assert_buyer_active(p_profile_id);else perform reloo_assert_active(p_profile_id);perform reloo_assert_identity(p_profile_id);end if;','i');
   updated:=regexp_replace(updated,'perform (public\.)?reloo_assert_active\(v_listing.owner_id\);','perform reloo_assert_active(v_listing.owner_id);perform reloo_assert_identity(v_listing.owner_id);','i');
  elsif item like '%reloo_send_message%' then
   updated:=regexp_replace(updated,'perform (public\.)?reloo_assert_active\(p_profile_id\);','perform reloo_assert_buyer_active(p_profile_id);','i');
  elsif item like '%reloo_change_rental%' then
   updated:=regexp_replace(updated,'perform (public\.)?reloo_assert_active\(item.lender_id\);\s*perform (public\.)?reloo_assert_active\(item.renter_id\);','if p_action in (''RETURN_CONFIRMED'',''CANCELLED'',''DISPUTED'') then perform reloo_assert_buyer_active(item.lender_id);perform reloo_assert_buyer_active(item.renter_id);else perform reloo_assert_active(item.lender_id);perform reloo_assert_active(item.renter_id);perform reloo_assert_identity(item.lender_id);perform reloo_assert_identity(item.renter_id);end if;','i');
  else
   updated:=regexp_replace(updated,'perform (public\.)?reloo_assert_active\(p_actor\);','if p_data->>''mode''=''BUY'' then perform reloo_assert_buyer_active(p_actor);else perform reloo_assert_active(p_actor);perform reloo_assert_identity(p_actor);end if;','i');
  end if;
  if updated=definition or position('reloo_assert_buyer_active' in updated)=0 then raise exception 'IDENTITY_POLICY_SOURCE_CHANGED: %',item;end if;
  execute updated;
 end loop;
end $migration$;

create or replace function public.reloo_asset_gate() returns trigger language plpgsql as $$
begin
 -- Returning goods or releasing a cancelled sale must not republish an
 -- unverified owner's item, or strand the other participant's transaction.
 if tg_op='UPDATE' then
  if new.status='paused' and not new.is_locked and new.listing_data->>'saleStatus'='SOLD' and new.listing_data->>'saleReservationId' is null and old.listing_data->>'saleReservationId' is not null then return new;end if;
  if new.status='available' and (old.status='rented' or (old.status='paused' and old.listing_data->>'saleReservationId' is not null and new.listing_data->>'saleReservationId' is null)) then
   begin perform public.reloo_assert_active(new.owner_id);perform public.reloo_assert_identity(new.owner_id);
   exception when insufficient_privilege then new.status:='paused';end;
   return new;
  end if;
 end if;
 perform public.reloo_assert_active(new.owner_id);
 if new.status in ('available','pending') then
  if tg_op='INSERT' then perform public.reloo_assert_identity(new.owner_id);
  elsif new.status is distinct from old.status or new.title is distinct from old.title or new.description is distinct from old.description or new.daily_price is distinct from old.daily_price or new.images is distinct from old.images or new.listing_data is distinct from old.listing_data then perform public.reloo_assert_identity(new.owner_id);end if;
 end if;return new;
end $$;

create or replace function public.reloo_expired_identity_guard() returns trigger language plpgsql as $$
begin
 if new.status in ('PROPOSED','ACCEPTED','ACTIVE') then
  if tg_op='INSERT' then perform public.reloo_assert_identity(new.lender_id);perform public.reloo_assert_identity(new.renter_id);
  elsif new.status is distinct from old.status then perform public.reloo_assert_identity(new.lender_id);perform public.reloo_assert_identity(new.renter_id);end if;
 end if;return new;
end $$;

create or replace function public.reloo_nk_identity_guard() returns trigger language plpgsql as $$
begin
 if tg_op='INSERT' then perform public.reloo_assert_identity(new.owner_id);perform public.reloo_assert_identity(new.renter_id);
 elsif new.status in ('PENDING_OWNER','PENDING_PAYMENT','CONFIRMED','READY_FOR_HANDOVER','ACTIVE') and new.status is distinct from old.status then perform public.reloo_assert_identity(new.owner_id);perform public.reloo_assert_identity(new.renter_id);end if;
 return new;
end $$;
drop trigger if exists nk_identity_approval on public.nk_orders;
create trigger nk_identity_approval before insert or update of status on public.nk_orders for each row execute function public.reloo_nk_identity_guard();
revoke all on function public.reloo_assert_identity(text),public.reloo_assert_buyer_active(text),public.reloo_nk_identity_guard() from public,anon,authenticated;
grant execute on function public.reloo_assert_identity(text),public.reloo_assert_buyer_active(text),public.reloo_nk_identity_guard() to service_role;
notify pgrst,'reload schema';
