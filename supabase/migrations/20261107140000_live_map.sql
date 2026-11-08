-- Apply only in reviewed staging/release. Existing private addresses stay in assets.
BEGIN;
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA extensions;
GRANT USAGE ON SCHEMA extensions TO service_role;
SET LOCAL search_path=public,extensions;
CREATE SEQUENCE public.reloo_map_version;
CREATE TABLE public.reloo_map_features(
 id text PRIMARY KEY, entity_id text NOT NULL, domain text NOT NULL CHECK(domain IN ('marketplace','stays','jobs','neighborhood','services')),
 title text NOT NULL, category text NOT NULL DEFAULT '', price bigint NOT NULL DEFAULT 0 CHECK(price>=0), price_unit text NOT NULL DEFAULT '',
 image text, area text NOT NULL DEFAULT '', mode text NOT NULL DEFAULT 'RENT',
 point geometry(Point,4326) NOT NULL, accuracy_meters integer NOT NULL DEFAULT 1600 CHECK(accuracy_meters>=1000),
 approximate boolean NOT NULL DEFAULT true CHECK(approximate), visible boolean NOT NULL DEFAULT false,
 version bigint NOT NULL DEFAULT nextval('public.reloo_map_version'), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX reloo_map_features_point ON public.reloo_map_features USING gist(point);
CREATE INDEX reloo_map_features_geography ON public.reloo_map_features USING gist((point::geography));
CREATE INDEX reloo_map_features_filter ON public.reloo_map_features(domain,category,mode,price) WHERE visible;
CREATE TABLE public.reloo_map_events(version bigint PRIMARY KEY, feature_id text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX reloo_map_events_time ON public.reloo_map_events(created_at);
ALTER TABLE public.reloo_map_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reloo_map_events ENABLE ROW LEVEL SECURITY;

CREATE FUNCTION public.reloo_map_record() RETURNS trigger LANGUAGE plpgsql SET search_path=public,extensions,pg_temp AS $$
DECLARE v bigint;
BEGIN
 PERFORM pg_advisory_xact_lock(170711,1);
 v:=nextval('public.reloo_map_version');
 IF TG_OP='DELETE' THEN INSERT INTO reloo_map_events VALUES(v,OLD.id,now());RETURN OLD;END IF;
 NEW.version:=v;NEW.updated_at:=now();INSERT INTO reloo_map_events VALUES(v,NEW.id,now());RETURN NEW;
END $$;
CREATE TRIGGER reloo_map_record BEFORE INSERT OR UPDATE OR DELETE ON public.reloo_map_features FOR EACH ROW EXECUTE FUNCTION public.reloo_map_record();

CREATE FUNCTION public.reloo_map_project_asset(p_row public.assets) RETURNS void LANGUAGE plpgsql SET search_path=public,extensions,pg_temp AS $$
DECLARE d jsonb;lat double precision;lng double precision;eligible boolean;fid text;
BEGIN
 fid:='marketplace:'||p_row.id::text;
 d:=coalesce(p_row.location_details,'{}'::jsonb);
 eligible:=p_row.status IN ('available','rented') AND NOT coalesce(p_row.is_locked,false)
  AND upper(coalesce(p_row.dispute_status::text,'')) NOT IN ('OPEN','DISPUTED','ACTIVE','PENDING')
  AND coalesce(p_row.listing_data->>'neighborhoodOnly','false')='false' AND coalesce(p_row.listing_data->>'saleStatus','')<>'SOLD';
 IF NOT eligible OR coalesce(jsonb_typeof(d->'coords'->'lat'),'null')<>'number' OR coalesce(jsonb_typeof(d->'coords'->'lng'),'null')<>'number' OR d->'coords' IS NULL THEN
  DELETE FROM reloo_map_features WHERE id=fid;RETURN;
 END IF;
 lat:=(d->'coords'->>'lat')::double precision;lng:=(d->'coords'->>'lng')::double precision;
 IF NOT(lat BETWEEN -85 AND 85 AND lng BETWEEN -180 AND 180) THEN DELETE FROM reloo_map_features WHERE id=fid;RETURN;END IF;
 INSERT INTO reloo_map_features(id,entity_id,domain,title,category,price,price_unit,image,area,mode,point,visible)
 VALUES(fid,p_row.id::text,'marketplace',left(p_row.title,160),p_row.category,
 CASE WHEN p_row.listing_data->>'transactionMode'='SALE' THEN coalesce((p_row.listing_data->>'salePrice')::bigint,0)
 WHEN p_row.listing_data->'rentalDetails'->>'billingUnit' IN ('WEEK','MONTH') THEN coalesce((p_row.listing_data->'rentalDetails'->>'periodPrice')::bigint,p_row.daily_price,0) ELSE coalesce(p_row.daily_price,0)::bigint END,
 CASE WHEN p_row.listing_data->>'transactionMode'='SALE' THEN 'SALE' ELSE coalesce(p_row.listing_data->'rentalDetails'->>'billingUnit','DAY') END,
 CASE WHEN p_row.images->>0 ~ '^/(api/media|images)/' THEN p_row.images->>0 ELSE NULL END,
 concat_ws(', ',d->'ward'->>'name',d->'province'->>'name'),coalesce(p_row.listing_data->>'transactionMode','RENT'),
 ST_SetSRID(ST_MakePoint(least(179.995,greatest(-179.995,floor(lng*100)/100+.005)),least(84.995,greatest(-84.995,floor(lat*100)/100+.005))),4326),true)
 ON CONFLICT(id) DO UPDATE SET title=excluded.title,category=excluded.category,price=excluded.price,price_unit=excluded.price_unit,image=excluded.image,area=excluded.area,mode=excluded.mode,point=excluded.point,visible=excluded.visible;
 RETURN;
END $$;
CREATE FUNCTION public.reloo_map_sync_asset() RETURNS trigger LANGUAGE plpgsql SET search_path=public,extensions,pg_temp AS $$
BEGIN
 IF TG_OP='DELETE' THEN DELETE FROM reloo_map_features WHERE id='marketplace:'||OLD.id::text;RETURN OLD;END IF;
 PERFORM public.reloo_map_project_asset(NEW);RETURN NEW;
END $$;
CREATE TRIGGER reloo_map_sync_asset AFTER INSERT OR UPDATE OR DELETE ON public.assets FOR EACH ROW EXECUTE FUNCTION public.reloo_map_sync_asset();
-- Populate only the new derived projection; existing assets are never updated.
SELECT public.reloo_map_project_asset(a) FROM public.assets a;

CREATE FUNCTION public.reloo_map_search(p_query jsonb) RETURNS jsonb LANGUAGE plpgsql STABLE SET search_path=public,extensions,pg_temp AS $$
DECLARE b jsonb:=p_query->'bbox';box geometry;poly geometry;lim integer;off integer;rows jsonb;more boolean;cur bigint;
BEGIN
 IF jsonb_array_length(b)<>4 OR (b->>0)::float>= (b->>2)::float OR (b->>1)::float>= (b->>3)::float
 OR (b->>0)::float< -180 OR (b->>2)::float>180 OR (b->>1)::float< -85 OR (b->>3)::float>85
 OR (b->>2)::float-(b->>0)::float>5 OR (b->>3)::float-(b->>1)::float>5 THEN RAISE EXCEPTION 'MAP_BOUNDS_INVALID';END IF;
 lim:=coalesce((p_query->>'limit')::int,100);off:=coalesce((p_query->>'offset')::int,0);
 IF lim NOT BETWEEN 1 AND 200 OR off NOT BETWEEN 0 AND 2000 THEN RAISE EXCEPTION 'MAP_LIMIT_INVALID';END IF;
 box:=ST_MakeEnvelope((b->>0)::float,(b->>1)::float,(b->>2)::float,(b->>3)::float,4326);
 IF p_query->'polygon' IS NOT NULL AND p_query->'polygon'<>'null'::jsonb THEN
  poly:=ST_SetSRID(ST_GeomFromGeoJSON(jsonb_build_object('type','Polygon','coordinates',jsonb_build_array(p_query->'polygon'))::text),4326);
  IF NOT ST_IsValid(poly) OR ST_NPoints(poly)>100 OR NOT ST_CoveredBy(poly,box) THEN RAISE EXCEPTION 'MAP_POLYGON_INVALID';END IF;
 END IF;
 SELECT coalesce(max(version),0) INTO cur FROM reloo_map_events;
 WITH selected AS (
 SELECT f.id,f.entity_id,f.domain,f.title,f.category,f.price,f.price_unit,f.image,f.area,ST_Y(f.point) latitude,ST_X(f.point) longitude,f.approximate,f.accuracy_meters,f.version::text version
 FROM reloo_map_features f WHERE f.visible AND f.domain=coalesce(p_query->>'domain','marketplace') AND f.point&&box AND ST_Intersects(f.point,box)
 AND (poly IS NULL OR ST_Intersects(f.point,poly))
 AND (p_query->'ids' IS NULL OR p_query->'ids'='null'::jsonb OR p_query->'ids' ? f.entity_id)
 AND (coalesce(p_query->>'category','')='' OR f.category=p_query->>'category')
 AND (coalesce(p_query->>'q','')='' OR position(lower(p_query->>'q') in lower(f.title))>0)
 AND (coalesce(p_query->>'mode','ALL')='ALL' OR f.mode=p_query->>'mode' OR f.mode='BOTH')
 AND f.price BETWEEN coalesce((p_query->>'min')::bigint,0) AND coalesce((p_query->>'max')::bigint,1000000000)
 AND (p_query->'origin'='null'::jsonb OR p_query->'origin' IS NULL OR
 ((p_query->>'radius')::float BETWEEN 100 AND 50000 AND ST_DWithin(f.point::geography,ST_SetSRID(ST_MakePoint((p_query->'origin'->>'lng')::float,(p_query->'origin'->>'lat')::float),4326)::geography,(p_query->>'radius')::float)))
 ORDER BY f.id LIMIT lim+1 OFFSET off
 ) SELECT coalesce(jsonb_agg(to_jsonb(s)) FILTER(WHERE n<=lim),'[]'::jsonb),count(*)>lim INTO rows,more FROM (SELECT selected.*,row_number() OVER() n FROM selected) s;
 RETURN jsonb_build_object('rows',rows,'more',more,'cursor',cur::text);
END $$;

CREATE FUNCTION public.reloo_map_changes(p_after bigint) RETURNS jsonb LANGUAGE sql STABLE SET search_path=public,extensions,pg_temp AS $$
 SELECT jsonb_build_object('cursor',coalesce((SELECT max(version)::text FROM reloo_map_events),'0'),
 'reset',p_after>0 AND (p_after>coalesce((SELECT max(version) FROM reloo_map_events),0) OR p_after<coalesce((SELECT min(version)-1 FROM reloo_map_events),p_after)),
 'events',coalesce(jsonb_agg(to_jsonb(e)),'[]'::jsonb)) FROM
 (SELECT v.version::text,v.feature_id,f.visible,f.entity_id,f.domain,f.title,f.category,f.price,f.price_unit,f.image,f.area,f.mode,ST_Y(f.point) latitude,ST_X(f.point) longitude,f.approximate,f.accuracy_meters
 FROM reloo_map_events v LEFT JOIN reloo_map_features f ON f.id=v.feature_id WHERE v.version>greatest(0,p_after) ORDER BY v.version LIMIT 501) e;
$$;
CREATE FUNCTION public.reloo_map_prune() RETURNS integer LANGUAGE plpgsql SET search_path=public,extensions,pg_temp AS $$
DECLARE removed integer;BEGIN DELETE FROM reloo_map_events WHERE created_at<now()-interval '24 hours';GET DIAGNOSTICS removed=ROW_COUNT;RETURN removed;END $$;
REVOKE ALL ON public.reloo_map_features,public.reloo_map_events FROM PUBLIC,anon,authenticated;
REVOKE ALL ON SEQUENCE public.reloo_map_version FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.reloo_map_record(),public.reloo_map_project_asset(public.assets),public.reloo_map_sync_asset(),public.reloo_map_search(jsonb),public.reloo_map_changes(bigint),public.reloo_map_prune() FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.reloo_map_features,public.reloo_map_events TO service_role;
GRANT USAGE,SELECT ON SEQUENCE public.reloo_map_version TO service_role;
GRANT EXECUTE ON FUNCTION public.reloo_map_search(jsonb),public.reloo_map_changes(bigint),public.reloo_map_prune() TO service_role;
GRANT EXECUTE ON FUNCTION public.reloo_map_project_asset(public.assets) TO service_role;
COMMIT;
-- Apply deploy/vietnam/security-lockdown.sql after this migration in staging/release.
