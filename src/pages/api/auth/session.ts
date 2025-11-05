import type { APIRoute } from "astro";
import type { Session } from "@supabase/supabase-js";
import { z } from "zod";

import { createSupabaseServerInstance } from "@/db/supabase.server";
import { authEventSchema, authSessionPayloadSchema } from "@/lib/validators/auth.validator";

export const prerender = false;

const requestBodySchema = z.object({
  event: authEventSchema,
  session: authSessionPayloadSchema.optional(),
});

const jsonResponse = (status: number, payload: unknown = null) =>
  new Response(payload ? JSON.stringify(payload) : null, {
    status,
    headers: payload ? { "Content-Type": "application/json" } : undefined,
  });

export const POST: APIRoute = async ({ request, cookies }) => {
  let body: unknown;

  try {
    body = await request.json();
  } catch (error) {
    console.error("Failed to parse auth session payload", error);
    return jsonResponse(400, { error: "Invalid request payload." });
  }

  const parsed = requestBodySchema.safeParse(body);

  if (!parsed.success) {
    console.error("Auth session validation failed", parsed.error.flatten());
    return jsonResponse(400, { error: "Invalid authentication payload." });
  }

  const { event, session } = parsed.data;

  const supabase = createSupabaseServerInstance({
    cookies,
    headers: request.headers,
  });

  if (event === "SIGNED_OUT") {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Failed to sign out user", error);
      return jsonResponse(500, { error: "Failed to clear authentication session." });
    }

    return jsonResponse(204);
  }

  if (!session) {
    return jsonResponse(400, { error: "Missing session payload for authentication event." });
  }

  const { error } = await supabase.auth.setSession(session as Session);

  if (error) {
    console.error("Failed to set Supabase session", error);
    return jsonResponse(500, { error: "Failed to persist authentication session." });
  }

  return jsonResponse(204);
};

