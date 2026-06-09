import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import {
  bilinearPoint,
  createPrototypeCalibration,
  defaultProductRenderSettings,
  getTapeFeatures,
  normalizeCalibration
} from "./calibration";
import { getProductPhoto } from "./assets";
import { mmToPx, TAPE } from "./geometry";
import { getSupabaseAdminClient } from "./supabase";
import type { Point, ProductCalibration, Quad, TapeCircleFeature } from "./types";

const thumbSize = 720;
const sourceArtworkWidth = 1800;

type Rgb = { r: number; g: number; b: number };
type Rgba = { r: number; g: number; b: number; a: number };
type RawImage = {
  data: Uint8ClampedArray;
  width: number;
  height: number;
  channels: number;
};
type FrameMapping = {
  mapPoint: (point: Point) => Point;
};

function clampChannel(value: number) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function mix(a: Rgb, b: Rgb, amount: number): Rgb {
  return {
    r: clampChannel(a.r + (b.r - a.r) * amount),
    g: clampChannel(a.g + (b.g - a.g) * amount),
    b: clampChannel(a.b + (b.b - a.b) * amount)
  };
}

function colorString(color: Rgb) {
  return `rgb(${color.r}, ${color.g}, ${color.b})`;
}

function thumbnailBackgroundFromAverage(color: Rgb) {
  const luminance = (0.2126 * color.r + 0.7152 * color.g + 0.0722 * color.b) / 255;
  const saturation = (Math.max(color.r, color.g, color.b) - Math.min(color.r, color.g, color.b)) / 255;

  if (saturation < 0.08) {
    return mix({ r: 250, g: 185, b: 60 }, color, 0.18);
  }

  if (luminance > 0.78) {
    return mix(color, { r: 41, g: 41, b: 41 }, 0.34);
  }

  if (luminance < 0.22) {
    return mix(color, { r: 255, g: 255, b: 255 }, 0.58);
  }

  return mix(color, { r: 255, g: 255, b: 255 }, 0.42);
}

async function averageImageColor(originalBuffer: Buffer): Promise<Rgb> {
  const stats = await sharp(originalBuffer, { failOn: "none" })
    .rotate()
    .resize(96, 96, { fit: "cover" })
    .removeAlpha()
    .stats();

  return {
    r: stats.channels[0]?.mean ?? 245,
    g: stats.channels[1]?.mean ?? 241,
    b: stats.channels[2]?.mean ?? 237
  };
}

function isCalibrationPayload(value: unknown): value is ProductCalibration {
  const candidate = value as ProductCalibration | null;
  return Boolean(
    candidate &&
      candidate.photo &&
      candidate.layout &&
      Array.isArray(candidate.tapes) &&
      candidate.tapes.length > 0
  );
}

async function loadSquareCalibration() {
  const supabase = getSupabaseAdminClient();

  if (supabase) {
    const { data } = await supabase
      .from("product_calibrations")
      .select("calibration")
      .eq("layout", "square")
      .maybeSingle();

    if (isCalibrationPayload(data?.calibration)) {
      return normalizeCalibration(data.calibration);
    }
  }

  const calibrationPath = path.join(
    process.cwd(),
    "public",
    "calibration",
    "prototype-wall-unit-calibration.json"
  );

  try {
    const parsed = JSON.parse(await readFile(calibrationPath, "utf8")) as unknown;
    if (isCalibrationPayload(parsed)) {
      return normalizeCalibration(parsed);
    }
  } catch {
    // Fall through to the same default calibration used by the builder.
  }

  return normalizeCalibration(createPrototypeCalibration("square"));
}

async function rawArtworkSource(originalBuffer: Buffer, calibration: ProductCalibration): Promise<RawImage> {
  const settings = {
    ...defaultProductRenderSettings,
    ...calibration.renderSettings
  };
  const sourceLayout = {
    width:
      calibration.layout.columns * TAPE.widthMm +
      Math.max(0, calibration.layout.columns - 1) * settings.artworkGapXMm,
    height:
      calibration.layout.rows * TAPE.heightMm +
      Math.max(0, calibration.layout.rows - 1) * settings.artworkGapYMm,
    gapXMm: settings.artworkGapXMm,
    gapYMm: settings.artworkGapYMm
  };
  const sourceHeight = Math.round(sourceArtworkWidth / (sourceLayout.width / sourceLayout.height));
  const source = await sharp(originalBuffer, { failOn: "none" })
    .rotate()
    .resize(sourceArtworkWidth, sourceHeight, { fit: "cover" })
    .ensureAlpha()
    .raw()
    .toBuffer();

  return { data: new Uint8ClampedArray(source), width: sourceArtworkWidth, height: sourceHeight, channels: 4 };
}

function getFrameMapping(calibration: ProductCalibration): FrameMapping {
  const photo = getProductPhoto("square");
  const frame = calibration.previewFrame ?? {
    x: 0,
    y: 0,
    width: photo.width,
    height: photo.height,
    rotationDeg: 0
  };
  const radians = (frame.rotationDeg * Math.PI) / 180;
  const cos = Math.cos(-radians);
  const sin = Math.sin(-radians);
  const center = {
    x: frame.x + frame.width / 2,
    y: frame.y + frame.height / 2
  };
  const scaleX = thumbSize / frame.width;
  const scaleY = thumbSize / frame.height;

  return {
    mapPoint: (point) => {
      const dx = point.x - center.x;
      const dy = point.y - center.y;
      return {
        x: thumbSize / 2 + (dx * cos - dy * sin) * scaleX,
        y: thumbSize / 2 + (dx * sin + dy * cos) * scaleY
      };
    }
  };
}

function mapQuad(quad: Quad, mapping: FrameMapping): Quad {
  return quad.map((point) => mapping.mapPoint(point)) as Quad;
}

function solveLinearSystem(matrix: number[][], vector: number[]) {
  const size = vector.length;
  const augmented = matrix.map((row, index) => [...row, vector[index]]);

  for (let pivot = 0; pivot < size; pivot += 1) {
    let bestRow = pivot;
    for (let row = pivot + 1; row < size; row += 1) {
      if (Math.abs(augmented[row][pivot]) > Math.abs(augmented[bestRow][pivot])) {
        bestRow = row;
      }
    }

    [augmented[pivot], augmented[bestRow]] = [augmented[bestRow], augmented[pivot]];

    const pivotValue = augmented[pivot][pivot];
    if (Math.abs(pivotValue) < 1e-10) {
      return null;
    }

    for (let column = pivot; column <= size; column += 1) {
      augmented[pivot][column] /= pivotValue;
    }

    for (let row = 0; row < size; row += 1) {
      if (row === pivot) {
        continue;
      }

      const factor = augmented[row][pivot];
      for (let column = pivot; column <= size; column += 1) {
        augmented[row][column] -= factor * augmented[pivot][column];
      }
    }
  }

  return augmented.map((row) => row[size]);
}

function getHomography(source: Quad, destination: Quad) {
  const matrix: number[][] = [];
  const vector: number[] = [];

  source.forEach((point, index) => {
    const target = destination[index];
    matrix.push([point.x, point.y, 1, 0, 0, 0, -target.x * point.x, -target.x * point.y]);
    vector.push(target.x);
    matrix.push([0, 0, 0, point.x, point.y, 1, -target.y * point.x, -target.y * point.y]);
    vector.push(target.y);
  });

  const solved = solveLinearSystem(matrix, vector);
  return solved ? [solved[0], solved[1], solved[2], solved[3], solved[4], solved[5], solved[6], solved[7], 1] : null;
}

function invertHomography(matrix: number[]) {
  const [a, b, c, d, e, f, g, h, i] = matrix;
  const A = e * i - f * h;
  const B = c * h - b * i;
  const C = b * f - c * e;
  const D = f * g - d * i;
  const E = a * i - c * g;
  const F = c * d - a * f;
  const G = d * h - e * g;
  const H = b * g - a * h;
  const I = a * e - b * d;
  const determinant = a * A + b * D + c * G;

  if (Math.abs(determinant) < 1e-10) {
    return null;
  }

  return [A, B, C, D, E, F, G, H, I].map((value) => value / determinant);
}

function applyHomography(matrix: number[], point: Point): Point {
  const w = matrix[6] * point.x + matrix[7] * point.y + matrix[8];
  return {
    x: (matrix[0] * point.x + matrix[1] * point.y + matrix[2]) / w,
    y: (matrix[3] * point.x + matrix[4] * point.y + matrix[5]) / w
  };
}

function getQuadBounds(quad: Quad) {
  const xs = quad.map((point) => point.x);
  const ys = quad.map((point) => point.y);
  return {
    left: Math.max(0, Math.floor(Math.min(...xs))),
    top: Math.max(0, Math.floor(Math.min(...ys))),
    right: Math.min(thumbSize, Math.ceil(Math.max(...xs))),
    bottom: Math.min(thumbSize, Math.ceil(Math.max(...ys)))
  };
}

function samplePixel(source: RawImage, x: number, y: number): Rgba {
  const clampedX = Math.max(0, Math.min(source.width - 1, x));
  const clampedY = Math.max(0, Math.min(source.height - 1, y));
  const x0 = Math.floor(clampedX);
  const y0 = Math.floor(clampedY);
  const x1 = Math.min(source.width - 1, x0 + 1);
  const y1 = Math.min(source.height - 1, y0 + 1);
  const fx = clampedX - x0;
  const fy = clampedY - y0;
  const i00 = (y0 * source.width + x0) * 4;
  const i10 = (y0 * source.width + x1) * 4;
  const i01 = (y1 * source.width + x0) * 4;
  const i11 = (y1 * source.width + x1) * 4;
  const result = [0, 0, 0, 0];

  for (let channel = 0; channel < 4; channel += 1) {
    const top = source.data[i00 + channel] * (1 - fx) + source.data[i10 + channel] * fx;
    const bottom = source.data[i01 + channel] * (1 - fx) + source.data[i11 + channel] * fx;
    result[channel] = top * (1 - fy) + bottom * fy;
  }

  return { r: result[0], g: result[1], b: result[2], a: result[3] };
}

function setPixel(target: Uint8ClampedArray, index: number, color: Rgba) {
  target[index] = clampChannel(color.r);
  target[index + 1] = clampChannel(color.g);
  target[index + 2] = clampChannel(color.b);
  target[index + 3] = clampChannel(color.a);
}

function blendOver(target: Uint8ClampedArray, index: number, color: Rgba, opacity: number) {
  const alpha = (color.a / 255) * opacity;
  if (alpha <= 0) {
    return;
  }

  target[index] = clampChannel(color.r * alpha + target[index] * (1 - alpha));
  target[index + 1] = clampChannel(color.g * alpha + target[index + 1] * (1 - alpha));
  target[index + 2] = clampChannel(color.b * alpha + target[index + 2] * (1 - alpha));
  target[index + 3] = 255;
}

function pointInQuad(point: Point, quad: Quad) {
  let inside = false;
  for (let i = 0, j = quad.length - 1; i < quad.length; j = i, i += 1) {
    const pi = quad[i];
    const pj = quad[j];
    const intersects =
      pi.y > point.y !== pj.y > point.y &&
      point.x < ((pj.x - pi.x) * (point.y - pi.y)) / (pj.y - pi.y + Number.EPSILON) + pi.x;
    if (intersects) {
      inside = !inside;
    }
  }
  return inside;
}

function applyTone(color: Rgba, brightness: number, contrast: number) {
  const apply = (value: number) => ((value - 128) * contrast + 128) * brightness;
  return {
    r: clampChannel(apply(color.r)),
    g: clampChannel(apply(color.g)),
    b: clampChannel(apply(color.b)),
    a: color.a
  };
}

function restoreCircle(target: Uint8ClampedArray, photo: RawImage, feature: TapeCircleFeature, quad: Quad) {
  const center = bilinearPoint(quad, feature.x, feature.y);
  const right = bilinearPoint(quad, feature.x + feature.r, feature.y);
  const bottom = bilinearPoint(quad, feature.x, feature.y + feature.r);
  const radius =
    (Math.hypot(right.x - center.x, right.y - center.y) +
      Math.hypot(bottom.x - center.x, bottom.y - center.y)) /
    2;
  const left = Math.max(0, Math.floor(center.x - radius));
  const rightBound = Math.min(thumbSize, Math.ceil(center.x + radius));
  const top = Math.max(0, Math.floor(center.y - radius));
  const bottomBound = Math.min(thumbSize, Math.ceil(center.y + radius));

  for (let y = top; y < bottomBound; y += 1) {
    for (let x = left; x < rightBound; x += 1) {
      if (Math.hypot(x + 0.5 - center.x, y + 0.5 - center.y) <= radius) {
        const index = (y * thumbSize + x) * 4;
        setPixel(target, index, samplePixel(photo, x, y));
      }
    }
  }
}

function distanceToSegment(point: Point, a: Point, b: Point) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSq = dx * dx + dy * dy;
  if (lengthSq === 0) {
    return Math.hypot(point.x - a.x, point.y - a.y);
  }
  const t = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / lengthSq));
  return Math.hypot(point.x - (a.x + t * dx), point.y - (a.y + t * dy));
}

function averageTapeScalePxPerMm(quad: Quad) {
  const width =
    (Math.hypot(quad[1].x - quad[0].x, quad[1].y - quad[0].y) +
      Math.hypot(quad[2].x - quad[3].x, quad[2].y - quad[3].y)) /
    2;
  const height =
    (Math.hypot(quad[3].x - quad[0].x, quad[3].y - quad[0].y) +
      Math.hypot(quad[2].x - quad[1].x, quad[2].y - quad[1].y)) /
    2;

  return (width / TAPE.widthMm + height / TAPE.heightMm) / 2;
}

function strokeRaisedPhotoBlend(
  target: Uint8ClampedArray,
  photo: RawImage,
  raisedPolygon: Quad,
  quad: Quad,
  gapMm: number,
  alpha: number
) {
  if (alpha <= 0) {
    return;
  }

  const points = raisedPolygon.map((point) => bilinearPoint(quad, point.x, point.y)) as Quad;
  const bounds = getQuadBounds(points);
  const lineWidth = Math.max(1, gapMm * averageTapeScalePxPerMm(quad));

  for (let y = bounds.top; y < bounds.bottom; y += 1) {
    for (let x = bounds.left; x < bounds.right; x += 1) {
      const point = { x: x + 0.5, y: y + 0.5 };
      const distance = Math.min(
        distanceToSegment(point, points[0], points[1]),
        distanceToSegment(point, points[1], points[2]),
        distanceToSegment(point, points[2], points[3]),
        distanceToSegment(point, points[3], points[0])
      );

      if (distance <= lineWidth / 2) {
        blendOver(target, (y * thumbSize + x) * 4, samplePixel(photo, x, y), alpha);
      }
    }
  }
}

async function getBasePhotoLayer(backgroundColor: Rgb) {
  const basePath = path.join(process.cwd(), "public", "product", "cassette-grid-square-v2.png");
  const base = await sharp(basePath)
    .resize(thumbSize, thumbSize, { fit: "fill" })
    .ensureAlpha()
    .png()
    .toBuffer();
  const composed = await sharp({
    create: {
      width: thumbSize,
      height: thumbSize,
      channels: 4,
      background: colorString(backgroundColor)
    }
  })
    .composite([{ input: base, blend: "over" }])
    .ensureAlpha()
    .raw()
    .toBuffer();

  return { data: new Uint8ClampedArray(composed), width: thumbSize, height: thumbSize, channels: 4 };
}

export async function generateCassetteArtworkThumbnail(originalBuffer: Buffer) {
  const [averageColor, calibration] = await Promise.all([
    averageImageColor(originalBuffer),
    loadSquareCalibration()
  ]);
  const settings = {
    ...defaultProductRenderSettings,
    ...calibration.renderSettings
  };
  const backgroundColor = thumbnailBackgroundFromAverage(averageColor);
  const photoLayer = await getBasePhotoLayer(backgroundColor);
  const target = new Uint8ClampedArray(photoLayer.data);
  const source = await rawArtworkSource(originalBuffer, calibration);
  const mapping = getFrameMapping(calibration);
  const sourceLayout = {
    width:
      calibration.layout.columns * TAPE.widthMm +
      Math.max(0, calibration.layout.columns - 1) * settings.artworkGapXMm,
    height:
      calibration.layout.rows * TAPE.heightMm +
      Math.max(0, calibration.layout.rows - 1) * settings.artworkGapYMm,
    gapXMm: settings.artworkGapXMm,
    gapYMm: settings.artworkGapYMm
  };
  const sourceTapeWidth = mmToPx(TAPE.widthMm, sourceLayout.width, source.width);
  const sourceTapeHeight = mmToPx(TAPE.heightMm, sourceLayout.height, source.height);
  const overlayOpacity = Math.min(1, Math.max(0, settings.artworkOpacity));
  const raisedEdgeArtworkOpacity = Math.min(overlayOpacity, Math.max(0, settings.raisedEdgeArtworkOpacity));
  const raisedPhotoBlendAlpha =
    overlayOpacity > 0 ? Math.min(1, Math.max(0, 1 - raisedEdgeArtworkOpacity / overlayOpacity)) : 0;

  calibration.tapes.forEach((tape) => {
    const features = getTapeFeatures(tape);
    const quad = mapQuad(tape.quad, mapping);
    const unitRect: Quad = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 0, y: 1 }
    ];
    const homography = getHomography(unitRect, quad);
    const inverse = homography ? invertHomography(homography) : null;

    if (!inverse) {
      return;
    }

    const bounds = getQuadBounds(quad);
    const sourceX = mmToPx(
      tape.column * (TAPE.widthMm + sourceLayout.gapXMm),
      sourceLayout.width,
      source.width
    );
    const sourceY = mmToPx(
      tape.row * (TAPE.heightMm + sourceLayout.gapYMm),
      sourceLayout.height,
      source.height
    );

    for (let y = bounds.top; y < bounds.bottom; y += 1) {
      for (let x = bounds.left; x < bounds.right; x += 1) {
        const point = { x: x + 0.5, y: y + 0.5 };
        if (!pointInQuad(point, quad)) {
          continue;
        }

        const mapped = applyHomography(inverse, point);
        if (mapped.x < 0 || mapped.x > 1 || mapped.y < 0 || mapped.y > 1) {
          continue;
        }

        const color = applyTone(
          samplePixel(source, sourceX + mapped.x * sourceTapeWidth, sourceY + mapped.y * sourceTapeHeight),
          tape.lighting.brightness,
          tape.lighting.contrast
        );
        const index = (y * thumbSize + x) * 4;
        blendOver(target, index, color, overlayOpacity);

        if (tape.lighting.shadow > 0) {
          const shadow = Math.max(0, Math.min(1, tape.lighting.shadow));
          target[index] = clampChannel(target[index] * (1 - shadow));
          target[index + 1] = clampChannel(target[index + 1] * (1 - shadow));
          target[index + 2] = clampChannel(target[index + 2] * (1 - shadow));
        }
      }
    }

    features.transparentHoles.forEach((feature) => restoreCircle(target, photoLayer, feature, quad));
    features.blackHoles.forEach((feature) => restoreCircle(target, photoLayer, feature, quad));
    features.raised.blackHoles.forEach((feature) => restoreCircle(target, photoLayer, feature, quad));

    if (features.raised.enabled) {
      strokeRaisedPhotoBlend(
        target,
        photoLayer,
        features.raised.polygon,
        quad,
        features.raised.gapMm,
        raisedPhotoBlendAlpha
      );
    }
  });

  return sharp(Buffer.from(target), {
    raw: {
      width: thumbSize,
      height: thumbSize,
      channels: 4
    }
  })
    .webp({ quality: 84 })
    .toBuffer();
}
