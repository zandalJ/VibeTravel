import {
  createClient,
  type SupabaseClient as SupabaseJsClient,
  type SupabaseClientOptions,
} from "@supabase/supabase-js";

import type { Database } from "./database.types";

let browserClient: SupabaseJsClient<Database> | null = null;

const DEFAULT_OPTIONS: SupabaseClientOptions = {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
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

export type SupabaseClient = SupabaseJsClient<Database>;

export const getSupabaseBrowserClient = () => {
  if (browserClient) {
    return browserClient;
  }

  if (typeof window === "undefined") {
    throw new Error("Supabase browser client can only be instantiated in the browser context.");
  }

  const supabaseUrl = ensureEnv("SUPABASE_URL");
  const supabaseAnonKey = ensureEnv("SUPABASE_KEY");

  browserClient = createClient<Database>(supabaseUrl, supabaseAnonKey, DEFAULT_OPTIONS);

  return browserClient;
};
