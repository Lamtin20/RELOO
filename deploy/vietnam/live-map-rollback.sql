-- Stops only the newly introduced projection. No asset/address/business data is removed.
BEGIN;
DROP TRIGGER IF EXISTS reloo_map_sync_asset ON public.assets;
DROP FUNCTION IF EXISTS public.reloo_map_sync_asset();
DROP FUNCTION IF EXISTS public.reloo_map_project_asset(public.assets);
DROP FUNCTION IF EXISTS public.reloo_map_search(jsonb);
DROP FUNCTION IF EXISTS public.reloo_map_changes(bigint);
DROP FUNCTION IF EXISTS public.reloo_map_prune();
DROP TABLE IF EXISTS public.reloo_map_features;
DROP FUNCTION IF EXISTS public.reloo_map_record();
DROP TABLE IF EXISTS public.reloo_map_events;
DROP SEQUENCE IF EXISTS public.reloo_map_version;
COMMIT;
-- Do not drop PostGIS: other modules may use it.
