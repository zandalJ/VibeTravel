import { z } from "zod";

import type { SortParams } from "../../types";

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

const sortFieldEnum = z.enum(["created_at", "start_date", "destination"]);
const sortDirectionEnum = z.enum(["asc", "desc"]);

const sortParamSchema = z
  .string()
  .trim()
  .transform((value) => value.toLowerCase())
  .refine((value) => value.includes(":"), {
    message: "Sort must use the format field:direction",
  })
  .transform((value) => {
    const [field = "", direction = ""] = value.split(":");
    return { field: field.trim(), direction: direction.trim() };
  })
  .refine(({ field }) => sortFieldEnum.safeParse(field).success, {
    message: "Sort field must be one of created_at, start_date, destination",
    path: ["field"],
  })
  .refine(({ direction }) => sortDirectionEnum.safeParse(direction).success, {
    message: "Sort direction must be asc or desc",
    path: ["direction"],
  })
  .transform(({ field, direction }) => ({
    field: field as SortParams["field"],
    direction: direction as SortParams["direction"],
  }));

/**
 * Schema for validating notes list query parameters (GET /api/notes)
 */
const rawNotesListQuerySchema = z.object({
  sort: sortParamSchema.optional(),
  limit: z
    .coerce.number({ invalid_type_error: "Limit must be a number" })
    .int("Limit must be an integer")
    .min(1, "Limit must be at least 1")
    .max(100, "Limit cannot exceed 100")
    .optional(),
  offset: z
    .coerce.number({ invalid_type_error: "Offset must be a number" })
    .int("Offset must be an integer")
    .min(0, "Offset must be greater or equal to 0")
    .optional(),
});

export const notesListQuerySchema = rawNotesListQuerySchema.transform((value) => ({
  sort: value.sort ?? { field: "created_at", direction: "desc" },
  limit: value.limit ?? 50,
  offset: value.offset ?? 0,
}));

export type NotesListQueryFilters = z.infer<typeof notesListQuerySchema>;

export function parseNotesListQueryParams(searchParams: URLSearchParams): NotesListQueryFilters {
  return notesListQuerySchema.parse({
    sort: searchParams.get("sort") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
    offset: searchParams.get("offset") ?? undefined,
  });
}
