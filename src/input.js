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
// ¿es un celular / tablet? (dedo y sin mouse)
export const isTouch = () => (typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches);
export const input = {
  events: [],
  ctl: { all: zero(), p1: zero(), p2: zero(), p3: zero(), p4: zero() },
  pev: { p1: [], p2: [], p3: [], p4: [] },   // acciones de este frame de cada jugador local (sala): left right up down ok back
  device: 'keyboard',                 // 'keyboard' | 'gamepad' | 'pointer' (para mostrar las ayudas correctas)
  pointer: { x: -1, y: -1, moved: false },
  drag: { on: false, id: null, lx: 0, ly: 0, dx: 0, dy: 0 },   // arrastre (mouse o dedo) para girar la cámara
  camStick: { x: 0, y: 0 },           // stick derecho del joystick (girar la cámara)
  touch: { l: false, r: false, hit: false, x: 0, y: 0 },   // x, y: joystick virtual (-1..1)
  pads: 0,                            // joysticks conectados
  holdHit: false,                     // alguien mantiene apretado el botón de golpe / aceptar (acelerar en la Fiesta)
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
  KeyC: ['camReset'],
};

let hooks = { onGesture() {}, onFullscreenKey() {}, onPadConnect() {}, toHud: null };

export function initInput(stage, h) {
  hooks = Object.assign(hooks, h);

  window.addEventListener('keydown', (e) => {
    if (e.target && e.target.id === 'txtin') return;           // lo escrito en el campo del celular se maneja en textEntry.js
    // F = pantalla completa (salvo mientras se escribe un código o apodo: ahí es una letra más)
    if (e.code === 'KeyF' && !e.repeat && !e.ctrlKey && !input.typing) { hooks.onFullscreenKey(); hooks.onGesture(); return; }
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
  window.addEventListener('blur', () => { held.clear(); input.touch.l = input.touch.r = false; input.touch.x = input.touch.y = 0; queue.push({ a: 'blur' }); });

  stage.addEventListener('pointermove', (e) => {
    const d = input.drag;
    if (d.on && e.pointerId === d.id) { d.dx += e.clientX - d.lx; d.dy += e.clientY - d.ly; d.lx = e.clientX; d.ly = e.clientY; }
    if (e.pointerType !== 'mouse') return;
    const p = hooks.toHud(e.clientX, e.clientY);
    input.pointer.x = p.x; input.pointer.y = p.y; input.pointer.moved = true;
    input.device = 'pointer';
  });
  stage.addEventListener('pointerdown', (e) => {
    if (e.target.closest && e.target.closest('.touch')) return;   // los botones táctiles se manejan aparte
    Object.assign(input.drag, { on: true, id: e.pointerId, lx: e.clientX, ly: e.clientY });
    const p = hooks.toHud(e.clientX, e.clientY);
    queue.push({ a: 'click', x: p.x, y: p.y });
    queue.push({ a: 'any' });
    input.device = 'pointer';
    hooks.onGesture();
  });

  const endDrag = (e) => { if (input.drag.id === e.pointerId) input.drag.on = false; };
  window.addEventListener('pointerup', endDrag); window.addEventListener('pointercancel', endDrag);

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

// Joystick virtual del celular: la perilla sigue al dedo (hasta el borde) y da una dirección en x / y
export function bindStick(id, knobId) {
  const el = document.getElementById(id), knob = document.getElementById(knobId); if (!el) return;
  let pid = null, last = null;
  const set = (e) => {
    const r = el.getBoundingClientRect(), R = r.width / 2;
    let dx = e.clientX - (r.left + R), dy = e.clientY - (r.top + R);
    const l = Math.hypot(dx, dy), max = R * 0.62;
    if (l > max) { dx *= max / l; dy *= max / l; }
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
    const k = 1 / max, dz = 0.18;
    let x = dx * k, y = -dy * k; const m = Math.hypot(x, y);
    if (m < dz) { x = 0; y = 0; } else { const f = Math.min(1, (m - dz) / (1 - dz)) / m; x *= f; y *= f; }
    input.touch.x = x; input.touch.y = y;
    // en los menús, el joystick también navega (un paso por cada vez que se inclina)
    const dir = Math.abs(x) > Math.abs(y) ? (x > 0.5 ? 'right' : x < -0.5 ? 'left' : null) : (y > 0.5 ? 'up' : y < -0.5 ? 'down' : null);
    if (dir && dir !== last) queue.push({ a: dir }); last = dir;
  };
  el.addEventListener('pointerdown', (e) => {
    e.preventDefault(); pid = e.pointerId; el.setPointerCapture(pid); el.classList.add('on');
    input.device = 'pointer'; set(e); hooks.onGesture();
  });
  el.addEventListener('pointermove', (e) => { if (e.pointerId === pid) set(e); });
  const up = (e) => { if (e.pointerId !== pid) return; pid = null; last = null; el.classList.remove('on'); knob.style.transform = ''; input.touch.x = 0; input.touch.y = 0; };
  el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up); el.addEventListener('lostpointercapture', up);
}

/* ---------- joysticks (mapeo estándar: Xbox / PlayStation / Steam Deck) ---------- */
const B = { A: 0, B: 1, X: 2, Y: 3, LB: 4, RB: 5, SELECT: 8, START: 9, UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15 };
const padMem = {};   // por índice de joystick: botones anteriores y repetición de navegación
const dead = (v) => (Math.abs(v) > 0.2 ? (v - Math.sign(v) * 0.2) / 0.8 : 0);

function pollPads(dt, out) {
  const list = navigator.getGamepads ? [...navigator.getGamepads()].filter((p) => p && p.connected) : [];
  list.sort((a, b) => a.index - b.index);
  input.pads = list.length;
  return list.slice(0, 4).map((gp, n) => {
    const mem = padMem[gp.index] || (padMem[gp.index] = { prev: [], navDir: null, navT: 0 });
    const now = gp.buttons.map((b) => !!(b && b.pressed));
    const down = (i) => now[i] && !mem.prev[i];
    const own = [];                                    // acciones de este joystick solo (para la sala)
    const push = (a) => { out.push({ a, pad: n }); input.device = 'gamepad'; };   // pad: de qué joystick vino

    if (now.some((b, i) => b && !mem.prev[i])) push('any');
    if (down(B.A)) { push('confirm'); push('hit'); own.push('ok'); }
    if (down(B.X)) push('hit');
    if (down(B.B) || down(B.SELECT)) { push('back'); own.push('back'); }
    if (down(B.START)) own.push('ok');
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
    if (dir !== mem.navDir) { mem.navDir = dir; mem.navT = 0.35; if (dir) { push(dir); own.push(dir); } }
    else if (dir) { mem.navT -= dt; if (mem.navT <= 0) { mem.navT = 0.11; push(dir); own.push(dir); } }

    let x = dead(ax), y = -dead(ay);                   // y positivo = arriba en la pantalla
    if (now[B.LEFT]) x = -1; if (now[B.RIGHT]) x = 1;
    if (now[B.UP]) y = 1; if (now[B.DOWN]) y = -1;
    if (x || y) input.device = 'gamepad';
    const hit = down(B.A) || down(B.X);
    mem.prev = now;
    // stick derecho: girar la cámara (en los minijuegos que lo permiten)
    input.camStick.x += dead(gp.axes[2] || 0); input.camStick.y += dead(gp.axes[3] || 0);
    return { x, y, hit, ev: own, hold: !!(now[B.A] || now[B.X]) };
  });
}

// acciones de cada juego de teclas (sala): J1 flechas + espacio/enter + esc; J2 WASD + E (listo) + Q (volver)
const KEV1 = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down', Space: 'ok', Enter: 'ok', NumpadEnter: 'ok', ControlLeft: 'ok', ControlRight: 'ok', Escape: 'back', Backspace: 'back' };
const KEV2 = { KeyA: 'left', KeyD: 'right', KeyW: 'up', KeyS: 'down', KeyE: 'ok', KeyQ: 'back' };
const keyEv = (map) => [...pressed].map((c) => map[c]).filter(Boolean);

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
  input.camStick.x = 0; input.camStick.y = 0;
  const pads = pollPads(dt, ev);
  const k1 = keySet(K1), k2 = keySet(K2);
  const touch = { x: clamp((input.touch.r ? 1 : 0) - (input.touch.l ? 1 : 0) + input.touch.x, -1, 1), y: input.touch.y, hit: input.touch.hit };
  const extra = { x: 0, y: 0, hit: tap(EXTRA_HIT) };
  const c = input.ctl;
  c.all = merge(k1, k2, extra, touch, ...pads);
  c.p1 = merge(k1, pads[0], touch);
  c.p2 = merge(k2, pads[1]);
  c.p3 = merge(pads[2]);
  c.p4 = merge(pads[3]);
  const pe = (k) => (pads[k] ? pads[k].ev : []);
  input.pev = { p1: keyEv(KEV1).concat(pe(0)), p2: keyEv(KEV2).concat(pe(1)), p3: pe(2), p4: pe(3) };
  input.holdHit = any([...K1.hit, ...K2.hit, ...EXTRA_HIT, 'Enter']) || pads.some((p) => p.hold);
  input.touch.hit = false;
  pressed.clear();
  input.events = ev;
}

export const has = (a) => input.events.some((e) => e.a === a);
// online con un menú abierto: tu nave se queda quieta y no golpea
export function freezeControls() { for (const k in input.ctl) input.ctl[k] = zero(); }
