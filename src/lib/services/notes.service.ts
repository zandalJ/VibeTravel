import type { SupabaseClient } from "../../db/supabase.client";
import type {
  CreateNoteCommand,
  UpdateNoteCommand,
  NoteDTO,
  NotesListResponseDTO,
  SortParams,
} from "../../types";
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
    const { data, error } = await this.supabase.from("notes").select("*").eq("id", noteId).single();

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

  /**
   * Updates an existing travel note with authorization check
   *
   * @param noteId - UUID of the note to update
   * @param userId - UUID of the authenticated user
   * @param command - The updated note data
   * @returns Promise resolving to the updated note
   * @throws NotFoundError if note doesn't exist
   * @throws ForbiddenError if user doesn't own the note
   * @throws Error for database errors
   */
  async updateNote(noteId: string, userId: string, command: UpdateNoteCommand): Promise<NoteDTO> {
    // Step 1: Verify note exists and user has permission
    await this.getNoteById(noteId, userId);

    // Step 2: Update the note
    const { data, error } = await this.supabase
      .from("notes")
      .update({
        destination: command.destination,
        start_date: command.start_date,
        end_date: command.end_date,
        total_budget: command.total_budget ?? null,
        additional_notes: command.additional_notes ?? null,
      })
      .eq("id", noteId)
      .select()
      .single();

    // Step 3: Handle database errors
    if (error) {
      // eslint-disable-next-line no-console
      console.error("[NotesService.updateNote] Database error:", error);
      throw new Error(`Failed to update note: ${error.message}`);
    }

    if (!data) {
      throw new Error("Failed to update note: No data returned");
    }

    // Step 4: Transform to NoteDTO (exclude user_id)
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

  /**
   * Deletes an existing travel note after verifying ownership
   *
   * @param noteId - UUID of the note to delete
   * @param userId - UUID of the authenticated user
   * @throws NotFoundError if note doesn't exist
   * @throws ForbiddenError if user doesn't own the note
   * @throws Error for database errors
   */
  async deleteNote(noteId: string, userId: string): Promise<void> {
    // Step 1: Ensure the note exists and belongs to the user
    await this.getNoteById(noteId, userId);

    // Step 2: Perform the delete operation scoped to user ownership
    const { error, count } = await this.supabase
      .from("notes")
      .delete({ count: "exact" })
      .eq("id", noteId)
      .eq("user_id", userId);

    // Step 3: Handle database errors
    if (error) {
      // eslint-disable-next-line no-console
      console.error("[NotesService.deleteNote] Database error:", error);
      throw new Error(`Failed to delete note: ${error.message}`);
    }

    // Step 4: Handle race condition where note might have been deleted concurrently
    if (!count) {
      throw new NotFoundError("note", noteId);
    }
  }

  async getNotesListForUser({
    userId,
    limit,
    offset,
    sort,
  }: {
    userId: string;
    limit: number;
    offset: number;
    sort: SortParams;
  }): Promise<NotesListResponseDTO> {
    const { data: notesData, error: notesError } = await this.supabase
      .from("notes")
      .select("id,destination,start_date,end_date,total_budget,additional_notes,created_at,updated_at,plans(count)")
      .eq("user_id", userId)
      .order(sort.field, { ascending: sort.direction === "asc" })
      .range(offset, offset + limit - 1);

    if (notesError) {
      console.error("[NotesService.getNotesListForUser] Database error (notes query):", notesError);
      throw new Error(`Failed to fetch notes: ${notesError.message}`);
    }

    const { count: totalCount, error: countError } = await this.supabase
      .from("notes")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);

    if (countError) {
      console.error("[NotesService.getNotesListForUser] Database error (count query):", countError);
      throw new Error(`Failed to fetch notes count: ${countError.message}`);
    }

    const notes = (notesData ?? []).map((note) => ({
      id: note.id,
      destination: note.destination,
      start_date: note.start_date,
      end_date: note.end_date,
      total_budget: note.total_budget,
      additional_notes: note.additional_notes,
      created_at: note.created_at,
      updated_at: note.updated_at,
      plan_count: Array.isArray(note.plans) && note.plans.length > 0 ? note.plans[0]?.count ?? 0 : 0,
    }));

    return {
      notes,
      pagination: {
        total: totalCount ?? 0,
        limit,
        offset,
      },
    };
  }
}
