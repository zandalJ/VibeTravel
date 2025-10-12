/**
 * Plan Generation Service
 *
 * Orchestrates the complete plan generation process:
 * 1. Authorization & validation
 * 2. Profile completeness check
 * 3. Generation limit enforcement
 * 4. AI prompt building & execution
 * 5. Plan and log persistence
 */

import type { SupabaseClient } from "../../db/supabase.client";
import type { GeneratePlanResponseDTO, Profile, Note } from "../../types";
import type { TablesInsert } from "../../db/database.types";
import {
  NotFoundError,
  ForbiddenError,
  IncompleteProfileError,
  GenerationLimitError,
  AIGenerationError,
} from "../errors/plan-generation.errors";
import { getOpenRouterService } from "./openrouter.service";
import { buildPrompt, getPromptVersion, validatePromptData } from "../utils/prompt-builder";

/**
 * Default user ID for development purposes
 * TODO: Replace with actual authentication in production
 */
const DEFAULT_USER_ID = "00000000-0000-0000-0000-000000000000";

/**
 * Monthly generation limit per user (5 plans)
 */
const GENERATION_LIMIT = 5;

/**
 * Service for generating travel plans
 */
export class PlanGenerationService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Generate a new travel plan for a note
   *
   * @param noteId - ID of the note to generate plan for
   * @returns Promise resolving to the generated plan with quota info
   * @throws NotFoundError if note or profile not found
   * @throws ForbiddenError if user doesn't own the note
   * @throws IncompleteProfileError if profile is missing required fields
   * @throws GenerationLimitError if monthly limit exceeded
   * @throws AIGenerationError if AI service fails
   */
  async generatePlan(noteId: string): Promise<GeneratePlanResponseDTO> {
    // Step 1: Fetch note and verify ownership
    const note = await this.fetchNote(noteId);
    this.verifyOwnership(note);

    // Step 2: Fetch user profile and verify completeness
    const profile = await this.fetchProfile(note.user_id);
    this.verifyProfileCompleteness(profile);

    // Step 3: Check generation limits
    await this.checkGenerationLimit(profile);

    // Step 4: Create generation log (pending)
    const logId = await this.createGenerationLog(note.user_id, noteId, "pending");

    try {
      // Step 5: Update log to processing
      await this.updateGenerationLogStatus(logId, "processing");

      // Step 6: Build prompt from note and profile
      const prompt = this.buildPromptFromData(note, profile);

      // Step 7: Call AI service
      const openRouter = getOpenRouterService();
      const aiResponse = await openRouter.generatePlan(prompt);

      // Step 8: Create plan record
      const plan = await this.createPlan(noteId, aiResponse.content, prompt);

      // Step 9: Update generation log (completed)
      await this.updateGenerationLog(logId, {
        status: "completed",
        plan_id: plan.id,
        prompt_tokens: aiResponse.promptTokens,
        completion_tokens: aiResponse.completionTokens,
      });

      // Step 10: Increment profile generation count
      await this.incrementGenerationCount(note.user_id);

      // Step 11: Calculate remaining generations
      const updatedProfile = await this.fetchProfile(note.user_id);
      const remaining = GENERATION_LIMIT - updatedProfile.generation_count;

      // Step 12: Return response
      return {
        id: plan.id,
        note_id: plan.note_id,
        content: plan.content,
        prompt_version: plan.prompt_version,
        created_at: plan.created_at,
        remaining_generations: remaining,
        generation_limit_reset_at: updatedProfile.generation_limit_reset_at,
      };
    } catch (error) {
      // Update generation log with error
      await this.updateGenerationLog(logId, {
        status: "failed",
        error_code: error instanceof Error ? error.name : "UNKNOWN_ERROR",
        error_message: error instanceof Error ? error.message : "Unknown error occurred",
      });

      // Re-throw as AIGenerationError if not already a known error
      if (
        error instanceof NotFoundError ||
        error instanceof ForbiddenError ||
        error instanceof IncompleteProfileError ||
        error instanceof GenerationLimitError
      ) {
        throw error;
      }

      throw new AIGenerationError("Failed to generate travel plan. Please try again.", error);
    }
  }

  /**
   * Fetch note from database
   */
  private async fetchNote(noteId: string): Promise<Note> {
    const { data, error } = await this.supabase.from("notes").select("*").eq("id", noteId).single();

    if (error || !data) {
      throw new NotFoundError("note", noteId);
    }

    return data;
  }

  /**
   * Verify note ownership
   * In MVP, we use DEFAULT_USER_ID for all notes
   */
  private verifyOwnership(note: Note): void {
    if (note.user_id !== DEFAULT_USER_ID) {
      throw new ForbiddenError("You do not have permission to access this note");
    }
  }

  /**
   * Fetch user profile from database
   */
  private async fetchProfile(userId: string): Promise<Profile> {
    const { data, error } = await this.supabase.from("profiles").select("*").eq("id", userId).single();

    if (error || !data) {
      throw new NotFoundError("profile", userId);
    }

    return data;
  }

  /**
   * Verify profile has required fields for plan generation
   */
  private verifyProfileCompleteness(profile: Profile): void {
    const missingFields: string[] = [];

    if (!profile.travel_style) {
      missingFields.push("travel_style");
    }

    if (!profile.daily_budget) {
      missingFields.push("daily_budget");
    }

    if (profile.interests.length === 0 && !profile.other_interests) {
      missingFields.push("interests");
    }

    if (missingFields.length > 0) {
      throw new IncompleteProfileError(missingFields);
    }
  }

  /**
   * Check if user has exceeded generation limit
   */
  private async checkGenerationLimit(profile: Profile): Promise<void> {
    // Check if limit reset date has passed
    const now = new Date();
    const resetDate = new Date(profile.generation_limit_reset_at);

    if (now >= resetDate) {
      // Reset generation count
      await this.resetGenerationCount(profile.id);
      return;
    }

    // Check if limit exceeded
    if (profile.generation_count >= GENERATION_LIMIT) {
      throw new GenerationLimitError(GENERATION_LIMIT, resetDate);
    }
  }

  /**
   * Reset generation count and set new reset date (30 days from now)
   */
  private async resetGenerationCount(userId: string): Promise<void> {
    const resetDate = new Date();
    resetDate.setDate(resetDate.getDate() + 30);

    await this.supabase
      .from("profiles")
      .update({
        generation_count: 0,
        generation_limit_reset_at: resetDate.toISOString(),
      })
      .eq("id", userId);
  }

  /**
   * Create generation log entry
   */
  private async createGenerationLog(userId: string, noteId: string, status: string): Promise<string> {
    const { data, error } = await this.supabase
      .from("generation_logs")
      .insert({
        user_id: userId,
        note_id: noteId,
        status,
      })
      .select("id")
      .single();

    if (error || !data) {
      throw new Error("Failed to create generation log");
    }

    return data.id;
  }

  /**
   * Update generation log status
   */
  private async updateGenerationLogStatus(logId: string, status: string): Promise<void> {
    await this.supabase.from("generation_logs").update({ status }).eq("id", logId);
  }

  /**
   * Update generation log with multiple fields
   */
  private async updateGenerationLog(
    logId: string,
    updates: {
      status?: string;
      plan_id?: string;
      prompt_tokens?: number;
      completion_tokens?: number;
      error_code?: string;
      error_message?: string;
    }
  ): Promise<void> {
    await this.supabase.from("generation_logs").update(updates).eq("id", logId);
  }

  /**
   * Build AI prompt from note and profile data
   */
  private buildPromptFromData(note: Note, profile: Profile): string {
    // Calculate daily budget from total budget if not set in profile
    let dailyBudget = profile.daily_budget;
    if (!dailyBudget && note.total_budget) {
      const startDate = new Date(note.start_date);
      const endDate = new Date(note.end_date);
      const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      dailyBudget = Math.floor(note.total_budget / days);
    }

    const promptData = {
      destination: note.destination,
      startDate: note.start_date,
      endDate: note.end_date,
      totalBudget: note.total_budget,
      dailyBudget,
      travelStyle: profile.travel_style,
      interests: profile.interests,
      otherInterests: profile.other_interests,
      additionalNotes: note.additional_notes,
    };

    if (!validatePromptData(promptData)) {
      throw new Error("Invalid prompt data: missing required fields");
    }

    return buildPrompt(promptData);
  }

  /**
   * Create plan record in database
   */
  private async createPlan(
    noteId: string,
    content: string,
    promptText: string
  ): Promise<{ id: string; note_id: string; content: string; prompt_version: string; created_at: string }> {
    const planData: TablesInsert<"plans"> = {
      note_id: noteId,
      content,
      prompt_text: promptText,
      prompt_version: getPromptVersion(),
    };

    const { data, error } = await this.supabase
      .from("plans")
      .insert(planData)
      .select("id, note_id, content, prompt_version, created_at")
      .single();

    if (error || !data) {
      throw new Error("Failed to create plan record");
    }

    return data;
  }

  /**
   * Increment profile generation count
   */
  private async incrementGenerationCount(userId: string): Promise<void> {
    // Fetch current count
    const { data: profile } = await this.supabase.from("profiles").select("generation_count").eq("id", userId).single();

    if (!profile) {
      throw new Error("Profile not found");
    }

    // Increment count
    await this.supabase
      .from("profiles")
      .update({
        generation_count: profile.generation_count + 1,
      })
      .eq("id", userId);
  }
}
