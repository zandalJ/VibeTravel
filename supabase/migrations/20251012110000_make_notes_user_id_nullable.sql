-- ============================================================================
-- Migration: Make user_id nullable in notes table
-- Description: Allow creating notes without authentication for MVP phase
-- Tables affected: notes
-- Breaking change: No - existing data remains valid
-- ============================================================================

-- Remove NOT NULL constraint from user_id
alter table notes alter column user_id drop not null;

-- Drop the foreign key constraint temporarily
alter table notes drop constraint if exists notes_user_id_fkey;

-- Recreate the foreign key constraint without NOT NULL requirement
-- This allows NULL values but still validates when user_id is provided
alter table notes
  add constraint notes_user_id_fkey
  foreign key (user_id)
  references auth.users(id)
  on delete cascade;

-- Update comment
comment on column notes.user_id is 'Owner of the note (foreign key to auth.users, nullable for MVP phase)';
