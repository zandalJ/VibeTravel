# API Testing Guide - Generate Plan Endpoint

This document contains curl requests for testing the `/api/notes/[noteId]/generate-plan` endpoint.

## Prerequisites

1. **Local Supabase must be running** on `http://127.0.0.1:54321`
2. **Test user and profile** must exist (run migration `20251012130000_create_test_user_and_profile.sql`)
3. **OpenRouter API key** must be set in `.env`

## Environment Variables

```bash
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
TEST_USER_ID=00000000-0000-0000-0000-000000000000
```

## Setup: Create a Test Note

Before testing the generate-plan endpoint, you need to create a test note:

```bash
# Create a test note
curl -X POST http://localhost:4321/api/notes \
  -H "Content-Type: application/json" \
  -d '{
    "destination": "Tokyo, Japan",
    "start_date": "2025-06-01",
    "end_date": "2025-06-07",
    "total_budget": 1500,
    "additional_notes": "Want to experience both traditional culture and modern technology. Interested in authentic food experiences."
  }'
```

**Save the `id` from the response** - you'll need it for the following tests.

---

## Test Scenarios

### 1. ✅ Successful Plan Generation (Happy Path)

Tests the complete flow with valid data.

```bash
# Replace {NOTE_ID} with the actual note ID from the setup step
curl -X POST http://localhost:4321/api/notes/{NOTE_ID}/generate-plan \
  -H "Content-Type: application/json" \
  -v
```

**Expected Response: 201 Created**
```json
{
  "id": "uuid-of-generated-plan",
  "note_id": "your-note-id",
  "content": "# Day 1: Arrival in Tokyo...",
  "prompt_version": "v1.0.0",
  "created_at": "2025-10-12T...",
  "remaining_generations": 4,
  "generation_limit_reset_at": "2025-11-11T..."
}
```

---

### 2. ❌ Invalid Note ID Format

Tests validation of noteId parameter.

```bash
# Test with invalid UUID format
curl -X POST http://localhost:4321/api/notes/invalid-uuid-format/generate-plan \
  -H "Content-Type: application/json" \
  -v
```

**Expected Response: 400 Bad Request**
```json
{
  "error": "Invalid noteId format",
  "code": "VALIDATION_ERROR"
}
```

---

### 3. ❌ Non-existent Note

Tests behavior when note doesn't exist in database.

```bash
# Test with valid UUID that doesn't exist
curl -X POST http://localhost:4321/api/notes/11111111-1111-1111-1111-111111111111/generate-plan \
  -H "Content-Type: application/json" \
  -v
```

**Expected Response: 404 Not Found**
```json
{
  "error": "Note not found with ID: 11111111-1111-1111-1111-111111111111",
  "code": "NOT_FOUND"
}
```

---

### 4. ❌ Generation Limit Exceeded

Tests monthly generation limit enforcement (5 plans per month).

**Setup:** First, update the test profile to have 5 generations:

```bash
# Update generation count to 5 (at limit)
curl -X POST http://127.0.0.1:54321/rest/v1/profiles \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0" \
  -H "Content-Type: application/json" \
  -H "Prefer: resolution=merge-duplicates" \
  -d '{
    "id": "00000000-0000-0000-0000-000000000000",
    "generation_count": 5
  }'
```

**Then test:**

```bash
# Try to generate plan when limit reached
curl -X POST http://localhost:4321/api/notes/{NOTE_ID}/generate-plan \
  -H "Content-Type: application/json" \
  -v
```

**Expected Response: 429 Too Many Requests**
```json
{
  "error": "Monthly generation limit of 5 reached. Limit resets on 2025-11-11",
  "code": "GENERATION_LIMIT_EXCEEDED",
  "limit": 5,
  "reset_at": "2025-11-11T..."
}
```

**Cleanup:** Reset generation count to 0:

```bash
curl -X POST http://127.0.0.1:54321/rest/v1/profiles \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0" \
  -H "Content-Type: application/json" \
  -H "Prefer: resolution=merge-duplicates" \
  -d '{
    "id": "00000000-0000-0000-0000-000000000000",
    "generation_count": 0
  }'
```

---

### 5. ❌ Incomplete Profile

Tests validation of required profile fields.

**Setup:** Remove required fields from profile:

```bash
# Remove travel_style from profile
curl -X POST http://127.0.0.1:54321/rest/v1/profiles \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0" \
  -H "Content-Type: application/json" \
  -H "Prefer: resolution=merge-duplicates" \
  -d '{
    "id": "00000000-0000-0000-0000-000000000000",
    "travel_style": null,
    "daily_budget": null
  }'
```

**Then test:**

```bash
# Try to generate plan with incomplete profile
curl -X POST http://localhost:4321/api/notes/{NOTE_ID}/generate-plan \
  -H "Content-Type: application/json" \
  -v
```

**Expected Response: 400 Bad Request**
```json
{
  "error": "Profile is incomplete. Please fill in: travel_style, daily_budget",
  "code": "INCOMPLETE_PROFILE",
  "missing_fields": ["travel_style", "daily_budget"]
}
```

**Cleanup:** Restore profile:

```bash
curl -X POST http://127.0.0.1:54321/rest/v1/profiles \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0" \
  -H "Content-Type: application/json" \
  -H "Prefer: resolution=merge-duplicates" \
  -d '{
    "id": "00000000-0000-0000-0000-000000000000",
    "travel_style": "backpacking",
    "daily_budget": 50
  }'
```

---

### 6. 🔍 Verify Generated Plan

After successful generation, verify the plan was created:

```bash
# Get the generated plan by ID (use the 'id' from step 1 response)
curl -X GET http://127.0.0.1:54321/rest/v1/plans?id=eq.{PLAN_ID}&select=* \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0"
```

---

### 7. 🔍 Check Generation Logs

View generation history and status:

```bash
# Get all generation logs for the test user
curl -X GET "http://127.0.0.1:54321/rest/v1/generation_logs?user_id=eq.00000000-0000-0000-0000-000000000000&select=*&order=created_at.desc" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0"
```

---

### 8. 🔍 Check Profile Generation Count

Verify that generation count is incremented:

```bash
# Get current generation count
curl -X GET "http://127.0.0.1:54321/rest/v1/profiles?id=eq.00000000-0000-0000-0000-000000000000&select=generation_count,generation_limit_reset_at" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0"
```

---

## Additional Test Notes

### Create Multiple Test Notes

For more comprehensive testing, create notes with different scenarios:

```bash
# Short trip with low budget
curl -X POST http://localhost:4321/api/notes \
  -H "Content-Type: application/json" \
  -d '{
    "destination": "Barcelona, Spain",
    "start_date": "2025-07-15",
    "end_date": "2025-07-18",
    "total_budget": 500,
    "additional_notes": "Budget backpacking trip, hostels only"
  }'

# Long trip with high budget
curl -X POST http://localhost:4321/api/notes \
  -H "Content-Type: application/json" \
  -d '{
    "destination": "New Zealand",
    "start_date": "2025-09-01",
    "end_date": "2025-09-21",
    "total_budget": 5000,
    "additional_notes": "Once in a lifetime trip. Want to see both islands, hiking, and adventure sports."
  }'

# Weekend getaway
curl -X POST http://localhost:4321/api/notes \
  -H "Content-Type: application/json" \
  -d '{
    "destination": "Paris, France",
    "start_date": "2025-08-10",
    "end_date": "2025-08-12",
    "total_budget": 800,
    "additional_notes": "Romantic weekend, good restaurants and museums"
  }'
```

---

## Troubleshooting

### If you get 500 Internal Server Error:

1. **Check server logs** - Look at the terminal where `npm run dev` is running
2. **Look for console.error messages** - The endpoint now has detailed logging
3. **Common causes:**
   - Supabase not running (`supabase status` should show services running)
   - Environment variables not loaded (restart dev server after changing `.env`)
   - Database schema mismatch (run `supabase db reset` and migrations)
   - Missing database types (run `supabase gen types typescript --local > src/db/database.types.ts`)

### If you get CORS errors:
Make sure you're running the dev server on port 3000: `npm run dev`

### If you get authentication errors:
Verify that the anonymous policies were created by the migration:
```bash
psql "$DATABASE_URL" -c "SELECT * FROM pg_policies WHERE tablename IN ('profiles', 'plans', 'generation_logs');"
```

### If OpenRouter fails:
Check that `OPENROUTER_API_KEY` is set in `.env` (currently using mock service, so this shouldn't fail)

### To reset test environment:
```bash
# Reset generation count and profile
npm run db:reset
npm run db:migrate

# Or just reset generation count
curl -X POST http://127.0.0.1:54321/rest/v1/profiles \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0" \
  -H "Content-Type: application/json" \
  -H "Prefer: resolution=merge-duplicates" \
  -d '{"id": "00000000-0000-0000-0000-000000000000", "generation_count": 0}'
```

### Debug mode:
To see detailed error logs, check the terminal where your dev server is running. The endpoint now includes:
- `[generate-plan]` prefixed log messages
- Full error stack traces
- Step-by-step execution logging

---

## Postman Collection

You can import these into Postman by:
1. Create a new collection called "VibeTravel - Generate Plan"
2. Set collection variables:
   - `base_url`: `http://localhost:4321`
   - `supabase_url`: `http://127.0.0.1:54321`
   - `anon_key`: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0`
   - `test_user_id`: `00000000-0000-0000-0000-000000000000`
   - `note_id`: (set after creating a test note)
3. Add each curl command as a separate request
4. Use `{{base_url}}`, `{{note_id}}` etc. as variables
