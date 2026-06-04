import { productPhoto } from "./assets";
import type {
  Point,
  ProductCalibration,
  Quad,
  TapeCalibration,
  TapeCircleFeature,
  TapeFeatureSet,
  TapeMask
} from "./types";

const defaultMaskIds = [
  "roller-left",
  "roller-right",
  "screw-top-left",
  "screw-top-right",
  "screw-bottom-right",
  "screw-bottom-left"
];

const defaultPreviewFrame = {
  x: 0,
  y: 0,
  width: productPhoto.width,
  height: productPhoto.height,
  rotationDeg: 0
};

const defaultGridBounds = {
  x: 68,
  y: 62,
  width: 1116,
  height: 1134
};

const defaultTapeGapX = 5;
const defaultTapeGapY = 8;
const defaultTapeWidth = (defaultGridBounds.width - defaultTapeGapX * 5) / 6;
const defaultTapeHeight = (defaultGridBounds.height - defaultTapeGapY * 8) / 9;

export const defaultMasks: Record<string, TapeMask> = {
  "roller-left": { id: "roller-left", kind: "circle", x: 0.28, y: 0.42, r: 0.058 },
  "roller-right": { id: "roller-right", kind: "circle", x: 0.72, y: 0.42, r: 0.058 },
  "screw-top-left": { id: "screw-top-left", kind: "circle", x: 0.035, y: 0.055, r: 0.018 },
  "screw-top-right": { id: "screw-top-right", kind: "circle", x: 0.965, y: 0.055, r: 0.018 },
  "screw-bottom-right": { id: "screw-bottom-right", kind: "circle", x: 0.965, y: 0.948, r: 0.018 },
  "screw-bottom-left": { id: "screw-bottom-left", kind: "circle", x: 0.035, y: 0.948, r: 0.018 }
};

export const defaultMaskIdList = defaultMaskIds;

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
      circle("roller-right", "Right drive hole", 0.72, 0.42, 0.058),
      circle("screw-top-left", "Top left screw", 0.035, 0.055, 0.018),
      circle("screw-top-right", "Top right screw", 0.965, 0.055, 0.018),
      circle("screw-bottom-right", "Bottom right screw", 0.965, 0.948, 0.018),
      circle("screw-bottom-left", "Bottom left screw", 0.035, 0.948, 0.018)
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

function makeTape(row: number, column: number): TapeCalibration {
  const index = row * 6 + column;
  const x = defaultGridBounds.x + column * (defaultTapeWidth + defaultTapeGapX);
  const y = defaultGridBounds.y + row * (defaultTapeHeight + defaultTapeGapY);

  return {
    id: `tape-${index + 1}`,
    index,
    row,
    column,
    quad: makeQuad(x, y, defaultTapeWidth, defaultTapeHeight, 0),
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

export function createPrototypeCalibration(): ProductCalibration {
  return {
    photo: {
      src: productPhoto.src,
      width: productPhoto.width,
      height: productPhoto.height,
      notes:
        "Square artwork wall base. Default tape quads are reset to the clean 6 x 9 grid in this exported product image."
    },
    previewFrame: defaultPreviewFrame,
    layout: {
      columns: 6,
      rows: 9
    },
    masks: defaultMasks,
    tapes: Array.from({ length: 54 }, (_, index) => makeTape(Math.floor(index / 6), index % 6))
  };
}

export function cloneCalibration(calibration: ProductCalibration): ProductCalibration {
  return JSON.parse(JSON.stringify(calibration)) as ProductCalibration;
}

export function normalizeCalibration(calibration: ProductCalibration): ProductCalibration {
  const next = cloneCalibration(calibration);
  next.previewFrame = next.previewFrame ?? defaultPreviewFrame;
  next.masks = {
    ...defaultMasks,
    ...next.masks
  };
  next.tapes = next.tapes.map((tape) => ({
    ...tape,
    maskIds: tape.maskIds?.filter((id) => id !== "window" && id !== "lower-cutout") ?? defaultMaskIds,
    features: getTapeFeatures(tape)
  }));
  return next;
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
