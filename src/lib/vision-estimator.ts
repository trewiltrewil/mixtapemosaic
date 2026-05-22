import {
  cloneCalibration,
  createPrototypeCalibration,
  deterministicJitter
} from "./calibration";
import type { LoadedImage } from "./image";
import type { Point, ProductCalibration, Quad, TapeCalibration } from "./types";

type EdgeLine = {
  point: Point;
  direction: Point;
  normal: Point;
  length: number;
};

type RefinedLine = {
  line: EdgeLine;
  score: number;
  offset: number;
};

const estimatorMaxWidth = 2200;
const edgeSearchPx = 70;
const edgeStepPx = 2;
const contrastRadiusPx = 5;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function scalePoint(point: Point, scale: number): Point {
  return {
    x: point.x * scale,
    y: point.y * scale
  };
}

function unscalePoint(point: Point, scale: number): Point {
  return {
    x: point.x / scale,
    y: point.y / scale
  };
}

function scaleQuad(quad: Quad, scale: number): Quad {
  return quad.map((point) => scalePoint(point, scale)) as Quad;
}

function unscaleQuad(quad: Quad, scale: number): Quad {
  return quad.map((point) => unscalePoint(point, scale)) as Quad;
}

function makeLine(start: Point, end: Point): EdgeLine {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.max(0.0001, Math.hypot(dx, dy));
  const direction = {
    x: dx / length,
    y: dy / length
  };

  return {
    point: start,
    direction,
    normal: {
      x: -direction.y,
      y: direction.x
    },
    length
  };
}

function shiftedLine(line: EdgeLine, offset: number): EdgeLine {
  return {
    ...line,
    point: {
      x: line.point.x + line.normal.x * offset,
      y: line.point.y + line.normal.y * offset
    }
  };
}

function pointOnLine(line: EdgeLine, amount: number): Point {
  return {
    x: line.point.x + line.direction.x * line.length * amount,
    y: line.point.y + line.direction.y * line.length * amount
  };
}

function intersectLines(a: EdgeLine, b: EdgeLine): Point | null {
  const x1 = a.point.x;
  const y1 = a.point.y;
  const x2 = a.point.x + a.direction.x;
  const y2 = a.point.y + a.direction.y;
  const x3 = b.point.x;
  const y3 = b.point.y;
  const x4 = b.point.x + b.direction.x;
  const y4 = b.point.y + b.direction.y;
  const denominator = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);

  if (Math.abs(denominator) < 0.00001) {
    return null;
  }

  return {
    x: ((x1 * y2 - y1 * x2) * (x3 - x4) - (x1 - x2) * (x3 * y4 - y3 * x4)) / denominator,
    y: ((x1 * y2 - y1 * x2) * (y3 - y4) - (y1 - y2) * (x3 * y4 - y3 * x4)) / denominator
  };
}

function quadCenter(quad: Quad): Point {
  return quad.reduce(
    (sum, point) => ({
      x: sum.x + point.x / 4,
      y: sum.y + point.y / 4
    }),
    { x: 0, y: 0 }
  );
}

function sideLength(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function polygonArea(quad: Quad) {
  let area = 0;
  for (let index = 0; index < quad.length; index += 1) {
    const current = quad[index];
    const next = quad[(index + 1) % quad.length];
    area += current.x * next.y - next.x * current.y;
  }
  return area / 2;
}

function isInsideImage(point: Point, width: number, height: number) {
  return point.x >= 0 && point.y >= 0 && point.x < width && point.y < height;
}

function buildLuma(image: LoadedImage) {
  const scale = Math.min(1, estimatorMaxWidth / image.naturalWidth);
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });

  if (!context) {
    throw new Error("Could not create calibration analysis canvas");
  }

  context.drawImage(image, 0, 0, width, height);
  const pixels = context.getImageData(0, 0, width, height).data;
  const luma = new Uint8ClampedArray(width * height);

  for (let index = 0; index < luma.length; index += 1) {
    const pixelIndex = index * 4;
    luma[index] =
      pixels[pixelIndex] * 0.299 +
      pixels[pixelIndex + 1] * 0.587 +
      pixels[pixelIndex + 2] * 0.114;
  }

  return { luma, scale, width, height };
}

function sampleLuma(
  luma: Uint8ClampedArray,
  width: number,
  height: number,
  point: Point
) {
  const x = Math.round(point.x);
  const y = Math.round(point.y);

  if (x < 0 || y < 0 || x >= width || y >= height) {
    return null;
  }

  return luma[y * width + x];
}

function scoreLine(
  luma: Uint8ClampedArray,
  width: number,
  height: number,
  line: EdgeLine,
  radius: number
) {
  const sampleCount = 80;
  let total = 0;
  let count = 0;

  for (let index = 0; index < sampleCount; index += 1) {
    const amount = 0.08 + (index / (sampleCount - 1)) * 0.84;
    const point = pointOnLine(line, amount);
    const inside = {
      x: point.x + line.normal.x * radius,
      y: point.y + line.normal.y * radius
    };
    const outside = {
      x: point.x - line.normal.x * radius,
      y: point.y - line.normal.y * radius
    };
    const center = sampleLuma(luma, width, height, point);
    const a = sampleLuma(luma, width, height, inside);
    const b = sampleLuma(luma, width, height, outside);

    if (a === null || b === null || center === null) {
      continue;
    }

    total += Math.abs(a - b) + Math.abs(center - a) * 0.22 + Math.abs(center - b) * 0.22;
    count += 1;
  }

  return count ? total / count : 0;
}

function refineLine(
  luma: Uint8ClampedArray,
  width: number,
  height: number,
  start: Point,
  end: Point,
  searchPx: number,
  stepPx: number,
  radiusPx: number
): RefinedLine {
  const baseLine = makeLine(start, end);
  let best: RefinedLine = {
    line: baseLine,
    score: scoreLine(luma, width, height, baseLine, radiusPx),
    offset: 0
  };

  for (let offset = -searchPx; offset <= searchPx; offset += stepPx) {
    const line = shiftedLine(baseLine, offset);
    const score = scoreLine(luma, width, height, line, radiusPx) - Math.abs(offset) * 0.025;

    if (score > best.score) {
      best = { line, score, offset };
    }
  }

  return best;
}

function isSaneRefinement(seed: Quad, refined: Quad, width: number, height: number) {
  if (refined.some((point) => !isInsideImage(point, width, height))) {
    return false;
  }

  const seedWidth = (sideLength(seed[0], seed[1]) + sideLength(seed[3], seed[2])) / 2;
  const seedHeight = (sideLength(seed[0], seed[3]) + sideLength(seed[1], seed[2])) / 2;
  const refinedWidth = (sideLength(refined[0], refined[1]) + sideLength(refined[3], refined[2])) / 2;
  const refinedHeight = (sideLength(refined[0], refined[3]) + sideLength(refined[1], refined[2])) / 2;
  const seedCenter = quadCenter(seed);
  const refinedCenter = quadCenter(refined);

  return (
    Math.abs(polygonArea(refined)) > 800 &&
    refinedWidth > seedWidth * 0.75 &&
    refinedWidth < seedWidth * 1.28 &&
    refinedHeight > seedHeight * 0.72 &&
    refinedHeight < seedHeight * 1.32 &&
    Math.hypot(seedCenter.x - refinedCenter.x, seedCenter.y - refinedCenter.y) < Math.max(45, seedWidth * 0.18)
  );
}

function refineTape(
  tape: TapeCalibration,
  luma: Uint8ClampedArray,
  width: number,
  height: number,
  scale: number
): TapeCalibration {
  const seed = scaleQuad(tape.quad, scale);
  const search = edgeSearchPx * scale;
  const step = Math.max(1, edgeStepPx * scale);
  const radius = Math.max(2, contrastRadiusPx * scale);
  const top = refineLine(luma, width, height, seed[0], seed[1], search, step, radius);
  const right = refineLine(luma, width, height, seed[1], seed[2], search, step, radius);
  const bottom = refineLine(luma, width, height, seed[3], seed[2], search, step, radius);
  const left = refineLine(luma, width, height, seed[0], seed[3], search, step, radius);
  const points = [
    intersectLines(top.line, left.line),
    intersectLines(top.line, right.line),
    intersectLines(bottom.line, right.line),
    intersectLines(bottom.line, left.line)
  ];

  if (points.some((point) => !point)) {
    return tape;
  }

  const refined = points as Quad;

  if (!isSaneRefinement(seed, refined, width, height)) {
    return tape;
  }

  const confidence = clamp(
    (top.score + right.score + bottom.score + left.score) / 120,
    0.35,
    1.12
  );

  return {
    ...tape,
    quad: unscaleQuad(refined, scale),
    visibleEdgePx: Math.max(3, Math.round(3.25 + confidence * 2)),
    lighting: {
      brightness: clamp(tape.lighting.brightness + deterministicJitter(tape.index + 101, 0.05), 0.82, 1.08),
      contrast: clamp(tape.lighting.contrast + deterministicJitter(tape.index + 109, 0.04), 0.9, 1.14),
      shadow: clamp(tape.lighting.shadow + deterministicJitter(tape.index + 113, 0.035), 0.08, 0.2)
    }
  };
}

export function estimateCalibrationFromPhoto(
  photo: LoadedImage,
  seedCalibration: ProductCalibration = createPrototypeCalibration()
): ProductCalibration {
  const seed = cloneCalibration(seedCalibration);
  const { luma, scale, width, height } = buildLuma(photo);

  return {
    ...seed,
    photo: {
      ...seed.photo,
      width: photo.naturalWidth,
      height: photo.naturalHeight,
      notes:
        "Photo-derived calibration. Each cassette starts from a perspective seed, then its four face edges are refined independently with local edge sampling. Manual corrections are saved as JSON."
    },
    tapes: seed.tapes.map((tape) => refineTape(tape, luma, width, height, scale))
  };
}
