import type { APIRoute } from "astro";
import { PlansService } from "../../../../lib/services/plans.service";
import { validateNoteId } from "../../../../lib/validators/notes.validator";
import { createErrorResponse } from "../../../../lib/utils/error-mapper";

export const prerender = false;

/**
 * Default user ID for development purposes (matches test user in migrations)
 * TODO: Remove fallback and enforce authentication in production
 */
const DEFAULT_USER_ID = "00000000-0000-0000-0000-000000000000";

/**
 * GET /api/notes/:noteId/plans
 * Retrieves all plans for a specific note, ordered by creation date (newest first)
 *
 * URL Parameters:
 * - noteId: UUID of the note to fetch plans for
 *
 * Response: 200 OK with PlansListResponseDTO
 *
 * Error responses:
 * - 400 Bad Request: Invalid UUID format
 * - 401 Unauthorized: No authentication session (production only)
 * - 403 Forbidden: User doesn't own the note
 * - 404 Not Found: Note doesn't exist
 * - 500 Internal Server Error: Database or unexpected errors
 *
 * NOTE: For MVP, falls back to DEFAULT_USER_ID when no auth session exists
 */
export const GET: APIRoute = async (context) => {
  try {
    // Step 1: Extract and validate noteId from URL params
    const { noteId } = context.params;
    // eslint-disable-next-line no-console
    console.log("[GET /api/notes/:noteId/plans] Received noteId:", noteId);

    const validatedNoteId = validateNoteId(noteId);
    // eslint-disable-next-line no-console
    console.log("[GET /api/notes/:noteId/plans] Validated noteId:", validatedNoteId);

    // Step 2: Authentication check - get current user (or use default for MVP)
    const userId = context.locals.user?.id || DEFAULT_USER_ID;

    // eslint-disable-next-line no-console
    console.log("[GET /api/notes/:noteId/plans] Using user ID:", userId);

    // Step 3: Initialize plans service
    const plansService = new PlansService(context.locals.supabase);

    // Step 4: Retrieve plans with authorization check
    // eslint-disable-next-line no-console
    console.log("[GET /api/notes/:noteId/plans] Fetching plans...");
    const result = await plansService.getPlansByNoteId(validatedNoteId, userId);
    // eslint-disable-next-line no-console
    console.log("[GET /api/notes/:noteId/plans] Plans retrieved successfully:", result.total, "plans");

    // Step 5: Return success response
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    // Step 6: Handle all errors with error mapper
    // eslint-disable-next-line no-console
    console.error("[GET /api/notes/:noteId/plans] Error occurred:", error);

    if (error instanceof Error) {
      // eslint-disable-next-line no-console
      console.error("[GET /api/notes/:noteId/plans] Error stack:", error.stack);
    }

    return createErrorResponse(error);
  }
};

/**
 * POST /api/notes/:noteId/plans
 * Creates a new plan from accepted preview (saves to database)
 *
 * URL Parameters:
 * - noteId: UUID of the note to create plan for
 *
 * Request Body:
 * - content: string - The generated plan content
 *
 * Response: 201 Created with PlanDTO
 *
 * Error responses:
 * - 400 Bad Request: Invalid UUID format or missing content
 * - 401 Unauthorized: No authentication session (production only)
 * - 403 Forbidden: User doesn't own the note
 * - 404 Not Found: Note doesn't exist
 * - 500 Internal Server Error: Database or unexpected errors
 *
 * NOTE: For MVP, falls back to DEFAULT_USER_ID when no auth session exists
 */
export const POST: APIRoute = async (context) => {
  try {
    // Step 1: Extract and validate noteId from URL params
    const { noteId } = context.params;
    console.log("[POST /api/notes/:noteId/plans] Received noteId:", noteId);

    const validatedNoteId = validateNoteId(noteId);
    console.log("[POST /api/notes/:noteId/plans] Validated noteId:", validatedNoteId);

    // Step 2: Parse request body
    const body = await context.request.json();
    const { content } = body;

    if (!content || typeof content !== "string") {
      return new Response(JSON.stringify({ error: "Missing or invalid content field" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    console.log("[POST /api/notes/:noteId/plans] Content length:", content.length);

    // Step 3: Authentication check - get current user (or use default for MVP)
    const userId = context.locals.user?.id || DEFAULT_USER_ID;

    console.log("[POST /api/notes/:noteId/plans] Using user ID:", userId);

    // Step 4: Initialize plans service
    const plansService = new PlansService(context.locals.supabase);

    // Step 5: Create plan with authorization check
    console.log("[POST /api/notes/:noteId/plans] Creating plan...");
    const plan = await plansService.createPlan(validatedNoteId, userId, content);
    console.log("[POST /api/notes/:noteId/plans] Plan created successfully:", plan.id);

    // Step 6: Return success response
    return new Response(JSON.stringify(plan), {
      status: 201,
      headers: {
        "Content-Type": "application/json",
        Location: `/api/plans/${plan.id}`,
      },
    });
  } catch (error) {
    // Step 7: Handle all errors with error mapper
    console.error("[POST /api/notes/:noteId/plans] Error occurred:", error);

    if (error instanceof Error) {
      console.error("[POST /api/notes/:noteId/plans] Error stack:", error.stack);
    }

    return createErrorResponse(error);
  }
};
