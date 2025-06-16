import { createBrowserClient } from "@supabase/ssr";
import { createClient as createServerClient } from "@supabase/supabase-js";
import type { SupabaseClientOptions } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  // If executing in the browser, use the standard browser client which handles
  // persisting the auth session automatically via localStorage.
  if (typeof window !== "undefined") {
    return createBrowserClient<Database>(supabaseUrl, supabaseKey);
  }

  // On the server (during the initial render in the App Router), fall back to a
  // lightweight server-side client that omits session persistence. This avoids
  // "window is not defined" or "localStorage is not defined" errors during
  // server-side rendering while still allowing the object to be instantiated
  // (it will not be used until the component hydrates on the client).
  const opts: SupabaseClientOptions<"public"> = {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  };

  return createServerClient<Database>(supabaseUrl, supabaseKey, opts);
}
