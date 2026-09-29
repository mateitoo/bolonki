// Menú principal: dos "puertas" grandes (FIESTA y MINIJUEGOS), abajo una fila chica (ONLINE, OPCIONES)
// y SALIR en la esquina. Se maneja con flechas/stick, ENTER/A y el mouse.
import { input } from '../input.js';
import { SFX } from '../audio.js';
import { ui, txt, rect, tri, textWidth, COL } from './draw.js';
import { drawThumb } from '../render/thumbStore.js';

// doors: [{ label, sub, thumb: () => id, action }] · row: [{ label, action }] · corner: { label, action }
export function doorsMenu({ doors, row, corner, onBack }) {
  // orden de selección: puertas, fila, esquina
  const all = [...doors.map((d) => ({ ...d, type: 'door' })), ...row.map((r) => ({ ...r, type: 'row' })), { ...corner, type: 'corner' }];
  const nD = doors.length, nR = row.length;
  let rects = [];

  function go(top, i) { if (i !== top.sel) { top.sel = i; SFX.move(); } }
  function nav(top, a) {
    const s = top.sel, it = all[s];
    if (a === 'up') {
      if (it.type === 'door') go(top, s > 0 ? s - 1 : nD + nR);
      else if (it.type === 'row') go(top, nD - 1);
      else go(top, nD);
    } else if (a === 'down') {
      if (it.type === 'door') go(top, s < nD - 1 ? s + 1 : nD);
      else if (it.type === 'row') go(top, nD + nR);
      else go(top, 0);
    } else if (a === 'left' || a === 'right') {
      if (it.type === 'row') go(top, nD + ((s - nD + (a === 'left' ? -1 : 1) + nR) % nR));
    }
  }
  const run = (it) => { SFX.confirm(); it.action(); };

  return {
    id: 'main', style: 'custom',
    input(top) {
      if (top.sel >= all.length) top.sel = 0;
      if (input.pointer.moved) {
        input.pointer.moved = false;
        const r = rects.find((q) => input.pointer.x >= q.x && input.pointer.x <= q.x + q.w && input.pointer.y >= q.y && input.pointer.y <= q.y + q.h);
        if (r) go(top, r.i);
      }
      for (const e of input.events) {
        if (e.a === 'up' || e.a === 'down' || e.a === 'left' || e.a === 'right') nav(top, e.a);
        else if (e.a === 'confirm' || e.a === 'start') { run(all[top.sel]); return; }
        else if (e.a === 'back') { SFX.back(); onBack(); return; }
        else if (e.a === 'click') {
          const r = rects.find((q) => e.x >= q.x && e.x <= q.x + q.w && e.y >= q.y && e.y <= q.y + q.h);
          if (r) { top.sel = r.i; run(all[r.i]); return; }
        }
      }
    },
    draw(hw, top) {
      rects = [];
      const bob = Math.sin(ui.clock * 2) * 2;
      txt('BOLONKI', hw / 2, 14 + bob, 32, COL.gold, 'center', COL.goldShadow);
      // puertas: barras anchas con la foto a la izquierda
      const w = Math.min(300, hw - 24), x = Math.round(hw / 2 - w / 2), h = 52;
      doors.forEach((d, k) => {
        const sel = top.sel === k, y = 58 + k * 60, jx = sel ? Math.round(Math.abs(Math.sin(ui.clock * 5)) * 2) : 0;
        rect(x + jx, y, w, h, sel ? 'rgba(10,14,30,.94)' : 'rgba(6,10,22,.82)');
        const bc = sel ? COL.gold : '#1d6e68', bw = sel ? 2 : 1;
        rect(x + jx, y, w, bw, bc); rect(x + jx, y + h - bw, w, bw, bc); rect(x + jx, y, bw, h, bc); rect(x + jx + w - bw, y, bw, h, bc);
        const tw = 72, th = 40;
        drawThumb(d.thumb(), x + jx + 7, y + 6, tw, th);
        const tx = x + jx + 7 + tw + 10;
        txt(d.label, tx, y + 10, 16, sel ? COL.white : COL.text, 'left', sel ? COL.goldShadow : undefined);
        txt(d.sub, tx, y + 33, 8, sel ? COL.teal : COL.dim);
        if (sel) tri(x + jx - 7, y + h / 2 - 4, 'r', COL.gold);
        rects.push({ i: k, x, y, w, h });
      });
      // fila chica
      const ry = 58 + nD * 60 + 8;
      const widths = row.map((r) => textWidth(r.label, 8) + 28);
      let rx = hw / 2 - (widths.reduce((a, b) => a + b, 0) + (nR - 1) * 12) / 2;
      row.forEach((r, k) => {
        const i = nD + k, sel = top.sel === i;
        rect(rx, ry, widths[k], 17, sel ? 'rgba(45,224,200,.18)' : 'rgba(6,10,22,.8)');
        if (sel) { rect(rx, ry + 16, widths[k], 1, COL.teal); tri(rx + 5, ry + 5, 'r', COL.teal); }
        txt(r.label, rx + 16, ry + 5, 8, sel ? COL.white : COL.text);
        rects.push({ i, x: rx, y: ry, w: widths[k], h: 17 });
        rx += widths[k] + 12;
      });
      // esquina (SALIR)
      const ci = nD + nR, sel = top.sel === ci, cx = 12, cy = 222, cw = textWidth(corner.label, 8) + 22;
      rect(cx, cy - 4, cw, 15, sel ? 'rgba(255,90,90,.18)' : 'rgba(6,10,22,.7)');
      if (sel) tri(cx + 4, cy, 'r', COL.red);
      txt(corner.label, cx + 14, cy, 8, sel ? COL.red : COL.dim);
      rects.push({ i: ci, x: cx, y: cy - 4, w: cw, h: 15 });
    },
  };
}
