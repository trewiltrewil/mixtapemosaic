import path from "node:path";
import sharp from "sharp";

const thumbSize = 720;
const tapeColumns = 6;
const tapeRows = 9;

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

function alpha(value: number) {
  return Buffer.alloc(thumbSize * thumbSize, Math.round(value * 255));
}

export async function generateCassetteArtworkThumbnail(originalBuffer: Buffer) {
  const basePath = path.join(process.cwd(), "public", "product", "cassette-grid-square-v2.png");
  const [base] = await Promise.all([
    sharp(basePath).resize(thumbSize, thumbSize, { fit: "cover" }).png().toBuffer(),
  ]);
  const artAlpha = alpha(0.84);
  const baseAlpha = alpha(0.3);

  const art = await sharp(originalBuffer, { failOn: "none" })
    .rotate()
    .resize(thumbSize, thumbSize, { fit: "cover" })
    .removeAlpha()
    .joinChannel(artAlpha, { raw: { width: thumbSize, height: thumbSize, channels: 1 } })
    .composite([{ input: cassetteMaskSvg(), blend: "dest-in" }])
    .png()
    .toBuffer();

  const texture = await sharp(base)
    .removeAlpha()
    .joinChannel(baseAlpha, { raw: { width: thumbSize, height: thumbSize, channels: 1 } })
    .png()
    .toBuffer();

  return sharp(base)
    .composite([
      { input: art, blend: "over" },
      { input: texture, blend: "over" }
    ])
    .webp({ quality: 82 })
    .toBuffer();
}
