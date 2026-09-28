// Multijugador: local, crear sala, unirse con código, salas públicas, sala de espera, pausa y fin online.
import { CHARS, DIFFICULTIES } from './config.js';
import { game } from './state.js';
import { settings, saveSettings } from './settings.js';
import {
  room, browse, ALPHA, MAX_PLAYERS, createRoom, joinRoom, leaveRoom, setRoomOpt, startBlocker, humanCount,
  setRoomHandlers, castVote, iVoted, voteCount, allVoted, sendReady, amReady, browsePublic, stopBrowse, cleanName,
} from './net/room.js';
import { hostStart, hostGuestLeft, hostBackToLobby, endOnline, guestStart, guestSnap, setGuestEndHandler } from './net/online.js';
import { resetMatch } from './game/match.js';
import { openMenu, replaceMenus, closeMenu, closeAllMenus, topMenu } from './ui/menu.js';
import { txt, rect, COL } from './ui/draw.js';
import { textEntry } from './ui/textEntry.js';
import { SFX } from './audio.js';
import { showToast, pingColor } from './hud.js';
import { MAIN, JUGAR, OPTIONS, LOCAL, winnerTitle } from './flow.js';
import { yesNo, mgChoice, pointsChoice, botValues, modeChoice } from './ui/values.js';
import { drawThumb } from './render/thumbStore.js';
import { mgById } from './minigames/registry.js';
import { fiestaRankArt } from './fiesta/board.js';

/* ---------- apodo ---------- */
let afterName = null;
const NAME = textEntry({
  id: 'name', title: 'TU APODO', len: 8, alphabet: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
  hint: 'ASÍ TE VEN LOS DEMÁS (HASTA 8)',
  onSubmit(v) {
    settings.name = cleanName(v); saveSettings(); SFX.confirm(); closeMenu();
    const next = afterName; afterName = null; if (next) next();
  },
  onCancel() { afterName = null; closeMenu(); },
});
function editName() { NAME.reset(settings.name || ''); openMenu(NAME); }
// Si todavía no tiene apodo, se lo pide antes de entrar al online
function withName(fn) { if (settings.name) fn(); else { afterName = fn; editName(); } }

/* ---------- código de sala ---------- */
const JOIN = textEntry({
  id: 'join', title: 'UNIRSE A SALA', len: 4, alphabet: ALPHA, minLen: 4,
  hint: 'ESCRIBÍ EL CÓDIGO DE LA SALA',
  status() {
    const st = room.role === 'guest' ? room.status : 'idle';
    if (st === 'connecting') return { text: 'CONECTANDO...', color: COL.teal };
    if (st === 'error') return { text: room.error, color: COL.red };
    return null;
  },
  onShort() { showToast('FALTAN LETRAS'); },
  onSubmit(code) { if (room.role === 'guest' && room.status === 'connecting') return; SFX.confirm(); joinRoom(code); },
  onCancel() { if (room.role === 'guest') leaveRoom(); closeMenu(); },
});

/* ---------- salas públicas ---------- */
const roomRow = (k) => ({
  kind: 'action', left: true, hidden: () => !browse.list[k],
  label: () => (browse.list[k] ? `SALA DE ${browse.list[k].host}` : ''),
  value: () => { const r = browse.list[k]; return r ? `${mgById(r.mg).name} · ${r.players}/${r.max}${r.inGame ? ' · JUGANDO' : ''}` : ''; },
  valueColor: () => (browse.list[k] && browse.list[k].inGame ? COL.dim : COL.teal),
  action: () => {
    const r = browse.list[k]; if (!r) return;
    if (r.inGame) { showToast('ESA SALA ESTÁ JUGANDO'); return; }
    if (r.players >= r.max) { showToast('ESA SALA ESTÁ LLENA'); return; }
    joinRoom(r.code);
  },
});
const PUBLIC = {
  id: 'public', title: 'SALAS PÚBLICAS', width: 300, rowH: 13,
  items: [
    { kind: 'info', label: () => {
      if (room.role === 'guest' && room.status === 'connecting') return 'CONECTANDO...';
      if (room.role === 'guest' && room.status === 'error') return room.error;
      if (browse.status === 'searching') return 'BUSCANDO SALAS...';
      if (browse.status === 'error') return 'SIN CONEXIÓN AL SERVIDOR';
      return browse.list.length ? 'ELEGÍ UNA SALA' : 'NO HAY SALAS PÚBLICAS AHORA';
    } },
    ...[0, 1, 2, 3, 4, 5, 6, 7].map(roomRow),
    { kind: 'action', label: 'ACTUALIZAR', action: () => { if (room.role === 'guest') leaveRoom(); browsePublic(); } },
  ],
  onBack: () => { stopBrowse(); if (room.role === 'guest') leaveRoom(); closeMenu(); },
};

export const MULTI = {
  id: 'multi', title: 'MULTIJUGADOR', width: 260,
  items: [
    { kind: 'action', label: 'LOCAL', action: () => openMenu(LOCAL) },
    { kind: 'action', label: 'CREAR SALA', action: () => withName(() => { createRoom(); openMenu(HOST_LOBBY); }) },
    { kind: 'action', label: 'UNIRSE A SALA', action: () => withName(() => { JOIN.reset(''); openMenu(JOIN); }) },
    { kind: 'action', label: 'SALAS PÚBLICAS', action: () => withName(() => { browsePublic(); openMenu(PUBLIC); }) },
    { kind: 'action', label: 'APODO', value: () => settings.name || '-', action: () => editName() },
  ],
};

/* ---------- sala de espera ---------- */
const roomFiesta = () => room.opts.mode === 'fiesta';
const roomMg = () => (roomFiesta() ? 'fiesta' : room.opts.mg);       // en Fiesta, "puntos" = turnos
function roomHeader(x, y, w, hw) {
  const st = room.status;
  const lx = Math.round(x + w * 0.3);               // columna del código
  txt(room.opts.public ? 'CÓDIGO · PÚBLICA' : 'CÓDIGO', lx, y, 8, COL.dim, 'center');
  const c = room.code || '····';
  const cw = 4 * 22 - 4, cx = lx - cw / 2;
  for (let i = 0; i < 4; i++) {
    rect(cx + i * 22, y + 10, 18, 20, 'rgba(45,224,200,.10)');
    rect(cx + i * 22, y + 28, 18, 2, COL.teal);
    txt(c[i] || '', cx + i * 22 + 9, y + 12, 16, COL.gold, 'center', COL.goldShadow);
  }
  drawThumb(roomMg(), Math.round(x + w * 0.62), y + 1, 64, 36);   // vista previa del minijuego
  const msg = st === 'error' ? room.error
    : st === 'reconnecting' ? 'RECONECTANDO...'
    : room.role === 'host' ? (st === 'ready' ? `COMPARTÍ EL CÓDIGO · ${humanCount()}/${MAX_PLAYERS}` : 'CREANDO SALA...')
    : amReady() ? 'ESPERANDO AL ANFITRIÓN' : 'MARCÁ LISTO CUANDO QUIERAS';
  txt(msg, hw / 2, y + 42, 8, st === 'error' || st === 'reconnecting' ? COL.red : COL.teal, 'center');
  rect(x + 6, y + 54, w - 12, 1, '#1d6e68');
}

// Cada lugar: nombre (con el color del personaje) y su estado
function slotRow(i) {
  const s = () => room.slots[i];
  const isMe = () => (room.role === 'host' ? i === 0 : i === room.mySlot);
  return {
    kind: 'info',
    label: () => {
      const v = s(); if (!v) return '...';
      if (v.kind === 'empty') return room.opts.bots ? `BOT · ${CHARS[i].name}` : 'LIBRE';
      return isMe() ? `${v.name} (VOS)` : v.name;
    },
    labelColor: () => { const v = s(); return v && v.kind !== 'empty' ? CHARS[i].col : COL.dim; },
    value: () => {
      const v = s(); if (!v) return '';
      if (v.kind === 'empty') return room.opts.bots ? DIFFICULTIES[room.opts.difficulty].label : 'ARCO CERRADO';
      if (v.kind === 'host') return 'ANFITRIÓN';
      if (v.away) return 'RECONECTANDO...';
      return `${v.ready ? 'LISTO' : 'ESPERANDO'} · ${v.ping || '--'} MS`;
    },
    valueColor: () => {
      const v = s(); if (!v || v.kind === 'empty' || v.kind === 'host') return COL.dim;
      if (v.away) return COL.red;
      return v.ready ? '#39d98a' : COL.text;
    },
  };
}
const slotRows = () => [0, 1, 2, 3].map(slotRow);
const pingRow = () => ({
  kind: 'info', label: 'TU PING', hidden: () => room.role !== 'guest',
  value: () => `${room.myPing || '--'} MS`, valueColor: () => pingColor(room.myPing || 0),
});

export const HOST_LOBBY = {
  id: 'hostLobby', title: 'CREAR SALA', width: 300, headerH: 58, rowH: 11,
  header: roomHeader,
  items: [
    ...slotRows(),
    modeChoice(() => room.opts.mode, (v) => { settings.mode = v; saveSettings(); setRoomOpt('mode', v); }),
    Object.assign(mgChoice(() => room.opts.mg, (v) => setRoomOpt('mg', v)), { hidden: roomFiesta }),
    { kind: 'choice', label: 'BOTS', values: botValues, get: () => (room.opts.bots ? room.opts.difficulty : 'no'),
      set: (v) => { if (v !== 'no') room.opts.difficulty = v; setRoomOpt('bots', v !== 'no'); } },
    pointsChoice(roomMg, () => room.opts[mgById(roomMg()).points.key], (v) => setRoomOpt(mgById(roomMg()).points.key, v)),
    { kind: 'choice', label: 'SALA', values: [{ v: false, label: 'PRIVADA' }, { v: true, label: 'PÚBLICA' }],
      get: () => room.opts.public, set: (v) => setRoomOpt('public', v) },
    { kind: 'action', label: 'COMENZAR', action: () => {
      const why = startBlocker();
      if (why) { showToast(why); return; }
      closeAllMenus(); hostStart();
    } },
  ],
  onBack: () => { leaveRoom(); closeMenu(); },
};

export const GUEST_LOBBY = {
  id: 'guestLobby', title: 'SALA', width: 300, headerH: 58, rowH: 11,
  header: roomHeader,
  items: [
    ...slotRows(),
    { kind: 'info', label: 'BOTS', value: () => (room.opts.bots ? `SÍ · ${DIFFICULTIES[room.opts.difficulty].label}` : 'NO') },
    { kind: 'info', label: 'MODO', value: () => (roomFiesta() ? 'FIESTA' : 'PARTIDA LIBRE') },
    { kind: 'info', label: 'MINIJUEGO', hidden: roomFiesta, value: () => mgById(room.opts.mg).name },
    { kind: 'info', label: () => mgById(roomMg()).points.label, value: () => String(room.opts[mgById(roomMg()).points.key] || '-') },
    pingRow(),
    { kind: 'choice', label: 'ESTOY LISTO', values: [{ v: false, label: 'NO' }, { v: true, label: 'SÍ' }],
      get: () => amReady(), set: (v) => sendReady(v) },
  ],
  onBack: () => { leaveRoom(); closeMenu(); },
};

/* ---------- dentro de la partida ---------- */
export const ONLINE_PAUSE = {
  id: 'onlinePause', title: 'MENÚ', width: 220,
  items: [
    { kind: 'info', label: 'LA PARTIDA SIGUE' },
    { kind: 'action', label: 'CONTINUAR', action: () => closeAllMenus() },
    { kind: 'action', label: 'OPCIONES', action: () => openMenu(OPTIONS) },
    { kind: 'action', label: 'SALIR DE LA SALA', danger: true, action: () => exitRoom() },
  ],
  onBack: () => closeAllMenus(),
};

// Fin de partida online: todos votan la revancha; cuando votan todos, arranca sola
export function onlineEndMenu() {
  const t = winnerTitle();
  const items = [
    { kind: 'action', label: () => {
      const [v, n] = voteCount(), what = game.minigame === 'fiesta' ? 'OTRA FIESTA' : 'REVANCHA';
      return `${iVoted() ? `VOTASTE ${what}` : what} (${v}/${n})`;
    },
      action: () => castVote(!iVoted()) },
  ];
  if (game.online === 'host') items.push({ kind: 'action', label: 'VOLVER A LA SALA', action: () => { hostBackToLobby(); toLobbyScreen(HOST_LOBBY); } });
  items.push({ kind: 'action', label: 'SALIR DE LA SALA', danger: true, action: () => exitRoom() });
  const board = game.minigame === 'fiesta';        // fin de la Fiesta: la tabla de copas arriba de las opciones
  if (board) items.unshift(fiestaRankArt());
  return { id: 'endOnline', title: t.title, titleColor: t.color, offsetY: board ? 0 : 16, width: board ? 250 : undefined, items, onBack: () => {} };
}
function checkVotes() {
  if (room.role !== 'host' || !allVoted() || game.state !== 'end') return;
  const why = startBlocker();
  if (why) { showToast(why); return; }
  closeAllMenus(); hostStart();
}

// Vuelve a la sala de espera (con el menú armado para poder retroceder)
function toLobbyScreen(lobby) {
  resetMatch('menu'); game.state = 'menu';
  replaceMenus(MAIN); openMenu(JUGAR); openMenu(MULTI); openMenu(lobby);
}
function toMultiMenu() {
  endOnline(); resetMatch('menu'); game.state = 'menu';
  replaceMenus(MAIN); openMenu(JUGAR); openMenu(MULTI);
}
export function exitRoom() { leaveRoom(); toMultiMenu(); }

/* ---------- mensajes de la red ---------- */
const nameOf = (slot, fallback) => (fallback || (room.slots[slot] && room.slots[slot].name) || CHARS[slot].name);

export function initMultiplayer() {
  // en la Fiesta, al terminar un minijuego no hay menú: el anfitrión vuelve solo al tablero
  setGuestEndHandler(() => { if (!(game.setup && game.setup.fiesta)) replaceMenus(onlineEndMenu()); });
  setRoomHandlers({
    onChange(what) {
      if (what === 'publicFull') { showToast('LA LISTA PÚBLICA ESTÁ LLENA'); return; }
      // al conectarse, la pantalla del código (o la lista pública) pasa a la sala de espera
      const top = topMenu();
      if (top && (top.def === JOIN || top.def === PUBLIC) && room.role === 'guest' && room.status === 'joined') {
        stopBrowse(); closeMenu(); openMenu(GUEST_LOBBY); SFX.confirm();
      }
    },
    onStart(m) { if (!(m.resume && game.online === 'guest')) closeAllMenus(); guestStart(m); },
    onSnap(m) { if (game.online === 'guest') guestSnap(m); },
    onToLobby() { endOnline(); toLobbyScreen(GUEST_LOBBY); },
    onClosed(msg) { showToast(msg || 'LA SALA SE CERRÓ'); toMultiMenu(); },
    onGuestAway(slot) { showToast(`${nameOf(slot)} SE DESCONECTÓ · ESPERANDO`); },
    onGuestBack(slot) { showToast(`${nameOf(slot)} VOLVIÓ`); },
    onGuestLeft(slot, name) { showToast(`${nameOf(slot, name)} SE FUE`); if (room.inGame && game.online === 'host') hostGuestLeft(slot); },
    onVotes() { checkVotes(); },
    onReconnecting() { showToast('SE CORTÓ LA CONEXIÓN · RECONECTANDO'); },
    onReconnected() { showToast('RECONECTADO'); },
  });
}
