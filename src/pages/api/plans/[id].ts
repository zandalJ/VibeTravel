export const prerender = false;

import type { APIContext } from "astro";
import { PlansService } from "../../../lib/services/plans.service";
import { createErrorResponse } from "../../../lib/utils/error-mapper";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DEFAULT_USER_ID = "00000000-0000-0000-0000-000000000000";

function isValidUUID(value: string | undefined): value is string {
  if (!value) {
    return false;
  }
  return UUID_REGEX.test(value);
}

export async function GET(context: APIContext): Promise<Response> {
  try {
    const planId = context.params.id;

    if (!isValidUUID(planId)) {
      return new Response(
        JSON.stringify({
          error: "Validation failed",
          code: "VALIDATION_ERROR",
          details: {
            id: "Invalid UUID format",
          },
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const plansService = new PlansService(context.locals.supabase);
    const userId = context.locals.user?.id || DEFAULT_USER_ID;
    const plan = await plansService.getPlanById(planId, userId);

    return new Response(JSON.stringify(plan), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}
