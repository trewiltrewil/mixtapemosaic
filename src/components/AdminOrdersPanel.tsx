"use client";

import { useEffect, useMemo, useState } from "react";

type AdminOrder = {
  id: string;
  created_at: string;
  status: string;
  email: string | null;
  amount_total: number | null;
  currency: string | null;
  stripe_payment_intent_id: string | null;
  customization_session_id: string | null;
  artwork_image_asset_id: string | null;
  customer_artwork_upload_id: string | null;
  preview_snapshot_key: string | null;
  metadata: Record<string, string | undefined>;
};

type ProductVariantOption = {
  id: string;
  label: string;
  panelColumns: number;
  panelRows: number;
};

function formatCurrency(cents: number | null, currency: string | null) {
  if (!Number.isFinite(cents ?? NaN)) {
    return "Unknown";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency?.toUpperCase() || "USD"
  }).format((cents ?? 0) / 100);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function orderVariantId(order: AdminOrder) {
  return order.metadata?.product_variant_id || "";
}

function orderArtworkName(order: AdminOrder) {
  return order.metadata?.artwork_name || (order.customer_artwork_upload_id ? "Customer upload" : "Unknown artwork");
}

function orderSourceStatus(order: AdminOrder) {
  if (order.artwork_image_asset_id) {
    return "Curated original linked";
  }
  if (order.customer_artwork_upload_id) {
    return "Customer upload linked";
  }
  return "Source needs manual selection";
}

function clientError(value: unknown) {
  if (value instanceof Error) {
    return value.message;
  }
  if (typeof value === "string") {
    return value;
  }
  try {
    return JSON.stringify(value);
  } catch {
    return "Unknown error";
  }
}

export function AdminOrdersPanel() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [query, setQuery] = useState("");
  const [nextOffset, setNextOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [totalOrders, setTotalOrders] = useState(0);
  const [variants, setVariants] = useState<ProductVariantOption[]>([]);
  const [fallbackVariantId, setFallbackVariantId] = useState("");
  const [dpi, setDpi] = useState(300);
  const [bleedMm, setBleedMm] = useState(1);
  const [mirror, setMirror] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [exportingOrderId, setExportingOrderId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const variantById = useMemo(() => new Map(variants.map((variant) => [variant.id, variant])), [variants]);

  useEffect(() => {
    let active = true;
    fetch("/api/products/variants", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) {
          return [];
        }
        const payload = (await response.json()) as { variants?: ProductVariantOption[] };
        return payload.variants ?? [];
      })
      .then((nextVariants) => {
        if (!active) {
          return;
        }
        setVariants(nextVariants);
        if (nextVariants[0]) {
          setFallbackVariantId((current) => current || nextVariants[0].id);
        }
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      void loadOrders({ reset: true, nextQuery: query });
    }, 250);

    return () => window.clearTimeout(handle);
  }, [query]);

  async function loadOrders({
    reset = false,
    nextQuery = query
  }: {
    reset?: boolean;
    nextQuery?: string;
  } = {}) {
    if (reset) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }
    setError("");

    const params = new URLSearchParams({
      limit: "40",
      offset: String(reset ? 0 : nextOffset)
    });
    if (nextQuery.trim()) {
      params.set("q", nextQuery.trim());
    }

    const response = await fetch(`/api/admin/orders?${params.toString()}`, { cache: "no-store" }).catch(() => null);
    const payload = response
      ? ((await response.json()) as {
          orders?: AdminOrder[];
          hasMore?: boolean;
          nextOffset?: number;
          total?: number;
          error?: string;
        })
      : null;

    if (!response?.ok) {
      setError(payload?.error ?? "Could not load orders.");
      setLoading(false);
      setLoadingMore(false);
      return;
    }

    setOrders((current) => (reset ? payload?.orders ?? [] : [...current, ...(payload?.orders ?? [])]));
    setNextOffset(payload?.nextOffset ?? 0);
    setHasMore(Boolean(payload?.hasMore));
    setTotalOrders(payload?.total ?? payload?.orders?.length ?? 0);
    setLoading(false);
    setLoadingMore(false);
  }

  async function exportOrder(order: AdminOrder) {
    const variantId = orderVariantId(order) || fallbackVariantId;
    if (!variantId) {
      setError("Choose a fallback product variant before exporting this order.");
      return;
    }

    setExportingOrderId(order.id);
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/admin/uv-print/export", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sourceType: "order",
          orderId: order.id,
          productVariantId: variantId,
          dpi,
          bleedMm,
          mirror
        })
      });

      if (!response.ok) {
        const result = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(result?.error ?? "Could not generate UV print export.");
      }

      const blob = await response.blob();
      const disposition = response.headers.get("content-disposition") ?? "";
      const filename = disposition.match(/filename="([^"]+)"/)?.[1] ?? `order-${order.id}-uv-print.zip`;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setMessage(`UV print export generated for order ${order.id.slice(0, 8)}.`);
    } catch (exportError) {
      setError(clientError(exportError) || "Could not generate UV print export.");
    } finally {
      setExportingOrderId(null);
    }
  }

  return (
    <main className="tool-shell image-admin-shell">
      <section className="canvas-panel">
        <div className="panel image-admin-intro">
          <p className="eyebrow">Internal fulfillment</p>
          <h1>Orders & UV print files</h1>
          <p>
            Review paid and pending Mixtape Mosaic orders, confirm the production source image, and
            generate UV printer ZIP files on demand.
          </p>
          <label className="image-admin-search">
            <span>Search orders</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Email, status, payment intent..."
            />
          </label>
          <small className="image-admin-count">
            Showing {orders.length} of {totalOrders || orders.length} order{(totalOrders || orders.length) === 1 ? "" : "s"}
          </small>
        </div>

        <div className="admin-orders-list">
          {loading ? <div className="panel">Loading orders...</div> : null}
          {!loading && orders.length === 0 ? <div className="panel">No orders yet.</div> : null}
          {!loading && orders.map((order) => {
            const variantId = orderVariantId(order);
            const variant = variantById.get(variantId);
            return (
              <article key={order.id} className="panel admin-order-card">
                <div>
                  <p className="eyebrow">{order.status}</p>
                  <h2>{orderArtworkName(order)}</h2>
                  <p>{order.email ?? "No email"} / {formatCurrency(order.amount_total, order.currency)}</p>
                  <small>{formatDate(order.created_at)}</small>
                </div>
                <dl>
                  <div>
                    <dt>Variant</dt>
                    <dd>{variant?.label ?? (variantId || "Needs variant")}</dd>
                  </div>
                  <div>
                    <dt>Source</dt>
                    <dd>{orderSourceStatus(order)}</dd>
                  </div>
                  <div>
                    <dt>Payment</dt>
                    <dd>{order.stripe_payment_intent_id ?? "Missing"}</dd>
                  </div>
                </dl>
                <button
                  type="button"
                  className="primary-button"
                  disabled={exportingOrderId === order.id}
                  onClick={() => void exportOrder(order)}
                >
                  {exportingOrderId === order.id ? "Building UV ZIP..." : "UV export"}
                </button>
              </article>
            );
          })}
        </div>
        {!loading && hasMore ? (
          <button
            type="button"
            className="secondary-button image-admin-load-more"
            disabled={loadingMore}
            onClick={() => void loadOrders()}
          >
            {loadingMore ? "Loading..." : "Load more orders"}
          </button>
        ) : null}
      </section>

      <aside className="control-rail">
        <div className="panel image-admin-form">
          <p className="eyebrow">UV print export</p>
          <h2>Export defaults</h2>
          <label>
            Fallback product layout
            <select value={fallbackVariantId} onChange={(event) => setFallbackVariantId(event.target.value)}>
              {variants.map((variant) => (
                <option key={variant.id} value={variant.id}>
                  {variant.label} / {variant.panelColumns} x {variant.panelRows} panels
                </option>
              ))}
            </select>
          </label>
          <label>
            DPI
            <input type="number" min="72" max="720" value={dpi} onChange={(event) => setDpi(Number(event.target.value) || 300)} />
          </label>
          <label>
            Bleed in mm
            <input type="number" min="0" max="5" step="0.1" value={bleedMm} onChange={(event) => setBleedMm(Number(event.target.value) || 0)} />
          </label>
          <label className="image-admin-checkbox">
            <input type="checkbox" checked={mirror} onChange={(event) => setMirror(event.target.checked)} />
            Mirror output
          </label>
          <small>
            Orders use their saved variant when available. The fallback is only for older records missing variant metadata.
          </small>
          {message ? <p className="status-message">{message}</p> : null}
          {error ? <p className="admin-launcher-error">{error}</p> : null}
        </div>
      </aside>
    </main>
  );
}
