// Salas online: conexión entre jugadores con PeerJS (WebRTC, de navegador a navegador).
//
// Quien crea la sala es el ANFITRIÓN: su máquina corre la partida de verdad (pelotas, goles, bots)
// y les manda a los invitados el estado ~20 veces por segundo. Cada invitado manda la posición
// de su nave y cuándo golpea. El código de sala son 4 letras (sin I ni O para no confundir).
//
// Para probar con un servidor PeerJS propio: ?peer=localhost:9000 en la URL.
import { Peer } from 'peerjs';
import { settings } from '../settings.js';

export const NET_VERSION = 1;
export const MAX_PLAYERS = 4;
export const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const JOIN_ORDER = [2, 1, 3];                 // el primer invitado va enfrente del anfitrión

export const room = {
  role: 'off',          // off | host | guest
  status: 'idle',       // idle | opening | ready | connecting | joined | error
  error: '',
  code: '',
  mySlot: 0,
  slots: [],            // [{ kind: 'host' | 'guest' | 'empty' }]
  opts: { bots: true, difficulty: 'intermedio', points: 15 },
  inGame: false,
  peer: null,
  hostConn: null,       // (invitado) conexión con el anfitrión
  guests: new Map(),    // (anfitrión) lugar -> { conn, s, v, h, hit }
};

// El juego registra acá qué hacer con cada mensaje
const handlers = { onChange() {}, onStart() {}, onSnap() {}, onToLobby() {}, onClosed() {}, onGuestLeft() {} };
export function setRoomHandlers(h) { Object.assign(handlers, h); }
const changed = () => handlers.onChange();

function peerOptions() {
  let custom = null;
  try { custom = new URLSearchParams(location.search).get('peer'); } catch (e) { /* sin URL */ }
  if (custom) {
    const [host, port] = custom.split(':');
    return { host, port: Number(port) || 9000, path: '/', secure: false, debug: 0 };
  }
  return { debug: 0 };
}
const idFor = (code) => `bolonki-v${NET_VERSION}-${code.toLowerCase()}`;
const genCode = () => Array.from({ length: 4 }, () => ALPHA[(Math.random() * ALPHA.length) | 0]).join('');

const ERRORS = {
  'peer-unavailable': 'NO EXISTE ESA SALA',
  network: 'SIN CONEXIÓN AL SERVIDOR',
  'server-error': 'SERVIDOR NO DISPONIBLE',
  'socket-error': 'SIN CONEXIÓN AL SERVIDOR',
  'browser-incompatible': 'NAVEGADOR SIN SOPORTE',
  full: 'LA SALA ESTÁ LLENA',
  ingame: 'LA PARTIDA YA EMPEZÓ',
  version: 'VERSIONES DISTINTAS DEL JUEGO',
  timeout: 'NO SE PUDO CONECTAR',
};
function fail(key) { room.status = 'error'; room.error = ERRORS[key] || 'ERROR DE CONEXIÓN'; changed(); }

export function leaveRoom() {
  if (room.role === 'host') broadcast({ t: 'closed' });
  // se cierra un instante después para que el aviso llegue a los invitados
  const conns = [...room.guests.values()].map((g) => g.conn).concat(room.hostConn ? [room.hostConn] : []);
  const peer = room.peer;
  room.guests.clear(); room.hostConn = null; room.peer = null;
  setTimeout(() => {
    conns.forEach((c) => { try { c.close(); } catch (e) { /* nada */ } });
    if (peer) { try { peer.destroy(); } catch (e) { /* nada */ } }
  }, 300);
  Object.assign(room, { role: 'off', status: 'idle', error: '', code: '', inGame: false, slots: [] });
}

/* ================= ANFITRIÓN ================= */

export function createRoom() {
  leaveRoom();
  Object.assign(room, {
    role: 'host', status: 'opening', code: genCode(), mySlot: 0, inGame: false,
    slots: [{ kind: 'host' }, { kind: 'empty' }, { kind: 'empty' }, { kind: 'empty' }],
    opts: { bots: true, difficulty: settings.difficulty, points: settings.points },
  });
  openHostPeer(0);
  changed();
}

function openHostPeer(tries) {
  const peer = new Peer(idFor(room.code), peerOptions());
  room.peer = peer;
  peer.on('open', () => { if (room.peer === peer) { room.status = 'ready'; changed(); } });
  peer.on('connection', (conn) => {
    conn.on('data', (m) => hostOnData(conn, m));
    conn.on('close', () => hostOnClose(conn));
    conn.on('error', () => hostOnClose(conn));
  });
  peer.on('error', (err) => {
    if (room.peer !== peer) return;
    if (err.type === 'unavailable-id' && tries < 5) { peer.destroy(); room.code = genCode(); openHostPeer(tries + 1); changed(); return; }
    fail(err.type);
  });
  peer.on('disconnected', () => { if (room.peer === peer) { try { peer.reconnect(); } catch (e) { /* nada */ } } });
}

function deny(conn, why) { try { conn.send({ t: 'deny', why }); } catch (e) { /* nada */ } setTimeout(() => { try { conn.close(); } catch (e) { /* nada */ } }, 400); }

function hostOnData(conn, m) {
  if (!m || room.role !== 'host') return;
  if (m.t === 'hello') {
    if (m.v !== NET_VERSION) return deny(conn, 'version');
    if (room.inGame) return deny(conn, 'ingame');
    const slot = JOIN_ORDER.find((s) => room.slots[s].kind === 'empty');
    if (slot === undefined) return deny(conn, 'full');
    room.slots[slot] = { kind: 'guest' };
    room.guests.set(slot, { conn, s: 0, v: 0, h: 0, hit: false });
    conn.slot = slot;
    conn.send({ t: 'welcome', slot, code: room.code });
    broadcastLobby(); changed();
  } else if (m.t === 'i') {
    const g = room.guests.get(conn.slot);
    if (g) { g.s = m.s; g.v = m.v; if (m.h > g.h) { g.h = m.h; g.hit = true; } }
  }
}

function hostOnClose(conn) {
  if (conn.slot === undefined || room.role !== 'host') return;
  const slot = conn.slot; conn.slot = undefined;
  if (!room.guests.has(slot)) return;
  room.guests.delete(slot);
  room.slots[slot] = { kind: 'empty' };
  if (room.inGame) handlers.onGuestLeft(slot);
  broadcastLobby(); changed();
}

export function broadcast(msg) {
  for (const g of room.guests.values()) { if (g.conn.open) { try { g.conn.send(msg); } catch (e) { /* nada */ } } }
}
export function broadcastLobby() { broadcast({ t: 'lobby', slots: room.slots, opts: room.opts, code: room.code, inGame: room.inGame }); }
export function setRoomOpt(key, v) { room.opts[key] = v; broadcastLobby(); changed(); }

export const humanCount = () => room.slots.filter((s) => s.kind !== 'empty').length;
export const canStart = () => room.role === 'host' && room.status === 'ready' && (room.opts.bots || humanCount() >= 2);

// Qué hay en cada lugar al empezar: host | guest | bot | none
export function slotKinds() {
  return room.slots.map((s) => (s.kind === 'empty' ? (room.opts.bots ? 'bot' : 'none') : s.kind));
}

/* ================= INVITADO ================= */

let joinTimer = 0;
export function joinRoom(code) {
  leaveRoom();
  Object.assign(room, { role: 'guest', status: 'connecting', code, slots: [], inGame: false });
  changed();
  const peer = new Peer(peerOptions());
  room.peer = peer;
  clearTimeout(joinTimer);
  joinTimer = setTimeout(() => { if (room.peer === peer && room.status === 'connecting') { fail('timeout'); } }, 15000);
  peer.on('open', () => {
    if (room.peer !== peer) return;
    const conn = peer.connect(idFor(code), { reliable: true, serialization: 'json' });
    room.hostConn = conn;
    conn.on('open', () => conn.send({ t: 'hello', v: NET_VERSION }));
    conn.on('data', (m) => guestOnData(m));
    conn.on('close', () => { if (room.hostConn === conn && room.role === 'guest') { const was = room.status; leaveRoom(); if (was === 'joined') handlers.onClosed(); else fail('timeout'); } });
  });
  peer.on('error', (err) => { if (room.peer === peer) fail(err.type); });
}

function guestOnData(m) {
  if (!m || room.role !== 'guest') return;
  switch (m.t) {
    case 'welcome': room.mySlot = m.slot; room.status = 'joined'; clearTimeout(joinTimer); changed(); break;
    case 'deny': fail(m.why); break;
    case 'lobby': room.slots = m.slots; room.opts = m.opts; room.inGame = m.inGame; changed(); break;
    case 'start': room.inGame = true; handlers.onStart(m); break;
    case 's': handlers.onSnap(m); break;
    case 'toLobby': room.inGame = false; handlers.onToLobby(); break;
    case 'closed': { leaveRoom(); handlers.onClosed(); break; }
    default: break;
  }
}

export function sendInput(s, v, h) {
  const c = room.hostConn;
  if (c && c.open) { try { c.send({ t: 'i', s: Math.round(s * 100) / 100, v: Math.round(v * 10) / 10, h }); } catch (e) { /* nada */ } }
}
