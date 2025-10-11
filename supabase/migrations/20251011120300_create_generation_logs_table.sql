-- ============================================================================
-- Migration: Create generation_logs table
-- Description: Audit log for AI plan generation requests
-- Tables affected: generation_logs
-- Dependencies: auth.users, notes, plans
-- Notes:
--   - Tracks all generation attempts for auditing and analytics
--   - Records success/failure with error details
--   - Helps monitor AI usage and costs
-- ============================================================================

-- Create generation_logs table
create table generation_logs (
  -- Primary key - UUID for better distribution and security
  id uuid primary key default gen_random_uuid(),

  -- Foreign key to auth.users
  -- CASCADE delete ensures logs are removed when user is deleted
  user_id uuid not null references auth.users(id) on delete cascade,

  -- Foreign key to notes
  -- SET NULL on delete to preserve log history even if note is deleted
  note_id uuid references notes(id) on delete set null,

  -- Foreign key to plans
  -- SET NULL on delete to preserve log history even if plan is deleted
  plan_id uuid references plans(id) on delete set null,

  -- Success indicator
  -- True if generation completed successfully, false otherwise
  success boolean not null,

  -- Error message if generation failed
  -- Provides context for debugging and monitoring
  error_message text,

  -- Timestamp when generation was initiated
  -- Automatically set to current time on insert
  created_at timestamp with time zone not null default now()
);

-- Enable Row Level Security
alter table generation_logs enable row level security;

-- RLS Policy: Allow users to view their own generation logs (SELECT for authenticated)
create policy "users can view own generation logs - authenticated"
  on generation_logs
  for select
  to authenticated
  using (auth.uid() = user_id);

-- RLS Policy: Deny anonymous access to generation logs (SELECT for anon)
create policy "deny anonymous access to generation logs - anon"
  on generation_logs
  for select
  to anon
  using (false);

-- RLS Policy: Allow system/authenticated users to insert logs (INSERT for authenticated)
-- This allows the application to create logs for generation attempts
create policy "users can create own generation logs - authenticated"
  on generation_logs
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- RLS Policy: Deny anonymous users from inserting logs (INSERT for anon)
create policy "deny anonymous insert to generation logs - anon"
  on generation_logs
  for insert
  to anon
  with check (false);

-- RLS Policy: Deny updates to generation logs (UPDATE for authenticated)
-- Logs should be immutable once created
create policy "deny update to generation logs - authenticated"
  on generation_logs
  for update
  to authenticated
  using (false)
  with check (false);

-- RLS Policy: Deny anonymous users from updating logs (UPDATE for anon)
create policy "deny anonymous update to generation logs - anon"
  on generation_logs
  for update
  to anon
  using (false)
  with check (false);

-- RLS Policy: Allow users to delete their own generation logs (DELETE for authenticated)
-- Allows users to clear their history if needed
create policy "users can delete own generation logs - authenticated"
  on generation_logs
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- RLS Policy: Deny anonymous users from deleting logs (DELETE for anon)
create policy "deny anonymous delete from generation logs - anon"
  on generation_logs
  for delete
  to anon
  using (false);

-- Create index on user_id for faster lookups when filtering by user
create index generation_logs_user_id_idx on generation_logs(user_id);

-- Create index on note_id for faster lookups when filtering by note
create index generation_logs_note_id_idx on generation_logs(note_id);

-- Create index on plan_id for faster lookups when filtering by plan
create index generation_logs_plan_id_idx on generation_logs(plan_id);

-- Create index on created_at for sorting and time-based queries
create index generation_logs_created_at_idx on generation_logs(created_at desc);

-- Create composite index on user_id and created_at for user-specific time queries
create index generation_logs_user_id_created_at_idx on generation_logs(user_id, created_at desc);

-- Add helpful comments to table and columns
comment on table generation_logs is 'Audit log for AI plan generation requests. Tracks all attempts for monitoring and analytics.';
comment on column generation_logs.user_id is 'User who initiated the generation (foreign key to auth.users)';
comment on column generation_logs.note_id is 'Source note for generation (foreign key to notes, nullable after deletion)';
comment on column generation_logs.plan_id is 'Generated plan (foreign key to plans, nullable after deletion)';
comment on column generation_logs.success is 'Whether generation completed successfully';
comment on column generation_logs.error_message is 'Error details if generation failed, null otherwise';
comment on column generation_logs.created_at is 'Timestamp when generation was initiated';
