begin;
alter table nk_evidence add column if not exists purge_state text not null default 'RETAINED';
alter table nk_evidence add column if not exists purge_lease timestamptz;
create or replace function reloo_neighborhood_claim_purge() returns table(id uuid,filename text) language plpgsql security definer set search_path=public as $$
declare e nk_evidence;o nk_orders;
begin
 for e in select * from nk_evidence ev where expires_at<now() and (purge_state='RETAINED' or purge_lease<now()) order by expires_at limit 20 loop
 select * into o from nk_orders where nk_orders.id=e.order_id;
 perform 1 from assets where assets.id=o.asset_id for update;
 select * into o from nk_orders where nk_orders.id=e.order_id for update;
 if o.status not in ('COMPLETED','CANCELLED','EXPIRED') or o.dispute_status='DISPUTED' or exists(select 1 from nk_disputes where order_id=o.id and status='OPEN') then continue;end if;
 update nk_evidence set purge_state='PURGING',purge_lease=now()+interval '5 minutes' where nk_evidence.id=e.id;
 id:=e.id;filename:=e.filename;return next;
 end loop;
end $$;
create or replace function reloo_neighborhood_finish_purge(p_id uuid) returns void language plpgsql security definer set search_path=public as $$
declare e nk_evidence;
begin
 select * into e from nk_evidence where id=p_id for update;
 if not found or e.purge_state<>'PURGING' then return;end if;
 if exists(select 1 from nk_orders where id=e.order_id and dispute_status='DISPUTED') then raise exception 'INVALID_STATE';end if;
 delete from nk_evidence where id=p_id;
 insert into nk_audit(actor_id,resource_id,action,reason,correlation_id) values('SYSTEM',p_id::text,'EVIDENCE_PURGED','RETENTION_EXPIRED',gen_random_uuid());
end $$;
revoke all on function reloo_neighborhood_claim_purge(),reloo_neighborhood_finish_purge(uuid) from public,anon,authenticated;
grant execute on function reloo_neighborhood_claim_purge(),reloo_neighborhood_finish_purge(uuid) to service_role;
commit;
