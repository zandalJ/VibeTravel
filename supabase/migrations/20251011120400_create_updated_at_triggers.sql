-- ============================================================================
-- Migration: Create updated_at triggers
-- Description: Automatic timestamp updates for modified records
-- Tables affected: profiles, notes, plans
-- Dependencies: profiles, notes, plans tables
-- Notes:
--   - Creates reusable function to update updated_at timestamp
--   - Applies triggers to all tables with updated_at column
--   - Ensures audit trail accuracy
-- ============================================================================

-- Create function to automatically update updated_at timestamp
-- This function will be called by triggers before any update operation
create or replace function update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
  -- Set updated_at to current timestamp
  new.updated_at = now();
  return new;
end;
$$;

-- Add comment to function
comment on function update_updated_at_column() is 'Trigger function that automatically updates the updated_at column to current timestamp on row updates';

-- Create trigger for profiles table
-- BEFORE UPDATE ensures updated_at is set before the row is written
create trigger profiles_updated_at_trigger
  before update on profiles
  for each row
  execute function update_updated_at_column();

-- Create trigger for notes table
-- BEFORE UPDATE ensures updated_at is set before the row is written
create trigger notes_updated_at_trigger
  before update on notes
  for each row
  execute function update_updated_at_column();

-- Create trigger for plans table
-- BEFORE UPDATE ensures updated_at is set before the row is written
create trigger plans_updated_at_trigger
  before update on plans
  for each row
  execute function update_updated_at_column();
