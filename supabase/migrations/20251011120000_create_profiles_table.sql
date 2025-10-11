-- ============================================================================
-- Migration: Create profiles table
-- Description: User preference profiles with travel style and interests
-- Tables affected: profiles
-- Dependencies: auth.users (Supabase Auth)
-- Notes:
--   - One-to-one relationship with auth.users
--   - Tracks generation limits for AI plan creation
--   - Contains user travel preferences and interests
-- ============================================================================

-- Create enum type for travel_style
create type travel_style_enum as enum (
  'budget',
  'backpacking',
  'comfort',
  'luxury',
  'adventure',
  'cultural',
  'relaxation',
  'family',
  'solo'
);

-- Create profiles table
create table profiles (
  -- Primary key and foreign key to auth.users
  -- CASCADE delete ensures profile is removed when user is deleted
  id uuid primary key references auth.users(id) on delete cascade,

  -- User interests from predefined tags
  -- Stored as array of text values, defaults to empty array
  interests text[] not null default '{}',

  -- Additional free-form interests entered by user
  -- Allows users to specify interests not in predefined list
  other_interests text,

  -- Daily budget in currency units (2 decimal places for cents/grosze)
  -- Must be positive value when set
  daily_budget numeric(10, 2) check (daily_budget > 0),

  -- User's preferred travel style
  -- Required field for profile completeness
  travel_style travel_style_enum not null,

  -- Typical trip duration in days
  -- Must be positive value when set
  typical_trip_duration integer check (typical_trip_duration > 0),

  -- Generation counter for current billing period
  -- Tracks how many AI plans user has generated this month
  generation_count integer not null default 0,

  -- Timestamp when generation limit will reset
  -- Defaults to first day of next month
  generation_limit_reset_at timestamp with time zone not null default (current_date + interval '1 month')::date,

  -- Audit timestamps
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

-- Enable Row Level Security
alter table profiles enable row level security;

-- RLS Policy: Allow users to view their own profile (SELECT for authenticated)
create policy "users can view own profile - authenticated"
  on profiles
  for select
  to authenticated
  using (auth.uid() = id);

-- RLS Policy: Deny anonymous access to profiles (SELECT for anon)
create policy "deny anonymous access to profiles - anon"
  on profiles
  for select
  to anon
  using (false);

-- RLS Policy: Allow users to insert their own profile (INSERT for authenticated)
create policy "users can create own profile - authenticated"
  on profiles
  for insert
  to authenticated
  with check (auth.uid() = id);

-- RLS Policy: Deny anonymous users from inserting profiles (INSERT for anon)
create policy "deny anonymous insert to profiles - anon"
  on profiles
  for insert
  to anon
  with check (false);

-- RLS Policy: Allow users to update their own profile (UPDATE for authenticated)
create policy "users can update own profile - authenticated"
  on profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- RLS Policy: Deny anonymous users from updating profiles (UPDATE for anon)
create policy "deny anonymous update to profiles - anon"
  on profiles
  for update
  to anon
  using (false)
  with check (false);

-- RLS Policy: Allow users to delete their own profile (DELETE for authenticated)
create policy "users can delete own profile - authenticated"
  on profiles
  for delete
  to authenticated
  using (auth.uid() = id);

-- RLS Policy: Deny anonymous users from deleting profiles (DELETE for anon)
create policy "deny anonymous delete from profiles - anon"
  on profiles
  for delete
  to anon
  using (false);

-- Create index on user_id for faster lookups
create index profiles_id_idx on profiles(id);

-- Add helpful comments to table and columns
comment on table profiles is 'User travel preferences and profile information. One-to-one relationship with auth.users.';
comment on column profiles.interests is 'Predefined interest tags selected by user';
comment on column profiles.other_interests is 'Custom interests entered by user as free text';
comment on column profiles.daily_budget is 'Daily budget for trips in currency units';
comment on column profiles.travel_style is 'Preferred travel style from predefined options';
comment on column profiles.typical_trip_duration is 'Typical trip duration in days';
comment on column profiles.generation_count is 'Number of AI plans generated in current period';
comment on column profiles.generation_limit_reset_at is 'When the generation counter resets';
