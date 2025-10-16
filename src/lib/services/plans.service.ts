import type { SupabaseClient } from "../../db/supabase.client";
import type { PlansListResponseDTO, PlanListItemDTO, PlanDTO } from "../../types";
import type { TablesInsert } from "../../db/database.types";
import { NotFoundError, ForbiddenError } from "../errors/plan-generation.errors";
import { getPromptVersion } from "../utils/prompt-builder";

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

  /**
   * Retrieves a specific plan by ID with authorization check
   *
   * @param planId - UUID of the plan to fetch
   * @param userId - UUID of the authenticated user
   * @returns Promise resolving to PlanDTO with nested note information
   * @throws NotFoundError if plan doesn't exist
   * @throws ForbiddenError if user doesn't own the plan's note
   * @throws Error for database errors
   */
  async getPlanById(planId: string, userId: string): Promise<PlanDTO> {
    const { data, error } = await this.supabase
      .from("plans")
      .select(
        `
      id,
      note_id,
      content,
      prompt_version,
      feedback,
      created_at,
      notes!inner(
        destination,
        start_date,
        end_date,
        user_id
      )
    `
      )
      .eq("id", planId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        throw new NotFoundError("plan", planId);
      }
      // eslint-disable-next-line no-console
      console.error("[PlansService.getPlanById] Database error:", {
        planId,
        userId,
        error: error.message,
      });
      throw new Error(`Failed to fetch plan: ${error.message}`);
    }

    if (!data) {
      throw new NotFoundError("plan", planId);
    }

    if (data.notes.user_id !== userId) {
      throw new ForbiddenError("You don't have permission to access this plan");
    }

    return {
      id: data.id,
      note_id: data.note_id,
      content: data.content,
      prompt_version: data.prompt_version,
      feedback: data.feedback,
      created_at: data.created_at,
      note: {
        destination: data.notes.destination,
        start_date: data.notes.start_date,
        end_date: data.notes.end_date,
      },
    };
  }

  /**
   * Creates a new plan from accepted preview
   * This saves the plan to database and increments the generation count
   *
   * @param noteId - UUID of the note this plan belongs to
   * @param userId - UUID of the authenticated user
   * @param content - The generated plan content
   * @returns Promise resolving to created PlanDTO
   * @throws NotFoundError if note doesn't exist
   * @throws ForbiddenError if user doesn't own the note
   * @throws Error for database errors
   */
  async createPlan(noteId: string, userId: string, content: string): Promise<PlanDTO> {
    // Step 1: Verify note ownership
    const { data: note, error: noteError } = await this.supabase
      .from("notes")
      .select("id, user_id")
      .eq("id", noteId)
      .single();

    if (noteError) {
      if (noteError.code === "PGRST116") {
        throw new NotFoundError("note", noteId);
      }
      throw new Error(`Failed to verify note: ${noteError.message}`);
    }

    if (!note) {
      throw new NotFoundError("note", noteId);
    }

    if (note.user_id !== userId) {
      throw new ForbiddenError("You don't have permission to create plans for this note");
    }

    // Step 2: Create plan record
    const planData: TablesInsert<"plans"> = {
      note_id: noteId,
      content,
      prompt_text: "", // Empty for accepted plans (prompt not stored)
      prompt_version: getPromptVersion(),
    };

    const { data: plan, error: planError } = await this.supabase
      .from("plans")
      .insert(planData)
      .select("*")
      .single();

    if (planError || !plan) {
      throw new Error(`Failed to create plan: ${planError?.message || "Unknown error"}`);
    }

    // Step 3: Increment generation count
    await this.incrementGenerationCount(userId);

    // Step 4: Return plan DTO
    return {
      id: plan.id,
      note_id: plan.note_id,
      content: plan.content,
      model: plan.model || "unknown",
      prompt_version: plan.prompt_version,
      prompt_text: plan.prompt_text,
      feedback: plan.feedback,
      tokens_used: plan.tokens_used,
      created_at: plan.created_at,
      updated_at: plan.updated_at,
    };
  }

  /**
   * Increment user's generation count
   * @private
   */
  private async incrementGenerationCount(userId: string): Promise<void> {
    const { data: profile } = await this.supabase
      .from("profiles")
      .select("generation_count")
      .eq("id", userId)
      .single();

    if (!profile) {
      throw new Error("Profile not found");
    }

    await this.supabase
      .from("profiles")
      .update({
        generation_count: profile.generation_count + 1,
      })
      .eq("id", userId);
  }
}
