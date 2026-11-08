ALTER TABLE public.management_sso_tickets DROP CONSTRAINT IF EXISTS management_sso_tickets_target_origin_check;
ALTER TABLE public.management_sso_tickets ADD CONSTRAINT management_sso_tickets_target_origin_check CHECK(target_origin IN ('https://chat.reloo.vn','https://agent.reloo.vn'));
-- Agent Office currently exposes administrator-only operational telemetry.
-- Application authorization is repeated on every read; SSO never grants a role.
REVOKE ALL ON public.management_sso_tickets,public.management_sso_sessions FROM PUBLIC,anon,authenticated;
