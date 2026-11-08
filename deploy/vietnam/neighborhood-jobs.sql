begin;
insert into notification_rules(key,enabled,email_enabled,marketing) values('neighborhood_inapp',true,false,false) on conflict(key) do nothing;
create table if not exists nk_payment_events(
 provider text not null,event_id text not null,order_id uuid not null references nk_orders(id),fingerprint text not null,
 sequence integer not null,status text not null,amount bigint not null,result text not null,created_at timestamptz not null default now(),primary key(provider,event_id)
);
alter table nk_payment_events enable row level security;
revoke all on nk_payment_events from public,anon,authenticated;
grant all on nk_payment_events to service_role;
create or replace function reloo_neighborhood_payment(p_provider text,p_event text,p_order uuid,p_status text,p_amount bigint,p_sequence integer,p_fingerprint text) returns text language plpgsql security definer set search_path=public as $$
declare o nk_orders;prior nk_payment_events;result text;correlation uuid:=gen_random_uuid();
begin
 perform pg_advisory_xact_lock(hashtextextended('nk-payment:'||p_provider||':'||p_event,0));
 select * into prior from nk_payment_events where provider=p_provider and event_id=p_event;
 if found then if prior.fingerprint<>p_fingerprint or prior.order_id<>p_order then raise exception 'REQUEST_CONFLICT';end if;return prior.result;end if;
 select * into o from nk_orders where id=p_order;if not found then raise exception 'NOT_FOUND';end if;
 perform 1 from assets where id=o.asset_id for update;select * into o from nk_orders where id=p_order for update;
 if p_provider<>'SANDBOX' or p_sequence<1 or p_status not in ('PAID','FAILED','PENDING') then raise exception 'INVALID_INPUT';end if;
 result:='REVIEW';
 if exists(select 1 from nk_payment_events pe where pe.order_id=p_order and pe.sequence>=p_sequence and pe.result='APPLIED') or o.payment_status='PAID' then result:='IGNORED';
 elsif o.status='PENDING_PAYMENT' and o.hold_until>now() and p_amount=(o.snapshot->>'total')::bigint then
 result:='APPLIED';
 if p_status='PAID' then
 update nk_orders set status='CONFIRMED',payment_status='PAID',deposit_status=case when (snapshot->>'deposit')::bigint>0 then 'HELD_DIRECT' else 'NOT_REQUIRED' end,version=version+1,updated_at=now() where id=o.id;
 perform nk_emit('ORDER_CONFIRMED',o.id::text,o.renter_id,correlation);perform nk_emit('PAYMENT_CONFIRMED',o.id::text,o.owner_id,correlation);
 elsif p_status='FAILED' then perform nk_emit('PAYMENT_FAILED',o.id::text,o.renter_id,correlation);end if;
 end if;
 insert into nk_payment_events(provider,event_id,order_id,fingerprint,sequence,status,amount,result) values(p_provider,p_event,p_order,p_fingerprint,p_sequence,p_status,p_amount,result);
 return result;
end $$;

create or replace function reloo_neighborhood_maintenance() returns integer language plpgsql security definer set search_path=public as $$
declare o nk_orders;m nk_memberships;n integer:=0;c uuid;kind text;
begin
 if not pg_try_advisory_xact_lock(hashtextextended('nk-maintenance',0)) then return 0;end if;
 for o in select * from nk_orders where status in ('PENDING_OWNER','PENDING_PAYMENT') and hold_until<=now() order by hold_until for update skip locked limit 100 loop
 c:=gen_random_uuid();update nk_orders set status='EXPIRED',refund_status=case when payment_status='PAID' then 'REFUND_PENDING' else refund_status end,version=version+1,updated_at=now() where id=o.id;
 insert into nk_order_events(order_id,actor_id,action,correlation_id) values(o.id,'SYSTEM','EXPIRED',c);
 perform nk_emit('ORDER_CANCELLED',o.id::text,o.owner_id,c);perform nk_emit('ORDER_CANCELLED',o.id::text,o.renter_id,c);n:=n+1;end loop;
 for m in select * from nk_memberships where status='VERIFIED' and verified_until<=now() for update skip locked limit 100 loop
 update nk_memberships set status='REVERIFY',updated_at=now(),reason='VERIFICATION_EXPIRED' where id=m.id;perform nk_emit('RESIDENCY_UPDATED',m.id::text,m.profile_id,gen_random_uuid());end loop;
 for m in select membership.* from nk_memberships membership where membership.status='PENDING' and exists(select 1 from nk_verifications v where v.membership_id=membership.id and v.status='PENDING' and v.created_at<now()-interval '30 days') for update skip locked limit 100 loop
 update nk_verifications set status='EXPIRED',note=null,reason='REVIEW_TIMEOUT',reviewed_at=now() where membership_id=m.id and status='PENDING' and created_at<now()-interval '30 days';
 if not exists(select 1 from nk_verifications where membership_id=m.id and status='PENDING') then update nk_memberships set status='REVERIFY',reason='REVIEW_TIMEOUT',verified_until=null,updated_at=now() where id=m.id;perform nk_emit('RESIDENCY_UPDATED',m.id::text,m.profile_id,gen_random_uuid());end if;end loop;
 -- Select due, unsent milestones before the batch limit: newer non-due orders
 -- must not starve older returns. Recipient is part of the milestone identity.
 for o in select rental.* from nk_orders rental
 cross join lateral (select case
 when rental.status in ('PENDING_OWNER','PENDING_PAYMENT') and rental.hold_until between now() and now()+interval '10 minutes' then 'HOLD_REMINDER'
 when rental.status in ('CONFIRMED','READY_FOR_HANDOVER') and rental.starts_at between now() and now()+interval '1 hour' then 'HANDOVER_REMINDER'
 when rental.status in ('ACTIVE','RETURN_PENDING') and rental.ends_at<now() then 'OVERDUE'
 when rental.status='ACTIVE' and rental.ends_at between now() and now()+interval '1 hour' then 'RETURN_REMINDER' end event) due
 where due.event is not null and exists(select 1 from unnest(case
 when due.event='HOLD_REMINDER' then array[case when rental.status='PENDING_OWNER' then rental.owner_id else rental.renter_id end]
 else array[rental.owner_id,rental.renter_id] end) member_id
 where not exists(select 1 from nk_outbox e where e.dedup_key='reminder:'||rental.id||':'||due.event||':'||rental.status||':'||rental.ends_at::text||':'||member_id))
 order by coalesce(rental.hold_until,rental.ends_at) limit 500 loop
 kind:=null;
 if o.status in ('PENDING_OWNER','PENDING_PAYMENT') and o.hold_until between now() and now()+interval '10 minutes' then kind:='HOLD_REMINDER';
 elsif o.status in ('CONFIRMED','READY_FOR_HANDOVER') and o.starts_at between now() and now()+interval '1 hour' then kind:='HANDOVER_REMINDER';
 elsif o.status in ('ACTIVE','RETURN_PENDING') and o.ends_at<now() then kind:='OVERDUE';
 elsif o.status='ACTIVE' and o.ends_at between now() and now()+interval '1 hour' then kind:='RETURN_REMINDER';end if;
 if kind is not null then insert into nk_outbox(event,aggregate_id,recipient_id,correlation_id,dedup_key)
 select kind,o.id::text,member_id,gen_random_uuid(),'reminder:'||o.id||':'||kind||':'||o.status||':'||o.ends_at::text||':'||member_id
 from unnest(case when kind='HOLD_REMINDER' then array[case when o.status='PENDING_OWNER' then o.owner_id else o.renter_id end]
 else array[o.owner_id,o.renter_id] end) member_id on conflict do nothing;end if;
 end loop;
 update nk_outbox set status='SKIPPED',last_error='EXPIRED' where status='QUEUED' and expires_at<=now();
 -- Retention: no OTP/invite secrets retained after validity. Transactions and disputes are preserved.
 delete from nk_handover_codes where expires_at<now()-interval '1 day';delete from nk_invites where expires_at<now()-interval '30 days';
 update nk_verifications set note=null where created_at<now()-interval '30 days' and status<>'PENDING';
 delete from nk_outbox where created_at<now()-interval '90 days' and status in ('SENT','SKIPPED');
 return n;
end $$;

create or replace function reloo_neighborhood_deliver(p_id uuid,p_title text,p_body text,p_link text,p_now timestamptz default now()) returns text language plpgsql security definer set search_path=public as $$
declare e nk_outbox;pref nk_preferences;h integer;count_sent integer;member_id text;
begin
 select recipient_id into member_id from nk_outbox where id=p_id;if member_id is null then return 'MISSING';end if;
 perform pg_advisory_xact_lock(hashtextextended('nk-delivery:'||member_id,0));
 select * into e from nk_outbox where id=p_id for update;
 if e.status<>'QUEUED' or e.available_at>p_now then return 'NOT_DUE';end if;
 if e.expires_at<=p_now or not exists(select 1 from profiles where id=e.recipient_id and deleted_at is null and (e.category='transaction' or activation_status='ACTIVE')) then update nk_outbox set status='SKIPPED',last_error='INELIGIBLE' where id=e.id;return 'SKIPPED';end if;
 if e.event in ('HOLD_REMINDER','HANDOVER_REMINDER','RETURN_REMINDER','OVERDUE') and not exists(
 select 1 from nk_orders rental where rental.id::text=e.aggregate_id and e.recipient_id in (rental.owner_id,rental.renter_id) and case e.event
 when 'HOLD_REMINDER' then rental.hold_until>p_now and ((rental.status='PENDING_OWNER' and e.recipient_id=rental.owner_id) or (rental.status='PENDING_PAYMENT' and e.recipient_id=rental.renter_id))
 when 'HANDOVER_REMINDER' then rental.status in ('CONFIRMED','READY_FOR_HANDOVER')
 when 'RETURN_REMINDER' then rental.status in ('ACTIVE','RETURN_PENDING')
 when 'OVERDUE' then rental.status in ('ACTIVE','RETURN_PENDING') and rental.ends_at<p_now else false end
 ) then update nk_outbox set status='SKIPPED',last_error='NO_LONGER_DUE' where id=e.id;return 'SKIPPED';end if;
 if e.category<>'transaction' then
 select * into pref from nk_preferences where profile_id=e.recipient_id;
 if not found or (e.category='match' and not pref.match_enabled) or (e.category='marketing' and not pref.marketing_enabled) then update nk_outbox set status='SKIPPED',last_error='OPT_OUT' where id=e.id;return 'SKIPPED';end if;
 if e.event='NEED_MATCH' and not exists(select 1 from nk_needs n join nk_listings l on l.area_id=n.area_id join assets a on a.id=l.asset_id where n.id=e.aggregate_id::uuid and n.status='OPEN' and n.expires_at>p_now and l.owner_id=e.recipient_id and l.status='ACTIVE' and a.category=n.category and nk_asset_usable(a.id) and not coalesce(a.is_locked,false) and nk_eligible(n.profile_id,l.asset_id) and nk_calendar_free(l.asset_id,n.starts_at,n.ends_at,l.buffer_minutes)) then update nk_outbox set status='SKIPPED',last_error='NO_LONGER_MATCHED' where id=e.id;return 'SKIPPED';end if;
 h:=extract(hour from p_now at time zone 'Asia/Ho_Chi_Minh');
 if pref.quiet_start<>pref.quiet_end and (case when pref.quiet_start<pref.quiet_end then h>=pref.quiet_start and h<pref.quiet_end else h>=pref.quiet_start or h<pref.quiet_end end) then update nk_outbox set available_at=p_now+interval '1 hour' where id=e.id;return 'QUIET';end if;
 select count(*) into count_sent from nk_outbox where recipient_id=e.recipient_id and category<>'transaction' and delivered_at>=date_trunc('day',p_now at time zone 'Asia/Ho_Chi_Minh') at time zone 'Asia/Ho_Chi_Minh';
 if count_sent>=pref.daily_cap then update nk_outbox set available_at=((date_trunc('day',p_now at time zone 'Asia/Ho_Chi_Minh')+interval '1 day') at time zone 'Asia/Ho_Chi_Minh') where id=e.id;return 'CAPPED';end if;
 end if;
 if p_link not like '/noi-khu%' or length(p_title)>160 or length(p_body)>500 then raise exception 'INVALID_INPUT';end if;
 insert into notifications(id,user_id,title,body,notification_type,link,notification_data) values('nk_'||e.id,e.recipient_id,p_title,p_body,'system',p_link,jsonb_build_object('rule','neighborhood_inapp','module','neighborhood','event',e.event,'eventId',e.id,'correlationId',e.correlation_id)) on conflict(id) do nothing;
 if not exists(select 1 from notifications where id='nk_'||e.id) then update nk_outbox set status='SKIPPED',last_error='INBOX_DISABLED' where id=e.id;return 'SKIPPED';end if;
 update nk_outbox set status='SENT',delivered_at=p_now,attempts=attempts+1 where id=e.id;return 'SENT';
end $$;

create or replace function reloo_neighborhood_stage(p_source uuid,p_rows jsonb) returns integer language plpgsql security definer set search_path=public as $$
declare s nk_sources;r jsonb;existing nk_places;n integer:=0;
begin
 select * into s from nk_sources where id=p_source and enabled and storage_allowed for update;if not found then raise exception 'SOURCE_NOT_ALLOWED';end if;
 if jsonb_array_length(p_rows)>1000 then raise exception 'INVALID_INPUT';end if;
 for r in select * from jsonb_array_elements(p_rows) loop
 select * into existing from nk_places where source_id=p_source and external_id=r->>'externalId';
 if existing.admin_locked then continue;end if;
 if existing.id is not null and existing.source_version is not distinct from r->>'sourceVersion' and existing.name=r->>'name' and existing.geometry is not distinct from nullif(r->'geometry','null')
 and existing.address_raw=coalesce(r->>'addressRaw','') and existing.address_normalized=coalesce(r->>'address','') and existing.administrative=coalesce(r->'administrative','{}')
 and existing.aliases=array(select jsonb_array_elements_text(coalesce(r->'aliases','[]')))
 and existing.parent_id is not distinct from coalesce(nullif(r->>'parent','')::uuid,(select id from nk_places where source_id=p_source and external_id=r->>'parentExternalId')) then continue;end if;
 insert into nk_place_changes(source_id,external_id,place_id,proposal,fingerprint) values(p_source,r->>'externalId',existing.id,r,md5(r::text)) on conflict do nothing;n:=n+1;end loop;return n;
end $$;
do $$declare f record;begin for f in select oid::regprocedure signature from pg_proc where pronamespace='public'::regnamespace and (proname like 'nk\_%' escape '\' or proname like 'reloo_neighborhood_%') loop
 execute format('revoke all on function %s from public,anon,authenticated',f.signature);execute format('grant execute on function %s to service_role',f.signature);end loop;end $$;
notify pgrst,'reload schema';
commit;
