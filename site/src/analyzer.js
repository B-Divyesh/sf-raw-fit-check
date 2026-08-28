export const RAW_EXTENSIONS = ['nef','arw','cr2','cr3','dng','orf','raf','rw2','pef','srw','raw'];

const read16 = (view, at, little) => at + 2 <= view.byteLength ? view.getUint16(at, little) : null;
const read32 = (view, at, little) => at + 4 <= view.byteLength ? view.getUint32(at, little) : null;

function asciiValue(bytes, view, entry, type, count, little) {
  if (type !== 2 || count < 1) return null;
  const start = count <= 4 ? entry + 8 : read32(view, entry + 8, little);
  if (start == null || start + count > bytes.length) return null;
  return new TextDecoder('ascii').decode(bytes.subarray(start, start + count)).replaceAll('\0', '').trim() || null;
}

export function parseTiff(bytes) {
  const output = { container: 'Unknown container', make: null, model: null, compression: null, dngVersion: null };
  if (bytes.length >= 12 && String.fromCharCode(...bytes.subarray(4, 8)) === 'ftyp') {
    output.container = `ISO BMFF (${String.fromCharCode(...bytes.subarray(8, 12))})`;
    return output;
  }
  if (bytes.length < 8) return output;
  const little = bytes[0] === 0x49 && bytes[1] === 0x49;
  const big = bytes[0] === 0x4d && bytes[1] === 0x4d;
  if (!little && !big) return output;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (read16(view, 2, little) !== 42) return output;
  output.container = 'TIFF-based RAW';
  const visited = new Set();
  const parseIfd = (offset, depth = 0) => {
    if (depth > 5 || visited.has(offset) || offset + 2 > bytes.length) return;
    visited.add(offset);
    const count = read16(view, offset, little);
    if (count == null || count > 4096) return;
    for (let n = 0; n < count; n++) {
      const entry = offset + 2 + n * 12;
      if (entry + 12 > bytes.length) break;
      const tag = read16(view, entry, little), type = read16(view, entry + 2, little), amount = read32(view, entry + 4, little);
      if (tag === 271) output.make ||= asciiValue(bytes, view, entry, type, amount, little);
      if (tag === 272) output.model ||= asciiValue(bytes, view, entry, type, amount, little);
      if (tag === 259 && amount > 0) output.compression ||= type === 3 ? read16(view, entry + 8, little) : read32(view, entry + 8, little);
      if (tag === 50706 && amount <= 4) output.dngVersion = [...bytes.subarray(entry + 8, entry + 8 + amount)].join('.');
      if ((tag === 330 || tag === 34665) && amount > 0) {
        const next = type === 3 ? read16(view, entry + 8, little) : read32(view, entry + 8, little);
        if (next) parseIfd(next, depth + 1);
      }
    }
  };
  parseIfd(read32(view, 4, little));
  return output;
}

function jpegDimensions(bytes) {
  let i = 2;
  while (i + 8 < bytes.length) {
    if (bytes[i] !== 0xff) { i++; continue; }
    const marker = bytes[i + 1]; i += 2;
    if (marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    if (i + 2 > bytes.length) return null;
    const length = (bytes[i] << 8) | bytes[i + 1];
    if (length < 2 || i + length > bytes.length) return null;
    const isSof = (marker >= 0xc0 && marker <= 0xc3) || (marker >= 0xc5 && marker <= 0xc7) || (marker >= 0xc9 && marker <= 0xcb) || (marker >= 0xcd && marker <= 0xcf);
    if (isSof && length >= 7) return { width: (bytes[i + 5] << 8) | bytes[i + 6], height: (bytes[i + 3] << 8) | bytes[i + 4] };
    i += length;
  }
  return null;
}

export function findLargestJpeg(bytes) {
  let best = null;
  for (let i = 0; i + 3 < bytes.length; i++) {
    if (bytes[i] !== 0xff || bytes[i + 1] !== 0xd8) continue;
    let end = i + 2;
    while (end + 1 < bytes.length && !(bytes[end] === 0xff && bytes[end + 1] === 0xd9)) end++;
    if (end + 1 >= bytes.length) continue;
    end += 2;
    const dimensions = jpegDimensions(bytes.subarray(i, end));
    if (dimensions && (!best || dimensions.width * dimensions.height > best.width * best.height)) best = { start: i, end, ...dimensions };
    i = end - 1;
  }
  return best;
}

export async function inspectRawFile(file) {
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (!RAW_EXTENSIONS.includes(extension)) throw new Error('Choose a supported camera RAW extension, not a rendered image or sidecar.');
  if (file.size > 512 * 1024 * 1024) throw new Error('This browser quick check is limited to 512 MB per file. Use the CLI for this sample.');
  const started = performance.now();
  const bytes = new Uint8Array(await file.arrayBuffer());
  const metadata = parseTiff(bytes);
  const preview = findLargestJpeg(bytes);
  let decodeMs = null;
  if (preview) {
    const blob = new Blob([bytes.subarray(preview.start, preview.end)], { type: 'image/jpeg' });
    const decodeStart = performance.now();
    try { const bitmap = await createImageBitmap(blob); bitmap.close(); decodeMs = performance.now() - decodeStart; } catch { throw new Error('An embedded JPEG was found, but this browser could not decode it. Try the CLI for more detail.'); }
  }
  return { name: file.name, size: file.size, extension, ...metadata, preview, decodeMs, scanMs: performance.now() - started, verdict: preview ? 'preview-only' : 'unsupported' };
}
