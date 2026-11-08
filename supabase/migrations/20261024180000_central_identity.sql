CREATE TABLE IF NOT EXISTS public.federation_codes (
 secret_hash text PRIMARY KEY CHECK(length(secret_hash)=64), challenge text NOT NULL CHECK(length(challenge)=43),
 client text NOT NULL CHECK(client IN ('staging','chat','agent')), profile_id text NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
 crm_session_id uuid NOT NULL REFERENCES public.crm_mfa_sessions(id) ON DELETE CASCADE,
 envelope text NOT NULL, expires_at timestamptz NOT NULL DEFAULT now()+interval '30 seconds'
);
CREATE TABLE IF NOT EXISTS public.federation_upstream_sessions (
 secret_hash text PRIMARY KEY CHECK(length(secret_hash)=64), client text NOT NULL CHECK(client IN ('staging','chat','agent')),
 profile_id text NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE, crm_session_id uuid NOT NULL REFERENCES public.crm_mfa_sessions(id) ON DELETE CASCADE,
 envelope text NOT NULL, expires_at timestamptz NOT NULL, revoked_at timestamptz
);
CREATE TABLE IF NOT EXISTS public.federation_identities (
 issuer text NOT NULL CHECK(issuer='https://crm.reloo.vn'), issuer_subject uuid NOT NULL,
 profile_id text NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE, enabled boolean NOT NULL DEFAULT false,
 reviewed_by text REFERENCES public.profiles(id), reason text NOT NULL CHECK(length(reason) BETWEEN 20 AND 2000),
 created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(issuer,issuer_subject), UNIQUE(issuer,profile_id), CHECK(NOT enabled OR reviewed_by IS NOT NULL)
);
CREATE TABLE IF NOT EXISTS public.federation_local_sessions (
 secret_hash text PRIMARY KEY CHECK(length(secret_hash)=64), client text NOT NULL CHECK(client IN ('staging','chat','agent')),
 issuer_subject uuid NOT NULL, profile_id text NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
 upstream_reference text NOT NULL, expires_at timestamptz NOT NULL, revoked_at timestamptz
);
ALTER TABLE public.federation_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.federation_upstream_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.federation_identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.federation_local_sessions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.federation_codes,public.federation_upstream_sessions,public.federation_identities,public.federation_local_sessions FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.federation_codes,public.federation_upstream_sessions,public.federation_identities,public.federation_local_sessions TO service_role;
CREATE OR REPLACE FUNCTION public.reloo_federation_consume(p_hash text,p_challenge text,p_client text) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE code federation_codes;
BEGIN
 DELETE FROM federation_codes WHERE secret_hash=p_hash AND challenge=p_challenge AND client=p_client AND expires_at>now() RETURNING * INTO code;
 IF NOT FOUND THEN RETURN NULL;END IF;
 IF NOT EXISTS(SELECT 1 FROM crm_mfa_sessions WHERE id=code.crm_session_id AND profile_id=code.profile_id AND revoked_at IS NULL AND expires_at>now()) OR NOT EXISTS(SELECT 1 FROM crm_staff WHERE profile_id=code.profile_id AND enabled AND (role IN ('owner','admin') OR ('crm.read'=ANY(permissions) AND role='staff'))) THEN RETURN NULL;END IF;
 RETURN code.envelope;
END $$;
CREATE OR REPLACE FUNCTION public.reloo_federation_purge() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 DELETE FROM federation_codes WHERE expires_at<=now();
 DELETE FROM federation_upstream_sessions WHERE expires_at<=now() OR revoked_at IS NOT NULL OR crm_session_id IN (SELECT id FROM crm_mfa_sessions WHERE revoked_at IS NOT NULL);
 DELETE FROM federation_identities WHERE profile_id IN (SELECT id FROM profiles WHERE deleted_at IS NOT NULL);
 DELETE FROM federation_local_sessions s WHERE expires_at<=now() OR revoked_at IS NOT NULL OR NOT EXISTS(SELECT 1 FROM federation_identities i WHERE i.issuer_subject=s.issuer_subject AND i.profile_id=s.profile_id AND i.enabled);
END $$;
REVOKE ALL ON FUNCTION public.reloo_federation_consume(text,text,text),public.reloo_federation_purge() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reloo_federation_consume(text,text,text),public.reloo_federation_purge() TO service_role;
