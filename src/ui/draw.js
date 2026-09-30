// Utilidades de dibujo 2D para el HUD y los menús (fuente pixel, sombras duras).
export const PX = "'Press Start 2P', monospace";
export const COL = {
  gold: '#ff9a1f', goldShadow: '#3a1200', teal: '#2de0c8', white: '#ffffff',
  dim: '#7a84a8', text: '#aab4d6', red: '#ff5a5a', panel: 'rgba(6,10,22,.88)', dark: 'rgba(4,6,14,.62)',
};

export const ui = { ctx: null };

// Texto con sombra solo abajo a la derecha, sin contorno y SIN suavizado: el navegador dibuja las letras con bordes
// semitransparentes que, agrandados al tamaño de la pantalla, se ven como un contorno sucio. Por eso cada texto se
// dibuja una vez en un canvas aparte, se pasa a píxeles llenos o vacíos (nítidos) y se guarda para los cuadros siguientes.
const glyphCache = new Map();
const colCache = new Map();
let scratch = null;
// si la fuente termina de cargar después, se rehacen los textos guardados (si no, quedarían con la fuente de repuesto)
try { document.fonts.addEventListener('loadingdone', () => glyphCache.clear()); document.fonts.ready.then(() => glyphCache.clear()); } catch (e) { /* nada */ }
function parseCol(col) {
  let c = colCache.get(col);
  if (c) return c;
  if (!scratch) { scratch = document.createElement('canvas'); scratch.width = scratch.height = 1; }
  const x = scratch.getContext('2d', { willReadFrequently: true });
  x.clearRect(0, 0, 1, 1); x.fillStyle = col; x.fillRect(0, 0, 1, 1);
  const d = x.getImageData(0, 0, 1, 1).data;
  c = [d[0], d[1], d[2], d[3]]; colCache.set(col, c);
  return c;
}
// La fuente trae las mayúsculas con tilde achicadas (la É parece una é): se dibuja la letra común y el acento aparte
const ACC = { 'Á': ['A', 'a'], 'É': ['E', 'a'], 'Í': ['I', 'a'], 'Ó': ['O', 'a'], 'Ú': ['U', 'a'], 'Ñ': ['N', 't'], 'Ü': ['U', 'd'] };
const ACC_PIX = {                    // [columna, fila] en la grilla de 8 de la letra; fila 0 = la de más arriba del acento
  a: [[4, 0], [5, 0], [3, 1], [4, 1]],
  t: [[2, 0], [3, 0], [6, 0], [1, 1], [4, 1], [5, 1]],
  d: [[1, 1], [2, 1], [5, 1], [6, 1]],
};
function crispText(s, size, col) {
  const key = size + '|' + col + '|' + s;
  let cv = glyphCache.get(key);
  if (cv) return cv;
  if (glyphCache.size > 1500) glyphCache.clear();
  const accents = [];
  let base = '';
  [...s].forEach((ch, k) => { const a = ACC[ch]; if (a) { base += a[0]; accents.push([k, a[1]]); } else base += ch; });
  // se dibuja 4 veces más grande, se busca dónde caen los bordes de los "píxeles" de la fuente y se toma el centro
  // de cada uno: así cada píxel de la letra queda lleno o vacío, sin medios tonos
  const K = 4, u = Math.max(1, Math.round(size / 8)), T = 3 * u + 1, m = ui.ctx; m.font = `${size}px ${PX}`;
  const w = Math.max(1, Math.ceil(m.measureText(base).width) + 3), h = Math.ceil(size * 1.4) + T + 2;
  const big = document.createElement('canvas'); big.width = w * K; big.height = h * K;
  const bx = big.getContext('2d', { willReadFrequently: true });
  bx.font = `${size * K}px ${PX}`; bx.textBaseline = 'top'; bx.textAlign = 'left'; bx.fillStyle = '#fff';
  bx.fillText(base, K, T * K);
  const BW = w * K, BH = h * K, bd = bx.getImageData(0, 0, BW, BH).data;
  let x0 = -1, y0 = -1;
  for (let y = 0; y < BH && y0 < 0; y++) for (let x = 0; x < BW; x++) if (bd[(y * BW + x) * 4 + 3] > 128) { y0 = y; break; }
  for (let x = 0; x < BW && x0 < 0; x++) for (let y = 0; y < BH; y++) if (bd[(y * BW + x) * 4 + 3] > 128) { x0 = x; break; }
  const px = x0 < 0 ? 0 : x0 % K, py = y0 < 0 ? 0 : y0 % K;
  cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const x = cv.getContext('2d'), img = x.createImageData(w, h), d = img.data, [r, g, b, a] = parseCol(col);
  const put = (i, j) => { if (i < 0 || j < 0 || i >= w || j >= h) return; const o = (j * w + i) * 4; d[o] = r; d[o + 1] = g; d[o + 2] = b; d[o + 3] = a; };
  for (let j = 0; j < h; j++) {
    const sy = py + j * K + (K >> 1); if (sy >= BH) break;
    for (let i = 0; i < w; i++) {
      const sx = px + i * K + (K >> 1); if (sx >= BW) break;
      if (bd[(sy * BW + sx) * 4 + 3] > 128) put(i, j);
    }
  }
  if (accents.length && y0 >= 0) {
    const i0 = Math.round((K - px) / K), top = Math.round((y0 - py) / K);     // primera fila con tinta (arriba de las mayúsculas)
    accents.forEach(([k, t]) => ACC_PIX[t].forEach(([cx, cy]) => {
      for (let a2 = 0; a2 < u; a2++) for (let b2 = 0; b2 < u; b2++) put(i0 + k * size + cx * u + a2, top - 3 * u + cy * u + b2);
    }));
  }
  x.putImageData(img, 0, 0);
  cv.T = T;
  glyphCache.set(key, cv);
  return cv;
}
export function txt(s, x, y, size, col, align, shadow) {
  const c = ui.ctx;
  s = String(s);
  c.font = `${size}px ${PX}`;
  let lx = x;
  if (align === 'center' || align === 'right') { const w = c.measureText(s).width; lx = align === 'center' ? x - w / 2 : x - w; }
  lx = Math.round(lx); y = Math.round(y);
  const o = size >= 16 ? 2 : 1;
  const main = crispText(s, size, col), T = main.T;
  if (shadow !== 'rgba(0,0,0,0)') c.drawImage(crispText(s, size, shadow || 'rgba(0,0,0,.7)'), lx - 1 + o, y - T + o);
  c.drawImage(main, lx - 1, y - T);
}

export function rect(x, y, w, h, col) { ui.ctx.fillStyle = col; ui.ctx.fillRect(x, y, w, h); }

// Panel con borde y esquinas marcadas
export function panel(x, y, w, h) {
  rect(x, y, w, h, COL.panel);
  rect(x, y, w, 1, '#1d6e68'); rect(x, y + h - 1, w, 1, '#1d6e68');
  rect(x, y, 1, h, '#1d6e68'); rect(x + w - 1, y, 1, h, '#1d6e68');
  const k = 5;
  [[x, y], [x + w - k, y], [x, y + h - 2], [x + w - k, y + h - 2]].forEach(([a, b]) => rect(a, b, k, 2, COL.teal));
  [[x, y], [x + w - 2, y], [x, y + h - k], [x + w - 2, y + h - k]].forEach(([a, b]) => rect(a, b, 2, k, COL.teal));
}

// Triángulo pixel (la fuente no trae flechas): dir = 'l' | 'r' | 'd'
export function tri(x, y, dir, col) {
  const c = ui.ctx; c.fillStyle = col;
  for (let i = 0; i < 4; i++) {
    if (dir === 'r') c.fillRect(x + i, y + i, 1, 8 - i * 2);
    else if (dir === 'l') c.fillRect(x + 3 - i, y + i, 1, 8 - i * 2);
    else c.fillRect(x + i, y + i, 8 - i * 2, 1);
  }
}
export function textWidth(s, size) { ui.ctx.font = `${size}px ${PX}`; return ui.ctx.measureText(s).width; }

// Texto que tiene que entrar en un ancho: si no entra con la letra normal, se escribe más chico (en la capa nítida)
// y, si igual no entra, se corta. hiTxt se pasa desde afuera para no mezclar imports (la capa nítida está en render/)
export function fitTxt(s, x, y, maxW, col, align, hiTxt) {
  s = String(s);
  const w = textWidth(s, 8);
  if (w <= maxW || !hiTxt) { txt(s, x, y, 8, col, align); return; }
  const size = Math.max(5, (8 * maxW) / w);
  let t = s;
  while (t.length > 2 && (textWidth(t, 8) * size) / 8 > maxW) t = t.slice(0, -1);
  if (t !== s) t = t.slice(0, -1) + '.';
  const tw = (textWidth(t, 8) * size) / 8, lx = align === 'center' ? x - tw / 2 : align === 'right' ? x - tw : x;
  const dy = (8 - size) / 2;
  hiTxt(t, lx + 0.5, y + dy + 0.5, size, 'rgba(0,0,0,.75)');
  hiTxt(t, lx, y + dy, size, col);
}
