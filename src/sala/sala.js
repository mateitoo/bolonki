// La sala: antes de jugar, cada uno se une y elige personaje en una grilla de retratos (cada jugador
// mueve su marco de color); después se eligen las opciones (minijuego, CPU, puntos) y, antes de arrancar,
// una presentación muestra a todos parados en sus podios con su nombre abajo. Es la misma pantalla
// para solitario, local y online.
//
// Hay cuatro podios (k = 0..3, de izquierda a derecha). En local, el podio k es el jugador J(k+1)
// con sus controles (J1 flechas o joystick 1, J2 WASD o joystick 2, J3 y J4 joysticks 3 y 4).
// En online, el podio k es el lugar PODIUM_SLOT[k] de la sala (anfitrión, invitados).
// Los podios sin nadie son CPU (o quedan vacíos si no hay bots).
import { CHARS, DIFFICULTIES } from '../config.js';
import { game } from '../state.js';
import { settings, saveSettings } from '../settings.js';
import { input } from '../input.js';
import { SFX } from '../audio.js';
import { openMenu, replaceMenus, closeMenu, closeAllMenus, topMenu, footerHit } from '../ui/menu.js';
import { txt, rect, tri, textWidth, COL, ui } from '../ui/draw.js';
import { mgValues, pointsChoice, botValues, diffValues, mgArt } from '../ui/values.js';
import { drawThumb } from '../render/thumbStore.js';
import { camera } from '../render/psx.js';
import { drawPortrait } from '../render/portraits.js';
import { MINIGAMES, mgById } from '../minigames/registry.js';
import { resetMatch, pointsFor } from '../game/match.js';
import { applyChars, fillChars } from '../chars.js';
import { STAGE, PODIUM_SLOT, PODIUM_X, stagePuff } from './stage.js';
import { room, createRoom, leaveRoom, setRoomOpt, startBlocker, humanCount, setHostChar, sendChar, MAX_PLAYERS, broadcast, setRoomHandlers } from '../net/room.js';
import { hostStart } from '../net/online.js';
import { showToast, pingColor } from '../hud.js';
import * as THREE from 'three';

const PADS = ['p1', 'p2', 'p3', 'p4'];
// color de cada jugador (J1 azul, J2 rojo, J3 verde, J4 amarillo): el marco en la grilla y su tarjeta
const PCOL = ['#3f9bff', '#ff4a4a', '#39d98a', '#ffd23a'], PINK = ['#04101f', '#1f0404', '#04200f', '#241c00'];
const COLS = 5;                                                   // retratos por fila
const nSlots = () => Math.max(10, Math.ceil(CHARS.length / COLS) * COLS);
const S = {
  kind: 'fiesta',                                     // 'fiesta' | 'libre' (minijuegos sueltos)
  seats: [0, 1, 2, 3].map((k) => ({ joined: k === 0, ch: k, locked: false })),
  sentAt: 0,                                          // invitado: cuándo mandó su último cambio
};
// Lo que la sala necesita del resto del juego (se registra desde flow / multiplayer, sin imports circulares)
const hooks = { startLocal() {}, toMain() {}, toOnlineMenu() {}, withName(fn) { fn(); } };
export function setSalaHooks(h) { Object.assign(hooks, h); }

const net = () => (room.role === 'host' || room.role === 'guest' ? room.role : 'off');
const myK = () => (net() === 'guest' ? Math.max(0, PODIUM_SLOT.indexOf(room.mySlot)) : 0);
export const salaKind = () => S.kind;
const joinedCount = () => S.seats.filter((s) => s.joined).length;
const localBots = () => joinedCount() === 1 || settings.localBots;

/* ---------- quién hay en cada podio ---------- */
// { occ: 'human' | 'cpu' | 'none', ch, locked, name, mine (lo manejo yo), away, ping, host }
function seatInfo(k) {
  if (net() === 'off') {
    const s = S.seats[k];
    if (s.joined) return { occ: 'human', ch: s.ch, locked: s.locked, name: `J${k + 1}`, mine: true };
    return { occ: localBots() ? 'cpu' : 'none', ch: -1, locked: true, name: localBots() ? 'CPU' : '' };
  }
  const slot = PODIUM_SLOT[k], v = room.slots[slot];
  if (!v) return { occ: 'none', ch: -1, locked: true, name: '' };
  if (v.kind === 'empty') return { occ: room.opts.bots ? 'cpu' : 'none', ch: -1, locked: true, name: room.opts.bots ? 'CPU' : 'LIBRE' };
  const mine = k === myK();
  return {
    occ: 'human', mine, name: v.name, away: !!v.away, ping: v.ping || 0, host: v.kind === 'host',
    ch: mine ? S.seats[k].ch : v.ch | 0,
    locked: mine ? S.seats[k].locked : v.kind === 'host' ? true : !!v.ready,
  };
}
const infos = () => [0, 1, 2, 3].map(seatInfo);

// personajes que tienen los otros jugadores (no se pueden elegir)
function heldBy(k) {
  const set = new Set();
  infos().forEach((f, j) => { if (j !== k && f.occ === 'human') set.add(f.ch); });
  if (net() === 'host') room.slots.forEach((v, slot) => { if (slot !== 0 && v.kind !== 'empty') set.add(v.ch); });
  return set;
}
function firstFree(k, from) {
  const held = heldBy(k);
  for (let n = 0; n < CHARS.length; n++) { const c = (from + n) % CHARS.length; if (!held.has(c)) return c; }
  return from;
}

// Personajes en el escenario (los bots, con los que quedan libres)
function syncStage() {
  if (net() === 'guest') {
    // lo que dice el anfitrión manda, salvo que recién haya cambiado yo (su respuesta todavía no llegó)
    const v = room.slots[room.mySlot], k = myK();
    if (v && performance.now() - S.sentAt > 700) { S.seats[k].ch = v.ch | 0; S.seats[k].locked = !!v.ready; }
  }
  const fs = infos();
  const chars = [-1, -1, -1, -1];
  fs.forEach((f, k) => { STAGE.occ[k] = f.occ; STAGE.locked[k] = f.locked; if (f.occ === 'human') chars[PODIUM_SLOT[k]] = f.ch; });
  applyChars(fillChars(chars));
}

/* ---------- acciones de cada podio ---------- */
function cycle(k, d) {
  const held = heldBy(k), s = S.seats[k];
  let c = s.ch;
  for (let n = 0; n < CHARS.length; n++) { c = (c + d + CHARS.length) % CHARS.length; if (!held.has(c)) break; }
  if (c === s.ch) return;
  s.ch = c; STAGE.pick[k] = 1; SFX.move(); stagePuff(k, false);
  share(k);
}
// arriba / abajo en la grilla (de a una fila); si ahí no hay personaje o lo tiene otro, no se mueve
function moveRow(k, d) {
  const s = S.seats[k], c = s.ch + d * COLS;
  if (c < 0 || c >= CHARS.length || heldBy(k).has(c)) { SFX.move(); return; }
  s.ch = c; STAGE.pick[k] = 1; SFX.move(); share(k);
}
// con el mouse: un clic mueve el marco a ese personaje (se confirma con espacio)
function pickChar(k, c) {
  const s = S.seats[k];
  if (s.locked || c < 0 || c >= CHARS.length || c === s.ch) return;
  if (heldBy(k).has(c)) return;
  s.ch = c; STAGE.pick[k] = 1; SFX.move(); share(k);
}
function share(k) {
  const s = S.seats[k];
  if (net() === 'host' && k === 0) setHostChar(s.ch);
  else if (net() === 'guest' && k === myK()) { S.sentAt = performance.now(); sendChar(s.ch, s.locked); }
}
function lock(k, on) {
  const s = S.seats[k];
  if (s.locked === on) return;
  if (on && heldBy(k).has(s.ch)) { s.ch = firstFree(k, s.ch); }   // se lo ganaron de mano
  s.locked = on;
  if (on) { STAGE.lockT[k] = 1; stagePuff(k, true); SFX.confirm(); } else SFX.back();
  if (on && k === 0 && net() !== 'guest') { settings.char = s.ch; saveSettings(); }
  if (on && k === myK() && net() === 'guest') { settings.char = s.ch; saveSettings(); }
  share(k);
  // todos listos: a las opciones (en local y como anfitrión)
  if (on && net() !== 'guest' && S.seats.every((q) => !q.joined || q.locked)) openOptions();
}
function join(k) {
  const s = S.seats[k];
  s.joined = true; s.locked = false; s.ch = firstFree(k, k);
  STAGE.pick[k] = 1; stagePuff(k, true); SFX.confirm();
}
function unjoin(k) { S.seats[k].joined = false; S.seats[k].locked = false; SFX.back(); }
function leave() {
  SFX.back();
  if (net() === 'guest') { leaveRoom(); hooks.toOnlineMenu(); return; }
  if (net() === 'host') leaveRoom();
  hooks.toMain();
}

function seatAction(k, a) {
  const s = S.seats[k];
  if (!s.joined) { if (a === 'ok' && k > 0 && net() === 'off') join(k); return; }
  if (!s.locked) {
    if (a === 'left' || a === 'right') cycle(k, a === 'left' ? -1 : 1);
    else if (a === 'up' || a === 'down') moveRow(k, a === 'up' ? -1 : 1);
    else if (a === 'ok') lock(k, true);
    else if (a === 'back') { if (k === myK()) leave(); else unjoin(k); }
  } else if (a === 'back') lock(k, false);
  else if (a === 'ok' && net() !== 'guest' && k === 0 && S.seats.every((q) => !q.joined || q.locked)) openOptions();
}

/* ---------- entrar a la sala ---------- */
function stageSetup() {
  return { mode: 'demo', mg: 'sala', ctrl: ['ai', 'ai', 'ai', 'ai'], me: -1, points: 1 };
}
function showStage() {
  if (game.minigame !== 'sala' || game.state !== 'menu') resetMatch('menu', stageSetup());
  game.state = 'menu';
  syncStage();
}

// Sala local (solitario o varios en la misma compu). keep: volver con los mismos jugadores (después de jugar)
export function openSala(kind, keep) {
  S.kind = kind;
  if (!keep) {
    S.seats.forEach((s, k) => { s.joined = k === 0; s.locked = false; s.ch = k; });
    S.seats[0].ch = settings.char >= 0 && settings.char < CHARS.length ? settings.char : 0;
  } else S.seats.forEach((s) => { s.locked = false; });
  replaceMenus(SALA);
  showStage();
}
// Sala online: el anfitrión (recién creada o de vuelta de una partida) o un invitado que entró
export function openSalaOnline(fromGame) {
  S.kind = room.opts.mode === 'fiesta' ? 'fiesta' : 'libre';
  const k = myK();
  S.seats.forEach((s, j) => { s.joined = j === k; s.locked = false; });
  const v = room.slots[room.mySlot];
  S.seats[k].ch = v ? v.ch | 0 : 0;
  // el anfitrión que vuelve de una partida ya eligió: va directo a las opciones
  if (fromGame && net() === 'host') S.seats[0].locked = true;
  replaceMenus(SALA);
  showStage();
  if (fromGame && net() === 'host') openOptions();
}
// Crear sala online de un tipo (desde el menú ONLINE)
export function hostSala(kind) {
  hooks.withName(() => {
    S.kind = kind;
    const ch = settings.char >= 0 && settings.char < CHARS.length ? settings.char : 0;
    createRoom(kind === 'fiesta' ? 'fiesta' : 'libre', ch);
    openSalaOnline(false);
  });
}
// Desde las opciones de la sala local: pasar a online (solo si hay un jugador en esta compu)
function goOnline() {
  if (joinedCount() > 1) { showToast('EN ONLINE JUEGA UNO POR COMPU'); return; }
  hooks.withName(() => {
    createRoom(S.kind === 'fiesta' ? 'fiesta' : 'libre', S.seats[0].ch);
    S.seats[0].locked = true;
    replaceMenus(SALA); openOptions();
  });
}

/* ---------- pantalla de elegir personaje: grilla de retratos ---------- */
let tileRects = [], cardRects = [];
function joinHint(k) {
  if (k === 1) return input.pads >= 2 ? 'E / JOY2' : 'APRETÁ E';
  return `JOY${k + 1}: A`;
}
// cuadrícula: 5 por fila, tan grande como entre (en pantalla ancha, unos 58 px por retrato)
function gridGeom(hw, top, bottom) {
  const n = nSlots(), rows = n / COLS, gap = 6;
  const T = Math.max(30, Math.min(58, Math.floor((hw - 24 - (COLS - 1) * gap) / COLS), Math.floor((bottom - top - (rows - 1) * gap) / rows)));
  const W = COLS * T + (COLS - 1) * gap;
  return { n, rows, gap, T, x0: Math.round(hw / 2 - W / 2), y0: top };
}
function chip(label, x, y, k) {
  const w = textWidth(label, 8) + 4;
  rect(x, y, w, 10, k >= 0 ? PCOL[k] : '#2a3150'); txt(label, x + 2, y + 1, 8, k >= 0 ? PINK[k] : COL.text);
  return w;
}
function tick(x, y) {                                            // tilde de "listo" (la fuente no la trae)
  rect(x - 1, y - 1, 10, 9, '#0b1020');
  [[0, 3], [1, 4], [2, 5], [3, 4], [4, 3], [5, 2], [6, 1], [7, 0]].forEach(([a, b]) => rect(x + a, y + b, 1, 2, '#39d98a'));
}
function frame(x, y, w, h, col, t = 1) { rect(x, y, w, t, col); rect(x, y + h - t, w, t, col); rect(x, y, t, h, col); rect(x + w - t, y, t, h, col); }
// quién es (para la tarjeta y la presentación)
function whoLabel(f, k) {
  if (f.occ !== 'human') return f.occ === 'cpu' ? 'CPU' : '';
  if (net() !== 'off') return k === myK() ? 'VOS' : (f.name || 'JUG').slice(0, 8);
  return joinedCount() === 1 && k === 0 ? 'VOS' : `J${k + 1}`;
}

const SALA = {
  id: 'sala', style: 'custom', dim: 'rgba(0,0,0,0)',
  input() {
    syncStage();
    if (net() === 'off') {
      const solo = joinedCount() === 1;
      for (let k = 0; k < 4; k++) {
        if (k === 0 && solo) continue;                 // J1 solo: cualquier teclado o su joystick (más abajo)
        for (const a of input.pev[PADS[k]]) { if (!here()) return; seatAction(k, a); }
      }
      if (solo) for (const e of input.events) {
        if (!here()) return;
        if (e.pad !== undefined && e.pad > 0) continue; // los otros joysticks son de J2..J4
        const a = globalAct(e); if (a) seatAction(0, a);
      }
    } else {
      for (const e of input.events) { if (!here()) return; const a = globalAct(e); if (a) seatAction(myK(), a); }
    }
    // mouse / táctil: clic en un retrato (mueve el marco) o en la barra de abajo
    for (const e of input.events) {
      if (e.a !== 'click' || !here()) continue;
      const act = footerHit(e.x, e.y);
      if (act) { seatAction(myK(), act); continue; }
      const t = tileRects.find((q) => e.x >= q.x && e.x <= q.x + q.w && e.y >= q.y && e.y <= q.y + q.h);
      if (t) pickChar(myK(), t.c);
    }
  },
  draw(hw) {
    tileRects = []; cardRects = [];
    const fs = infos(), k0 = myK(), blink = ((ui.clock * 2.4) | 0) % 2 === 0;
    rect(0, 0, hw, 240, 'rgba(8,11,24,.93)');             // fondo (el escenario queda apenas atrás)
    // título
    txt(net() !== 'off' && hw < 430 ? 'PERSONAJES' : 'ELEGÍ TU PERSONAJE', 12, 7, 16, COL.gold, 'left', COL.goldShadow);
    const me = S.seats[k0];
    const sub = net() === 'guest' && me.locked ? 'ESPERANDO AL ANFITRIÓN' : me.locked && net() !== 'guest' ? 'ESPERANDO A LOS DEMÁS'
      : S.kind === 'fiesta' ? 'FIESTA' : 'MINIJUEGOS';
    txt(sub, 12, 26, 8, COL.teal);
    // online: código de la sala y cómo viene
    if (net() !== 'off') {
      const code = room.code || '····';
      txt('SALA', hw - 12 - textWidth(code, 16) - 8, 11, 8, COL.dim, 'right');
      txt(code, hw - 12, 7, 16, COL.gold, 'right', COL.goldShadow);
      const st = room.status === 'error' ? room.error : room.status === 'reconnecting' ? 'RECONECTANDO...'
        : net() === 'host' ? (room.status === 'ready' ? `${humanCount()}/${MAX_PLAYERS} · COMPARTÍ EL CÓDIGO` : 'CREANDO SALA...')
        : `${room.myPing || '--'} MS`;
      txt(st, hw - 12, 26, 8, net() === 'guest' ? pingColor(room.myPing || 0) : room.status === 'error' ? COL.red : COL.dim, 'right');
    }
    let top = 40;
    // invitado: qué se va a jugar (lo elige el anfitrión)
    if (net() === 'guest') {
      const mgId = room.opts.mode === 'fiesta' ? 'fiesta' : room.opts.mg, m = mgById(mgId);
      const bots = room.opts.bots ? DIFFICULTIES[room.opts.difficulty].label : 'SIN CPU';
      txt(`${m.name} · ${m.points.label} ${room.opts[m.points.key] || '-'} · ${bots}`, hw / 2, 38, 8, COL.text, 'center');
      top = 50;
    }
    // quién tiene cada personaje (jugadores, con su número)
    const owner = {};
    fs.forEach((f, k) => { if (f.occ === 'human') owner[f.ch] = k; });
    // la grilla
    const G = gridGeom(hw, top, 160);
    for (let i = 0; i < G.n; i++) {
      const x = G.x0 + (i % COLS) * (G.T + G.gap), y = G.y0 + ((i / COLS) | 0) * (G.T + G.gap);
      if (i >= CHARS.length) {                             // lugar para un personaje que todavía no está
        rect(x, y, G.T, G.T, '#0d1226');
        for (let d = 0; d < G.T; d += 4) { rect(x + d, y, 2, 1, '#2a3150'); rect(x + d, y + G.T - 1, 2, 1, '#2a3150'); rect(x, y + d, 1, 2, '#2a3150'); rect(x + G.T - 1, y + d, 1, 2, '#2a3150'); }
        txt('?', x + G.T / 2, y + G.T / 2 - 8, 16, '#3a4260', 'center');
        continue;
      }
      const k = owner[i], f = k !== undefined ? fs[k] : null;
      const taken = f && f.locked;
      drawPortrait(i, x, y, G.T, G.T, taken && k !== k0);
      rect(x, y + G.T - 11, G.T, 11, 'rgba(4,6,14,.78)');
      txt(CHARS[i].name, x + G.T / 2, y + G.T - 10, 8, CHARS[i].col, 'center');
      if (f) {
        // marco del jugador (titila mientras elige; fijo cuando ya está listo)
        const on = f.locked || blink || (net() !== 'off' && k !== k0);
        frame(x - 3, y - 3, G.T + 6, G.T + 6, '#0b1020', 1);
        if (on) { frame(x - 2, y - 2, G.T + 4, G.T + 4, PCOL[k], 2); }
        chip(`J${k + 1}`, x - 2, y - 2, k);
        if (f.locked) tick(x + G.T - 11, y + 3);
      } else frame(x, y, G.T, G.T, '#2a3150', 1);
      tileRects.push({ c: i, x, y, w: G.T, h: G.T });
    }
    // tarjetas de los jugadores (finitas)
    const cw = Math.floor((hw - 24 - 3 * 6) / 4), cy = 168, ch = 46, wide = cw >= 96;
    fs.forEach((f, k) => {
      const x = 12 + k * (cw + 6), human = f.occ === 'human';
      const c = human ? f.ch : f.occ === 'cpu' ? game.chars[PODIUM_SLOT[k]] : -1;
      const chr = c >= 0 ? CHARS[c] : null;
      rect(x, cy, cw, ch, human ? 'rgba(6,10,22,.94)' : 'rgba(6,10,22,.6)');
      if (human) frame(x, cy, cw, ch, PCOL[k], 2);
      else for (let d = 0; d < cw; d += 4) { rect(x + d, cy, 2, 1, '#2a3150'); rect(x + d, cy + ch - 1, 2, 1, '#2a3150'); }
      const P = wide ? 38 : 20, px = x + 4, py = cy + 4;
      if (chr) { drawPortrait(c, px, py, P, P, !human); frame(px, py, P, P, '#0b1020', 1); }
      const tx = chr ? px + P + 5 : x + 5;
      // J1 + nombre
      const cw2 = chip(human ? `J${k + 1}` : f.occ === 'cpu' ? 'CPU' : `J${k + 1}`, tx, cy + 5, human ? k : -1);
      const who = whoLabel(f, k);
      if (human && who && who !== `J${k + 1}`) txt(who, tx + cw2 + 3, cy + 6, 8, COL.text);
      if (net() === 'host' && human && !f.mine && !f.away && f.ping) txt(`${f.ping}`, x + cw - 4, cy + 6, 8, pingColor(f.ping), 'right');
      // personaje
      const ly = wide ? cy + 19 : cy + 27, lx = wide ? tx : x + 5;
      if (chr) txt(chr.name, lx, ly, 8, human ? chr.col : COL.dim);
      // estado
      let st = '', sc = COL.dim;
      if (human) {
        if (f.away) { st = 'SE CORTÓ'; sc = COL.red; }
        else if (f.locked) { st = f.host && net() === 'guest' ? 'ANFITRIÓN' : '¡LISTO!'; sc = COL.gold; }
        else { st = wide ? 'ELIGIENDO…' : 'ELIGE…'; sc = COL.teal; }
      } else if (net() === 'off' && k > 0) { st = joinHint(k); sc = input.pads > k || k === 1 ? COL.text : COL.dim; }
      else if (f.occ === 'cpu') st = DIFFICULTIES[net() === 'off' ? settings.difficulty : room.opts.difficulty].label.slice(0, wide ? 10 : 8);
      if (st) txt(st, lx, wide ? cy + 32 : cy + 37, 8, sc);
      cardRects.push({ k, x, y: cy, w: cw, h: ch });
    });
  },
  footer() {
    const pad = input.device === 'gamepad', mouse = input.device === 'pointer', mine = S.seats[myK()];
    const parts = [];
    if (!mine.locked) parts.push({ key: pad ? 'STICK' : mouse ? 'CLIC' : 'FLECHAS', label: 'MOVER', act: null });
    if (!(mine.locked && net() === 'guest')) parts.push({ key: pad ? 'A' : 'ESPACIO', label: mine.locked ? 'SEGUIR' : 'ELEGIR', act: 'ok' });
    parts.push({ key: pad ? 'B' : 'ESC', label: mine.locked ? 'CAMBIAR' : 'VOLVER', act: 'back' });
    return parts;
  },
  onBack() {},
};
const here = () => !!topMenu() && topMenu().def === SALA;
// eventos generales -> acción de la sala
function globalAct(e) {
  if (e.a === 'left' || e.a === 'right' || e.a === 'up' || e.a === 'down') return e.a;
  if (e.a === 'confirm' || e.a === 'start') return 'ok';
  if (e.a === 'back') return 'back';
  return null;
}

/* ---------- opciones (después de elegir) ---------- */
const setS = (key) => (v) => { settings[key] = v; saveSettings(); };
const curMgLocal = () => (S.kind === 'fiesta' ? 'fiesta' : settings.mg);
const curMgRoom = () => (room.opts.mode === 'fiesta' ? 'fiesta' : room.opts.mg);

// Fila con las fotos de todos los minijuegos: izquierda/derecha elige, clic en una foto la elige
function mgGrid(get, setFn) {
  let boxes = [];
  const H = 70;
  return {
    kind: 'choice', label: 'MINIJUEGO', h: H, get values() { return mgValues(); }, get, set: setFn,
    drawRow(x, y, w, hw, sel) {
      const n = MINIGAMES.length, gap = 6;
      const tw = Math.min(64, Math.floor((w - 40 - gap * (n - 1)) / n)), th = Math.round((tw * 9) / 16);
      let tx = Math.round(hw / 2 - (n * tw + (n - 1) * gap) / 2);
      boxes = [];
      MINIGAMES.forEach((m) => {
        const on = m.id === get();
        if (on) rect(tx - 3, y + 1, tw + 6, th + 6, sel ? COL.gold : COL.teal);
        drawThumb(m.id, tx, y + 4, tw, th);
        if (!on) rect(tx, y + 4, tw, th, 'rgba(4,6,14,.45)');
        boxes.push({ id: m.id, x: tx, w: tw });
        tx += tw + gap;
      });
      if (sel) { tri(x + 10, y + 4 + th / 2 - 4, 'l', COL.gold); tri(x + w - 14, y + 4 + th / 2 - 4, 'r', COL.gold); }
      const m = mgById(get());
      txt(m.name, hw / 2, y + th + 11, 8, sel ? COL.gold : COL.white, 'center');
      txt(m.desc, hw / 2, y + th + 23, 8, COL.teal, 'center');
    },
    clickAt(px) {
      const b = boxes.find((q) => px >= q.x - 3 && px <= q.x + q.w + 3);
      if (b && b.id !== get()) { setFn(b.id); SFX.select(); }
    },
  };
}

function localOptions() {
  const fiesta = S.kind === 'fiesta';
  const items = [];
  if (fiesta) {
    items.push(mgArt(() => 'fiesta', 50));
    items.push({ kind: 'info', center: true, label: () => mgById('fiesta').desc, labelColor: () => COL.teal });
  } else {
    items.push(mgGrid(() => settings.mg, setS('mg')));
  }
  items.push({
    kind: 'choice', label: 'CPU', hidden: () => joinedCount() >= 4,
    get values() { return joinedCount() >= 2 ? botValues : diffValues; },
    get: () => (joinedCount() >= 2 && !settings.localBots ? 'no' : settings.difficulty),
    set: (v) => {
      if (v === 'no') settings.localBots = false;
      else { settings.localBots = true; settings.difficulty = v; game.difficulty = v; }
      saveSettings();
    },
  });
  items.push(pointsChoice(curMgLocal, () => pointsFor(curMgLocal()), (v) => { settings[mgById(curMgLocal()).points.key] = v; saveSettings(); }));
  items.push({ kind: 'action', label: 'JUGAR ONLINE', left: true, value: 'INVITAR AMIGOS', valueColor: () => COL.dim, action: () => goOnline() });
  items.push({ kind: 'action', label: 'COMENZAR', action: () => startLocal() });
  return items;
}

function hostOptions() {
  const fiesta = room.opts.mode === 'fiesta';
  const items = [];
  if (fiesta) items.push(mgArt(() => 'fiesta', 44));
  else items.push(mgGrid(() => room.opts.mg, (v) => { settings.mg = v; saveSettings(); setRoomOpt('mg', v); }));
  items.push({ kind: 'choice', label: 'BOTS', values: botValues, get: () => (room.opts.bots ? room.opts.difficulty : 'no'),
    set: (v) => { if (v !== 'no') room.opts.difficulty = v; setRoomOpt('bots', v !== 'no'); } });
  items.push(pointsChoice(curMgRoom, () => room.opts[mgById(curMgRoom()).points.key], (v) => setRoomOpt(mgById(curMgRoom()).points.key, v)));
  items.push({ kind: 'choice', label: 'SALA', values: [{ v: false, label: 'PRIVADA' }, { v: true, label: 'PÚBLICA' }],
    get: () => room.opts.public, set: (v) => setRoomOpt('public', v) });
  items.push({ kind: 'action', label: 'COMENZAR', action: () => {
    const why = startBlocker();
    if (why) { showToast(why); return; }
    hostPresent();
  } });
  return items;
}

function hostHeader(x, y, w, hw) {
  const why = startBlocker();
  txt(`SALA ${room.code || '····'} · ${humanCount()}/${MAX_PLAYERS}`, hw / 2, y, 8, COL.gold, 'center');
  txt(why || 'TODOS LISTOS', hw / 2, y + 12, 8, why ? COL.dim : '#39d98a', 'center');
  rect(x + 6, y + 24, w - 12, 1, '#1d6e68');
}

function openOptions() {
  if (topMenu() && topMenu().def.id === 'salaOpts') return;
  const online = net() === 'host';
  const def = {
    id: 'salaOpts', width: 300, rowH: 13, offsetY: 6,
    title: S.kind === 'fiesta' ? (online ? 'FIESTA ONLINE' : 'FIESTA') : online ? 'MINIJUEGOS ONLINE' : 'MINIJUEGOS',
    items: online ? hostOptions() : localOptions(),
    headerH: online ? 28 : 0, header: online ? hostHeader : null,
    // cada frame: el escenario sigue vivo y (en local) alguien más puede sumarse apretando su botón
    tick() {
      syncStage();
      if (net() !== 'off') return;
      for (let k = 1; k < 4; k++) {
        if (!S.seats[k].joined && input.pev[PADS[k]].includes('ok')) { closeMenu(); S.seats[0].locked = false; join(k); return; }
      }
    },
    // en local, los joysticks de J2..J4 no manejan este menú (solo J1, el teclado y el mouse)
    onEvent: (e) => net() === 'off' && e.pad !== undefined && e.pad > 0,
    onBack() { closeMenu(); lock(myK(), false); },
  };
  openMenu(def);
  SFX.confirm();
}

/* ---------- arrancar (local / solitario) ---------- */
function startLocal() {
  const seats = S.seats.map((s, k) => ({ ...s, k }));
  const humans = seats.filter((s) => s.joined);
  const bots = localBots();
  if (!bots && humans.length < 2) { showToast('FALTAN JUGADORES (O PONÉ CPU)'); return; }
  const solo = humans.length === 1;
  const ctrl = ['none', 'none', 'none', 'none'], pads = [null, null, null, null], names = [null, null, null, null], chars = [-1, -1, -1, -1];
  seats.forEach((s) => {
    const slot = PODIUM_SLOT[s.k];
    if (s.joined) { ctrl[slot] = 'local'; pads[slot] = solo ? 'all' : PADS[s.k]; names[slot] = solo ? null : `J${s.k + 1}`; chars[slot] = s.ch; }
    else if (bots) ctrl[slot] = 'ai';
  });
  const setup = { mode: solo ? 'solo' : 'local', ctrl, pads, names, me: 0, chars: fillChars(chars) };
  // presentación: cada uno en su podio con su nombre abajo, y después arranca
  const HOW = ['FLECHAS/JOY1', 'WASD/JOY2', 'JOYSTICK 3', 'JOYSTICK 4'];
  const m = mgById(S.kind === 'fiesta' ? 'fiesta' : settings.mg);
  const info = {
    title: m.name, desc: m.desc,
    sub: S.kind === 'fiesta' ? `FIESTA · ${settings.turns} TURNOS` : `${m.points.label} ${pointsFor(m.id)}`,
    seats: seats.map((q) => {
      const slot = PODIUM_SLOT[q.k], occ = ctrl[slot] === 'local' ? 'human' : ctrl[slot] === 'ai' ? 'cpu' : 'none';
      return {
        occ, slot, ch: setup.chars[slot], k: q.k,
        name: occ === 'cpu' ? 'CPU' : solo ? 'VOS' : `J${q.k + 1}`,
        how: occ === 'cpu' ? DIFFICULTIES[settings.difficulty].label : solo ? '' : HOW[q.k],
        short: occ === 'cpu' ? DIFFICULTIES[settings.difficulty].label.slice(0, 8) : solo ? '' : ['TECLADO', 'WASD', 'JOY 3', 'JOY 4'][q.k],
      };
    }),
  };
  showPresentation(info, () => hooks.startLocal(S.kind, setup), true);
}

/* ---------- presentación antes de arrancar: los personajes en sus podios con el nombre de cada uno ---------- */
const PR = { t0: 0, dur: 5, info: null, done: null, skip: true, jumped: 0 };
function showPresentation(info, done, skip) {
  Object.assign(PR, { info, done, skip, t0: performance.now(), jumped: 0 });
  if (game.minigame !== 'sala' || game.state !== 'menu') resetMatch('menu', stageSetup());
  game.state = 'menu';
  const chars = [-1, -1, -1, -1];
  info.seats.forEach((f, k) => { STAGE.occ[k] = f.occ; STAGE.locked[k] = true; STAGE.lockT[k] = 0; if (f.ch >= 0) chars[PODIUM_SLOT[k]] = f.ch; });
  applyChars(fillChars(chars));
  replaceMenus(PRESENT);
  SFX.bonus();
}
// online: el anfitrión muestra la presentación a todos y después arranca
function hostPresent() {
  const names = room.slots.map((v) => (v.kind === 'empty' ? null : v.name));
  const chars = fillChars(room.slots.map((v) => (v.kind === 'empty' ? -1 : v.ch)));
  const m = mgById(curMgRoom());
  const info = {
    title: m.name, desc: m.desc,
    sub: room.opts.mode === 'fiesta' ? `FIESTA ONLINE · ${room.opts.turns} TURNOS` : `ONLINE · ${m.points.label} ${room.opts[m.points.key]}`,
    seats: [0, 1, 2, 3].map((k) => {
      const slot = PODIUM_SLOT[k], v = room.slots[slot];
      const occ = !v ? 'none' : v.kind === 'empty' ? (room.opts.bots ? 'cpu' : 'none') : 'human';
      return { occ, slot, k, ch: chars[slot], name: occ === 'cpu' ? 'CPU' : (names[slot] || '').slice(0, 10),
        how: occ === 'cpu' ? DIFFICULTIES[room.opts.difficulty].label : v && v.kind === 'host' ? 'ANFITRIÓN' : 'ONLINE' };
    }),
  };
  broadcast({ t: 'present', info });
  showPresentation(info, () => { closeAllMenus(); hostStart(); }, true);
}
setRoomHandlers({ onPresent(m) { if (m && m.info) showPresentation(m.info, null, false); } });

const PRESENT = {
  id: 'present', style: 'custom', dim: 'rgba(0,0,0,0)',
  input() {
    const el = (performance.now() - PR.t0) / 1000;
    // saltito de festejo, uno atrás del otro
    while (PR.jumped < 4 && el > 0.25 + PR.jumped * 0.22) { const k = PR.jumped++; if (STAGE.occ[k] !== 'none') { STAGE.lockT[k] = 1; stagePuff(k, true); } }
    // (no se puede saltear: dura lo mismo para todos; mientras tanto se puede girar a los personajes arrastrando)
    if (el >= PR.dur && PR.done) { const d = PR.done; PR.done = null; SFX.confirm(); d(); }
  },
  draw(hw) {
    const info = PR.info; if (!info) return;
    const el = (performance.now() - PR.t0) / 1000;
    // arriba: qué se juega
    rect(0, 0, hw, 40, 'rgba(4,6,14,.82)'); rect(0, 40, hw, 1, '#1d6e68');
    txt(info.sub, 12, 6, 8, COL.teal);
    txt(info.title, 12, 18, 16, COL.gold, 'left', COL.goldShadow);
    if (hw >= 380) txt(info.desc, hw - 12, 18, 8, COL.text, 'right');
    // abajo de cada podio: quién es, con qué personaje y cómo juega
    const mySlot = net() === 'guest' ? room.mySlot : net() === 'host' ? 0 : -1;
    info.seats.forEach((f, k) => {
      if (f.occ === 'none') return;
      const v = new THREE.Vector3(PODIUM_X[k], 0.3, 0.4).project(camera);
      const cx = Math.round((v.x + 1) / 2 * hw), w = Math.min(104, Math.floor(hw / 4) - 6), x = Math.max(2, Math.min(hw - 2 - w, cx - w / 2)), y = 172, h = 40;
      const human = f.occ === 'human', ch = CHARS[f.ch];
      rect(x, y, w, h, 'rgba(6,10,22,.94)');
      frame(x, y, w, h, human ? PCOL[k] : '#2a3150', human ? 2 : 1);
      const name = f.slot === mySlot ? 'VOS' : f.name;
      txt(name, x + w / 2, y + 5, 8, human ? COL.white : COL.dim, 'center');
      if (ch) txt(ch.name, x + w / 2, y + 17, 8, ch.col, 'center');
      const how = f.how && f.how.length * 8 > w - 4 ? (f.short || f.how) : f.how;
      if (how) txt(how.slice(0, Math.floor((w - 4) / 8)), x + w / 2, y + 29, 8, COL.dim, 'center');
    });
    // abajo: ¡preparados!
    rect(0, 221, hw, 19, 'rgba(4,6,14,.85)');
    const left = Math.max(1, Math.ceil(PR.dur - el));
    const line = PR.done ? `¡PREPARADOS! · EMPIEZA EN ${left}` : '¡PREPARADOS!';
    const hint = hw >= 420 && input.device !== 'gamepad';
    txt(line, hint ? 12 : hw / 2, 227, 8, COL.gold, hint ? 'left' : 'center');
    if (hint) txt('ARRASTRÁ PARA GIRARLOS', hw - 12, 227, 8, COL.dim, 'right');
  },
};
