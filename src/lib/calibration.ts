import { getProductPhoto, type ProductLayoutKey } from "./assets";
import type {
  Point,
  ProductCalibration,
  Quad,
  TapeCalibration,
  TapeCircleFeature,
  TapeFeatureSet,
  TapeMask
} from "./types";

const defaultMaskIds = ["roller-left", "roller-right"];

const layoutSeeds: Record<ProductLayoutKey, {
  bounds: { x: number; y: number; width: number; height: number };
  tapeGapX: number;
  tapeGapY: number;
}> = {
  square: {
    bounds: { x: 69, y: 62, width: 1120, height: 1133 },
    tapeGapX: 5,
    tapeGapY: 8
  },
  landscape: {
    bounds: { x: 69, y: 54, width: 1494, height: 1142 },
    tapeGapX: 5,
    tapeGapY: 8
  }
};

export type CalibrationProductSource = {
  layout: ProductLayoutKey;
  src: string;
  width: number;
  height: number;
  columns: number;
  rows: number;
  label?: string;
};

const defaultRenderSettings = {
  artworkOpacity: 0.975,
  raisedEdgeArtworkOpacity: 0.9,
  artworkGapXMm: 0,
  artworkGapYMm: 0,
  backgroundFill: "#f0f0f0"
};

export const defaultMasks: Record<string, TapeMask> = {
  "roller-left": { id: "roller-left", kind: "circle", x: 0.28, y: 0.42, r: 0.058 },
  "roller-right": { id: "roller-right", kind: "circle", x: 0.72, y: 0.42, r: 0.058 }
};

export const defaultMaskIdList = defaultMaskIds;
export const defaultProductRenderSettings = defaultRenderSettings;

function rotatePoint(point: Point, center: Point, radians: number): Point {
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const dx = point.x - center.x;
  const dy = point.y - center.y;

  return {
    x: center.x + dx * cos - dy * sin,
    y: center.y + dx * sin + dy * cos
  };
}

export function deterministicJitter(index: number, amplitude: number) {
  const seed = Math.sin(index * 12.9898) * 43758.5453;
  return (seed - Math.floor(seed) - 0.5) * amplitude;
}

export function makeQuad(x: number, y: number, width: number, height: number, angle: number): Quad {
  const center = { x: x + width / 2, y: y + height / 2 };
  return [
    rotatePoint({ x, y }, center, angle),
    rotatePoint({ x: x + width, y }, center, angle),
    rotatePoint({ x: x + width, y: y + height }, center, angle),
    rotatePoint({ x, y: y + height }, center, angle)
  ];
}

function circle(id: string, label: string, x: number, y: number, r: number): TapeCircleFeature {
  return { id, label, x, y, r };
}

export function createDefaultTapeFeatures(): TapeFeatureSet {
  return {
    cornerRadius: 0.035,
    transparentHoles: [
      circle("roller-left", "Left drive hole", 0.28, 0.42, 0.058),
      circle("roller-right", "Right drive hole", 0.72, 0.42, 0.058)
    ],
    blackHoles: [],
    raised: {
      enabled: true,
      gapMm: 0.5,
      polygon: [
        { x: 0.18, y: 0.745 },
        { x: 0.82, y: 0.745 },
        { x: 0.87, y: 0.98 },
        { x: 0.13, y: 0.98 }
      ],
      blackHoles: [
        circle("raised-hole-left", "Raised left alignment", 0.25, 0.88, 0.019),
        circle("raised-hole-mid-left", "Raised mid-left alignment", 0.42, 0.88, 0.017),
        circle("raised-hole-mid-right", "Raised mid-right alignment", 0.58, 0.88, 0.017),
        circle("raised-hole-right", "Raised right alignment", 0.75, 0.88, 0.019)
      ]
    }
  };
}

export function getTapeFeatures(tape: TapeCalibration): TapeFeatureSet {
  if (!tape.features) {
    return createDefaultTapeFeatures();
  }

  const defaults = createDefaultTapeFeatures();

  return {
    cornerRadius: tape.features.cornerRadius ?? defaults.cornerRadius,
    transparentHoles: tape.features.transparentHoles ?? defaults.transparentHoles,
    blackHoles: tape.features.blackHoles ?? defaults.blackHoles,
    raised: {
      enabled: tape.features.raised?.enabled ?? defaults.raised.enabled,
      gapMm: tape.features.raised?.gapMm ?? defaults.raised.gapMm,
      polygon: tape.features.raised?.polygon ?? defaults.raised.polygon,
      blackHoles: tape.features.raised?.blackHoles ?? defaults.raised.blackHoles
    }
  };
}

function defaultSeedForProduct(product: CalibrationProductSource) {
  return {
    bounds: {
      x: product.width * 0.055,
      y: product.height * 0.05,
      width: product.width * 0.89,
      height: product.height * 0.9
    },
    tapeGapX: Math.max(2, product.width * 0.004),
    tapeGapY: Math.max(2, product.height * 0.006)
  };
}

function getDefaultPreviewFrameForProduct(product: CalibrationProductSource) {
  return {
    x: 0,
    y: 0,
    width: product.width,
    height: product.height,
    rotationDeg: 0
  };
}

function makeTape(product: CalibrationProductSource, row: number, column: number): TapeCalibration {
  const seed = layoutSeeds[product.layout] ?? defaultSeedForProduct(product);
  const index = row * product.columns + column;
  const tapeWidth = (seed.bounds.width - seed.tapeGapX * Math.max(0, product.columns - 1)) / product.columns;
  const tapeHeight = (seed.bounds.height - seed.tapeGapY * Math.max(0, product.rows - 1)) / product.rows;
  const x = seed.bounds.x + column * (tapeWidth + seed.tapeGapX);
  const y = seed.bounds.y + row * (tapeHeight + seed.tapeGapY);

  return {
    id: `tape-${index + 1}`,
    index,
    row,
    column,
    quad: makeQuad(x, y, tapeWidth, tapeHeight, 0),
    visibleEdgePx: 2,
    maskIds: defaultMaskIds,
    features: createDefaultTapeFeatures(),
    lighting: {
      brightness: 1,
      contrast: 1,
      shadow: 0.05
    }
  };
}

export function createProductCalibrationSeed(product: CalibrationProductSource): ProductCalibration {
  const label = product.label || product.layout;

  return {
    photo: {
      src: product.src,
      width: product.width,
      height: product.height,
      notes:
        `${label} cassette grid base. Default tape quads are reset to the clean ${product.columns} x ${product.rows} grid in this exported product image.`
    },
    renderSettings: defaultRenderSettings,
    previewFrame: getDefaultPreviewFrameForProduct(product),
    layout: {
      columns: product.columns,
      rows: product.rows
    },
    masks: defaultMasks,
    tapes: Array.from({ length: product.columns * product.rows }, (_, index) =>
      makeTape(product, Math.floor(index / product.columns), index % product.columns)
    )
  };
}

export function createPrototypeCalibration(layout: ProductLayoutKey = "square"): ProductCalibration {
  const photo = getProductPhoto(layout);
  return createProductCalibrationSeed({
    layout,
    src: photo.src,
    width: photo.width,
    height: photo.height,
    columns: photo.columns,
    rows: photo.rows,
    label: layout === "landscape" ? "Landscape" : "Square"
  });
}

export function cloneCalibration(calibration: ProductCalibration): ProductCalibration {
  return JSON.parse(JSON.stringify(calibration)) as ProductCalibration;
}

export function normalizeCalibration(calibration: ProductCalibration): ProductCalibration {
  const next = cloneCalibration(calibration);
  next.renderSettings = {
    ...defaultRenderSettings,
    ...next.renderSettings
  };
  next.previewFrame = next.previewFrame ?? {
    x: 0,
    y: 0,
    width: next.photo.width,
    height: next.photo.height,
    rotationDeg: 0
  };
  next.masks = {
    ...defaultMasks,
    ...next.masks
  };
  next.tapes = next.tapes.map((tape) => ({
    ...tape,
    maskIds:
      tape.maskIds?.filter((id) => !id.startsWith("screw-") && id !== "window" && id !== "lower-cutout") ??
      defaultMaskIds,
    features: {
      ...getTapeFeatures(tape),
      transparentHoles: getTapeFeatures(tape).transparentHoles.filter((hole) => !hole.id.startsWith("screw-"))
    }
  }));
  return next;
}

function scalePoint(point: Point, scaleX: number, scaleY: number): Point {
  return {
    x: point.x * scaleX,
    y: point.y * scaleY
  };
}

export function adaptCalibrationToProduct(
  calibration: ProductCalibration,
  product: CalibrationProductSource
): { calibration: ProductCalibration; scaled: boolean; tapeCountMismatch: boolean } {
  const normalized = normalizeCalibration(calibration);
  const sourceWidth = normalized.photo.width || product.width;
  const sourceHeight = normalized.photo.height || product.height;
  const scaleX = product.width / sourceWidth;
  const scaleY = product.height / sourceHeight;
  const scaled = Math.abs(scaleX - 1) > 0.0001 || Math.abs(scaleY - 1) > 0.0001;
  const tapeCountMismatch = normalized.tapes.length !== product.columns * product.rows;
  const next: ProductCalibration = {
    ...normalized,
    photo: {
      src: product.src,
      width: product.width,
      height: product.height,
      notes: product.label
        ? `${product.label} mockup image from product variant.`
        : normalized.photo.notes
    },
    layout: {
      columns: product.columns,
      rows: product.rows
    }
  };

  if (scaled) {
    next.previewFrame = normalized.previewFrame
      ? {
          x: normalized.previewFrame.x * scaleX,
          y: normalized.previewFrame.y * scaleY,
          width: normalized.previewFrame.width * scaleX,
          height: normalized.previewFrame.height * scaleY,
          rotationDeg: normalized.previewFrame.rotationDeg
        }
      : getDefaultPreviewFrameForProduct(product);
    next.tapes = normalized.tapes.map((tape) => ({
      ...tape,
      quad: tape.quad.map((point) => scalePoint(point, scaleX, scaleY)) as Quad
    }));
  }

  return {
    calibration: next,
    scaled,
    tapeCountMismatch
  };
}

export function updateTapePoint(
  calibration: ProductCalibration,
  tapeIndex: number,
  pointIndex: number,
  point: Point
): ProductCalibration {
  const next = cloneCalibration(calibration);
  next.tapes[tapeIndex].quad[pointIndex] = point;
  return next;
}

export function updateTapeFeatures(
  calibration: ProductCalibration,
  tapeIndex: number,
  updater: (features: TapeFeatureSet) => TapeFeatureSet
): ProductCalibration {
  const next = normalizeCalibration(calibration);
  next.tapes[tapeIndex].features = updater(getTapeFeatures(next.tapes[tapeIndex]));
  return next;
}

export function updateTapeCircleFeature(
  calibration: ProductCalibration,
  tapeIndex: number,
  group: "transparentHoles" | "blackHoles" | "raisedBlackHoles",
  circleId: string,
  values: Partial<TapeCircleFeature>
): ProductCalibration {
  return updateTapeFeatures(calibration, tapeIndex, (features) => {
    if (group === "raisedBlackHoles") {
      return {
        ...features,
        raised: {
          ...features.raised,
          blackHoles: features.raised.blackHoles.map((hole) =>
            hole.id === circleId ? { ...hole, ...values } : hole
          )
        }
      };
    }

    return {
      ...features,
      [group]: features[group].map((hole) =>
        hole.id === circleId ? { ...hole, ...values } : hole
      )
    };
  });
}

export function updateRaisedPoint(
  calibration: ProductCalibration,
  tapeIndex: number,
  pointIndex: number,
  point: Point
): ProductCalibration {
  return updateTapeFeatures(calibration, tapeIndex, (features) => ({
    ...features,
    raised: {
      ...features.raised,
      polygon: features.raised.polygon.map((candidate, index) =>
        index === pointIndex ? point : candidate
      ) as Quad
    }
  }));
}

export function bilinearPoint(quad: Quad, u: number, v: number): Point {
  const top = {
    x: quad[0].x + (quad[1].x - quad[0].x) * u,
    y: quad[0].y + (quad[1].y - quad[0].y) * u
  };
  const bottom = {
    x: quad[3].x + (quad[2].x - quad[3].x) * u,
    y: quad[3].y + (quad[2].y - quad[3].y) * u
  };

  return {
    x: top.x + (bottom.x - top.x) * v,
    y: top.y + (bottom.y - top.y) * v
  };
}

export function localPointFromQuad(quad: Quad, point: Point): Point {
  let u = 0.5;
  let v = 0.5;

  for (let iteration = 0; iteration < 8; iteration += 1) {
    const current = bilinearPoint(quad, u, v);
    const du = {
      x: (1 - v) * (quad[1].x - quad[0].x) + v * (quad[2].x - quad[3].x),
      y: (1 - v) * (quad[1].y - quad[0].y) + v * (quad[2].y - quad[3].y)
    };
    const dv = {
      x: (1 - u) * (quad[3].x - quad[0].x) + u * (quad[2].x - quad[1].x),
      y: (1 - u) * (quad[3].y - quad[0].y) + u * (quad[2].y - quad[1].y)
    };
    const error = {
      x: current.x - point.x,
      y: current.y - point.y
    };
    const determinant = du.x * dv.y - du.y * dv.x;

    if (Math.abs(determinant) < 0.00001) {
      break;
    }

    u -= (error.x * dv.y - error.y * dv.x) / determinant;
    v -= (du.x * error.y - du.y * error.x) / determinant;
    u = Math.min(1, Math.max(0, u));
    v = Math.min(1, Math.max(0, v));
  }

  return { x: u, y: v };
}
