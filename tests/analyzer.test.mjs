import test from 'node:test';
import assert from 'node:assert/strict';
import { parseTiff, findLargestJpeg, RAW_EXTENSIONS } from '../site/src/analyzer.js';

function tiffFixture() {
  const make = new TextEncoder().encode('SONY\0'); const model = new TextEncoder().encode('ILCE-6700\0');
  const dataOffset = 8 + 2 + 3 * 12 + 4; const bytes = new Uint8Array(dataOffset + make.length + model.length);
  const view = new DataView(bytes.buffer); bytes.set([0x49,0x49,42,0,8,0,0,0]); view.setUint16(8,3,true);
  const entry = (at, tag, type, count, value) => { view.setUint16(at,tag,true); view.setUint16(at+2,type,true); view.setUint32(at+4,count,true); if(type===3&&count===1)view.setUint16(at+8,value,true);else view.setUint32(at+8,value,true); };
  entry(10,271,2,make.length,dataOffset); entry(22,272,2,model.length,dataOffset+make.length); entry(34,259,3,1,7);
  bytes.set(make,dataOffset); bytes.set(model,dataOffset+make.length); return bytes;
}

test('documented camera IDs are read from TIFF IFD0', () => { const meta=parseTiff(tiffFixture()); assert.equal(meta.container,'TIFF-based RAW'); assert.equal(meta.make,'SONY'); assert.equal(meta.model,'ILCE-6700'); assert.equal(meta.compression,7); });
test('jpeg scanner selects the largest valid candidate', () => { const jpeg=new Uint8Array([0xff,0xd8,0xff,0xc0,0,11,8,0,2,0,3,3,1,0x11,0,0xff,0xd9]); const bytes=new Uint8Array(30); bytes.set(jpeg,6); assert.deepEqual(findLargestJpeg(bytes),{start:6,end:23,width:3,height:2}); });
test('supported quick-check extensions include common camera families', () => { for(const ext of ['nef','arw','cr2','cr3','dng','orf','raf','rw2']) assert.ok(RAW_EXTENSIONS.includes(ext)); });
