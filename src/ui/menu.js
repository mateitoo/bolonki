// Motor de menús: pila de pantallas, navegación con teclado/joystick/mouse y dibujo estilo PS1.
//
// Un menú es { id, title, titleColor?, items: [...], onBack?() }
// Tipos de ítem:
//   { kind:'action', label, action() }
//   { kind:'choice', label, values:[{v,label}], get(), set(v) }   -> ◀ valor ▶
//   { kind:'slider', label, get(), set(n), max }                  -> barra 0..max
//   { kind:'info',   label, value? }                              -> texto, no seleccionable
// Cualquier ítem puede tener hidden() para ocultarse según el momento.
import { input } from '../input.js';
import { SFX } from '../audio.js';
import { ui, txt, rect, panel, tri, textWidth, COL } from './draw.js';

const stack = [];
let rects = [];

export const menuOpen = () => stack.length > 0;
export const topMenu = () => stack[stack.length - 1] || null;

const visible = (def) => def.items.filter((it) => !(it.hidden && it.hidden()));
const selectable = (it) => it.kind !== 'info';

function firstSel(def) { const v = visible(def); const i = v.findIndex(selectable); return Math.max(0, i); }

export function openMenu(def) { stack.push({ def, sel: firstSel(def) }); }
export function replaceMenus(def) { stack.length = 0; openMenu(def); }
export function closeMenu() { stack.pop(); }
export function closeAllMenus() { stack.length = 0; }

function move(top, d) {
  const items = visible(top.def); if (!items.length) return;
  let i = top.sel;
  for (let n = 0; n < items.length; n++) {
    i = (i + d + items.length) % items.length;
    if (selectable(items[i])) { top.sel = i; SFX.move(); return; }
  }
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
  if (it.kind === 'action') { SFX.confirm(); it.action(); }
  else change(it, dir);
}
function back(top) {
  SFX.back();
  if (top.def.onBack) top.def.onBack(); else closeMenu();
}

// Devuelve true si el menú consumió la entrada
export function menuInput() {
  const top = topMenu(); if (!top) return false;
  const items = visible(top.def);
  if (top.sel >= items.length) top.sel = firstSel(top.def);

  // mouse: el ítem bajo el puntero queda seleccionado
  if (input.pointer.moved) {
    input.pointer.moved = false;
    const r = rects.find((r) => input.pointer.x >= r.x && input.pointer.x <= r.x + r.w && input.pointer.y >= r.y && input.pointer.y <= r.y + r.h);
    if (r && r.i !== top.sel) { top.sel = r.i; SFX.move(); }
  }

  for (const e of input.events) {
    if (topMenu() !== top) break;              // una acción abrió/cerró otro menú
    const it = items[top.sel];
    switch (e.a) {
      case 'up': move(top, -1); break;
      case 'down': move(top, 1); break;
      case 'left': if (it) change(it, -1); break;
      case 'right': if (it) change(it, 1); break;
      case 'confirm': case 'start': if (it) activate(it); break;
      case 'back': back(top); break;
      case 'click': {
        const r = rects.find((r) => e.x >= r.x && e.x <= r.x + r.w && e.y >= r.y && e.y <= r.y + r.h);
        if (r) { top.sel = r.i; activate(items[r.i], e.x < r.x + r.w * 0.55 && items[r.i].kind !== 'action' ? -1 : 1); }
        break;
      }
      default: break;
    }
  }
  return true;
}

const ROW = 15;

export function drawMenu(hw) {
  const top = topMenu(); if (!top) return;
  const def = top.def, items = visible(def);
  const w = Math.min(hw - 24, def.width || 240);
  const titleH = def.title ? 30 : 8;
  const h = titleH + items.length * ROW + 10;
  const x = Math.round((hw - w) / 2), y = Math.round(Math.max(56, (240 - h) / 2 + (def.offsetY || 0)));
  panel(x, y, w, h);
  if (def.title) txt(def.title, hw / 2, y + 9, 16, def.titleColor || COL.gold, 'center', COL.goldShadow);

  rects = [];
  items.forEach((it, i) => {
    const iy = y + titleH + i * ROW;
    const sel = i === top.sel && selectable(it);
    if (sel) {
      rect(x + 4, iy - 3, w - 8, ROW - 1, 'rgba(45,224,200,.16)');
      if (((ui.clock * 3) | 0) % 2 === 0) tri(x + 9, iy, 'r', COL.teal);
    }
    const col = it.kind === 'info' ? COL.dim : sel ? COL.white : COL.text;
    const lx = it.kind === 'action' && !it.left ? hw / 2 : x + 20;
    txt(it.label, lx, iy, 8, it.danger && sel ? COL.red : col, it.kind === 'action' && !it.left ? 'center' : 'left');
    const vx = x + w - 14;
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
    } else if (it.kind === 'info' && it.value) {
      txt(it.value, vx, iy, 8, COL.text, 'right');
    }
    if (selectable(it)) rects.push({ i, x: x + 4, y: iy - 3, w: w - 8, h: ROW - 1 });
  });

  // ayuda de controles al pie, según el dispositivo en uso
  const help = input.device === 'gamepad'
    ? 'A ACEPTAR   B VOLVER   CRUCETA ELEGIR'
    : input.device === 'pointer' ? 'CLIC PARA ELEGIR   ESC VOLVER' : 'FLECHAS ELEGIR   ENTER OK   ESC VOLVER';
  rect(0, 221, hw, 19, 'rgba(4,6,14,.8)');
  txt(help, hw / 2, 227, 8, COL.dim, 'center');
}
