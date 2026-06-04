"use client";

import { useEffect, useRef, useState } from "react";
import { artworkOptions, getProductPhoto } from "@/lib/assets";
import { createPrototypeCalibration, normalizeCalibration } from "@/lib/calibration";
import { defaultProductionConfig } from "@/lib/geometry";
import { loadImage, type LoadedImage } from "@/lib/image";
import { drawRealisticPreview } from "@/lib/preview-renderer";
import type { ProductCalibration } from "@/lib/types";

function MockupCanvas({ src, name }: { src: string; name: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [artwork, setArtwork] = useState<LoadedImage | null>(null);
  const [photo, setPhoto] = useState<LoadedImage | null>(null);
  const [calibration, setCalibration] = useState<ProductCalibration>(() => createPrototypeCalibration("square"));

  useEffect(() => {
    let active = true;
    const productPhoto = getProductPhoto("square");
    Promise.all([loadImage(src), loadImage(productPhoto.src)]).then(([loadedArtwork, loadedPhoto]) => {
      if (active) {
        setArtwork(loadedArtwork);
        setPhoto(loadedPhoto);
      }
    });
    return () => {
      active = false;
    };
  }, [src]);

  useEffect(() => {
    let active = true;
    fetch(`/api/calibration?layout=square&ts=${Date.now()}`, { cache: "no-store" })
      .then(async (response) => (response.ok ? ((await response.json()) as ProductCalibration) : null))
      .then((saved) => {
        if (active && saved?.tapes?.length) {
          setCalibration(normalizeCalibration(saved));
        }
      })
      .catch(() => {
        // The seeded calibration keeps the example gallery useful before manual calibration exists.
      });

    return () => {
      active = false;
    };
  }, []);

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
      if (context) {
        drawRealisticPreview(
          context,
          artwork,
          photo,
          calibration,
          canvas.width,
          canvas.height,
          defaultProductionConfig,
          false
        );
      }
    };

    render();
    window.addEventListener("resize", render);
    return () => window.removeEventListener("resize", render);
  }, [artwork, photo, calibration]);

  return <canvas ref={canvasRef} className="example-mockup-canvas" aria-label={`${name} cassette wall art mockup`} />;
}

export function MockupExamples() {
  return (
    <div className="mockup-showcase">
      {artworkOptions.map((option) => (
        <article key={option.id} className="mockup-card">
          <MockupCanvas src={option.src} name={option.name} />
          <div>
            <p>{option.name}</p>
            <span>{option.credit}</span>
          </div>
        </article>
      ))}
    </div>
  );
}
