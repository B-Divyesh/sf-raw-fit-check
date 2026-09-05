import { readFile, writeFile, mkdir } from 'node:fs/promises';

const jpegPath = process.argv[2];
if (!jpegPath) throw new Error('Pass a generated JPEG path.');
const jpeg = await readFile(jpegPath);
const make = Buffer.from('SONY\0');
const model = Buffer.from('ILCE-6700\0');
const ifdOffset = 8;
const entries = 3;
const dataOffset = ifdOffset + 2 + entries * 12 + 4;
const raw = Buffer.alloc(dataOffset + make.length + model.length + jpeg.length);
raw.set([0x49, 0x49, 42, 0, 8, 0, 0, 0]);
raw.writeUInt16LE(entries, ifdOffset);
const entry = (at, tag, type, count, value) => {
  raw.writeUInt16LE(tag, at); raw.writeUInt16LE(type, at + 2);
  raw.writeUInt32LE(count, at + 4); raw.writeUInt32LE(value, at + 8);
};
entry(10, 271, 2, make.length, dataOffset);
entry(22, 272, 2, model.length, dataOffset + make.length);
entry(34, 259, 3, 1, 7);
make.copy(raw, dataOffset); model.copy(raw, dataOffset + make.length); jpeg.copy(raw, dataOffset + make.length + model.length);
for (const path of ['examples/sony-ilce-6700-sample.ARW', 'site/public/examples/sony-ilce-6700-sample.ARW']) {
  await mkdir(path.slice(0, path.lastIndexOf('/')), { recursive: true });
  await writeFile(path, raw);
}
