CREATE TABLE IF NOT EXISTS public.ai_bot_versions(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),version bigint GENERATED ALWAYS AS IDENTITY UNIQUE,status text NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT','PUBLISHED')),config jsonb NOT NULL,knowledge jsonb NOT NULL DEFAULT '[]',created_by text REFERENCES profiles(id) ON DELETE SET NULL,created_at timestamptz NOT NULL DEFAULT now(),published_by text REFERENCES profiles(id) ON DELETE SET NULL,published_at timestamptz);
CREATE TABLE IF NOT EXISTS public.ai_control_state(id text PRIMARY KEY CHECK(id='global'),active_version uuid REFERENCES ai_bot_versions(id),updated_at timestamptz NOT NULL DEFAULT now());
INSERT INTO public.ai_control_state(id) VALUES('global') ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS public.ai_control_audit(id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,actor_id text REFERENCES profiles(id) ON DELETE SET NULL,action text NOT NULL,resource_id uuid,details jsonb NOT NULL DEFAULT '{}',created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS public.ai_control_receipts(id uuid PRIMARY KEY,actor_id text REFERENCES profiles(id) ON DELETE CASCADE,digest text NOT NULL,result jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE public.support_conversations ADD COLUMN IF NOT EXISTS assigned_to text REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE public.support_conversations ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'NORMAL' CHECK(priority IN ('NORMAL','HIGH','URGENT'));
-- A turn inserts USER and ASSISTANT in one transaction with the same now().
-- UUID ordering cannot express chronology; assign an insertion sequence.
ALTER TABLE public.support_messages ADD COLUMN IF NOT EXISTS sequence bigint GENERATED ALWAYS AS IDENTITY;
CREATE UNIQUE INDEX IF NOT EXISTS support_messages_sequence ON public.support_messages(sequence);
CREATE INDEX IF NOT EXISTS support_messages_thread_sequence ON public.support_messages(conversation_id,sequence DESC);
REVOKE ALL ON SEQUENCE public.support_messages_sequence_seq FROM PUBLIC,anon,authenticated;
GRANT USAGE,SELECT ON SEQUENCE public.support_messages_sequence_seq TO service_role;
CREATE TABLE IF NOT EXISTS public.ai_events(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),source text NOT NULL CHECK(source IN ('support','analysis','news','services','preview','system')),kind text NOT NULL,actor_id text REFERENCES profiles(id) ON DELETE SET NULL,conversation_id uuid REFERENCES support_conversations(id) ON DELETE CASCADE,request_id uuid,bot_version uuid REFERENCES ai_bot_versions(id) ON DELETE SET NULL,data jsonb NOT NULL DEFAULT '{}',created_at timestamptz NOT NULL DEFAULT now(),expires_at timestamptz NOT NULL DEFAULT now()+interval '30 days',UNIQUE(source,request_id,kind));
CREATE INDEX IF NOT EXISTS ai_events_time ON public.ai_events(created_at DESC,source);
CREATE INDEX IF NOT EXISTS ai_events_conversation ON public.ai_events(conversation_id,created_at);
ALTER TABLE public.ai_bot_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_control_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_control_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_control_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ai_bot_versions,public.ai_control_state,public.ai_control_audit,public.ai_control_receipts,public.ai_events FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.ai_bot_versions,public.ai_control_state,public.ai_control_audit,public.ai_control_receipts,public.ai_events TO service_role;
REVOKE ALL ON SEQUENCE public.ai_bot_versions_version_seq,public.ai_control_audit_id_seq FROM PUBLIC,anon,authenticated;
GRANT USAGE,SELECT ON SEQUENCE public.ai_bot_versions_version_seq,public.ai_control_audit_id_seq TO service_role;
CREATE OR REPLACE FUNCTION public.reloo_ai_allowed(p_actor text,p_permission text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT EXISTS(SELECT 1 FROM crm_staff s WHERE s.profile_id=p_actor AND s.enabled AND (s.role IN ('owner','admin') OR s.role='staff' AND (p_permission=ANY(s.permissions) OR right(p_permission,5)='.read' AND replace(p_permission,'.read','.write')=ANY(s.permissions) OR p_permission='bots.read' AND 'bots.publish'=ANY(s.permissions) OR p_permission='support.read' AND s.permissions && ARRAY['support.assign','support.contacts'])));
$$;
CREATE OR REPLACE FUNCTION public.reloo_ai_control(p_actor text,p_request uuid,p_hash text,p_action text,p_data jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v ai_bot_versions;state ai_control_state;c support_conversations;prior ai_control_receipts;result jsonb;expected uuid;required text;reason text;
BEGIN
 required=CASE WHEN p_action='save' THEN 'bots.write' WHEN p_action='publish' THEN 'bots.publish' WHEN p_action='assign' THEN 'support.assign' WHEN p_action IN ('priority','close') THEN 'support.write' ELSE NULL END;
 IF required IS NULL OR NOT reloo_ai_allowed(p_actor,required) THEN RAISE EXCEPTION 'CONTROL_DENIED';END IF;
 IF p_request IS NULL OR p_hash IS NULL OR length(p_hash)<>64 THEN RAISE EXCEPTION 'REQUEST_INVALID';END IF;
 PERFORM pg_advisory_xact_lock(hashtext(p_request::text));SELECT * INTO prior FROM ai_control_receipts WHERE id=p_request;
 IF FOUND THEN IF prior.actor_id<>p_actor OR prior.digest<>p_hash THEN RAISE EXCEPTION 'REQUEST_CONFLICT';END IF;RETURN prior.result;END IF;
 IF p_action='save' THEN
  IF jsonb_typeof(p_data->'config') IS DISTINCT FROM 'object' OR jsonb_typeof(p_data->'knowledge') IS DISTINCT FROM 'array' OR jsonb_array_length(p_data->'knowledge')>40 OR length(p_data::text)>80000 THEN RAISE EXCEPTION 'CONFIG_INVALID';END IF;
  INSERT INTO ai_bot_versions(config,knowledge,created_by) VALUES(p_data->'config',p_data->'knowledge',p_actor) RETURNING * INTO v;
  result=jsonb_build_object('ok',true,'id',v.id,'version',v.version);
  INSERT INTO ai_control_audit(actor_id,action,resource_id) VALUES(p_actor,'DRAFT_CREATED',v.id);
 ELSIF p_action='publish' THEN
  reason=trim(p_data->>'reason');IF NOT coalesce(p_data->>'reviewed'='true',false) OR reason IS NULL OR length(reason) NOT BETWEEN 5 AND 200 THEN RAISE EXCEPTION 'REVIEW_REQUIRED';END IF;
  SELECT * INTO state FROM ai_control_state WHERE id='global' FOR UPDATE;
  expected=nullif(p_data->>'expected','')::uuid;IF state.active_version IS DISTINCT FROM expected THEN RAISE EXCEPTION 'VERSION_CONFLICT';END IF;
  SELECT * INTO v FROM ai_bot_versions WHERE id=(p_data->>'id')::uuid FOR UPDATE;IF NOT FOUND THEN RAISE EXCEPTION 'VERSION_UNAVAILABLE';END IF;
  UPDATE ai_bot_versions SET status='PUBLISHED',published_by=coalesce(published_by,p_actor),published_at=coalesce(published_at,now()) WHERE id=v.id;
  UPDATE ai_control_state SET active_version=v.id,updated_at=now() WHERE id='global';
  INSERT INTO ai_control_audit(actor_id,action,resource_id,details) VALUES(p_actor,CASE WHEN v.status='PUBLISHED' THEN 'ROLLBACK_ACTIVATED' ELSE 'VERSION_PUBLISHED' END,v.id,jsonb_build_object('previous',state.active_version,'reason',reason));
  result=jsonb_build_object('ok',true,'id',v.id,'version',v.version);
 ELSE
  SELECT * INTO c FROM support_conversations WHERE id=(p_data->>'id')::uuid FOR UPDATE;
  IF NOT FOUND OR c.expires_at<=now() THEN RAISE EXCEPTION 'CONVERSATION_UNAVAILABLE';END IF;
  IF p_action='assign' THEN
   IF p_data->>'assignedTo' IS NOT NULL AND (NOT reloo_ai_allowed(p_data->>'assignedTo','support.write') OR NOT reloo_ai_allowed(p_data->>'assignedTo','crm.read')) THEN RAISE EXCEPTION 'ASSIGNEE_INVALID';END IF;
   UPDATE support_conversations SET assigned_to=p_data->>'assignedTo' WHERE id=c.id;
  ELSE
   IF c.assigned_to IS NOT NULL AND c.assigned_to<>p_actor AND NOT reloo_ai_allowed(p_actor,'support.assign') THEN RAISE EXCEPTION 'ASSIGNMENT_DENIED';END IF;
   IF p_action='priority' THEN IF NOT coalesce(p_data->>'priority' IN ('NORMAL','HIGH','URGENT'),false) THEN RAISE EXCEPTION 'PRIORITY_INVALID';END IF;UPDATE support_conversations SET priority=p_data->>'priority' WHERE id=c.id;
   ELSE UPDATE support_conversations SET status='CLOSED' WHERE id=c.id;END IF;
  END IF;
  INSERT INTO ai_control_audit(actor_id,action,resource_id,details) VALUES(p_actor,upper(p_action),c.id,jsonb_build_object('assignedTo',p_data->>'assignedTo','priority',p_data->>'priority'));
  INSERT INTO ai_events(source,kind,actor_id,conversation_id,data,expires_at) VALUES('support',p_action,p_actor,c.id,jsonb_build_object('assignedTo',p_data->>'assignedTo','priority',p_data->>'priority'),coalesce(c.expires_at,now()+interval '30 days'));
  result=jsonb_build_object('ok',true,'id',c.id);
 END IF;
 INSERT INTO ai_control_receipts VALUES(p_request,p_actor,p_hash,result,now());RETURN result;
END $$;
-- Preserve the tested ownership/idempotency implementation; wrap it atomically.
DO $$ BEGIN
 IF to_regprocedure('public.reloo_support_commit_core(text,text,uuid,uuid,text,jsonb)') IS NULL THEN ALTER FUNCTION public.reloo_support_commit(text,text,uuid,uuid,text,jsonb) RENAME TO reloo_support_commit_core;END IF;
 IF to_regprocedure('public.reloo_support_staff_core(text,uuid,text,text,uuid)') IS NULL THEN ALTER FUNCTION public.reloo_support_staff(text,uuid,text,text,uuid) RENAME TO reloo_support_staff_core;END IF;
 IF to_regprocedure('public.reloo_support_withdraw_core(text,text,uuid)') IS NULL THEN ALTER FUNCTION public.reloo_support_withdraw(text,text,uuid) RENAME TO reloo_support_withdraw_core;END IF;
END $$;
CREATE OR REPLACE FUNCTION public.reloo_support_withdraw(p_actor text,p_guest text,p_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE c support_conversations;had_contact boolean;
BEGIN
 SELECT * INTO c FROM support_conversations WHERE id=p_id FOR UPDATE;
 SELECT EXISTS(SELECT 1 FROM crm_records WHERE module='support' AND data->>'channel'='ADVISOR' AND data->>'conversationId'=p_id::text AND data ? 'contactEncrypted') INTO had_contact;
 PERFORM public.reloo_support_withdraw_core(p_actor,p_guest,p_id);
 IF had_contact THEN INSERT INTO ai_events(source,kind,actor_id,conversation_id,data,expires_at) VALUES('support','consent_withdrawn',p_actor,p_id,'{}',coalesce(c.expires_at,now()+interval '30 days'));END IF;
END $$;
CREATE OR REPLACE FUNCTION public.reloo_support_commit(p_actor text,p_guest text,p_id uuid,p_request uuid,p_hash text,p_data jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE result jsonb;c support_conversations;
BEGIN
 result=public.reloo_support_commit_core(p_actor,p_guest,p_id,p_request,p_hash,p_data);
 SELECT * INTO c FROM support_conversations WHERE id=p_id;
 IF p_data->'trace'->>'path' IS NOT NULL THEN UPDATE support_conversations SET context=context||jsonb_build_object('path',p_data->'trace'->>'path','channel',p_data->'trace'->>'channel') WHERE id=c.id;END IF;
 IF p_data->'trace'->>'decision'='BOT_PAUSED' AND c.status='OPEN' THEN UPDATE support_conversations SET status='WAITING' WHERE id=c.id;END IF;
 INSERT INTO ai_events(source,kind,actor_id,conversation_id,request_id,bot_version,data,expires_at)
 VALUES('support',p_data->>'action',p_actor,p_id,p_request,nullif(p_data->'trace'->>'version','')::uuid,coalesce(p_data->'trace','{}'),coalesce(c.expires_at,now()+interval '30 days')) ON CONFLICT(source,request_id,kind) DO NOTHING;
 RETURN result;
END $$;
CREATE OR REPLACE FUNCTION public.reloo_support_staff(p_actor text,p_id uuid,p_action text,p_body text,p_request uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE c support_conversations;
BEGIN
 IF NOT reloo_ai_allowed(p_actor,'support.write') THEN RAISE EXCEPTION 'STAFF_REQUIRED';END IF;
 IF p_request IS NULL THEN RAISE EXCEPTION 'REQUEST_INVALID';END IF;
 PERFORM pg_advisory_xact_lock(hashtext(p_request::text));
 SELECT * INTO c FROM support_conversations WHERE id=p_id FOR UPDATE;
 IF c.assigned_to IS NOT NULL AND c.assigned_to<>p_actor AND NOT reloo_ai_allowed(p_actor,'support.assign') THEN RAISE EXCEPTION 'ASSIGNMENT_DENIED';END IF;
 IF c.status='CLOSED' AND p_action<>'resume' THEN RAISE EXCEPTION 'CONVERSATION_CLOSED';END IF;
 PERFORM public.reloo_support_staff_core(p_actor,p_id,p_action,p_body,p_request);
 IF p_action IN ('takeover','reply') AND c.assigned_to IS NULL THEN UPDATE support_conversations SET assigned_to=p_actor WHERE id=p_id;END IF;
 INSERT INTO ai_events(source,kind,actor_id,conversation_id,request_id,data,expires_at) VALUES('support','staff_'||p_action,p_actor,p_id,p_request,jsonb_build_object('characters',length(p_body)),coalesce(c.expires_at,now()+interval '30 days')) ON CONFLICT(source,request_id,kind) DO NOTHING;
END $$;
CREATE OR REPLACE FUNCTION public.reloo_ai_summary() RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT jsonb_build_object('periodHours',24,'events',(SELECT count(*) FROM ai_events WHERE created_at>now()-interval '24 hours' AND expires_at>now()),'waiting',(SELECT count(*) FROM support_conversations WHERE status='WAITING' AND (expires_at IS NULL OR expires_at>now())),'human',(SELECT count(*) FROM support_conversations WHERE status='HUMAN' AND (expires_at IS NULL OR expires_at>now())),'fallbacks',(SELECT count(*) FROM ai_events WHERE created_at>now()-interval '24 hours' AND data->>'decision' LIKE 'FALLBACK%'),'activeVersion',(SELECT active_version FROM ai_control_state WHERE id='global'));
$$;
CREATE OR REPLACE FUNCTION public.reloo_ai_purge() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$ BEGIN
 DELETE FROM ai_events WHERE expires_at<=now();DELETE FROM ai_control_receipts WHERE created_at<now()-interval '30 days';DELETE FROM ai_control_audit WHERE created_at<now()-interval '180 days';
 DELETE FROM ai_bot_versions WHERE id IS DISTINCT FROM (SELECT active_version FROM ai_control_state WHERE id='global') AND created_at<now()-CASE WHEN status='DRAFT' THEN interval '30 days' ELSE interval '180 days' END;
END $$;
REVOKE ALL ON FUNCTION public.reloo_support_commit_core(text,text,uuid,uuid,text,jsonb),public.reloo_support_staff_core(text,uuid,text,text,uuid) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.reloo_support_withdraw_core(text,text,uuid) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.reloo_support_withdraw(text,text,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reloo_support_withdraw(text,text,uuid) TO service_role;
REVOKE ALL ON FUNCTION public.reloo_ai_allowed(text,text),public.reloo_ai_control(text,uuid,text,text,jsonb),public.reloo_support_commit(text,text,uuid,uuid,text,jsonb),public.reloo_support_staff(text,uuid,text,text,uuid),public.reloo_ai_summary(),public.reloo_ai_purge() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reloo_ai_allowed(text,text),public.reloo_ai_control(text,uuid,text,text,jsonb),public.reloo_support_commit(text,text,uuid,uuid,text,jsonb),public.reloo_support_staff(text,uuid,text,text,uuid),public.reloo_ai_summary(),public.reloo_ai_purge() TO service_role;
