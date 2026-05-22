"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { artworkOptions } from "@/lib/assets";
import {
  clampNumber,
  defaultProductionConfig,
  formatCurrency,
  getLayoutRatio,
  getOptimizedGangPlan,
  getOutputSize,
  mmToIn,
  TAPE
} from "@/lib/geometry";
import { loadImage, type LoadedImage } from "@/lib/image";
import {
  canvasToPdfBlob,
  downloadBlob,
  drawGangSheet,
  drawProductionImage
} from "@/lib/production-renderer";
import type { ProductionConfig } from "@/lib/types";

export function ProductionTool() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [config, setConfig] = useState<ProductionConfig>(defaultProductionConfig);
  const [artworkSrc, setArtworkSrc] = useState(artworkOptions[0].src);
  const [image, setImage] = useState<LoadedImage | null>(null);
  const [imageName, setImageName] = useState(artworkOptions[0].name);
  const [drag, setDrag] = useState<null | { x: number; y: number; panX: number; panY: number }>(
    null
  );

  const gangPlan = useMemo(() => getOptimizedGangPlan(config), [config]);
  const output = useMemo(() => getOutputSize(image, config), [image, config]);

  useEffect(() => {
    let active = true;
    loadImage(artworkSrc).then((next) => {
      if (active) {
        setImage(next);
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
      if (context) {
        drawProductionImage(context, image, canvas.width, canvas.height, config, {
          checker: true,
          showOverlay: true
        });
      }
    };

    render();
    window.addEventListener("resize", render);
    return () => window.removeEventListener("resize", render);
  }, [image, config]);

  function updateConfig(patch: Partial<ProductionConfig>) {
    setConfig((current) => ({ ...current, ...patch }));
  }

  function handleUpload(file: File | undefined) {
    if (!file) {
      return;
    }
    const url = URL.createObjectURL(file);
    setArtworkSrc(url);
    setImageName(file.name);
  }

  function pointerPoint(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
  }

  function exportPng() {
    if (!image) {
      return;
    }
    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = output.width;
    exportCanvas.height = output.height;
    const context = exportCanvas.getContext("2d");
    if (!context) {
      return;
    }
    drawProductionImage(context, image, output.width, output.height, config);
    exportCanvas.toBlob((blob) => {
      if (blob) {
        downloadBlob(blob, `${imageName.replace(/\.[^.]+$/, "")}-${config.columns}x${config.rows}.png`);
      }
    }, "image/png");
  }

  function exportGangPdfs() {
    if (!image) {
      return;
    }
    const cleanStem = imageName.replace(/\.[^.]+$/, "").replace(/[^a-z0-9]+/gi, "-") || "cassette";
    gangPlan.segments.forEach((segment, index) => {
      const gangSheet = drawGangSheet(image, config, segment, index + 1, gangPlan.segments.length);
      const blob = canvasToPdfBlob(gangSheet.canvas, gangSheet.pageWidthIn, gangSheet.pageHeightIn);
      const partSuffix = gangPlan.segments.length > 1 ? `_part${index + 1}` : "";
      window.setTimeout(() => {
        downloadBlob(blob, `${cleanStem}-${config.columns}x${config.rows}-gang-22in${partSuffix}.pdf`);
      }, index * 350);
    });
  }

  const ratio = getLayoutRatio(config);
  const megapixels = ((output.width * output.height) / 1_000_000).toFixed(1);

  return (
    <main className="tool-shell">
      <section className="canvas-panel">
        <canvas
          ref={canvasRef}
          className="production-canvas"
          style={{ aspectRatio: ratio }}
          onPointerDown={(event) => {
            const point = pointerPoint(event);
            setDrag({ ...point, panX: config.panX, panY: config.panY });
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerMove={(event) => {
            if (!drag) {
              return;
            }
            const point = pointerPoint(event);
            const canvas = canvasRef.current!;
            updateConfig({
              panX: drag.panX + (point.x - drag.x) / canvas.getBoundingClientRect().width,
              panY: drag.panY + (point.y - drag.y) / canvas.getBoundingClientRect().height
            });
          }}
          onPointerUp={() => setDrag(null)}
          onPointerCancel={() => setDrag(null)}
        />
        <div className="status-strip">
          <span>{imageName}</span>
          <span>
            {output.width} x {output.height}px, {megapixels} MP
          </span>
        </div>
      </section>

      <aside className="control-rail">
        <div className="panel">
          <p className="eyebrow">Admin production</p>
          <h1>DTF sticker mapper</h1>
        </div>

        <div className="panel">
          <h2>Artwork</h2>
          <div className="button-grid">
            {artworkOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                className={artworkSrc === option.src ? "selected" : ""}
                onClick={() => {
                  setArtworkSrc(option.src);
                  setImageName(option.name);
                }}
              >
                {option.name}
              </button>
            ))}
          </div>
          <label className="file-control">
            Upload image
            <input type="file" accept="image/*" onChange={(event) => handleUpload(event.target.files?.[0])} />
          </label>
        </div>

        <div className="panel two-col">
          <label>
            Columns
            <input
              type="number"
              min={1}
              max={24}
              value={config.columns}
              onChange={(event) =>
                updateConfig({ columns: Math.min(24, Math.max(1, Math.round(Number(event.target.value)))) })
              }
            />
          </label>
          <label>
            Rows
            <input
              type="number"
              min={1}
              max={24}
              value={config.rows}
              onChange={(event) =>
                updateConfig({ rows: Math.min(24, Math.max(1, Math.round(Number(event.target.value)))) })
              }
            />
          </label>
          <label>
            Clearance
            <input
              type="number"
              min={0}
              max={6}
              step={0.1}
              value={config.breakClearanceMm}
              onChange={(event) =>
                updateConfig({
                  breakClearanceMm: clampNumber(Number(event.target.value), 0, 6, TAPE.bottomBreak.clearanceMm)
                })
              }
            />
          </label>
          <label>
            Raised height
            <input
              type="number"
              min={1}
              max={30}
              step={0.1}
              value={config.breakHeightMm}
              onChange={(event) =>
                updateConfig({
                  breakHeightMm: clampNumber(Number(event.target.value), 1, 30, TAPE.bottomBreak.heightMm)
                })
              }
            />
          </label>
        </div>

        <div className="panel">
          <label className="switch-line">
            <input
              type="checkbox"
              checked={config.bottomBreakEnabled}
              onChange={(event) => updateConfig({ bottomBreakEnabled: event.target.checked })}
            />
            Separate raised lower section
          </label>
          <label>
            Scale {Math.round(config.zoom * 100)}%
            <input
              type="range"
              min={1}
              max={4}
              step={0.01}
              value={config.zoom}
              onChange={(event) => updateConfig({ zoom: Number(event.target.value) })}
            />
          </label>
          <div className="button-grid">
            <button type="button" onClick={() => updateConfig({ panX: 0, panY: 0 })}>
              Center
            </button>
            <button type="button" onClick={() => updateConfig({ panX: 0, panY: 0, zoom: 1 })}>
              Fit
            </button>
          </div>
        </div>

        <div className="panel">
          <h2>Exports</h2>
          <p className="metric">PNG: {output.width} x {output.height}px</p>
          <button type="button" className="primary-button" onClick={exportPng}>
            Download PNG
          </button>
          <p className="metric">
            Gang: {TAPE.gangSheet.widthIn} x {mmToIn(gangPlan.pageHeightMm).toFixed(1)}in,
            {" "}{gangPlan.segments.length} PDF{gangPlan.segments.length === 1 ? "" : "s"},{" "}
            {formatCurrency(gangPlan.optimizedCost)}
            {Number.isFinite(gangPlan.fullCost) && gangPlan.savesMoney
              ? ` saves ${formatCurrency(gangPlan.fullCost - gangPlan.optimizedCost)}`
              : ""}
          </p>
          <button type="button" className="secondary-button" onClick={exportGangPdfs}>
            Download Optimized Gang PDFs
          </button>
        </div>
      </aside>
    </main>
  );
}
