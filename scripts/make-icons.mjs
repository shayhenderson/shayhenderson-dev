// Regenerate the PNG icons from public/favicon.svg:
//   public/favicon-96x96.png   — fallback for crawlers/browsers without SVG
//   public/apple-touch-icon.png — 180x180, square background (iOS rounds it)
//   public/favicon.ico          — 16/32/48 PNG frames in an ICO container, for
//                                 clients that request /favicon.ico by convention
// Usage: node scripts/make-icons.mjs
import { readFile, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const svg = await readFile('public/favicon.svg', 'utf8');
// iOS masks its own corners: drop the rounded rect for the touch icon
const squareSvg = svg.replace('rx="13"', 'rx="0"');

const targets = [
  { path: 'public/favicon-96x96.png', size: 96, markup: svg },
  { path: 'public/apple-touch-icon.png', size: 180, markup: squareSvg },
];

const browser = await chromium.launch();

/** @param {number} size @param {string} markup @returns {Promise<Buffer>} */
async function render(size, markup) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  await page.setContent(
    `<body style="margin:0">${markup.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body>`
  );
  const png = await page.screenshot({ omitBackground: true });
  await page.close();
  return png;
}

for (const { path, size, markup } of targets) {
  await writeFile(path, await render(size, markup));
  console.log(`wrote ${path}`);
}

// ICO container holding PNG-encoded frames (supported by every current browser).
const icoSizes = [16, 32, 48];
const frames = [];
for (const size of icoSizes) frames.push(await render(size, svg));
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0); // reserved
header.writeUInt16LE(1, 2); // type: icon
header.writeUInt16LE(frames.length, 4);
const dir = Buffer.alloc(16 * frames.length);
let offset = header.length + dir.length;
frames.forEach((png, i) => {
  const size = icoSizes[i];
  const o = i * 16;
  dir.writeUInt8(size % 256, o); // width (0 means 256)
  dir.writeUInt8(size % 256, o + 1); // height
  dir.writeUInt8(0, o + 2); // palette colours
  dir.writeUInt8(0, o + 3); // reserved
  dir.writeUInt16LE(1, o + 4); // colour planes
  dir.writeUInt16LE(32, o + 6); // bits per pixel
  dir.writeUInt32LE(png.length, o + 8);
  dir.writeUInt32LE(offset, o + 12);
  offset += png.length;
});
await writeFile('public/favicon.ico', Buffer.concat([header, dir, ...frames]));
console.log('wrote public/favicon.ico');

await browser.close();
