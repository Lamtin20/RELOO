create table if not exists public.notification_rules(key text primary key,enabled boolean not null default true,email_enabled boolean not null default true,marketing boolean not null default false,version integer not null default 1);
insert into notification_rules(key,marketing) values('registration',false),('otp',false),('order',false),('order_status',false),('message',false),('interest',false),('follow',true),('promotion',true),('news',true),('system',false) on conflict do nothing;
create table if not exists public.marketplace_follows(profile_id text not null references profiles(id) on delete cascade,kind text not null check(kind in ('LISTING','OWNER')),target_id text not null,created_at timestamptz not null default now(),primary key(profile_id,kind,target_id));
alter table notification_rules enable row level security;alter table marketplace_follows enable row level security;
revoke all on notification_rules,marketplace_follows from public,anon,authenticated;grant all on notification_rules,marketplace_follows to service_role;
create or replace function public.reloo_emit_notification(p_rule text,p_event text,p_recipient text,p_title text,p_body text,p_link text) returns void language plpgsql security definer set search_path=public as $$
begin
 if not exists(select 1 from notification_rules where key=p_rule and enabled) then return;end if;
 insert into notifications(id,user_id,title,body,notification_type,link,notification_data) values('rule_'||md5(p_rule||':'||p_event||':'||p_recipient),p_recipient,p_title,p_body,case when p_rule='promotion' then 'promo' when p_rule='registration' then 'account' when p_rule='order_status' then 'order' else p_rule end,p_link,jsonb_build_object('rule',p_rule)) on conflict do nothing;
end $$;
create or replace function public.reloo_notify_rental_event() returns trigger language plpgsql security definer set search_path=public as $$
declare agreement rental_agreements;recipient text;
begin
 select * into agreement from rental_agreements where id=new.agreement_id;
 recipient=case when new.actor_id=agreement.lender_id then agreement.renter_id else agreement.lender_id end;
 if recipient is not null then perform reloo_emit_notification('order_status','rental:'||new.id::text,recipient,'Thỏa thuận thuê có cập nhật','Mở cuộc trò chuyện để xem hành trình giao nhận và xác nhận mới.','/dashboard/messages?thread='||agreement.thread_id);end if;
 return new;
end $$;
drop trigger if exists rental_event_notification on rental_history_events;
create trigger rental_event_notification after insert on rental_history_events for each row execute function reloo_notify_rental_event();
create or replace function public.reloo_set_follow(p_actor text,p_kind text,p_target text,p_enabled boolean) returns void language plpgsql security definer set search_path=public as $$
declare recipient text;
begin
 if not exists(select 1 from profiles where id=p_actor) or p_kind not in ('LISTING','OWNER') then raise exception 'FOLLOW_INVALID';end if;
 if p_kind='LISTING' then select owner_id into recipient from assets where id=p_target and status in ('available','rented');else select id into recipient from profiles where id=p_target;end if;
 if recipient is null then raise exception 'TARGET_UNAVAILABLE';end if;
 if p_enabled then
  insert into marketplace_follows(profile_id,kind,target_id) values(p_actor,p_kind,p_target) on conflict do nothing;
  if found and recipient<>p_actor then perform reloo_emit_notification(case when p_kind='LISTING' then 'interest' else 'follow' end,p_actor||':'||p_target,recipient,case when p_kind='LISTING' then 'Có người quan tâm món đồ của bạn' else 'Có người theo dõi bạn' end,'Mở RELOO để xem và quản lý thông tin. ',case when p_kind='LISTING' then '/product/'||p_target else '/user/'||p_target end);end if;
 else delete from marketplace_follows where profile_id=p_actor and kind=p_kind and target_id=p_target;end if;
end $$;
create or replace function public.reloo_save_notification_rule(p_actor text,p_key text,p_version integer,p_enabled boolean,p_email boolean) returns void language plpgsql security definer set search_path=public as $$
begin
 if not reloo_staff_permission(p_actor,'settings.write') then raise exception 'PERMISSION_REQUIRED';end if;
 update notification_rules set enabled=p_enabled,email_enabled=p_email,version=version+1 where key=p_key and version=p_version;
 if not found then raise exception 'VERSION_CONFLICT';end if;
 insert into security_audit(actor_id,action,details) values(p_actor,'NOTIFICATION_RULE_UPDATED',jsonb_build_object('rule',p_key,'enabled',p_enabled,'email',p_email,'version',p_version+1));
end $$;
create or replace function public.reloo_queue_notification_email() returns trigger language plpgsql security definer set search_path=public as $$
declare rule notification_rules;selected_rule text;
begin
 selected_rule=coalesce(new.notification_data->>'rule',case new.notification_type when 'account' then 'registration' when 'promo' then 'promotion' when 'event' then 'promotion' when 'news' then 'news' when 'order' then 'order' when 'message' then 'message' when 'interest' then 'interest' when 'follow' then 'follow' else 'system' end);
 select * into rule from notification_rules where key=selected_rule;
 if found and (not rule.enabled or not rule.email_enabled) then return new;end if;
 if (rule.marketing or new.notification_type in ('promo','event','news','follow')) and not coalesce((select profile_data->'notificationPreferences'->>'marketingEmail'='true' from profiles where id=new.user_id),false) then return new;end if;
 insert into email_delivery_log(notification_id) values(new.id) on conflict do nothing;
 insert into automation_jobs(kind,payload) values('EMAIL_NOTIFY',jsonb_build_object('notificationId',new.id));return new;
end $$;
create or replace function public.reloo_queue_publication_notice() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if tg_table_name='assets' then
  if new.status='available' and (tg_op='INSERT' or old.status is distinct from new.status) then insert into automation_jobs(kind,payload) values('NOTIFY_BROADCAST',jsonb_build_object('source','ASSET','id',new.id));end if;
 elsif tg_table_name='news_articles' then
  if new.status in ('PUBLISHED','SCHEDULED') and (tg_op='INSERT' or old.status is distinct from new.status) then insert into automation_jobs(kind,payload,run_at) values('NOTIFY_BROADCAST',jsonb_build_object('source','NEWS','id',new.id),greatest(now(),coalesce(new.publish_at,now())));end if;
 elsif tg_table_name='promotion_campaigns' then
  if new.status='ACTIVE' and (tg_op='INSERT' or old.status is distinct from new.status) then insert into automation_jobs(kind,payload,run_at) values('NOTIFY_BROADCAST',jsonb_build_object('source','PROMOTION','id',new.id),greatest(now(),new.starts_at));end if;
 end if;return new;
end $$;
drop trigger if exists followed_owner_publication on assets;create trigger followed_owner_publication after insert or update of status on assets for each row execute function reloo_queue_publication_notice();
drop trigger if exists news_publication_notice on news_articles;create trigger news_publication_notice after insert or update of status on news_articles for each row execute function reloo_queue_publication_notice();
drop trigger if exists promotion_publication_notice on promotion_campaigns;create trigger promotion_publication_notice after insert or update of status on promotion_campaigns for each row execute function reloo_queue_publication_notice();
revoke all on function reloo_emit_notification(text,text,text,text,text,text),reloo_set_follow(text,text,text,boolean),reloo_save_notification_rule(text,text,integer,boolean,boolean),reloo_queue_notification_email(),reloo_queue_publication_notice() from public,anon,authenticated;
grant execute on function reloo_emit_notification(text,text,text,text,text,text),reloo_set_follow(text,text,text,boolean),reloo_save_notification_rule(text,text,integer,boolean,boolean) to service_role;
notify pgrst,'reload schema';
create or replace function public.reloo_notification_preferences(p_actor text,p_marketing boolean) returns void language plpgsql security definer set search_path=public as $$
begin
 update profiles set profile_data=coalesce(profile_data,'{}')||jsonb_build_object('notificationPreferences',coalesce(profile_data->'notificationPreferences','{}')||jsonb_build_object('marketingEmail',p_marketing)) where id=p_actor;
 if not found then raise exception 'PROFILE_REQUIRED';end if;
 insert into security_audit(actor_id,action,details) values(p_actor,'NOTIFICATION_PREFERENCES_CHANGED',jsonb_build_object('marketingEmail',p_marketing));
end $$;
revoke all on function reloo_notification_preferences(text,boolean) from public,anon,authenticated;
grant execute on function reloo_notification_preferences(text,boolean) to service_role;
create or replace function public.reloo_notification_rule_gate() returns trigger language plpgsql security definer set search_path=public as $$
declare key_name text;
begin
 key_name=coalesce(new.notification_data->>'rule',case new.notification_type when 'account' then 'registration' when 'promo' then 'promotion' when 'event' then 'promotion' when 'order' then 'order' when 'message' then 'message' when 'interest' then 'interest' when 'follow' then 'follow' when 'news' then 'news' else 'system' end);
 if exists(select 1 from notification_rules where key=key_name and not enabled) then return null;end if;
 return new;
end $$;
drop trigger if exists notification_rule_gate on notifications;create trigger notification_rule_gate before insert on notifications for each row execute function reloo_notification_rule_gate();
revoke all on function reloo_notification_rule_gate() from public,anon,authenticated;
create or replace function public.reloo_notify_order_event() returns trigger language plpgsql security definer set search_path=public as $$
declare recipient text;
begin
 if tg_op='UPDATE' and new.status is not distinct from old.status then return new;end if;
 foreach recipient in array array[new.renter_id,new.lender_id] loop
 perform reloo_emit_notification(case when tg_op='INSERT' then 'order' else 'order_status' end,new.id||':'||new.status||':'||now()::text,recipient,'Đơn hàng RELOO đã cập nhật','Xem trạng thái và các bước tiếp theo của đơn hàng.','/dashboard/orders/'||new.id);
 end loop;return new;
end $$;
