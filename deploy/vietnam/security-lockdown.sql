-- Backend owns application data access. Browser clients only use Auth.
-- Apply as postgres, inside a transaction, after a full database backup.
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM PUBLIC, anon, authenticated;
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM PUBLIC, anon, authenticated;
REVOKE ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC, anon, authenticated;
-- Column-level grants survive table-level REVOKE; remove those explicitly.
DO $$ DECLARE item record; BEGIN
 FOR item IN SELECT table_schema,table_name,column_name,grantee,privilege_type
 FROM information_schema.column_privileges
 WHERE table_schema='public' AND grantee IN ('PUBLIC','anon','authenticated')
 LOOP
  EXECUTE format('REVOKE %s (%I) ON TABLE %I.%I FROM %s',item.privilege_type,item.column_name,item.table_schema,item.table_name,
    CASE WHEN item.grantee='PUBLIC' THEN 'PUBLIC' ELSE quote_ident(item.grantee) END);
 END LOOP;
END $$;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;
DO $$ DECLARE owner_role text; BEGIN
 FOR owner_role IN SELECT DISTINCT pg_get_userbyid(c.relowner) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public'
 UNION SELECT DISTINCT pg_get_userbyid(p.proowner) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public'
 LOOP
  EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE %I REVOKE ALL ON TABLES FROM PUBLIC, anon, authenticated',owner_role);
  EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE %I REVOKE ALL ON SEQUENCES FROM PUBLIC, anon, authenticated',owner_role);
  EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE %I REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated',owner_role);
  EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public REVOKE ALL ON TABLES FROM PUBLIC, anon, authenticated',owner_role);
  EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public REVOKE ALL ON SEQUENCES FROM PUBLIC, anon, authenticated',owner_role);
  EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated',owner_role);
  EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public GRANT ALL ON TABLES TO service_role',owner_role);
  EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role',owner_role);
  EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO service_role',owner_role);
 END LOOP;
END $$;
DO $$ BEGIN
 IF has_column_privilege('authenticated','public.profiles','role','UPDATE')
 OR has_column_privilege('authenticated','public.profiles','activation_status','UPDATE')
 OR has_column_privilege('authenticated','public.profiles','kyc_level','UPDATE')
 OR has_function_privilege('anon','public.reloo_record_screening(text,text,jsonb,text)','EXECUTE')
 OR has_function_privilege('authenticated','public.reloo_create_inquiry(text,text,jsonb)','EXECUTE')
 OR has_table_privilege('anon','public.security_audit','TRUNCATE')
 THEN RAISE EXCEPTION 'CLIENT_DATABASE_PRIVILEGE_REMAINS';END IF;
 IF NOT has_function_privilege('service_role','public.reloo_create_inquiry(text,text,jsonb)','EXECUTE')
 OR NOT has_table_privilege('service_role','public.assets','SELECT') THEN RAISE EXCEPTION 'BACKEND_PRIVILEGE_MISSING';END IF;
END $$;
NOTIFY pgrst,'reload schema';
