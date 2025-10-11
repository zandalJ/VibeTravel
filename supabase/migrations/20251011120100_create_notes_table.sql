-- ============================================================================
-- Migration: Create notes table
-- Description: User travel notes that serve as input for AI plan generation
-- Tables affected: notes
-- Dependencies: auth.users (Supabase Auth)
-- Notes:
--   - Each note belongs to a user (many-to-one relationship)
--   - Notes can be converted to travel plans
--   - Content is free-form text
-- ============================================================================

-- Create notes table
create table notes (
  -- Primary key - UUID for better distribution and security
  id uuid primary key default gen_random_uuid(),

  -- Foreign key to auth.users
  -- CASCADE delete ensures notes are removed when user is deleted
  user_id uuid not null references auth.users(id) on delete cascade,

  -- Note title - required field
  -- Used for quick identification in lists
  title text not null,

  -- Note content - free-form text
  -- Can be null for draft notes
  content text,

  -- Audit timestamps
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

-- Enable Row Level Security
alter table notes enable row level security;

-- RLS Policy: Allow users to view their own notes (SELECT for authenticated)
create policy "users can view own notes - authenticated"
  on notes
  for select
  to authenticated
  using (auth.uid() = user_id);

-- RLS Policy: Deny anonymous access to notes (SELECT for anon)
create policy "deny anonymous access to notes - anon"
  on notes
  for select
  to anon
  using (false);

-- RLS Policy: Allow users to insert their own notes (INSERT for authenticated)
create policy "users can create own notes - authenticated"
  on notes
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- RLS Policy: Deny anonymous users from inserting notes (INSERT for anon)
create policy "deny anonymous insert to notes - anon"
  on notes
  for insert
  to anon
  with check (false);

-- RLS Policy: Allow users to update their own notes (UPDATE for authenticated)
create policy "users can update own notes - authenticated"
  on notes
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- RLS Policy: Deny anonymous users from updating notes (UPDATE for anon)
create policy "deny anonymous update to notes - anon"
  on notes
  for update
  to anon
  using (false)
  with check (false);

-- RLS Policy: Allow users to delete their own notes (DELETE for authenticated)
create policy "users can delete own notes - authenticated"
  on notes
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- RLS Policy: Deny anonymous users from deleting notes (DELETE for anon)
create policy "deny anonymous delete from notes - anon"
  on notes
  for delete
  to anon
  using (false);

-- Create index on user_id for faster lookups when filtering by user
create index notes_user_id_idx on notes(user_id);

-- Create index on created_at for sorting and time-based queries
create index notes_created_at_idx on notes(created_at desc);

-- Add helpful comments to table and columns
comment on table notes is 'User travel notes that serve as input for AI plan generation';
comment on column notes.user_id is 'Owner of the note (foreign key to auth.users)';
comment on column notes.title is 'Note title for quick identification';
comment on column notes.content is 'Free-form note content, can be null for drafts';
