import path from "node:path";
import sharp from "sharp";

const thumbSize = 720;
const tapeColumns = 6;
const tapeRows = 9;

type Rgb = { r: number; g: number; b: number };

function cassetteMaskSvg() {
  const margin = 22;
  const gap = 4;
  const tapeWidth = (thumbSize - margin * 2 - gap * (tapeColumns - 1)) / tapeColumns;
  const tapeHeight = (thumbSize - margin * 2 - gap * (tapeRows - 1)) / tapeRows;
  const parts = [
    `<svg width="${thumbSize}" height="${thumbSize}" viewBox="0 0 ${thumbSize} ${thumbSize}" xmlns="http://www.w3.org/2000/svg">`,
    `<rect width="${thumbSize}" height="${thumbSize}" fill="black"/>`
  ];

  for (let row = 0; row < tapeRows; row += 1) {
    for (let column = 0; column < tapeColumns; column += 1) {
      const x = margin + column * (tapeWidth + gap);
      const y = margin + row * (tapeHeight + gap);
      const holeY = y + tapeHeight * 0.34;
      const leftHoleX = x + tapeWidth * 0.32;
      const rightHoleX = x + tapeWidth * 0.68;
      const raisedY = y + tapeHeight * 0.72;
      parts.push(`<rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${tapeWidth.toFixed(2)}" height="${tapeHeight.toFixed(2)}" rx="3.5" fill="white"/>`);
      parts.push(`<circle cx="${leftHoleX.toFixed(2)}" cy="${holeY.toFixed(2)}" r="${(tapeHeight * 0.075).toFixed(2)}" fill="black"/>`);
      parts.push(`<circle cx="${rightHoleX.toFixed(2)}" cy="${holeY.toFixed(2)}" r="${(tapeHeight * 0.075).toFixed(2)}" fill="black"/>`);
      parts.push(`<rect x="${(x + tapeWidth * 0.22).toFixed(2)}" y="${raisedY.toFixed(2)}" width="${(tapeWidth * 0.56).toFixed(2)}" height="${(tapeHeight * 0.08).toFixed(2)}" rx="1.5" fill="black" opacity="0.42"/>`);
    }
  }

  parts.push("</svg>");
  return Buffer.from(parts.join(""));
}

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

function backgroundFromAverage(color: Rgb) {
  const luminance = (0.2126 * color.r + 0.7152 * color.g + 0.0722 * color.b) / 255;
  const saturation = (Math.max(color.r, color.g, color.b) - Math.min(color.r, color.g, color.b)) / 255;
  const target = luminance > 0.74 ? mix(color, { r: 41, g: 41, b: 41 }, 0.28) : mix(color, { r: 255, g: 255, b: 255 }, 0.48);
  return saturation < 0.08 ? mix(target, { r: 250, g: 185, b: 60 }, 0.18) : target;
}

async function averageImageColor(originalBuffer: Buffer): Promise<Rgb> {
  const stats = await sharp(originalBuffer, { failOn: "none" })
    .rotate()
    .resize(80, 80, { fit: "cover" })
    .removeAlpha()
    .stats();
  return {
    r: stats.channels[0]?.mean ?? 245,
    g: stats.channels[1]?.mean ?? 241,
    b: stats.channels[2]?.mean ?? 237
  };
}

async function maskAlpha(opacity: number) {
  return sharp(cassetteMaskSvg(), { density: 144 })
    .resize(thumbSize, thumbSize)
    .greyscale()
    .linear(opacity)
    .raw()
    .toBuffer();
}

export async function generateCassetteArtworkThumbnail(originalBuffer: Buffer) {
  const basePath = path.join(process.cwd(), "public", "product", "cassette-grid-square-v2.png");
  const [base, averageColor] = await Promise.all([
    sharp(basePath).resize(thumbSize, thumbSize, { fit: "cover" }).removeAlpha().png().toBuffer(),
    averageImageColor(originalBuffer)
  ]);
  const backgroundColor = backgroundFromAverage(averageColor);
  const [artAlpha, baseAlpha, detailAlpha] = await Promise.all([maskAlpha(0.98), maskAlpha(0.24), maskAlpha(0.1)]);

  const background = await sharp({
    create: {
      width: thumbSize,
      height: thumbSize,
      channels: 3,
      background: backgroundColor
    }
  })
    .png()
    .toBuffer();

  const art = await sharp(originalBuffer, { failOn: "none" })
    .rotate()
    .resize(thumbSize, thumbSize, { fit: "cover" })
    .removeAlpha()
    .joinChannel(artAlpha, { raw: { width: thumbSize, height: thumbSize, channels: 1 } })
    .png()
    .toBuffer();

  const texture = await sharp(base)
    .removeAlpha()
    .joinChannel(baseAlpha, { raw: { width: thumbSize, height: thumbSize, channels: 1 } })
    .png()
    .toBuffer();

  const details = await sharp(base)
    .removeAlpha()
    .joinChannel(detailAlpha, { raw: { width: thumbSize, height: thumbSize, channels: 1 } })
    .png()
    .toBuffer();

  return sharp(background)
    .composite([
      { input: texture, blend: "over" },
      { input: art, blend: "over" },
      { input: details, blend: "multiply" }
    ])
    .webp({ quality: 82 })
    .toBuffer();
}
