ALTER SCHEMA auth OWNER TO supabase_auth_admin;
DO $$
DECLARE item record;
BEGIN
  FOR item IN SELECT oid::regprocedure AS signature FROM pg_proc WHERE pronamespace='auth'::regnamespace LOOP
    EXECUTE format('ALTER FUNCTION %s OWNER TO supabase_auth_admin', item.signature);
  END LOOP;
END;
$$;
