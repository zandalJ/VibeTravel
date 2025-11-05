import type { APIRoute } from "astro";

import { createSupabaseServerInstance } from "@/db/supabase.server";

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  const supabase = createSupabaseServerInstance({
    cookies,
    headers: request.headers,
  });

  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error("Failed to sign out user", error);
    return new Response(JSON.stringify({ error: "Failed to clear authentication session." }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  return new Response(null, { status: 204 });
};

