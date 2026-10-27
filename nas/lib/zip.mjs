// Escritor de ZIP en streaming, sin compresión (las fotos JPEG ya vienen comprimidas) y con memoria constante.
// Usa "data descriptor" (el CRC se calcula mientras se lee) y pasa a ZIP64 solo si el total supera ~4 GB.
import fs from 'node:fs';
import zlib from 'node:zlib';

const LIM32 = 0xFFFFFFFF;
export const UMBRAL_ZIP64 = 3.9 * 1024 ** 3;

function fechaDos(d) {
  const t = new Date(d);
  const año = Math.max(1980, t.getFullYear());
  return { hora: (t.getHours() << 11) | (t.getMinutes() << 5) | (t.getSeconds() >> 1), dia: ((año - 1980) << 9) | ((t.getMonth() + 1) << 5) | t.getDate() };
}
const u16 = (n) => { const b = Buffer.alloc(2); b.writeUInt16LE(n); return b; };
const u32 = (n) => { const b = Buffer.alloc(4); b.writeUInt32LE(n >>> 0); return b; };
const u64 = (n) => { const b = Buffer.alloc(8); b.writeBigUInt64LE(BigInt(n)); return b; };

// entradas: [{ nombre, ruta, size, mtimeMs }]. Devuelve un generador asíncrono de Buffers.
export async function* generarZip(entradas, { forzarZip64 = false } = {}) {
  const total = entradas.reduce((a, e) => a + e.size, 0);
  const z64 = forzarZip64 || total > UMBRAL_ZIP64 || entradas.length > 65534;
  let pos = 0;
  const central = [];
  for (const e of entradas) {
    const nombre = Buffer.from(e.nombre, 'utf8');
    const { hora, dia } = fechaDos(e.mtimeMs);
    const offset = pos;
    const extraLocal = z64 ? Buffer.concat([u16(1), u16(16), u64(0), u64(0)]) : Buffer.alloc(0);
    const cab = Buffer.concat([
      u32(0x04034b50), u16(z64 ? 45 : 20), u16(0x0808), u16(0), u16(hora), u16(dia),
      u32(0), u32(z64 ? LIM32 : 0), u32(z64 ? LIM32 : 0), u16(nombre.length), u16(extraLocal.length), nombre, extraLocal,
    ]);
    yield cab; pos += cab.length;
    let crc = 0, leidos = 0;
    for await (const trozo of fs.createReadStream(e.ruta, { highWaterMark: 256 * 1024 })) {
      crc = zlib.crc32(trozo, crc); leidos += trozo.length;
      yield trozo; pos += trozo.length;
    }
    if (leidos !== e.size) throw new Error(`el archivo cambió durante la descarga: ${e.nombre}`);
    const desc = z64
      ? Buffer.concat([u32(0x08074b50), u32(crc), u64(leidos), u64(leidos)])
      : Buffer.concat([u32(0x08074b50), u32(crc), u32(leidos), u32(leidos)]);
    yield desc; pos += desc.length;
    central.push({ nombre, hora, dia, crc, size: leidos, offset });
  }
  const iniCentral = pos;
  for (const c of central) {
    const extra = z64 ? Buffer.concat([u16(1), u16(24), u64(c.size), u64(c.size), u64(c.offset)]) : Buffer.alloc(0);
    const reg = Buffer.concat([
      u32(0x02014b50), u16(z64 ? 45 : 20), u16(z64 ? 45 : 20), u16(0x0808), u16(0), u16(c.hora), u16(c.dia),
      u32(c.crc), u32(z64 ? LIM32 : c.size), u32(z64 ? LIM32 : c.size), u16(c.nombre.length), u16(extra.length), u16(0), u16(0), u16(0), u32(0),
      u32(z64 ? LIM32 : c.offset), c.nombre, extra,
    ]);
    yield reg; pos += reg.length;
  }
  const tamCentral = pos - iniCentral;
  if (z64) {
    const eocd64 = Buffer.concat([u32(0x06064b50), u64(44), u16(45), u16(45), u32(0), u32(0), u64(central.length), u64(central.length), u64(tamCentral), u64(iniCentral)]);
    const loc = Buffer.concat([u32(0x07064b50), u32(0), u64(pos), u32(1)]);
    yield eocd64; yield loc;
  }
  yield Buffer.concat([u32(0x06054b50), u16(0), u16(0), u16(z64 ? 0xFFFF : central.length), u16(z64 ? 0xFFFF : central.length), u32(z64 ? LIM32 : tamCentral), u32(z64 ? LIM32 : iniCentral), u16(0)]);
}
