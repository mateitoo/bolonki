// La sala: antes de jugar, cada uno se une y elige personaje; después se eligen las opciones
// (minijuego, CPU, puntos) y se arranca. Es la misma pantalla para solitario, local y online.
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
import { MINIGAMES, mgById } from '../minigames/registry.js';
import { resetMatch, pointsFor } from '../game/match.js';
import { applyChars, fillChars } from '../chars.js';
import { STAGE, PODIUM_SLOT, PODIUM_X, stagePuff } from './stage.js';
import { room, createRoom, leaveRoom, setRoomOpt, startBlocker, humanCount, setHostChar, sendChar, MAX_PLAYERS } from '../net/room.js';
import { hostStart } from '../net/online.js';
import { showToast, pingColor } from '../hud.js';
import * as THREE from 'three';

const PADS = ['p1', 'p2', 'p3', 'p4'];
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

/* ---------- pantalla de elegir personaje ---------- */
const v3 = new THREE.Vector3();
let cardRects = [];
function cardBox(hw, k) {
  v3.set(PODIUM_X[k], 0.3, 0.4).project(camera);
  const cx = Math.round((v3.x + 1) / 2 * hw), cw = Math.min(100, Math.floor(hw / 4) - 6);
  return { x: Math.max(2, Math.min(hw - 2 - cw, cx - cw / 2)), y: 170, w: cw, h: 46, cx };
}
function joinHint(k) {
  if (k === 1) return input.pads >= 2 ? 'E / JOY2' : 'APRETÁ E';
  return `JOY${k + 1}: A`;
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
    // mouse / táctil: flechas y tarjeta del jugador de esta compu, y la barra de abajo
    for (const e of input.events) {
      if (e.a !== 'click' || !here()) continue;
      const act = footerHit(e.x, e.y);
      if (act) { seatAction(myK(), act); continue; }
      const r = cardRects.find((q) => e.x >= q.x && e.x <= q.x + q.w && e.y >= q.y && e.y <= q.y + q.h);
      if (!r || r.k !== myK()) continue;
      const s = S.seats[r.k];
      if (!s.locked && e.x < r.x + r.w * 0.3) seatAction(r.k, 'left');
      else if (!s.locked && e.x > r.x + r.w * 0.7) seatAction(r.k, 'right');
      else seatAction(r.k, 'ok');
    }
  },
  draw(hw) {
    cardRects = [];
    const fs = infos(), k0 = myK(), blink = ((ui.clock * 2.4) | 0) % 2 === 0;
    // título
    rect(0, 0, hw, 42, 'rgba(4,6,14,.55)');
    txt(S.kind === 'fiesta' ? 'FIESTA' : 'MINIJUEGOS', 12, 8, 16, COL.gold, 'left', COL.goldShadow);
    const me = S.seats[k0];
    const sub = net() === 'guest' && me.locked ? 'ESPERANDO AL ANFITRIÓN' : me.locked && net() !== 'guest' ? 'ESPERANDO A LOS DEMÁS' : 'ELEGÍ TU PERSONAJE';
    txt(sub, 12, 28, 8, COL.teal);
    // online: código de la sala y cómo viene
    if (net() !== 'off') {
      const code = room.code || '····';
      txt('SALA', hw - 12 - textWidth(code, 16) - 8, 12, 8, COL.dim, 'right');
      txt(code, hw - 12, 8, 16, COL.gold, 'right', COL.goldShadow);
      const st = room.status === 'error' ? room.error : room.status === 'reconnecting' ? 'RECONECTANDO...'
        : net() === 'host' ? (room.status === 'ready' ? `${humanCount()}/${MAX_PLAYERS} · COMPARTÍ EL CÓDIGO` : 'CREANDO SALA...')
        : `${room.myPing || '--'} MS`;
      txt(st, hw - 12, 28, 8, net() === 'guest' ? pingColor(room.myPing || 0) : room.status === 'error' ? COL.red : COL.dim, 'right');
    }
    // invitado: qué se va a jugar (lo elige el anfitrión)
    if (net() === 'guest') {
      const mgId = room.opts.mode === 'fiesta' ? 'fiesta' : room.opts.mg, m = mgById(mgId);
      const bots = room.opts.bots ? DIFFICULTIES[room.opts.difficulty].label : 'SIN CPU';
      const line = `${m.name} · ${m.points.label} ${room.opts[m.points.key] || '-'} · ${bots}`;
      rect(0, 46, hw, 14, 'rgba(4,6,14,.55)');
      txt(line, hw / 2, 49, 8, COL.text, 'center');
    }
    // tarjetas abajo de cada podio
    fs.forEach((f, k) => {
      const b = cardBox(hw, k), s = S.seats[k];
      const ch = f.occ === 'human' ? CHARS[f.ch] : f.occ === 'cpu' ? CHARS[game.chars[PODIUM_SLOT[k]]] : null;
      const human = f.occ === 'human', mine = human && f.mine && (net() !== 'off' ? k === k0 : true);
      rect(b.x, b.y, b.w, b.h, human ? 'rgba(6,10,22,.9)' : 'rgba(6,10,22,.6)');
      const bc = human && ch ? ch.col : '#2a3150';
      rect(b.x, b.y, b.w, 1, bc); rect(b.x, b.y + b.h - 1, b.w, 1, bc); rect(b.x, b.y, 1, b.h, bc); rect(b.x + b.w - 1, b.y, 1, b.h, bc);
      // quién es
      let who = f.name || '';
      if (net() !== 'off' && k === k0) who = 'VOS';
      else if (net() === 'off' && joinedCount() === 1 && k === 0) who = 'VOS';
      txt(who, b.cx, b.y + 4, 8, human && ch ? ch.col : COL.dim, 'center');
      // personaje con flechas mientras elige
      if (ch) {
        const nameCol = !human ? COL.dim : f.locked ? COL.gold : COL.white;
        txt(ch.name, b.cx, b.y + 17, 8, nameCol, 'center');
        if (human && !f.locked && (net() === 'off' || k === k0)) {
          const tw = textWidth(ch.name, 8);
          tri(b.cx - tw / 2 - 10, b.y + 17, 'l', COL.teal); tri(b.cx + tw / 2 + 5, b.y + 17, 'r', COL.teal);
        }
      }
      // estado
      let st = '', sc = COL.dim;
      if (human) {
        if (f.away) { st = 'SE CORTÓ'; sc = COL.red; }
        else if (f.locked) { st = f.host && net() === 'guest' ? 'ANFITRIÓN' : 'LISTO'; sc = '#39d98a'; }
        else { st = mine || net() === 'off' ? (blink ? 'ELEGÍ' : '') : 'ELIGIENDO'; sc = COL.teal; }
        if (net() === 'host' && !f.mine && !f.away && f.ping) { txt(`${f.ping}`, b.x + b.w - 3, b.y + 4, 8, pingColor(f.ping), 'right'); }
      } else if (net() === 'off' && k > 0) { st = joinHint(k); sc = input.pads > k || k === 1 ? COL.text : COL.dim; }
      else if (f.occ === 'cpu') st = DIFFICULTIES[net() === 'off' ? settings.difficulty : room.opts.difficulty].label.slice(0, 10);
      txt(st, b.cx, b.y + 31, 8, sc, 'center');
      cardRects.push({ k, x: b.x, y: b.y, w: b.w, h: b.h });
    });
  },
  footer() {
    const pad = input.device === 'gamepad', mine = S.seats[myK()];
    const parts = [];
    if (!mine.locked) parts.push({ key: pad ? 'STICK' : input.device === 'pointer' ? 'FLECHITAS' : 'FLECHAS', label: 'ELEGIR', act: null });
    if (!(mine.locked && net() === 'guest')) parts.push({ key: pad ? 'A' : input.device === 'pointer' ? 'CLIC' : 'ENTER', label: mine.locked ? 'SEGUIR' : 'LISTO', act: 'ok' });
    parts.push({ key: pad ? 'B' : 'ESC', label: mine.locked ? 'CAMBIAR' : 'VOLVER', act: 'back' });
    return parts;
  },
  onBack() {},
};
const here = () => !!topMenu() && topMenu().def === SALA;
// eventos generales -> acción de la sala
function globalAct(e) {
  if (e.a === 'left' || e.a === 'right') return e.a;
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
    closeAllMenus(); hostStart();
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
  hooks.startLocal(S.kind, setup);
}
