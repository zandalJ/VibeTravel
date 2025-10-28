/// <reference types="astro/client" />

import type { SupabaseClient } from "./db/supabase.client";
import type { Session, User } from "@supabase/supabase-js";

declare global {
  namespace App {
    interface Locals {
      supabase: SupabaseClient;
      session: Session | null;
      user: User | null;
    }
  }
}

interface ImportMetaEnv {
  readonly SUPABASE_URL: string;
  readonly SUPABASE_KEY: string;
  readonly OPENROUTER_API_KEY: string;
  readonly PUBLIC_SITE_URL?: string;
  readonly PUBLIC_APP_NAME?: string;
  // more env variables...
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
