import { useEffect } from "react";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";

import { getSupabaseBrowserClient } from "@/db/supabase.client";

const SYNCABLE_EVENTS: AuthChangeEvent[] = [
  "SIGNED_IN",
  "SIGNED_OUT",
  "TOKEN_REFRESHED",
  "PASSWORD_RECOVERY",
];

const shouldSyncEvent = (event: AuthChangeEvent) => SYNCABLE_EVENTS.includes(event);

async function syncAuthState(event: AuthChangeEvent, session: Session | null) {
  if (!shouldSyncEvent(event)) {
    return;
  }

  if (event !== "SIGNED_OUT" && !session) {
    return;
  }

  try {
    const response = await fetch("/api/auth/session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "same-origin",
      body: JSON.stringify(
        session
          ? {
              event,
              session,
            }
          : { event },
      ),
    });

    if (!response.ok) {
      console.error(`Failed to synchronise auth state (${event}):`, await response.text());
    }
  } catch (error) {
    console.error(`Unexpected error while synchronising auth state (${event})`, error);
  }
}

export function SessionSync() {
  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      await syncAuthState(event, session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return null;
}

