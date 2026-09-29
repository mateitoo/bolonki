// Motor de menús: pila de pantallas, navegación con teclado/joystick/mouse y dibujo estilo PS1.
//
// Un menú es:
//   { id, style: 'big' | 'panel', title, titleColor?, width?, offsetY?,
//     items: [...]            -> lista simple
//     tabs: [{ label, items }] -> solapas (se cambian con LB/RB, Q/E o clic)
//     onBack?() }
// Tipos de ítem:
//   { kind:'action', label, action(), corner?, danger? }       corner: se dibuja en la esquina (estilo 'big')
//   { kind:'choice', label, values:[{v,label}], get(), set(v) }  -> ◀ valor ▶
//   { kind:'slider', label, get(), set(n), max }                 -> barra 0..max
//   { kind:'info',   label, value? }                             -> texto, no seleccionable
// Cualquier ítem puede tener hidden() para ocultarse según el momento.
// No hay filas "VOLVER": se vuelve con B / ESC o tocando VOLVER en la barra de abajo.
import { input } from '../input.js';
import { SFX } from '../audio.js';
import { ui, txt, rect, panel, tri, textWidth, COL } from './draw.js';

const stack = [];
let rects = [];      // zonas clickeables de ítems
let tabRects = [];   // zonas clickeables de solapas
let footRects = [];  // zonas clickeables de la barra de abajo
export const customRects = [];   // zonas clickeables de pantallas propias

export const menuOpen = () => stack.length > 0;
export const topMenu = () => stack[stack.length - 1] || null;

const itemsOf = (e) => (e.def.tabs ? e.def.tabs[e.tab].items : e.def.items || []).filter((it) => !(it.hidden && it.hidden()));
const selectable = (it) => it.kind !== 'info' && it.kind !== 'art';
const L = (it) => (typeof it.label === 'function' ? it.label() : it.label);   // el texto puede cambiar en vivo
function firstSel(e) { const v = itemsOf(e); return Math.max(0, v.findIndex(selectable)); }

export function openMenu(def) { const e = { def, sel: 0, tab: 0 }; e.sel = firstSel(e); stack.push(e); }
export function replaceMenus(def) { stack.length = 0; openMenu(def); }
export function closeMenu() { stack.pop(); }
export function closeAllMenus() { stack.length = 0; }

function move(top, d) {
  const items = itemsOf(top); if (!items.length) return;
  let i = top.sel;
  for (let n = 0; n < items.length; n++) {
    i = (i + d + items.length) % items.length;
    if (selectable(items[i])) { top.sel = i; SFX.move(); return; }
  }
}
function switchTab(top, d) {
  if (!top.def.tabs) return;
  const n = top.def.tabs.length;
  top.tab = (top.tab + d + n) % n; top.sel = firstSel(top); SFX.move();
}
function change(it, d) {
  if (it.kind === 'choice') {
    const vals = it.values; let i = vals.findIndex((v) => v.v === it.get());
    i = (i + d + vals.length) % vals.length; it.set(vals[i].v); SFX.select();
  } else if (it.kind === 'slider') {
    const n = Math.max(0, Math.min(it.max || 10, it.get() + d));
    if (n !== it.get()) { it.set(n); SFX.select(); }
  }
}
function activate(it, dir = 1) {
  if (!it || !selectable(it)) return;
  if (it.kind === 'action') { SFX.confirm(); it.action(); } else change(it, dir);
}
function back(top) { SFX.back(); if (top.def.onBack) top.def.onBack(); else closeMenu(); }
const hit = (list, x, y) => list.find((r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h);

// Devuelve true si el menú consumió la entrada
export function menuInput() {
  const top = topMenu(); if (!top) return false;
  // pantallas propias (menú principal, sala): manejan toda su entrada
  if (top.def.style === 'custom') { top.def.input(top); return true; }
  // pantallas con algo propio por frame (opciones de la sala: alguien más se puede sumar)
  if (top.def.tick) { top.def.tick(top); if (topMenu() !== top) return true; }
  const items = itemsOf(top);
  if (top.sel >= items.length) top.sel = firstSel(top);

  if (input.pointer.moved) {                 // mouse: el ítem bajo el puntero queda seleccionado
    input.pointer.moved = false;
    const r = hit(rects, input.pointer.x, input.pointer.y);
    if (r && r.i !== top.sel) { top.sel = r.i; SFX.move(); }
  }

  for (const e of input.events) {
    if (topMenu() !== top) break;            // una acción abrió o cerró otro menú
    if (top.def.onEvent && top.def.onEvent(e, top)) continue;   // pantallas con entrada propia (código de sala)
    const it = itemsOf(top)[top.sel];
    switch (e.a) {
      case 'up': move(top, -1); break;
      case 'down': move(top, 1); break;
      case 'left': if (it) change(it, -1); break;
      case 'right': if (it) change(it, 1); break;
      case 'tabPrev': switchTab(top, -1); break;
      case 'tabNext': switchTab(top, 1); break;
      case 'confirm': case 'start': activate(it); break;
      case 'back': back(top); break;
      case 'click': {
        const f = hit(footRects, e.x, e.y);
        if (f) {
          if (f.act === 'back') back(top);
          else if (f.act === 'tabNext') switchTab(top, 1);
          else if (!(top.def.onEvent && top.def.onEvent({ a: 'confirm' }, top))) activate(it);
          break;
        }
        const t = hit(tabRects, e.x, e.y);
        if (t) { if (t.i !== top.tab) { top.tab = t.i; top.sel = firstSel(top); SFX.move(); } break; }
        const r = hit(rects, e.x, e.y);
        if (r) {
          top.sel = r.i; const cur = itemsOf(top)[r.i];
          if (cur.clickAt) cur.clickAt(e.x, e.y); else activate(cur, cur.kind !== 'action' && e.x < r.x + r.w * 0.55 ? -1 : 1);
        }
        break;
      }
      default: break;
    }
  }
  return true;
}

/* ---------------- dibujo ---------------- */

function drawValue(it, sel, vx, iy) {
  if (it.kind === 'choice') {
    const cur = it.values.find((v) => v.v === it.get());
    const label = cur ? cur.label : '?';
    if (sel) {
      const lw = textWidth(label, 8);
      tri(vx - 3, iy, 'r', COL.gold); tri(vx - lw - 16, iy, 'l', COL.gold);
      txt(label, vx - 8, iy, 8, COL.gold, 'right');
    } else txt(label, vx - 8, iy, 8, COL.text, 'right');
  } else if (it.kind === 'slider') {
    const max = it.max || 10, v = it.get();
    for (let k = 0; k < max; k++) rect(vx - (max - k) * 7, iy, 5, 8, k < v ? (sel ? COL.gold : COL.teal) : '#2a3150');
  } else if ((it.kind === 'info' || it.kind === 'action') && it.value) {
    const v = typeof it.value === 'function' ? it.value() : it.value;
    txt(v, vx, iy, 8, it.valueColor ? it.valueColor() : sel ? COL.white : COL.text, 'right');
  }
}

// Menú principal: logo arriba, opciones grandes al centro, ítem de esquina abajo a la izquierda
function drawBig(top, hw) {
  const items = itemsOf(top);
  const bob = Math.sin(ui.clock * 2) * 2;
  txt('BOLONKI', hw / 2, 34 + bob, 32, COL.gold, 'center', COL.goldShadow);
  rect(hw / 2 - 70, 72, 140, 1, '#1d6e68');

  const main = items.map((it, i) => ({ it, i })).filter((o) => !o.it.corner);
  main.forEach(({ it, i }, k) => {
    const y = 96 + k * 32;
    const sel = i === top.sel;
    if (sel) {
      const w = textWidth(L(it), 24) + 44, x = hw / 2 - w / 2, jump = Math.abs(Math.sin(ui.clock * 5)) * -2;
      rect(x, y - 7 + jump, w, 38, 'rgba(6,10,22,.9)');
      rect(x, y - 7 + jump, w, 2, COL.gold); rect(x, y + 29 + jump, w, 2, COL.gold);
      rect(x, y - 7 + jump, 2, 38, COL.gold); rect(x + w - 2, y - 7 + jump, 2, 38, COL.gold);
      tri(x + 10, y + 8 + jump, 'r', COL.gold);
      txt(L(it), hw / 2 + 6, y + jump, 24, COL.white, 'center', COL.goldShadow);
      rects.push({ i, x, y: y - 7, w, h: 38 });
    } else {
      const w = textWidth(L(it), 16);
      txt(L(it), hw / 2, y + 4, 16, COL.text, 'center');
      rects.push({ i, x: hw / 2 - w / 2 - 10, y: y - 2, w: w + 20, h: 26 });
    }
  });

  items.forEach((it, i) => {                 // ítem de esquina (SALIR)
    if (!it.corner) return;
    const sel = i === top.sel, x = 12, y = 204, w = textWidth(it.label, 8) + 22;
    rect(x, y - 4, w, 15, sel ? 'rgba(255,90,90,.18)' : 'rgba(6,10,22,.7)');
    if (sel) tri(x + 4, y, 'r', COL.red);
    txt(it.label, x + 14, y, 8, sel ? COL.red : COL.dim);
    rects.push({ i, x, y: y - 4, w, h: 15 });
  });
}

// Ventana: lista simple o con solapas
function drawPanel(top, hw) {
  const def = top.def;
  const tabs = def.tabs;
  const items = itemsOf(top);
  const ROW = def.rowH || 15;
  const hOf = (it) => it.h || ROW;                                       // las filas "art" tienen su propio alto
  const sumH = (list) => list.filter((it) => !(it.hidden && it.hidden())).reduce((a, it) => a + hOf(it), 0);
  const rowsH = tabs ? Math.max(...tabs.map((t) => sumH(t.items))) : sumH(items);
  const w = Math.min(hw - 24, def.width || 240);
  const titleH = def.title ? 30 : 8;
  const tabsH = tabs ? 20 : 0;
  const headH = def.headerH || 0;
  const h = titleH + headH + tabsH + (def.body ? def.bodyH : rowsH) + 10;
  const x = Math.round((hw - w) / 2), y = Math.round(Math.max(20, (221 - h) / 2 + (def.offsetY || 0)));
  panel(x, y, w, h);
  const title = typeof def.title === 'function' ? def.title() : def.title;
  if (title) txt(title, hw / 2, y + 9, textWidth(title, 16) > w - 16 ? 8 : 16, def.titleColor || COL.gold, 'center', COL.goldShadow);

  if (tabs) {
    const ty = y + titleH + headH;
    const widths = tabs.map((t) => textWidth(t.label, 8) + 12);
    const total = widths.reduce((a, b) => a + b, 0) + (tabs.length - 1) * 4;
    let tx = hw / 2 - total / 2;
    tabs.forEach((t, i) => {
      const on = i === top.tab;
      rect(tx, ty - 3, widths[i], 14, on ? COL.teal : 'rgba(45,224,200,.06)');
      txt(t.label, tx + 6, ty, 8, on ? '#04120f' : COL.dim, 'left', on ? 'rgba(0,0,0,0)' : '#000');
      tabRects.push({ i, x: tx, y: ty - 3, w: widths[i], h: 14 });
      tx += widths[i] + 4;
    });
    if (input.device !== 'pointer') {
      const k = input.device === 'gamepad' ? ['LB', 'RB'] : ['Q', 'E'];
      keyCap(k[0], hw / 2 - total / 2 - 8, ty, 'right');
      keyCap(k[1], hw / 2 + total / 2 + 8, ty, 'left');
    }
    rect(x + 6, ty + 14, w - 12, 1, '#1d6e68');
  }

  if (def.header) def.header(x, y + titleH, w, hw);
  if (def.body) { def.body(x, y + titleH + headH, w, hw, top); return; }
  let iy = y + titleH + headH + tabsH + 4;
  items.forEach((it, i) => {
    if (it.kind === 'art') { it.draw(x, iy - 3, w, hw); iy += hOf(it); return; }
    if (it.drawRow) {                         // fila dibujada por su cuenta (grilla de minijuegos)
      it.drawRow(x, iy - 3, w, hw, i === top.sel);
      rects.push({ i, x: x + 4, y: iy - 3, w: w - 8, h: hOf(it) });
      iy += hOf(it); return;
    }
    const sel = i === top.sel && selectable(it);
    if (sel) {
      rect(x + 4, iy - 3, w - 8, ROW - 1, 'rgba(45,224,200,.16)');
      if (((ui.clock * 3) | 0) % 2 === 0) tri(x + 9, iy, 'r', COL.teal);
    }
    const centered = (it.kind === 'action' && !it.left && !it.value) || it.center;
    const col = it.labelColor ? it.labelColor() : it.kind === 'info' ? COL.dim : sel ? (it.danger ? COL.red : COL.white) : COL.text;
    txt(L(it), centered ? hw / 2 : x + 20, iy, 8, col, centered ? 'center' : 'left');
    drawValue(it, sel, x + w - 14, iy);
    if (selectable(it)) rects.push({ i, x: x + 4, y: iy - 3, w: w - 8, h: ROW - 1 });
    iy += ROW;
  });
}

// Tecla o botón dibujado como una tapita
export function keyCap(label, x, y, align) {
  const w = textWidth(label, 8) + 8;
  const bx = align === 'right' ? x - w : align === 'center' ? x - w / 2 : x;
  rect(bx, y - 3, w, 13, '#1d2338'); rect(bx, y + 9, w, 1, '#3a4570');
  txt(label, bx + 4, y, 8, COL.white);
  return w;
}

// Barra de botones al pie (cambia según teclado, joystick o mouse)
function drawFooter(top, hw, custom) {
  rect(0, 221, hw, 19, 'rgba(4,6,14,.85)');
  const pad = input.device === 'gamepad';
  const parts = custom || [
    { key: pad ? 'A' : input.device === 'pointer' ? 'CLIC' : 'ENTER', label: 'ACEPTAR', act: 'ok' },
  ];
  if (!custom && top.def.tabs) parts.push({ key: pad ? 'LB RB' : 'Q E', label: 'SOLAPA', act: 'tabNext' });
  if (!custom) parts.push({ key: pad ? 'B' : 'ESC', label: 'VOLVER', act: 'back' });
  const widths = parts.map((p) => textWidth(p.key, 8) + 8 + 6 + textWidth(p.label, 8));
  const total = widths.reduce((a, b) => a + b, 0) + (parts.length - 1) * 18;
  let x = hw / 2 - total / 2;
  parts.forEach((p, i) => {
    const kw = keyCap(p.key, x, 227, 'left');
    txt(p.label, x + kw + 6, 227, 8, COL.dim);
    footRects.push({ act: p.act, x, y: 221, w: widths[i], h: 19 });
    x += widths[i] + 18;
  });
}

export function drawMenu(hw) {
  const top = topMenu(); if (!top) return;
  rects = []; tabRects = []; footRects = []; customRects.length = 0;
  if (top.def.style === 'custom') { top.def.draw(hw, top); if (top.def.footer) drawFooter(top, hw, top.def.footer(top)); return; }
  if (top.def.style === 'big') drawBig(top, hw); else drawPanel(top, hw);
  if (!top.def.noFooter) drawFooter(top, hw);   // el menú principal no lleva barra de botones
}

// clic en la barra de abajo de una pantalla propia: qué botón (act) se tocó
export const footerHit = (x, y) => { const f = hit(footRects, x, y); return f ? f.act : null; };
