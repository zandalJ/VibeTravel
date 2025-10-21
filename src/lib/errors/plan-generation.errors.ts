/**
 * Custom Error Classes for Plan Generation
 *
 * Provides specific error types for different failure scenarios
 * in the plan generation process.
 */

/**
 * Base class for plan generation errors
 */
export abstract class PlanGenerationError extends Error {
  abstract readonly statusCode: number;

  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when a requested resource (note, user, profile) is not found
 * HTTP Status: 404 Not Found
 */
export class NotFoundError extends PlanGenerationError {
  readonly statusCode = 404;

  constructor(
    public readonly resourceType: "note" | "user" | "profile",
    public readonly resourceId: string
  ) {
    super(`${resourceType.charAt(0).toUpperCase() + resourceType.slice(1)} with ID ${resourceId} not found`);
  }
}

/**
 * Thrown when user tries to access a note they don't own
 * HTTP Status: 403 Forbidden
 */
export class ForbiddenError extends PlanGenerationError {
  readonly statusCode = 403;

  constructor(message = "You do not have permission to access this resource") {
    super(message);
  }
}

/**
 * Thrown when an operation requires authentication but no valid user session is present
 * HTTP Status: 401 Unauthorized
 */
export class UnauthorizedError extends PlanGenerationError {
  readonly statusCode = 401;

  constructor(message = "You must be authenticated to perform this action") {
    super(message);
  }
}

/**
 * Thrown when user profile is missing required fields for plan generation
 * HTTP Status: 400 Bad Request
 */
export class IncompleteProfileError extends PlanGenerationError {
  readonly statusCode = 400;

  constructor(public readonly missingFields: string[]) {
    super(
      `User profile is incomplete. Missing required fields: ${missingFields.join(", ")}. ` +
        "Please complete your profile before generating a travel plan."
    );
  }
}

/**
 * Thrown when user exceeds plan generation limits
 * HTTP Status: 429 Too Many Requests
 */
export class GenerationLimitError extends PlanGenerationError {
  readonly statusCode = 429;

  constructor(
    public readonly limit: number,
    public readonly resetDate?: Date
  ) {
    const resetInfo = resetDate ? ` Try again after ${resetDate.toLocaleString()}.` : " Please try again later.";

    super(`You have reached your plan generation limit of ${limit} plans.${resetInfo}`);
  }
}

/**
 * Thrown when AI service fails to generate a plan
 * HTTP Status: 500 Internal Server Error
 */
export class AIGenerationError extends PlanGenerationError {
  readonly statusCode = 500;

  constructor(
    message = "Failed to generate travel plan",
    public readonly originalError?: unknown
  ) {
    super(message);
  }
}

/**
 * Thrown when input validation fails
 * HTTP Status: 400 Bad Request
 */
export class ValidationError extends PlanGenerationError {
  readonly statusCode = 400;

  constructor(
    public readonly field: string,
    public readonly reason: string
  ) {
    super(`Validation error for field '${field}': ${reason}`);
  }
}

/**
 * Type guard to check if error is a PlanGenerationError
 */
export function isPlanGenerationError(error: unknown): error is PlanGenerationError {
  return error instanceof PlanGenerationError;
}

/**
 * Get HTTP status code from any error
 * Returns 500 for unknown errors
 */
export function getErrorStatusCode(error: unknown): number {
  if (isPlanGenerationError(error)) {
    return error.statusCode;
  }
  return 500;
}

/**
 * Get user-friendly error message from any error
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return "An unexpected error occurred";
}
