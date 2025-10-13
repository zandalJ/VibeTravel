import type { SupabaseClient } from "../../db/supabase.client";
import type { PlansListResponseDTO, PlanListItemDTO } from "../../types";
import { NotFoundError, ForbiddenError } from "../errors/plan-generation.errors";

/**
 * Service for managing travel plans
 * Handles read operations for plans table
 */
export class PlansService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Retrieves all plans for a specific note with authorization check
   *
   * @param noteId - UUID of the note to fetch plans for
   * @param userId - UUID of the authenticated user
   * @returns Promise resolving to PlansListResponseDTO
   * @throws NotFoundError if note doesn't exist
   * @throws ForbiddenError if user doesn't own the note
   * @throws Error for database errors
   */
  async getPlansByNoteId(noteId: string, userId: string): Promise<PlansListResponseDTO> {
    // Step 1: Verify note ownership first
    const { data: note, error: noteError } = await this.supabase
      .from("notes")
      .select("id, user_id")
      .eq("id", noteId)
      .single();

    // Step 2: Handle note not found
    if (noteError) {
      if (noteError.code === "PGRST116") {
        throw new NotFoundError("note", noteId);
      }
      // eslint-disable-next-line no-console
      console.error("[PlansService.getPlansByNoteId] Note query error:", noteError);
      throw new Error(`Failed to verify note: ${noteError.message}`);
    }

    if (!note) {
      throw new NotFoundError("note", noteId);
    }

    // Step 3: Authorization check
    if (note.user_id !== userId) {
      throw new ForbiddenError("You don't have permission to access plans for this note");
    }

    // Step 4: Fetch plans for the note
    const { data: plans, error: plansError } = await this.supabase
      .from("plans")
      .select("id, note_id, content, prompt_version, feedback, created_at")
      .eq("note_id", noteId)
      .order("created_at", { ascending: false });

    // Step 5: Handle database errors
    if (plansError) {
      // eslint-disable-next-line no-console
      console.error("[PlansService.getPlansByNoteId] Plans query error:", plansError);
      throw new Error(`Failed to fetch plans: ${plansError.message}`);
    }

    // Step 6: Transform to DTOs
    const planDTOs: PlanListItemDTO[] = (plans || []).map((plan) => ({
      id: plan.id,
      note_id: plan.note_id,
      content: plan.content,
      prompt_version: plan.prompt_version,
      feedback: plan.feedback,
      created_at: plan.created_at,
    }));

    // Step 7: Return response with total count
    return {
      plans: planDTOs,
      total: planDTOs.length,
    };
  }
}
