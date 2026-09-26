import { createBrowserClient } from "@supabase/ssr";

let client = null;

/**
 * Creates or returns the singleton Supabase client for Client Components.
 * Uses @supabase/ssr which handles cookie-based session persistence
 * automatically. A singleton guarantees state synchronization across renders.
 */
export function createClient() {
  if (!client) {
    client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
  }
  return client;
}

