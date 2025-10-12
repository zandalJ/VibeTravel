# API Endpoint Implementation Plan: Generate Travel Plan

## 1. Endpoint Overview

This endpoint generates an AI-powered travel plan for a specific note using the user's profile preferences. The endpoint leverages OpenRouter.ai to access various AI models and creates a personalized itinerary based on:
- User's travel preferences (travel style, daily budget, interests)
- Trip details from the note (destination, dates, budget, additional notes)

The endpoint is rate-limited to 5 generations per user per month and requires a complete user profile before generation.

**Key Characteristics:**
- Stateless operation (no request body needed)
- Heavy I/O operation (database + external AI API call)
- Requires transaction management for data consistency
- Comprehensive error logging for debugging and analytics

## 2. Request Details

- **HTTP Method:** `POST`
- **URL Structure:** `/api/notes/:noteId/generate-plan`
- **Parameters:**
  - **Required:**
    - `noteId` (path parameter) - UUID of the note to generate plan for
  - **Optional:** None
- **Request Body:** Empty object `{}`
- **Authentication:** Required (Supabase session via middleware)
- **Content-Type:** `application/json`

**Example Request:**
```bash
POST /api/notes/550e8400-e29b-41d4-a716-446655440000/generate-plan
Authorization: Bearer <supabase-session-token>
Content-Type: application/json

{}
```

## 3. Types Used

### Existing Types (from src/types.ts)

**Response Types:**
- `GeneratePlanResponseDTO` - Success response (201)
- `IncompleteProfileErrorDTO` - Profile incomplete error (400)
- `GenerationLimitErrorDTO` - Rate limit exceeded error (429)
- `AIGenerationErrorDTO` - AI generation failure (500)
- `ErrorResponseDTO` - Generic error response
- `ValidationErrorResponseDTO` - Validation error (400)

**Database Types:**
- `Note` - Note entity from database
- `Profile` - Profile entity from database
- `Plan` - Plan entity to create
- `GenerationLog` - Log entity for tracking attempts

**Internal Service Types (to be defined in service):**
```typescript
interface GenerationContext {
  userId: string;
  noteId: string;
  note: Note;
  profile: Profile;
}

interface AIPromptData {
  destination: string;
  startDate: string;
  endDate: string;
  totalBudget: number | null;
  dailyBudget: number | null;
  travelStyle: string;
  interests: string[];
  otherInterests: string | null;
  additionalNotes: string | null;
}

interface AIResponse {
  content: string;
  promptTokens: number;
  completionTokens: number;
}
```

## 4. Response Details

### Success Response (201 Created)
```typescript
{
  id: string;                           // UUID of created plan
  note_id: string;                      // UUID of associated note
  content: string;                      // AI-generated itinerary (Markdown)
  prompt_version: string;               // Version identifier (e.g., "v1")
  created_at: string;                   // ISO 8601 timestamp
  remaining_generations: number;        // How many generations left (0-5)
  generation_limit_reset_at: string;    // When limit resets (ISO 8601)
}
```

### Error Responses

**400 Bad Request - Validation Error:**
```typescript
{
  error: string;
  code: "VALIDATION_ERROR";
  details: { noteId: "Invalid UUID format" }
}
```

**400 Bad Request - Incomplete Profile:**
```typescript
{
  error: "Profile is incomplete. Please complete your profile before generating plans.";
  code: "INCOMPLETE_PROFILE";
  required_fields: string[];  // e.g., ["travel_style", "daily_budget", "interests"]
}
```

**401 Unauthorized:**
```typescript
{
  error: "Authentication required";
  code: "UNAUTHORIZED";
}
```

**403 Forbidden:**
```typescript
{
  error: "You don't have permission to generate plans for this note";
  code: "FORBIDDEN";
}
```

**404 Not Found:**
```typescript
{
  error: "Note not found";
  code: "NOTE_NOT_FOUND";
}
```

**429 Too Many Requests:**
```typescript
{
  error: "Monthly generation limit reached";
  code: "GENERATION_LIMIT_EXCEEDED";
  limit: 5;
  reset_at: string;  // ISO 8601 timestamp
}
```

**500 Internal Server Error:**
```typescript
{
  error: "Failed to generate plan";
  code: "AI_GENERATION_FAILED";
  message: string;  // User-friendly explanation
}
```

## 5. Data Flow

### High-Level Flow
```
1. Request → Astro API Route Handler
2. Middleware → Authentication Check
3. Validation → Zod Schema (noteId format)
4. Service Layer → PlanGenerationService
   ├─ Fetch & Authorize Note
   ├─ Fetch & Validate Profile Completeness
   ├─ Check Generation Limit
   ├─ Create Generation Log (in_progress)
   ├─ Build AI Prompt
   ├─ Call OpenRouter API
   ├─ Parse & Validate AI Response
   ├─ Create Plan Record (transaction)
   ├─ Increment Generation Count (transaction)
   └─ Update Generation Log (success/failed)
5. Response → JSON with GeneratePlanResponseDTO
```

### Detailed Service Flow

**Step 1: Fetch and Authorize Note**
```typescript
const note = await supabase
  .from('notes')
  .select('*')
  .eq('id', noteId)
  .eq('user_id', userId)
  .single();

if (!note.data) {
  throw new NotFoundError('NOTE_NOT_FOUND');
}
```

**Step 2: Fetch and Validate Profile**
```typescript
const profile = await supabase
  .from('profiles')
  .select('*')
  .eq('id', userId)
  .single();

const isComplete =
  profile.travel_style &&
  profile.daily_budget &&
  (profile.interests.length > 0 || profile.other_interests);

if (!isComplete) {
  throw new IncompleteProfileError(getMissingFields(profile));
}
```

**Step 3: Check Generation Limit**
```typescript
const now = new Date();
const resetDate = new Date(profile.generation_limit_reset_at);

// Reset counter if past reset date
if (now >= resetDate) {
  await resetGenerationLimit(userId);
  profile.generation_count = 0;
}

if (profile.generation_count >= 5) {
  throw new GenerationLimitError(5, profile.generation_limit_reset_at);
}
```

**Step 4: Create Generation Log**
```typescript
const log = await supabase
  .from('generation_logs')
  .insert({
    user_id: userId,
    note_id: noteId,
    status: 'in_progress'
  })
  .select()
  .single();
```

**Step 5: Build and Send AI Prompt**
```typescript
const prompt = buildPrompt({
  destination: note.destination,
  startDate: note.start_date,
  endDate: note.end_date,
  totalBudget: note.total_budget,
  dailyBudget: profile.daily_budget,
  travelStyle: profile.travel_style,
  interests: profile.interests,
  otherInterests: profile.other_interests,
  additionalNotes: note.additional_notes
});

const aiResponse = await openRouterClient.generatePlan(prompt);
```

**Step 6: Create Plan and Update Counters (Transaction)**
```typescript
// Use Supabase RPC or handle as transaction
const plan = await supabase
  .from('plans')
  .insert({
    note_id: noteId,
    prompt_text: prompt,
    prompt_version: 'v1',
    content: aiResponse.content
  })
  .select()
  .single();

await supabase
  .from('profiles')
  .update({
    generation_count: profile.generation_count + 1
  })
  .eq('id', userId);
```

**Step 7: Update Generation Log**
```typescript
await supabase
  .from('generation_logs')
  .update({
    status: 'success',
    plan_id: plan.data.id,
    prompt_tokens: aiResponse.promptTokens,
    completion_tokens: aiResponse.completionTokens
  })
  .eq('id', log.data.id);
```

### External Service Interactions

**OpenRouter.ai Integration:**
- Endpoint: `https://openrouter.ai/api/v1/chat/completions`
- Authentication: `Authorization: Bearer ${OPENROUTER_API_KEY}`
- Request timeout: 60 seconds
- Retry logic: 1 retry on timeout/network error
- Response validation: Check for required fields and valid markdown

## 6. Security Considerations

### Authentication & Authorization
- **Session Validation**: Verified by Astro middleware (context.locals.supabase)
- **User ID Extraction**: From authenticated session
- **Note Ownership**: Verify `note.user_id === authenticated_user_id`
- **Profile Access**: Users can only access their own profiles

### Input Validation
- **noteId Format**: Must be valid UUID (Zod validation)
- **SQL Injection**: Protected by Supabase query builder (parameterized queries)
- **XSS Prevention**: Sanitize user input before AI prompt construction

### Rate Limiting
- **Application Level**: 5 generations per month per user
- **Database Enforcement**: Check `generation_count` before processing
- **Reset Mechanism**: Automatic reset based on `generation_limit_reset_at`
- **Atomic Operations**: Use transactions to prevent race conditions

### API Key Security
- **Environment Variables**: Store OpenRouter API key in `.env`
- **Key Rotation**: Support key updates without code changes
- **Error Masking**: Never expose API keys in error messages or logs

### AI Prompt Security
- **Input Sanitization**: Remove potentially harmful characters/commands
- **Prompt Injection Prevention**: Use structured prompt format
- **Response Validation**: Verify AI output doesn't contain sensitive data
- **Content Length Limits**:
  - Max prompt size: ~8000 characters
  - Max response size: ~10,000 characters (app validation)

### Data Privacy
- **User Data**: Only send necessary data to AI (no emails, IDs, etc.)
- **Logging**: Log errors but exclude sensitive user information
- **Retention**: Consider implementing data retention policies for generation_logs

## 7. Error Handling

### Error Classification and Responses

| Error Type | Status | Error Code | Action | Log Status |
|------------|--------|------------|--------|------------|
| **Validation Errors** |
| Invalid UUID format | 400 | VALIDATION_ERROR | Return field errors | Don't create log |
| Empty noteId | 400 | VALIDATION_ERROR | Return validation error | Don't create log |
| **Authentication Errors** |
| No session | 401 | UNAUTHORIZED | Reject with auth error | Don't create log |
| Invalid token | 401 | UNAUTHORIZED | Reject with auth error | Don't create log |
| **Authorization Errors** |
| Note belongs to other user | 403 | FORBIDDEN | Reject with permission error | Don't create log |
| **Resource Errors** |
| Note not found | 404 | NOTE_NOT_FOUND | Return not found | Don't create log |
| Profile not found | 500 | INTERNAL_ERROR | Return server error | Create failed log |
| **Business Logic Errors** |
| Incomplete profile | 400 | INCOMPLETE_PROFILE | Return required fields | Don't create log |
| Generation limit exceeded | 429 | GENERATION_LIMIT_EXCEEDED | Return limit & reset date | Create failed log with 'rate_limit' code |
| **External Service Errors** |
| AI API timeout | 500 | AI_GENERATION_FAILED | User-friendly message | Create failed log with 'ai_timeout' code |
| AI API error | 500 | AI_GENERATION_FAILED | User-friendly message | Create failed log with 'ai_error' code |
| Invalid AI response | 500 | AI_GENERATION_FAILED | User-friendly message | Create failed log with 'invalid_response' code |
| **Database Errors** |
| Connection failure | 500 | INTERNAL_ERROR | Generic error message | Create failed log if possible |
| Query timeout | 500 | INTERNAL_ERROR | Generic error message | Create failed log if possible |
| Constraint violation | 500 | INTERNAL_ERROR | Generic error message | Create failed log |

### Error Logging Strategy

**Generation Log States:**
1. `in_progress` - Created at request start
2. `success` - Updated on successful plan creation
3. `failed` - Updated on any error after log creation

**What to Log:**
- User ID and Note ID (always)
- Error message (detailed for debugging)
- Error code (categorized for analytics)
- Timestamp (automatic via created_at)
- Token usage (on success)
- Plan ID (on success)

**What NOT to Log:**
- API keys or tokens
- Full user input (only references)
- Sensitive profile data

### Error Recovery

**Idempotency Considerations:**
- No automatic retry on client side
- Generation count only incremented on success
- Failed attempts don't count toward monthly limit
- Users can retry failed generations

**Cleanup on Failure:**
- Generation log remains with failed status (for analytics)
- No orphaned plan records (only created on success)
- No increment of generation counter on failure

## 8. Performance Considerations

### Bottlenecks

1. **External AI API Call** (Highest Impact)
   - Expected latency: 5-30 seconds
   - Can timeout or be slow during peak hours
   - Blocking operation

2. **Database Operations**
   - Multiple sequential queries (note, profile, log creation)
   - Transaction for plan creation + counter increment
   - Expected latency: 100-500ms total

3. **Prompt Construction**
   - String concatenation and formatting
   - Minimal impact (<10ms)

### Optimization Strategies

**Short-term (MVP):**
- ✅ Use database indexes on foreign keys (note_id, user_id)
- ✅ Set appropriate timeout for AI API (60s)
- ✅ Return response immediately after plan creation (don't wait for analytics)
- ✅ Use connection pooling for database (Supabase default)

**Future Optimizations:**
- 🔄 Implement async job queue for AI generation (return 202 Accepted immediately)
- 🔄 Add caching layer for frequently accessed profiles
- 🔄 Implement plan generation webhooks for real-time updates
- 🔄 Add Redis for rate limit checking (faster than DB query)
- 🔄 Batch generation log updates
- 🔄 Add response streaming for long AI responses

### Scalability Considerations

**Current Limits:**
- 5 generations per user per month = low load
- Expected concurrent requests: <10 during MVP
- Supabase free tier: 500MB database, 2GB bandwidth

**Scaling Triggers:**
- If average response time > 45 seconds → Implement job queue
- If database queries > 1000/min → Add caching layer
- If AI costs > $50/month → Implement prompt optimization

### Monitoring Metrics

**Key Performance Indicators:**
- AI API response time (p50, p95, p99)
- Total endpoint response time
- Error rate by type
- Generation success rate
- Monthly generation usage per user
- Token usage and costs

## 9. Implementation Steps

### Phase 1: Setup and Dependencies

**Step 1.1: Create OpenRouter Service**
- File: `src/lib/services/openrouter.service.ts`
- Responsibilities:
  - HTTP client setup with timeout
  - API authentication
  - Request/response formatting
  - Error handling and retry logic
  - Token counting

**Step 1.2: Create Prompt Builder Utility**
- File: `src/lib/utils/prompt-builder.ts`
- Responsibilities:
  - Construct AI prompt from profile + note data
  - Input sanitization
  - Template management (versioning)
  - Character limit validation

**Step 1.3: Add Environment Variables**
- Add to `.env`:
  ```
  OPENROUTER_API_KEY=your_api_key_here
  OPENROUTER_MODEL=anthropic/claude-3.5-sonnet
  OPENROUTER_TIMEOUT=60000
  ```

### Phase 2: Core Service Implementation

**Step 2.1: Create Plan Generation Service**
- File: `src/lib/services/plan-generation.service.ts`
- Functions to implement:
  ```typescript
  // Main orchestration function
  async function generatePlan(
    noteId: string,
    userId: string,
    supabase: SupabaseClient
  ): Promise<GeneratePlanResponseDTO>

  // Helper functions
  async function fetchAndAuthorizeNote(...)
  async function fetchAndValidateProfile(...)
  async function checkGenerationLimit(...)
  async function resetGenerationLimitIfNeeded(...)
  async function createGenerationLog(...)
  async function updateGenerationLog(...)
  async function createPlanRecord(...)
  async function incrementGenerationCount(...)
  function buildPromptData(...)
  function validateProfileCompleteness(...)
  function getMissingFields(...)
  ```

**Step 2.2: Implement Error Classes**
- File: `src/lib/errors/plan-generation.errors.ts`
- Custom errors:
  ```typescript
  class NotFoundError extends Error
  class ForbiddenError extends Error
  class IncompleteProfileError extends Error
  class GenerationLimitError extends Error
  class AIGenerationError extends Error
  ```

### Phase 3: API Route Implementation

**Step 3.1: Create API Route File**
- File: `src/pages/api/notes/[noteId]/generate-plan.ts`
- Export: `export const prerender = false`

**Step 3.2: Implement POST Handler**
```typescript
export async function POST({ params, locals }: APIContext) {
  // 1. Extract and validate noteId
  // 2. Check authentication (locals.supabase)
  // 3. Get user ID from session
  // 4. Call service layer
  // 5. Handle errors with proper status codes
  // 6. Return response
}
```

**Step 3.3: Add Zod Validation Schema**
```typescript
const generatePlanParamsSchema = z.object({
  noteId: z.string().uuid("Invalid note ID format")
});
```

**Step 3.4: Implement Error Response Mapping**
```typescript
function mapErrorToResponse(error: Error): Response {
  // Map custom errors to HTTP responses
  // Return appropriate status codes and error DTOs
}
```

### Phase 4: Testing

**Step 4.1: Unit Tests**
- Test prompt builder with various input combinations
- Test OpenRouter service with mocked responses
- Test service layer functions individually
- Test error handling paths

**Step 4.2: Integration Tests**
- Test full endpoint with valid data
- Test authentication failures
- Test authorization failures (wrong user)
- Test incomplete profile scenario
- Test generation limit enforcement
- Test AI API failures

**Step 4.3: Manual Testing Checklist**
- [ ] Successful plan generation
- [ ] Generation with minimal profile data
- [ ] Generation limit reaches 5
- [ ] Generation limit resets after month
- [ ] Invalid noteId format
- [ ] Non-existent note
- [ ] Note belongs to different user
- [ ] Incomplete profile with each missing field
- [ ] AI API timeout handling
- [ ] AI API error handling
- [ ] Database connection failure

### Phase 5: Documentation and Deployment

**Step 5.1: API Documentation**
- Update API documentation with examples
- Document rate limits clearly
- Add troubleshooting section

**Step 5.2: Environment Setup**
- Add OpenRouter API key to production environment
- Configure timeout values
- Set up monitoring and alerting

**Step 5.3: Database Verification**
- Verify indexes exist on foreign keys
- Test generation_logs insertion performance
- Verify cascade deletes work correctly

**Step 5.4: Deployment Checklist**
- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] API endpoint responds to health check
- [ ] Monitoring dashboards created
- [ ] Error tracking configured (e.g., Sentry)
- [ ] Rate limit testing in production
- [ ] Load testing completed

### Phase 6: Post-Deployment

**Step 6.1: Monitor Key Metrics**
- AI API response times
- Error rates
- Generation success rate
- User feedback on generated plans

**Step 6.2: Iterate Based on Feedback**
- Optimize prompt based on user feedback
- Adjust AI model if needed
- Fine-tune timeout values
- Improve error messages

## 10. Development Checklist

### Prerequisites
- [ ] Supabase project configured
- [ ] OpenRouter.ai account created
- [ ] API key obtained and secured
- [ ] Database schema matches db-plan.md
- [ ] Types in src/types.ts are up to date

### Implementation Checklist
- [ ] OpenRouter service created and tested
- [ ] Prompt builder utility implemented
- [ ] Custom error classes defined
- [ ] Plan generation service implemented
- [ ] API route handler created
- [ ] Input validation with Zod added
- [ ] Error handling and mapping complete
- [ ] Generation logging implemented
- [ ] Rate limiting logic added
- [ ] Profile completeness validation working

### Testing Checklist
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing scenarios completed
- [ ] Performance testing done
- [ ] Security review completed

### Deployment Checklist
- [ ] Environment variables set
- [ ] Documentation updated
- [ ] Monitoring configured
- [ ] Error tracking enabled
- [ ] Production deployment successful
- [ ] Smoke tests pass in production

## 11. Risk Mitigation

### High-Risk Areas

**AI API Dependency:**
- **Risk**: Service unavailability or slow responses
- **Mitigation**:
  - Implement timeout (60s)
  - Return user-friendly error messages
  - Log failures for monitoring
  - Consider fallback model in future

**Rate Limit Race Conditions:**
- **Risk**: Multiple concurrent requests increment counter incorrectly
- **Mitigation**:
  - Use database transactions
  - Consider row-level locking for profile updates
  - Add unique constraint on generation_logs per timestamp

**Cost Overruns:**
- **Risk**: AI API costs exceed budget
- **Mitigation**:
  - Enforce monthly user limit (5 generations)
  - Monitor token usage in generation_logs
  - Set spending limits on OpenRouter dashboard
  - Implement prompt optimization

**Data Quality:**
- **Risk**: AI returns invalid or harmful content
- **Mitigation**:
  - Validate response structure
  - Implement content filtering
  - Add user feedback mechanism (thumbs up/down)
  - Review generated plans periodically

## 12. Future Enhancements

**Short-term (Next Sprint):**
- Add generation history page for users
- Implement plan editing/refinement
- Add email notifications when plan is ready

**Medium-term (Next Quarter):**
- Async job queue for generation (non-blocking)
- WebSocket updates for real-time progress
- Multiple AI model support with user selection
- Plan templates and customization options

**Long-term (Future):**
- Collaborative trip planning
- Integration with booking APIs
- Mobile app support
- Social sharing features
- Advanced analytics dashboard
