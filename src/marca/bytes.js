// Tamaños legibles en español: 850 MB, 12,4 GB, 1,2 TB (base 1024, igual que las cuotas).
export function formatoBytes(n) {
  const v = Number(n);
  if (!Number.isFinite(v) || v < 0) return '—';
  const unidades = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0, x = v;
  while (x >= 1024 && i < unidades.length - 1) { x /= 1024; i++; }
  const dec = i >= 3 && x < 100 ? 1 : 0; // GB y TB con un decimal
  return `${x.toFixed(dec).replace('.', ',')} ${unidades[i]}`;
}
