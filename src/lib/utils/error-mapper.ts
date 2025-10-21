/**
 * Error Response Mapper
 *
 * Transforms internal errors into standardized API error responses
 * that match the DTOs defined in types.ts
 */

import type {
  ErrorResponseDTO,
  ValidationErrorResponseDTO,
  IncompleteProfileErrorDTO,
  GenerationLimitErrorDTO,
  AIGenerationErrorDTO,
} from "../../types";
import {
  NotFoundError,
  ForbiddenError,
  IncompleteProfileError,
  GenerationLimitError,
  AIGenerationError,
  ValidationError,
  UnauthorizedError,
  isPlanGenerationError,
} from "../errors/plan-generation.errors";
import { z } from "zod";

/**
 * Map error to HTTP status code and error response DTO
 */
export function mapErrorToResponse(error: unknown): {
  status: number;
  body:
    | ErrorResponseDTO
    | ValidationErrorResponseDTO
    | IncompleteProfileErrorDTO
    | GenerationLimitErrorDTO
    | AIGenerationErrorDTO;
} {
  // Handle Zod validation errors
  if (error instanceof z.ZodError) {
    const details: Record<string, string> = {};
    error.errors.forEach((err) => {
      const path = err.path.join(".");
      details[path] = err.message;
    });

    return {
      status: 400,
      body: {
        error: "Validation failed",
        code: "VALIDATION_ERROR",
        details,
      } as ValidationErrorResponseDTO,
    };
  }

  // Handle custom validation error
  if (error instanceof ValidationError) {
    return {
      status: 400,
      body: {
        error: error.message,
        code: "VALIDATION_ERROR",
        details: {
          [error.field]: error.reason,
        },
      } as ValidationErrorResponseDTO,
    };
  }

  // Handle not found error
  if (error instanceof NotFoundError) {
    const errorCode = error.resourceType === "plan"
      ? "PLAN_NOT_FOUND"
      : error.resourceType === "note"
      ? "NOTE_NOT_FOUND"
      : "NOT_FOUND";

    return {
      status: 404,
      body: {
        error: error.message,
        code: errorCode,
        details: {
          resourceType: error.resourceType,
          resourceId: error.resourceId,
        },
      },
    };
  }

  // Handle forbidden error
  if (error instanceof ForbiddenError) {
    return {
      status: 403,
      body: {
        error: error.message,
        code: "FORBIDDEN",
      },
    };
  }

  // Handle unauthorized error
  if (error instanceof UnauthorizedError) {
    return {
      status: 401,
      body: {
        error: error.message,
        code: "UNAUTHORIZED",
      },
    };
  }

  // Handle incomplete profile error
  if (error instanceof IncompleteProfileError) {
    return {
      status: 400,
      body: {
        error: error.message,
        code: "INCOMPLETE_PROFILE",
        required_fields: error.missingFields,
      } as IncompleteProfileErrorDTO,
    };
  }

  // Handle generation limit error
  if (error instanceof GenerationLimitError) {
    return {
      status: 429,
      body: {
        error: error.message,
        code: "GENERATION_LIMIT_EXCEEDED",
        limit: error.limit,
        reset_at: error.resetDate?.toISOString() || new Date().toISOString(),
      } as GenerationLimitErrorDTO,
    };
  }

  // Handle AI generation error
  if (error instanceof AIGenerationError) {
    return {
      status: 500,
      body: {
        error: error.message,
        code: "AI_GENERATION_FAILED",
        message: error.message,
      } as AIGenerationErrorDTO,
    };
  }

  // Handle generic plan generation errors
  if (isPlanGenerationError(error)) {
    return {
      status: error.statusCode,
      body: {
        error: error.message,
        code: "GENERATION_ERROR",
      },
    };
  }

  // Handle generic errors
  if (error instanceof Error) {
    // Log unexpected errors
    // eslint-disable-next-line no-console
    console.error("[Error Mapper] Unexpected error:", error);

    return {
      status: 500,
      body: {
        error: "Internal server error",
        code: "INTERNAL_ERROR",
        details: {
          message: "An unexpected error occurred. Please try again later.",
        },
      },
    };
  }

  // Handle unknown errors
  // eslint-disable-next-line no-console
  console.error("[Error Mapper] Unknown error type:", error);

  return {
    status: 500,
    body: {
      error: "Internal server error",
      code: "INTERNAL_ERROR",
      details: {
        message: "An unexpected error occurred. Please try again later.",
      },
    },
  };
}

/**
 * Create JSON response from error
 */
export function createErrorResponse(error: unknown): Response {
  const { status, body } = mapErrorToResponse(error);

  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}
