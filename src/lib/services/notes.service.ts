import type { SupabaseClient } from "../../db/supabase.client";
import type { CreateNoteCommand, NoteDTO } from "../../types";
import { NotFoundError, ForbiddenError } from "../errors/plan-generation.errors";

/**
 * Default user ID for development purposes
 * TODO: Replace with actual authentication in production
 */
const DEFAULT_USER_ID = "00000000-0000-0000-0000-000000000000";

/**
 * Service for managing travel notes
 * Handles CRUD operations for notes table
 */
export class NotesService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Creates a new travel note with a default user ID (for development)
   *
   * @param command - The note data to create
   * @returns Promise resolving to the created note with all fields
   * @throws Error if database operation fails
   */
  async createNote(command: CreateNoteCommand): Promise<NoteDTO> {
    const { data, error } = await this.supabase
      .from("notes")
      .insert({
        user_id: DEFAULT_USER_ID,
        destination: command.destination,
        start_date: command.start_date,
        end_date: command.end_date,
        total_budget: command.total_budget ?? null,
        additional_notes: command.additional_notes ?? null,
      })
      .select()
      .single();

    if (error) {
      // eslint-disable-next-line no-console
      console.error("[NotesService.createNote] Database error:", error);
      throw new Error(`Failed to create note: ${error.message}`);
    }

    if (!data) {
      throw new Error("Failed to create note: No data returned");
    }

    return data as NoteDTO;
  }

  /**
   * Retrieves a specific note by ID with authorization check
   *
   * @param noteId - UUID of the note to retrieve
   * @param userId - UUID of the authenticated user
   * @returns Promise resolving to NoteDTO
   * @throws NotFoundError if note doesn't exist
   * @throws ForbiddenError if user doesn't own the note
   * @throws Error for database errors
   */
  async getNoteById(noteId: string, userId: string): Promise<NoteDTO> {
    // Step 1: Query note from database
    const { data, error } = await this.supabase
      .from("notes")
      .select("*")
      .eq("id", noteId)
      .single();

    // Step 2: Handle database errors
    if (error) {
      // Check if error is "not found"
      if (error.code === "PGRST116") {
        throw new NotFoundError("note", noteId);
      }

      // Other database errors
      // eslint-disable-next-line no-console
      console.error("[NotesService.getNoteById] Database error:", error);
      throw new Error(`Failed to retrieve note: ${error.message}`);
    }

    // Step 3: Verify note exists (redundant if error handling above is correct, but safe)
    if (!data) {
      throw new NotFoundError("note", noteId);
    }

    // Step 4: Authorization check - verify ownership
    if (data.user_id !== userId) {
      throw new ForbiddenError("You don't have permission to access this note");
    }

    // Step 5: Transform to NoteDTO (exclude user_id)
    const noteDTO: NoteDTO = {
      id: data.id,
      destination: data.destination,
      start_date: data.start_date,
      end_date: data.end_date,
      total_budget: data.total_budget,
      additional_notes: data.additional_notes,
      created_at: data.created_at,
      updated_at: data.updated_at,
    };

    return noteDTO;
  }
}
