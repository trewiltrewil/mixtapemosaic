import { createClient, SupabaseClient } from "@supabase/supabase-js";

let cachedAdminClient: SupabaseClient | null | undefined;

export function getSupabaseAdminClient() {
  if (cachedAdminClient !== undefined) {
    return cachedAdminClient;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    cachedAdminClient = null;
    return cachedAdminClient;
  }

  cachedAdminClient = createClient(url, key, {
    auth: {
      persistSession: false
    }
  });
  return cachedAdminClient;
}

export function supabaseConfigured() {
  return Boolean(getSupabaseAdminClient());
}
