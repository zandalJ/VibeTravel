-- ============================================================================
-- Migration: Fix plans table schema to match API requirements
-- Description: Replace itinerary/status/error_message with content, prompt fields, and feedback
-- Tables affected: plans
-- Breaking change: Yes - existing data structure changes
-- ============================================================================

-- Drop existing policies (will recreate after schema change)
drop policy if exists "users can view own plans - authenticated" on plans;
drop policy if exists "deny anonymous access to plans - anon" on plans;
drop policy if exists "users can create plans for own notes - authenticated" on plans;
drop policy if exists "deny anonymous insert to plans - anon" on plans;
drop policy if exists "users can update own plans - authenticated" on plans;
drop policy if exists "deny anonymous update to plans - anon" on plans;
drop policy if exists "users can delete own plans - authenticated" on plans;
drop policy if exists "deny anonymous delete from plans - anon" on plans;

-- Drop old columns
alter table plans drop column if exists itinerary;
alter table plans drop column if exists status;
alter table plans drop column if exists error_message;

-- Add new columns according to API plan
alter table plans add column prompt_text text not null default 'default prompt';
alter table plans add column prompt_version varchar(10) not null default 'v1';
alter table plans add column content text not null default 'default content';
alter table plans add column feedback smallint check (feedback in (-1, 1));

-- Remove default values (they were only for migration)
alter table plans alter column prompt_text drop default;
alter table plans alter column content drop default;

-- Drop old indexes
drop index if exists plans_status_idx;

-- Create new indexes
create index plans_prompt_version_idx on plans(prompt_version);
create index plans_feedback_idx on plans(feedback) where feedback is not null;

-- Recreate RLS policies
create policy "users can view own plans - authenticated"
  on plans
  for select
  to authenticated
  using (
    exists (
      select 1 from notes
      where notes.id = plans.note_id
      and notes.user_id = auth.uid()
    )
  );

create policy "deny anonymous access to plans - anon"
  on plans
  for select
  to anon
  using (false);

create policy "users can create plans for own notes - authenticated"
  on plans
  for insert
  to authenticated
  with check (
    exists (
      select 1 from notes
      where notes.id = plans.note_id
      and notes.user_id = auth.uid()
    )
  );

create policy "deny anonymous insert to plans - anon"
  on plans
  for insert
  to anon
  with check (false);

create policy "users can update own plans - authenticated"
  on plans
  for update
  to authenticated
  using (
    exists (
      select 1 from notes
      where notes.id = plans.note_id
      and notes.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from notes
      where notes.id = plans.note_id
      and notes.user_id = auth.uid()
    )
  );

create policy "deny anonymous update to plans - anon"
  on plans
  for update
  to anon
  using (false)
  with check (false);

create policy "users can delete own plans - authenticated"
  on plans
  for delete
  to authenticated
  using (
    exists (
      select 1 from notes
      where notes.id = plans.note_id
      and notes.user_id = auth.uid()
    )
  );

create policy "deny anonymous delete from plans - anon"
  on plans
  for delete
  to anon
  using (false);

-- Update table and column comments
comment on table plans is 'AI-generated travel plans in markdown format. One-to-many relationship with notes.';
comment on column plans.note_id is 'Source note for this plan (foreign key to notes)';
comment on column plans.prompt_text is 'Full text of the prompt sent to AI (required for debugging and analysis)';
comment on column plans.prompt_version is 'Version of the prompt structure (default: v1)';
comment on column plans.content is 'AI-generated plan content in Markdown format (required, ~10,000 chars recommended max)';
comment on column plans.feedback is 'User feedback: 1 = thumbs up, -1 = thumbs down, NULL = no feedback';
