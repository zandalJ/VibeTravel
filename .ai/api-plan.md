# REST API Plan - VibeTravel

## 1. Resources

| Resource | Database Table | Description |
|----------|---------------|-------------|
| Profile | `profiles` | User travel preferences and generation limits (1:1 with user) |
| Note | `notes` | User's travel notes with destination and dates (many:1 with user) |
| Plan | `plans` | AI-generated travel plans (many:1 with note) |
| Generation Log | `generation_logs` | Audit log of plan generation attempts |

**Note:** User authentication is handled entirely by Supabase Auth. No custom user endpoints are needed.

## 2. Endpoints

### 2.1 Profile Management

#### Get Current User's Profile

- **Method:** `GET`
- **Path:** `/api/profile`
- **Description:** Retrieve the authenticated user's profile with preferences
- **Authentication:** Required (Supabase session)
- **Query Parameters:** None

**Response (200 OK):**
```json
{
  "id": "uuid",
  "interests": ["beach", "culture", "food"],
  "other_interests": "photography, local markets",
  "daily_budget": 150.00,
  "travel_style": "backpacking",
  "typical_trip_duration": 7,
  "generation_count": 2,
  "generation_limit_reset_at": "2025-11-11T00:00:00Z",
  "is_complete": true,
  "created_at": "2025-10-11T10:30:00Z",
  "updated_at": "2025-10-11T10:30:00Z"
}
```

**Response (404 Not Found):**
```json
{
  "error": "Profile not found",
  "code": "PROFILE_NOT_FOUND"
}
```

> Authentication fallback: For the MVP, this endpoint uses a default test user when no Supabase session is present, so 401 responses are currently disabled. Full authentication enforcement will be added later.

---

#### Create or Update Profile

- **Method:** `PUT`
- **Path:** `/api/profile`
- **Description:** Create or update the authenticated user's profile (upsert operation)
- **Authentication:** Required (Supabase session)

**Request Body:**
```json
{
  "interests": ["beach", "culture", "food"],
  "other_interests": "photography, local markets",
  "daily_budget": 150.00,
  "travel_style": "backpacking",
  "typical_trip_duration": 7
}
```

**Validation Rules:**
- `interests`: Optional array of strings
- `other_interests`: Optional string
- `daily_budget`: Optional numeric, must be > 0 if provided
- `travel_style`: Required, must be one of: `budget`, `backpacking`, `comfort`, `luxury`, `adventure`, `cultural`, `relaxation`, `family`, `solo`
- `typical_trip_duration`: Optional integer, must be > 0 if provided

**Response (200 OK):**
```json
{
  "id": "uuid",
  "interests": ["beach", "culture", "food"],
  "other_interests": "photography, local markets",
  "daily_budget": 150.00,
  "travel_style": "backpacking",
  "typical_trip_duration": 7,
  "generation_count": 0,
  "generation_limit_reset_at": "2025-11-11T00:00:00Z",
  "is_complete": true,
  "created_at": "2025-10-11T10:30:00Z",
  "updated_at": "2025-10-11T10:35:00Z"
}
```

**Response (400 Bad Request):**
```json
{
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": {
    "travel_style": "Must be one of: budget, backpacking, comfort, luxury, adventure, cultural, relaxation, family, solo",
    "daily_budget": "Must be greater than 0"
  }
}
```

> Authentication fallback: For the MVP, this endpoint uses a default test user when no Supabase session exists, so 401 responses are disabled for now.

---

### 2.2 Notes Management

#### List All Notes

- **Method:** `GET`
- **Path:** `/api/notes`
- **Description:** Retrieve all notes for the authenticated user
- **Authentication:** Required (Supabase session)

**Query Parameters:**
- `sort`: Optional, default `created_at:desc`. Format: `field:direction` (e.g., `start_date:asc`)
- `limit`: Optional, default 50, max 100
- `offset`: Optional, default 0

**Response (200 OK):**
```json
{
  "notes": [
    {
      "id": "uuid",
      "destination": "Barcelona, Spain",
      "start_date": "2025-12-01",
      "end_date": "2025-12-07",
      "total_budget": 1000.00,
      "additional_notes": "Want to see Sagrada Familia and Gothic Quarter",
      "plan_count": 3,
      "created_at": "2025-10-11T10:30:00Z",
      "updated_at": "2025-10-11T10:30:00Z"
    }
  ],
  "pagination": {
    "total": 1,
    "limit": 50,
    "offset": 0
  }
}
```

> Authentication fallback: For the MVP, this endpoint uses a default test user when no Supabase session exists, so 401 responses are disabled for now.

---

#### Get Note Details

- **Method:** `GET`
- **Path:** `/api/notes/:id`
- **Description:** Retrieve a specific note with its details
- **Authentication:** Required (Supabase session)

**Response (200 OK):**
```json
{
  "id": "uuid",
  "destination": "Barcelona, Spain",
  "start_date": "2025-12-01",
  "end_date": "2025-12-07",
  "total_budget": 1000.00,
  "additional_notes": "Want to see Sagrada Familia and Gothic Quarter",
  "created_at": "2025-10-11T10:30:00Z",
  "updated_at": "2025-10-11T10:30:00Z"
}
```

**Response (404 Not Found):**
```json
{
  "error": "Note not found",
  "code": "NOTE_NOT_FOUND"
}
```

**Response (401 Unauthorized):**
```json
{
  "error": "Authentication required",
  "code": "UNAUTHORIZED"
}
```

**Response (403 Forbidden):**
```json
{
  "error": "You don't have permission to access this note",
  "code": "FORBIDDEN"
}
```

---

#### Create Note

- **Method:** `POST`
- **Path:** `/api/notes`
- **Description:** Create a new travel note
- **Authentication:** Required (Supabase session)

**Request Body:**
```json
{
  "destination": "Barcelona, Spain",
  "start_date": "2025-12-01",
  "end_date": "2025-12-07",
  "total_budget": 1000.00,
  "additional_notes": "Want to see Sagrada Familia and Gothic Quarter"
}
```

**Validation Rules:**
- `destination`: Required string, max 255 characters
- `start_date`: Required date (ISO 8601 format)
- `end_date`: Required date (ISO 8601 format)
- `end_date` must be >= `start_date`
- Trip duration (`end_date` - `start_date`) must be <= 14 days
- `total_budget`: Optional numeric, must be > 0 if provided
- `additional_notes`: Optional string, recommended max ~10,000 characters

**Response (201 Created):**
```json
{
  "id": "uuid",
  "destination": "Barcelona, Spain",
  "start_date": "2025-12-01",
  "end_date": "2025-12-07",
  "total_budget": 1000.00,
  "additional_notes": "Want to see Sagrada Familia and Gothic Quarter",
  "created_at": "2025-10-11T10:30:00Z",
  "updated_at": "2025-10-11T10:30:00Z"
}
```

**Response (400 Bad Request):**
```json
{
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": {
    "destination": "Destination is required",
    "end_date": "End date must be after or equal to start date",
    "duration": "Trip duration cannot exceed 14 days"
  }
}
```

**Response (401 Unauthorized):**
```json
{
  "error": "Authentication required",
  "code": "UNAUTHORIZED"
}
```

---

#### Update Note

- **Method:** `PUT`
- **Path:** `/api/notes/:id`
- **Description:** Update an existing note
- **Authentication:** Required (Supabase session)

**Request Body:**
```json
{
  "destination": "Barcelona, Spain",
  "start_date": "2025-12-01",
  "end_date": "2025-12-08",
  "total_budget": 1200.00,
  "additional_notes": "Want to see Sagrada Familia, Gothic Quarter, and Park Güell"
}
```

**Validation Rules:** Same as Create Note

**Response (200 OK):**
```json
{
  "id": "uuid",
  "destination": "Barcelona, Spain",
  "start_date": "2025-12-01",
  "end_date": "2025-12-08",
  "total_budget": 1200.00,
  "additional_notes": "Want to see Sagrada Familia, Gothic Quarter, and Park Güell",
  "created_at": "2025-10-11T10:30:00Z",
  "updated_at": "2025-10-11T11:00:00Z"
}
```

**Response (400 Bad Request):**
```json
{
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": {
    "end_date": "End date must be after or equal to start date"
  }
}
```

**Response (404 Not Found):**
```json
{
  "error": "Note not found",
  "code": "NOTE_NOT_FOUND"
}
```

**Response (401 Unauthorized):**
```json
{
  "error": "Authentication required",
  "code": "UNAUTHORIZED"
}
```

**Response (403 Forbidden):**
```json
{
  "error": "You don't have permission to modify this note",
  "code": "FORBIDDEN"
}
```

---

#### Delete Note

- **Method:** `DELETE`
- **Path:** `/api/notes/:id`
- **Description:** Delete a note and all associated plans (cascade)
- **Authentication:** Required (Supabase session)

**Response (204 No Content):**
No response body

**Response (404 Not Found):**
```json
{
  "error": "Note not found",
  "code": "NOTE_NOT_FOUND"
}
```

**Response (401 Unauthorized):**
```json
{
  "error": "Authentication required",
  "code": "UNAUTHORIZED"
}
```

**Response (403 Forbidden):**
```json
{
  "error": "You don't have permission to delete this note",
  "code": "FORBIDDEN"
}
```

---

### 2.3 Plan Generation and Management

#### Generate Plan

- **Method:** `POST`
- **Path:** `/api/notes/:noteId/generate-plan`
- **Description:** Generate a new AI travel plan for a note using user's profile preferences
- **Authentication:** Required (Supabase session)
- **Rate Limit:** 5 generations per user per month

**Request Body:**
```json
{}
```
Note: All data comes from the note and user's profile. No additional input needed.

**Response (201 Created):**
```json
{
  "id": "uuid",
  "note_id": "uuid",
  "content": "# Barcelona 7-Day Itinerary\n\n## Day 1: Arrival...",
  "prompt_version": "v1",
  "created_at": "2025-10-11T11:00:00Z",
  "remaining_generations": 4,
  "generation_limit_reset_at": "2025-11-11T00:00:00Z"
}
```

**Response (400 Bad Request - Incomplete Profile):**
```json
{
  "error": "Profile is incomplete. Please complete your profile before generating plans.",
  "code": "INCOMPLETE_PROFILE",
  "required_fields": ["travel_style", "daily_budget", "interests"]
}
```

**Response (404 Not Found):**
```json
{
  "error": "Note not found",
  "code": "NOTE_NOT_FOUND"
}
```

**Response (429 Too Many Requests):**
```json
{
  "error": "Monthly generation limit reached",
  "code": "GENERATION_LIMIT_EXCEEDED",
  "limit": 5,
  "reset_at": "2025-11-11T00:00:00Z"
}
```

**Response (500 Internal Server Error - AI Failure):**
```json
{
  "error": "Failed to generate plan",
  "code": "AI_GENERATION_FAILED",
  "message": "The AI service is temporarily unavailable. Please try again later."
}
```

**Response (401 Unauthorized):**
```json
{
  "error": "Authentication required",
  "code": "UNAUTHORIZED"
}
```

**Response (403 Forbidden):**
```json
{
  "error": "You don't have permission to generate plans for this note",
  "code": "FORBIDDEN"
}
```

---

#### Get Plan History for Note

- **Method:** `GET`
- **Path:** `/api/notes/:noteId/plans`
- **Description:** Get all plans generated for a specific note, ordered by creation date (newest first)
- **Authentication:** Required (Supabase session)

**Response (200 OK):**
```json
{
  "plans": [
    {
      "id": "uuid",
      "note_id": "uuid",
      "content": "# Barcelona 7-Day Itinerary\n\n## Day 1...",
      "prompt_version": "v1",
      "feedback": 1,
      "created_at": "2025-10-11T11:00:00Z"
    },
    {
      "id": "uuid",
      "note_id": "uuid",
      "content": "# Barcelona 7-Day Itinerary (v2)\n\n## Day 1...",
      "prompt_version": "v1",
      "feedback": null,
      "created_at": "2025-10-10T15:30:00Z"
    }
  ],
  "total": 2
}
```

**Response (404 Not Found):**
```json
{
  "error": "Note not found",
  "code": "NOTE_NOT_FOUND"
}
```

**Response (401 Unauthorized):**
```json
{
  "error": "Authentication required",
  "code": "UNAUTHORIZED"
}
```

**Response (403 Forbidden):**
```json
{
  "error": "You don't have permission to access plans for this note",
  "code": "FORBIDDEN"
}
```

---

#### Get Specific Plan

- **Method:** `GET`
- **Path:** `/api/plans/:id`
- **Description:** Retrieve a specific plan with nested note details
- **Authentication:** Required (Supabase session)

**Response (200 OK):**
```json
{
  "id": "uuid",
  "note_id": "uuid",
  "content": "# Barcelona 7-Day Itinerary\n\n## Day 1: Arrival and Gothic Quarter...",
  "prompt_version": "v1",
  "feedback": 1,
  "created_at": "2025-10-11T11:00:00Z",
  "note": {
    "destination": "Barcelona, Spain",
    "start_date": "2025-12-01",
    "end_date": "2025-12-07"
  }
}
```

**Response (400 Bad Request):**
```json
{
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": {
    "id": "Invalid UUID format"
  }
}
```

**Response (401 Unauthorized):**
```json
{
  "error": "Authentication required",
  "code": "UNAUTHORIZED"
}
```

**Response (403 Forbidden):**
```json
{
  "error": "You don't have permission to access this plan",
  "code": "FORBIDDEN"
}
```

**Response (404 Not Found):**
```json
{
  "error": "Plan not found",
  "code": "PLAN_NOT_FOUND"
}
```

> Authentication fallback: For the MVP, this endpoint uses a default test user when no Supabase session exists, so 401 responses are disabled for now.

#### Submit Plan Feedback

- **Method:** `POST`
- **Path:** `/api/plans/:id/feedback`
- **Description:** Submit feedback (thumbs up/down) for a plan
- **Authentication:** Required (Supabase session)

**Request Body:**
```json
{
  "feedback": 1
}
```

**Validation Rules:**
- `feedback`: Required, must be either `1` (👍) or `-1` (👎)

**Response (200 OK):**
```json
{
  "id": "uuid",
  "feedback": 1,
  "message": "Feedback recorded successfully"
}
```

**Response (400 Bad Request):**
```json
{
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": {
    "feedback": "Must be either 1 or -1"
  }
}
```

**Response (404 Not Found):**
```json
{
  "error": "Plan not found",
  "code": "PLAN_NOT_FOUND"
}
```

> Authentication fallback: For the MVP, this endpoint uses a default test user when no Supabase session exists, so 401 responses are disabled for now.

**Response (403 Forbidden):**
```json
{
  "error": "You don't have permission to provide feedback for this plan",
  "code": "FORBIDDEN"
}
```

---

## 3. Authentication and Authorization

### Authentication Mechanism

**Provider:** Supabase Auth

**Implementation:**
- All authentication operations (sign up, sign in, sign out, password reset) are handled directly by Supabase Auth SDK on the client side
- Session tokens are stored in HTTP-only cookies by Supabase
- API endpoints validate session tokens using Supabase middleware

**Session Management:**
- Sessions are managed automatically by Supabase Auth
- JWT tokens contain user ID and metadata
- Tokens are validated on each API request via Astro middleware

### Authorization Strategy

**Per-Resource Authorization:**

1. **Profile Resource:**
   - Users can only access and modify their own profile
   - Profile ID is derived from authenticated user's session
   - No cross-user profile access allowed

2. **Notes Resource:**
   - Users can only access notes they created
   - Authorization check: `note.user_id === session.user.id`
   - Applied on all GET, PUT, DELETE operations

3. **Plans Resource:**
   - Users can only access plans for notes they own
   - Authorization check via JOIN: `plans.note_id -> notes.user_id === session.user.id`
   - Applied on all plan access operations

4. **Generation Logs:**
   - Not exposed via API (admin/analytics only)
   - Stored for monitoring and debugging purposes

**Middleware Implementation:**
- Astro middleware extracts and validates Supabase session from cookies
- Session object with user ID is attached to `context.locals.supabase` and `context.locals.user`
- All protected endpoints verify session exists before processing
- Resource ownership is verified at the database query level using user ID from session

**Error Responses:**
- `401 Unauthorized`: No valid session token provided
- `403 Forbidden`: Valid session but user doesn't own the resource

---

## 4. Validation and Business Logic

### 4.1 Profile Validation

**Field-Level Validation:**
- `interests`: Array of strings (optional)
- `other_interests`: String, max ~10,000 characters (optional)
- `daily_budget`: Numeric(10,2), must be > 0 (optional)
- `travel_style`: Enum, required, must be one of: `budget`, `backpacking`, `comfort`, `luxury`, `adventure`, `cultural`, `relaxation`, `family`, `solo`
- `typical_trip_duration`: Integer, must be > 0 (optional)

**Business Logic:**
- **Profile Completeness:** Calculated as: `travel_style IS NOT NULL AND daily_budget IS NOT NULL AND (interests.length > 0 OR other_interests IS NOT NULL)`
- Returned as `is_complete` boolean in API responses
- Used to block plan generation if profile is incomplete

---

### 4.2 Note Validation

**Field-Level Validation:**
- `destination`: Required, string, max 255 characters
- `start_date`: Required, valid ISO 8601 date
- `end_date`: Required, valid ISO 8601 date
- `total_budget`: Numeric(10,2), must be > 0 (optional)
- `additional_notes`: String, max ~10,000 characters (optional)

**Cross-Field Validation:**
- `end_date` must be >= `start_date`
- Trip duration (`end_date - start_date`) must be <= 14 days

**Business Logic:**
- Dates are stored as DATE type (no time component)
- Duration is calculated in days
- Frontend should pre-validate these constraints for better UX

---

### 4.3 Plan Generation Logic

**Pre-Generation Checks:**

1. **Profile Completeness:**
   - Query user's profile
   - Verify `is_complete === true`
   - Return 400 error if incomplete with list of missing required fields

2. **Generation Limit:**
   - Check `profiles.generation_count < 5`
   - Check current date < `profiles.generation_limit_reset_at`
   - If reset date passed, reset `generation_count = 0` and set new `generation_limit_reset_at = next month`
   - Return 429 error if limit exceeded

3. **Note Ownership:**
   - Verify `notes.user_id === session.user.id`
   - Return 403 if not owned by user

**Generation Process:**

1. **Create Generation Log Entry:**
   - Insert into `generation_logs` with status = `in_progress`
   - Record `user_id`, `note_id`

2. **Construct AI Prompt:**
   - Fetch note data (destination, dates, budget, notes)
   - Fetch profile data (interests, other_interests, daily_budget, travel_style, typical_trip_duration)
   - Combine into structured prompt
   - Store full prompt text in log and plan

3. **Call AI Service (OpenRouter):**
   - Send prompt to AI model
   - Set timeout (e.g., 60 seconds)
   - Track token usage (prompt_tokens, completion_tokens)

4. **Handle AI Response:**
   - **Success:**
     - Insert plan into `plans` table with generated content
     - Update log: status = `success`, `plan_id`, token counts
     - Increment `profiles.generation_count`
     - Return plan to client

   - **Failure:**
     - Update log: status = `failed`, `error_message`, `error_code`
     - Return 500 error to client with user-friendly message
     - Do NOT increment generation_count

5. **Token Tracking:**
   - Store `prompt_tokens` and `completion_tokens` in generation log
   - Used for cost monitoring and analytics

**Error Codes:**
- `rate_limit`: AI service rate limit hit
- `timeout`: AI service timeout
- `invalid_response`: AI returned invalid/unparseable content
- `service_unavailable`: AI service down

---

### 4.4 Plan Feedback Logic

**Validation:**
- `feedback`: Must be integer 1 or -1
- Once set, can be updated (not immutable)
- Nullable (user can choose not to provide feedback)

**Business Logic:**
- Simple PATCH update to `plans.feedback` column
- No additional processing required in MVP
- Data collected for future analytics

---

### 4.5 Generation Limit Reset Logic

**Monthly Reset Mechanism:**

1. **Initial Setup:**
   - On profile creation, set `generation_limit_reset_at = (CURRENT_DATE + INTERVAL '1 month')::date`
   - Set `generation_count = 0`

2. **Reset Check:**
   - Before each generation attempt, check: `CURRENT_DATE >= generation_limit_reset_at`
   - If true:
     - Reset `generation_count = 0`
     - Set `generation_limit_reset_at = (CURRENT_DATE + INTERVAL '1 month')::date`

3. **Counter Increment:**
   - After successful generation, increment: `generation_count = generation_count + 1`
   - Use atomic UPDATE to prevent race conditions

**Implementation Note:**
- This logic should be in a database transaction to ensure atomicity
- Consider using a database function/trigger for reset automation

---

## 5. Additional Considerations

### 5.1 Pagination

- List endpoints support `limit` and `offset` query parameters
- Default limit: 50
- Maximum limit: 100
- Response includes pagination metadata:
  ```json
  {
    "pagination": {
      "total": 150,
      "limit": 50,
      "offset": 0
    }
  }
  ```

### 5.2 Sorting

- Notes list supports `sort` parameter: `field:direction`
- Default: `created_at:desc`
- Supported fields: `created_at`, `start_date`, `destination`
- Plans are always sorted by `created_at:desc` (newest first)

### 5.3 Error Response Format

All error responses follow a consistent structure:
```json
{
  "error": "Human-readable error message",
  "code": "MACHINE_READABLE_ERROR_CODE",
  "details": {}  // Optional additional details
}
```

### 5.4 Content Length Limits

- `additional_notes` (in notes): ~10,000 characters (validated in application)
- `content` (in plans): ~10,000 characters (validated in application)
- These are soft limits enforced by the API, not database constraints

### 5.5 Cost Disclaimer

- Plans should include a disclaimer that costs are estimates
- This is a frontend concern but should be mentioned in API documentation
- AI-generated costs are not guaranteed to be accurate

### 5.6 CORS Configuration

- API endpoints should be accessible from the same origin (Astro frontend)
- If frontend and API are on different domains, configure CORS appropriately

### 5.7 Rate Limiting

- Beyond the 5 generations/month limit, consider implementing general API rate limiting
- Suggested: 100 requests per minute per user for non-generation endpoints
- Use Supabase rate limiting features or implement middleware-based limiting

### 5.8 Logging and Monitoring

- All plan generation attempts are logged in `generation_logs`
- Consider logging failed API requests for debugging
- Monitor token usage for cost management
- Track feedback scores for quality assessment
