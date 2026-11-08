-- Based on Supabase's official self-hosted roles initialization.
\set pgpass `echo "$POSTGRES_PASSWORD"`
SELECT format('ALTER ROLE %I WITH PASSWORD %L', rolname, :'pgpass')
FROM pg_roles WHERE rolname IN ('authenticator','pgbouncer','supabase_auth_admin','supabase_functions_admin','supabase_storage_admin')
\gexec
