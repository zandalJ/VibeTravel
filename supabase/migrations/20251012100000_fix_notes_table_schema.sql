-- ============================================================================
-- Migration: Fix notes table schema to match API requirements
-- Description: Replace title/content fields with destination, dates, budget, and notes
-- Tables affected: notes
-- Breaking change: Yes - existing data structure changes
-- ============================================================================

-- Drop existing policies (will recreate after schema change)
drop policy if exists "users can view own notes - authenticated" on notes;
drop policy if exists "deny anonymous access to notes - anon" on notes;
drop policy if exists "users can create own notes - authenticated" on notes;
drop policy if exists "deny anonymous insert to notes - anon" on notes;
drop policy if exists "users can update own notes - authenticated" on notes;
drop policy if exists "deny anonymous update to notes - anon" on notes;
drop policy if exists "users can delete own notes - authenticated" on notes;
drop policy if exists "deny anonymous delete from notes - anon" on notes;

-- Drop old columns
alter table notes drop column if exists title;
alter table notes drop column if exists content;

-- Add new columns according to API plan
alter table notes add column destination varchar(255) not null default 'Unknown';
alter table notes add column start_date date not null default current_date;
alter table notes add column end_date date not null default current_date;
alter table notes add column total_budget numeric(10, 2) check (total_budget > 0);
alter table notes add column additional_notes text;

-- Remove default values (they were only for migration)
alter table notes alter column destination drop default;
alter table notes alter column start_date drop default;
alter table notes alter column end_date drop default;

-- Add constraints
alter table notes add constraint notes_date_range_check check (end_date >= start_date);
alter table notes add constraint notes_duration_check check (end_date - start_date <= 14);

-- Recreate indexes
drop index if exists notes_created_at_idx;
create index notes_created_at_idx on notes(created_at desc);
create index notes_start_date_idx on notes(start_date desc);
create index notes_destination_idx on notes(destination);

-- Recreate RLS policies
create policy "users can view own notes - authenticated"
  on notes
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "deny anonymous access to notes - anon"
  on notes
  for select
  to anon
  using (false);

create policy "users can create own notes - authenticated"
  on notes
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "deny anonymous insert to notes - anon"
  on notes
  for insert
  to anon
  with check (false);

create policy "users can update own notes - authenticated"
  on notes
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "deny anonymous update to notes - anon"
  on notes
  for update
  to anon
  using (false)
  with check (false);

create policy "users can delete own notes - authenticated"
  on notes
  for delete
  to authenticated
  using (auth.uid() = user_id);

create policy "deny anonymous delete from notes - anon"
  on notes
  for delete
  to anon
  using (false);

-- Update table and column comments
comment on table notes is 'User travel notes with destination and dates for AI plan generation';
comment on column notes.destination is 'Travel destination (required, max 255 characters)';
comment on column notes.start_date is 'Trip start date (required)';
comment on column notes.end_date is 'Trip end date (required, must be >= start_date, max 14 days duration)';
comment on column notes.total_budget is 'Total budget for the trip (optional, must be > 0)';
comment on column notes.additional_notes is 'Additional user notes and preferences (optional, ~10,000 chars recommended max)';