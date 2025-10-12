-- ============================================================================
-- Migration: Allow anonymous notes creation for development
-- Description: Enable anonymous users to create notes without authentication
-- Tables affected: notes
-- Breaking change: No - adds permissive policy for development
-- Security: This is for DEVELOPMENT ONLY - remove before production
-- ============================================================================

-- Drop the restrictive anonymous policies
drop policy if exists "deny anonymous insert to notes - anon" on notes;
drop policy if exists "deny anonymous access to notes - anon" on notes;
drop policy if exists "deny anonymous update to notes - anon" on notes;
drop policy if exists "deny anonymous delete from notes - anon" on notes;

-- Create permissive policy for anonymous INSERT (development only)
-- This allows anonymous users to create notes with any user_id
create policy "allow anonymous insert for dev - anon"
  on notes
  for insert
  to anon
  with check (true);

-- Create permissive policy for anonymous SELECT (development only)
-- This allows anonymous users to view all notes
create policy "allow anonymous select for dev - anon"
  on notes
  for select
  to anon
  using (true);

-- Add comment to remind about security
comment on table notes is 'User travel notes with destination and dates for AI plan generation (WARNING: Anonymous access enabled for development)';