-- ============================================================================
-- Migration: Remove unique constraint on plans.note_id
-- Description: Change relationship from one-to-one to one-to-many (note can have multiple plans)
-- Tables affected: plans
-- Breaking change: No - only relaxes constraint
-- ============================================================================

-- Drop the unique constraint on note_id to allow multiple plans per note
alter table plans drop constraint if exists plans_note_id_key;

-- Update comment to reflect one-to-many relationship
comment on table plans is 'AI-generated travel plans in markdown format. One-to-many relationship with notes (each note can have multiple plan versions).';