import type { APIRoute } from "astro";
import { z } from "zod";
import { createErrorResponse } from "../../lib/utils/error-mapper";
import { NotesService } from "../../lib/services/notes.service";
import { createNoteSchema, parseNotesListQueryParams } from "../../lib/validators/notes.validator";
import type { NotesListQueryFilters } from "../../lib/validators/notes.validator";

export const prerender = false;

const DEFAULT_USER_ID = "00000000-0000-0000-0000-000000000000";

const JSON_HEADERS = { "Content-Type": "application/json" };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function handleValidationError(error: any) {
  if (error instanceof z.ZodError) {
    const details: Record<string, string> = {};
    error.errors.forEach((err) => {
      const path = err.path.join(".") || "root";
      details[path] = err.message;
    });

    return new Response(
      JSON.stringify({
        error: "Validation failed",
        code: "VALIDATION_ERROR",
        details,
      }),
      {
        status: 400,
        headers: JSON_HEADERS,
      }
    );
  }

  return undefined;
}

function buildNotesService(supabase: NotesService["supabase"]): NotesService {
  return new NotesService(supabase);
}

/**
 * POST /api/notes
 * Creates a new travel note without authentication (MVP phase)
 *
 * Request body: CreateNoteCommand (validated with createNoteSchema)
 * Response: 201 Created with NoteDTO
 *
 * Error responses:
 * - 400 Bad Request: Invalid JSON or validation errors
 * - 500 Internal Server Error: Database or unexpected errors
 */
export const POST: APIRoute = async (context) => {
  try {
    // Step 1: Parse request body
    let body;
    try {
      body = await context.request.json();
    } catch {
      return new Response(
        JSON.stringify({
          error: "Invalid JSON body",
          code: "VALIDATION_ERROR",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Step 2: Validate request body with Zod
    const validatedData = createNoteSchema.parse(body);

    // Step 3: Create note via service (without user_id for MVP)
    const notesService = buildNotesService(context.locals.supabase);
    const note = await notesService.createNote(validatedData);

    // Step 4: Return success response
    return new Response(JSON.stringify(note), {
      status: 201,
      headers: {
        "Content-Type": "application/json",
        Location: `/api/notes/${note.id}`,
      },
    });
  } catch (error) {
    // Handle Zod validation errors
    const validationResponse = handleValidationError(error);
    if (validationResponse) {
      return validationResponse;
    }

    // Log server errors
    // eslint-disable-next-line no-console
    console.error("[POST /api/notes] Internal error:", error);

    // Return generic server error
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        code: "INTERNAL_ERROR",
        details: {
          message: "Failed to create note. Please try again later.",
        },
      }),
      {
        status: 500,
        headers: JSON_HEADERS,
      }
    );
  }
};

/**
 * GET /api/notes
 * Retrieves paginated list of notes for the authenticated user with plan counts.
 * Falls back to default user ID when no session exists (development scenario).
 */
export const GET: APIRoute = async (context) => {
  try {
    const searchParams = new URL(context.request.url).searchParams;
    let queryFilters: NotesListQueryFilters;

    try {
      queryFilters = parseNotesListQueryParams(searchParams);
    } catch (error) {
      const validationResponse = handleValidationError(error);
      if (validationResponse) {
        return validationResponse;
      }

      throw error;
    }

    const userId = context.locals.user?.id || context.locals.session?.user?.id || DEFAULT_USER_ID;

    const notesService = buildNotesService(context.locals.supabase);
    const notesList = await notesService.getNotesListForUser({
      userId,
      limit: queryFilters.limit,
      offset: queryFilters.offset,
      sort: queryFilters.sort,
    });

    return new Response(JSON.stringify(notesList), {
      status: 200,
      headers: JSON_HEADERS,
    });
  } catch (error) {
    console.error("[GET /api/notes] Error occurred:", error);

    const validationResponse = handleValidationError(error);
    if (validationResponse) {
      return validationResponse;
    }

    if (error instanceof Error) {
      console.error("[GET /api/notes] Error stack:", error.stack);
    }

    return createErrorResponse(error);
  }
};
