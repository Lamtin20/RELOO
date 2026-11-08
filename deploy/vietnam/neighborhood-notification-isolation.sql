begin;
-- Neighborhood outbox manages consent/caps itself. Do not inherit the generic
-- system-notification email trigger and silently send matching/marketing email.
create or replace function public.reloo_queue_notification_email() returns trigger language plpgsql security definer set search_path=public as $$
declare rule notification_rules;selected_rule text;
begin
 if new.notification_data->>'module'='neighborhood' then return new;end if;
 selected_rule=coalesce(new.notification_data->>'rule',case new.notification_type when 'account' then 'registration' when 'promo' then 'promotion' when 'event' then 'promotion' when 'news' then 'news' when 'order' then 'order' when 'message' then 'message' when 'interest' then 'interest' when 'follow' then 'follow' else 'system' end);
 select * into rule from notification_rules where key=selected_rule;
 if found and (not rule.enabled or not rule.email_enabled) then return new;end if;
 if (rule.marketing or new.notification_type in ('promo','event','news','follow')) and not coalesce((select profile_data->'notificationPreferences'->>'marketingEmail'='true' from profiles where id=new.user_id),false) then return new;end if;
 insert into email_delivery_log(notification_id) values(new.id) on conflict do nothing;
 insert into automation_jobs(kind,payload) values('EMAIL_NOTIFY',jsonb_build_object('notificationId',new.id));return new;
end $$;
revoke all on function reloo_queue_notification_email() from public,anon,authenticated;
grant execute on function reloo_queue_notification_email() to service_role;
commit;
