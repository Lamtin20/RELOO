alter table public.integration_settings drop constraint if exists integration_settings_provider_check;
alter table public.integration_settings add constraint integration_settings_provider_check check(provider in ('VNPT','SEPAY','EVM','TWENTY','GMAIL'));
create table if not exists public.email_delivery_log(notification_id text primary key references notifications(id) on delete cascade,status text not null default 'QUEUED',provider_id text,updated_at timestamptz not null default now());
alter table public.email_delivery_log enable row level security;
revoke all on public.email_delivery_log from public,anon,authenticated;
grant all on public.email_delivery_log to service_role;
create or replace function public.reloo_queue_notification_email() returns trigger language plpgsql security definer set search_path=public as $$
begin
 -- Marketing is opt-in. Operational messages contain no document or chat content.
 if new.notification_type in ('promo','event','news') and not coalesce((select profile_data->'notificationPreferences'->>'marketingEmail'='true' from profiles where id=new.user_id),false) then return new;end if;
 insert into email_delivery_log(notification_id) values(new.id) on conflict do nothing;
 insert into automation_jobs(kind,payload) values('EMAIL_NOTIFY',jsonb_build_object('notificationId',new.id));
 return new;
end $$;
drop trigger if exists notification_email_queue on public.notifications;
create trigger notification_email_queue after insert on public.notifications for each row execute function reloo_queue_notification_email();
create or replace function public.reloo_notify_chat_message() returns trigger language plpgsql security definer set search_path=public as $$
declare recipient text;
begin
 select case when new.sender_id=lender_id then buyer_id else lender_id end into recipient from chat_threads where id=new.thread_id;
 if recipient is null or recipient=new.sender_id then return new;end if;
 insert into notifications(id,user_id,title,body,notification_type,link) values('message_'||new.id,recipient,'Bạn có tin nhắn mới','Mở cuộc trò chuyện trên RELOO để xem và phản hồi.','message','/dashboard/messages?thread='||new.thread_id) on conflict do nothing;
 return new;
end $$;
drop trigger if exists chat_message_notification on public.chat_messages;
create trigger chat_message_notification after insert on public.chat_messages for each row execute function reloo_notify_chat_message();
create or replace function public.reloo_notify_order_event() returns trigger language plpgsql security definer set search_path=public as $$
declare recipient text;
begin
 if tg_op='UPDATE' and new.status is not distinct from old.status then return new;end if;
 foreach recipient in array array[new.renter_id,new.lender_id] loop
 insert into notifications(user_id,title,body,notification_type,link,notification_data) values(recipient,'Đơn hàng RELOO đã cập nhật','Xem trạng thái và các bước tiếp theo của đơn hàng.','order','/dashboard/orders/'||new.id,jsonb_build_object('status',new.status));
 end loop;
 return new;
end $$;
drop trigger if exists order_event_notification on public.transactions;
create trigger order_event_notification after insert or update of status on public.transactions for each row execute function reloo_notify_order_event();
create or replace function public.reloo_notify_registration() returns trigger language plpgsql security definer set search_path=public as $$
begin
 insert into notifications(id,user_id,title,body,notification_type,link) values('welcome_'||new.id,new.id,'Chào mừng bạn đến với RELOO','Hoàn tất hồ sơ để đăng sản phẩm, thuê hoặc mua món đồ bạn yêu thích.','account','/dashboard/profile') on conflict do nothing;
 return new;
end $$;
drop trigger if exists profile_welcome_notification on public.profiles;
create trigger profile_welcome_notification after insert on public.profiles for each row execute function reloo_notify_registration();
notify pgrst,'reload schema';
