import type { GangSegment, ProductionConfig } from "./types";

export const TAPE = {
  widthMm: 100,
  heightMm: 64,
  gapXMm: 3.5,
  gapYMm: 14.5,
  gangSheet: {
    widthIn: 22,
    columns: 5,
    gutterMm: 3.5,
    priceTiers: [
      { label: "6 in", maxIn: 6, cost: 10.99 },
      { label: "1 ft", maxIn: 12, cost: 18.99 },
      { label: "2 ft", maxIn: 24, cost: 29.99 },
      { label: "5 ft", maxIn: 60, cost: 69.99 },
      { label: "10 ft", maxIn: 120, cost: 135.99 }
    ]
  },
  bottomBreak: {
    topInsetMm: 19.5,
    bottomInsetMm: 14,
    heightMm: 15.5,
    clearanceMm: 1.5
  }
};

export const defaultProductionConfig: ProductionConfig = {
  columns: 6,
  rows: 9,
  bottomBreakEnabled: true,
  breakClearanceMm: TAPE.bottomBreak.clearanceMm,
  breakHeightMm: TAPE.bottomBreak.heightMm,
  zoom: 1,
  panX: 0,
  panY: 0
};

export function layoutMm(config: Pick<ProductionConfig, "columns" | "rows">) {
  return {
    width:
      config.columns * TAPE.widthMm + Math.max(0, config.columns - 1) * TAPE.gapXMm,
    height:
      config.rows * TAPE.heightMm + Math.max(0, config.rows - 1) * TAPE.gapYMm
  };
}

export function mmToPx(mm: number, totalMm: number, pixels: number) {
  return (mm / totalMm) * pixels;
}

export function mmToIn(mm: number) {
  return mm / 25.4;
}

export function inToMm(inches: number) {
  return inches * 25.4;
}

export function formatFeetAndInchesRoundedUp(inches: number) {
  const totalInches = Math.ceil(inches);
  const feet = Math.floor(totalInches / 12);
  const remainingInches = totalInches % 12;

  if (remainingInches === 0) {
    return `${feet}'`;
  }

  if (feet === 0) {
    return `${remainingInches}"`;
  }

  return `${feet}' ${remainingInches}"`;
}

export function formatRoundedPdfSize(widthIn: number, heightIn: number) {
  return `${formatFeetAndInchesRoundedUp(widthIn)} by ${formatFeetAndInchesRoundedUp(
    heightIn
  )}`;
}

export function formatCurrency(value: number) {
  return `$${value.toFixed(2)}`;
}

export function clampNumber(value: number, min: number, max: number, fallback: number) {
  if (!Number.isFinite(value)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, value));
}

export function getLayoutRatio(config: ProductionConfig) {
  const layout = layoutMm(config);
  return layout.width / layout.height;
}

export function getOutputSize(
  image: { naturalWidth: number; naturalHeight: number } | null,
  config: ProductionConfig
) {
  if (!image) {
    return { width: 1, height: 1 };
  }

  const ratio = getLayoutRatio(config);
  const imageRatio = image.naturalWidth / image.naturalHeight;

  if (imageRatio > ratio) {
    const height = image.naturalHeight;
    return {
      width: Math.max(1, Math.round(height * ratio)),
      height
    };
  }

  const width = image.naturalWidth;
  return {
    width,
    height: Math.max(1, Math.round(width / ratio))
  };
}

export function getDrawRect(
  image: { naturalWidth: number; naturalHeight: number } | null,
  width: number,
  height: number,
  config: ProductionConfig
) {
  if (!image) {
    return { x: 0, y: 0, width, height };
  }

  const baseScale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
  const scale = baseScale * config.zoom;
  const drawWidth = image.naturalWidth * scale;
  const drawHeight = image.naturalHeight * scale;

  return {
    x: width / 2 - drawWidth / 2 + config.panX * width,
    y: height / 2 - drawHeight / 2 + config.panY * height,
    width: drawWidth,
    height: drawHeight
  };
}

export function getGangSheetLayout(config: ProductionConfig) {
  const totalTapes = config.columns * config.rows;
  const gangColumns = Math.min(TAPE.gangSheet.columns, totalTapes || TAPE.gangSheet.columns);
  const gangRows = Math.max(1, Math.ceil(totalTapes / TAPE.gangSheet.columns));
  const pageWidthMm = inToMm(TAPE.gangSheet.widthIn);
  const packedWidthMm =
    gangColumns * TAPE.widthMm + Math.max(0, gangColumns - 1) * TAPE.gangSheet.gutterMm;
  const packedHeightMm = getGangRowsHeightMm(gangRows);

  return {
    totalTapes,
    gangColumns,
    gangRows,
    pageWidthMm,
    pageHeightMm: packedHeightMm,
    packedWidthMm,
    packedHeightMm,
    leftMarginMm: Math.max(0, (pageWidthMm - packedWidthMm) / 2)
  };
}

export function getGangRowsHeightMm(rowCount: number) {
  if (rowCount <= 0) {
    return 0;
  }

  return rowCount * TAPE.heightMm + Math.max(0, rowCount - 1) * TAPE.gangSheet.gutterMm;
}

export function getPricingTier(heightIn: number) {
  return TAPE.gangSheet.priceTiers.find((tier) => heightIn <= tier.maxIn);
}

export function getOptimizedGangPlan(config: ProductionConfig) {
  const gang = getGangSheetLayout(config);
  const dp: Array<null | {
    cost: number;
    parts: number;
    billedIn: number;
    rowsInPart?: number;
    segments: GangSegment[];
  }> = Array.from({ length: gang.gangRows + 1 }, () => null);

  dp[0] = {
    cost: 0,
    parts: 0,
    billedIn: 0,
    segments: []
  };

  for (let remainingRows = 1; remainingRows <= gang.gangRows; remainingRows += 1) {
    for (
      let rowsInPart = Math.min(remainingRows, gang.gangRows);
      rowsInPart >= 1;
      rowsInPart -= 1
    ) {
      const prior = dp[remainingRows - rowsInPart];
      const heightIn = mmToIn(getGangRowsHeightMm(rowsInPart));
      const tier = getPricingTier(heightIn);

      if (!prior || !tier) {
        continue;
      }

      const candidate = {
        cost: prior.cost + tier.cost,
        parts: prior.parts + 1,
        billedIn: prior.billedIn + tier.maxIn,
        rowsInPart,
        segments: [
          {
            rowStart: 0,
            rowCount: rowsInPart,
            heightIn,
            tier
          },
          ...prior.segments.map((segment) => ({
            ...segment,
            rowStart: segment.rowStart + rowsInPart
          }))
        ]
      };

      const current = dp[remainingRows];
      const isBetter =
        !current ||
        candidate.cost < current.cost ||
        (candidate.cost === current.cost && candidate.parts < current.parts) ||
        (candidate.cost === current.cost &&
          candidate.parts === current.parts &&
          rowsInPart > (current.rowsInPart ?? 0));

      if (isBetter) {
        dp[remainingRows] = candidate;
      }
    }
  }

  const fullHeightIn = mmToIn(gang.pageHeightMm);
  const fullTier = getPricingTier(fullHeightIn);
  const fullCost = fullTier ? fullTier.cost : Infinity;
  const optimized = dp[gang.gangRows];
  const savesMoney = Boolean(optimized && optimized.cost < fullCost);

  return {
    ...gang,
    fullHeightIn,
    fullTier,
    fullCost,
    optimizedCost: optimized ? optimized.cost : fullCost,
    optimizedParts: optimized ? optimized.parts : 1,
    segments: savesMoney
      ? optimized!.segments
      : [
          {
            rowStart: 0,
            rowCount: gang.gangRows,
            heightIn: fullHeightIn,
            tier: fullTier
          }
        ],
    savesMoney
  };
}
