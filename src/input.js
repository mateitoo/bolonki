// Entrada unificada: teclado, joystick (Gamepad API) y mouse/táctil.
// Cada frame se llama pollInput(dt) y el resto del juego lee:
//   input.axis   -> movimiento del pod (-1..1)
//   input.events -> acciones de este frame: up, down, left, right, confirm, back, start, pause, hit,
//                   tabPrev, tabNext, click, any (cualquier tecla/botón), char (letra A-Z)
import { clamp } from './config.js';

export const input = {
  axis: 0,
  events: [],
  device: 'keyboard',                 // 'keyboard' | 'gamepad' | 'pointer' (para mostrar las ayudas correctas)
  pointer: { x: -1, y: -1, moved: false },
  touch: { l: false, r: false },
  padName: '',
};

const held = new Set();
const queue = [];
const NAV = ['up', 'down', 'left', 'right'];
const IGNORE_ANY = /^(Shift|Control|Alt|Meta|Tab|CapsLock|F\d+|Escape|Dead|Unidentified|OS|ContextMenu)$/;

const KEYMAP = {
  ArrowUp: ['up'], KeyW: ['up'],
  ArrowDown: ['down'], KeyS: ['down'],
  ArrowLeft: ['left'], KeyA: ['left'],
  ArrowRight: ['right'], KeyD: ['right'],
  Space: ['confirm', 'hit'], KeyJ: ['hit'], KeyK: ['hit'],
  Enter: ['confirm', 'start'], NumpadEnter: ['confirm', 'start'],
  Escape: ['back', 'pause'], Backspace: ['back'], KeyP: ['pause'],
  KeyQ: ['tabPrev'], KeyE: ['tabNext'], PageUp: ['tabPrev'], PageDown: ['tabNext'],
};

let hooks = { onGesture() {}, onFullscreenKey() {}, onPadConnect() {}, toHud: null };

export function initInput(stage, h) {
  hooks = Object.assign(hooks, h);

  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyF' && !e.repeat) { hooks.onFullscreenKey(); hooks.onGesture(); return; }
    // letras sueltas (para escribir el código de sala) y "cualquier tecla" (pantalla de título)
    if (!e.repeat && !IGNORE_ANY.test(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) {
      queue.push({ a: 'any' });
      if (/^Key[A-Z]$/.test(e.code)) queue.push({ a: 'char', c: e.code.slice(3) });
      hooks.onGesture();
    }
    const acts = KEYMAP[e.code];
    if (!acts) return;
    e.preventDefault();
    held.add(e.code);
    input.device = 'keyboard';
    const fromChar = /^Key[A-Z]$/.test(e.code);   // WASD, Q, E… también son letras del código
    if (e.repeat) { acts.filter((a) => NAV.includes(a)).forEach((a) => queue.push({ a, fromChar })); return; }
    acts.forEach((a) => queue.push({ a, fromChar, key: e.code }));
    hooks.onGesture();
  });
  window.addEventListener('keyup', (e) => held.delete(e.code));
  window.addEventListener('blur', () => { held.clear(); input.touch.l = input.touch.r = false; queue.push({ a: 'blur' }); });

  stage.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    const p = hooks.toHud(e.clientX, e.clientY);
    input.pointer.x = p.x; input.pointer.y = p.y; input.pointer.moved = true;
    input.device = 'pointer';
  });
  stage.addEventListener('pointerdown', (e) => {
    if (e.target.closest && e.target.closest('.touch')) return;   // los botones táctiles se manejan aparte
    const p = hooks.toHud(e.clientX, e.clientY);
    queue.push({ a: 'click', x: p.x, y: p.y });
    queue.push({ a: 'any' });
    input.device = 'pointer';
    hooks.onGesture();
  });

  window.addEventListener('gamepadconnected', (e) => { input.padName = e.gamepad.id; hooks.onPadConnect(true); });
  window.addEventListener('gamepaddisconnected', () => { hooks.onPadConnect(false); });
}

// Botones táctiles (celular): mover, golpe y pausa
export function bindTouch(id, onDown, onUp) {
  const el = document.getElementById(id); if (!el) return;
  el.addEventListener('pointerdown', (e) => {
    e.preventDefault(); el.setPointerCapture(e.pointerId); el.classList.add('on');
    input.device = 'pointer'; onDown(); hooks.onGesture();
  });
  const up = () => { el.classList.remove('on'); if (onUp) onUp(); };
  el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up); el.addEventListener('lostpointercapture', up);
}
export function pushEvent(a) { queue.push({ a }); }

/* ---------- joystick (mapeo estándar: Xbox / PlayStation / Steam Deck) ---------- */
const pad = { prev: [], navDir: null, navT: 0 };
const B = { A: 0, B: 1, X: 2, Y: 3, LB: 4, RB: 5, SELECT: 8, START: 9, UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15 };

function pollPad(dt, out) {
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  let gp = null;
  for (const p of pads) if (p && p.connected) { gp = p; break; }
  if (!gp) return 0;
  const now = gp.buttons.map((b) => !!(b && b.pressed));
  const down = (i) => now[i] && !pad.prev[i];
  const push = (a) => { out.push({ a }); input.device = 'gamepad'; };

  if (now.some((b, i) => b && !pad.prev[i])) push('any');
  if (down(B.A)) { push('confirm'); push('hit'); }
  if (down(B.X)) push('hit');
  if (down(B.B)) push('back');
  if (down(B.SELECT)) push('back');
  if (down(B.LB)) push('tabPrev');
  if (down(B.RB)) push('tabNext');
  if (down(B.START)) { push('start'); push('pause'); }

  // navegación de menú con cruceta o stick, con repetición al mantener
  const ax = gp.axes[0] || 0, ay = gp.axes[1] || 0;
  let dir = null;
  if (now[B.UP] || ay < -0.55) dir = 'up';
  else if (now[B.DOWN] || ay > 0.55) dir = 'down';
  else if (now[B.LEFT] || ax < -0.55) dir = 'left';
  else if (now[B.RIGHT] || ax > 0.55) dir = 'right';
  if (dir !== pad.navDir) { pad.navDir = dir; pad.navT = 0.35; if (dir) push(dir); }
  else if (dir) { pad.navT -= dt; if (pad.navT <= 0) { pad.navT = 0.11; push(dir); } }

  pad.prev = now;
  let axis = Math.abs(ax) > 0.2 ? (ax - Math.sign(ax) * 0.2) / 0.8 : 0;   // stick analógico con zona muerta
  if (now[B.LEFT]) axis = -1;
  if (now[B.RIGHT]) axis = 1;
  if (axis !== 0) input.device = 'gamepad';
  return axis;
}

export function pollInput(dt) {
  const ev = queue.splice(0);
  const padAxis = pollPad(dt, ev);
  const k = (held.has('ArrowRight') || held.has('KeyD') ? 1 : 0) - (held.has('ArrowLeft') || held.has('KeyA') ? 1 : 0);
  const t = (input.touch.r ? 1 : 0) - (input.touch.l ? 1 : 0);
  input.axis = clamp(k + padAxis + t, -1, 1);
  input.events = ev;
}

export const has = (a) => input.events.some((e) => e.a === a);
