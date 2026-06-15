import { getSupabaseAdminClient } from "./supabase";

export type AdminOrderRecord = {
  id: string;
  created_at: string;
  updated_at: string;
  brand_id: string | null;
  stripe_payment_intent_id: string | null;
  stripe_customer_id: string | null;
  customization_session_id: string | null;
  artwork_image_asset_id: string | null;
  customer_artwork_upload_id: string | null;
  preview_snapshot_key: string | null;
  email: string | null;
  amount_total: number | null;
  currency: string | null;
  status: string;
  shipping_address: unknown;
  failure_message: string | null;
  metadata: Record<string, unknown>;
};

export type AdminCustomizationSessionRecord = {
  id: string;
  artwork_image_asset_id: string | null;
  customer_artwork_upload_id: string | null;
  selected_size: string | null;
  artwork_source: string | null;
  artwork_name: string | null;
  artwork_url: string | null;
  metadata: Record<string, unknown>;
  state: Record<string, unknown>;
};

function requireSupabaseAdmin() {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    throw new Error("Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  }
  return supabase;
}

export async function listAdminOrders({
  query,
  limit = 40,
  offset = 0
}: {
  query?: string | null;
  limit?: number;
  offset?: number;
} = {}) {
  const supabase = requireSupabaseAdmin();
  const requestedLimit = Math.max(1, Math.min(limit, 80));
  const start = Math.max(0, offset);
  const end = start + requestedLimit - 1;
  let request = supabase
    .from("orders")
    .select("*", { count: "exact" })
    .eq("brand_id", "mixtape_mosaic")
    .order("created_at", { ascending: false })
    .range(start, end);

  const cleanedQuery = query?.trim().replace(/[%,]/g, " ");
  if (cleanedQuery) {
    const term = `%${cleanedQuery}%`;
    request = request.or(
      [
        `email.ilike.${term}`,
        `status.ilike.${term}`,
        `stripe_payment_intent_id.ilike.${term}`
      ].join(",")
    );
  }

  const { data, error, count } = await request;

  if (error) {
    throw error;
  }

  const orders = (data ?? []) as AdminOrderRecord[];
  return {
    orders,
    hasMore: start + orders.length < (count ?? 0),
    nextOffset: start + orders.length,
    total: count ?? orders.length
  };
}

export async function getAdminOrder(id: string) {
  const supabase = requireSupabaseAdmin();
  const { data, error } = await supabase.from("orders").select("*").eq("id", id).eq("brand_id", "mixtape_mosaic").single();

  if (error) {
    throw error;
  }

  return data as AdminOrderRecord;
}

export async function getAdminCustomizationSession(id: string) {
  const supabase = requireSupabaseAdmin();
  const { data, error } = await supabase
    .from("customization_sessions")
    .select("id,artwork_image_asset_id,customer_artwork_upload_id,selected_size,artwork_source,artwork_name,artwork_url,metadata,state")
    .eq("id", id)
    .single();

  if (error) {
    throw error;
  }

  return data as AdminCustomizationSessionRecord;
}
