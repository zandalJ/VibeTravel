-- ============================================================================
-- Migration: Disable all RLS
-- Description: Completely disables Row Level Security on all tables
-- Tables affected: profiles, notes, plans, generation_logs
-- Notes:
--   - Drops all RLS policies
--   - Disables RLS on all tables
--   - WARNING: Tables will be accessible to all authenticated users
--   - Use only for development or before implementing new security model
-- ============================================================================

-- Drop all policies from profiles table
drop policy if exists "users can view own profile - authenticated" on profiles;
drop policy if exists "deny anonymous access to profiles - anon" on profiles;
drop policy if exists "users can create own profile - authenticated" on profiles;
drop policy if exists "deny anonymous insert to profiles - anon" on profiles;
drop policy if exists "users can update own profile - authenticated" on profiles;
drop policy if exists "deny anonymous update to profiles - anon" on profiles;
drop policy if exists "users can delete own profile - authenticated" on profiles;
drop policy if exists "deny anonymous delete from profiles - anon" on profiles;

-- Drop all policies from notes table
drop policy if exists "users can view own notes - authenticated" on notes;
drop policy if exists "deny anonymous access to notes - anon" on notes;
drop policy if exists "users can create own notes - authenticated" on notes;
drop policy if exists "deny anonymous insert to notes - anon" on notes;
drop policy if exists "users can update own notes - authenticated" on notes;
drop policy if exists "deny anonymous update to notes - anon" on notes;
drop policy if exists "users can delete own notes - authenticated" on notes;
drop policy if exists "deny anonymous delete from notes - anon" on notes;

-- Drop all policies from plans table
drop policy if exists "users can view own plans - authenticated" on plans;
drop policy if exists "deny anonymous access to plans - anon" on plans;
drop policy if exists "users can create plans for own notes - authenticated" on plans;
drop policy if exists "deny anonymous insert to plans - anon" on plans;
drop policy if exists "users can update own plans - authenticated" on plans;
drop policy if exists "deny anonymous update to plans - anon" on plans;
drop policy if exists "users can delete own plans - authenticated" on plans;
drop policy if exists "deny anonymous delete from plans - anon" on plans;

-- Drop all policies from generation_logs table
drop policy if exists "users can view own generation logs - authenticated" on generation_logs;
drop policy if exists "deny anonymous access to generation logs - anon" on generation_logs;
drop policy if exists "users can create own generation logs - authenticated" on generation_logs;
drop policy if exists "deny anonymous insert to generation logs - anon" on generation_logs;
drop policy if exists "deny update to generation logs - authenticated" on generation_logs;
drop policy if exists "deny anonymous update to generation logs - anon" on generation_logs;
drop policy if exists "users can delete own generation logs - authenticated" on generation_logs;
drop policy if exists "deny anonymous delete from generation logs - anon" on generation_logs;

-- Disable RLS on all tables
alter table profiles disable row level security;
alter table notes disable row level security;
alter table plans disable row level security;
alter table generation_logs disable row level security;

-- Add comment for documentation
comment on table profiles is 'User travel preferences and profile information. One-to-one relationship with auth.users. WARNING: RLS is disabled - table is accessible to all authenticated users.';
comment on table notes is 'User travel notes that serve as input for AI plan generation. WARNING: RLS is disabled - table is accessible to all authenticated users.';
comment on table plans is 'AI-generated travel plans based on user notes. One-to-one relationship with notes. WARNING: RLS is disabled - table is accessible to all authenticated users.';
comment on table generation_logs is 'Audit log for AI plan generation requests. Tracks all attempts for monitoring and analytics. WARNING: RLS is disabled - table is accessible to all authenticated users.';
