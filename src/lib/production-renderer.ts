import type { GangSegment, ProductionConfig } from "./types";
import {
  TAPE,
  formatRoundedPdfSize,
  getDrawRect,
  getGangRowsHeightMm,
  getGangSheetLayout,
  getOutputSize,
  layoutMm,
  mmToIn,
  mmToPx
} from "./geometry";
import type { LoadedImage } from "./image";

type DrawOptions = {
  checker?: boolean;
  showOverlay?: boolean;
};

function tapeBreakPoints(
  tapeX: number,
  tapeY: number,
  tapeWidth: number,
  tapeHeight: number,
  config: ProductionConfig
) {
  const xScale = tapeWidth / TAPE.widthMm;
  const yScale = tapeHeight / TAPE.heightMm;
  const breakHeight = Math.min(config.breakHeightMm, TAPE.heightMm - 1);
  const topY = tapeY + (TAPE.heightMm - breakHeight) * yScale;
  const bottomY = tapeY + tapeHeight;

  return {
    xScale,
    yScale,
    points: [
      { x: tapeX + TAPE.bottomBreak.topInsetMm * xScale, y: topY },
      { x: tapeX + (TAPE.widthMm - TAPE.bottomBreak.topInsetMm) * xScale, y: topY },
      { x: tapeX + (TAPE.widthMm - TAPE.bottomBreak.bottomInsetMm) * xScale, y: bottomY },
      { x: tapeX + TAPE.bottomBreak.bottomInsetMm * xScale, y: bottomY }
    ]
  };
}

function traceBottomBreak(
  context: CanvasRenderingContext2D,
  tapeX: number,
  tapeY: number,
  tapeWidth: number,
  tapeHeight: number,
  config: ProductionConfig
) {
  const { points } = tapeBreakPoints(tapeX, tapeY, tapeWidth, tapeHeight, config);

  context.beginPath();
  context.moveTo(points[3].x, points[3].y);
  context.lineTo(points[0].x, points[0].y);
  context.lineTo(points[1].x, points[1].y);
  context.lineTo(points[2].x, points[2].y);
}

export function clearBottomBreak(
  context: CanvasRenderingContext2D,
  tapeX: number,
  tapeY: number,
  tapeWidth: number,
  tapeHeight: number,
  config: ProductionConfig
) {
  if (!config.bottomBreakEnabled || config.breakClearanceMm <= 0) {
    return;
  }

  const { xScale, yScale } = tapeBreakPoints(tapeX, tapeY, tapeWidth, tapeHeight, config);
  const clearancePx = config.breakClearanceMm * ((xScale + yScale) / 2);

  context.save();
  traceBottomBreak(context, tapeX, tapeY, tapeWidth, tapeHeight, config);
  context.globalCompositeOperation = "destination-out";
  context.strokeStyle = "rgba(0, 0, 0, 1)";
  context.lineWidth = Math.max(1, clearancePx);
  context.lineCap = "round";
  context.lineJoin = "round";
  context.stroke();
  context.restore();
}

function strokeBottomBreakOverlay(
  context: CanvasRenderingContext2D,
  tapeX: number,
  tapeY: number,
  tapeWidth: number,
  tapeHeight: number,
  canvasWidth: number,
  config: ProductionConfig
) {
  if (!config.bottomBreakEnabled) {
    return;
  }

  context.save();
  traceBottomBreak(context, tapeX, tapeY, tapeWidth, tapeHeight, config);
  context.strokeStyle = "rgba(222, 107, 53, 0.85)";
  context.lineWidth = Math.max(1, canvasWidth / 850);
  context.setLineDash([Math.max(4, canvasWidth / 180), Math.max(3, canvasWidth / 240)]);
  context.lineCap = "round";
  context.lineJoin = "round";
  context.stroke();
  context.restore();
}

export function drawCheckerboard(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  cellSize: number
) {
  context.save();
  context.fillStyle = "#f7f8f6";
  context.fillRect(0, 0, width, height);

  for (let y = 0; y < height; y += cellSize) {
    for (let x = 0; x < width; x += cellSize) {
      const isDark = (x / cellSize + y / cellSize) % 2 === 0;
      context.fillStyle = isDark ? "#d7deda" : "#eef2ef";
      context.fillRect(x, y, cellSize, cellSize);
    }
  }

  context.restore();
}

export function drawProductionImage(
  context: CanvasRenderingContext2D,
  image: LoadedImage | null,
  width: number,
  height: number,
  config: ProductionConfig,
  options: DrawOptions = {}
) {
  const { checker = false, showOverlay = false } = options;
  const layout = layoutMm(config);
  const drawRect = getDrawRect(image, width, height, config);

  context.clearRect(0, 0, width, height);

  if (checker) {
    drawCheckerboard(context, width, height, Math.max(8, Math.round(width / 70)));
  }

  if (!image) {
    return;
  }

  for (let row = 0; row < config.rows; row += 1) {
    for (let col = 0; col < config.columns; col += 1) {
      const xMm = col * (TAPE.widthMm + TAPE.gapXMm);
      const yMm = row * (TAPE.heightMm + TAPE.gapYMm);
      const x = mmToPx(xMm, layout.width, width);
      const y = mmToPx(yMm, layout.height, height);
      const tapeWidth = mmToPx(TAPE.widthMm, layout.width, width);
      const tapeHeight = mmToPx(TAPE.heightMm, layout.height, height);

      context.save();
      context.beginPath();
      context.rect(x, y, tapeWidth, tapeHeight);
      context.clip();
      context.drawImage(image, drawRect.x, drawRect.y, drawRect.width, drawRect.height);
      context.restore();
      clearBottomBreak(context, x, y, tapeWidth, tapeHeight, config);

      if (showOverlay) {
        context.save();
        context.strokeStyle = "rgba(255, 255, 255, 0.7)";
        context.lineWidth = Math.max(1, width / 900);
        context.strokeRect(x + 0.5, y + 0.5, tapeWidth - 1, tapeHeight - 1);
        context.restore();
        strokeBottomBreakOverlay(context, x, y, tapeWidth, tapeHeight, width, config);
      }
    }
  }

  if (showOverlay) {
    context.save();
    context.strokeStyle = "rgba(15, 118, 110, 0.55)";
    context.lineWidth = Math.max(1, width / 500);
    context.strokeRect(0.5, 0.5, width - 1, height - 1);
    context.restore();
  }
}

export function canvasToPdfBlob(canvas: HTMLCanvasElement, pageWidthIn: number, pageHeightIn: number) {
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Could not read gang sheet canvas");
  }

  const imageData = context.getImageData(0, 0, canvas.width, canvas.height).data;
  const pixelCount = canvas.width * canvas.height;
  const rgb = new Uint8Array(pixelCount * 3);
  const alpha = new Uint8Array(pixelCount);

  for (let i = 0, rgbIndex = 0; i < imageData.length; i += 4, rgbIndex += 3) {
    rgb[rgbIndex] = imageData[i];
    rgb[rgbIndex + 1] = imageData[i + 1];
    rgb[rgbIndex + 2] = imageData[i + 2];
    alpha[i / 4] = imageData[i + 3];
  }

  const enc = new TextEncoder();
  const chunks: BlobPart[] = [];
  const offsets = [0];
  let length = 0;

  function push(data: string | Uint8Array) {
    const bytes = typeof data === "string" ? enc.encode(data) : data;
    const buffer = new ArrayBuffer(bytes.byteLength);
    new Uint8Array(buffer).set(bytes);
    chunks.push(buffer);
    length += bytes.length;
  }

  function addObject(id: number, parts: Array<string | Uint8Array>) {
    offsets[id] = length;
    push(`${id} 0 obj\n`);
    parts.forEach(push);
    push("\nendobj\n");
  }

  const pageWidthPt = pageWidthIn * 72;
  const pageHeightPt = pageHeightIn * 72;
  const content = `q\n${pageWidthPt.toFixed(4)} 0 0 ${pageHeightPt.toFixed(
    4
  )} 0 0 cm\n/Im1 Do\nQ\n`;

  push("%PDF-1.4\n%CassetteMapper\n");
  addObject(1, ["<< /Type /Catalog /Pages 2 0 R >>"]);
  addObject(2, ["<< /Type /Pages /Kids [3 0 R] /Count 1 >>"]);
  addObject(3, [
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidthPt.toFixed(
      4
    )} ${pageHeightPt.toFixed(4)}] `,
    "/Resources << /XObject << /Im1 5 0 R >> >> /Contents 4 0 R >>"
  ]);
  addObject(4, [`<< /Length ${enc.encode(content).length} >>\nstream\n`, content, "endstream"]);
  addObject(5, [
    `<< /Type /XObject /Subtype /Image /Width ${canvas.width} /Height ${canvas.height} `,
    `/ColorSpace /DeviceRGB /BitsPerComponent 8 /SMask 6 0 R /Length ${rgb.length} >>\nstream\n`,
    rgb,
    "\nendstream"
  ]);
  addObject(6, [
    `<< /Type /XObject /Subtype /Image /Width ${canvas.width} /Height ${canvas.height} `,
    `/ColorSpace /DeviceGray /BitsPerComponent 8 /Length ${alpha.length} >>\nstream\n`,
    alpha,
    "\nendstream"
  ]);

  const xrefOffset = length;
  push("xref\n0 7\n0000000000 65535 f \n");
  for (let id = 1; id <= 6; id += 1) {
    push(`${String(offsets[id]).padStart(10, "0")} 00000 n \n`);
  }
  push(`trailer\n<< /Size 7 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);

  return new Blob(chunks, { type: "application/pdf" });
}

export function drawGangSheet(
  image: LoadedImage,
  config: ProductionConfig,
  segment: GangSegment | null = null,
  partIndex = 1,
  totalParts = 1
) {
  const output = getOutputSize(image, config);
  const sourceLayout = layoutMm(config);
  const gang = getGangSheetLayout(config);
  const rowStart = segment ? segment.rowStart : 0;
  const rowCount = segment ? segment.rowCount : gang.gangRows;
  const pageHeightMm = getGangRowsHeightMm(rowCount);
  const pxPerMm = output.width / sourceLayout.width;
  const pageWidthPx = Math.max(1, Math.round(gang.pageWidthMm * pxPerMm));
  const pageHeightPx = Math.max(1, Math.round(pageHeightMm * pxPerMm));
  const tapeWidthPx = TAPE.widthMm * pxPerMm;
  const tapeHeightPx = TAPE.heightMm * pxPerMm;
  const gutterPx = TAPE.gangSheet.gutterMm * pxPerMm;
  const leftMarginPx = gang.leftMarginMm * pxPerMm;
  const sourceDrawRect = getDrawRect(image, output.width, output.height, config);

  const canvas = document.createElement("canvas");
  canvas.width = pageWidthPx;
  canvas.height = pageHeightPx;

  const context = canvas.getContext("2d", { alpha: true });
  if (!context) {
    throw new Error("Could not create gang sheet canvas");
  }

  context.clearRect(0, 0, canvas.width, canvas.height);

  for (let row = 0; row < config.rows; row += 1) {
    for (let col = 0; col < config.columns; col += 1) {
      const sourceIndex = row * config.columns + col;
      const gangCol = sourceIndex % TAPE.gangSheet.columns;
      const gangRow = Math.floor(sourceIndex / TAPE.gangSheet.columns);

      if (gangRow < rowStart || gangRow >= rowStart + rowCount) {
        continue;
      }

      const localGangRow = gangRow - rowStart;
      const sourceX = mmToPx(
        col * (TAPE.widthMm + TAPE.gapXMm),
        sourceLayout.width,
        output.width
      );
      const sourceY = mmToPx(
        row * (TAPE.heightMm + TAPE.gapYMm),
        sourceLayout.height,
        output.height
      );
      const destX = leftMarginPx + gangCol * (tapeWidthPx + gutterPx);
      const destY = localGangRow * (tapeHeightPx + gutterPx);

      context.save();
      context.beginPath();
      context.rect(destX, destY, tapeWidthPx, tapeHeightPx);
      context.clip();
      context.drawImage(
        image,
        destX + sourceDrawRect.x - sourceX,
        destY + sourceDrawRect.y - sourceY,
        sourceDrawRect.width,
        sourceDrawRect.height
      );
      context.restore();

      clearBottomBreak(context, destX, destY, tapeWidthPx, tapeHeightPx, config);
    }
  }

  const roundedSizeLabel = `FULL PDF SIZE: ${formatRoundedPdfSize(
    TAPE.gangSheet.widthIn,
    mmToIn(pageHeightMm)
  )}`;
  const partLabel = totalParts > 1 ? `PART ${partIndex} OF ${totalParts} - ` : "";
  const labelX = Math.min(leftMarginPx * 0.42, 8 * pxPerMm);
  const labelY = 7 * pxPerMm;

  context.save();
  context.translate(labelX, labelY);
  context.rotate(Math.PI / 2);
  context.fillStyle = "rgba(0, 0, 0, 0.92)";
  context.font = `${Math.max(10, 3.8 * pxPerMm)}px Arial, sans-serif`;
  context.textBaseline = "middle";
  context.fillText(`${partLabel}${roundedSizeLabel}`, 0, 0);
  context.restore();

  return {
    canvas,
    pageWidthIn: TAPE.gangSheet.widthIn,
    pageHeightIn: mmToIn(pageHeightMm)
  };
}

export function downloadBlob(blob: Blob, filename: string) {
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 5000);
}
