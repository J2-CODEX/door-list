import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const destination = new URL('./generated/', import.meta.url);
export function pngChunk(type, data) {
  const bytes = Buffer.concat([Buffer.from(type), data]);
  let crc = 0xffffffff;
  for (const byte of bytes) { crc ^= byte; for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0); }
  const length = Buffer.alloc(4), checksum = Buffer.alloc(4);
  length.writeUInt32BE(data.length); checksum.writeUInt32BE((crc ^ 0xffffffff) >>> 0);
  return Buffer.concat([length, bytes, checksum]);
}
export async function generateFixtures() {
  await mkdir(destination, { recursive: true });
  const manifest = [];
  async function save(name, bytes) { await writeFile(new URL(name, destination), bytes); manifest.push({ name, byteLength: bytes.length }); return bytes; }
  const image = (width, height, background = '#719148') => sharp({ create: { width, height, channels: 4, background } });
  const base = await save('valid.png', await image(900, 600).png().toBuffer());
  await save('valid.jpg', await image(900, 600).jpeg().toBuffer());
  await save('valid.webp', await image(900, 600).webp().toBuffer());
  await save('renamed.jpg', base);
  await save('empty.png', Buffer.alloc(0));
  await save('corrupt.png', base.subarray(0, Math.floor(base.length / 2)));
  await save('alpha.png', await image(600, 600, { r: 113, g: 145, b: 72, alpha: 0.3 }).png().toBuffer());
  await save('exif.jpg', await image(900, 600).withMetadata({ orientation: 6 }).jpeg().toBuffer());
  for (const side of [599, 600, 6000, 6001]) {
    await save(`width-${side}.png`, await image(side, 600).png().toBuffer());
    await save(`height-${side}.png`, await image(600, side).png().toBuffer());
  }
  await save('maximum.png', await image(6000, 6000).png().toBuffer());
  for (const size of [5242879, 5242880, 5242881]) {
    const padding = pngChunk('npAD', Buffer.alloc(size - base.length - 12));
    await save(`bytes-${size}.png`, Buffer.concat([base.subarray(0, -12), padding, base.subarray(-12)]));
  }
  // APNG default image is frame zero; a single-frame animation is still rejected.
  const animation = Buffer.alloc(8); animation.writeUInt32BE(1);
  const frame = Buffer.alloc(26); frame.writeUInt32BE(900, 4); frame.writeUInt32BE(600, 8); frame.writeUInt16BE(1, 20); frame.writeUInt16BE(10, 22);
  await save('animated.png', Buffer.concat([base.subarray(0, 33), pngChunk('acTL', animation), pngChunk('fcTL', frame), base.subarray(33)]));
  await save('animated.webp', await sharp([await image(600, 600, '#719148').png().toBuffer(), await image(600, 600, '#18372c').png().toBuffer()], { join: { animated: true } }).webp({ loop: 0, delay: [100, 100] }).toBuffer());
  for (const [name, width, height] of [['horizontal', 1600, 900], ['vertical', 900, 1600], ['square', 900, 900]]) {
    const svg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="#e9eedf"/><path d="M0 0h${width}v${height}H0z" fill="none" stroke="#18372c" stroke-width="40"/><circle cx="${width / 2}" cy="${height / 2}" r="180" fill="#719148"/><path d="M${width / 2 - 40} ${height / 2}h80m-40 -40v80" stroke="#18372c" stroke-width="8"/></svg>`);
    await save(`${name}.png`, await sharp(svg).png().toBuffer());
  }
  await save('contrast-text.png', await sharp(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="900" height="600"><rect width="450" height="600" fill="black"/><rect x="450" width="450" height="600" fill="white"/><text x="450" y="300" text-anchor="middle" font-size="80" fill="#719148">TEXTO DE PRUEBA</text></svg>')).png().toBuffer());
  await save('white.png', await image(900, 600, '#ffffff').png().toBuffer());
  await save('black.png', await image(900, 600, '#000000').png().toBuffer());
  await writeFile(new URL('manifest.json', destination), JSON.stringify(manifest, null, 2) + '\n');
  return fileURLToPath(destination);
}
if (process.argv[1] === fileURLToPath(import.meta.url)) await generateFixtures();
