// Fotos de cada minijuego para las vistas previas de los menús (las genera render/thumbs.js al arrancar).
import { ui, rect, COL } from '../ui/draw.js';

export const thumbs = {};   // id del minijuego -> canvas

// Dibuja la foto con un paneo lento (para que no quede quieta) y un marco
export function drawThumb(id, dx, dy, dw, dh) {
  const cv = thumbs[id];
  rect(dx - 1, dy - 1, dw + 2, dh + 2, COL.teal);
  if (!cv) { rect(dx, dy, dw, dh, '#0b1020'); return; }
  const c = ui.ctx, t = ui.clock || 0;
  const sw = cv.width * 0.84, sh = cv.height * 0.84;
  const sx = (cv.width - sw) * (0.5 + 0.5 * Math.sin(t * 0.35));
  const sy = (cv.height - sh) * (0.5 + 0.5 * Math.cos(t * 0.27));
  c.imageSmoothingEnabled = true;
  c.drawImage(cv, sx, sy, sw, sh, dx, dy, dw, dh);
  c.imageSmoothingEnabled = false;
}
