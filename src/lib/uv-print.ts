import JSZip from "jszip";
import sharp from "sharp";
import type { CmsProductVariant } from "./cms";

export const uvCassetteGeometry = {
  tapeWidthMm: 100,
  tapeHeightMm: 63.311,
  gapMm: 8,
  pitchXMm: 108,
  pitchYMm: 71.311,
  panelTapeColumns: 2,
  panelTapeRows: 3
} as const;

export type UvPrintOptions = {
  sourceBuffer: Buffer;
  sourceLabel: string;
  variant: Pick<CmsProductVariant, "id" | "label" | "panelColumns" | "panelRows">;
  dpi?: number;
  bleedMm?: number;
  mirror?: boolean;
  includeIndividualCassettes?: boolean;
};

type ManifestFile = {
  file: string;
  kind: "two_panel_sheet" | "one_panel_sheet" | "cassette";
  physicalWidthMm: number;
  physicalHeightMm: number;
  pixelWidth: number;
  pixelHeight: number;
  panels?: number[];
  globalTapeRow?: number;
  globalTapeColumn?: number;
};

function clampInteger(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function mmToPx(mm: number, dpi: number) {
  return Math.max(1, Math.round((mm / 25.4) * dpi));
}

function safeSlug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80) || "uv-print";
}

function panelNumber(panelRowTop: number, panelColumn: number, panelColumns: number) {
  return panelRowTop * panelColumns + panelColumn + 1;
}

function getLayout(variant: UvPrintOptions["variant"]) {
  const panelColumns = Math.max(1, Math.round(variant.panelColumns || 3));
  const panelRows = Math.max(1, Math.round(variant.panelRows || 3));
  const tapeColumns = panelColumns * uvCassetteGeometry.panelTapeColumns;
  const tapeRows = panelRows * uvCassetteGeometry.panelTapeRows;

  return {
    panelColumns,
    panelRows,
    panelCount: panelColumns * panelRows,
    tapeColumns,
    tapeRows,
    fullWidthMm: tapeColumns * uvCassetteGeometry.pitchXMm,
    fullHeightMm: tapeRows * uvCassetteGeometry.pitchYMm,
    panelWidthMm: uvCassetteGeometry.panelTapeColumns * uvCassetteGeometry.pitchXMm,
    panelHeightMm: uvCassetteGeometry.panelTapeRows * uvCassetteGeometry.pitchYMm
  };
}

async function createFullArtworkCanvas(sourceBuffer: Buffer, widthPx: number, heightPx: number) {
  return sharp(sourceBuffer, { failOn: "none" })
    .rotate()
    .resize({ width: widthPx, height: heightPx, fit: "cover", position: "centre" })
    .ensureAlpha()
    .png()
    .toBuffer();
}

async function cropCassette({
  fullCanvas,
  fullWidthPx,
  fullHeightPx,
  fullWidthMm,
  fullHeightMm,
  tapeColumn,
  tapeRowTop,
  tapeRows,
  dpi,
  bleedMm,
  mirror
}: {
  fullCanvas: Buffer;
  fullWidthPx: number;
  fullHeightPx: number;
  fullWidthMm: number;
  fullHeightMm: number;
  tapeColumn: number;
  tapeRowTop: number;
  tapeRows: number;
  dpi: number;
  bleedMm: number;
  mirror: boolean;
}) {
  const rowFromBottom = tapeRows - tapeRowTop - 1;
  const sourceLeftMm = tapeColumn * uvCassetteGeometry.pitchXMm + 4 - bleedMm;
  const sourceBottomMm = rowFromBottom * uvCassetteGeometry.pitchYMm + 4 - bleedMm;
  const cropWidthMm = uvCassetteGeometry.tapeWidthMm + bleedMm * 2;
  const cropHeightMm = uvCassetteGeometry.tapeHeightMm + bleedMm * 2;
  const outputWidthPx = mmToPx(cropWidthMm, dpi);
  const outputHeightPx = mmToPx(cropHeightMm, dpi);
  const sourceTopMm = fullHeightMm - sourceBottomMm - cropHeightMm;

  const left = clampInteger((sourceLeftMm / fullWidthMm) * fullWidthPx, 0, fullWidthPx - 1);
  const top = clampInteger((sourceTopMm / fullHeightMm) * fullHeightPx, 0, fullHeightPx - 1);
  const width = clampInteger((cropWidthMm / fullWidthMm) * fullWidthPx, 1, fullWidthPx - left);
  const height = clampInteger((cropHeightMm / fullHeightMm) * fullHeightPx, 1, fullHeightPx - top);

  let image = sharp(fullCanvas, { failOn: "none" })
    .extract({ left, top, width, height })
    .resize({ width: outputWidthPx, height: outputHeightPx, fit: "fill" });
  if (mirror) {
    image = image.flop();
  }

  return image.png().toBuffer();
}

async function renderSheet({
  fullCanvas,
  layout,
  panelPositions,
  dpi,
  bleedMm,
  mirror
}: {
  fullCanvas: Buffer;
  layout: ReturnType<typeof getLayout> & { fullWidthPx: number; fullHeightPx: number };
  panelPositions: Array<{ panelRowTop: number; panelColumn: number }>;
  dpi: number;
  bleedMm: number;
  mirror: boolean;
}) {
  const columns = Math.max(...panelPositions.map((panel) => panel.panelColumn)) - Math.min(...panelPositions.map((panel) => panel.panelColumn)) + 1;
  const rows = Math.max(...panelPositions.map((panel) => panel.panelRowTop)) - Math.min(...panelPositions.map((panel) => panel.panelRowTop)) + 1;
  const minPanelColumn = Math.min(...panelPositions.map((panel) => panel.panelColumn));
  const minPanelRow = Math.min(...panelPositions.map((panel) => panel.panelRowTop));
  const sheetWidthMm = columns * layout.panelWidthMm;
  const sheetHeightMm = rows * layout.panelHeightMm;
  const sheetWidthPx = mmToPx(sheetWidthMm, dpi);
  const sheetHeightPx = mmToPx(sheetHeightMm, dpi);
  const sourceLeftMm = minPanelColumn * layout.panelWidthMm;
  const sourceTopMm = minPanelRow * layout.panelHeightMm;
  const left = clampInteger((sourceLeftMm / layout.fullWidthMm) * layout.fullWidthPx, 0, layout.fullWidthPx - 1);
  const top = clampInteger((sourceTopMm / layout.fullHeightMm) * layout.fullHeightPx, 0, layout.fullHeightPx - 1);
  const width = clampInteger((sheetWidthMm / layout.fullWidthMm) * layout.fullWidthPx, 1, layout.fullWidthPx - left);
  const height = clampInteger((sheetHeightMm / layout.fullHeightMm) * layout.fullHeightPx, 1, layout.fullHeightPx - top);
  const maskRects: string[] = [];

  for (const panel of panelPositions) {
    const panelOffsetX = panel.panelColumn - minPanelColumn;
    const panelOffsetY = panel.panelRowTop - minPanelRow;
    for (let localRow = 0; localRow < uvCassetteGeometry.panelTapeRows; localRow += 1) {
      for (let localColumn = 0; localColumn < uvCassetteGeometry.panelTapeColumns; localColumn += 1) {
        const rectX = mmToPx(panelOffsetX * layout.panelWidthMm + localColumn * uvCassetteGeometry.pitchXMm + 4 - bleedMm, dpi);
        const rectY = mmToPx(panelOffsetY * layout.panelHeightMm + localRow * uvCassetteGeometry.pitchYMm + 4 - bleedMm, dpi);
        const rectWidth = mmToPx(uvCassetteGeometry.tapeWidthMm + bleedMm * 2, dpi);
        const rectHeight = mmToPx(uvCassetteGeometry.tapeHeightMm + bleedMm * 2, dpi);
        maskRects.push(`<rect x="${rectX}" y="${rectY}" width="${rectWidth}" height="${rectHeight}" fill="white"/>`);
      }
    }
  }

  const mask = Buffer.from(
    `<svg width="${sheetWidthPx}" height="${sheetHeightPx}" viewBox="0 0 ${sheetWidthPx} ${sheetHeightPx}" xmlns="http://www.w3.org/2000/svg">${maskRects.join("")}</svg>`
  );

  let sheet = sharp(fullCanvas, { failOn: "none" })
    .extract({ left, top, width, height })
    .resize({ width: sheetWidthPx, height: sheetHeightPx, fit: "fill" })
    .ensureAlpha()
    .composite([{ input: mask, blend: "dest-in" }]);

  if (mirror) {
    sheet = sheet.flop();
  }

  return {
    buffer: await sheet.png({ compressionLevel: 6 }).withMetadata({ density: dpi }).toBuffer(),
    physicalWidthMm: sheetWidthMm,
    physicalHeightMm: sheetHeightMm,
    pixelWidth: sheetWidthPx,
    pixelHeight: sheetHeightPx
  };
}

async function renderIndividualCassette({
  fullCanvas,
  layout,
  tapeColumn,
  tapeRowTop,
  dpi,
  bleedMm,
  mirror
}: {
  fullCanvas: Buffer;
  layout: ReturnType<typeof getLayout> & { fullWidthPx: number; fullHeightPx: number };
  tapeColumn: number;
  tapeRowTop: number;
  dpi: number;
  bleedMm: number;
  mirror: boolean;
}) {
  const buffer = await cropCassette({
    fullCanvas,
    fullWidthPx: layout.fullWidthPx,
    fullHeightPx: layout.fullHeightPx,
    fullWidthMm: layout.fullWidthMm,
    fullHeightMm: layout.fullHeightMm,
    tapeColumn,
    tapeRowTop,
    tapeRows: layout.tapeRows,
    dpi,
    bleedMm,
    mirror
  });

  const physicalWidthMm = uvCassetteGeometry.tapeWidthMm + bleedMm * 2;
  const physicalHeightMm = uvCassetteGeometry.tapeHeightMm + bleedMm * 2;
  return {
    buffer: await sharp(buffer).png({ compressionLevel: 6 }).withMetadata({ density: dpi }).toBuffer(),
    physicalWidthMm,
    physicalHeightMm,
    pixelWidth: mmToPx(physicalWidthMm, dpi),
    pixelHeight: mmToPx(physicalHeightMm, dpi)
  };
}

export async function generateUvPrintZip(options: UvPrintOptions) {
  const dpi = Math.max(72, Math.min(720, Math.round(options.dpi || 300)));
  const bleedMm = Math.max(0, Math.min(5, Number.isFinite(options.bleedMm) ? options.bleedMm! : 1));
  const mirror = Boolean(options.mirror);
  const includeIndividualCassettes = Boolean(options.includeIndividualCassettes);
  const baseLayout = getLayout(options.variant);
  const layout = {
    ...baseLayout,
    fullWidthPx: mmToPx(baseLayout.fullWidthMm, dpi),
    fullHeightPx: mmToPx(baseLayout.fullHeightMm, dpi)
  };
  const sourceSlug = safeSlug(options.sourceLabel);
  const variantSlug = safeSlug(options.variant.label || options.variant.id);
  const zip = new JSZip();
  const manifestFiles: ManifestFile[] = [];
  const fullCanvas = await createFullArtworkCanvas(options.sourceBuffer, layout.fullWidthPx, layout.fullHeightPx);

  for (let panelRowTop = 0; panelRowTop < layout.panelRows; panelRowTop += 1) {
    for (let panelColumn = 0; panelColumn < layout.panelColumns; panelColumn += 1) {
      const panelNo = panelNumber(panelRowTop, panelColumn, layout.panelColumns);
      const rendered = await renderSheet({
        fullCanvas,
        layout,
        panelPositions: [{ panelRowTop, panelColumn }],
        dpi,
        bleedMm,
        mirror
      });
      const file = `one-panel/${sourceSlug}_${variantSlug}_panel-${String(panelNo).padStart(2, "0")}_${dpi}dpi.png`;
      zip.file(file, rendered.buffer);
      manifestFiles.push({
        file,
        kind: "one_panel_sheet",
        physicalWidthMm: rendered.physicalWidthMm,
        physicalHeightMm: rendered.physicalHeightMm,
        pixelWidth: rendered.pixelWidth,
        pixelHeight: rendered.pixelHeight,
        panels: [panelNo]
      });
    }
  }

  for (let panelRowTop = 0; panelRowTop < layout.panelRows; panelRowTop += 1) {
    for (let panelColumn = 0; panelColumn < layout.panelColumns; panelColumn += 2) {
      const panelPositions = [
        { panelRowTop, panelColumn },
        panelColumn + 1 < layout.panelColumns ? { panelRowTop, panelColumn: panelColumn + 1 } : null
      ].filter((panel): panel is { panelRowTop: number; panelColumn: number } => Boolean(panel));
      const panels = panelPositions.map((panel) => panelNumber(panel.panelRowTop, panel.panelColumn, layout.panelColumns));
      const rendered = await renderSheet({
        fullCanvas,
        layout,
        panelPositions,
        dpi,
        bleedMm,
        mirror
      });
      const file = `two-panel/${sourceSlug}_${variantSlug}_panels-${panels.map((panel) => String(panel).padStart(2, "0")).join("-")}_${dpi}dpi.png`;
      zip.file(file, rendered.buffer);
      manifestFiles.push({
        file,
        kind: "two_panel_sheet",
        physicalWidthMm: rendered.physicalWidthMm,
        physicalHeightMm: rendered.physicalHeightMm,
        pixelWidth: rendered.pixelWidth,
        pixelHeight: rendered.pixelHeight,
        panels
      });
    }
  }

  if (includeIndividualCassettes) {
    for (let tapeRowTop = 0; tapeRowTop < layout.tapeRows; tapeRowTop += 1) {
      for (let tapeColumn = 0; tapeColumn < layout.tapeColumns; tapeColumn += 1) {
        const globalRowFromBottom = layout.tapeRows - tapeRowTop - 1;
        const rendered = await renderIndividualCassette({
          fullCanvas,
          layout,
          tapeColumn,
          tapeRowTop,
          dpi,
          bleedMm,
          mirror
        });
        const file = `individual-cassettes/${sourceSlug}_${variantSlug}_R${String(globalRowFromBottom).padStart(2, "0")}_C${String(tapeColumn).padStart(2, "0")}_${dpi}dpi.png`;
        zip.file(file, rendered.buffer);
        manifestFiles.push({
          file,
          kind: "cassette",
          physicalWidthMm: rendered.physicalWidthMm,
          physicalHeightMm: rendered.physicalHeightMm,
          pixelWidth: rendered.pixelWidth,
          pixelHeight: rendered.pixelHeight,
          globalTapeRow: globalRowFromBottom,
          globalTapeColumn: tapeColumn
        });
      }
    }
  }

  zip.file(
    "manifest.json",
    JSON.stringify(
      {
        sourceLabel: options.sourceLabel,
        variant: options.variant,
        dpi,
        bleedMm,
        mirror,
        includeIndividualCassettes,
        geometry: uvCassetteGeometry,
        layout: {
          panelColumns: layout.panelColumns,
          panelRows: layout.panelRows,
          panelCount: layout.panelCount,
          tapeColumns: layout.tapeColumns,
          tapeRows: layout.tapeRows,
          fullWidthMm: layout.fullWidthMm,
          fullHeightMm: layout.fullHeightMm,
          fullPixelWidth: layout.fullWidthPx,
          fullPixelHeight: layout.fullHeightPx
        },
        files: manifestFiles
      },
      null,
      2
    )
  );

  const zipBuffer = await zip.generateAsync({ type: "nodebuffer", compression: "STORE" });
  return {
    buffer: zipBuffer,
    filename: `${sourceSlug}_${variantSlug}_uv-print_${dpi}dpi.zip`
  };
}
