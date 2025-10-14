import type { APIRoute } from "astro";
import { PlanGenerationService } from "../../../../lib/services/plan-generation.service";
import { validateNoteId } from "../../../../lib/validators/plan-generation.validator";
import { createErrorResponse } from "../../../../lib/utils/error-mapper";

export const prerender = false;

/**
 * POST /api/notes/:noteId/generate-plan
 * Generates a new AI-powered travel plan preview (without saving to database)
 * User can then accept or reject the plan in the preview dialog
 *
 * URL Parameters:
 * - noteId: UUID of the note to generate plan for
 *
 * Response: 200 OK with plan preview data
 *
 * Error responses:
 * - 400 Bad Request: Invalid noteId format, incomplete profile, or validation errors
 * - 403 Forbidden: User doesn't own the note
 * - 404 Not Found: Note or profile not found
 * - 429 Too Many Requests: Generation limit exceeded
 * - 500 Internal Server Error: AI generation failed or unexpected errors
 */
export const POST: APIRoute = async (context) => {
  try {
    // Step 1: Extract and validate noteId from URL params
    const { noteId } = context.params;
    console.log("[generate-plan] Received noteId:", noteId);
    const validatedNoteId = validateNoteId(noteId);
    console.log("[generate-plan] Validated noteId:", validatedNoteId);

    // Step 2: Initialize plan generation service
    const planGenerationService = new PlanGenerationService(context.locals.supabase);
    console.log("[generate-plan] Service initialized");

    // Step 3: Generate plan preview (without saving)
    console.log("[generate-plan] Starting plan preview generation...");
    const result = await planGenerationService.generatePlanPreview(validatedNoteId);
    console.log("[generate-plan] Plan preview generated successfully");

    // Step 4: Return success response
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    // Step 5: Handle all errors with error mapper
    console.error("[generate-plan] Error occurred:", error);
    if (error instanceof Error) {
      console.error("[generate-plan] Error stack:", error.stack);
    }
    return createErrorResponse(error);
  }
};
