import { createClient } from "@supabase/supabase-js";

import { getSupabaseConfig } from "@/lib/supabase/config";
import type { Database } from "@/lib/types";

export function createPublicClient() {
  const { url, anonKey } = getSupabaseConfig();
  return createClient<Database>(url, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}
