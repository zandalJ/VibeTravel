import type { APIRoute } from "astro";
import { PlanGenerationService } from "../../../../lib/services/plan-generation.service";
import { validateNoteId } from "../../../../lib/validators/plan-generation.validator";
import { createErrorResponse } from "../../../../lib/utils/error-mapper";

export const prerender = false;

/**
 * POST /api/notes/:noteId/generate-plan
 * Generates a new AI-powered travel plan for a specific note
 *
 * URL Parameters:
 * - noteId: UUID of the note to generate plan for
 *
 * Response: 201 Created with GeneratePlanResponseDTO
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

    // Step 3: Generate plan
    console.log("[generate-plan] Starting plan generation...");
    const result = await planGenerationService.generatePlan(validatedNoteId);
    console.log("[generate-plan] Plan generated successfully:", result.id);

    // Step 4: Return success response
    return new Response(JSON.stringify(result), {
      status: 201,
      headers: {
        "Content-Type": "application/json",
        Location: `/api/plans/${result.id}`,
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
