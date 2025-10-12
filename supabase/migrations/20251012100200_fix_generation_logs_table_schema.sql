-- ============================================================================
-- Migration: Fix generation_logs table schema to match db-plan.md
-- Description: Replace success boolean with status enum, add error_code and token tracking
-- Tables affected: generation_logs
-- Breaking change: Yes - existing data structure changes
-- ============================================================================

-- Drop existing policies (will recreate after schema change)
drop policy if exists "users can view own generation logs - authenticated" on generation_logs;
drop policy if exists "deny anonymous access to generation logs - anon" on generation_logs;

-- Drop old columns
alter table generation_logs drop column if exists success;

-- Add new columns according to db-plan.md
alter table generation_logs add column status varchar(20) not null default 'in_progress'
  check (status in ('in_progress', 'success', 'failed'));
alter table generation_logs add column error_code varchar(50);
alter table generation_logs add column prompt_tokens integer;
alter table generation_logs add column completion_tokens integer;

-- Remove default value (was only for migration)
alter table generation_logs alter column status drop default;

-- Update plan_id to allow SET NULL on delete (instead of CASCADE)
alter table generation_logs drop constraint if exists generation_logs_plan_id_fkey;
alter table generation_logs add constraint generation_logs_plan_id_fkey
  foreign key (plan_id) references plans(id) on delete set null;

-- Create indexes for common queries
create index generation_logs_status_idx on generation_logs(status);
create index generation_logs_error_code_idx on generation_logs(error_code) where error_code is not null;

-- Recreate RLS policies (generation_logs are not exposed via API but policies ensure security)
create policy "users can view own generation logs - authenticated"
  on generation_logs
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "deny anonymous access to generation logs - anon"
  on generation_logs
  for select
  to anon
  using (false);

-- Update table and column comments
comment on table generation_logs is 'Audit log of plan generation attempts with status tracking and token usage';
comment on column generation_logs.status is 'Generation status: in_progress, success, or failed (required)';
comment on column generation_logs.error_message is 'Detailed error message when status = failed (NULL otherwise)';
comment on column generation_logs.error_code is 'Error category code: rate_limit, timeout, invalid_response, service_unavailable (NULL when success)';
comment on column generation_logs.prompt_tokens is 'Number of tokens in the prompt sent to AI (for cost monitoring)';
comment on column generation_logs.completion_tokens is 'Number of tokens in AI response (for cost monitoring)';