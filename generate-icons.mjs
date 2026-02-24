import { writeFileSync, mkdirSync } from 'fs';
import { deflateSync } from 'zlib';

function createPng(size) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  function crc32(buf) {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      c ^= buf[i];
      for (let j = 0; j < 8; j++) c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
    }
    return (c ^ 0xffffffff) >>> 0;
  }

  function makeChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(td));
    return Buffer.concat([len, td, crc]);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;

  const raw = [];
  const cx = size / 2, cy = size / 2, radius = size * 0.4, cr = size * 0.18;

  for (let y = 0; y < size; y++) {
    raw.push(0);
    for (let x = 0; x < size; x++) {
      const dx = Math.abs(x - cx), dy = Math.abs(y - cy);
      let inside = false;
      if (dx <= radius && dy <= radius) {
        if (dx <= radius - cr || dy <= radius - cr) inside = true;
        else {
          const ex = dx - (radius - cr), ey = dy - (radius - cr);
          inside = ex * ex + ey * ey <= cr * cr;
        }
      }
      raw.push(...(inside ? [66, 133, 244, 255] : [0, 0, 0, 0]));
    }
  }

  return Buffer.concat([
    signature,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', deflateSync(Buffer.from(raw))),
    makeChunk('IEND', Buffer.alloc(0)),
  ]);
}

mkdirSync('icons', { recursive: true });
for (const s of [16, 48, 128]) {
  const png = createPng(s);
  writeFileSync(`icons/icon${s}.png`, png);
  console.log(`icon${s}.png: ${png.length} bytes`);
}
