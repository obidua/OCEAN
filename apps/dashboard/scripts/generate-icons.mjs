#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const root = path.resolve(process.cwd());
const publicDir = path.join(root, 'public');
const srcSvg = path.join(publicDir, 'oceanwave.svg');

async function ensureExists(p) {
  await fs.promises.mkdir(path.dirname(p), { recursive: true });
}

async function main() {
  if (!fs.existsSync(srcSvg)) {
    console.error(`Source SVG not found: ${srcSvg}`);
    process.exit(1);
  }

  const targets = [
    { out: 'oceanwave.png', size: 512 },
    { out: 'icon-512x512.png', size: 512 },
    { out: 'icon-192x192.png', size: 192 },
    { out: 'apple-touch-icon.png', size: 180 },
    { out: 'favicon-32x32.png', size: 32 },
    { out: 'favicon-16x16.png', size: 16 },
  ];

  for (const { out, size } of targets) {
    const outPath = path.join(publicDir, out);
    await ensureExists(outPath);
    await sharp(srcSvg)
      .resize(size, size, { fit: 'contain', background: { r: 6, g: 17, b: 32, alpha: 1 } })
      .png({ compressionLevel: 9 })
      .toFile(outPath);
    console.log(`Generated ${out} (${size}x${size})`);
  }

  console.log('All icons generated successfully.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
