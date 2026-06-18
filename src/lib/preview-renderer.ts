import { bilinearPoint, defaultProductRenderSettings, getTapeFeatures } from "./calibration";
import { defaultProductionConfig, getDrawRect, mmToPx, TAPE } from "./geometry";
import type { LoadedImage } from "./image";
import { drawProductionImage } from "./production-renderer";
import type {
  Point,
  ProductCalibration,
  ProductionConfig,
  Quad,
  TapeCircleFeature
} from "./types";

function traceQuad(context: CanvasRenderingContext2D, quad: Quad) {
  context.beginPath();
  context.moveTo(quad[0].x, quad[0].y);
  context.lineTo(quad[1].x, quad[1].y);
  context.lineTo(quad[2].x, quad[2].y);
  context.lineTo(quad[3].x, quad[3].y);
  context.closePath();
}

function traceRoundedQuad(context: CanvasRenderingContext2D, quad: Quad, radius: number) {
  const r = Math.min(0.12, Math.max(0, radius));
  const topLeftTop = bilinearPoint(quad, r, 0);
  const topRightTop = bilinearPoint(quad, 1 - r, 0);
  const topRightRight = bilinearPoint(quad, 1, r);
  const bottomRightRight = bilinearPoint(quad, 1, 1 - r);
  const bottomRightBottom = bilinearPoint(quad, 1 - r, 1);
  const bottomLeftBottom = bilinearPoint(quad, r, 1);
  const bottomLeftLeft = bilinearPoint(quad, 0, 1 - r);
  const topLeftLeft = bilinearPoint(quad, 0, r);

  context.beginPath();
  context.moveTo(topLeftTop.x, topLeftTop.y);
  context.lineTo(topRightTop.x, topRightTop.y);
  context.quadraticCurveTo(quad[1].x, quad[1].y, topRightRight.x, topRightRight.y);
  context.lineTo(bottomRightRight.x, bottomRightRight.y);
  context.quadraticCurveTo(quad[2].x, quad[2].y, bottomRightBottom.x, bottomRightBottom.y);
  context.lineTo(bottomLeftBottom.x, bottomLeftBottom.y);
  context.quadraticCurveTo(quad[3].x, quad[3].y, bottomLeftLeft.x, bottomLeftLeft.y);
  context.lineTo(topLeftLeft.x, topLeftLeft.y);
  context.quadraticCurveTo(quad[0].x, quad[0].y, topLeftTop.x, topLeftTop.y);
  context.closePath();
}

function fitImageRect(image: LoadedImage, width: number, height: number) {
  const scale = Math.min(width / image.naturalWidth, height / image.naturalHeight);
  const drawWidth = image.naturalWidth * scale;
  const drawHeight = image.naturalHeight * scale;

  return {
    x: width / 2 - drawWidth / 2,
    y: height / 2 - drawHeight / 2,
    width: drawWidth,
    height: drawHeight,
    scale
  };
}

type PhotoMapping = {
  drawPhoto: (context: CanvasRenderingContext2D) => void;
  mapPoint: (point: Point) => Point;
};

function getPhotoMapping(photo: LoadedImage, width: number, height: number, calibration: ProductCalibration): PhotoMapping {
  const frame = calibration.previewFrame;

  if (!frame) {
    const rect = fitImageRect(photo, width, height);
    return {
      drawPhoto: (context) => context.drawImage(photo, rect.x, rect.y, rect.width, rect.height),
      mapPoint: (point) => scalePoint(point, rect)
    };
  }

  const radians = (frame.rotationDeg * Math.PI) / 180;
  const cos = Math.cos(-radians);
  const sin = Math.sin(-radians);
  const center = {
    x: frame.x + frame.width / 2,
    y: frame.y + frame.height / 2
  };
  const scaleX = width / frame.width;
  const scaleY = height / frame.height;

  return {
    drawPhoto: (context) => {
      context.save();
      context.translate(width / 2, height / 2);
      context.scale(scaleX, scaleY);
      context.rotate(-radians);
      context.translate(-center.x, -center.y);
      context.drawImage(photo, 0, 0);
      context.restore();
    },
    mapPoint: (point) => {
      const dx = point.x - center.x;
      const dy = point.y - center.y;
      return {
        x: width / 2 + (dx * cos - dy * sin) * scaleX,
        y: height / 2 + (dx * sin + dy * cos) * scaleY
      };
    }
  };
}

function scalePoint(point: Point, rect: ReturnType<typeof fitImageRect>): Point {
  return {
    x: rect.x + point.x * rect.scale,
    y: rect.y + point.y * rect.scale
  };
}

function scaleQuad(quad: Quad, rect: ReturnType<typeof fitImageRect>): Quad {
  return quad.map((point) => scalePoint(point, rect)) as Quad;
}

function mapQuad(quad: Quad, mapping: PhotoMapping): Quad {
  return quad.map((point) => mapping.mapPoint(point)) as Quad;
}

function getCalibrationTapeGrid(calibration: ProductCalibration) {
  const tapeColumns = calibration.tapes.reduce(
    (max, tape) => Math.max(max, Number.isFinite(tape.column) ? tape.column + 1 : 0),
    0
  );
  const tapeRows = calibration.tapes.reduce(
    (max, tape) => Math.max(max, Number.isFinite(tape.row) ? tape.row + 1 : 0),
    0
  );

  return {
    columns: Math.max(1, tapeColumns || calibration.layout.columns || 1),
    rows: Math.max(1, tapeRows || calibration.layout.rows || 1)
  };
}

function getPreviewArtworkLayout(calibration: ProductCalibration) {
  const settings = {
    ...defaultProductRenderSettings,
    ...calibration.renderSettings
  };
  const grid = getCalibrationTapeGrid(calibration);

  return {
    width:
      grid.columns * TAPE.widthMm +
      Math.max(0, grid.columns - 1) * settings.artworkGapXMm,
    height:
      grid.rows * TAPE.heightMm +
      Math.max(0, grid.rows - 1) * settings.artworkGapYMm,
    gapXMm: settings.artworkGapXMm,
    gapYMm: settings.artworkGapYMm,
    columns: grid.columns,
    rows: grid.rows
  };
}

function makeArtworkCanvas(image: LoadedImage, config: ProductionConfig, sourceLayout: ReturnType<typeof getPreviewArtworkLayout>) {
  const width = 1800;
  const height = Math.round(width / (sourceLayout.width / sourceLayout.height));
  const drawRect = getDrawRect(image, width, height, config);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Could not create artwork canvas");
  }

  context.clearRect(0, 0, width, height);
  context.drawImage(image, drawRect.x, drawRect.y, drawRect.width, drawRect.height);
  return canvas;
}

type SourcePixels = {
  data: Uint8ClampedArray;
  width: number;
  height: number;
};

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

  if (!solved) {
    return null;
  }

  return [
    solved[0],
    solved[1],
    solved[2],
    solved[3],
    solved[4],
    solved[5],
    solved[6],
    solved[7],
    1
  ];
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

function sampleSourcePixel(source: SourcePixels, x: number, y: number) {
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

  return result;
}

function getQuadBounds(quad: Quad, width: number, height: number) {
  const xs = quad.map((point) => point.x);
  const ys = quad.map((point) => point.y);

  return {
    left: Math.max(0, Math.floor(Math.min(...xs))),
    top: Math.max(0, Math.floor(Math.min(...ys))),
    right: Math.min(width, Math.ceil(Math.max(...xs))),
    bottom: Math.min(height, Math.ceil(Math.max(...ys)))
  };
}

function warpImageToQuad(
  context: CanvasRenderingContext2D,
  source: SourcePixels,
  sourceRect: { x: number; y: number; width: number; height: number },
  quad: Quad
) {
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

  const bounds = getQuadBounds(quad, context.canvas.width, context.canvas.height);
  const width = bounds.right - bounds.left;
  const height = bounds.bottom - bounds.top;

  if (width <= 0 || height <= 0) {
    return;
  }

  const tile = document.createElement("canvas");
  tile.width = width;
  tile.height = height;
  const tileContext = tile.getContext("2d");

  if (!tileContext) {
    return;
  }

  const output = tileContext.createImageData(width, height);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const mapped = applyHomography(inverse, {
        x: bounds.left + x + 0.5,
        y: bounds.top + y + 0.5
      });

      if (mapped.x < 0 || mapped.x > 1 || mapped.y < 0 || mapped.y > 1) {
        continue;
      }

      const sourceX = sourceRect.x + mapped.x * sourceRect.width;
      const sourceY = sourceRect.y + mapped.y * sourceRect.height;
      const sample = sampleSourcePixel(source, sourceX, sourceY);
      const outputIndex = (y * width + x) * 4;
      output.data[outputIndex] = sample[0];
      output.data[outputIndex + 1] = sample[1];
      output.data[outputIndex + 2] = sample[2];
      output.data[outputIndex + 3] = sample[3];
    }
  }

  tileContext.putImageData(output, 0, 0);
  context.drawImage(tile, bounds.left, bounds.top);
}

function traceCircleFeature(
  context: CanvasRenderingContext2D,
  feature: TapeCircleFeature,
  quad: Quad
) {
  const center = bilinearPoint(quad, feature.x, feature.y);
  const right = bilinearPoint(quad, feature.x + feature.r, feature.y);
  const bottom = bilinearPoint(quad, feature.x, feature.y + feature.r);
  const radius =
    (Math.hypot(right.x - center.x, right.y - center.y) +
      Math.hypot(bottom.x - center.x, bottom.y - center.y)) /
    2;

  context.beginPath();
  context.arc(center.x, center.y, radius, 0, Math.PI * 2);
}

function restorePhotoCircle(
  context: CanvasRenderingContext2D,
  photoMapping: PhotoMapping,
  feature: TapeCircleFeature,
  quad: Quad
) {
  context.save();
  traceCircleFeature(context, feature, quad);
  context.clip();
  photoMapping.drawPhoto(context);
  context.restore();
}

function restorePhotoStroke(
  context: CanvasRenderingContext2D,
  photoMapping: PhotoMapping,
  drawStroke: (strokeContext: CanvasRenderingContext2D) => void,
  alpha = 1
) {
  const mask = document.createElement("canvas");
  mask.width = context.canvas.width;
  mask.height = context.canvas.height;
  const maskContext = mask.getContext("2d");

  if (!maskContext) {
    return;
  }

  drawStroke(maskContext);
  maskContext.globalCompositeOperation = "source-in";
  photoMapping.drawPhoto(maskContext);

  context.save();
  context.globalAlpha = alpha;
  context.drawImage(mask, 0, 0);
  context.restore();
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

function strokeRaisedGap(
  context: CanvasRenderingContext2D,
  photoMapping: PhotoMapping,
  raisedPolygon: Quad,
  quad: Quad,
  gapMm: number,
  photoBlendAlpha: number
) {
  const p0 = bilinearPoint(quad, raisedPolygon[0].x, raisedPolygon[0].y);
  const p1 = bilinearPoint(quad, raisedPolygon[1].x, raisedPolygon[1].y);
  const p2 = bilinearPoint(quad, raisedPolygon[2].x, raisedPolygon[2].y);
  const p3 = bilinearPoint(quad, raisedPolygon[3].x, raisedPolygon[3].y);
  const lineWidth = Math.max(1, gapMm * averageTapeScalePxPerMm(quad));

  restorePhotoStroke(
    context,
    photoMapping,
    (strokeContext) => {
      strokeContext.beginPath();
      strokeContext.moveTo(p0.x, p0.y);
      strokeContext.lineTo(p1.x, p1.y);
      strokeContext.lineTo(p2.x, p2.y);
      strokeContext.lineTo(p3.x, p3.y);
      strokeContext.closePath();
      strokeContext.strokeStyle = "rgba(255, 255, 255, 1)";
      strokeContext.lineWidth = lineWidth;
      strokeContext.lineCap = "round";
      strokeContext.lineJoin = "round";
      strokeContext.stroke();
    },
    photoBlendAlpha
  );
}

export function drawCleanPreview(
  context: CanvasRenderingContext2D,
  artwork: LoadedImage | null,
  width: number,
  height: number,
  config: ProductionConfig = defaultProductionConfig
) {
  drawProductionImage(context, artwork, width, height, config, {
    checker: true,
    showOverlay: true
  });
}

export function drawRealisticPreview(
  context: CanvasRenderingContext2D,
  artwork: LoadedImage | null,
  photo: LoadedImage | null,
  calibration: ProductCalibration,
  width: number,
  height: number,
  config: ProductionConfig = defaultProductionConfig,
  showOverlay = false
) {
  const settings = {
    ...defaultProductRenderSettings,
    ...calibration.renderSettings
  };
  context.clearRect(0, 0, width, height);
  context.fillStyle = settings.backgroundFill;
  context.fillRect(0, 0, width, height);

  if (!photo) {
    return;
  }

  const photoMapping = getPhotoMapping(photo, width, height, calibration);
  photoMapping.drawPhoto(context);

  if (!artwork) {
    return;
  }

  const sourceLayout = getPreviewArtworkLayout(calibration);
  const sourceCanvas = makeArtworkCanvas(artwork, config, sourceLayout);
  const sourceContext = sourceCanvas.getContext("2d", { willReadFrequently: true });

  if (!sourceContext) {
    return;
  }

  const sourcePixels: SourcePixels = {
    data: sourceContext.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height).data,
    width: sourceCanvas.width,
    height: sourceCanvas.height
  };
  const sourceTapeWidth = mmToPx(TAPE.widthMm, sourceLayout.width, sourceCanvas.width);
  const sourceTapeHeight = mmToPx(TAPE.heightMm, sourceLayout.height, sourceCanvas.height);
  const overlayOpacity = Math.min(1, Math.max(0, settings.artworkOpacity));
  const raisedEdgeArtworkOpacity = Math.min(overlayOpacity, Math.max(0, settings.raisedEdgeArtworkOpacity));
  const raisedPhotoBlendAlpha =
    overlayOpacity > 0 ? Math.min(1, Math.max(0, 1 - raisedEdgeArtworkOpacity / overlayOpacity)) : 0;

  calibration.tapes.forEach((tape) => {
    if (
      tape.column < 0 ||
      tape.row < 0 ||
      tape.column >= sourceLayout.columns ||
      tape.row >= sourceLayout.rows
    ) {
      return;
    }

    const features = getTapeFeatures(tape);
    const sourceX = mmToPx(
      tape.column * (TAPE.widthMm + sourceLayout.gapXMm),
      sourceLayout.width,
      sourceCanvas.width
    );
    const sourceY = mmToPx(
      tape.row * (TAPE.heightMm + sourceLayout.gapYMm),
      sourceLayout.height,
      sourceCanvas.height
    );
    const quad = mapQuad(tape.quad, photoMapping);

    context.save();
    traceRoundedQuad(context, quad, features.cornerRadius);
    context.clip();
    context.globalAlpha = overlayOpacity;
    context.filter = `brightness(${tape.lighting.brightness}) contrast(${tape.lighting.contrast}) saturate(0.96)`;
    warpImageToQuad(
      context,
      sourcePixels,
      { x: sourceX, y: sourceY, width: sourceTapeWidth, height: sourceTapeHeight },
      quad
    );
    context.restore();

    context.save();
    traceRoundedQuad(context, quad, features.cornerRadius);
    context.globalCompositeOperation = "multiply";
    context.fillStyle = `rgba(0, 0, 0, ${tape.lighting.shadow})`;
    context.fill();
    context.restore();

    features.transparentHoles.forEach((feature) => {
      restorePhotoCircle(context, photoMapping, feature, quad);
    });
    features.blackHoles.forEach((feature) => restorePhotoCircle(context, photoMapping, feature, quad));
    features.raised.blackHoles.forEach((feature) =>
      restorePhotoCircle(context, photoMapping, feature, quad)
    );

    if (features.raised.enabled) {
      strokeRaisedGap(
        context,
        photoMapping,
        features.raised.polygon,
        quad,
        features.raised.gapMm,
        raisedPhotoBlendAlpha
      );
    }

    if (showOverlay) {
      context.save();
      traceRoundedQuad(context, quad, features.cornerRadius);
      context.strokeStyle = "rgba(255, 255, 255, 0.72)";
      context.lineWidth = Math.max(1, width / 900);
      context.stroke();
      if (features.raised.enabled) {
        traceQuad(
          context,
          features.raised.polygon.map((point) => bilinearPoint(quad, point.x, point.y)) as Quad
        );
        context.strokeStyle = "rgba(222, 107, 53, 0.82)";
        context.stroke();
      }
      const label = `${tape.index + 1}`;
      const labelPoint = bilinearPoint(quad, 0.06, 0.16);
      context.fillStyle = "rgba(0, 0, 0, 0.7)";
      context.fillRect(labelPoint.x - 3, labelPoint.y - 15, 30, 18);
      context.fillStyle = "white";
      context.font = `${Math.max(10, width / 90)}px Arial, sans-serif`;
      context.fillText(label, labelPoint.x, labelPoint.y);
      context.restore();
    }
  });
}

export function getScaledCalibrationPoint(
  point: Point,
  photo: LoadedImage,
  width: number,
  height: number
) {
  const rect = fitImageRect(photo, width, height);
  return scalePoint(point, rect);
}

export function unscaleCalibrationPoint(
  point: Point,
  photo: LoadedImage,
  width: number,
  height: number
) {
  const rect = fitImageRect(photo, width, height);
  return {
    x: (point.x - rect.x) / rect.scale,
    y: (point.y - rect.y) / rect.scale
  };
}
