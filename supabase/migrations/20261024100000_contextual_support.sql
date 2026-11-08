ALTER TABLE public.support_conversations ADD COLUMN IF NOT EXISTS guest_hash text;
ALTER TABLE public.support_conversations ADD COLUMN IF NOT EXISTS expires_at timestamptz;
ALTER TABLE public.support_conversations ADD COLUMN IF NOT EXISTS context jsonb NOT NULL DEFAULT '{}';
CREATE INDEX IF NOT EXISTS support_guest_session ON public.support_conversations(guest_hash,created_at DESC);
CREATE TABLE IF NOT EXISTS public.support_requests(id uuid PRIMARY KEY,conversation_id uuid NOT NULL REFERENCES public.support_conversations(id) ON DELETE CASCADE,content_hash text NOT NULL,response jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE public.support_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.support_requests FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.support_requests TO service_role;
CREATE OR REPLACE FUNCTION public.reloo_support_commit(p_actor text,p_guest text,p_id uuid,p_request uuid,p_hash text,p_data jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE c support_conversations;r support_requests;result jsonb;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtext(p_request::text));
 SELECT * INTO c FROM support_conversations WHERE id=p_id FOR UPDATE;
 IF NOT FOUND OR (c.expires_at IS NOT NULL AND c.expires_at<=now()) OR NOT coalesce(((p_actor IS NOT NULL AND c.profile_id=p_actor) OR (p_actor IS NULL AND c.profile_id IS NULL AND c.guest_hash=p_guest AND length(p_guest)=64)),false) THEN RAISE EXCEPTION 'SUPPORT_DENIED';END IF;
 SELECT * INTO r FROM support_requests WHERE id=p_request;
 IF FOUND THEN IF r.conversation_id<>p_id OR r.content_hash<>p_hash THEN RAISE EXCEPTION 'REQUEST_CONFLICT';END IF;RETURN r.response;END IF;
 IF c.status NOT IN ('OPEN','HUMAN','WAITING') THEN RAISE EXCEPTION 'SUPPORT_CLOSED';END IF;
 IF c.status IN ('HUMAN','WAITING') AND p_data->>'action'='message' THEN RAISE EXCEPTION 'HUMAN_HANDOFF_ACTIVE';END IF;
 IF (SELECT count(*) FROM support_messages WHERE conversation_id=c.id AND role='USER')>=50 THEN RAISE EXCEPTION 'SUPPORT_LIMIT';END IF;
 IF p_data->>'action'='message' THEN
  INSERT INTO support_messages(conversation_id,role,body,model) VALUES(c.id,'USER',left(p_data->>'message',2000),null),(c.id,'ASSISTANT',left(p_data->>'answer',5000),p_data->>'model');
 ELSIF p_data->>'action'='customer-message' THEN
  INSERT INTO support_messages(conversation_id,role,body) VALUES(c.id,'USER',left(p_data->>'message',2000));
 ELSIF p_data->>'action'='handoff' THEN
  UPDATE support_conversations SET status=CASE WHEN status='HUMAN' THEN 'HUMAN' ELSE 'WAITING' END WHERE id=c.id;
  UPDATE crm_records SET data=data||jsonb_build_object('contactEncrypted',p_data->>'contactEncrypted','consentVersion','advisor-contact-v1','consentedAt',now(),'expiresAt',now()+interval '30 days') WHERE module='support' AND data->>'channel'='ADVISOR' AND data->>'conversationId'=c.id::text AND status<>'CANCELLED';
  IF NOT FOUND THEN INSERT INTO crm_records(module,title,status,created_by,data) VALUES('support','RELOO · Yêu cầu tư vấn','OPEN',p_actor,jsonb_build_object('channel','ADVISOR','kind','ADVISOR_LEAD','conversationId',c.id,'contactEncrypted',p_data->>'contactEncrypted','consentVersion','advisor-contact-v1','consentedAt',now(),'expiresAt',now()+interval '30 days'));END IF;
 ELSE RAISE EXCEPTION 'INVALID_ACTION';END IF;
 result=p_data->'response';INSERT INTO support_requests VALUES(p_request,c.id,p_hash,result,now());RETURN result;
END $$;
CREATE OR REPLACE FUNCTION public.reloo_purge_support() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 DELETE FROM support_messages WHERE conversation_id IN (SELECT id FROM support_conversations WHERE expires_at<=now());
 DELETE FROM support_conversations WHERE expires_at<=now();
 DELETE FROM crm_records WHERE module='support' AND data->>'channel'='ADVISOR' AND (data->>'expiresAt')::timestamptz<=now();
END $$;
REVOKE ALL ON FUNCTION public.reloo_support_commit(text,text,uuid,uuid,text,jsonb),public.reloo_purge_support() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reloo_support_commit(text,text,uuid,uuid,text,jsonb),public.reloo_purge_support() TO service_role;
CREATE OR REPLACE FUNCTION public.reloo_support_withdraw(p_actor text,p_guest text,p_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE c support_conversations;
BEGIN
 SELECT * INTO c FROM support_conversations WHERE id=p_id FOR UPDATE;
 IF NOT FOUND OR NOT coalesce(((p_actor IS NOT NULL AND c.profile_id=p_actor) OR (p_actor IS NULL AND c.profile_id IS NULL AND c.guest_hash=p_guest AND length(p_guest)=64)),false) THEN RAISE EXCEPTION 'SUPPORT_DENIED';END IF;
 UPDATE crm_records SET status='CANCELLED',data=(data-'contactEncrypted')||jsonb_build_object('withdrawnAt',now()) WHERE module='support' AND data->>'channel'='ADVISOR' AND data->>'conversationId'=c.id::text;
 UPDATE support_conversations SET status=CASE WHEN status='WAITING' THEN 'OPEN' ELSE status END WHERE id=c.id;
 UPDATE support_requests SET response=jsonb_build_object('ok',false,'code','CONSENT_WITHDRAWN') WHERE conversation_id=c.id AND response->>'handoff'='true';
END $$;
CREATE OR REPLACE FUNCTION public.reloo_support_staff(p_actor text,p_id uuid,p_action text,p_body text,p_request uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE c support_conversations;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtext(p_request::text));
 IF NOT EXISTS(SELECT 1 FROM crm_staff WHERE profile_id=p_actor AND enabled) THEN RAISE EXCEPTION 'STAFF_REQUIRED';END IF;
 SELECT * INTO c FROM support_conversations WHERE id=p_id FOR UPDATE;
 IF NOT FOUND OR c.expires_at<=now() THEN RAISE EXCEPTION 'SUPPORT_EXPIRED';END IF;
 IF EXISTS(SELECT 1 FROM support_requests WHERE id=p_request) THEN
  IF NOT EXISTS(SELECT 1 FROM support_requests WHERE id=p_request AND conversation_id=c.id AND response->>'staffId'=p_actor AND response->>'action'=p_action AND response->>'bodyHash'=md5(p_body)) THEN RAISE EXCEPTION 'REQUEST_CONFLICT';END IF;RETURN;
 END IF;
 IF p_action='reply' AND length(trim(p_body)) BETWEEN 1 AND 2000 THEN
  INSERT INTO support_messages(conversation_id,role,body,model) VALUES(c.id,'STAFF',p_body,'STAFF');
  UPDATE support_conversations SET status='HUMAN' WHERE id=c.id;
 ELSIF p_action='resume' THEN UPDATE support_conversations SET status='OPEN' WHERE id=c.id;
 ELSIF p_action='takeover' THEN UPDATE support_conversations SET status='HUMAN' WHERE id=c.id;
 ELSE RAISE EXCEPTION 'INVALID_ACTION';END IF;
 INSERT INTO support_requests VALUES(p_request,c.id,'STAFF',jsonb_build_object('ok',true,'staffId',p_actor,'action',p_action,'bodyHash',md5(p_body)),now());
END $$;
REVOKE ALL ON FUNCTION public.reloo_support_withdraw(text,text,uuid),public.reloo_support_staff(text,uuid,text,text,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reloo_support_withdraw(text,text,uuid),public.reloo_support_staff(text,uuid,text,text,uuid) TO service_role;
