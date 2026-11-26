import sharp from 'sharp';
import { EventCoverError, MAX_COVER_BYTES, MAX_CANONICAL_BYTES } from './event-covers.ts';
export type ProcessedCover = { bytes: Uint8Array; width: number; height: number };
const invalid = () => new EventCoverError(422, 'La imagen debe ser estática, legible y medir entre 600 y 6000 px por lado.');
let processing = false;
/** Inspect real chunk boundaries, not occurrences in compressed pixel data. */
function assertStaticContainer(input: Buffer) {
  if (input.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) {
    let end = false;
    for (let offset = 8; offset < input.length;) {
      if (offset + 12 > input.length) throw invalid();
      const length = input.readUInt32BE(offset), type = input.toString('ascii', offset+4, offset+8);
      if (length > input.length - offset - 12) throw invalid();
      if (['acTL', 'fcTL', 'fdAT'].includes(type)) throw invalid();
      offset += length + 12;
      if (type === 'IEND') { end = true; if (offset !== input.length) throw invalid(); break; }
    }
    if (!end) throw invalid();
    return;
  }
  if (input.toString('ascii',0,4) === 'RIFF' && input.toString('ascii',8,12) === 'WEBP') {
    if (input.length < 12 || input.readUInt32LE(4) + 8 !== input.length) throw invalid();
    for (let offset = 12; offset < input.length;) {
      if (offset + 8 > input.length) throw invalid();
      const type = input.toString('ascii', offset, offset+4), length = input.readUInt32LE(offset+4);
      if (length > input.length - offset - 8) throw invalid();
      if (['ANIM','ANMF'].includes(type) || (type === 'VP8X' && length >= 1 && (input[offset+8] & 2))) throw invalid();
      offset += 8 + length + (length % 2);
      if (offset > input.length) throw invalid();
    }
    return;
  }
  if (input.length >= 3 && input[0] === 255 && input[1] === 216 && input[2] === 255) return;
  throw new EventCoverError(415, 'Usa una imagen JPEG, PNG o WebP estática.');
}
/** One decoder per process; reject excess work for an explicit retry, not an unbounded queue. */
export async function processCoverImage(bytes: Uint8Array): Promise<ProcessedCover> {
  if (bytes.byteLength > MAX_COVER_BYTES) throw new EventCoverError(413, 'La imagen puede pesar como máximo 5 MiB.');
  if (!bytes.byteLength) throw invalid();
  if (processing) throw new EventCoverError(503, 'Estamos revisando otra imagen. Vuelve a intentarlo.');
  processing = true;
  try {
    const input = Buffer.from(bytes);
    assertStaticContainer(input);
    let decoded;
    try {
      const source = sharp(input, { failOn: 'warning', limitInputPixels: 36_000_000, sequentialRead: true });
      const metadata = await source.metadata();
      if (!['jpeg','png','webp'].includes(metadata.format ?? '') || (metadata.pages ?? 1) > 1) throw invalid();
      const oriented = metadata.autoOrient ?? metadata;
      if (!oriented.width || !oriented.height || oriented.width < 600 || oriented.height < 600 || oriented.width > 6000 || oriented.height > 6000) throw invalid();
      // Decode every original pixel before resizing; headers alone are insufficient.
      decoded = await source.autoOrient().toColourspace('srgb').raw().toBuffer({ resolveWithObject: true });
    } catch (error) {
      if (error instanceof EventCoverError) throw error;
      if (error instanceof Error && /memory|alloc|unable to create|system error/i.test(error.message)) {
        throw new EventCoverError(503, 'No pudimos procesar la portada. Vuelve a intentarlo.');
      }
      throw invalid();
    }
    try {
      let output;
      for (const quality of [85, 75, 60]) {
        output = await sharp(decoded.data, { raw: decoded.info }).resize({ width: 2400, height: 2400, fit: 'inside', withoutEnlargement: true }).webp({ quality }).toBuffer({ resolveWithObject: true });
        if (output.data.length <= 8 * 1024 * 1024) break;
      }
      if (!output || output.data.length > MAX_CANONICAL_BYTES) throw new Error('Canonical output unavailable');
      return { bytes: output.data, width: output.info.width, height: output.info.height };
    } catch { throw new EventCoverError(503, 'No pudimos procesar la portada. Vuelve a intentarlo.'); }
  } finally { processing = false; }
}
