import type { APIRoute } from "astro";
import { planFeedbackSchema } from "../../../../lib/validators/plan-feedback.validator";
import { PlansService } from "../../../../lib/services/plans.service";
import { createErrorResponse } from "../../../../lib/utils/error-mapper";

export const prerender = false;

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DEFAULT_USER_ID = "00000000-0000-0000-0000-000000000000";

const JSON_HEADERS = { "Content-Type": "application/json" } as const;

function isValidUUID(value: string | undefined): value is string {
  if (!value) {
    return false;
  }
  return UUID_REGEX.test(value);
}

export const POST: APIRoute = async (context) => {
  const planId = context.params.id;

  if (!isValidUUID(planId)) {
    return new Response(
      JSON.stringify({
        error: "Validation failed",
        code: "VALIDATION_ERROR",
        details: { id: "Invalid UUID format" },
      }),
      {
        status: 400,
        headers: JSON_HEADERS,
      }
    );
  }

  let body: unknown;
  try {
    body = await context.request.json();
  } catch {
    return new Response(
      JSON.stringify({
        error: "Invalid JSON body",
        code: "VALIDATION_ERROR",
      }),
      {
        status: 400,
        headers: JSON_HEADERS,
      }
    );
  }

  try {
    const { feedback } = planFeedbackSchema.parse(body);

    const supabase = context.locals.supabase;
    if (!supabase) {
      throw new Error("Supabase client not available in context");
    }

    // TODO: Replace fallback user with authenticated user once Supabase auth is fully integrated (post-MVP).
    const userId = context.locals.user?.id || context.locals.session?.user?.id || DEFAULT_USER_ID;
    const plansService = new PlansService(supabase);
    const result = await plansService.submitFeedback(planId, userId, feedback);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: JSON_HEADERS,
    });
  } catch (error) {
    return createErrorResponse(error);
  }
};
