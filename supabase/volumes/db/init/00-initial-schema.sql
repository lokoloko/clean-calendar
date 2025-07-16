-- Set up the database roles and permissions
CREATE ROLE supabase_admin LOGIN SUPERUSER CREATEDB CREATEROLE REPLICATION BYPASSRLS PASSWORD 'root';
CREATE ROLE authenticator NOINHERIT LOGIN PASSWORD 'root';
CREATE ROLE anon NOLOGIN NOINHERIT;
CREATE ROLE authenticated NOLOGIN NOINHERIT;
CREATE ROLE service_role NOLOGIN NOINHERIT BYPASSRLS;
CREATE ROLE supabase_auth_admin NOLOGIN NOINHERIT CREATEROLE PASSWORD 'root';
CREATE ROLE supabase_storage_admin NOLOGIN NOINHERIT PASSWORD 'root';
CREATE ROLE dashboard_user NOLOGIN PASSWORD 'root';
CREATE ROLE postgres LOGIN PASSWORD 'root';

-- Grant permissions
GRANT anon TO authenticator;
GRANT authenticated TO authenticator;
GRANT service_role TO authenticator;
GRANT supabase_auth_admin TO supabase_admin;
GRANT supabase_storage_admin TO supabase_admin;
GRANT dashboard_user TO postgres;

-- Create schemas
CREATE SCHEMA IF NOT EXISTS auth AUTHORIZATION supabase_auth_admin;
CREATE SCHEMA IF NOT EXISTS storage AUTHORIZATION supabase_storage_admin;
CREATE SCHEMA IF NOT EXISTS _realtime;
CREATE SCHEMA IF NOT EXISTS realtime;
CREATE SCHEMA IF NOT EXISTS _analytics;

-- Grant schema permissions
GRANT CREATE ON DATABASE postgres TO postgres;
GRANT USAGE ON SCHEMA public TO postgres;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;
GRANT ALL ON SCHEMA auth TO supabase_auth_admin;
GRANT ALL ON SCHEMA storage TO supabase_storage_admin;

-- Set search path
ALTER USER authenticator SET search_path = "$user", public, auth, storage;

-- Create necessary extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgjwt";

-- Auth schema permissions
GRANT ALL ON SCHEMA auth TO postgres;
GRANT ALL ON SCHEMA auth TO dashboard_user;