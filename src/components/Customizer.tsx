"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { artworkOptions, getProductPhoto, type ProductLayoutKey } from "@/lib/assets";
import { useCart } from "@/components/CartProvider";
import { createPrototypeCalibration, normalizeCalibration } from "@/lib/calibration";
import { defaultProductionConfig } from "@/lib/geometry";
import { loadImage, type LoadedImage } from "@/lib/image";
import { drawRealisticPreview } from "@/lib/preview-renderer";
import type { ProductCalibration } from "@/lib/types";

type ArtworkSource = "curated" | "upload" | "unsplash";

const sizes: Array<{
  id: string;
  label: string;
  layout: ProductLayoutKey;
  columns: number;
  rows: number;
  aspectRatio: string;
}> = [
  { id: "square", label: 'Square (27"x27")', layout: "square", columns: 6, rows: 9, aspectRatio: "1 / 1" },
  { id: "landscape", label: 'Landscape (45"x24")', layout: "landscape", columns: 8, rows: 9, aspectRatio: "1630 / 1254" },
  { id: "portrait", label: 'Portrait (27"x45")', layout: "square", columns: 6, rows: 9, aspectRatio: "1 / 1" }
];

export function Customizer() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { addItem } = useCart();
  const [calibration, setCalibration] = useState<ProductCalibration>(() => createPrototypeCalibration());
  const [artworkSrc, setArtworkSrc] = useState(artworkOptions[0].src);
  const [artworkName, setArtworkName] = useState(artworkOptions[0].name);
  const [artworkSource, setArtworkSource] = useState<ArtworkSource>("curated");
  const [selectedSizeId, setSelectedSizeId] = useState(sizes[0].id);
  const [artwork, setArtwork] = useState<LoadedImage | null>(null);
  const [photo, setPhoto] = useState<LoadedImage | null>(null);
  const [cartStatus, setCartStatus] = useState("");
  const selectedSize = sizes.find((size) => size.id === selectedSizeId) ?? sizes[0];
  const selectedLayout = selectedSize.layout;
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
    setArtworkSrc(URL.createObjectURL(file));
    setArtworkName(file.name);
    setArtworkSource("upload");
  }

  async function addCurrentToCart() {
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
        state: {
          artworkSrc,
          selectedSize: selectedSize.label
        }
      })
    }).catch(() => null);
    const result = response?.ok ? ((await response.json()) as { id?: string }) : null;

    addItem({
      size: selectedSize.label,
      artworkName: selectedLabel,
      artworkSource,
      priceCents: 139500,
      customizationSessionId: result?.id
    });
    setCartStatus("Added to cart.");
  }

  const selectedOption = artworkOptions.find((option) => option.src === artworkSrc);
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
                    onClick={() => setArtworkSource("curated")}
                    className={`flex items-center gap-3 px-4 py-3 border-2 border-border font-bold uppercase tracking-wider transition-all ${
                      artworkSource === "curated" ? "bg-card shadow-[4px_4px_0_0_#292929]" : "bg-transparent hover:bg-card"
                    }`}
                  >
                    <div className={`w-6 h-6 border-2 border-border ${artworkSource === "curated" ? "bg-secondary" : "bg-transparent"}`} />
                    Curated Artist
                  </button>
                  <button
                    type="button"
                    onClick={() => setArtworkSource("upload")}
                    className={`flex items-center gap-3 px-4 py-3 border-2 border-border font-bold uppercase tracking-wider transition-all ${
                      artworkSource === "upload" ? "bg-card shadow-[4px_4px_0_0_#292929]" : "bg-transparent hover:bg-card"
                    }`}
                  >
                    <div className={`w-6 h-6 border-2 border-border ${artworkSource === "upload" ? "bg-primary" : "bg-transparent"}`} />
                    Upload my Own
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-heading font-black text-2xl uppercase tracking-wider flex items-center gap-2">
                  <div className="w-3 h-3 bg-accent border border-border shadow-[1px_1px_0_0_#292929]" />
                  3. Curated Art
                </h3>

                {artworkSource === "curated" ? (
                  <div className="grid sm:grid-cols-2 gap-3">
                    {artworkOptions.map((option, index) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => {
                          setArtworkSrc(option.src);
                          setArtworkName(option.name);
                          setArtworkSource("curated");
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

                {artworkSource === "upload" ? (
                  <label className="bg-card h-[64px] relative w-full border-2 border-border flex items-center px-4 py-3 cursor-pointer">
                    <span className="font-mono font-bold text-muted-foreground uppercase whitespace-nowrap">
                      Upload an image
                    </span>
                    <input className="sr-only" type="file" accept="image/*" onChange={(event) => handleUpload(event.target.files?.[0])} />
                  </label>
                ) : (
                  <button
                    type="button"
                    onClick={() => setArtworkSource("unsplash")}
                    className="bg-card h-[52px] relative w-full border-2 border-border flex items-center gap-3 px-4 py-3"
                  >
                    <Search className="w-4 h-4" />
                    <span className="font-mono font-bold text-muted-foreground uppercase whitespace-nowrap">
                      Search for more
                    </span>
                  </button>
                )}
              </div>

              {artworkSource === "unsplash" ? (
                <div className="bg-card border-2 border-border p-4 font-mono font-bold uppercase text-sm">
                  Unsplash search is wired for the next phase. Curated and upload already update the live preview.
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
