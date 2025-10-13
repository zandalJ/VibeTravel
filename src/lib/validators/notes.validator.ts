import { z } from "zod";

/**
 * Validation schema for creating a new travel note
 *
 * Business rules:
 * - destination: required, 1-255 characters
 * - start_date: required, valid ISO 8601 date
 * - end_date: required, valid ISO 8601 date, must be >= start_date
 * - trip duration: cannot exceed 14 days
 * - total_budget: optional, must be > 0 if provided
 * - additional_notes: optional, max 10,000 characters
 */
export const createNoteSchema = z
  .object({
    destination: z.string().min(1, "Destination is required").max(255, "Destination cannot exceed 255 characters"),
    start_date: z.string().refine((date) => !isNaN(Date.parse(date)), {
      message: "Invalid start date format (expected ISO 8601: YYYY-MM-DD)",
    }),
    end_date: z.string().refine((date) => !isNaN(Date.parse(date)), {
      message: "Invalid end date format (expected ISO 8601: YYYY-MM-DD)",
    }),
    total_budget: z.number().positive("Total budget must be greater than 0").nullable().optional(),
    additional_notes: z.string().max(10000, "Additional notes cannot exceed 10,000 characters").nullable().optional(),
  })
  .refine(
    (data) => {
      const startDate = new Date(data.start_date);
      const endDate = new Date(data.end_date);
      return endDate >= startDate;
    },
    {
      message: "End date must be after or equal to start date",
      path: ["end_date"],
    }
  )
  .refine(
    (data) => {
      const startDate = new Date(data.start_date);
      const endDate = new Date(data.end_date);
      const durationInDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      return durationInDays <= 14;
    },
    {
      message: "Trip duration cannot exceed 14 days",
      path: ["duration"],
    }
  );

/**
 * TypeScript type inferred from the Zod schema
 */
export type CreateNoteInput = z.infer<typeof createNoteSchema>;

/**
 * Schema for updating an existing note
 * Same validation rules as create
 */
export const updateNoteSchema = createNoteSchema;

/**
 * Type for form view model (used by react-hook-form)
 */
export type NoteFormViewModel = z.infer<typeof createNoteSchema>;

/**
 * Schema for validating note ID (UUID format)
 */
export const noteIdSchema = z.string().uuid("Invalid UUID format");

/**
 * Validates and returns a note ID
 * @throws z.ZodError if invalid
 */
export function validateNoteId(noteId: string | undefined): string {
  if (!noteId) {
    throw new z.ZodError([
      {
        code: "custom",
        path: ["id"],
        message: "Note ID is required",
      },
    ]);
  }

  return noteIdSchema.parse(noteId);
}
