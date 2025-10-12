import { z } from "zod";

/**
 * UUID v4 regex pattern
 */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Validation schema for note ID parameter
 *
 * Business rules:
 * - noteId: required, must be a valid UUID v4
 */
export const noteIdParamSchema = z.object({
  noteId: z.string().regex(UUID_REGEX, "Invalid note ID format (expected UUID v4)").min(1, "Note ID is required"),
});

/**
 * TypeScript type inferred from the schema
 */
export type NoteIdParam = z.infer<typeof noteIdParamSchema>;

/**
 * Helper function to validate note ID from URL params
 *
 * @param noteId - The note ID from URL parameters
 * @returns Validated note ID
 * @throws ZodError if validation fails
 */
export function validateNoteId(noteId: string | undefined): string {
  const result = noteIdParamSchema.parse({ noteId });
  return result.noteId;
}
