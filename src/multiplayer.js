// Online: menú (crear sala, unirse con código, salas públicas, apodo), pausa y fin de partida online.
// La sala en sí (elegir personaje, opciones) es la misma que la local: sala/sala.js.
import { charOf } from './chars.js';
import { game } from './state.js';
import { settings, saveSettings } from './settings.js';
import {
  room, browse, ALPHA, joinRoom, leaveRoom, startBlocker,
  setRoomHandlers, castVote, iVoted, voteCount, allVoted, browsePublic, stopBrowse, cleanName,
} from './net/room.js';
import { hostStart, hostGuestLeft, hostBackToLobby, endOnline, guestStart, guestSnap, guestEvents, setGuestEndHandler } from './net/online.js';
import { resetMatch } from './game/match.js';
import { openMenu, replaceMenus, closeMenu, closeAllMenus, topMenu } from './ui/menu.js';
import { COL } from './ui/draw.js';
import { textEntry } from './ui/textEntry.js';
import { SFX } from './audio.js';
import { showToast } from './hud.js';
import { MAIN, OPTIONS, winnerTitle } from './flow.js';
import { mgById } from './minigames/registry.js';
import { fiestaRankArt } from './fiesta/board.js';
import { openSalaOnline, hostSala, setSalaHooks } from './sala/sala.js';

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
export function editName() { NAME.reset(settings.name || ''); openMenu(NAME); }
// Si todavía no tiene apodo, se lo pide antes de entrar al online
function withName(fn) {
  // en Steam, el apodo arranca con tu nombre de Steam (lo podés cambiar en Opciones)
  if (!settings.name && typeof window !== 'undefined' && window.bolonkiDesktop && window.bolonkiDesktop.steamName) {
    const n = cleanName(window.bolonkiDesktop.steamName() || ''); if (n && n !== 'JUGADOR') { settings.name = n; saveSettings(); }
  }
  if (settings.name) fn(); else { afterName = fn; editName(); }
}

/* ---------- código de sala ---------- */
const JOIN = textEntry({
  id: 'join', title: 'UNIRSE A SALA', len: 4, alphabet: ALPHA, minLen: 4,
  hint: 'ESCRIBÍ EL CÓDIGO DE LA SALA',
  status() {
    const st = room.role === 'guest' ? room.status : 'idle';
    if (st === 'connecting') return { text: room.note || 'CONECTANDO...', color: COL.teal };
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
      if (room.role === 'guest' && room.status === 'connecting') return room.note || 'CONECTANDO...';
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

export const ONLINE = {
  id: 'online', title: 'ONLINE', width: 270,
  items: [
    { kind: 'action', label: 'CREAR SALA DE FIESTA', action: () => hostSala('fiesta') },
    { kind: 'action', label: 'CREAR SALA DE MINIJUEGOS', action: () => hostSala('libre') },
    { kind: 'action', label: 'UNIRSE CON CÓDIGO', action: () => withName(() => { JOIN.reset(''); openMenu(JOIN); }) },
    { kind: 'action', label: 'SALAS PÚBLICAS', action: () => withName(() => { browsePublic(); openMenu(PUBLIC); }) },
    { kind: 'action', label: 'APODO', value: () => settings.name || '-', action: () => editName() },
  ],
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
  if (game.online === 'host') items.push({ kind: 'action', label: 'VOLVER A LA SALA', action: () => { hostBackToLobby(); toLobbyScreen(); } });
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

// Vuelve a la sala (después de una partida)
function toLobbyScreen() { openSalaOnline(true); }
function toMultiMenu() {
  endOnline(); resetMatch('menu'); game.state = 'menu';
  replaceMenus(MAIN); openMenu(ONLINE);
}
export function exitRoom() { leaveRoom(); toMultiMenu(); }

/* ---------- mensajes de la red ---------- */
const nameOf = (slot, fallback) => (fallback || (room.slots[slot] && room.slots[slot].name) || charOf(slot).name);

export function initMultiplayer() {
  setSalaHooks({ toOnlineMenu: () => toMultiMenu(), withName });
  // en la Fiesta, al terminar un minijuego no hay menú: el anfitrión vuelve solo al tablero
  setGuestEndHandler(() => { if (!(game.setup && game.setup.fiesta)) replaceMenus(onlineEndMenu()); });
  setRoomHandlers({
    onChange(what) {
      if (what === 'publicFull') { showToast('LA LISTA PÚBLICA ESTÁ LLENA'); return; }
      // al conectarse, la pantalla del código (o la lista pública) pasa a la sala de espera
      const top = topMenu();
      if (top && (top.def === JOIN || top.def === PUBLIC) && room.role === 'guest' && room.status === 'joined' && room.slots.length) {
        stopBrowse(); SFX.confirm(); openSalaOnline(false);
      }
    },
    onStart(m) { if (!(m.resume && game.online === 'guest')) closeAllMenus(); guestStart(m); },
    onSnap(m) { if (game.online === 'guest') guestSnap(m); },
    onEvents(m) { if (game.online === 'guest') guestEvents(m); },
    onToLobby() { endOnline(); toLobbyScreen(); },
    onClosed(msg) { showToast(msg || 'LA SALA SE CERRÓ'); toMultiMenu(); },
    onGuestAway(slot) { showToast(`${nameOf(slot)} SE DESCONECTÓ · ESPERANDO`); },
    onGuestBack(slot) { showToast(`${nameOf(slot)} VOLVIÓ`); },
    onGuestLeft(slot, name) { showToast(`${nameOf(slot, name)} SE FUE`); if (room.inGame && game.online === 'host') hostGuestLeft(slot); },
    onVotes() { checkVotes(); },
    onReconnecting() { showToast('SE CORTÓ LA CONEXIÓN · RECONECTANDO'); },
    onReconnected() { showToast('RECONECTADO'); },
  });
}
