import type { APIRoute } from "astro";
import { z } from "zod";
import { createNoteSchema } from "../../lib/validators/notes.validator";
import { NotesService } from "../../lib/services/notes.service";

export const prerender = false;

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
    const notesService = new NotesService(context.locals.supabase);
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
    if (error instanceof z.ZodError) {
      const details: Record<string, string> = {};
      error.errors.forEach((err) => {
        const path = err.path.join(".");
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
          headers: { "Content-Type": "application/json" },
        }
      );
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
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
