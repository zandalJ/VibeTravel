import type { APIRoute } from "astro";
import { NotesService } from "../../../lib/services/notes.service";
import { validateNoteId } from "../../../lib/validators/notes.validator";
import { createErrorResponse } from "../../../lib/utils/error-mapper";

export const prerender = false;

/**
 * Default user ID for development purposes (matches test user in migrations)
 * TODO: Enforce authentication in production
 */
const DEFAULT_USER_ID = "00000000-0000-0000-0000-000000000000";

/**
 * GET /api/notes/:id
 * Retrieves a specific note with authorization check
 *
 * URL Parameters:
 * - id: UUID of the note to retrieve
 *
 * Response: 200 OK with NoteDTO
 *
 * Error responses:
 * - 400 Bad Request: Invalid UUID format
 * - 403 Forbidden: User doesn't own the note
 * - 404 Not Found: Note doesn't exist
 * - 500 Internal Server Error: Database or unexpected errors
 *
 * NOTE: For MVP, falls back to DEFAULT_USER_ID when no auth session exists
 */
export const GET: APIRoute = async (context) => {
  try {
    // Step 1: Extract and validate noteId from URL params
    const { id } = context.params;
    console.log("[GET /api/notes/:id] Received noteId:", id);

    const validatedNoteId = validateNoteId(id);
    console.log("[GET /api/notes/:id] Validated noteId:", validatedNoteId);

    // Step 2: Authentication check - get current user (or use default for MVP)
    const {
      data: { user },
      error: authError,
    } = await context.locals.supabase.auth.getUser();

    // For MVP: Use DEFAULT_USER_ID when no auth session exists
    const userId = user?.id || DEFAULT_USER_ID;

    if (authError) {
      console.warn("[GET /api/notes/:id] Auth error (using DEFAULT_USER_ID):", authError.message);
    }

    console.log("[GET /api/notes/:id] Using user ID:", userId);

    // Step 3: Initialize notes service
    const notesService = new NotesService(context.locals.supabase);

    // Step 4: Retrieve note with authorization check
    console.log("[GET /api/notes/:id] Fetching note...");
    const note = await notesService.getNoteById(validatedNoteId, userId);
    console.log("[GET /api/notes/:id] Note retrieved successfully:", note.id);

    // Step 5: Return success response
    return new Response(JSON.stringify(note), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    // Step 6: Handle all errors with error mapper
    console.error("[GET /api/notes/:id] Error occurred:", error);

    if (error instanceof Error) {
      console.error("[GET /api/notes/:id] Error stack:", error.stack);
    }

    return createErrorResponse(error);
  }
};
