// Utilidades de dibujo 2D para el HUD y los menús (fuente pixel, sombras duras).
export const PX = "'Press Start 2P', monospace";
export const COL = {
  gold: '#ff9a1f', goldShadow: '#3a1200', teal: '#2de0c8', white: '#ffffff',
  dim: '#7a84a8', text: '#aab4d6', red: '#ff5a5a', panel: 'rgba(6,10,22,.88)', dark: 'rgba(4,6,14,.62)',
};

export const ui = { ctx: null };

// Texto con sombra solo abajo a la derecha (sin contorno). Se ubica en píxeles enteros: la fuente pixel queda nítida
export function txt(s, x, y, size, col, align, shadow) {
  const c = ui.ctx;
  c.font = `${size}px ${PX}`; c.textAlign = 'left'; c.textBaseline = 'top';
  let lx = x;
  if (align === 'center' || align === 'right') { const w = c.measureText(s).width; lx = align === 'center' ? x - w / 2 : x - w; }
  lx = Math.round(lx); y = Math.round(y);
  const o = size >= 16 ? 2 : 1;
  c.fillStyle = shadow || 'rgba(0,0,0,.75)'; c.fillText(s, lx + o, y + o);
  c.fillStyle = col; c.fillText(s, lx, y);
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
