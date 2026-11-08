CREATE TABLE IF NOT EXISTS public.service_offers(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),owner_id text NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,title text NOT NULL CHECK(length(title) BETWEEN 3 AND 100),
 category text NOT NULL CHECK(category IN ('moving','assembly','photo')),city text NOT NULL CHECK(city IN ('HCM','HN','DN')),
 rate integer NOT NULL CHECK(rate BETWEEN 1000 AND 10000000),status text NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT','PENDING','APPROVED','PAUSED','REJECTED')),
 is_demo boolean NOT NULL DEFAULT true CHECK(is_demo),blocks jsonb NOT NULL DEFAULT '[]',created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS public.service_requests(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),requester_id text NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,offer_id uuid NOT NULL REFERENCES service_offers(id) ON DELETE CASCADE,provider_id text NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
 status text NOT NULL DEFAULT 'SENT' CHECK(status IN ('SENT','ACCEPTED','QUOTED','CONFIRMED','IN_PROGRESS','COMPLETED','CANCELLED','DECLINED','EXPIRED','DISPUTED')),
 need jsonb NOT NULL,quote jsonb,expires_at timestamptz NOT NULL DEFAULT now()+interval '24 hours',created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK(requester_id<>provider_id));
CREATE TABLE IF NOT EXISTS public.service_events(id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,request_id uuid REFERENCES service_requests(id) ON DELETE CASCADE,actor_id text NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,kind text NOT NULL,body text,created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS public.service_receipts(id uuid PRIMARY KEY,actor_id text NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,digest text NOT NULL,result jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS service_event_request ON public.service_events(request_id,id);
CREATE INDEX IF NOT EXISTS service_request_participants ON public.service_requests(requester_id,provider_id,created_at DESC);
ALTER TABLE public.service_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_receipts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.service_offers,public.service_requests,public.service_events,public.service_receipts FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.service_offers,public.service_requests,public.service_events,public.service_receipts TO service_role;
REVOKE ALL ON SEQUENCE public.service_events_id_seq FROM PUBLIC,anon,authenticated;
GRANT USAGE,SELECT ON SEQUENCE public.service_events_id_seq TO service_role;
CREATE OR REPLACE FUNCTION public.reloo_service_action(p_actor text,p_request uuid,p_hash text,p_action text,p_data jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE o service_offers;r service_requests;receipt service_receipts;target uuid;result jsonb;next_status text;starts timestamptz;ends timestamptz;n integer;note text;
BEGIN
 IF p_actor IS NULL OR NOT EXISTS(SELECT 1 FROM profiles WHERE id=p_actor) THEN RAISE EXCEPTION 'ACCOUNT_REQUIRED';END IF;
 IF p_request IS NULL OR p_hash IS NULL OR length(p_hash)<>64 THEN RAISE EXCEPTION 'INVALID_RECEIPT';END IF;
 PERFORM pg_advisory_xact_lock(hashtext(p_request::text));
 SELECT * INTO receipt FROM service_receipts WHERE id=p_request;
 IF FOUND THEN IF receipt.actor_id<>p_actor OR receipt.digest<>p_hash THEN RAISE EXCEPTION 'REQUEST_CONFLICT';END IF;RETURN receipt.result;END IF;
 IF p_action IN ('offer','edit') THEN
  IF p_action='edit' THEN
   SELECT * INTO o FROM service_offers WHERE id=(p_data->>'id')::uuid FOR UPDATE;
   IF NOT FOUND OR o.owner_id<>p_actor OR o.status NOT IN ('DRAFT','PAUSED','REJECTED') THEN RAISE EXCEPTION 'OFFER_DENIED';END IF;
   UPDATE service_offers SET title=p_data->>'title',category=p_data->>'category',city=p_data->>'city',rate=(p_data->>'rate')::integer,status='DRAFT' WHERE id=o.id RETURNING * INTO o;
  ELSE
  INSERT INTO service_offers(owner_id,title,category,city,rate) VALUES(p_actor,p_data->>'title',p_data->>'category',p_data->>'city',(p_data->>'rate')::integer) RETURNING * INTO o;
  END IF;
  INSERT INTO service_events(actor_id,kind,body) VALUES(p_actor,'OFFER_'||upper(p_action),o.id::text);
  result=jsonb_build_object('ok',true,'id',o.id);
 ELSIF p_action IN ('submit','pause','block','unblock','approve','reject') THEN
  SELECT * INTO o FROM service_offers WHERE id=(p_data->>'id')::uuid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'OFFER_UNAVAILABLE';END IF;
  PERFORM pg_advisory_xact_lock(hashtext('service-provider:'||o.owner_id));
  IF p_action IN ('approve','reject') THEN
   IF NOT EXISTS(SELECT 1 FROM crm_staff WHERE profile_id=p_actor AND enabled) OR o.status<>'PENDING' THEN RAISE EXCEPTION 'REVIEW_DENIED';END IF;
   UPDATE service_offers SET status=CASE WHEN p_action='approve' THEN 'APPROVED' ELSE 'REJECTED' END WHERE id=o.id;
  ELSE
   IF o.owner_id<>p_actor THEN RAISE EXCEPTION 'OFFER_DENIED';END IF;
   IF p_action='submit' THEN
    IF o.status NOT IN ('DRAFT','PAUSED','REJECTED') THEN RAISE EXCEPTION 'INVALID_STATE';END IF;
    UPDATE service_offers SET status='PENDING' WHERE id=o.id;
   ELSIF p_action='pause' THEN UPDATE service_offers SET status='PAUSED' WHERE id=o.id;
   ELSIF p_action='block' THEN
    starts=(p_data->>'start')::timestamptz;ends=(p_data->>'end')::timestamptz;
    IF starts IS NULL OR ends IS NULL OR starts<=now() OR ends<=starts OR ends>starts+interval '7 days' OR jsonb_array_length(o.blocks)>=30 THEN RAISE EXCEPTION 'INVALID_SCHEDULE';END IF;
    IF EXISTS(SELECT 1 FROM service_requests s WHERE s.provider_id=o.owner_id AND s.status IN ('CONFIRMED','IN_PROGRESS','DISPUTED') AND (s.need->>'start')::timestamptz<ends AND (s.need->>'end')::timestamptz>starts) THEN RAISE EXCEPTION 'SCHEDULE_CONFLICT';END IF;
    UPDATE service_offers SET blocks=blocks||jsonb_build_array(jsonb_build_object('start',starts,'end',ends)) WHERE id=o.id;
   ELSE UPDATE service_offers SET blocks=coalesce((SELECT jsonb_agg(b) FROM jsonb_array_elements(blocks) b WHERE b->>'start'<>p_data->>'start'),'[]') WHERE id=o.id;END IF;
  END IF;
  INSERT INTO service_events(actor_id,kind,body) VALUES(p_actor,'OFFER_'||upper(p_action),o.id::text);
  result=jsonb_build_object('ok',true,'id',o.id);
 ELSIF p_action='send' THEN
  SELECT * INTO o FROM service_offers WHERE id=(p_data->>'offerId')::uuid FOR UPDATE;
  IF NOT FOUND OR o.status<>'APPROVED' OR NOT o.is_demo OR o.owner_id=p_actor THEN RAISE EXCEPTION 'OFFER_UNAVAILABLE';END IF;
  starts=(p_data->'need'->>'start')::timestamptz;ends=(p_data->'need'->>'end')::timestamptz;n=(p_data->'need'->>'hours')::integer;
  IF starts IS NULL OR ends IS NULL OR n IS NULL OR p_data->'need'->>'category' IS NULL OR p_data->'need'->>'city' IS NULL OR NOT coalesce(p_data->>'accepted'='true',false) OR p_data->'need'->>'category'<>o.category OR p_data->'need'->>'city'<>o.city OR starts<now()+interval '1 hour' OR starts>now()+interval '90 days' OR n NOT BETWEEN 1 AND 8 OR ends<>starts+n*interval '1 hour' THEN RAISE EXCEPTION 'INVALID_NEED';END IF;
  IF p_data->>'expectedRate' IS NULL OR (p_data->>'expectedRate')::integer<>o.rate THEN RAISE EXCEPTION 'PRICE_CHANGED';END IF;
  IF p_data->'need'->>'budget' IS NOT NULL AND (p_data->'need'->>'budget')::integer<o.rate*n THEN RAISE EXCEPTION 'BUDGET_EXCEEDED';END IF;
  PERFORM pg_advisory_xact_lock(hashtext('service-provider:'||o.owner_id));
  IF EXISTS(SELECT 1 FROM service_offers bo CROSS JOIN LATERAL jsonb_array_elements(bo.blocks) b WHERE bo.owner_id=o.owner_id AND (b->>'start')::timestamptz<ends AND (b->>'end')::timestamptz>starts) THEN RAISE EXCEPTION 'SCHEDULE_CONFLICT';END IF;
  INSERT INTO service_requests(requester_id,offer_id,provider_id,need) VALUES(p_actor,o.id,o.owner_id,p_data->'need'||jsonb_build_object('listedRate',o.rate,'offerTitle',o.title)) RETURNING * INTO r;
  INSERT INTO service_events(request_id,actor_id,kind) VALUES(r.id,p_actor,'SENT');result=jsonb_build_object('ok',true,'id',r.id);
 ELSE
  SELECT * INTO r FROM service_requests WHERE id=(p_data->>'id')::uuid FOR UPDATE;
  IF NOT FOUND OR p_actor NOT IN (r.requester_id,r.provider_id) THEN RAISE EXCEPTION 'REQUEST_DENIED';END IF;
  IF r.status IN ('SENT','ACCEPTED','QUOTED') AND (r.expires_at<=now() OR (r.need->>'start')::timestamptz<=now()) THEN
   UPDATE service_requests SET status='EXPIRED',updated_at=now() WHERE id=r.id;INSERT INTO service_events(request_id,actor_id,kind) VALUES(r.id,p_actor,'EXPIRED');
   result=jsonb_build_object('ok',true,'id',r.id,'status','EXPIRED');
  ELSE
   IF p_action='accept' AND p_actor=r.provider_id AND r.status='SENT' THEN next_status='ACCEPTED';
   ELSIF p_action='decline' AND p_actor=r.provider_id AND r.status IN ('SENT','ACCEPTED','QUOTED') THEN next_status='DECLINED';
   ELSIF p_action='quote' AND p_actor=r.provider_id AND r.status='ACCEPTED' THEN
    n=(r.need->>'hours')::integer;
    UPDATE service_requests SET quote=jsonb_build_object('version','service-demo-v1','amount',(r.need->>'listedRate')::integer*n,'currency','VND','hours',n,'fees',0,'tax',0,'payment','NOT_SUPPORTED','terms','DEMO_NO_PAYMENT_CANCEL_BEFORE_START','expiresAt',least(expires_at,now()+interval '1 hour')),expires_at=least(expires_at,now()+interval '1 hour') WHERE id=r.id;next_status='QUOTED';
   ELSIF p_action='confirm' AND p_actor=r.requester_id AND r.status='QUOTED' AND coalesce(p_data->>'accepted'='true',false) THEN
    PERFORM pg_advisory_xact_lock(hashtext('service-provider:'||r.provider_id));
    SELECT * INTO o FROM service_offers WHERE id=r.offer_id;
    starts=(r.need->>'start')::timestamptz;ends=(r.need->>'end')::timestamptz;
    IF o.status<>'APPROVED' OR EXISTS(SELECT 1 FROM service_requests s WHERE s.provider_id=r.provider_id AND s.id<>r.id AND s.status IN ('CONFIRMED','IN_PROGRESS','DISPUTED') AND (s.need->>'start')::timestamptz<ends AND (s.need->>'end')::timestamptz>starts) OR EXISTS(SELECT 1 FROM service_offers bo CROSS JOIN LATERAL jsonb_array_elements(bo.blocks) b WHERE bo.owner_id=o.owner_id AND (b->>'start')::timestamptz<ends AND (b->>'end')::timestamptz>starts) THEN RAISE EXCEPTION 'SCHEDULE_CONFLICT';END IF;next_status='CONFIRMED';
   ELSIF p_action='begin' AND p_actor=r.provider_id AND r.status='CONFIRMED' THEN next_status='IN_PROGRESS';
   ELSIF p_action='complete' AND p_actor=r.requester_id AND r.status='IN_PROGRESS' THEN next_status='COMPLETED';
   ELSIF p_action='cancel' AND r.status IN ('SENT','ACCEPTED','QUOTED','CONFIRMED') THEN next_status='CANCELLED';
   ELSIF p_action='dispute' AND r.status IN ('CONFIRMED','IN_PROGRESS','COMPLETED') THEN next_status='DISPUTED';
   ELSIF p_action='note' AND r.status IN ('SENT','ACCEPTED','QUOTED','CONFIRMED','IN_PROGRESS','DISPUTED') THEN
    note=trim(p_data->>'body');IF note IS NULL OR length(note) NOT BETWEEN 1 AND 240 OR (SELECT count(*) FROM service_events WHERE request_id=r.id AND kind='NOTE')>=30 THEN RAISE EXCEPTION 'NOTE_INVALID';END IF;
    INSERT INTO service_events(request_id,actor_id,kind,body) VALUES(r.id,p_actor,'NOTE',note);
   ELSE RAISE EXCEPTION 'INVALID_STATE';END IF;
   IF next_status IS NOT NULL THEN UPDATE service_requests SET status=next_status,updated_at=now() WHERE id=r.id;INSERT INTO service_events(request_id,actor_id,kind) VALUES(r.id,p_actor,next_status);END IF;
   result=jsonb_build_object('ok',true,'id',r.id,'status',coalesce(next_status,r.status));
  END IF;
 END IF;
 INSERT INTO service_receipts VALUES(p_request,p_actor,p_hash,result,now());RETURN result;
END $$;
CREATE OR REPLACE FUNCTION public.reloo_service_purge() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$ BEGIN
 UPDATE service_requests SET status='EXPIRED' WHERE status IN ('SENT','ACCEPTED','QUOTED') AND expires_at<=now();
 DELETE FROM service_requests WHERE created_at<now()-interval '30 days';
 DELETE FROM service_receipts WHERE created_at<now()-interval '30 days';
 DELETE FROM service_events WHERE request_id IS NULL AND created_at<now()-interval '30 days';
 DELETE FROM service_offers WHERE status='DRAFT' AND created_at<now()-interval '30 days' AND id NOT IN (SELECT offer_id FROM service_requests);
END $$;
REVOKE ALL ON FUNCTION public.reloo_service_action(text,uuid,text,text,jsonb),public.reloo_service_purge() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reloo_service_action(text,uuid,text,text,jsonb),public.reloo_service_purge() TO service_role;
