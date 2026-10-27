// Generador de códigos QR sin dependencias (modo bytes, corrección M, versiones 1 a 10: hasta ~210 caracteres).
// Devuelve una matriz de booleanos (true = módulo oscuro) o lanza un error si el texto no cabe.

// Por versión (1..10): [codewords de corrección por bloque, [bloques, datos por bloque], [bloques, datos por bloque]?]
const BLOQUES_M = [
  null,
  [10, [1, 16]], [16, [1, 28]], [26, [1, 44]], [18, [2, 32]], [24, [2, 43]],
  [16, [4, 27]], [18, [4, 31]], [22, [2, 38], [2, 39]], [22, [3, 36], [2, 37]], [26, [4, 43], [1, 44]],
];
const ALINEACION = [null, [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34], [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50]];

const datosTotales = (v) => BLOQUES_M[v].slice(1).reduce((s, [n, d]) => s + n * d, 0);
export const capacidadBytes = (v) => datosTotales(v) - (v < 10 ? 2 : 3);

// ── Aritmética de Reed-Solomon sobre GF(256), polinomio 0x11D ──
const EXP = new Array(512); const LOG = new Array(256);
(() => { let x = 1; for (let i = 0; i < 255; i++) { EXP[i] = x; LOG[x] = i; x <<= 1; if (x & 0x100) x ^= 0x11d; } for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255]; })();
const mul = (a, b) => (a === 0 || b === 0 ? 0 : EXP[LOG[a] + LOG[b]]);

function generador(grado) {
  let g = [1];
  for (let i = 0; i < grado; i++) {
    const sig = new Array(g.length + 1).fill(0);
    for (let j = 0; j < g.length; j++) { sig[j] ^= g[j]; sig[j + 1] ^= mul(g[j], EXP[i]); }
    g = sig;
  }
  return g;
}

function correccion(datos, grado) {
  const g = generador(grado);
  const resto = new Array(grado).fill(0);
  for (const b of datos) {
    const f = b ^ resto.shift();
    resto.push(0);
    if (f !== 0) for (let i = 0; i < grado; i++) resto[i] ^= mul(g[i + 1], f);
  }
  return resto;
}

function codewords(bytes, v) {
  const [ec, ...grupos] = BLOQUES_M[v];
  const total = datosTotales(v);
  const bits = [];
  const poner = (valor, n) => { for (let i = n - 1; i >= 0; i--) bits.push((valor >>> i) & 1); };
  poner(4, 4);
  poner(bytes.length, v < 10 ? 8 : 16);
  bytes.forEach((b) => poner(b, 8));
  poner(0, Math.min(4, total * 8 - bits.length));
  while (bits.length % 8) bits.push(0);
  const datos = [];
  for (let i = 0; i < bits.length; i += 8) datos.push(parseInt(bits.slice(i, i + 8).join(''), 2));
  for (let pad = 0xec; datos.length < total; pad ^= 0xec ^ 0x11) datos.push(pad);

  const bloques = [];
  let pos = 0;
  for (const [n, d] of grupos) for (let i = 0; i < n; i++) { bloques.push(datos.slice(pos, pos + d)); pos += d; }
  const ecs = bloques.map((b) => correccion(b, ec));
  const salida = [];
  const maxD = Math.max(...bloques.map((b) => b.length));
  for (let i = 0; i < maxD; i++) bloques.forEach((b) => { if (i < b.length) salida.push(b[i]); });
  for (let i = 0; i < ec; i++) ecs.forEach((e) => salida.push(e[i]));
  return salida;
}

const MASCARAS = [
  (x, y) => (x + y) % 2 === 0,
  (x, y) => y % 2 === 0,
  (x, y) => x % 3 === 0,
  (x, y) => (x + y) % 3 === 0,
  (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0,
  (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
  (x, y) => ((((x * y) % 2) + ((x * y) % 3)) % 2) === 0,
  (x, y) => ((((x + y) % 2) + ((x * y) % 3)) % 2) === 0,
];

function penalizacion(m) {
  const n = m.length; let p = 0;
  const lineas = [];
  for (let i = 0; i < n; i++) { lineas.push(m[i]); lineas.push(m.map((f) => f[i])); }
  for (const l of lineas) {
    let corrida = 1;
    for (let i = 1; i <= n; i++) {
      if (i < n && l[i] === l[i - 1]) corrida++;
      else { if (corrida >= 5) p += 3 + (corrida - 5); corrida = 1; }
    }
    const s = l.map((b) => (b ? '1' : '0')).join('');
    for (const pat of ['000010111010', '010111010000']) { let k = s.indexOf(pat); while (k !== -1) { p += 40; k = s.indexOf(pat, k + 1); } }
  }
  for (let y = 0; y < n - 1; y++) for (let x = 0; x < n - 1; x++) if (m[y][x] === m[y][x + 1] && m[y][x] === m[y + 1][x] && m[y][x] === m[y + 1][x + 1]) p += 3;
  const oscuros = m.reduce((s, f) => s + f.filter(Boolean).length, 0);
  p += Math.floor(Math.abs((oscuros * 100) / (n * n) - 50) / 5) * 10;
  return p;
}

export function generarQR(texto, mascaraForzada) {
  const bytes = Array.from(new TextEncoder().encode(String(texto)));
  let v = 1;
  while (v <= 10 && bytes.length > capacidadBytes(v)) v++;
  if (v > 10) throw new Error('El texto es demasiado largo para el código QR');
  const tam = 17 + 4 * v;
  const mod = Array.from({ length: tam }, () => new Array(tam).fill(false));
  const fun = Array.from({ length: tam }, () => new Array(tam).fill(false));
  const poner = (x, y, oscuro) => { if (x >= 0 && y >= 0 && x < tam && y < tam) { mod[y][x] = oscuro; fun[y][x] = true; } };

  for (let i = 0; i < tam; i++) { poner(6, i, i % 2 === 0); poner(i, 6, i % 2 === 0); }
  for (const [cx, cy] of [[3, 3], [tam - 4, 3], [3, tam - 4]]) {
    for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) { const d = Math.max(Math.abs(dx), Math.abs(dy)); poner(cx + dx, cy + dy, d !== 2 && d !== 4); }
  }
  const al = ALINEACION[v];
  for (let i = 0; i < al.length; i++) for (let j = 0; j < al.length; j++) {
    if ((i === 0 && j === 0) || (i === 0 && j === al.length - 1) || (i === al.length - 1 && j === 0)) continue;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) poner(al[i] + dx, al[j] + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
  }
  const formato = (mascara) => {
    const datos = mascara; // nivel M = 00
    let r = datos; for (let i = 0; i < 10; i++) r = (r << 1) ^ ((r >>> 9) * 0x537);
    const bits = ((datos << 10) | r) ^ 0x5412;
    const b = (i) => ((bits >>> i) & 1) !== 0;
    for (let i = 0; i <= 5; i++) poner(8, i, b(i));
    poner(8, 7, b(6)); poner(8, 8, b(7)); poner(7, 8, b(8));
    for (let i = 9; i < 15; i++) poner(14 - i, 8, b(i));
    for (let i = 0; i < 8; i++) poner(tam - 1 - i, 8, b(i));
    for (let i = 8; i < 15; i++) poner(8, tam - 15 + i, b(i));
    poner(8, tam - 8, true);
  };
  formato(0); // reserva el sitio; se reescribe al elegir la máscara
  if (v >= 7) {
    let r = v; for (let i = 0; i < 12; i++) r = (r << 1) ^ ((r >>> 11) * 0x1f25);
    const bits = (v << 12) | r;
    for (let i = 0; i < 18; i++) { const o = ((bits >>> i) & 1) !== 0; const a = tam - 11 + (i % 3); const b = Math.floor(i / 3); poner(a, b, o); poner(b, a, o); }
  }

  const datos = codewords(bytes, v);
  let k = 0;
  for (let derecha = tam - 1; derecha >= 1; derecha -= 2) {
    if (derecha === 6) derecha = 5;
    for (let vert = 0; vert < tam; vert++) for (let j = 0; j < 2; j++) {
      const x = derecha - j; const arriba = ((derecha + 1) & 2) === 0; const y = arriba ? tam - 1 - vert : vert;
      if (!fun[y][x] && k < datos.length * 8) { mod[y][x] = ((datos[k >>> 3] >>> (7 - (k & 7))) & 1) !== 0; k++; }
    }
  }

  let mejor = null; let mejorP = Infinity; let mejorM = 0;
  for (let mk = 0; mk < 8; mk++) {
    if (mascaraForzada !== undefined && mk !== mascaraForzada) continue;
    const copia = mod.map((f) => f.slice());
    for (let y = 0; y < tam; y++) for (let x = 0; x < tam; x++) if (!fun[y][x] && MASCARAS[mk](x, y)) copia[y][x] = !copia[y][x];
    const guardado = mod.map((f) => f.slice());
    for (let y = 0; y < tam; y++) mod[y] = copia[y];
    formato(mk);
    const p = penalizacion(mod);
    if (p < mejorP) { mejorP = p; mejor = mod.map((f) => f.slice()); mejorM = mk; }
    for (let y = 0; y < tam; y++) mod[y] = guardado[y];
  }
  void mejorM;
  return mejor;
}

// SVG listo para imprimir: fondo blanco, módulos negros y zona de silencio de 4 módulos.
export function qrComoSvg(texto, { escala = 8, borde = 4 } = {}) {
  const m = generarQR(texto);
  const t = m.length + borde * 2;
  let d = '';
  m.forEach((fila, y) => fila.forEach((o, x) => { if (o) d += `M${x + borde},${y + borde}h1v1h-1z`; }));
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${t} ${t}" width="${t * escala}" height="${t * escala}" shape-rendering="crispEdges"><rect width="${t}" height="${t}" fill="#fff"/><path d="${d}" fill="#000"/></svg>`;
}
