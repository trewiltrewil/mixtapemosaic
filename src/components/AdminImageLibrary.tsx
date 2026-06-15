"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type ImageAssetStatus = "draft" | "active" | "archived" | "processing" | "failed";

type ImageAsset = {
  id: string;
  title: string;
  description: string | null;
  alt_text: string | null;
  source_type: string;
  source_name: string | null;
  source_url: string | null;
  source_author: string | null;
  source_license: string | null;
  source_downloaded_at: string | null;
  original_storage_key: string;
  original_filename: string;
  original_content_type: string;
  original_width: number | null;
  original_height: number | null;
  original_size_bytes: number | null;
  thumb_url: string | null;
  card_url: string | null;
  preview_url: string | null;
  large_url: string | null;
  cassette_thumb_url: string | null;
  dominant_color: string | null;
  tags: string[];
  categories: string[];
  status: ImageAssetStatus;
  created_at: string;
  updated_at: string;
};

type AssetUploadPayload = {
  title: string;
  description: string | null;
  alt_text: string | null;
  source_type: string;
  source_name: string | null;
  source_url: string | null;
  source_author: string | null;
  source_license: string | null;
  source_downloaded_at: string | null;
  tags: string[];
  categories: string[];
  status: ImageAssetStatus;
};

type BulkUploadItem = {
  id: string;
  name: string;
  size: number;
  status: "queued" | "uploading" | "processing" | "done" | "failed";
  detail: string;
};

type ProductVariantOption = {
  id: string;
  label: string;
  panelColumns: number;
  panelRows: number;
};

const emptyForm = {
  title: "",
  description: "",
  alt_text: "",
  source_type: "manual_upload",
  source_name: "",
  source_url: "",
  source_author: "",
  source_license: "",
  source_downloaded_at: "",
  tags: "",
  categories: "",
  status: "active" as ImageAssetStatus
};

function listToText(list: string[] | null | undefined) {
  return list?.join(", ") ?? "";
}

function textToList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function bytesLabel(bytes: number | null) {
  if (!bytes) {
    return "Unknown";
  }

  const mb = bytes / 1024 / 1024;
  return `${mb.toFixed(mb >= 10 ? 1 : 2)} MB`;
}

function dateInputValue(value: string | null) {
  if (!value) {
    return "";
  }

  return value.slice(0, 10);
}

function bulkItemId(file: File, index: number) {
  return `${file.name}-${file.size}-${file.lastModified}-${index}`;
}

function formatClientError(value: unknown) {
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

export function AdminImageLibrary() {
  const [assets, setAssets] = useState<ImageAsset[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [query, setQuery] = useState("");
  const [nextOffset, setNextOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [totalAssets, setTotalAssets] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkFiles, setBulkFiles] = useState<File[]>([]);
  const [bulkItems, setBulkItems] = useState<BulkUploadItem[]>([]);
  const [uploadPreview, setUploadPreview] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadStage, setUploadStage] = useState("");
  const [backfillRunning, setBackfillRunning] = useState(false);
  const [productVariants, setProductVariants] = useState<ProductVariantOption[]>([]);
  const [uvVariantId, setUvVariantId] = useState("");
  const [uvDpi, setUvDpi] = useState(300);
  const [uvBleedMm, setUvBleedMm] = useState(1);
  const [uvMirror, setUvMirror] = useState(false);
  const [uvExportingId, setUvExportingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const selectedAsset = useMemo(
    () => assets.find((asset) => asset.id === selectedId) ?? null,
    [assets, selectedId]
  );

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
      .then((variants) => {
        if (!active) {
          return;
        }
        setProductVariants(variants);
        if (variants[0]) {
          setUvVariantId((current) => current || variants[0].id);
        }
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      void loadAssets({ reset: true, nextQuery: query });
    }, 250);

    return () => window.clearTimeout(handle);
  }, [query]);

  useEffect(() => {
    if (!file) {
      setUploadPreview("");
      return;
    }

    const url = URL.createObjectURL(file);
    setUploadPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function publicCustomizerUrl(assetId: string) {
    if (typeof window === "undefined") {
      return `/customize?artwork=${assetId}`;
    }

    const url = new URL(window.location.origin);
    if (url.hostname.startsWith("admin.")) {
      url.hostname = url.hostname.replace(/^admin\./, "www.");
    }
    url.pathname = "/customize";
    url.search = `?artwork=${encodeURIComponent(assetId)}`;
    return url.toString();
  }

  async function copyArtworkLink(asset: ImageAsset) {
    const link = publicCustomizerUrl(asset.id);
    try {
      await navigator.clipboard.writeText(link);
      setMessage(`Copied customizer link for ${asset.title}.`);
      setError("");
    } catch {
      setError(`Could not copy link. Use: ${link}`);
    }
  }

  async function loadAssets({
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
      limit: "48",
      offset: String(reset ? 0 : nextOffset)
    });
    if (nextQuery.trim()) {
      params.set("q", nextQuery.trim());
    }

    const response = await fetch(`/api/admin/images?${params.toString()}`, { cache: "no-store" }).catch(() => null);
    const payload = response
      ? ((await response.json()) as {
          assets?: ImageAsset[];
          hasMore?: boolean;
          nextOffset?: number;
          total?: number;
          error?: string;
        })
      : null;

    if (!response?.ok) {
      setError(payload?.error ?? "Could not load customizer artwork.");
      setLoading(false);
      setLoadingMore(false);
      return;
    }

    setAssets((current) => (reset ? payload?.assets ?? [] : [...current, ...(payload?.assets ?? [])]));
    setNextOffset(payload?.nextOffset ?? 0);
    setHasMore(Boolean(payload?.hasMore));
    setTotalAssets(payload?.total ?? payload?.assets?.length ?? 0);
    setLoading(false);
    setLoadingMore(false);
  }

  function selectAsset(asset: ImageAsset) {
    setSelectedId(asset.id);
    setFile(null);
    setBulkMode(false);
    setBulkFiles([]);
    setBulkItems([]);
    setForm({
      title: asset.title,
      description: asset.description ?? "",
      alt_text: asset.alt_text ?? "",
      source_type: asset.source_type,
      source_name: asset.source_name ?? "",
      source_url: asset.source_url ?? "",
      source_author: asset.source_author ?? "",
      source_license: asset.source_license ?? "",
      source_downloaded_at: dateInputValue(asset.source_downloaded_at),
      tags: listToText(asset.tags),
      categories: listToText(asset.categories),
      status: asset.status
    });
  }

  function startNewUpload() {
    setSelectedId(null);
    setFile(null);
    setBulkMode(false);
    setBulkFiles([]);
    setBulkItems([]);
    setForm(emptyForm);
    setMessage("");
    setError("");
  }

  function startBulkUpload() {
    setSelectedId(null);
    setFile(null);
    setBulkMode(true);
    setBulkFiles([]);
    setBulkItems([]);
    setForm(emptyForm);
    setMessage("");
    setError("");
  }

  function updateField(name: keyof typeof emptyForm, value: string) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  function metadataPayload(): AssetUploadPayload {
    return {
      ...form,
      description: form.description || null,
      alt_text: form.alt_text || null,
      source_name: form.source_name || null,
      source_url: form.source_url || null,
      source_author: form.source_author || null,
      source_license: form.source_license || null,
      source_downloaded_at: form.source_downloaded_at || null,
      tags: textToList(form.tags),
      categories: textToList(form.categories)
    };
  }

  function chooseBulkFiles(fileList: FileList | null) {
    const files = Array.from(fileList ?? []).filter((candidate) => candidate.type.startsWith("image/"));
    setBulkFiles(files);
    setBulkItems(
      files.map((candidate, index) => ({
        id: bulkItemId(candidate, index),
        name: candidate.name,
        size: candidate.size,
        status: "queued",
        detail: "Ready"
      }))
    );
    setMessage(files.length ? `${files.length} image${files.length === 1 ? "" : "s"} queued.` : "");
    setError(files.length ? "" : "Choose one or more image files.");
  }

  function updateBulkItem(id: string, patch: Partial<BulkUploadItem>) {
    setBulkItems((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  async function uploadImageFile({
    imageFile,
    payload,
    onStage
  }: {
    imageFile: File;
    payload: AssetUploadPayload;
    onStage: (stage: "uploading" | "processing", detail: string) => void;
  }) {
    onStage("uploading", "Preparing private R2 upload...");
    const prepareResponse = await fetch("/api/admin/images/upload-url", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        filename: imageFile.name,
        contentType: imageFile.type || "application/octet-stream",
        sizeBytes: imageFile.size
      })
    });
    const prepareResult = (await prepareResponse.json()) as {
      id?: string;
      originalStorageKey?: string;
      uploadUrl?: string;
      contentType?: string;
      error?: string;
    };

    if (!prepareResponse.ok || !prepareResult.id || !prepareResult.originalStorageKey || !prepareResult.uploadUrl) {
      throw new Error(formatClientError(prepareResult.error ?? "Could not prepare image upload."));
    }

    onStage("uploading", "Uploading original directly to private R2...");
    const uploadResponse = await fetch(prepareResult.uploadUrl, {
      method: "PUT",
      headers: { "content-type": prepareResult.contentType ?? imageFile.type ?? "application/octet-stream" },
      body: imageFile
    });

    if (!uploadResponse.ok) {
      throw new Error("R2 rejected the original image upload. Check bucket CORS and token access.");
    }

    onStage("processing", "Generating AI metadata and web derivatives...");
    const completeResponse = await fetch("/api/admin/images/complete-upload", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...payload,
        id: prepareResult.id,
        originalStorageKey: prepareResult.originalStorageKey,
        originalFilename: imageFile.name,
        originalContentType: prepareResult.contentType ?? imageFile.type ?? "application/octet-stream",
        originalSizeBytes: imageFile.size
      })
    });
    const result = (await completeResponse.json()) as { asset?: ImageAsset; error?: string };

    if (!completeResponse.ok || !result.asset) {
      throw new Error(formatClientError(result.error ?? "Could not process uploaded image asset."));
    }

    return result.asset;
  }

  async function submitBulkUpload(payload: AssetUploadPayload) {
    if (bulkFiles.length === 0) {
      setError("Choose one or more image files before starting the bulk upload.");
      return;
    }

    setSaving(true);
    setUploadStage(`Uploading 0 of ${bulkFiles.length}...`);
    setMessage("");
    setError("");

    const created: ImageAsset[] = [];
    let completed = 0;
    let failed = 0;
    let nextIndex = 0;
    const workerCount = Math.min(2, bulkFiles.length);

    async function worker() {
      while (nextIndex < bulkFiles.length) {
        const index = nextIndex;
        nextIndex += 1;
        const imageFile = bulkFiles[index];
        const itemId = bulkItemId(imageFile, index);

        try {
          const asset = await uploadImageFile({
            imageFile,
            payload,
            onStage: (stage, detail) => updateBulkItem(itemId, { status: stage, detail })
          });
          created.push(asset);
          completed += 1;
          updateBulkItem(itemId, { status: "done", detail: asset.title });
        } catch (uploadError) {
          failed += 1;
          updateBulkItem(itemId, {
            status: "failed",
            detail: formatClientError(uploadError) || "Upload failed"
          });
        } finally {
          setUploadStage(`Uploaded ${completed} of ${bulkFiles.length}${failed ? `, ${failed} failed` : ""}.`);
        }
      }
    }

    await Promise.all(Array.from({ length: workerCount }, () => worker()));

    if (created.length) {
      setAssets((current) => [...created, ...current]);
    }

    setMessage(
      `${completed} image${completed === 1 ? "" : "s"} uploaded${failed ? `, ${failed} failed` : ""}.`
    );
    setUploadStage("");
    setSaving(false);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setUploadStage("");
    setMessage("");
    setError("");

    const payload = metadataPayload();

    if (!selectedAsset && bulkMode) {
      setSaving(false);
      await submitBulkUpload(payload);
      return;
    }

    if (selectedAsset) {
      try {
        const response = await fetch(`/api/admin/images/${selectedAsset.id}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload)
        });
        const result = (await response.json()) as { asset?: ImageAsset; error?: string };

        if (!response.ok || !result.asset) {
          setError(formatClientError(result.error ?? "Could not update image metadata."));
          return;
        }

        setAssets((current) => current.map((asset) => (asset.id === result.asset?.id ? result.asset : asset)));
        setMessage("Metadata saved.");
      } catch {
        setError("Could not update image metadata.");
      } finally {
        setSaving(false);
      }
      return;
    }

    if (!file) {
      setError("Choose an image file before uploading.");
      setSaving(false);
      return;
    }

    try {
      const asset = await uploadImageFile({
        imageFile: file,
        payload,
        onStage: (_stage, detail) => setUploadStage(detail)
      });

      setAssets((current) => [asset, ...current]);
      selectAsset(asset);
      setMessage("Image uploaded and web derivatives generated.");
    } catch (uploadError) {
      setError(formatClientError(uploadError) || "Could not upload image asset.");
    } finally {
      setUploadStage("");
      setSaving(false);
    }
  }

  async function archiveSelected() {
    if (!selectedAsset) {
      return;
    }

    setSaving(true);
    setMessage("");
    setError("");

    const response = await fetch(`/api/admin/images/${selectedAsset.id}/archive`, {
      method: "POST"
    }).catch(() => null);
    const result = response ? ((await response.json()) as { asset?: ImageAsset; error?: string }) : null;

    if (!response?.ok || !result?.asset) {
      setError(result?.error ?? "Could not archive image.");
      setSaving(false);
      return;
    }

    setAssets((current) => current.map((asset) => (asset.id === result.asset?.id ? result.asset : asset)));
    selectAsset(result.asset);
    setMessage("Image archived.");
    setSaving(false);
  }

  async function backfillCassetteThumbs() {
    setBackfillRunning(true);
    setMessage("");
    setError("");
    let totalUpdated = 0;
    let totalFailed = 0;
    let offset = 0;
    let hasMore = true;

    try {
      while (hasMore) {
        setUploadStage(`Regenerating cassette thumbnails... ${totalUpdated} done${totalFailed ? `, ${totalFailed} failed` : ""}.`);
        const response = await fetch("/api/admin/images/backfill-cassette-thumbs", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ force: true, limit: 4, offset })
        });
        const result = (await response.json()) as {
          updated?: ImageAsset[];
          failed?: Array<{ id: string; error: string }>;
          processed?: number;
          hasMore?: boolean;
          error?: string;
        };

        if (!response.ok) {
          throw new Error(formatClientError(result.error ?? "Could not generate cassette thumbnails."));
        }

        const updated = result.updated ?? [];
        const processed = result.processed ?? updated.length + (result.failed?.length ?? 0);
        totalUpdated += updated.length;
        totalFailed += result.failed?.length ?? 0;
        offset += processed;
        hasMore = Boolean(result.hasMore && processed > 0);
        if (updated.length) {
          setAssets((current) =>
            current.map((asset) => updated.find((candidate) => candidate.id === asset.id) ?? asset)
          );
        }
      }

      setMessage(`Cassette thumbnail regeneration complete. ${totalUpdated} updated${totalFailed ? `, ${totalFailed} failed` : ""}.`);
    } catch (backfillError) {
      setError(formatClientError(backfillError) || "Could not generate cassette thumbnails.");
    } finally {
      setUploadStage("");
      setBackfillRunning(false);
    }
  }

  async function exportUvForAsset(asset: ImageAsset) {
    if (!uvVariantId) {
      setError("Choose a product variant before exporting UV print files.");
      return;
    }

    setUvExportingId(asset.id);
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/admin/uv-print/export", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sourceType: "image_asset",
          imageAssetId: asset.id,
          productVariantId: uvVariantId,
          dpi: uvDpi,
          bleedMm: uvBleedMm,
          mirror: uvMirror
        })
      });

      if (!response.ok) {
        const result = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(result?.error ?? "Could not generate UV print export.");
      }

      const blob = await response.blob();
      const disposition = response.headers.get("content-disposition") ?? "";
      const filename = disposition.match(/filename="([^"]+)"/)?.[1] ?? `${asset.title}-uv-print.zip`;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setMessage(`UV print export generated for ${asset.title}.`);
    } catch (exportError) {
      setError(formatClientError(exportError) || "Could not generate UV print export.");
    } finally {
      setUvExportingId(null);
    }
  }

  return (
    <main className="tool-shell image-admin-shell">
      <section className="canvas-panel">
        <div className="panel image-admin-intro">
          <p className="eyebrow">Internal customizer library</p>
          <h1>Customizer artwork</h1>
          <p>
            Upload approved configurator artwork once, keep the full-resolution original private for
            future print production, and serve WebP derivatives to the public cassette customizer.
          </p>
          <label className="image-admin-search">
            <span>Search artwork</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Title, artist, filename, source..."
            />
          </label>
          <small className="image-admin-count">
            Showing {assets.length} of {totalAssets || assets.length} image{(totalAssets || assets.length) === 1 ? "" : "s"}
          </small>
        </div>

        <div className="image-admin-grid">
          {loading ? <div className="panel">Loading customizer artwork...</div> : null}
          {!loading && assets.length === 0 ? (
            <div className="panel">No customizer artwork yet. Upload the first approved image to seed the cassette configurator.</div>
          ) : null}

          {!loading && assets.map((asset) => (
            <article
              key={asset.id}
              className={`image-admin-card ${selectedId === asset.id ? "selected" : ""}`}
            >
              <button type="button" className="image-admin-card-main" onClick={() => selectAsset(asset)}>
                <span className={`asset-status asset-status-${asset.status}`}>{asset.status}</span>
                {asset.thumb_url ? (
                  <img src={asset.thumb_url} alt={asset.alt_text ?? asset.title} loading="lazy" />
                ) : (
                  <span className="asset-empty-thumb">No preview</span>
                )}
                <span>
                  <strong>{asset.title}</strong>
                  <small>{asset.source_author || asset.source_name || asset.source_type}</small>
                </span>
                <span className="asset-tags">{[...asset.categories, ...asset.tags].slice(0, 4).join(" / ")}</span>
                <small className="asset-tags">{asset.cassette_thumb_url ? "Cassette thumb ready" : "Needs cassette thumb"}</small>
              </button>
              <button
                type="button"
                className="image-admin-copy-link"
                onClick={() => void copyArtworkLink(asset)}
              >
                Copy customizer link
              </button>
              <button
                type="button"
                className="image-admin-copy-link"
                disabled={uvExportingId === asset.id}
                onClick={() => void exportUvForAsset(asset)}
              >
                {uvExportingId === asset.id ? "Building UV ZIP..." : "UV export"}
              </button>
            </article>
          ))}
        </div>
        {!loading && hasMore ? (
          <button
            type="button"
            className="secondary-button image-admin-load-more"
            disabled={loadingMore}
            onClick={() => void loadAssets()}
          >
            {loadingMore ? "Loading..." : "Load more artwork"}
          </button>
        ) : null}
      </section>

      <aside className="control-rail">
        <div className="panel">
          <div className="image-admin-actions">
            <div>
              <p className="eyebrow">{selectedAsset ? "Edit metadata" : "Upload new"}</p>
              <h2>{selectedAsset ? selectedAsset.title : "New image"}</h2>
            </div>
            <button type="button" className="primary-button image-admin-new-button" onClick={startNewUpload}>
              New
            </button>
            <button type="button" className="secondary-button image-admin-new-button" onClick={startBulkUpload}>
              Bulk
            </button>
          </div>
          <button
            type="button"
            className="secondary-button image-admin-backfill-button"
            disabled={backfillRunning}
            onClick={() => void backfillCassetteThumbs()}
          >
            {backfillRunning ? "Building cassette thumbs..." : "Regenerate cassette thumbs"}
          </button>

          {message ? <p className="status-message">{message}</p> : null}
          {uploadStage ? <p className="status-message">{uploadStage}</p> : null}
          {error ? <p className="admin-launcher-error">{error}</p> : null}
        </div>

        <div className="panel image-admin-form">
          <p className="eyebrow">UV print export</p>
          <h2>Print slicing</h2>
          <label>
            Product layout
            <select value={uvVariantId} onChange={(event) => setUvVariantId(event.target.value)}>
              {productVariants.map((variant) => (
                <option key={variant.id} value={variant.id}>
                  {variant.label} / {variant.panelColumns} x {variant.panelRows} panels
                </option>
              ))}
            </select>
          </label>
          <label>
            DPI
            <input
              type="number"
              min="72"
              max="720"
              value={uvDpi}
              onChange={(event) => setUvDpi(Number(event.target.value) || 300)}
            />
          </label>
          <label>
            Bleed in mm
            <input
              type="number"
              min="0"
              max="5"
              step="0.1"
              value={uvBleedMm}
              onChange={(event) => setUvBleedMm(Number(event.target.value) || 0)}
            />
          </label>
          <label className="image-admin-checkbox">
            <input
              type="checkbox"
              checked={uvMirror}
              onChange={(event) => setUvMirror(event.target.checked)}
            />
            Mirror output
          </label>
          <small>
            Exports include two-panel sheets, one-panel sheets, individual cassette backups, and a manifest.
          </small>
        </div>

        <form className="panel image-admin-form" onSubmit={submit}>
          {!selectedAsset && bulkMode ? (
            <label className="image-admin-file">
              <span>Bulk source images</span>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(event) => chooseBulkFiles(event.target.files)}
              />
              <small>
                Uses the shared metadata below as defaults. Leave title, description, and alt text blank
                to let AI generate them per image.
              </small>
              {bulkItems.length ? (
                <div className="bulk-upload-list">
                  {bulkItems.map((item) => (
                    <div key={item.id} className={`bulk-upload-item bulk-upload-item-${item.status}`}>
                      <span>{item.name}</span>
                      <small>
                        {bytesLabel(item.size)} / {item.status} / {item.detail}
                      </small>
                    </div>
                  ))}
                </div>
              ) : null}
            </label>
          ) : !selectedAsset ? (
            <label className="image-admin-file">
              <span>Original source image</span>
              <input
                type="file"
                accept="image/*"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              />
              {uploadPreview ? <img src={uploadPreview} alt="Selected upload preview" /> : null}
            </label>
          ) : (
            <div className="image-admin-original">
              <span>Private original</span>
              <strong>{selectedAsset.original_filename}</strong>
              <small>
                {selectedAsset.original_width ?? "?"} x {selectedAsset.original_height ?? "?"} px,
                {" "}{bytesLabel(selectedAsset.original_size_bytes)}
              </small>
              <code>{selectedAsset.original_storage_key}</code>
            </div>
          )}

          <label>
            Title
            <input
              value={form.title}
              onChange={(event) => updateField("title", event.target.value)}
              placeholder="Auto-generated if blank"
            />
          </label>
          <label>
            Description
            <textarea rows={3} value={form.description} onChange={(event) => updateField("description", event.target.value)} />
          </label>
          <label>
            Alt text
            <input value={form.alt_text} onChange={(event) => updateField("alt_text", event.target.value)} />
          </label>

          <div className="two-col">
            <label>
              Source type
              <input value={form.source_type} onChange={(event) => updateField("source_type", event.target.value)} />
            </label>
            <label>
              Status
              <select value={form.status} onChange={(event) => updateField("status", event.target.value)}>
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="archived">Archived</option>
                <option value="processing">Processing</option>
                <option value="failed">Failed</option>
              </select>
            </label>
          </div>

          <label>
            Source name
            <input value={form.source_name} onChange={(event) => updateField("source_name", event.target.value)} />
          </label>
          <label>
            Source URL
            <input type="url" value={form.source_url} onChange={(event) => updateField("source_url", event.target.value)} />
          </label>

          <div className="two-col">
            <label>
              Author
              <input value={form.source_author} onChange={(event) => updateField("source_author", event.target.value)} />
            </label>
            <label>
              License
              <input value={form.source_license} onChange={(event) => updateField("source_license", event.target.value)} />
            </label>
          </div>

          <label>
            Downloaded date
            <input
              type="date"
              value={form.source_downloaded_at}
              onChange={(event) => updateField("source_downloaded_at", event.target.value)}
            />
          </label>

          <div className="two-col">
            <label>
              Tags
              <input value={form.tags} onChange={(event) => updateField("tags", event.target.value)} placeholder="beach, sunset" />
            </label>
            <label>
              Categories
              <input value={form.categories} onChange={(event) => updateField("categories", event.target.value)} placeholder="landscape, music" />
            </label>
          </div>

          {selectedAsset ? (
            <div className="image-admin-derivatives">
              {[
                ["Thumb", selectedAsset.thumb_url],
                ["Card", selectedAsset.card_url],
                ["Preview", selectedAsset.preview_url],
                ["Large", selectedAsset.large_url],
                ["Cassette", selectedAsset.cassette_thumb_url]
              ].map(([label, url]) => (
                <a key={label} href={url ?? "#"} target="_blank" rel="noreferrer" aria-disabled={!url}>
                  {label}
                </a>
              ))}
            </div>
          ) : null}

          <button type="submit" className="primary-button" disabled={saving}>
            {saving
              ? uploadStage || "Saving..."
              : selectedAsset
                ? "Save metadata"
                : bulkMode
                  ? "Start bulk upload"
                  : "Upload image"}
          </button>
          {selectedAsset ? (
            <button type="button" className="secondary-button" disabled={saving} onClick={archiveSelected}>
              Archive image
            </button>
          ) : null}
        </form>
      </aside>
    </main>
  );
}
