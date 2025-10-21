import type { APIRoute } from "astro";
import { NotesService } from "../../../lib/services/notes.service";
import { validateNoteId, updateNoteSchema } from "../../../lib/validators/notes.validator";
import { createErrorResponse } from "../../../lib/utils/error-mapper";
import type { UpdateNoteCommand } from "../../../types";

/**
 * Default user ID for development/testing without authentication.
 * TODO: Remove once Supabase auth is wired into routes.
 */
const DEFAULT_USER_ID = "00000000-0000-0000-0000-000000000000";

export const prerender = false;

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
 * NOTE: Falls back to DEFAULT_USER_ID when no auth session exists (testing only)
 */
export const GET: APIRoute = async (context) => {
  try {
    // Step 1: Extract and validate noteId from URL params
    const { id } = context.params;
    console.log("[GET /api/notes/:id] Received noteId:", id);

    const validatedNoteId = validateNoteId(id);
    console.log("[GET /api/notes/:id] Validated noteId:", validatedNoteId);

    // Step 2: Authentication check with fallback for local testing
    const userId = context.locals.user?.id || DEFAULT_USER_ID;

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

/**
 * PUT /api/notes/:id
 * Updates an existing note with authorization check
 *
 * URL Parameters:
 * - id: UUID of the note to update
 *
 * Request Body: UpdateNoteCommand
 *
 * Response: 200 OK with updated NoteDTO
 *
 * Error responses:
 * - 400 Bad Request: Invalid UUID format or validation errors
 * - 403 Forbidden: User doesn't own the note
 * - 404 Not Found: Note doesn't exist
 * - 500 Internal Server Error: Database or unexpected errors
 *
 * NOTE: Falls back to DEFAULT_USER_ID when no auth session exists (testing only)
 */
export const PUT: APIRoute = async (context) => {
  try {
    // Step 1: Extract and validate noteId from URL params
    const { id } = context.params;
    console.log("[PUT /api/notes/:id] Received noteId:", id);

    const validatedNoteId = validateNoteId(id);
    console.log("[PUT /api/notes/:id] Validated noteId:", validatedNoteId);

    // Step 2: Parse and validate request body
    const body = await context.request.json();
    console.log("[PUT /api/notes/:id] Request body:", body);

    const validatedData = updateNoteSchema.parse(body) as UpdateNoteCommand;
    console.log("[PUT /api/notes/:id] Validated data:", validatedData);

    // Step 3: Authentication check with fallback for local testing
    const userId = context.locals.user?.id || DEFAULT_USER_ID;

    console.log("[PUT /api/notes/:id] Using user ID:", userId);

    // Step 4: Initialize notes service
    const notesService = new NotesService(context.locals.supabase);

    // Step 5: Update note with authorization check
    console.log("[PUT /api/notes/:id] Updating note...");
    const updatedNote = await notesService.updateNote(validatedNoteId, userId, validatedData);
    console.log("[PUT /api/notes/:id] Note updated successfully:", updatedNote.id);

    // Step 6: Return success response
    return new Response(JSON.stringify(updatedNote), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    // Step 7: Handle all errors with error mapper
    console.error("[PUT /api/notes/:id] Error occurred:", error);

    if (error instanceof Error) {
      console.error("[PUT /api/notes/:id] Error stack:", error.stack);
    }

    return createErrorResponse(error);
  }
};
