"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { getProductPhoto, type ProductLayoutKey } from "@/lib/assets";
import { useCart } from "@/components/CartProvider";
import { createPrototypeCalibration, normalizeCalibration } from "@/lib/calibration";
import { defaultProductionConfig } from "@/lib/geometry";
import { loadImage, type LoadedImage } from "@/lib/image";
import { drawRealisticPreview } from "@/lib/preview-renderer";
import type { ArtworkOption, ProductCalibration } from "@/lib/types";

type ArtworkSource = "curated" | "upload";
type ArtworkPanel = "curated" | "upload" | "search";

type PublicImageAsset = {
  id: string;
  title: string;
  description: string | null;
  alt_text: string | null;
  source_author: string | null;
  source_name: string | null;
  thumb_url: string | null;
  card_url: string | null;
  preview_url: string | null;
  large_url: string | null;
  dominant_color: string | null;
  blurhash: string | null;
  tags: string[];
  categories: string[];
};

type CustomerUploadResult = {
  upload?: {
    id: string;
  };
  error?: string;
};

const sizes: Array<{
  id: string;
  label: string;
  layout: ProductLayoutKey;
  columns: number;
  rows: number;
  aspectRatio: string;
}> = [
  { id: "square", label: '9 Panel Square (28"x28")', layout: "square", columns: 6, rows: 9, aspectRatio: "1 / 1" },
  { id: "landscape", label: 'Landscape (45"x24")', layout: "landscape", columns: 8, rows: 9, aspectRatio: "1630 / 1254" },
  { id: "portrait", label: 'Portrait (27"x45")', layout: "square", columns: 6, rows: 9, aspectRatio: "1 / 1" }
];

function artistLabel(asset: PublicImageAsset) {
  return asset.source_author || asset.source_name || "Mixtape Mosaic";
}

function displayTags(asset: PublicImageAsset) {
  return [...(asset.tags ?? []), ...(asset.categories ?? [])].filter((tag) => tag.toLowerCase() !== "curated");
}

function assetCredit(asset: PublicImageAsset) {
  const parts = [artistLabel(asset), ...displayTags(asset).slice(0, 2)];
  return parts.join(" / ");
}

function assetToOption(asset: PublicImageAsset): ArtworkOption | null {
  const src = asset.preview_url ?? asset.large_url ?? asset.card_url ?? asset.thumb_url;
  if (!src) {
    return null;
  }

  return {
    id: `asset-${asset.id}`,
    name: asset.title,
    src,
    thumbSrc: asset.thumb_url ?? asset.card_url ?? src,
    credit: assetCredit(asset),
    artist: artistLabel(asset),
    tags: asset.tags ?? [],
    categories: asset.categories ?? []
  };
}

function canvasToDataUrl(canvas: HTMLCanvasElement, maxSize = 900) {
  const scale = Math.min(1, maxSize / Math.max(canvas.width, canvas.height));
  const output = document.createElement("canvas");
  output.width = Math.max(1, Math.round(canvas.width * scale));
  output.height = Math.max(1, Math.round(canvas.height * scale));
  const context = output.getContext("2d");
  if (!context) {
    return canvas.toDataURL("image/webp", 0.82);
  }

  context.drawImage(canvas, 0, 0, output.width, output.height);
  return output.toDataURL("image/webp", 0.82);
}

async function dataUrlToBlob(dataUrl: string) {
  const response = await fetch(dataUrl);
  return response.blob();
}

export function Customizer() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { addItem } = useCart();
  const [calibration, setCalibration] = useState<ProductCalibration>(() => createPrototypeCalibration());
  const [artworkSrc, setArtworkSrc] = useState("");
  const [artworkName, setArtworkName] = useState("Choose artwork");
  const [artworkSource, setArtworkSource] = useState<ArtworkSource>("curated");
  const [artworkPanel, setArtworkPanel] = useState<ArtworkPanel>("curated");
  const [libraryOptions, setLibraryOptions] = useState<ArtworkOption[]>([]);
  const [searchResults, setSearchResults] = useState<ArtworkOption[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOffset, setSearchOffset] = useState(0);
  const [searchHasMore, setSearchHasMore] = useState(false);
  const [searchStatus, setSearchStatus] = useState("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [customerArtworkUploadId, setCustomerArtworkUploadId] = useState<string | null>(null);
  const [selectedSizeId, setSelectedSizeId] = useState(sizes[0].id);
  const [artwork, setArtwork] = useState<LoadedImage | null>(null);
  const [photo, setPhoto] = useState<LoadedImage | null>(null);
  const [cartStatus, setCartStatus] = useState("");
  const selectedSize = sizes.find((size) => size.id === selectedSizeId) ?? sizes[0];
  const selectedLayout = selectedSize.layout;
  const allArtworkOptions = useMemo(() => [...libraryOptions, ...searchResults], [libraryOptions, searchResults]);
  const previewConfig = useMemo(
    () => ({
      ...defaultProductionConfig,
      columns: selectedSize.columns,
      rows: selectedSize.rows
    }),
    [selectedSize.columns, selectedSize.rows]
  );

  useEffect(() => {
    let active = true;
    fetch("/api/images?curatedOnly=true&limit=6&offset=0", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) {
          return [];
        }

        const payload = (await response.json()) as { assets?: PublicImageAsset[] };
        return payload.assets ?? [];
      })
      .then((assets) => {
        if (!active) {
          return;
        }

        const options = assets.map(assetToOption).filter((asset): asset is ArtworkOption => Boolean(asset));
        setLibraryOptions(options);
        if (!artworkSrc && options[0]) {
          setArtworkSrc(options[0].src);
          setArtworkName(options[0].name);
          setArtworkSource("curated");
        }
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    const productPhoto = getProductPhoto(selectedLayout);
    loadImage(productPhoto.src).then((image) => {
      if (active) {
        setPhoto(image);
      }
    });
    return () => {
      active = false;
    };
  }, [selectedLayout]);

  useEffect(() => {
    let active = true;
    setCalibration(createPrototypeCalibration(selectedLayout));

    fetch(`/api/calibration?layout=${selectedLayout}&ts=${Date.now()}`, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) {
          return null;
        }
        return (await response.json()) as ProductCalibration;
      })
      .then((saved) => {
        if (active && saved?.tapes?.length) {
          setCalibration(normalizeCalibration(saved));
        }
      })
      .catch(() => {
        // The seeded calibration is valid when no saved calibration exists.
      });

    return () => {
      active = false;
    };
  }, [selectedLayout]);

  useEffect(() => {
    if (!artworkSrc) {
      setArtwork(null);
      return;
    }

    let active = true;
    loadImage(artworkSrc).then((image) => {
      if (active) {
        setArtwork(image);
      }
    });
    return () => {
      active = false;
    };
  }, [artworkSrc]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const render = () => {
      const bounds = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(bounds.width * dpr));
      canvas.height = Math.max(1, Math.round(bounds.height * dpr));
      const context = canvas.getContext("2d");
      if (!context) {
        return;
      }
      drawRealisticPreview(
        context,
        artwork,
        photo,
        calibration,
        canvas.width,
        canvas.height,
        previewConfig,
        false
      );
    };

    render();
    window.addEventListener("resize", render);
    return () => window.removeEventListener("resize", render);
  }, [artwork, photo, calibration, previewConfig]);

  function handleUpload(file: File | undefined) {
    if (!file) {
      return;
    }
    const previousObjectUrl = artworkSource === "upload" && artworkSrc.startsWith("blob:") ? artworkSrc : null;
    const objectUrl = URL.createObjectURL(file);
    setUploadedFile(file);
    setCustomerArtworkUploadId(null);
    setArtworkSrc(objectUrl);
    setArtworkName(file.name);
    setArtworkSource("upload");
    setArtworkPanel("upload");
    if (previousObjectUrl) {
      URL.revokeObjectURL(previousObjectUrl);
    }
  }

  async function searchArtwork(nextOffset = 0) {
    const query = searchQuery.trim();
    setArtworkPanel("search");
    setSearchStatus(query ? "Digging through the crates..." : "Loading artwork...");

    const params = new URLSearchParams({
      limit: "6",
      offset: String(nextOffset)
    });
    if (query) {
      params.set("q", query);
    }

    const response = await fetch(`/api/images?${params.toString()}`, { cache: "no-store" }).catch(() => null);
    const payload = response?.ok ? ((await response.json()) as { assets?: PublicImageAsset[] }) : null;
    const options = (payload?.assets ?? []).map(assetToOption).filter((asset): asset is ArtworkOption => Boolean(asset));

    setSearchResults((current) => (nextOffset === 0 ? options : [...current, ...options]));
    setSearchOffset(nextOffset + options.length);
    setSearchHasMore(options.length === 6);
    setSearchStatus(options.length ? "" : "No matches yet. Try a color, mood, place, or subject.");
  }

  async function saveCustomerArtworkIfNeeded() {
    if (artworkSource !== "upload" || !uploadedFile) {
      return customerArtworkUploadId;
    }

    if (customerArtworkUploadId) {
      return customerArtworkUploadId;
    }

    setCartStatus("Uploading your original artwork...");
    const prepareResponse = await fetch("/api/customer-artwork/upload-url", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        filename: uploadedFile.name,
        contentType: uploadedFile.type || "application/octet-stream",
        sizeBytes: uploadedFile.size
      })
    });
    const prepare = (await prepareResponse.json()) as {
      id?: string;
      originalStorageKey?: string;
      uploadUrl?: string;
      contentType?: string;
      error?: string;
    };

    if (!prepareResponse.ok || !prepare.id || !prepare.originalStorageKey || !prepare.uploadUrl) {
      throw new Error(prepare.error ?? "Could not prepare your artwork upload.");
    }

    const uploadResponse = await fetch(prepare.uploadUrl, {
      method: "PUT",
      headers: { "content-type": prepare.contentType ?? uploadedFile.type ?? "application/octet-stream" },
      body: uploadedFile
    });

    if (!uploadResponse.ok) {
      throw new Error("Could not upload your original artwork.");
    }

    setCartStatus("Saving your artwork for proofing...");
    const completeResponse = await fetch("/api/customer-artwork/complete-upload", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        id: prepare.id,
        originalStorageKey: prepare.originalStorageKey,
        originalFilename: uploadedFile.name,
        originalContentType: prepare.contentType ?? uploadedFile.type ?? "application/octet-stream",
        originalSizeBytes: uploadedFile.size
      })
    });
    const complete = (await completeResponse.json()) as CustomerUploadResult;

    if (!completeResponse.ok || !complete.upload?.id) {
      throw new Error(complete.error ?? "Could not save your artwork upload.");
    }

    setCustomerArtworkUploadId(complete.upload.id);
    return complete.upload.id;
  }

  async function savePreviewSnapshotIfPossible() {
    const canvas = canvasRef.current;
    if (!canvas) {
      return null;
    }

    const previewImageDataUrl = canvasToDataUrl(canvas);
    const blob = await dataUrlToBlob(previewImageDataUrl);
    setCartStatus("Saving your preview...");

    const prepareResponse = await fetch("/api/preview-snapshots/upload-url", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contentType: blob.type || "image/webp",
        sizeBytes: blob.size
      })
    });
    const prepare = (await prepareResponse.json()) as {
      previewSnapshotKey?: string;
      uploadUrl?: string;
      contentType?: string;
      error?: string;
    };

    if (!prepareResponse.ok || !prepare.uploadUrl || !prepare.previewSnapshotKey) {
      throw new Error(prepare.error ?? "Could not prepare preview snapshot.");
    }

    const uploadResponse = await fetch(prepare.uploadUrl, {
      method: "PUT",
      headers: { "content-type": prepare.contentType ?? blob.type ?? "image/webp" },
      body: blob
    });

    if (!uploadResponse.ok) {
      throw new Error("Could not save preview snapshot.");
    }

    return {
      previewSnapshotKey: prepare.previewSnapshotKey,
      previewImageDataUrl
    };
  }

  async function addCurrentToCart() {
    if (!artworkSrc) {
      setCartStatus("Choose or upload artwork first.");
      return;
    }

    try {
      const uploadId = await saveCustomerArtworkIfNeeded();
      const previewSnapshot = await savePreviewSnapshotIfPossible();
      setCartStatus("Saving your mix...");
      const response = await fetch("/api/customizations", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          selectedSize: selectedSize.label,
          artworkSource,
          artworkName: selectedLabel,
          artworkUrl: artworkSource === "curated" ? artworkSrc : null,
          previewSnapshotKey: previewSnapshot?.previewSnapshotKey,
          previewSnapshotPath: previewSnapshot?.previewSnapshotKey,
          customerArtworkUploadId: uploadId,
          state: {
            artworkSrc: artworkSource === "curated" ? artworkSrc : null,
            selectedSize: selectedSize.label,
            productVariantId: selectedSize.id
          },
          metadata: {
            customerArtworkUploadId: uploadId,
            previewSnapshotKey: previewSnapshot?.previewSnapshotKey,
            originalFilename: artworkSource === "upload" ? uploadedFile?.name ?? null : null
          }
        })
      }).catch(() => null);
      const result = response?.ok ? ((await response.json()) as { id?: string }) : null;

      addItem({
        productVariantId: selectedSize.id,
        size: selectedSize.label,
        artworkName: selectedLabel,
        artworkSource,
        priceCents: 139500,
        customizationSessionId: result?.id,
        customerArtworkUploadId: uploadId ?? undefined,
        previewSnapshotKey: previewSnapshot?.previewSnapshotKey,
        previewSnapshotPath: previewSnapshot?.previewSnapshotKey,
        previewImageDataUrl: previewSnapshot?.previewImageDataUrl
      });
      setCartStatus("Added to cart.");
    } catch (error) {
      setCartStatus(error instanceof Error ? error.message : "Could not save your artwork.");
    }
  }

  const selectedOption = allArtworkOptions.find((option) => option.src === artworkSrc);
  const selectedLabel = selectedOption?.name ?? artworkName;

  return (
    <section id="customizer" className="bg-accent text-foreground border-b-4 border-border py-16 sm:py-20 lg:py-32">
      <div className="max-w-7xl mx-auto px-3 sm:px-6">
        <div className="text-center mb-10 sm:mb-16 space-y-4">
          <h2 className="font-heading font-black text-4xl sm:text-5xl lg:text-7xl uppercase tracking-tighter bg-background text-foreground inline-block px-4 sm:px-6 py-2 border-4 border-border shadow-[6px_6px_0_0_#292929] max-w-full">
            Build Your Mosaic
          </h2>
          <p className="text-base sm:text-xl font-medium font-mono uppercase tracking-widest text-background">
            Design a one-of-a-kind masterpiece.
          </p>
        </div>

        <div className="bg-background border-4 border-border shadow-[8px_8px_0_0_#292929] sm:shadow-[12px_12px_0_0_#292929] p-3 sm:p-6 lg:p-12">
          <div className="grid lg:grid-cols-2 gap-8 sm:gap-12">
            <div className="space-y-6">
              <div
                className="w-full border-4 border-border shadow-[8px_8px_0_0_#292929] overflow-hidden bg-card relative"
                style={{ aspectRatio: selectedSize.aspectRatio }}
              >
                <canvas
                  ref={canvasRef}
                  className="w-full h-full block bg-[#f0f0f0]"
                  aria-label="Realistic Mixtape Mosaic preview"
                />
              </div>
              <div className="flex flex-col gap-1 sm:flex-row sm:justify-between font-mono font-bold text-xs sm:text-sm uppercase">
                <span>Preview: {selectedLabel}</span>
                <span>{selectedSize.label}</span>
              </div>
            </div>

            <div className="flex flex-col justify-between gap-10">
              <div className="space-y-4">
                <h3 className="font-heading font-black text-2xl uppercase tracking-wider flex items-center gap-2">
                  <div className="w-3 h-3 bg-secondary border border-border shadow-[1px_1px_0_0_#292929]" />
                  1. Select Size
                </h3>
                <div className="grid gap-3">
                  {sizes.map((size) => (
                    <button
                      key={size.id}
                      type="button"
                      onClick={() => setSelectedSizeId(size.id)}
                      className={`text-left px-6 py-4 border-2 border-border font-bold uppercase tracking-wider transition-all ${
                        selectedSizeId === size.id
                          ? "bg-card shadow-[4px_4px_0_0_#292929]"
                          : "bg-card hover:bg-muted"
                      }`}
                    >
                      {size.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-heading font-black text-2xl uppercase tracking-wider flex items-center gap-2">
                  <div className="w-3 h-3 bg-primary border border-border shadow-[1px_1px_0_0_#292929]" />
                  2. Artwork
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setArtworkPanel("curated")}
                    className={`flex items-center gap-3 px-4 py-3 border-2 border-border font-bold uppercase tracking-wider transition-all ${
                      artworkPanel === "curated" ? "bg-card shadow-[4px_4px_0_0_#292929]" : "bg-transparent hover:bg-card"
                    }`}
                  >
                    <div className={`w-6 h-6 border-2 border-border ${artworkPanel === "curated" ? "bg-secondary" : "bg-transparent"}`} />
                    Curated Artist
                  </button>
                  <button
                    type="button"
                    onClick={() => setArtworkPanel("upload")}
                    className={`flex items-center gap-3 px-4 py-3 border-2 border-border font-bold uppercase tracking-wider transition-all ${
                      artworkPanel === "upload" ? "bg-card shadow-[4px_4px_0_0_#292929]" : "bg-transparent hover:bg-card"
                    }`}
                  >
                    <div className={`w-6 h-6 border-2 border-border ${artworkPanel === "upload" ? "bg-primary" : "bg-transparent"}`} />
                    Upload my Own
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-heading font-black text-2xl uppercase tracking-wider flex items-center gap-2">
                  <div className="w-3 h-3 bg-accent border border-border shadow-[1px_1px_0_0_#292929]" />
                  3. Curated Art
                </h3>

                {artworkPanel === "curated" ? (
                  <div className="grid sm:grid-cols-2 gap-3">
                    {libraryOptions.length ? null : (
                      <div className="sm:col-span-2 bg-card border-2 border-border p-4 font-mono font-bold uppercase text-sm">
                        No curated artwork is active yet. Add the curated tag in the admin image library.
                      </div>
                    )}
                    {libraryOptions.map((option, index) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => {
                          setArtworkSrc(option.src);
                          setArtworkName(option.name);
                          setArtworkSource("curated");
                          setArtworkPanel("curated");
                        }}
                        className={`relative min-h-[72px] border-2 border-border px-4 py-3 text-left transition-all ${
                          artworkSrc === option.src
                            ? "bg-card shadow-[4px_4px_0_0_#292929]"
                            : "bg-background hover:bg-card"
                        }`}
                      >
                        <div className={`absolute left-4 top-4 w-6 h-6 border-2 border-border ${index % 2 === 0 ? "bg-secondary" : "bg-primary"}`} />
                        <div className="pl-10 font-bold uppercase tracking-wider">
                          <p className="leading-4 text-base mb-0">{option.name}</p>
                          <p className="leading-4 text-[13px] font-mono text-muted-foreground">{option.credit}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : null}

                {artworkPanel === "upload" ? (
                  <label className="bg-card h-[64px] relative w-full border-2 border-border flex items-center px-4 py-3 cursor-pointer">
                    <span className="font-mono font-bold text-muted-foreground uppercase whitespace-nowrap">
                      Upload an image
                    </span>
                    <input className="sr-only" type="file" accept="image/*" onChange={(event) => handleUpload(event.target.files?.[0])} />
                  </label>
                ) : (
                  <div className="bg-card relative w-full border-2 border-border flex items-center gap-3 px-4 py-3">
                    <Search className="w-4 h-4 shrink-0" />
                    <input
                      className="w-full bg-transparent font-mono font-bold text-muted-foreground uppercase outline-none placeholder:text-muted-foreground"
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      onFocus={() => setArtworkPanel("search")}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          void searchArtwork(0);
                        }
                      }}
                      placeholder="Search for more"
                    />
                    <button
                      type="button"
                      className="font-mono font-black uppercase text-xs"
                      onClick={() => void searchArtwork(0)}
                    >
                      Go
                    </button>
                  </div>
                )}
              </div>

              {artworkPanel === "search" ? (
                <div className="bg-card border-2 border-border p-3 space-y-3">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {searchResults.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => {
                          setArtworkSrc(option.src);
                          setArtworkName(option.name);
                          setArtworkSource("curated");
                        }}
                        className={`border-2 border-border bg-background text-left transition-all ${
                          artworkSrc === option.src ? "shadow-[4px_4px_0_0_#292929]" : "hover:bg-card"
                        }`}
                      >
                        {option.thumbSrc ? (
                          <img src={option.thumbSrc} alt={option.name} className="aspect-square w-full object-cover border-b-2 border-border" />
                        ) : null}
                        <span className="block p-2">
                          <strong className="block font-heading text-sm uppercase leading-4">{option.name}</strong>
                          <small className="block font-mono text-[10px] uppercase leading-3 text-muted-foreground">{option.credit}</small>
                        </span>
                      </button>
                    ))}
                  </div>
                  {searchStatus ? <p className="font-mono font-bold uppercase text-xs">{searchStatus}</p> : null}
                  {searchHasMore ? (
                    <button type="button" className="secondary-button w-full" onClick={() => void searchArtwork(searchOffset)}>
                      Load more
                    </button>
                  ) : null}
                </div>
              ) : null}

              <div className="border-t-4 border-border pt-9 space-y-4">
                <div className="flex h-12 items-end justify-between">
                  <span className="font-heading font-bold text-xl uppercase">Total</span>
                  <span className="font-heading font-black text-5xl tracking-tighter">$1395</span>
                </div>
                <Link
                  href="/checkout"
                  onClick={(event) => {
                    event.preventDefault();
                    void addCurrentToCart();
                  }}
                  className="bg-secondary text-background border-4 border-border w-full min-h-[72px] flex items-center justify-center font-heading font-black text-2xl uppercase tracking-widest shadow-[8px_8px_0_0_#292929] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[6px_6px_0_0_#292929] transition-all"
                >
                  Add to Cart
                </Link>
                <p className="font-mono font-bold text-sm uppercase text-center">
                  {cartStatus || "Free US shipping. Ships in 2-3 weeks."}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
