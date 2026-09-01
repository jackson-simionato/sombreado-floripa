import { Buffer } from "node:buffer";
import { mkdirSync, writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SURFACE = [0xfa, 0xf9, 0xf5, 0xff];
const INK = [0x1e, 0x1e, 0x1c, 0xff];
const SUN = [0xfd, 0xfc, 0xf8, 0xff];
const RING = [0x1e, 0x1e, 0x1c, 0x33];

const sizes = [
  { file: "icon-192.png", size: 192 },
  { file: "icon-512.png", size: 512 },
  { file: "apple-touch-icon.png", size: 180 },
];

const outDir = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../public/icons"
);
mkdirSync(outDir, { recursive: true });

for (const { file, size } of sizes) {
  writeFileSync(resolve(outDir, file), encodePng(renderMark(size)));
}

function renderMark(size) {
  const pixels = Buffer.alloc(size * size * 4);
  const cx = (size - 1) / 2;
  const cy = (size - 1) / 2;
  const radius = size * 0.38;
  const ringWidth = Math.max(1, size * 0.012);
  const sunRadius = radius * 0.28;
  const rayLength = sunRadius * 0.72;
  const rayWidth = Math.max(1.2, size * 0.018);
  const cos = Math.SQRT1_2;
  const sin = Math.SQRT1_2;

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.hypot(dx, dy);
      let color = SURFACE;

      if (dist <= radius + ringWidth) {
        if (dist > radius) {
          color = RING;
        } else {
          const ry = -dx * sin + dy * cos;
          color = ry <= 0 ? INK : SURFACE;
        }
      }

      const sunStroke = Math.max(1.2, size * 0.02);
      const onSunRing =
        dist <= sunRadius + sunStroke / 2 && dist >= sunRadius - sunStroke / 2;
      let onRay = false;
      for (let ray = 0; ray < 8; ray += 1) {
        const angle = (Math.PI / 4) * ray;
        const px = dx * Math.cos(-angle) - dy * Math.sin(-angle);
        const py = dx * Math.sin(-angle) + dy * Math.cos(-angle);
        if (
          px >= sunRadius * 0.85 &&
          px <= sunRadius + rayLength &&
          Math.abs(py) <= rayWidth / 2
        ) {
          onRay = true;
          break;
        }
      }

      if (onSunRing || onRay) {
        color = SUN;
      }

      const offset = (y * size + x) * 4;
      pixels[offset] = color[0];
      pixels[offset + 1] = color[1];
      pixels[offset + 2] = color[2];
      pixels[offset + 3] = color[3];
    }
  }

  return { size, pixels };
}

function encodePng({ size, pixels }) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y += 1) {
    const rowStart = y * (size * 4 + 1);
    raw[rowStart] = 0;
    pixels.copy(raw, rowStart + 1, y * size * 4, (y + 1) * size * 4);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", deflateSync(raw, { level: 9 })),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

function pngChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type);
  const payload = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(payload));
  return Buffer.concat([length, payload, crc]);
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}
