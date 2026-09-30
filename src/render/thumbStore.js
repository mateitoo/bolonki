// Fotos de cada minijuego para las vistas previas de los menús (las genera render/thumbs.js al arrancar).
// Se dibujan NÍTIDAS: el HUD es de 240 líneas (todo pixelado a propósito), así que las fotos van en otra capa
// (#hires) del tamaño real de la pantalla, encima del HUD. drawThumb deja el marco en el HUD y anota la foto;
// flushThumbs (al final de cada cuadro del HUD) las pinta en esa capa.
import { ui, rect, COL, PX } from '../ui/draw.js';
import { view } from '../display.js';

export const thumbs = {};   // id del minijuego -> canvas
const queue = [];
const ACC = { 'Á': ['A', 'a'], 'É': ['E', 'a'], 'Í': ['I', 'a'], 'Ó': ['O', 'a'], 'Ú': ['U', 'a'], 'Ñ': ['N', 't'], 'Ü': ['U', 'd'] };
const ACC_PIX = { a: [[4, 0], [5, 0], [3, 1], [4, 1]], t: [[2, 0], [3, 0], [6, 0], [1, 1], [4, 1], [5, 1]], d: [[1, 1], [2, 1], [5, 1], [6, 1]] };
let hires = null;

// Dibuja la foto con un paneo lento (para que no quede quieta) y un marco. dim: más oscura (no elegida)
export function drawThumb(id, dx, dy, dw, dh, dim) {
  const cv = thumbs[id];
  rect(dx - 1, dy - 1, dw + 2, dh + 2, COL.teal);
  if (!cv) { rect(dx, dy, dw, dh, '#0b1020'); return; }
  const t = ui.clock || 0;
  const sw = cv.width * 0.88, sh = cv.height * 0.88;
  const sx = (cv.width - sw) * (0.5 + 0.5 * Math.sin(t * 0.35));
  const sy = (cv.height - sh) * (0.5 + 0.5 * Math.cos(t * 0.27));
  rect(dx, dy, dw, dh, '#0b1020');
  queue.push({ cv, sx, sy, sw, sh, dx, dy, dw, dh, dim });
}
// Texto nítido y más chico que la fuente del HUD (la barra de teclas de abajo): va en la misma capa
export function hiTxt(s, x, y, size, col, align) { queue.push({ text: s, x, y, size, col, align: align || 'left' }); }
// Una imagen cualquiera (retrato de personaje) en la capa nítida
export function hiImage(cv, dx, dy, dw, dh) { if (cv) queue.push({ cv, sx: 0, sy: 0, sw: cv.width, sh: cv.height, dx, dy, dw, dh }); }
export function beginThumbs() { queue.length = 0; }
export function flushThumbs() {
  if (!hires) { hires = document.getElementById('hires'); if (!hires) return; }
  const r = hires.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
  const W = Math.max(1, Math.round(r.width * dpr)), H = Math.max(1, Math.round(r.height * dpr));
  if (hires.width !== W || hires.height !== H) { hires.width = W; hires.height = H; }
  const c = hires.getContext('2d');
  c.clearRect(0, 0, W, H);
  if (!queue.length) return;
  const k = W / view.hw;
  c.imageSmoothingEnabled = true;
  for (const q of queue) {
    if (q.text !== undefined) {
      // la fuente trae las mayúsculas con tilde achicadas: se escribe la letra común y la tilde se dibuja aparte
      const fs = Math.round(q.size * k), u = fs / 8;
      let base = '';
      const acc = [];
      [...q.text].forEach((ch, i) => { const a = ACC[ch]; if (a) { base += a[0]; acc.push([i, a[1]]); } else base += ch; });
      c.font = `${fs}px ${PX}`; c.textAlign = q.align; c.textBaseline = 'top'; c.fillStyle = q.col;
      const X = Math.round(q.x * k), Y = Math.round(q.y * k);
      c.fillText(base, X, Y);
      if (acc.length) {
        const w = c.measureText(base).width, x0 = q.align === 'center' ? X - w / 2 : q.align === 'right' ? X - w : X;
        acc.forEach(([i, t]) => ACC_PIX[t].forEach(([cx, cy]) => c.fillRect(x0 + i * fs + cx * u, Y - 3 * u + cy * u, Math.ceil(u), Math.ceil(u))));
      }
      continue;
    }
    c.drawImage(q.cv, q.sx, q.sy, q.sw, q.sh, q.dx * k, q.dy * k, q.dw * k, q.dh * k);
    if (q.dim) { c.fillStyle = 'rgba(4,6,14,.5)'; c.fillRect(q.dx * k, q.dy * k, q.dw * k, q.dh * k); }
  }
}
