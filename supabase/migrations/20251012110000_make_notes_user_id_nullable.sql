-- ============================================================================
-- Migration: Configure notes table for development without authentication
-- Description: Allow creating notes with a default user_id for development
-- Tables affected: notes
-- Breaking change: No - existing data remains valid
-- ============================================================================

-- Drop the foreign key constraint for development
-- This allows using a default UUID without requiring actual users in auth.users
alter table notes drop constraint if exists notes_user_id_fkey;

-- Keep user_id as NOT NULL but without foreign key validation
-- During development, we'll use a constant DEFAULT_USER_ID = '00000000-0000-0000-0000-000000000000'
-- In production, we'll restore the foreign key constraint

-- Update comment
comment on column notes.user_id is 'Owner of the note (UUID, foreign key constraint removed for development phase)';
