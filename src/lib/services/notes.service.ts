import type { SupabaseClient } from "../../db/supabase.client";
import type { CreateNoteCommand, NoteDTO } from "../../types";

/**
 * Service for managing travel notes
 * Handles CRUD operations for notes table
 */
export class NotesService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Creates a new travel note without user authentication (MVP phase)
   *
   * @param command - The note data to create
   * @returns Promise resolving to the created note with all fields
   * @throws Error if database operation fails
   */
  async createNote(command: CreateNoteCommand): Promise<NoteDTO> {
    const { data, error } = await this.supabase
      .from("notes")
      .insert({
        user_id: null,
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
}
