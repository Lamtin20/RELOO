begin;
create table if not exists nk_evidence(id uuid primary key,order_id uuid not null references nk_orders(id),profile_id text not null references profiles(id),filename text not null,created_at timestamptz not null default now(),expires_at timestamptz not null default now()+interval '90 days');
alter table nk_evidence enable row level security;
revoke all on nk_evidence from public,anon,authenticated;
grant all on nk_evidence to service_role;
create or replace function reloo_neighborhood_evidence(p_actor text,p_id uuid,p_order uuid,p_filename text,p_action text) returns jsonb language plpgsql security definer set search_path=public as $$
declare o nk_orders;e nk_evidence;
begin
 select * into o from nk_orders where id=case when p_action='READ' then (select order_id from nk_evidence where id=p_id) else p_order end;
 if not found or p_actor not in (o.owner_id,o.renter_id) then raise exception 'NOT_FOUND';end if;
 if p_action='ADD' then
 if p_filename<>p_id::text||'.enc' or o.status='DRAFT' then raise exception 'INVALID_INPUT';end if;
 insert into nk_evidence(id,order_id,profile_id,filename) values(p_id,o.id,p_actor,p_filename);return jsonb_build_object('id',p_id);
 elsif p_action='REMOVE' then delete from nk_evidence where id=p_id and profile_id=p_actor;return '{}';
 elsif p_action='READ' then select * into e from nk_evidence where id=p_id;
 if e.expires_at<=now() and o.status in ('COMPLETED','CANCELLED','EXPIRED') and o.dispute_status<>'DISPUTED' then raise exception 'NOT_FOUND';end if;
 insert into nk_audit(actor_id,resource_id,action,correlation_id) values(p_actor,p_id::text,'EVIDENCE_READ',gen_random_uuid());return jsonb_build_object('filename',e.filename);
 else raise exception 'INVALID_INPUT';end if;
end $$;
create or replace function reloo_neighborhood_admin_evidence(p_actor text,p_id uuid) returns jsonb language plpgsql security definer set search_path=public as $$
declare e nk_evidence;
begin
 if not reloo_staff_permission(p_actor,'neighborhood.evidence') then raise exception 'FORBIDDEN';end if;
 select * into e from nk_evidence where id=p_id;if not found then raise exception 'NOT_FOUND';end if;
 insert into nk_audit(actor_id,resource_id,action,correlation_id) values(p_actor,p_id::text,'EVIDENCE_ADMIN_READ',gen_random_uuid());
 return jsonb_build_object('filename',e.filename);
end $$;
create or replace function reloo_neighborhood_replay(p_actor text,p_key uuid,p_action text,p_fingerprint text) returns jsonb language plpgsql security definer set search_path=public as $$
declare prior nk_operations;
begin select * into prior from nk_operations where actor_id=p_actor and key=p_key;if not found then return null;end if;
 if prior.action<>p_action or prior.fingerprint<>p_fingerprint then raise exception 'REQUEST_CONFLICT';end if;return prior.result;
end $$;
revoke all on function reloo_neighborhood_evidence(text,uuid,uuid,text,text),reloo_neighborhood_replay(text,uuid,text,text) from public,anon,authenticated;
grant execute on function reloo_neighborhood_evidence(text,uuid,uuid,text,text),reloo_neighborhood_replay(text,uuid,text,text) to service_role;
revoke all on function reloo_neighborhood_admin_evidence(text,uuid) from public,anon,authenticated;
grant execute on function reloo_neighborhood_admin_evidence(text,uuid) to service_role;
commit;
