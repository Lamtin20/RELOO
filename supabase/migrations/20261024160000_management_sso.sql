CREATE TABLE IF NOT EXISTS public.management_sso_tickets(token_hash text PRIMARY KEY CHECK(length(token_hash)=64),challenge text NOT NULL CHECK(length(challenge)=43),target_origin text NOT NULL CHECK(target_origin='https://chat.reloo.vn'),profile_id text REFERENCES profiles(id) ON DELETE CASCADE,crm_session_id uuid REFERENCES crm_mfa_sessions(id) ON DELETE CASCADE,envelope text NOT NULL,expires_at timestamptz NOT NULL DEFAULT now()+interval '30 seconds');
ALTER TABLE public.management_sso_tickets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.management_sso_tickets FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.management_sso_tickets TO service_role;
CREATE TABLE IF NOT EXISTS public.management_sso_sessions(secret_hash text PRIMARY KEY CHECK(length(secret_hash)=64),profile_id text REFERENCES profiles(id) ON DELETE CASCADE,crm_session_id uuid REFERENCES crm_mfa_sessions(id) ON DELETE CASCADE,envelope text NOT NULL,expires_at timestamptz NOT NULL);
ALTER TABLE public.management_sso_sessions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.management_sso_sessions FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.management_sso_sessions TO service_role;
CREATE OR REPLACE FUNCTION public.reloo_management_sso_consume(p_hash text,p_challenge text,p_target text) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE t management_sso_tickets;
BEGIN
 DELETE FROM management_sso_tickets WHERE token_hash=p_hash AND challenge=p_challenge AND target_origin=p_target AND expires_at>now() RETURNING * INTO t;
 IF NOT FOUND THEN RETURN NULL;END IF;
 IF NOT EXISTS(SELECT 1 FROM crm_mfa_sessions s WHERE s.id=t.crm_session_id AND s.profile_id=t.profile_id AND s.revoked_at IS NULL AND s.expires_at>now()) OR NOT reloo_ai_allowed(t.profile_id,'crm.read') OR NOT (reloo_ai_allowed(t.profile_id,'bots.read') OR reloo_ai_allowed(t.profile_id,'support.read')) THEN RETURN NULL;END IF;
 RETURN t.envelope;
END $$;
CREATE OR REPLACE FUNCTION public.reloo_management_sso_purge() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$ BEGIN DELETE FROM management_sso_tickets WHERE expires_at<=now();DELETE FROM management_sso_sessions WHERE expires_at<=now() OR crm_session_id IN (SELECT id FROM crm_mfa_sessions WHERE revoked_at IS NOT NULL);END $$;
REVOKE ALL ON FUNCTION public.reloo_management_sso_consume(text,text,text),public.reloo_management_sso_purge() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reloo_management_sso_consume(text,text,text),public.reloo_management_sso_purge() TO service_role;
