"use client";

import { useEffect, useRef, useState } from "react";
import { productPhoto } from "@/lib/assets";
import {
  bilinearPoint,
  createDefaultTapeFeatures,
  createPrototypeCalibration,
  getTapeFeatures,
  localPointFromQuad,
  normalizeCalibration,
  updateRaisedPoint,
  updateTapeCircleFeature,
  updateTapeFeatures,
  updateTapePoint
} from "@/lib/calibration";
import { loadImage, type LoadedImage } from "@/lib/image";
import { getScaledCalibrationPoint, unscaleCalibrationPoint } from "@/lib/preview-renderer";
import type { Point, ProductCalibration, Quad, TapeCircleFeature } from "@/lib/types";
import { estimateCalibrationFromPhoto } from "@/lib/vision-estimator";

type DragState = {
  kind: "handle";
  tapeIndex: number;
  pointIndex: number;
} | {
  kind: "circle";
  tapeIndex: number;
  group: "transparentHoles" | "blackHoles" | "raisedBlackHoles";
  circleId: string;
} | {
  kind: "raised";
  tapeIndex: number;
  pointIndex: number;
} | {
  kind: "pending-pan";
  start: Point;
  origin: ViewTransform;
} | {
  kind: "pan";
  start: Point;
  origin: ViewTransform;
};

type FeatureTarget = {
  id: string;
  label: string;
  type: "circle";
  group: "transparentHoles" | "blackHoles" | "raisedBlackHoles";
  circle: TapeCircleFeature;
} | {
  id: string;
  label: string;
  type: "raised-point";
  pointIndex: number;
  point: Point;
};

type ViewTransform = {
  zoom: number;
  panX: number;
  panY: number;
};

const minZoom = 1;
const maxZoom = 8;
const defaultFeatureTarget = "circle:transparentHoles:roller-left";
const mainCornerHitPx = 14;
const featureCenterHitPx = 9;
const raisedCornerHitPx = 10;
const panStartPx = 4;
const defaultPreviewFrame = createPrototypeCalibration().previewFrame ?? {
  x: 650,
  y: 120,
  width: 2850,
  height: 2850,
  rotationDeg: 0
};

function downloadText(text: string, filename: string) {
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 5000);
}

function getPhotoRect(photo: LoadedImage, width: number, height: number) {
  const scale = Math.min(width / photo.naturalWidth, height / photo.naturalHeight);
  const drawWidth = photo.naturalWidth * scale;
  const drawHeight = photo.naturalHeight * scale;

  return {
    x: width / 2 - drawWidth / 2,
    y: height / 2 - drawHeight / 2,
    width: drawWidth,
    height: drawHeight
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function pointInPolygon(point: Point, polygon: Point[]) {
  let inside = false;

  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index, index += 1) {
    const currentPoint = polygon[index];
    const previousPoint = polygon[previous];
    const intersects =
      currentPoint.y > point.y !== previousPoint.y > point.y &&
      point.x <
        ((previousPoint.x - currentPoint.x) * (point.y - currentPoint.y)) /
          (previousPoint.y - currentPoint.y) +
          currentPoint.x;

    if (intersects) {
      inside = !inside;
    }
  }

  return inside;
}

function scaleLocalPoint(local: Point, tapeQuad: Quad, photo: LoadedImage, width: number, height: number) {
  return getScaledCalibrationPoint(
    bilinearPoint(tapeQuad, local.x, local.y),
    photo,
    width,
    height
  );
}

function circleRadiusPx(
  circle: TapeCircleFeature,
  tapeQuad: Quad,
  photo: LoadedImage,
  width: number,
  height: number
) {
  const center = scaleLocalPoint(circle, tapeQuad, photo, width, height);
  const right = scaleLocalPoint({ x: circle.x + circle.r, y: circle.y }, tapeQuad, photo, width, height);
  const bottom = scaleLocalPoint({ x: circle.x, y: circle.y + circle.r }, tapeQuad, photo, width, height);

  return (
    Math.hypot(right.x - center.x, right.y - center.y) +
    Math.hypot(bottom.x - center.x, bottom.y - center.y)
  ) / 2;
}

function previewFrameCorners(frame: NonNullable<ProductCalibration["previewFrame"]>): Quad {
  const center = {
    x: frame.x + frame.width / 2,
    y: frame.y + frame.height / 2
  };
  const radians = (frame.rotationDeg * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const corners: Quad = [
    { x: frame.x, y: frame.y },
    { x: frame.x + frame.width, y: frame.y },
    { x: frame.x + frame.width, y: frame.y + frame.height },
    { x: frame.x, y: frame.y + frame.height }
  ];

  return corners.map((point) => {
    const dx = point.x - center.x;
    const dy = point.y - center.y;
    return {
      x: center.x + dx * cos - dy * sin,
      y: center.y + dx * sin + dy * cos
    };
  }) as Quad;
}

function isCalibration(value: unknown): value is ProductCalibration {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<ProductCalibration>;
  return Boolean(candidate.photo && candidate.layout && candidate.masks && Array.isArray(candidate.tapes));
}

export function CalibrationEditor() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [photo, setPhoto] = useState<LoadedImage | null>(null);
  const [calibration, setCalibration] = useState<ProductCalibration>(() => createPrototypeCalibration());
  const [selectedTape, setSelectedTape] = useState(0);
  const [selectedFeature, setSelectedFeature] = useState(defaultFeatureTarget);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [view, setView] = useState<ViewTransform>({ zoom: 1, panX: 0, panY: 0 });
  const [status, setStatus] = useState("Loading prototype photo...");

  useEffect(() => {
    let active = true;

    loadImage(productPhoto.src).then((image) => {
      if (active) {
        setPhoto(image);
        setStatus("Photo loaded. Run vision estimate, then zoom in and correct the tape corners.");
      }
    });

    fetch(`/api/calibration?ts=${Date.now()}`, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) {
          return null;
        }
        return (await response.json()) as unknown;
      })
      .then((saved) => {
        if (active && isCalibration(saved)) {
          setCalibration(normalizeCalibration(saved));
          setSelectedTape(0);
          setSelectedFeature(defaultFeatureTarget);
          setStatus("Saved calibration loaded from this project.");
        }
      })
      .catch(() => {
        if (active) {
          setStatus("Photo loaded. No saved calibration found yet.");
        }
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !photo) {
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

      context.clearRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = "#101615";
      context.fillRect(0, 0, canvas.width, canvas.height);

      const photoRect = getPhotoRect(photo, canvas.width, canvas.height);
      context.save();
      context.translate(view.panX, view.panY);
      context.scale(view.zoom, view.zoom);
      context.drawImage(photo, photoRect.x, photoRect.y, photoRect.width, photoRect.height);

      const frame = calibration.previewFrame ?? defaultPreviewFrame;
      const framePoints = previewFrameCorners(frame).map((point) =>
        getScaledCalibrationPoint(point, photo, canvas.width, canvas.height)
      );
      context.save();
      context.beginPath();
      context.moveTo(framePoints[0].x, framePoints[0].y);
      framePoints.slice(1).forEach((point) => context.lineTo(point.x, point.y));
      context.closePath();
      context.fillStyle = "rgba(254, 185, 60, 0.1)";
      context.fill();
      context.strokeStyle = "#feb93c";
      context.lineWidth = 4 / view.zoom;
      context.setLineDash([12 / view.zoom, 8 / view.zoom]);
      context.stroke();
      context.setLineDash([]);
      context.fillStyle = "#feb93c";
      context.font = `${13 / view.zoom}px Arial, sans-serif`;
      context.textAlign = "left";
      context.fillText("Customizer crop", framePoints[0].x + 10 / view.zoom, framePoints[0].y + 20 / view.zoom);
      context.restore();

      calibration.tapes.forEach((tape, tapeIndex) => {
        const points = tape.quad.map((point) =>
          getScaledCalibrationPoint(point, photo, canvas.width, canvas.height)
        );
        const active = tapeIndex === selectedTape;

        context.save();
        context.beginPath();
        context.moveTo(points[0].x, points[0].y);
        points.slice(1).forEach((point) => context.lineTo(point.x, point.y));
        context.closePath();
        context.strokeStyle = active ? "#de6b35" : "rgba(255,255,255,0.55)";
        context.lineWidth = active ? 4 / view.zoom : 2 / view.zoom;
        context.stroke();

        const center = points.reduce(
          (sum, point) => ({ x: sum.x + point.x / 4, y: sum.y + point.y / 4 }),
          { x: 0, y: 0 }
        );
        const labelWidth = 36 / view.zoom;
        const labelHeight = 22 / view.zoom;
        context.fillStyle = active ? "rgba(222, 107, 53, 0.92)" : "rgba(0,0,0,0.65)";
        context.fillRect(center.x - labelWidth / 2, center.y - labelHeight / 2 - 3 / view.zoom, labelWidth, labelHeight);
        context.fillStyle = "white";
        context.font = `${Math.max(11, canvas.width / 140) / view.zoom}px Arial, sans-serif`;
        context.textAlign = "center";
        context.fillText(String(tape.index + 1), center.x, center.y + 6 / view.zoom);

        if (active) {
          const features = getTapeFeatures(tape);
          const drawCircleHandle = (
            circle: TapeCircleFeature,
            group: "transparentHoles" | "blackHoles" | "raisedBlackHoles"
          ) => {
            const centerPoint = scaleLocalPoint(circle, tape.quad, photo, canvas.width, canvas.height);
            const radius = circleRadiusPx(circle, tape.quad, photo, canvas.width, canvas.height);
            const targetId = `circle:${group}:${circle.id}`;
            context.beginPath();
            context.arc(centerPoint.x, centerPoint.y, radius, 0, Math.PI * 2);
            context.fillStyle =
              group === "transparentHoles" ? "rgba(20, 184, 166, 0.18)" : "rgba(0, 0, 0, 0.72)";
            context.fill();
            context.strokeStyle = selectedFeature === targetId ? "#de6b35" : group === "transparentHoles" ? "#14b8a6" : "#facc15";
            context.lineWidth = selectedFeature === targetId ? 3 / view.zoom : 2 / view.zoom;
            context.stroke();
            context.beginPath();
            context.arc(centerPoint.x, centerPoint.y, 4.5 / view.zoom, 0, Math.PI * 2);
            context.fillStyle = context.strokeStyle;
            context.fill();
          };

          if (features.raised.enabled) {
            const raisedPoints = features.raised.polygon.map((local) =>
              scaleLocalPoint(local, tape.quad, photo, canvas.width, canvas.height)
            );
            context.beginPath();
            context.moveTo(raisedPoints[0].x, raisedPoints[0].y);
            raisedPoints.slice(1).forEach((point) => context.lineTo(point.x, point.y));
            context.closePath();
            context.strokeStyle = "rgba(222, 107, 53, 0.9)";
            context.lineWidth = 2.5 / view.zoom;
            context.setLineDash([8 / view.zoom, 5 / view.zoom]);
            context.stroke();
            context.setLineDash([]);
            raisedPoints.forEach((point, pointIndex) => {
              const targetId = `raised:${pointIndex}`;
              context.beginPath();
              context.rect(point.x - 5 / view.zoom, point.y - 5 / view.zoom, 10 / view.zoom, 10 / view.zoom);
              context.fillStyle = selectedFeature === targetId ? "#de6b35" : "#ffffff";
              context.fill();
              context.strokeStyle = "#17201d";
              context.lineWidth = 1.5 / view.zoom;
              context.stroke();
            });
          }

          features.transparentHoles.forEach((circle) => drawCircleHandle(circle, "transparentHoles"));
          features.blackHoles.forEach((circle) => drawCircleHandle(circle, "blackHoles"));
          features.raised.blackHoles.forEach((circle) => drawCircleHandle(circle, "raisedBlackHoles"));

          points.forEach((point, pointIndex) => {
            context.beginPath();
            context.arc(point.x, point.y, 7 / view.zoom, 0, Math.PI * 2);
            context.fillStyle = pointIndex === 0 ? "#0f766e" : "#ffffff";
            context.fill();
            context.strokeStyle = "#17201d";
            context.lineWidth = 2 / view.zoom;
            context.stroke();
          });
        }
        context.restore();
      });
      context.restore();
    };

    render();
    window.addEventListener("resize", render);
    return () => window.removeEventListener("resize", render);
  }, [photo, calibration, selectedFeature, selectedTape, view]);

  function canvasClientPoint(clientX: number, clientY: number): Point {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  }

  function screenToWorld(point: Point): Point {
    return {
      x: (point.x - view.panX) / view.zoom,
      y: (point.y - view.panY) / view.zoom
    };
  }

  function findNearestHandle(worldPoint: Point) {
    if (!photo || !canvasRef.current) {
      return null;
    }

    let bestTapeIndex = -1;
    let bestPointIndex = -1;
    let bestDistance = Infinity;

    calibration.tapes.forEach((tape, tapeIndex) => {
      tape.quad.forEach((rawPoint, pointIndex) => {
        const scaled = getScaledCalibrationPoint(
          rawPoint,
          photo,
          canvasRef.current!.width,
          canvasRef.current!.height
        );
        const distance = Math.hypot(worldPoint.x - scaled.x, worldPoint.y - scaled.y) * view.zoom;
        if (distance < bestDistance) {
          bestTapeIndex = tapeIndex;
          bestPointIndex = pointIndex;
          bestDistance = distance;
        }
      });
    });

    return bestDistance < mainCornerHitPx
      ? { tapeIndex: bestTapeIndex, pointIndex: bestPointIndex, distance: bestDistance }
      : null;
  }

  function featureTargetsForTape(tapeIndex: number): FeatureTarget[] {
    const tape = calibration.tapes[tapeIndex];
    if (!tape) {
      return [];
    }

    const features = getTapeFeatures(tape);
    const transparent = features.transparentHoles.map((circle) => ({
      id: `circle:transparentHoles:${circle.id}`,
      label: circle.label,
      type: "circle" as const,
      group: "transparentHoles" as const,
      circle
    }));
    const black = features.blackHoles.map((circle) => ({
      id: `circle:blackHoles:${circle.id}`,
      label: circle.label,
      type: "circle" as const,
      group: "blackHoles" as const,
      circle
    }));
    const raisedBlack = features.raised.blackHoles.map((circle) => ({
      id: `circle:raisedBlackHoles:${circle.id}`,
      label: circle.label,
      type: "circle" as const,
      group: "raisedBlackHoles" as const,
      circle
    }));
    const raisedPoints = features.raised.polygon.map((point, pointIndex) => ({
      id: `raised:${pointIndex}`,
      label: `Raised corner ${pointIndex + 1}`,
      type: "raised-point" as const,
      pointIndex,
      point
    }));

    return [...transparent, ...black, ...raisedBlack, ...raisedPoints];
  }

  function selectedFeatureTarget() {
    return featureTargetsForTape(selectedTape).find((target) => target.id === selectedFeature) ?? null;
  }

  function findNearestFeatureHandle(worldPoint: Point): FeatureTarget | null {
    if (!photo || !canvasRef.current) {
      return null;
    }

    const tape = calibration.tapes[selectedTape];
    const targets = featureTargetsForTape(selectedTape);
    let bestTarget: FeatureTarget | null = null;
    let bestDistance = Infinity;

    targets.forEach((target) => {
      const point =
        target.type === "circle"
          ? scaleLocalPoint(target.circle, tape.quad, photo, canvasRef.current!.width, canvasRef.current!.height)
          : scaleLocalPoint(target.point, tape.quad, photo, canvasRef.current!.width, canvasRef.current!.height);
      const distance = Math.hypot(worldPoint.x - point.x, worldPoint.y - point.y) * view.zoom;
      const hitRadius = target.type === "circle" ? featureCenterHitPx : raisedCornerHitPx;

      if (distance < hitRadius && distance < bestDistance) {
        bestTarget = target;
        bestDistance = distance;
      }
    });

    return bestTarget;
  }

  function findTapeAtPoint(worldPoint: Point) {
    if (!photo || !canvasRef.current) {
      return -1;
    }

    return calibration.tapes.findIndex((tape) => {
      const points = tape.quad.map((rawPoint) =>
        getScaledCalibrationPoint(
          rawPoint,
          photo,
          canvasRef.current!.width,
          canvasRef.current!.height
        )
      );
      return pointInPolygon(worldPoint, points);
    });
  }

  function setZoom(nextZoom: number, anchor?: Point) {
    const canvas = canvasRef.current;
    setView((current) => {
      const zoom = clamp(nextZoom, minZoom, maxZoom);
      const anchorPoint = anchor ?? {
        x: (canvas?.width ?? 0) / 2,
        y: (canvas?.height ?? 0) / 2
      };
      const worldAnchor = {
        x: (anchorPoint.x - current.panX) / current.zoom,
        y: (anchorPoint.y - current.panY) / current.zoom
      };

      return {
        zoom,
        panX: anchorPoint.x - worldAnchor.x * zoom,
        panY: anchorPoint.y - worldAnchor.y * zoom
      };
    });
  }

  function importCalibration(file: File | undefined) {
    if (!file) {
      return;
    }
    file.text().then((text) => {
      const parsed = JSON.parse(text) as ProductCalibration;
      setCalibration(normalizeCalibration(parsed));
      setSelectedTape(0);
      setSelectedFeature(defaultFeatureTarget);
      setStatus(`Imported ${file.name}.`);
    });
  }

  function runVisionEstimate() {
    if (!photo) {
      return;
    }

    setStatus("Analyzing per-tape edges from the photo...");
    window.setTimeout(() => {
      try {
        const estimated = estimateCalibrationFromPhoto(photo, calibration);
        setCalibration(normalizeCalibration(estimated));
        setSelectedTape(0);
        setSelectedFeature(defaultFeatureTarget);
        setStatus("Vision estimate complete. Zoom in and correct any tape corners that still drift.");
      } catch (error) {
        setStatus(error instanceof Error ? error.message : "Vision estimate failed.");
      }
    }, 20);
  }

  async function saveCalibration() {
    setStatus("Saving calibration JSON...");
    const response = await fetch("/api/calibration", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify(calibration)
    });

    if (!response.ok) {
      const result = (await response.json().catch(() => null)) as { error?: string } | null;
      setStatus(result?.error ?? "Save failed.");
      return;
    }

    setStatus("Saved to public/calibration/prototype-wall-unit-calibration.json.");
  }

  function updatePreviewFrame(
    updater: (frame: NonNullable<ProductCalibration["previewFrame"]>) => NonNullable<ProductCalibration["previewFrame"]>
  ) {
    setCalibration((current) => {
      const normalized = normalizeCalibration(current);
      return {
        ...normalized,
        previewFrame: updater(normalized.previewFrame ?? defaultPreviewFrame)
      };
    });
  }

  function fitPreviewFrameToTapes() {
    if (!photo) {
      return;
    }

    const points = calibration.tapes.flatMap((tape) => tape.quad);
    const minX = Math.min(...points.map((point) => point.x));
    const maxX = Math.max(...points.map((point) => point.x));
    const minY = Math.min(...points.map((point) => point.y));
    const maxY = Math.max(...points.map((point) => point.y));
    const center = {
      x: (minX + maxX) / 2,
      y: (minY + maxY) / 2
    };
    const padding = 140;
    const size = Math.min(
      Math.max(maxX - minX, maxY - minY) + padding * 2,
      Math.max(photo.naturalWidth, photo.naturalHeight)
    );

    updatePreviewFrame(() => ({
      x: clamp(center.x - size / 2, 0, Math.max(0, photo.naturalWidth - size)),
      y: clamp(center.y - size / 2, 0, Math.max(0, photo.naturalHeight - size)),
      width: size,
      height: size,
      rotationDeg: 0
    }));
    setStatus("Customizer crop fitted around the calibrated tapes. Save JSON to use it on the public preview.");
  }

  const selected = calibration.tapes[selectedTape];
  const selectedFeatures = getTapeFeatures(selected);
  const featureTargets = featureTargetsForTape(selectedTape);
  const activeFeature = selectedFeatureTarget();
  const previewFrame = calibration.previewFrame ?? defaultPreviewFrame;

  return (
    <main className="tool-shell">
      <section className="canvas-panel">
        <canvas
          ref={canvasRef}
          className="calibration-canvas"
          aria-label="Calibration editor"
          style={{ cursor: drag?.kind === "pan" ? "grabbing" : "grab" }}
          onPointerDown={(event) => {
            const point = canvasClientPoint(event.clientX, event.clientY);
            const world = screenToWorld(point);
            const handle = findNearestHandle(world);
            if (handle) {
              setSelectedTape(handle.tapeIndex);
              setDrag({
                kind: "handle",
                tapeIndex: handle.tapeIndex,
                pointIndex: handle.pointIndex
              });
              event.currentTarget.setPointerCapture(event.pointerId);
              return;
            }

            const feature = findNearestFeatureHandle(world);
            if (feature) {
              setSelectedFeature(feature.id);
              setDrag(
                feature.type === "circle"
                  ? {
                      kind: "circle",
                      tapeIndex: selectedTape,
                      group: feature.group,
                      circleId: feature.circle.id
                    }
                  : {
                      kind: "raised",
                      tapeIndex: selectedTape,
                      pointIndex: feature.pointIndex
                    }
              );
              event.currentTarget.setPointerCapture(event.pointerId);
              return;
            }

            const tapeIndex = findTapeAtPoint(world);
            if (tapeIndex >= 0) {
              setSelectedTape(tapeIndex);
            }
            setDrag({ kind: "pending-pan", start: point, origin: view });
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerMove={(event) => {
            if (!drag || !canvasRef.current) {
              return;
            }

            const raw = canvasClientPoint(event.clientX, event.clientY);

            if (drag.kind === "pending-pan") {
              if (Math.hypot(raw.x - drag.start.x, raw.y - drag.start.y) < panStartPx) {
                return;
              }

              setDrag({ kind: "pan", start: drag.start, origin: drag.origin });
              setView({
                ...drag.origin,
                panX: drag.origin.panX + raw.x - drag.start.x,
                panY: drag.origin.panY + raw.y - drag.start.y
              });
              return;
            }

            if (drag.kind === "pan") {
              setView({
                ...drag.origin,
                panX: drag.origin.panX + raw.x - drag.start.x,
                panY: drag.origin.panY + raw.y - drag.start.y
              });
              return;
            }

            if (!photo) {
              return;
            }

            const world = screenToWorld(raw);
            const unscaled = unscaleCalibrationPoint(
              world,
              photo,
              canvasRef.current.width,
              canvasRef.current.height
            );
            const local = localPointFromQuad(calibration.tapes[drag.tapeIndex].quad, unscaled);

            if (drag.kind === "circle") {
              setCalibration((current) =>
                updateTapeCircleFeature(current, drag.tapeIndex, drag.group, drag.circleId, {
                  x: local.x,
                  y: local.y
                })
              );
              return;
            }

            if (drag.kind === "raised") {
              setCalibration((current) =>
                updateRaisedPoint(current, drag.tapeIndex, drag.pointIndex, local)
              );
              return;
            }

            setCalibration((current) =>
              updateTapePoint(current, drag.tapeIndex, drag.pointIndex, unscaled)
            );
          }}
          onPointerUp={() => setDrag(null)}
          onPointerCancel={() => setDrag(null)}
          onWheel={(event) => {
            event.preventDefault();
            const point = canvasClientPoint(event.clientX, event.clientY);
            setZoom(view.zoom * (event.deltaY < 0 ? 1.12 : 0.88), point);
          }}
        />
      </section>

      <aside className="control-rail">
        <div className="panel">
          <p className="eyebrow">Admin calibration</p>
          <h1>Photo mapping editor</h1>
          <p>
            Run the per-tape vision estimate, then zoom and pan the photo to correct corners one
            cassette at a time. The saved JSON drives the realistic customer mockup.
          </p>
          <p className="status-message">{status}</p>
        </div>

        <div className="panel two-col">
          <button
            type="button"
            onClick={runVisionEstimate}
            disabled={!photo}
          >
            Vision estimate
          </button>
          <button
            type="button"
            onClick={() => {
              setCalibration(createPrototypeCalibration());
              setSelectedTape(0);
              setSelectedFeature(defaultFeatureTarget);
              setStatus("Reset to the perspective seed.");
            }}
          >
            Reset seed
          </button>
          <button type="button" className="primary-button" onClick={saveCalibration}>
            Save JSON
          </button>
          <button
            type="button"
            onClick={() =>
              downloadText(
                JSON.stringify(calibration, null, 2),
                "prototype-wall-unit-calibration.json"
              )
            }
          >
            Export JSON
          </button>
        </div>

        <div className="panel">
          <h2>Zoom</h2>
          <label>
            Magnification
            <input
              type="range"
              min={minZoom}
              max={maxZoom}
              step={0.1}
              value={view.zoom}
              onChange={(event) => setZoom(Number(event.target.value))}
            />
          </label>
          <div className="three-col">
            <button type="button" onClick={() => setZoom(view.zoom * 0.8)}>
              Zoom out
            </button>
            <button type="button" onClick={() => setView({ zoom: 1, panX: 0, panY: 0 })}>
              Fit
            </button>
            <button type="button" onClick={() => setZoom(view.zoom * 1.25)}>
              Zoom in
            </button>
          </div>
          <p className="metric">Drag empty canvas space to pan. Mouse wheel zooms around the cursor.</p>
        </div>

        <div className="panel">
          <label className="file-control">
            Import JSON
            <input
              type="file"
              accept="application/json,.json"
              onChange={(event) => importCalibration(event.target.files?.[0])}
            />
          </label>
        </div>

        <div className="panel">
          <h2>Customizer Crop</h2>
          <p className="metric">
            The yellow box sets the square public preview framing. Use it to crop out extra wall
            and correct a slightly tilted product photo.
          </p>
          <div className="two-col">
            <label>
              X
              <input
                type="number"
                step={1}
                value={Math.round(previewFrame.x)}
                onChange={(event) =>
                  updatePreviewFrame((frame) => ({
                    ...frame,
                    x: Number(event.target.value)
                  }))
                }
              />
            </label>
            <label>
              Y
              <input
                type="number"
                step={1}
                value={Math.round(previewFrame.y)}
                onChange={(event) =>
                  updatePreviewFrame((frame) => ({
                    ...frame,
                    y: Number(event.target.value)
                  }))
                }
              />
            </label>
          </div>
          <div className="two-col">
            <label>
              Size
              <input
                type="number"
                min={200}
                step={1}
                value={Math.round(previewFrame.width)}
                onChange={(event) => {
                  const size = Math.max(200, Number(event.target.value));
                  updatePreviewFrame((frame) => ({
                    ...frame,
                    width: size,
                    height: size
                  }));
                }}
              />
            </label>
            <label>
              Rotate
              <input
                type="number"
                step={0.1}
                value={Number(previewFrame.rotationDeg.toFixed(1))}
                onChange={(event) =>
                  updatePreviewFrame((frame) => ({
                    ...frame,
                    rotationDeg: Number(event.target.value)
                  }))
                }
              />
            </label>
          </div>
          <div className="two-col">
            <button type="button" onClick={fitPreviewFrameToTapes}>
              Fit to tapes
            </button>
            <button
              type="button"
              onClick={() => {
                updatePreviewFrame(() => defaultPreviewFrame);
                setStatus("Customizer crop reset. Save JSON to keep this framing.");
              }}
            >
              Reset crop
            </button>
          </div>
        </div>

        <div className="panel">
          <h2>Selected Tape</h2>
          <label>
            Tape index
            <input
              type="number"
              min={1}
              max={calibration.tapes.length}
              value={selectedTape + 1}
              onChange={(event) => {
                const next = Math.min(
                  calibration.tapes.length - 1,
                  Math.max(0, Number(event.target.value) - 1)
                );
                setSelectedTape(next);
              }}
            />
          </label>
          <p className="metric">
            Row {selected.row + 1}, column {selected.column + 1}
          </p>
          <p className="metric">{selected.maskIds.length} mask shapes applied</p>
        </div>

        <div className="panel">
          <h2>Per-Tape Geometry</h2>
          <label>
            Edit target
            <select
              value={selectedFeature}
              onChange={(event) => setSelectedFeature(event.target.value)}
            >
              {featureTargets.map((target) => (
                <option key={target.id} value={target.id}>
                  {target.label}
                </option>
              ))}
            </select>
          </label>

          {activeFeature?.type === "circle" ? (
            <div className="three-col">
              <label>
                X
                <input
                  type="number"
                  min={0}
                  max={1}
                  step={0.001}
                  value={Number(activeFeature.circle.x.toFixed(3))}
                  onChange={(event) =>
                    setCalibration((current) =>
                      updateTapeCircleFeature(
                        current,
                        selectedTape,
                        activeFeature.group,
                        activeFeature.circle.id,
                        { x: clamp(Number(event.target.value), 0, 1) }
                      )
                    )
                  }
                />
              </label>
              <label>
                Y
                <input
                  type="number"
                  min={0}
                  max={1}
                  step={0.001}
                  value={Number(activeFeature.circle.y.toFixed(3))}
                  onChange={(event) =>
                    setCalibration((current) =>
                      updateTapeCircleFeature(
                        current,
                        selectedTape,
                        activeFeature.group,
                        activeFeature.circle.id,
                        { y: clamp(Number(event.target.value), 0, 1) }
                      )
                    )
                  }
                />
              </label>
              <label>
                R
                <input
                  type="number"
                  min={0.005}
                  max={0.12}
                  step={0.001}
                  value={Number(activeFeature.circle.r.toFixed(3))}
                  onChange={(event) =>
                    setCalibration((current) =>
                      updateTapeCircleFeature(
                        current,
                        selectedTape,
                        activeFeature.group,
                        activeFeature.circle.id,
                        { r: clamp(Number(event.target.value), 0.005, 0.12) }
                      )
                    )
                  }
                />
              </label>
            </div>
          ) : null}

          {activeFeature?.type === "raised-point" ? (
            <div className="two-col">
              <label>
                X
                <input
                  type="number"
                  min={0}
                  max={1}
                  step={0.001}
                  value={Number(activeFeature.point.x.toFixed(3))}
                  onChange={(event) =>
                    setCalibration((current) =>
                      updateRaisedPoint(current, selectedTape, activeFeature.pointIndex, {
                        x: clamp(Number(event.target.value), 0, 1),
                        y: activeFeature.point.y
                      })
                    )
                  }
                />
              </label>
              <label>
                Y
                <input
                  type="number"
                  min={0}
                  max={1}
                  step={0.001}
                  value={Number(activeFeature.point.y.toFixed(3))}
                  onChange={(event) =>
                    setCalibration((current) =>
                      updateRaisedPoint(current, selectedTape, activeFeature.pointIndex, {
                        x: activeFeature.point.x,
                        y: clamp(Number(event.target.value), 0, 1)
                      })
                    )
                  }
                />
              </label>
            </div>
          ) : null}

          <div className="two-col">
            <label>
              Corner round
              <input
                type="number"
                min={0}
                max={0.1}
                step={0.005}
                value={Number(selectedFeatures.cornerRadius.toFixed(3))}
                onChange={(event) =>
                  setCalibration((current) =>
                    updateTapeFeatures(current, selectedTape, (features) => ({
                      ...features,
                      cornerRadius: clamp(Number(event.target.value), 0, 0.1)
                    }))
                  )
                }
              />
            </label>
            <label>
              Raised gap mm
              <input
                type="number"
                min={0}
                max={2}
                step={0.1}
                value={Number(selectedFeatures.raised.gapMm.toFixed(2))}
                onChange={(event) =>
                  setCalibration((current) =>
                    updateTapeFeatures(current, selectedTape, (features) => ({
                      ...features,
                      raised: {
                        ...features.raised,
                        gapMm: clamp(Number(event.target.value), 0, 2)
                      }
                    }))
                  )
                }
              />
            </label>
          </div>

          <label className="switch-line">
            <input
              type="checkbox"
              checked={selectedFeatures.raised.enabled}
              onChange={(event) =>
                setCalibration((current) =>
                  updateTapeFeatures(current, selectedTape, (features) => ({
                    ...features,
                    raised: {
                      ...features.raised,
                      enabled: event.target.checked
                    }
                  }))
                )
              }
            />
            Raised lower piece edge gap
          </label>

          <button
            type="button"
            onClick={() =>
              setCalibration((current) =>
                updateTapeFeatures(current, selectedTape, () => createDefaultTapeFeatures())
              )
            }
          >
            Reset selected tape masks
          </button>
          <p className="metric">
            Drag cassette corners from the small white outline handles. Drag hole features from their center dots.
          </p>
        </div>

        <div className="panel">
          <h2>Notes</h2>
          <p>
            This is a local instance segmentation style workflow without a hosted ML model: each
            tape gets independent edge refinement and then manual correction. A future SAM or YOLO
            mask source can feed the same per-tape quadrilateral JSON.
          </p>
        </div>
      </aside>
    </main>
  );
}
