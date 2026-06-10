"use client";

import Link from "next/link";
import { Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import type { PointerEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { getProductPhoto, type ProductLayoutKey } from "@/lib/assets";
import { useCart } from "@/components/CartProvider";
import { createPrototypeCalibration, normalizeCalibration } from "@/lib/calibration";
import { defaultProductionConfig } from "@/lib/geometry";
import { loadImage, type LoadedImage } from "@/lib/image";
import { drawRealisticPreview } from "@/lib/preview-renderer";
import { fallbackProductVariantList } from "@/lib/fallback-content";
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
  cassette_thumb_url: string | null;
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

type ProductSizeOption = {
  id: string;
  label: string;
  layout: ProductLayoutKey;
  mockupPhoto?: {
    src: string;
    width: number;
    height: number;
  };
  columns: number;
  rows: number;
  panelColumns: number;
  panelRows: number;
  panelCount: number;
  tapeCountLabel: string;
  aspectRatio: string;
  priceCents: number;
  productType: string;
  productionEstimate: string;
};

type ProductSizePayload = Omit<ProductSizeOption, "layout"> & {
  layout?: string;
};

export type CustomizerInitialData = {
  sizes?: ProductSizePayload[];
  curatedAssets?: PublicImageAsset[];
  selectedAsset?: PublicImageAsset | null;
};

const fallbackSizes: ProductSizeOption[] = fallbackProductVariantList.map((variant) => ({
  id: variant.id,
  label: variant.label,
  layout: variant.layout as ProductLayoutKey,
  columns: variant.columns,
  rows: variant.rows,
  panelColumns: variant.panelColumns,
  panelRows: variant.panelRows,
  panelCount: variant.panelCount,
  tapeCountLabel: variant.tapeCountLabel,
  aspectRatio: variant.aspectRatio,
  priceCents: variant.priceCents,
  productType: variant.productType,
  productionEstimate: variant.productionEstimate
}));

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
  const src = asset.card_url ?? asset.preview_url ?? asset.large_url ?? asset.thumb_url;
  if (!src) {
    return null;
  }

  return {
    id: `asset-${asset.id}`,
    name: asset.title,
    src,
    thumbSrc: asset.cassette_thumb_url ?? asset.thumb_url ?? asset.card_url ?? src,
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

function aspectRatioNumber(value: string) {
  const [left, right] = value.split("/").map((part) => Number(part.trim()));
  if (Number.isFinite(left) && Number.isFinite(right) && right > 0) {
    return left / right;
  }
  return 1;
}

function panelLabel(size: ProductSizeOption) {
  return `${size.panelCount} Panel - ${size.tapeCountLabel}`;
}

function PanelDiagram({ size }: { size: ProductSizeOption }) {
  return (
    <span
      className="mtm-panel-diagram"
      aria-label={`${size.panelColumns} by ${size.panelRows} panel layout`}
      style={{ gridTemplateColumns: `repeat(${size.panelColumns}, 14px)` }}
    >
      {Array.from({ length: size.panelColumns * size.panelRows }, (_, index) => (
        <span key={index} />
      ))}
    </span>
  );
}

function createVariantCalibration(size: ProductSizeOption): ProductCalibration {
  const calibration = createPrototypeCalibration(size.layout);
  const photo = size.mockupPhoto;

  return normalizeCalibration({
    ...calibration,
    photo: photo
      ? {
          src: photo.src,
          width: photo.width,
          height: photo.height,
          notes: `${size.label} mockup image from Sanity product variant.`
        }
      : calibration.photo,
    layout: {
      columns: size.columns,
      rows: size.rows
    }
  });
}

type CropState = {
  x: number;
  y: number;
  zoom: number;
};

type CropImageFit = {
  width: number;
  height: number;
};

type CropFrameSize = {
  width: number;
  height: number;
};

function UploadCropModal({
  file,
  url,
  aspectRatio,
  panelColumns,
  panelRows,
  onClose,
  onChooseDifferent,
  onApply
}: {
  file: File;
  url: string;
  aspectRatio: string;
  panelColumns: number;
  panelRows: number;
  onClose: () => void;
  onChooseDifferent: () => void;
  onApply: (dataUrl: string, crop: CropState) => void;
}) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const dragRef = useRef<{ pointerId: number; startX: number; startY: number; cropX: number; cropY: number } | null>(null);
  const [crop, setCrop] = useState<CropState>({ x: 0, y: 0, zoom: 1 });
  const [imageFit, setImageFit] = useState<CropImageFit>({ width: 0, height: 0 });
  const [frameSize, setFrameSize] = useState<CropFrameSize>({ width: 0, height: 0 });
  const numericAspect = aspectRatioNumber(aspectRatio);

  function getCropFrameSize() {
    const viewport = viewportRef.current;
    if (!viewport) {
      return { width: 0, height: 0 };
    }

    const maxWidth = Math.max(1, viewport.clientWidth - 36);
    const maxHeight = Math.max(1, viewport.clientHeight - 36);
    if (maxWidth / maxHeight > numericAspect) {
      return {
        height: maxHeight,
        width: Math.max(1, maxHeight * numericAspect)
      };
    }

    return {
      height: Math.max(1, maxWidth / numericAspect),
      width: maxWidth
    };
  }

  function updateImageFit() {
    const image = imageRef.current;
    if (!image || !image.naturalWidth || !image.naturalHeight) {
      return;
    }

    const { width: frameWidth, height: frameHeight } = getCropFrameSize();
    setFrameSize({ width: frameWidth, height: frameHeight });
    const containScale = Math.max(frameWidth / image.naturalWidth, frameHeight / image.naturalHeight);
    setImageFit({
      width: image.naturalWidth * containScale,
      height: image.naturalHeight * containScale
    });
  }

  useEffect(() => {
    setCrop({ x: 0, y: 0, zoom: 1 });
    const handle = window.setTimeout(updateImageFit, 0);
    window.addEventListener("resize", updateImageFit);
    return () => {
      window.clearTimeout(handle);
      window.removeEventListener("resize", updateImageFit);
    };
  }, [url, aspectRatio]);

  function pointerDown(event: PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, cropX: crop.x, cropY: crop.y };
  }

  function pointerMove(event: PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }

    setCrop((current) => ({
      ...current,
      x: drag.cropX + event.clientX - drag.startX,
      y: drag.cropY + event.clientY - drag.startY
    }));
  }

  function pointerUp(event: PointerEvent<HTMLDivElement>) {
    if (dragRef.current?.pointerId === event.pointerId) {
      dragRef.current = null;
    }
  }

  function saveCrop() {
    const image = imageRef.current;
    if (!image) {
      return;
    }

    const outputWidth = numericAspect >= 1 ? 1400 : Math.max(900, Math.round(1400 * numericAspect));
    const outputHeight = numericAspect >= 1 ? Math.round(1400 / numericAspect) : 1400;
    const canvas = document.createElement("canvas");
    canvas.width = outputWidth;
    canvas.height = outputHeight;
    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }

    context.fillStyle = "#f0f0f0";
    context.fillRect(0, 0, outputWidth, outputHeight);

    const measuredFrame = getCropFrameSize();
    const frameWidth = measuredFrame.width || outputWidth;
    const frameHeight = measuredFrame.height || outputHeight;
    const containScale = Math.max(frameWidth / image.naturalWidth, frameHeight / image.naturalHeight);
    const drawScale = containScale * crop.zoom * (outputWidth / frameWidth);
    const drawWidth = image.naturalWidth * drawScale;
    const drawHeight = image.naturalHeight * drawScale;
    const drawX = outputWidth / 2 - drawWidth / 2 + crop.x * (outputWidth / frameWidth);
    const drawY = outputHeight / 2 - drawHeight / 2 + crop.y * (outputHeight / frameHeight);

    context.drawImage(image, drawX, drawY, drawWidth, drawHeight);
    onApply(canvas.toDataURL("image/webp", 0.9), crop);
  }

  return (
    <div className="mtm-crop-backdrop" role="dialog" aria-modal="true" aria-label="Crop uploaded artwork">
      <div className="mtm-crop-modal">
        <header>
          <div>
            <p className="eyebrow">Uploaded artwork</p>
            <h2>Crop & Adjust</h2>
          </div>
          <button type="button" aria-label="Close crop modal" onClick={onClose}>
            <X size={22} />
          </button>
        </header>
        <div className="mtm-crop-body">
          <div>
            <div
              ref={viewportRef}
              className="mtm-crop-viewport"
              onPointerDown={pointerDown}
              onPointerMove={pointerMove}
              onPointerUp={pointerUp}
              onPointerCancel={pointerUp}
            >
              <img
                ref={imageRef}
                src={url}
                alt={file.name}
                draggable={false}
                onLoad={updateImageFit}
                style={{
                  height: imageFit.height ? `${imageFit.height}px` : undefined,
                  transform: `translate(calc(-50% + ${crop.x}px), calc(-50% + ${crop.y}px)) scale(${crop.zoom})`,
                  width: imageFit.width ? `${imageFit.width}px` : undefined
                }}
              />
              <div
                ref={frameRef}
                className="mtm-crop-frame"
                style={{
                  aspectRatio,
                  height: frameSize.height ? `${frameSize.height}px` : undefined,
                  width: frameSize.width ? `${frameSize.width}px` : undefined
                }}
              >
                <span
                  className="mtm-crop-grid"
                  style={{
                    gridTemplateColumns: `repeat(${panelColumns}, 1fr)`,
                    gridTemplateRows: `repeat(${panelRows}, 1fr)`
                  }}
                >
                  {Array.from({ length: panelColumns * panelRows }, (_, index) => (
                    <span key={index} />
                  ))}
                </span>
              </div>
            </div>
            <label className="mtm-crop-slider">
              Zoom
              <input
                type="range"
                min="1"
                max="3"
                step="0.01"
                value={crop.zoom}
                onChange={(event) => setCrop((current) => ({ ...current, zoom: Number(event.target.value) }))}
              />
            </label>
          </div>
          <aside>
            <h3>Fit the story inside the frame.</h3>
            <p>Drag to reposition. Use zoom to keep the important parts inside the selected mosaic shape.</p>
            <p className="font-mono text-xs uppercase">Current file: {file.name}</p>
          </aside>
        </div>
        <footer>
          <button type="button" className="secondary-button" onClick={onChooseDifferent}>
            Choose different file
          </button>
          <button type="button" className="primary-button" onClick={saveCrop}>
            Save & apply
          </button>
        </footer>
      </div>
    </div>
  );
}

function sizePayloadToOption(variant: ProductSizePayload): ProductSizeOption {
  const layout = (variant.layout || "square").trim().toLowerCase();
  return {
    ...variant,
    layout,
    panelColumns: variant.panelColumns ?? (layout === "landscape" ? 4 : 3),
    panelRows: variant.panelRows ?? (layout === "portrait" ? 4 : 3),
    panelCount: variant.panelCount ?? ((layout === "landscape" || layout === "portrait") ? 12 : 9),
    tapeCountLabel: variant.tapeCountLabel ?? `${variant.columns * variant.rows} tapes`
  };
}

export function Customizer({
  initialArtworkId,
  initialData
}: {
  initialArtworkId?: string | null;
  initialData?: CustomizerInitialData;
} = {}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const router = useRouter();
  const { addItem } = useCart();
  const initialSizes = useMemo(
    () => initialData?.sizes?.length ? initialData.sizes.map(sizePayloadToOption) : fallbackSizes,
    [initialData?.sizes]
  );
  const initialCuratedOptions = useMemo(
    () => (initialData?.curatedAssets ?? []).map(assetToOption).filter((asset): asset is ArtworkOption => Boolean(asset)),
    [initialData?.curatedAssets]
  );
  const initialSelectedOption = useMemo(
    () => initialData?.selectedAsset ? assetToOption(initialData.selectedAsset) : null,
    [initialData?.selectedAsset]
  );
  const [calibration, setCalibration] = useState<ProductCalibration>(() => createPrototypeCalibration());
  const [artworkSrc, setArtworkSrc] = useState(initialSelectedOption?.src ?? initialCuratedOptions[0]?.src ?? "");
  const [artworkName, setArtworkName] = useState(initialSelectedOption?.name ?? initialCuratedOptions[0]?.name ?? "Choose artwork");
  const [artworkSource, setArtworkSource] = useState<ArtworkSource>("curated");
  const [artworkPanel, setArtworkPanel] = useState<ArtworkPanel>("curated");
  const [initialArtworkPending, setInitialArtworkPending] = useState(Boolean(initialArtworkId && !initialSelectedOption));
  const [libraryOptions, setLibraryOptions] = useState<ArtworkOption[]>(() => {
    if (initialSelectedOption && !initialCuratedOptions.some((option) => option.id === initialSelectedOption.id)) {
      return [initialSelectedOption, ...initialCuratedOptions];
    }
    return initialCuratedOptions;
  });
  const [searchResults, setSearchResults] = useState<ArtworkOption[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOffset, setSearchOffset] = useState(0);
  const [searchHasMore, setSearchHasMore] = useState(false);
  const [searchStatus, setSearchStatus] = useState("");
  const [searchLoadCount, setSearchLoadCount] = useState(0);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadObjectUrl, setUploadObjectUrl] = useState("");
  const [pendingUploadCrop, setPendingUploadCrop] = useState(false);
  const [cropState, setCropState] = useState<CropState | null>(null);
  const [customerArtworkUploadId, setCustomerArtworkUploadId] = useState<string | null>(null);
  const [sizes, setSizes] = useState<ProductSizeOption[]>(initialSizes);
  const [selectedSizeId, setSelectedSizeId] = useState(initialSizes[0]?.id ?? fallbackSizes[0].id);
  const [artwork, setArtwork] = useState<LoadedImage | null>(null);
  const [photo, setPhoto] = useState<LoadedImage | null>(null);
  const [calibrationLoading, setCalibrationLoading] = useState(true);
  const [previewDrawnKey, setPreviewDrawnKey] = useState("");
  const [cartStatus, setCartStatus] = useState("");
  const selectedSize = sizes.find((size) => size.id === selectedSizeId) ?? sizes[0] ?? fallbackSizes[0];
  const selectedLayout = selectedSize.layout;
  const selectedPhoto = selectedSize.mockupPhoto ?? getProductPhoto(selectedLayout);
  const previewKey = `${selectedSize.id}|${selectedPhoto.src}|${artworkSrc || "blank"}`;
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
    if (initialData?.sizes?.length) {
      return;
    }

    let active = true;
    fetch("/api/products/variants", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) {
          return null;
        }
        return (await response.json()) as { variants?: ProductSizePayload[] };
      })
      .then((payload) => {
        if (!active || !payload?.variants?.length) {
          return;
        }

        const nextSizes = payload.variants.map(sizePayloadToOption);
        setSizes(nextSizes);
        if (!nextSizes.some((size) => size.id === selectedSizeId)) {
          setSelectedSizeId(nextSizes[0].id);
        }
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, [initialData?.sizes?.length, selectedSizeId]);

  useEffect(() => {
    if (initialCuratedOptions.length) {
      return;
    }

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
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, [initialCuratedOptions.length]);

  useEffect(() => {
    if (!initialArtworkId) {
      setInitialArtworkPending(false);
      return;
    }

    let active = true;
    setInitialArtworkPending(true);
    fetch(`/api/images?id=${encodeURIComponent(initialArtworkId)}`, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) {
          return null;
        }

        const payload = (await response.json()) as { assets?: PublicImageAsset[] };
        return payload.assets?.[0] ?? null;
      })
      .then((asset) => {
        if (!active || !asset) {
          return;
        }

        const option = assetToOption(asset);
        if (!option) {
          return;
        }

        setLibraryOptions((current) => (current.some((item) => item.id === option.id) ? current : [option, ...current]));
        setArtworkSrc(option.src);
        setArtworkName(option.name);
        setArtworkSource("curated");
        setArtworkPanel("curated");
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) {
          setInitialArtworkPending(false);
        }
      });

    return () => {
      active = false;
    };
  }, [initialArtworkId]);

  useEffect(() => {
    if (initialArtworkPending || artworkSrc || !libraryOptions[0]) {
      return;
    }

    setArtworkSrc(libraryOptions[0].src);
    setArtworkName(libraryOptions[0].name);
    setArtworkSource("curated");
  }, [artworkSrc, initialArtworkPending, libraryOptions]);

  useEffect(() => {
    let active = true;
    setPhoto(null);
    loadImage(selectedPhoto.src).then((image) => {
      if (active) {
        setPhoto(image);
      }
    });
    return () => {
      active = false;
    };
  }, [selectedPhoto.src]);

  useEffect(() => {
    let active = true;
    setCalibrationLoading(true);
    setCalibration(createVariantCalibration(selectedSize));

    fetch(`/api/calibration?layout=${selectedLayout}&ts=${Date.now()}`, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) {
          return null;
        }
        return (await response.json()) as ProductCalibration;
      })
      .then((saved) => {
        if (active && saved?.tapes?.length) {
          setCalibration(normalizeCalibration({
            ...saved,
            photo: selectedSize.mockupPhoto
              ? {
                  src: selectedSize.mockupPhoto.src,
                  width: selectedSize.mockupPhoto.width,
                  height: selectedSize.mockupPhoto.height,
                  notes: saved.photo?.notes ?? `${selectedSize.label} mockup image from Sanity product variant.`
                }
              : saved.photo
          }));
        }
      })
      .catch(() => {
        // The seeded calibration is valid when no saved calibration exists.
      })
      .finally(() => {
        if (active) {
          setCalibrationLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [selectedLayout, selectedSize]);

  useEffect(() => {
    if (!artworkSrc) {
      setArtwork(null);
      return;
    }

    let active = true;
    setArtwork(null);
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
    if (artworkPanel !== "search") {
      return;
    }

    const query = searchQuery.trim();
    const handle = window.setTimeout(() => {
      void searchArtwork(0, query);
    }, 280);

    return () => window.clearTimeout(handle);
  }, [searchQuery, artworkPanel]);

  useEffect(() => {
    return () => {
      if (uploadObjectUrl) {
        URL.revokeObjectURL(uploadObjectUrl);
      }
    };
  }, [uploadObjectUrl]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    let active = true;
    let animationFrame = 0;
    const render = () => {
      const bounds = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(bounds.width * dpr));
      canvas.height = Math.max(1, Math.round(bounds.height * dpr));
      const context = canvas.getContext("2d");
      if (!context) {
        return;
      }

      if (!photo || calibrationLoading || (artworkSrc && !artwork)) {
        context.clearRect(0, 0, canvas.width, canvas.height);
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

      animationFrame = window.requestAnimationFrame(() => {
        if (active) {
          setPreviewDrawnKey((current) => current === previewKey ? current : previewKey);
        }
      });
    };

    render();
    window.addEventListener("resize", render);
    return () => {
      active = false;
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", render);
    };
  }, [artwork, artworkSrc, calibration, calibrationLoading, photo, previewConfig, previewKey]);

  function handleUpload(file: File | undefined) {
    if (!file) {
      return;
    }
    const previousObjectUrl = uploadObjectUrl;
    const objectUrl = URL.createObjectURL(file);
    setUploadedFile(file);
    setUploadObjectUrl(objectUrl);
    setPendingUploadCrop(true);
    setCropState(null);
    setCustomerArtworkUploadId(null);
    setArtworkName(file.name);
    setArtworkSource("upload");
    setArtworkPanel("upload");
    setArtworkSrc("");
    if (uploadInputRef.current) {
      uploadInputRef.current.value = "";
    }
    if (previousObjectUrl) {
      URL.revokeObjectURL(previousObjectUrl);
    }
  }

  function applyUploadedCrop(dataUrl: string, crop: CropState) {
    setArtworkSrc(dataUrl);
    setCropState(crop);
    setPendingUploadCrop(false);
    setArtworkSource("upload");
    setArtworkPanel("upload");
  }

  function closeUploadCrop() {
    setPendingUploadCrop(false);
    if (uploadObjectUrl && !artworkSrc.startsWith("data:")) {
      URL.revokeObjectURL(uploadObjectUrl);
      setUploadObjectUrl("");
      setUploadedFile(null);
      setArtworkSource("curated");
    }
  }

  async function searchArtwork(nextOffset = 0, queryOverride?: string) {
    const query = (queryOverride ?? searchQuery).trim();
    setArtworkPanel("search");
    setSearchStatus(query ? "Digging through the crates..." : "Loading artwork...");

    const params = new URLSearchParams({
      limit: "9",
      offset: String(nextOffset)
    });
    if (query) {
      params.set("q", query);
    }

    const response = await fetch(`/api/images?${params.toString()}`, { cache: "no-store" }).catch(() => null);
    const payload = response?.ok ? ((await response.json()) as { assets?: PublicImageAsset[]; hasMore?: boolean; nextOffset?: number }) : null;
    const options = (payload?.assets ?? []).map(assetToOption).filter((asset): asset is ArtworkOption => Boolean(asset));

    setSearchResults((current) => (nextOffset === 0 ? options : [...current, ...options]));
    setSearchOffset(payload?.nextOffset ?? nextOffset + options.length);
    setSearchHasMore(Boolean(payload?.hasMore));
    setSearchLoadCount((current) => (nextOffset === 0 ? 1 : current + 1));
    setSearchStatus(options.length ? "" : "No matches yet. Try a color, mood, place, or subject.");
  }

  function loadMoreSearch() {
    if (searchLoadCount >= 3 && searchHasMore) {
      const params = new URLSearchParams();
      if (searchQuery.trim()) {
        params.set("q", searchQuery.trim());
      }
      router.push(`/artwork${params.toString() ? `?${params.toString()}` : ""}`);
      return;
    }

    void searchArtwork(searchOffset);
  }

  function selectArtworkOption(option: ArtworkOption) {
    setArtworkSrc(option.src);
    setArtworkName(option.name);
    setArtworkSource("curated");
    requestAnimationFrame(() => {
      document.getElementById("customizer")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
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
          productVariantId: selectedSize.id,
          artworkSource,
          artworkName: selectedLabel,
          artworkUrl: artworkSource === "curated" ? artworkSrc : null,
          previewSnapshotKey: previewSnapshot?.previewSnapshotKey,
          previewSnapshotPath: previewSnapshot?.previewSnapshotKey,
          customerArtworkUploadId: uploadId,
          state: {
            artworkSrc: artworkSource === "curated" ? artworkSrc : null,
            selectedSize: selectedSize.label,
            productVariantId: selectedSize.id,
            crop: cropState
          },
          metadata: {
            customerArtworkUploadId: uploadId,
            previewSnapshotKey: previewSnapshot?.previewSnapshotKey,
            originalFilename: artworkSource === "upload" ? uploadedFile?.name ?? null : null,
            crop: cropState
          }
        })
      }).catch(() => null);
      const result = response?.ok ? ((await response.json()) as { id?: string }) : null;

      addItem({
        productVariantId: selectedSize.id,
        size: selectedSize.label,
        artworkName: selectedLabel,
        artworkSource,
        priceCents: selectedSize.priceCents,
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
  const previewReady = previewDrawnKey === previewKey;

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
                <img
                  src={selectedPhoto.src}
                  alt=""
                  aria-hidden="true"
                  className="absolute inset-0 h-full w-full object-contain bg-[#f0f0f0]"
                  loading="eager"
                  decoding="async"
                  fetchPriority="high"
                />
                <canvas
                  ref={canvasRef}
                  className={`relative z-10 w-full h-full block transition-opacity duration-200 ${previewReady ? "opacity-100" : "opacity-0"}`}
                  aria-label="Realistic Mixtape Mosaic preview"
                />
                {!previewReady ? (
                  <div className="mtm-preview-loading-cover" aria-live="polite">
                    <span>Loading the mix</span>
                  </div>
                ) : null}
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
                <div className="grid gap-4">
                  {sizes.map((size) => (
                    <button
                      key={size.id}
                      type="button"
                      onClick={() => setSelectedSizeId(size.id)}
                      className={`mtm-size-card text-left border-2 border-border font-bold uppercase tracking-wider transition-all ${
                        selectedSizeId === size.id
                          ? "is-selected mtm-active-card shadow-[4px_4px_0_0_#292929]"
                          : "mtm-inactive-card"
                      }`}
                    >
                      <span>
                        <strong>{size.label}</strong>
                        <small>{panelLabel(size)}</small>
                      </span>
                      <PanelDiagram size={size} />
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
                    className={`mtm-artwork-mode flex items-center gap-3 px-4 py-3 border-2 border-border font-bold uppercase tracking-wider transition-all ${
                      artworkPanel === "curated" || artworkPanel === "search" ? "mtm-active-card shadow-[4px_4px_0_0_#292929]" : "mtm-inactive-card"
                    }`}
                  >
                    <div className={`w-6 h-6 border-2 border-border ${artworkPanel === "curated" || artworkPanel === "search" ? "bg-secondary" : "bg-transparent"}`} />
                    Curated Artist
                  </button>
                  <button
                    type="button"
                    onClick={() => setArtworkPanel("upload")}
                    className={`mtm-artwork-mode flex items-center gap-3 px-4 py-3 border-2 border-border font-bold uppercase tracking-wider transition-all ${
                      artworkPanel === "upload" ? "mtm-active-card shadow-[4px_4px_0_0_#292929]" : "mtm-inactive-card"
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
                  3. {artworkPanel === "upload" ? "Add Your Art" : "Curated Art"}
                </h3>

                {artworkPanel !== "upload" ? (
                  <div className="grid gap-4">
                    {libraryOptions.length ? null : (
                      <div className="sm:col-span-2 bg-card border-2 border-border p-4 font-mono font-bold uppercase text-sm">
                        No curated artwork is active yet. Add the curated tag in the admin image library.
                      </div>
                    )}
                    {libraryOptions.map((option, index) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => selectArtworkOption(option)}
                        className={`mtm-curated-card relative border-2 border-border text-left transition-all ${
                          artworkSrc === option.src
                            ? "mtm-active-card shadow-[4px_4px_0_0_#292929]"
                            : "mtm-inactive-card"
                        }`}
                      >
                        <div className={`mtm-curated-swatch absolute left-4 top-1/2 -translate-y-1/2 border-2 border-border ${index % 2 === 0 ? "bg-secondary" : "bg-primary"}`} />
                        <div className="mtm-curated-copy font-bold uppercase tracking-wider">
                          <p className="leading-4 text-base mb-0">{option.name}</p>
                          <p className="leading-4 text-[13px] font-mono text-muted-foreground">{option.credit}</p>
                        </div>
                        {option.thumbSrc ? <img src={option.thumbSrc} alt="" loading="lazy" /> : null}
                      </button>
                    ))}
                  </div>
                ) : null}

                {artworkPanel === "upload" ? (
                  <label className="mtm-inactive-card h-[48px] relative w-full border-2 border-border flex items-center px-4 cursor-pointer">
                    <span className="font-mono font-bold text-muted-foreground uppercase whitespace-nowrap">
                      Upload an image
                    </span>
                    <input
                      ref={uploadInputRef}
                      className="sr-only"
                      type="file"
                      accept="image/*"
                      onChange={(event) => handleUpload(event.target.files?.[0])}
                    />
                  </label>
                ) : (
                  <div className="mtm-search-input mtm-inactive-card relative w-full border-2 border-border">
                    <input
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
                    <Search className="mtm-search-icon shrink-0" aria-hidden="true" />
                  </div>
                )}
              </div>

              {artworkPanel === "search" ? (
                <div className="mtm-search-results bg-card border-2 border-border p-3 space-y-3">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {searchResults.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => selectArtworkOption(option)}
                        className={`mtm-search-result-card border-2 border-border bg-background text-left transition-all ${
                          artworkSrc === option.src ? "shadow-[4px_4px_0_0_#292929]" : "hover:bg-card"
                        }`}
                      >
                        {option.thumbSrc ? (
                          <img src={option.thumbSrc} alt={option.name} className="aspect-square w-full object-cover border-b-2 border-border" />
                        ) : null}
                        <span className="mtm-search-result-copy block p-2">
                          <strong className="block font-heading text-sm uppercase leading-4">{option.name}</strong>
                          <small className="block font-mono text-[10px] uppercase leading-3 text-muted-foreground">{option.credit}</small>
                        </span>
                      </button>
                    ))}
                  </div>
                  {searchStatus ? <p className="font-mono font-bold uppercase text-xs">{searchStatus}</p> : null}
                  {searchHasMore ? (
                    <button type="button" className="secondary-button w-full" onClick={loadMoreSearch}>
                      {searchLoadCount >= 3 ? "Open artwork library" : "See More"}
                    </button>
                  ) : null}
                </div>
              ) : null}

              <div className="border-t-4 border-border pt-9 space-y-4">
                <div className="flex h-12 items-end justify-between">
                  <span className="font-heading font-bold text-xl uppercase">Total</span>
                  <span className="font-heading font-black text-5xl tracking-tighter">
                    ${Math.round(selectedSize.priceCents / 100).toLocaleString("en-US")}
                  </span>
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
                  {cartStatus || `Free US shipping. ${selectedSize.productionEstimate}.`}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      {pendingUploadCrop && uploadedFile && uploadObjectUrl ? (
        <UploadCropModal
          file={uploadedFile}
          url={uploadObjectUrl}
          aspectRatio={`${selectedSize.panelColumns} / ${selectedSize.panelRows}`}
          panelColumns={selectedSize.panelColumns}
          panelRows={selectedSize.panelRows}
          onClose={closeUploadCrop}
          onChooseDifferent={() => uploadInputRef.current?.click()}
          onApply={applyUploadedCrop}
        />
      ) : null}
    </section>
  );
}
