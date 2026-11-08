create table if not exists public.purchase_orders(
 id uuid primary key default gen_random_uuid(),asset_id text not null references assets(id),buyer_id text not null references profiles(id),seller_id text not null references profiles(id),
 title text not null,price bigint not null check(price>0),status text not null default 'REQUESTED' check(status in ('REQUESTED','CONFIRMED','HANDED_OVER','COMPLETED','CANCELLED','DISPUTED')),
 version integer not null default 1,delivery jsonb not null default '{}',payment_status text not null default 'UNVERIFIED' check(payment_status in ('UNVERIFIED','VERIFIED')),created_at timestamptz not null default now(),updated_at timestamptz not null default now(),check(buyer_id<>seller_id));
create unique index if not exists purchase_one_open_buyer on purchase_orders(asset_id,buyer_id) where status in ('REQUESTED','CONFIRMED','HANDED_OVER','DISPUTED');
create table if not exists public.purchase_events(id bigint generated always as identity primary key,order_id uuid not null references purchase_orders(id),actor_id text not null references profiles(id),status text not null,version integer not null,created_at timestamptz not null default now(),unique(order_id,version));
alter table purchase_orders enable row level security;alter table purchase_events enable row level security;
revoke all on purchase_orders,purchase_events from public,anon,authenticated;grant all on purchase_orders,purchase_events to service_role;grant usage,select on sequence purchase_events_id_seq to service_role;
create or replace function public.reloo_request_purchase(p_buyer text,p_asset text,p_delivery jsonb) returns uuid language plpgsql security definer set search_path=public as $$
declare a assets; existing uuid; result uuid;
begin
 perform reloo_assert_active(p_buyer);select * into a from assets where id=p_asset for update;
 if not found or a.owner_id=p_buyer or a.status<>'available' or a.is_locked or coalesce(a.listing_data->>'transactionMode','RENT') not in ('SALE','BOTH') or coalesce((a.listing_data->>'salePrice')::bigint,0)<=0 then raise exception 'NOT_FOR_SALE';end if;
 perform reloo_assert_active(a.owner_id);
 select id into existing from purchase_orders where asset_id=p_asset and buyer_id=p_buyer and status in ('REQUESTED','CONFIRMED','HANDED_OVER','DISPUTED');if existing is not null then return existing;end if;
 insert into purchase_orders(asset_id,buyer_id,seller_id,title,price,delivery) values(p_asset,p_buyer,a.owner_id,a.title,(a.listing_data->>'salePrice')::bigint,p_delivery) returning id into result;
 insert into purchase_events(order_id,actor_id,status,version) values(result,p_buyer,'REQUESTED',1);
 insert into notifications(user_id,title,body,notification_type,link) values(a.owner_id,'Có yêu cầu mua sản phẩm','Kiểm tra giá, tình trạng và cách giao nhận trước khi xác nhận.','order','/dashboard/purchases?id='||result::text);
 return result;
end $$;
create or replace function public.reloo_purchase_action(p_actor text,p_id uuid,p_version integer,p_status text) returns void language plpgsql security definer set search_path=public as $$
declare o purchase_orders;a assets;recipient text;
begin
 select asset_id into a.id from purchase_orders where id=p_id;
 if not found then raise exception 'ORDER_REQUIRED';end if;
 select * into a from assets where id=a.id for update;
 select * into o from purchase_orders where id=p_id for update;
 if p_actor not in (o.buyer_id,o.seller_id) then raise exception 'PARTICIPANT_REQUIRED';end if;
 if p_status<>'DISPUTED' then perform reloo_assert_active(p_actor);end if;
 if o.version<>p_version then raise exception 'VERSION_CONFLICT';end if;
 if not ((p_status='CONFIRMED' and o.status='REQUESTED' and p_actor=o.seller_id) or (p_status='HANDED_OVER' and o.status='CONFIRMED' and p_actor=o.seller_id) or (p_status='COMPLETED' and o.status='HANDED_OVER' and p_actor=o.buyer_id) or (p_status='CANCELLED' and o.status in ('REQUESTED','CONFIRMED')) or (p_status='DISPUTED' and o.status in ('CONFIRMED','HANDED_OVER'))) then raise exception 'INVALID_TRANSITION';end if;
 if p_status='CONFIRMED' then
  perform reloo_assert_active(o.buyer_id);perform reloo_assert_active(o.seller_id);
  if a.status<>'available' or a.is_locked or coalesce((a.listing_data->>'salePrice')::bigint,-1)<>o.price or coalesce(a.listing_data->>'transactionMode','RENT') not in ('SALE','BOTH') or exists(select 1 from rental_agreements where listing_id=a.id and status in ('ACCEPTED','ACTIVE','DISPUTED')) then raise exception 'ASSET_OR_PRICE_CHANGED';end if;
  update assets set status='paused',is_locked=true,listing_data=listing_data||jsonb_build_object('saleReservationId',p_id) where id=a.id;
 end if;
 if p_status='DISPUTED' then
  insert into crm_records(module,title,status,data,created_by) values('support','Hỗ trợ đơn mua '||p_id::text,'OPEN',jsonb_build_object('customerId',p_actor,'channel','RELOO_PURCHASE','priority','HIGH','body','Đơn mua cần giải quyết: /dashboard/purchases?id='||p_id::text,'purchaseOrderId',p_id),p_actor);
  update purchase_orders set delivery=delivery||jsonb_build_object('disputedFrom',o.status) where id=p_id;
  insert into notifications(user_id,title,body,notification_type,link) select profile_id,'Đơn mua cần hỗ trợ','Có yêu cầu cần xem xét trong CSKH.','system','/crm?view=support' from crm_staff where enabled and reloo_staff_permission(profile_id,'support.write');
 end if;
 if p_status in ('CANCELLED','COMPLETED') and a.listing_data->>'saleReservationId'=p_id::text then
  update assets set is_locked=false,status=case when p_status='COMPLETED' then 'paused' else 'available' end,listing_data=(listing_data-'saleReservationId')||jsonb_build_object('saleStatus',case when p_status='COMPLETED' then 'SOLD' else 'AVAILABLE' end) where id=a.id;
 end if;
 update purchase_orders set status=p_status,version=version+1,updated_at=now() where id=p_id;
 insert into purchase_events(order_id,actor_id,status,version) values(p_id,p_actor,p_status,o.version+1);
 if p_status='COMPLETED' then
  with changed as(update purchase_orders set status='CANCELLED',version=version+1,updated_at=now() where asset_id=a.id and id<>p_id and status='REQUESTED' returning id,version)
  insert into purchase_events(order_id,actor_id,status,version) select id,p_actor,'ITEM_SOLD',version from changed;
  insert into notifications(user_id,title,body,notification_type,link) select o2.buyer_id,'Món đồ đã được bán','Yêu cầu mua đã đóng vì món đồ không còn.','order','/dashboard/purchases?id='||o2.id::text from purchase_orders o2 join purchase_events e on e.order_id=o2.id and e.version=o2.version where o2.asset_id=a.id and o2.id<>p_id and e.status='ITEM_SOLD';
 end if;
 recipient=case when p_actor=o.buyer_id then o.seller_id else o.buyer_id end;
 insert into notifications(user_id,title,body,notification_type,link) values(recipient,'Đơn mua đã cập nhật','Mở đơn để xem hành trình và bước tiếp theo.','order','/dashboard/purchases?id='||p_id::text);
 insert into security_audit(actor_id,subject_id,action,details) values(p_actor,recipient,'PURCHASE_'||p_status,jsonb_build_object('orderId',p_id,'version',o.version+1));
end $$;
revoke all on function reloo_request_purchase(text,text,jsonb),reloo_purchase_action(text,uuid,integer,text) from public,anon,authenticated;
grant execute on function reloo_request_purchase(text,text,jsonb),reloo_purchase_action(text,uuid,integer,text) to service_role;
notify pgrst,'reload schema';
create or replace function public.reloo_rental_sale_gate() returns trigger language plpgsql security definer set search_path=public as $$
declare a assets;
begin
 if new.status not in ('PROPOSED','ACCEPTED','ACTIVE') then return new;end if;
 select * into a from assets where id=new.listing_id for update;
 if a.listing_data->>'transactionMode'='SALE' or a.listing_data->>'saleReservationId' is not null or a.listing_data->>'saleStatus'='SOLD' then raise exception 'ASSET_RESERVED_FOR_SALE';end if;
 return new;
end $$;
drop trigger if exists rental_sale_gate on rental_agreements;
create trigger rental_sale_gate before insert or update of status on rental_agreements for each row execute function reloo_rental_sale_gate();
create or replace function public.reloo_resolve_purchase(p_actor text,p_id uuid,p_version integer,p_action text) returns void language plpgsql security definer set search_path=public as $$
declare o purchase_orders;asset_key text;next_status text;recipient text;
begin
 if not reloo_staff_permission(p_actor,'support.write') then raise exception 'PERMISSION_REQUIRED';end if;
 select asset_id into asset_key from purchase_orders where id=p_id;
 perform 1 from assets where id=asset_key for update;
 select * into o from purchase_orders where id=p_id for update;
 if not found or o.status<>'DISPUTED' or o.version<>p_version or p_action not in ('CANCEL','RESUME') then raise exception 'DISPUTE_VERSION_CONFLICT';end if;
 next_status=case when p_action='CANCEL' then 'CANCELLED' else o.delivery->>'disputedFrom' end;
 if next_status not in ('CANCELLED','CONFIRMED','HANDED_OVER') then raise exception 'INVALID_RESOLUTION';end if;
 if p_action='CANCEL' then update assets set status='available',is_locked=false,listing_data=listing_data-'saleReservationId' where id=asset_key and listing_data->>'saleReservationId'=p_id::text;end if;
 update purchase_orders set status=next_status,version=version+1,updated_at=now() where id=p_id;
 insert into purchase_events(order_id,actor_id,status,version) values(p_id,p_actor,'SUPPORT_'||next_status,o.version+1);
 update crm_records set status='CLOSED',version=version+1,updated_at=now(),data=data||jsonb_build_object('resolution','Purchase support outcome: '||p_action) where module='support' and data->>'purchaseOrderId'=p_id::text;
 foreach recipient in array array[o.buyer_id,o.seller_id] loop
 insert into notifications(user_id,title,body,notification_type,link) values(recipient,'RELOO đã xử lý yêu cầu hỗ trợ','Mở đơn mua để xem kết quả và bước tiếp theo.','order','/dashboard/purchases?id='||p_id::text);
 end loop;
 insert into security_audit(actor_id,action,details) values(p_actor,'PURCHASE_SUPPORT_RESOLVED',jsonb_build_object('orderId',p_id,'outcome',p_action,'version',o.version+1));
end $$;
revoke all on function reloo_rental_sale_gate(),reloo_resolve_purchase(text,uuid,integer,text) from public,anon,authenticated;
grant execute on function reloo_resolve_purchase(text,uuid,integer,text) to service_role;
create or replace function public.reloo_profile_can_trade(p_profile text) returns boolean language plpgsql security definer set search_path=public as $$begin perform reloo_assert_active(p_profile);return true;exception when others then return false;end$$;
revoke all on function reloo_profile_can_trade(text) from public,anon,authenticated;
grant execute on function reloo_profile_can_trade(text) to service_role;
create or replace function public.reloo_asset_gate() returns trigger language plpgsql set search_path=public as $$
begin
 if tg_op='UPDATE' and new.owner_id=old.owner_id and new.status='removed' and exists(select 1 from profiles where id=new.owner_id and deleted_at is not null) then return new;end if;
 -- Closing a reserved purchase is bookkeeping, not permission to relist or edit it.
 if tg_op='UPDATE' and old.is_locked and not new.is_locked and new.status in ('paused','available')
 and (to_jsonb(new)-array['status','is_locked','listing_data','updated_at'])=(to_jsonb(old)-array['status','is_locked','listing_data','updated_at'])
 and (new.listing_data-array['saleReservationId','saleStatus'])=(old.listing_data-array['saleReservationId','saleStatus'])
 and new.listing_data->>'saleReservationId' is null
 and exists(select 1 from purchase_orders where id::text=old.listing_data->>'saleReservationId' and asset_id=old.id and status in ('CONFIRMED','HANDED_OVER','DISPUTED')) then
  if new.status='available' and not reloo_profile_can_trade(new.owner_id) then new.status='paused';end if;
  return new;
 end if;
 perform reloo_assert_active(new.owner_id);return new;
end $$;
create or replace function public.reloo_open_purchase_deletion_gate() returns trigger language plpgsql security definer set search_path=public as $$begin
 if old.deleted_at is null and new.deleted_at is not null and exists(select 1 from purchase_orders where new.id in (buyer_id,seller_id) and status in ('CONFIRMED','HANDED_OVER','DISPUTED')) then raise exception 'OPEN_PURCHASE_REQUIRES_CLOSURE';end if;return new;
end$$;
drop trigger if exists open_purchase_deletion_gate on profiles;
create trigger open_purchase_deletion_gate before update of deleted_at on profiles for each row execute function reloo_open_purchase_deletion_gate();
revoke all on function reloo_open_purchase_deletion_gate() from public,anon,authenticated;
