import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import sharp from 'sharp';
import { generateFixtures } from './fixtures/event-covers/generate.mjs';
import { processCoverImage } from '../lib/event-cover-validation.ts';
import { coverAlternative, normalizeCoverAltText } from '../lib/event-covers.ts';
await generateFixtures();
const bytes = name => readFile(new URL(`./fixtures/event-covers/generated/${name}`, import.meta.url));
for (const name of ['valid.jpg', 'valid.png', 'valid.webp', 'renamed.jpg', 'alpha.png', 'exif.jpg', 'width-600.png', 'width-6000.png', 'height-600.png', 'height-6000.png', 'bytes-5242879.png', 'bytes-5242880.png']) {
  test(`accept and fully decode ${name}`, async () => {
    const result = await processCoverImage(await bytes(name));
    const metadata = await sharp(result.bytes).metadata();
    assert.equal(metadata.format, 'webp'); assert.equal(metadata.exif, undefined);
    assert.equal(metadata.icc, undefined); assert.ok(result.width <= 2400 && result.height <= 2400);
    if (name === 'alpha.png') assert.equal(metadata.hasAlpha, true);
    if (name === 'exif.jpg') assert.ok(result.height > result.width);
  });
}
for (const [name, status] of [['empty.png',422], ['corrupt.png',422], ['animated.png',422], ['animated.webp',422], ['width-599.png',422], ['height-599.png',422], ['width-6001.png',422], ['height-6001.png',422], ['bytes-5242881.png',413]]) {
  test(`reject ${name}`, async () => { const input = await bytes(name); await assert.rejects(() => processCoverImage(input), error => error.status === status); });
}
test('unsupported content and alternatives', async () => {
  await assert.rejects(() => processCoverImage(Buffer.from('<svg/>')), e => e.status === 415);
  assert.equal(normalizeCoverAltText(' \n '), null); assert.equal(coverAlternative({ altText: ' ' }, 'Nuevo título'), 'Nuevo título');
});
test('maximum dimensions and bounded concurrent processing', async () => {
  const input = await bytes('maximum.png'); const start = performance.now();
  const result = await processCoverImage(input);
  assert.equal(result.width, 2400); assert.equal(result.height, 2400);
  console.log(JSON.stringify({ maximumPixels: 36_000_000, milliseconds: Math.round(performance.now()-start), maxRssKiB: process.resourceUsage().maxRSS }));
});
test('concurrent decode is bounded to one image per process',async()=>{
 const input=await bytes('maximum.png');const first=processCoverImage(input);await assert.rejects(()=>processCoverImage(input),e=>e.status===503);await first;
});
