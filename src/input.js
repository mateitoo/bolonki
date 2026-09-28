// Entrada unificada: teclado, joysticks (Gamepad API) y mouse/táctil.
// Cada frame se llama pollInput(dt) y el resto del juego lee:
//   input.ctl.all / p1 / p2 / p3 / p4 -> { x, y, hit } por controlador
//        all: cualquier tecla de movimiento, cualquier joystick y táctil (solitario y online)
//        p1:  flechas + espacio/ctrl (o joystick 1)    p2: WASD + E/Q (o joystick 2)
//        p3:  joystick 3                                 p4: joystick 4
//   input.events -> acciones de este frame para los menús: up, down, left, right, confirm, back, start,
//                   pause, hit, tabPrev, tabNext, click, any (cualquier tecla/botón), char (letra o número)
import { clamp } from './config.js';

const zero = () => ({ x: 0, y: 0, hit: false });
export const input = {
  events: [],
  ctl: { all: zero(), p1: zero(), p2: zero(), p3: zero(), p4: zero() },
  device: 'keyboard',                 // 'keyboard' | 'gamepad' | 'pointer' (para mostrar las ayudas correctas)
  pointer: { x: -1, y: -1, moved: false },
  touch: { l: false, r: false, hit: false },
  pads: 0,                            // joysticks conectados
};

const held = new Set();
const pressed = new Set();            // teclas apretadas en este frame (para los golpes)
const queue = [];
const NAV = ['up', 'down', 'left', 'right'];
const IGNORE_ANY = /^(Shift|Control|Alt|Meta|Tab|CapsLock|F\d+|Escape|Dead|Unidentified|OS|ContextMenu)$/;

// juegos de teclas del multijugador local
const K1 = { l: ['ArrowLeft'], r: ['ArrowRight'], u: ['ArrowUp'], d: ['ArrowDown'], hit: ['Space', 'ControlLeft', 'ControlRight'] };
const K2 = { l: ['KeyA'], r: ['KeyD'], u: ['KeyW'], d: ['KeyS'], hit: ['KeyE', 'KeyQ'] };
const EXTRA_HIT = ['KeyJ', 'KeyK'];

const KEYMAP = {
  ArrowUp: ['up'], KeyW: ['up'],
  ArrowDown: ['down'], KeyS: ['down'],
  ArrowLeft: ['left'], KeyA: ['left'],
  ArrowRight: ['right'], KeyD: ['right'],
  Space: ['confirm', 'hit'], KeyJ: ['hit'], KeyK: ['hit'], ControlLeft: ['hit'], ControlRight: ['hit'],
  Enter: ['confirm'], NumpadEnter: ['confirm'],   // ('start' es solo el botón START del joystick)
  Escape: ['back', 'pause'], Backspace: ['back'], KeyP: ['pause'],
  KeyQ: ['tabPrev'], KeyE: ['tabNext'], PageUp: ['tabPrev'], PageDown: ['tabNext'],
};

let hooks = { onGesture() {}, onFullscreenKey() {}, onPadConnect() {}, toHud: null };

export function initInput(stage, h) {
  hooks = Object.assign(hooks, h);

  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyF' && !e.repeat && !e.ctrlKey) { hooks.onFullscreenKey(); hooks.onGesture(); return; }
    held.add(e.code);
    if (!e.repeat) pressed.add(e.code);
    // ctrl + tecla: que el navegador no haga nada raro (Ctrl+D, Ctrl+S…) mientras se juega
    if (e.ctrlKey && /^Key[A-Z]$/.test(e.code)) e.preventDefault();
    // letras y números sueltos (código de sala, apodo) y "cualquier tecla" (pantalla de título)
    if (!e.repeat && !IGNORE_ANY.test(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) {
      queue.push({ a: 'any' });
      if (/^Key[A-Z]$/.test(e.code)) queue.push({ a: 'char', c: e.code.slice(3) });
      else if (/^(Digit|Numpad)[0-9]$/.test(e.code)) queue.push({ a: 'char', c: e.code.slice(-1) });
      hooks.onGesture();
    }
    const acts = KEYMAP[e.code];
    if (!acts) return;
    e.preventDefault();
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

  window.addEventListener('gamepadconnected', () => hooks.onPadConnect(true));
  window.addEventListener('gamepaddisconnected', () => hooks.onPadConnect(false));
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

/* ---------- joysticks (mapeo estándar: Xbox / PlayStation / Steam Deck) ---------- */
const B = { A: 0, B: 1, X: 2, Y: 3, LB: 4, RB: 5, SELECT: 8, START: 9, UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15 };
const padMem = {};   // por índice de joystick: botones anteriores y repetición de navegación
const dead = (v) => (Math.abs(v) > 0.2 ? (v - Math.sign(v) * 0.2) / 0.8 : 0);

function pollPads(dt, out) {
  const list = navigator.getGamepads ? [...navigator.getGamepads()].filter((p) => p && p.connected) : [];
  list.sort((a, b) => a.index - b.index);
  input.pads = list.length;
  return list.slice(0, 4).map((gp) => {
    const mem = padMem[gp.index] || (padMem[gp.index] = { prev: [], navDir: null, navT: 0 });
    const now = gp.buttons.map((b) => !!(b && b.pressed));
    const down = (i) => now[i] && !mem.prev[i];
    const push = (a) => { out.push({ a }); input.device = 'gamepad'; };

    if (now.some((b, i) => b && !mem.prev[i])) push('any');
    if (down(B.A)) { push('confirm'); push('hit'); }
    if (down(B.X)) push('hit');
    if (down(B.B) || down(B.SELECT)) push('back');
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
    if (dir !== mem.navDir) { mem.navDir = dir; mem.navT = 0.35; if (dir) push(dir); }
    else if (dir) { mem.navT -= dt; if (mem.navT <= 0) { mem.navT = 0.11; push(dir); } }

    let x = dead(ax), y = -dead(ay);                   // y positivo = arriba en la pantalla
    if (now[B.LEFT]) x = -1; if (now[B.RIGHT]) x = 1;
    if (now[B.UP]) y = 1; if (now[B.DOWN]) y = -1;
    if (x || y) input.device = 'gamepad';
    const hit = down(B.A) || down(B.X);
    mem.prev = now;
    return { x, y, hit };
  });
}

const any = (codes) => codes.some((c) => held.has(c));
const tap = (codes) => codes.some((c) => pressed.has(c));
function keySet(k) {
  return { x: (any(k.r) ? 1 : 0) - (any(k.l) ? 1 : 0), y: (any(k.u) ? 1 : 0) - (any(k.d) ? 1 : 0), hit: tap(k.hit) };
}
function merge(...parts) {
  const o = zero();
  for (const p of parts) { if (!p) continue; o.x += p.x; o.y += p.y; o.hit = o.hit || p.hit; }
  o.x = clamp(o.x, -1, 1); o.y = clamp(o.y, -1, 1);
  return o;
}

export function pollInput(dt) {
  const ev = queue.splice(0);
  const pads = pollPads(dt, ev);
  const k1 = keySet(K1), k2 = keySet(K2);
  const touch = { x: (input.touch.r ? 1 : 0) - (input.touch.l ? 1 : 0), y: 0, hit: input.touch.hit };
  const extra = { x: 0, y: 0, hit: tap(EXTRA_HIT) };
  const c = input.ctl;
  c.all = merge(k1, k2, extra, touch, ...pads);
  c.p1 = merge(k1, pads[0], touch);
  c.p2 = merge(k2, pads[1]);
  c.p3 = merge(pads[2]);
  c.p4 = merge(pads[3]);
  input.touch.hit = false;
  pressed.clear();
  input.events = ev;
}

export const has = (a) => input.events.some((e) => e.a === a);
// online con un menú abierto: tu nave se queda quieta y no golpea
export function freezeControls() { for (const k in input.ctl) input.ctl[k] = zero(); }
