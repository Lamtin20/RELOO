-- Read-only export of routine/trigger definitions. Pipe result to encrypted backup.
select command from (
 select 0 ordinal,'DROP TRIGGER IF EXISTS nk_identity_approval ON public.nk_orders;' command
 union all
 select 10,pg_get_functiondef(p.oid)||';' from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='public' and p.proname in ('reloo_request_purchase','reloo_purchase_action','reloo_create_inquiry','reloo_send_message','reloo_change_rental','reloo_create_nearby_request','reloo_asset_gate','reloo_expired_identity_guard','reloo_assert_identity','reloo_assert_buyer_active','reloo_nk_identity_guard')
 union all
 select 20,'DROP FUNCTION IF EXISTS public.reloo_nk_identity_guard();' where to_regprocedure('public.reloo_nk_identity_guard()') is null
 union all
 select 21,'DROP FUNCTION IF EXISTS public.reloo_assert_identity(text);' where to_regprocedure('public.reloo_assert_identity(text)') is null
 union all
 select 22,'DROP FUNCTION IF EXISTS public.reloo_assert_buyer_active(text);' where to_regprocedure('public.reloo_assert_buyer_active(text)') is null
 union all
 select 30,pg_get_triggerdef(oid)||';' from pg_trigger where tgname='nk_identity_approval' and tgrelid='public.nk_orders'::regclass and not tgisinternal
) rollback_steps order by ordinal,command;
