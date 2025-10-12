-- ============================================================================
-- Migration: Create test user and profile for development
-- Description: Adds test user with complete profile for plan generation testing
-- Tables affected: auth.users, profiles
-- Breaking change: No - only adds test data
-- Security: This is for DEVELOPMENT ONLY - test user has fixed UUID
-- ============================================================================

-- Test user ID (matches DEFAULT_USER_ID in services)
-- 00000000-0000-0000-0000-000000000000

-- Insert test user into auth.users (required for profiles foreign key)
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  role,
  aud
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-0000-0000-000000000000',
  'testuser@vibetravel.dev',
  '', -- no password for dev user
  NOW(),
  NOW(),
  NOW(),
  '{"provider": "email", "providers": ["email"]}'::jsonb,
  '{}'::jsonb,
  false,
  'authenticated',
  'authenticated'
)
ON CONFLICT (id) DO NOTHING;

-- Insert test profile with all required fields for plan generation
INSERT INTO profiles (
  id,
  travel_style,
  interests,
  other_interests,
  daily_budget,
  typical_trip_duration,
  generation_count,
  generation_limit_reset_at
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  'backpacking',
  ARRAY['culture', 'food', 'nature', 'adventure'],
  'photography and local markets',
  50, -- $50 per day budget
  7, -- typical 7-day trips
  0, -- no generations yet
  (NOW() + INTERVAL '30 days')::timestamp -- reset in 30 days
)
ON CONFLICT (id) DO UPDATE SET
  travel_style = EXCLUDED.travel_style,
  interests = EXCLUDED.interests,
  other_interests = EXCLUDED.other_interests,
  daily_budget = EXCLUDED.daily_budget,
  typical_trip_duration = EXCLUDED.typical_trip_duration,
  generation_count = EXCLUDED.generation_count,
  generation_limit_reset_at = EXCLUDED.generation_limit_reset_at;

-- Add permissive policies for profiles (development only)
DROP POLICY IF EXISTS "allow anonymous select profiles for dev - anon" ON profiles;
DROP POLICY IF EXISTS "allow anonymous update profiles for dev - anon" ON profiles;

CREATE POLICY "allow anonymous select profiles for dev - anon"
  ON profiles
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "allow anonymous update profiles for dev - anon"
  ON profiles
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- Add permissive policies for plans (for reading generated plans)
DROP POLICY IF EXISTS "allow anonymous select plans for dev - anon" ON plans;
DROP POLICY IF EXISTS "allow anonymous insert plans for dev - anon" ON plans;

CREATE POLICY "allow anonymous select plans for dev - anon"
  ON plans
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "allow anonymous insert plans for dev - anon"
  ON plans
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Add permissive policies for generation_logs (for logging)
DROP POLICY IF EXISTS "allow anonymous insert generation_logs for dev - anon" ON generation_logs;
DROP POLICY IF EXISTS "allow anonymous update generation_logs for dev - anon" ON generation_logs;
DROP POLICY IF EXISTS "allow anonymous select generation_logs for dev - anon" ON generation_logs;

CREATE POLICY "allow anonymous insert generation_logs for dev - anon"
  ON generation_logs
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "allow anonymous update generation_logs for dev - anon"
  ON generation_logs
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "allow anonymous select generation_logs for dev - anon"
  ON generation_logs
  FOR SELECT
  TO anon
  USING (true);

-- Add comments
COMMENT ON TABLE profiles IS 'User preferences and travel style (WARNING: Anonymous access enabled for development)';
COMMENT ON TABLE plans IS 'AI-generated travel plans (WARNING: Anonymous access enabled for development)';
COMMENT ON TABLE generation_logs IS 'Logs of plan generation attempts (WARNING: Anonymous access enabled for development)';