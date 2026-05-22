export type Point = {
  x: number;
  y: number;
};

export type Quad = [Point, Point, Point, Point];

export type CircleMask = {
  id: string;
  kind: "circle";
  x: number;
  y: number;
  r: number;
};

export type RectMask = {
  id: string;
  kind: "rect";
  x: number;
  y: number;
  width: number;
  height: number;
};

export type TapeMask = CircleMask | RectMask;

export type TapeCircleFeature = {
  id: string;
  label: string;
  x: number;
  y: number;
  r: number;
};

export type TapeRaisedSection = {
  enabled: boolean;
  gapMm: number;
  polygon: Quad;
  blackHoles: TapeCircleFeature[];
};

export type TapeFeatureSet = {
  cornerRadius: number;
  transparentHoles: TapeCircleFeature[];
  blackHoles: TapeCircleFeature[];
  raised: TapeRaisedSection;
};

export type TapeCalibration = {
  id: string;
  index: number;
  row: number;
  column: number;
  quad: Quad;
  visibleEdgePx: number;
  maskIds: string[];
  features?: TapeFeatureSet;
  lighting: {
    brightness: number;
    contrast: number;
    shadow: number;
  };
};

export type ProductCalibration = {
  photo: {
    src: string;
    width: number;
    height: number;
    notes: string;
  };
  previewFrame?: {
    x: number;
    y: number;
    width: number;
    height: number;
    rotationDeg: number;
  };
  layout: {
    columns: number;
    rows: number;
  };
  masks: Record<string, TapeMask>;
  tapes: TapeCalibration[];
};

export type ProductionConfig = {
  columns: number;
  rows: number;
  bottomBreakEnabled: boolean;
  breakClearanceMm: number;
  breakHeightMm: number;
  zoom: number;
  panX: number;
  panY: number;
};

export type ArtworkOption = {
  id: string;
  name: string;
  src: string;
  credit: string;
};

export type GangSegment = {
  rowStart: number;
  rowCount: number;
  heightIn: number;
  tier?: {
    label: string;
    maxIn: number;
    cost: number;
  };
};
