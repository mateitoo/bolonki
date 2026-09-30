// Menú principal: dos "puertas" grandes (FIESTA y MINIJUEGOS), abajo una fila chica (ONLINE, OPCIONES)
// SALIR en la esquina de abajo a la izquierda y el botón de sonido en la de abajo a la derecha. Se maneja con flechas/stick, ENTER/A y el mouse.
import { input } from '../input.js';
import { SFX } from '../audio.js';
import { ui, txt, rect, tri, textWidth, COL, drawLogo, fitTxt } from './draw.js';
import { hiTxt } from '../render/thumbStore.js';

const VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '';
import { drawThumb } from '../render/thumbStore.js';

// doors: [{ label, sub, thumb: () => id, action }] · row: [{ label, action }] · corner: { label, action }
export function doorsMenu({ doors, row, corner, sound, onBack }) {
  // orden de selección: puertas, fila, esquina
  const all = [...doors.map((d) => ({ ...d, type: 'door' })), ...row.map((r) => ({ ...r, type: 'row' })), { ...corner, type: 'corner' }, { type: 'sound', action: () => sound.toggle() }];
  const nD = doors.length, nR = row.length;
  let rects = [];

  function go(top, i) { if (i !== top.sel) { top.sel = i; SFX.move(); } }
  // pantalla ancha: una sola lista vertical (puertas y fila), SALIR y sonido abajo
  function navWide(top, a) {
    const s = top.sel, it = all[s], nL = nD + nR;
    if (a === 'up') go(top, it.type === 'corner' || it.type === 'sound' ? nL - 1 : (s - 1 + nL) % nL);
    else if (a === 'down') go(top, it.type === 'corner' || it.type === 'sound' ? 0 : s === nL - 1 ? nL : s + 1);
    else if ((a === 'left' || a === 'right') && (it.type === 'corner' || it.type === 'sound')) go(top, it.type === 'corner' ? nL + 1 : nL);
  }
  let wide = false;
  function nav(top, a) {
    if (wide) { navWide(top, a); return; }
    const s = top.sel, it = all[s];
    if (a === 'up') {
      if (it.type === 'door') go(top, s > 0 ? s - 1 : nD + nR);
      else if (it.type === 'row') go(top, nD - 1);
      else if (it.type === 'sound') go(top, nD + nR - 1);
      else go(top, nD);
    } else if (a === 'down') {
      if (it.type === 'door') go(top, s < nD - 1 ? s + 1 : nD);
      else if (it.type === 'row') go(top, nD + nR);
      else go(top, 0);
    } else if (a === 'left' || a === 'right') {
      if (it.type === 'row') go(top, nD + ((s - nD + (a === 'left' ? -1 : 1) + nR) % nR));
      else if (it.type === 'corner' || it.type === 'sound') go(top, it.type === 'corner' ? nD + nR + 1 : nD + nR);
    }
  }
  const run = (it) => { it.action(); SFX.confirm(); };

  function drawSound(hw, cy, top) {
      // esquina de abajo a la derecha: sonido (parlante; con ondas si suena, con una X si está muteado)
      const si = nD + nR + 1, ssel = top.sel === si, on = sound.on(), sw = 20, sx = hw - 6 - sw, sy = cy - 3;
      rect(sx, sy, sw, 12, ssel ? 'rgba(45,224,200,.2)' : 'rgba(6,10,22,.7)');
      if (ssel) rect(sx, sy + 11, sw, 1, COL.teal);
      const c = ssel ? COL.white : on ? COL.text : COL.dim, px = sx + 4, py = sy + 3;
      rect(px, py + 2, 2, 3, c); rect(px + 2, py + 1, 1, 5, c); rect(px + 3, py, 1, 7, c);   // parlante
      if (on) { rect(px + 6, py + 2, 1, 3, c); rect(px + 8, py + 1, 1, 5, c); rect(px + 10, py, 1, 7, c); }
      else { for (let k = 0; k < 5; k++) { rect(px + 6 + k, py + 1 + k, 1, 1, COL.red); rect(px + 10 - k, py + 1 + k, 1, 1, COL.red); } }
      rects.push({ i: si, x: sx, y: sy, w: sw, h: 12 });
  }

  // Menú para pantalla ancha (Steam / PC): logo arriba, lista a la izquierda y a la derecha una vista previa
  // de lo que está elegido (foto grande, título y de qué se trata)
  function drawWide(hw, top) {
    const bob = Math.round(Math.sin(ui.clock * 2) * 1.5);
    // franja oscura detrás de la lista (se lee bien sobre cualquier mapa)
    const colW = 178, lx = 18;
    rect(0, 0, colW + 36, 240, 'rgba(4,6,14,.55)'); rect(colW + 36, 0, 1, 240, 'rgba(45,224,200,.25)');
    drawLogo(Math.round(hw / 2), 10 + bob, 32);
    const list = all.filter((it) => it.type === 'door' || it.type === 'row');
    const y0 = 70, step = 30;
    list.forEach((it, i) => {
      const sel = top.sel === i, y = y0 + i * step;
      const slide = sel ? 6 + Math.round(Math.abs(Math.sin(ui.clock * 4)) * 1) : 0;
      if (sel) {
        rect(lx - 6, y - 6, colW + 12, 26, 'rgba(255,154,31,.13)');
        rect(lx - 6, y - 6, 3, 26, COL.gold);
        tri(lx + 1, y + 4, 'r', COL.gold);
      }
      txt(it.label, lx + 10 + slide, y, 16, sel ? COL.white : COL.text, 'left', sel ? COL.goldShadow : undefined);
      rects.push({ i, x: lx - 6, y: y - 6, w: colW + 12, h: 26 });
    });
    // vista previa
    const it = all[top.sel] && (all[top.sel].type === 'door' || all[top.sel].type === 'row') ? all[top.sel] : all[0];
    // la foto se achica para que todo entre entre el logo y la fila de abajo
    const areaX = colW + 50, areaW = hw - areaX - 14, pt = 60, maxH = 214 - pt;
    let th = Math.min(Math.round(((areaW - 12) * 9) / 16), maxH - 66), tw = Math.round((th * 16) / 9);
    const pw = Math.max(tw + 12, Math.min(areaW, 190)), px = Math.round(areaX + (areaW - pw) / 2); tw = pw - 12; th = Math.min(th, Math.round((tw * 9) / 16));
    rect(px, pt, pw, th + 62, 'rgba(6,10,22,.88)');
    rect(px, pt, pw, 1, '#1d6e68'); rect(px, pt + th + 61, pw, 1, '#1d6e68'); rect(px, pt, 1, th + 62, '#1d6e68'); rect(px + pw - 1, pt, 1, th + 62, '#1d6e68');
    rect(px, pt, 5, 2, COL.teal); rect(px, pt, 2, 5, COL.teal); rect(px + pw - 5, pt + th + 60, 5, 2, COL.teal); rect(px + pw - 2, pt + th + 57, 2, 5, COL.teal);
    if (it.thumb) drawThumb(it.thumb(), px + 6, pt + 6, tw, th);
    else if (it.art) it.art(px + 6, pt + 6, tw, th);
    txt(it.label, px + 8, pt + th + 12, 16, COL.gold, 'left', COL.goldShadow);
    (typeof it.desc === 'function' ? it.desc() : it.desc || [it.sub || '']).forEach((l, k) => fitTxt(l, px + 8, pt + th + 32 + k * 10, pw - 16, k === 0 ? COL.teal : COL.text, 'left', hiTxt));
    // abajo: SALIR, versión y sonido
    const ci = nD + nR, csel = top.sel === ci, cy = 222, cw = textWidth(corner.label, 8) + 14;
    rect(lx - 6, cy - 4, cw, 14, csel ? 'rgba(255,90,90,.22)' : 'rgba(6,10,22,.7)');
    if (csel) rect(lx - 6, cy + 9, cw, 1, COL.red);
    txt(corner.label, lx + 1, cy - 1, 8, csel ? COL.red : COL.dim);
    rects.push({ i: ci, x: lx - 6, y: cy - 4, w: cw, h: 14 });
    if (VERSION) hiTxt(`V${VERSION}`, hw - 34, 228, 5, COL.dim, 'right');
    drawSound(hw, 222, top);
  }

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
      wide = hw >= 380;
      if (wide) { drawWide(hw, top); return; }
      const bob = Math.sin(ui.clock * 2) * 2;
      drawLogo(hw / 2, 10 + bob, 32);
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
      // esquina de abajo a la izquierda: SALIR (chiquito)
      const ci = nD + nR, sel = top.sel === ci, cx = 6, cy = 226, cw = textWidth(corner.label, 8) + 8;
      rect(cx, cy - 3, cw, 12, sel ? 'rgba(255,90,90,.22)' : 'rgba(6,10,22,.7)');
      if (sel) rect(cx, cy + 8, cw, 1, COL.red);
      txt(corner.label, cx + 4, cy - 1, 8, sel ? COL.red : COL.dim);
      rects.push({ i: ci, x: cx, y: cy - 3, w: cw, h: 12 });
      drawSound(hw, cy, top);
    },
  };
}
