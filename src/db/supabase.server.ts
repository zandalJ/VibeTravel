import type { AstroCookies } from "astro";
import { createServerClient, type CookieOptionsWithName } from "@supabase/ssr";

import type { Database } from "./database.types";

const cookieOptions: CookieOptionsWithName = {
  path: "/",
  sameSite: "lax",
  httpOnly: true,
  secure: !import.meta.env.DEV,
};

function ensureEnv(name: "SUPABASE_URL" | "SUPABASE_KEY") {
  const value = import.meta.env[name];

  if (!value) {
    throw new Error(
      `Missing environment variable ${name}. Please define it in your .env file to enable Supabase authentication.`,
    );
  }

  return value;
}

function parseCookieHeader(cookieHeader: string) {
  if (!cookieHeader) {
    return [] as { name: string; value: string }[];
  }

  return cookieHeader.split(";").reduce<{ name: string; value: string }[]>((acc, cookie) => {
    const [name, ...value] = cookie.trim().split("=");

    if (!name) {
      return acc;
    }

    acc.push({ name, value: value.join("=") });

    return acc;
  }, []);
}

type CreateSupabaseServerInstanceParams = {
  headers: Headers;
  cookies: AstroCookies;
};

export const createSupabaseServerInstance = ({ headers, cookies }: CreateSupabaseServerInstanceParams) => {
  const supabaseUrl = ensureEnv("SUPABASE_URL");
  const supabaseAnonKey = ensureEnv("SUPABASE_KEY");

  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookieOptions,
    cookies: {
      getAll() {
        return parseCookieHeader(headers.get("cookie") ?? "");
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookies.set(name, value, { ...cookieOptions, ...options });
        });
      },
    },
  });
};

export type SupabaseServerClient = ReturnType<typeof createSupabaseServerInstance>;

export { cookieOptions };

