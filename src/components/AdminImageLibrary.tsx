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
  dominant_color: string | null;
  tags: string[];
  categories: string[];
  status: ImageAssetStatus;
  created_at: string;
  updated_at: string;
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

export function AdminImageLibrary() {
  const [assets, setAssets] = useState<ImageAsset[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [file, setFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadStage, setUploadStage] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const selectedAsset = useMemo(
    () => assets.find((asset) => asset.id === selectedId) ?? null,
    [assets, selectedId]
  );

  useEffect(() => {
    void loadAssets();
  }, []);

  useEffect(() => {
    if (!file) {
      setUploadPreview("");
      return;
    }

    const url = URL.createObjectURL(file);
    setUploadPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  async function loadAssets() {
    setLoading(true);
    setError("");

    const response = await fetch("/api/admin/images", { cache: "no-store" }).catch(() => null);
    const payload = response ? ((await response.json()) as { assets?: ImageAsset[]; error?: string }) : null;

    if (!response?.ok) {
      setError(payload?.error ?? "Could not load customizer artwork.");
      setLoading(false);
      return;
    }

    setAssets(payload?.assets ?? []);
    setLoading(false);
  }

  function selectAsset(asset: ImageAsset) {
    setSelectedId(asset.id);
    setFile(null);
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
    setForm(emptyForm);
    setMessage("");
    setError("");
  }

  function updateField(name: keyof typeof emptyForm, value: string) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setUploadStage("");
    setMessage("");
    setError("");

    const payload = {
      ...form,
      tags: textToList(form.tags),
      categories: textToList(form.categories)
    };

    if (selectedAsset) {
      try {
        const response = await fetch(`/api/admin/images/${selectedAsset.id}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload)
        });
        const result = (await response.json()) as { asset?: ImageAsset; error?: string };

        if (!response.ok || !result.asset) {
          setError(result.error ?? "Could not update image metadata.");
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
      setUploadStage("Preparing private R2 upload...");
      const prepareResponse = await fetch("/api/admin/images/upload-url", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type || "application/octet-stream",
          sizeBytes: file.size
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
        setError(prepareResult.error ?? "Could not prepare image upload.");
        return;
      }

      setUploadStage("Uploading original directly to private R2...");
      const uploadResponse = await fetch(prepareResult.uploadUrl, {
        method: "PUT",
        headers: { "content-type": prepareResult.contentType ?? file.type ?? "application/octet-stream" },
        body: file
      });

      if (!uploadResponse.ok) {
        setError("R2 rejected the original image upload. Check bucket CORS and token access.");
        return;
      }

      setUploadStage("Generating AI metadata and web derivatives...");
      const completeResponse = await fetch("/api/admin/images/complete-upload", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...payload,
          id: prepareResult.id,
          originalStorageKey: prepareResult.originalStorageKey,
          originalFilename: file.name,
          originalContentType: prepareResult.contentType ?? file.type ?? "application/octet-stream",
          originalSizeBytes: file.size
        })
      });
      const result = (await completeResponse.json()) as { asset?: ImageAsset; error?: string };

      if (!completeResponse.ok || !result.asset) {
        setError(result.error ?? "Could not process uploaded image asset.");
        return;
      }

      setAssets((current) => [result.asset as ImageAsset, ...current]);
      selectAsset(result.asset);
      setMessage("Image uploaded and web derivatives generated.");
    } catch {
      setError("Could not upload image asset.");
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
        </div>

        <div className="image-admin-grid">
          {loading ? <div className="panel">Loading customizer artwork...</div> : null}
          {!loading && assets.length === 0 ? (
            <div className="panel">No customizer artwork yet. Upload the first approved image to seed the cassette configurator.</div>
          ) : null}

          {assets.map((asset) => (
            <button
              key={asset.id}
              type="button"
              className={`image-admin-card ${selectedId === asset.id ? "selected" : ""}`}
              onClick={() => selectAsset(asset)}
            >
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
            </button>
          ))}
        </div>
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
          </div>

          {message ? <p className="status-message">{message}</p> : null}
          {uploadStage ? <p className="status-message">{uploadStage}</p> : null}
          {error ? <p className="admin-launcher-error">{error}</p> : null}
        </div>

        <form className="panel image-admin-form" onSubmit={submit}>
          {!selectedAsset ? (
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
                ["Large", selectedAsset.large_url]
              ].map(([label, url]) => (
                <a key={label} href={url ?? "#"} target="_blank" rel="noreferrer" aria-disabled={!url}>
                  {label}
                </a>
              ))}
            </div>
          ) : null}

          <button type="submit" className="primary-button" disabled={saving}>
            {saving ? uploadStage || "Saving..." : selectedAsset ? "Save metadata" : "Upload image"}
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
