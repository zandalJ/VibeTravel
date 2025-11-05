import type { Tables, Enums } from "./db/database.types";

export type { AuthEvent, AuthSessionPayload } from "./lib/validators/auth.validator";

// ============================================================================
// BASE TYPES FROM DATABASE
// ============================================================================

export type Profile = Tables<"profiles">;
export type Note = Tables<"notes">;
export type Plan = Tables<"plans">;
export type GenerationLog = Tables<"generation_logs">;

export type TravelStyleEnum = Enums<"travel_style_enum">;
export type GenerationStatusEnum = Enums<"generation_status_enum">;

// ============================================================================
// PROFILE DTOs
// ============================================================================

/**
 * Profile DTO returned by GET/PUT /api/profile
 * Extends database profile with computed 'is_complete' field
 */
export interface ProfileDTO extends Profile {
  /**
   * Computed field indicating if profile has all required data for plan generation
   * true when: travel_style exists AND daily_budget exists AND (interests.length > 0 OR other_interests exists)
   */
  is_complete: boolean;
}

/**
 * Command for creating or updating user profile (PUT /api/profile)
 * Upsert operation - creates if doesn't exist, updates if exists
 */
export interface UpdateProfileCommand {
  interests?: string[];
  other_interests?: string | null;
  daily_budget?: number | null;
  travel_style: TravelStyleEnum; // Required field
  typical_trip_duration?: number | null;
}

// ============================================================================
// NOTES DTOs
// ============================================================================

/**
 * Full note details returned by GET /api/notes/:id
 * Schema now matches database after migration (2025-10-12)
 */
export interface NoteDTO {
  id: string;
  destination: string;
  start_date: string; // ISO 8601 date string
  end_date: string; // ISO 8601 date string
  total_budget?: number | null;
  additional_notes?: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Note list item returned in GET /api/notes
 * Includes computed plan_count field
 */
export interface NoteListItemDTO extends NoteDTO {
  plan_count: number; // Number of plans generated for this note
}

/**
 * Command for creating a new note (POST /api/notes)
 */
export interface CreateNoteCommand {
  destination: string; // Required, max 255 characters
  start_date: string; // Required, ISO 8601 date
  end_date: string; // Required, ISO 8601 date, must be >= start_date
  total_budget?: number | null; // Optional, must be > 0 if provided
  additional_notes?: string | null; // Optional, max ~10,000 characters
}

/**
 * Command for updating an existing note (PUT /api/notes/:id)
 * Same structure as CreateNoteCommand
 */
export interface UpdateNoteCommand {
  destination: string;
  start_date: string;
  end_date: string;
  total_budget?: number | null;
  additional_notes?: string | null;
}

/**
 * Response wrapper for GET /api/notes with pagination
 */
export interface NotesListResponseDTO {
  notes: NoteListItemDTO[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
}

// ============================================================================
// PLANS DTOs
// ============================================================================

/**
 * Minimal plan information for note's plan history
 * Schema now matches database after migration (2025-10-12)
 */
export interface PlanListItemDTO {
  id: string;
  note_id: string;
  content: string; // AI-generated itinerary content
  prompt_version: string;
  feedback: number | null; // 1 (thumbs up) or -1 (thumbs down)
  created_at: string;
}

/**
 * Full plan details returned by GET /api/plans/:id
 * Includes nested note information
 */
export interface PlanDTO extends PlanListItemDTO {
  note: {
    destination: string;
    start_date: string;
    end_date: string;
  };
}

/**
 * Response for plan generation (POST /api/notes/:noteId/generate-plan)
 * Includes remaining generation quota information
 */
export interface GeneratePlanResponseDTO {
  id: string;
  note_id: string;
  content: string;
  prompt_version: string;
  created_at: string;
  remaining_generations: number; // How many generations left this month
  generation_limit_reset_at: string; // When the monthly limit resets
}

/**
 * Response wrapper for GET /api/notes/:noteId/plans
 */
export interface PlansListResponseDTO {
  plans: PlanListItemDTO[];
  total: number;
}

/**
 * Command for submitting plan feedback (POST /api/plans/:id/feedback)
 */
export interface SubmitFeedbackCommand {
  feedback: 1 | -1; // 1 for thumbs up, -1 for thumbs down
}

/**
 * Success response for feedback submission
 */
export interface FeedbackResponseDTO {
  id: string;
  feedback: 1 | -1;
  message: string;
}

// ============================================================================
// ERROR RESPONSE DTOs
// ============================================================================

/**
 * Standard error response structure used across all endpoints
 */
export interface ErrorResponseDTO {
  error: string; // Human-readable error message
  code: string; // Machine-readable error code (e.g., "UNAUTHORIZED", "NOT_FOUND")
  details?: Record<string, unknown>; // Optional additional error details
}

/**
 * Error response for validation failures (400 Bad Request)
 * Includes field-level validation error details
 */
export interface ValidationErrorResponseDTO extends ErrorResponseDTO {
  code: "VALIDATION_ERROR";
  details: Record<string, string>; // Field name -> error message mapping
}

/**
 * Error response for profile incompleteness (400 Bad Request)
 */
export interface IncompleteProfileErrorDTO extends ErrorResponseDTO {
  code: "INCOMPLETE_PROFILE";
  required_fields: string[]; // List of missing required fields
}

/**
 * Error response for generation limit exceeded (429 Too Many Requests)
 */
export interface GenerationLimitErrorDTO extends ErrorResponseDTO {
  code: "GENERATION_LIMIT_EXCEEDED";
  limit: number; // The monthly limit (5)
  reset_at: string; // When the limit will reset
}

/**
 * Error response for AI generation failures (500 Internal Server Error)
 */
export interface AIGenerationErrorDTO extends ErrorResponseDTO {
  code: "AI_GENERATION_FAILED";
  message: string; // User-friendly explanation
}

// ============================================================================
// QUERY PARAMETERS
// ============================================================================

/**
 * Query parameters for GET /api/notes
 */
export interface NotesListQueryParams {
  sort?: string; // Format: "field:direction", default: "created_at:desc"
  limit?: number; // Default: 50, max: 100
  offset?: number; // Default: 0
}

/**
 * Parsed and validated sort parameter
 */
export interface SortParams {
  field: "created_at" | "start_date" | "destination";
  direction: "asc" | "desc";
}

// ============================================================================
// VIEW MODELS
// ============================================================================

/**
 * Aggregates all data and UI states needed for the NoteDetailsView.
 */
export interface NoteDetailsViewModel {
  /** Data of the currently displayed note. */
  note: NoteDTO | null;
  /** List of historical plans for this note. */
  plans: PlanListItemDTO[];
  /** Information about whether the user profile is complete. */
  isProfileComplete: boolean;
  /** Number of remaining plan generations this month. */
  remainingGenerations: number | null;
  /** Loading state for main data (note, history). */
  isLoading: boolean;
  /** Loading state during new plan generation. */
  isGeneratingPlan: boolean;
  /** Loading state during note deletion. */
  isDeletingNote: boolean;
  /** General error message for the view. */
  error: string | null;
  /** Determines if the delete confirmation modal is open. */
  isDeleteDialogOpen: boolean;
  /** Generated plan preview (before acceptance). */
  generatedPlanPreview: PlanDTO | null;
  /** Determines if the plan preview dialog is open. */
  isPlanPreviewDialogOpen: boolean;
}

/**
 * Aggregates data and UI states for the generated plan details view.
 */
export interface GeneratedPlanViewModel {
  /** Currently loaded plan. */
  plan: PlanDTO | null;
  /** Indicates whether the plan is being fetched. */
  isLoading: boolean;
  /** Optional error message related to loading or actions. */
  error: string | null;
  /** Indicates whether feedback submission is in progress. */
  isSubmittingFeedback: boolean;
  /** Currently selected feedback value. */
  currentFeedback: 1 | -1 | null;
}

/**
 * Parameters required to initialize the generated plan hook.
 */
export interface UseGeneratedPlanParams {
  planId: string;
}

/**
 * Return type of the generated plan hook, exposing state and actions.
 */
export interface UseGeneratedPlanReturn {
  viewModel: GeneratedPlanViewModel;
  retry: () => Promise<void>;
  submitFeedback: (value: 1 | -1) => Promise<void>;
  copy: (content: string) => Promise<void>;
}

/**
 * Aggregates list data and UI states for the dashboard view displaying notes.
 */
export interface NotesListViewModel {
  notes: NoteListItemDTO[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
  sort: SortParams;
  isLoading: boolean;
  isRefetching: boolean;
  error: string | null;
}

// ============================================================================
// HELPER TYPES
// ============================================================================

/**
 * Type guard to check if a value is a valid TravelStyleEnum
 */
export function isTravelStyle(value: unknown): value is TravelStyleEnum {
  const validStyles: TravelStyleEnum[] = [
    "budget",
    "backpacking",
    "comfort",
    "luxury",
    "adventure",
    "cultural",
    "relaxation",
    "family",
    "solo",
  ];
  return typeof value === "string" && validStyles.includes(value as TravelStyleEnum);
}

/**
 * Type guard to check if feedback value is valid
 */
export function isFeedbackValue(value: unknown): value is 1 | -1 {
  return value === 1 || value === -1;
}
