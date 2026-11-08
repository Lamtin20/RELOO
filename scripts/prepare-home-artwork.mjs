import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';

// Recompose the existing artwork; keep originals for future editing.
const root = new URL('../public/images/', import.meta.url);
const groups = ['electronics', 'camera', 'home', 'camping', 'baby', 'fashion', 'vehicle', 'sports', 'tools', 'office', 'music', 'beauty', 'event', 'default'];
for (const folder of ['categories-refreshed', 'rental-benefits-refreshed', 'banners']) {
  await mkdir(new URL(folder, root), { recursive: true });
}
for (const group of groups) {
  await sharp(new URL(`categories-3d/${group}.webp`, root).pathname.replace(/^\/(\w:)/, '$1'))
    .trim({ threshold: 12 }).resize(208, 208, { fit: 'contain', background: '#00000000' })
    .extend({ top: 24, bottom: 24, left: 24, right: 24, background: '#00000000' })
    .webp({ quality: 90 }).toFile(new URL(`categories-refreshed/${group}.webp`, root).pathname.replace(/^\/(\w:)/, '$1'));
}
for (const name of ['upfront', 'flexibility', 'try-before-buy', 'space', 'choice', 'reuse']) {
  const path = new URL(`rental-benefits/${name}.webp`, root).pathname.replace(/^\/(\w:)/, '$1');
  const { data, info } = await sharp(path).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  // Remove only near-white pixels connected to the border, preserving white objects.
  const seen = new Uint8Array(info.width * info.height);
  const queue = [];
  const enqueue = (x, y) => {
    if (x < 0 || y < 0 || x >= info.width || y >= info.height) return;
    const p = y * info.width + x, i = p * 4;
    if (seen[p] || Math.min(data[i], data[i + 1], data[i + 2]) < 242) return;
    seen[p] = 1; queue.push(p);
  };
  for (let x = 0; x < info.width; x++) { enqueue(x, 0); enqueue(x, info.height - 1); }
  for (let y = 0; y < info.height; y++) { enqueue(0, y); enqueue(info.width - 1, y); }
  for (let head = 0; head < queue.length; head++) {
    const p = queue[head], x = p % info.width, y = Math.floor(p / info.width);
    data[p * 4 + 3] = 0;
    enqueue(x - 1, y); enqueue(x + 1, y); enqueue(x, y - 1); enqueue(x, y + 1);
  }
  await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
    .resize(464, 464).extend({ top: 24, bottom: 24, left: 24, right: 24, background: '#00000000' })
    .webp({ quality: 90 }).toFile(new URL(`rental-benefits-refreshed/${name}.webp`, root).pathname.replace(/^\/(\w:)/, '$1'));
}
const scenes = { rent: ['electronics', 'camera', 'camping'], sale: ['fashion', 'home', 'vehicle'], affiliate: ['default', 'beauty', 'sports'] };
for (const [name, objects] of Object.entries(scenes)) {
  const mascot = await sharp(new URL('../mascot/reloop/v1/master.webp', root).pathname.replace(/^\/(\w:)/, '$1'))
    .resize(390, 390).png().toBuffer();
  const layers = [{ input: mascot, left: 0, top: 5 }];
  for (const [i, object] of objects.entries()) {
    const input = await sharp(new URL(`categories-refreshed/${object}.webp`, root).pathname.replace(/^\/(\w:)/, '$1'))
      .resize(240, 240).png().toBuffer();
    layers.push({ input, left: [355, 545, 745][i], top: [120, 30, 120][i] });
  }
  await sharp({ create: { width: 1000, height: 400, channels: 4, background: '#00000000' } })
    .composite(layers).webp({ quality: 92 })
    .toFile(new URL(`banners/${name}-desktop-v2.webp`, root).pathname.replace(/^\/(\w:)/, '$1'));
}
console.log('Prepared 14 category images, 6 benefit images and 3 desktop banner compositions.');
