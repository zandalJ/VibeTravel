-- ============================================================================
-- Migration: Create plans table
-- Description: AI-generated travel plans based on user notes
-- Tables affected: plans
-- Dependencies: notes
-- Notes:
--   - Each plan is generated from a note (one-to-one relationship)
--   - Contains AI-generated itinerary in JSON format
--   - Tracks generation status and errors
-- ============================================================================

-- Create enum type for generation status
create type generation_status_enum as enum (
  'pending',
  'processing',
  'completed',
  'failed'
);

-- Create plans table
create table plans (
  -- Primary key - UUID for better distribution and security
  id uuid primary key default gen_random_uuid(),

  -- Foreign key to notes
  -- CASCADE delete ensures plans are removed when note is deleted
  -- UNIQUE constraint enforces one-to-one relationship with notes
  note_id uuid not null unique references notes(id) on delete cascade,

  -- Generated itinerary in JSON format
  -- Contains structured travel plan data
  -- Can be null when generation is pending or failed
  itinerary jsonb,

  -- Generation status tracking
  -- Allows UI to show loading states and error messages
  status generation_status_enum not null default 'pending',

  -- Error message if generation failed
  -- Provides context for debugging and user feedback
  error_message text,

  -- Audit timestamps
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

-- Enable Row Level Security
alter table plans enable row level security;

-- RLS Policy: Allow users to view plans for their own notes (SELECT for authenticated)
-- Uses join to notes table to verify ownership
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

-- RLS Policy: Deny anonymous access to plans (SELECT for anon)
create policy "deny anonymous access to plans - anon"
  on plans
  for select
  to anon
  using (false);

-- RLS Policy: Allow users to insert plans for their own notes (INSERT for authenticated)
-- Verifies user owns the note before allowing plan creation
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

-- RLS Policy: Deny anonymous users from inserting plans (INSERT for anon)
create policy "deny anonymous insert to plans - anon"
  on plans
  for insert
  to anon
  with check (false);

-- RLS Policy: Allow users to update plans for their own notes (UPDATE for authenticated)
-- Verifies user owns the note before allowing plan updates
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

-- RLS Policy: Deny anonymous users from updating plans (UPDATE for anon)
create policy "deny anonymous update to plans - anon"
  on plans
  for update
  to anon
  using (false)
  with check (false);

-- RLS Policy: Allow users to delete plans for their own notes (DELETE for authenticated)
-- Verifies user owns the note before allowing plan deletion
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

-- RLS Policy: Deny anonymous users from deleting plans (DELETE for anon)
create policy "deny anonymous delete from plans - anon"
  on plans
  for delete
  to anon
  using (false);

-- Create index on note_id for faster lookups
-- Already unique, but explicit index helps with joins
create index plans_note_id_idx on plans(note_id);

-- Create index on status for filtering by generation status
create index plans_status_idx on plans(status);

-- Create index on created_at for sorting and time-based queries
create index plans_created_at_idx on plans(created_at desc);

-- Add helpful comments to table and columns
comment on table plans is 'AI-generated travel plans based on user notes. One-to-one relationship with notes.';
comment on column plans.note_id is 'Source note for this plan (foreign key to notes, unique constraint)';
comment on column plans.itinerary is 'Generated travel itinerary in JSON format';
comment on column plans.status is 'Current status of plan generation (pending, processing, completed, failed)';
comment on column plans.error_message is 'Error message if generation failed, null otherwise';
