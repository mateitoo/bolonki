// Salas online: conexión entre jugadores con PeerJS (WebRTC, de navegador a navegador).
//
// Quien crea la sala es el ANFITRIÓN: su máquina corre la partida de verdad (pelotas, goles, bots)
// y les manda a los invitados el estado ~20 veces por segundo. Cada invitado manda la posición
// de su nave y cuándo golpea. El código de sala son 4 letras (sin I ni O para no confundir).
//
// Extras: apodo, "listo", ping, revancha por votación, reconexión (se guarda el lugar 12 s)
// y salas públicas: cada sala pública ocupa uno de 12 "carteles" (ids fijos) y quien busca
// les pregunta a los 12. No necesita servidor propio; en Steam se reemplaza por sus lobbies.
//
// Para probar con un servidor PeerJS propio: ?peer=127.0.0.1:9000 en la URL (npm run peer).
import { Peer } from 'peerjs';
import { settings } from '../settings.js';
import { mgById } from '../minigames/registry.js';
import { CHARS } from '../config.js';

export const NET_VERSION = 5;          // v3: modo Fiesta · v4: cada uno elige personaje en la sala · v5: 6 personajes
export const MAX_PLAYERS = 4;
export const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const JOIN_ORDER = [2, 1, 3];          // el primer invitado va enfrente del anfitrión
const PUBLIC_SLOTS = 12;
const AWAY_MS = 12000;                 // cuánto se guarda el lugar de alguien que se cayó
const TIMEOUT_MS = 5000;               // sin noticias por este tiempo = conexión caída

export const room = {
  role: 'off',          // off | host | guest
  status: 'idle',       // idle | opening | ready | connecting | joined | reconnecting | error
  error: '',
  code: '',
  mySlot: 0,
  myPing: 0,
  slots: [],            // [{ kind: 'host' | 'guest' | 'empty', name, ready, ping, away, ch }]  ch: personaje · ready: ya lo eligió
  opts: { mg: 'bolas', bots: true, difficulty: 'intermedio', points: 15, rounds: 2, public: false, mode: 'libre', turns: 10 },
  inGame: false,
  votes: [],            // lugares que votaron revancha
  startInfo: null,
  peer: null,
  hostConn: null,       // (invitado) conexión con el anfitrión
  guests: new Map(),    // (anfitrión) lugar -> { conn, s, v, h, hit, last, token, awayUntil }
};

// El juego registra acá qué hacer con cada cosa que pasa en la red
const handlers = {
  onChange() {}, onStart() {}, onSnap() {}, onToLobby() {}, onClosed() {},
  onGuestLeft() {}, onGuestAway() {}, onGuestBack() {}, onVotes() {}, onReconnecting() {}, onReconnected() {},
};
export function setRoomHandlers(h) { Object.assign(handlers, h); }
const changed = () => handlers.onChange();
const now = () => performance.now();

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
const pubId = (n) => `bolonki-v${NET_VERSION}-pub-${n}`;
const genCode = () => Array.from({ length: 4 }, () => ALPHA[(Math.random() * ALPHA.length) | 0]).join('');
const myName = () => settings.name || 'JUGADOR';

// identificador de esta pestaña, para recuperar el lugar si se corta la conexión
function token() {
  try {
    let t = sessionStorage.getItem('bolonki:token');
    if (!t) { t = Math.random().toString(36).slice(2, 12); sessionStorage.setItem('bolonki:token', t); }
    return t;
  } catch (e) { return (room._tok = room._tok || Math.random().toString(36).slice(2, 12)); }
}

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

let tick = 0;
function startTicker(fn) { clearInterval(tick); tick = setInterval(fn, 500); }

export function leaveRoom() {
  if (room.role === 'host') broadcast({ t: 'closed' });
  if (room.role === 'guest' && room.hostConn && room.hostConn.open) { try { room.hostConn.send({ t: 'bye' }); } catch (e) { /* nada */ } }
  clearInterval(tick); clearTimeout(reconnectTimer);
  stopBeacon();
  // se cierra un instante después para que el aviso llegue
  const conns = [...room.guests.values()].map((g) => g.conn).filter(Boolean).concat(room.hostConn ? [room.hostConn] : []);
  const peer = room.peer;
  room.guests.clear(); room.hostConn = null; room.peer = null;
  setTimeout(() => {
    conns.forEach((c) => { try { c.close(); } catch (e) { /* nada */ } });
    if (peer) { try { peer.destroy(); } catch (e) { /* nada */ } }
  }, 300);
  Object.assign(room, { role: 'off', status: 'idle', error: '', code: '', inGame: false, slots: [], votes: [], myPing: 0 });
}

/* ================= ANFITRIÓN ================= */

export function createRoom(mode, ch) {
  leaveRoom();
  Object.assign(room, {
    role: 'host', status: 'opening', code: genCode(), mySlot: 0, inGame: false, votes: [],
    slots: [{ kind: 'host', name: myName(), ready: true, ping: 0, ch: ch || 0 }, empty(), empty(), empty()],
    opts: { mg: settings.mg, bots: true, difficulty: settings.difficulty, points: settings.points, rounds: settings.rounds, public: false, mode: mode || settings.mode, turns: settings.turns },
  });
  openHostPeer(0);
  startTicker(hostTicker);
  changed();
}
const empty = () => ({ kind: 'empty' });

function openHostPeer(tries) {
  const peer = new Peer(idFor(room.code), peerOptions());
  room.peer = peer;
  peer.on('open', () => { if (room.peer === peer) { room.status = 'ready'; changed(); if (room.opts.public) startBeacon(); } });
  peer.on('connection', (conn) => {
    conn.on('data', (m) => hostOnData(conn, m));
    conn.on('close', () => hostOnClose(conn));
    conn.on('error', () => hostOnClose(conn));
  });
  peer.on('error', (err) => {
    if (room.peer !== peer) return;
    if (err.type === 'unavailable-id' && tries < 5) { peer.destroy(); room.code = genCode(); openHostPeer(tries + 1); changed(); return; }
    if (err.type === 'peer-unavailable') return;
    if (room.status === 'opening') fail(err.type);
  });
  peer.on('disconnected', () => { if (room.peer === peer) { try { peer.reconnect(); } catch (e) { /* nada */ } } });
}

function deny(conn, why) { try { conn.send({ t: 'deny', why }); } catch (e) { /* nada */ } setTimeout(() => { try { conn.close(); } catch (e) { /* nada */ } }, 400); }

function hostOnData(conn, m) {
  if (!m || room.role !== 'host') return;
  const g = conn.slot !== undefined ? room.guests.get(conn.slot) : null;
  if (g && g.conn === conn) g.last = now();
  switch (m.t) {
    case 'hello': {
      if (m.v !== NET_VERSION) return deny(conn, 'version');
      const name = cleanName(m.name);
      // ¿vuelve alguien que se había caído?
      for (const [slot, rec] of room.guests) {
        if (room.slots[slot].away && rec.token && rec.token === m.token) {
          rec.conn = conn; rec.last = now(); conn.slot = slot;
          Object.assign(room.slots[slot], { away: false, name });
          conn.send({ t: 'welcome', slot, code: room.code });
          if (room.inGame && room.startInfo) conn.send(Object.assign({}, room.startInfo, { resume: true }));
          broadcastLobby(); handlers.onGuestBack(slot); changed();
          return;
        }
      }
      if (room.inGame) return deny(conn, 'ingame');
      const slot = JOIN_ORDER.find((s) => room.slots[s].kind === 'empty');
      if (slot === undefined) return deny(conn, 'full');
      room.slots[slot] = { kind: 'guest', name, ready: false, ping: 0, away: false, ch: freeChar(slot) };
      room.guests.set(slot, { conn, s: 0, v: 0, h: 0, hit: false, last: now(), token: m.token || '', awayUntil: 0 });
      conn.slot = slot;
      conn.send({ t: 'welcome', slot, code: room.code });
      broadcastLobby(); changed();
      break;
    }
    case 'i': if (g) { g.s = m.s; g.v = m.v; g.x = m.x || 0; g.y = m.y || 0; g.st = m.st || null; if (m.h > g.h) { g.h = m.h; g.hit = true; } } break;   // st: estado propio que simula el invitado (Bombardeo)
    case 'ready': if (g) { room.slots[conn.slot].ready = !!m.v; broadcastLobby(); changed(); } break;
    case 'char': if (g) {
      // el invitado cambió de personaje (o lo confirmó): si otro ya lo tiene, se queda con el que tenía
      const sl = room.slots[conn.slot], c = m.c | 0;
      if (c >= 0 && c < CHARS.length && !charTaken(c, conn.slot)) sl.ch = c;
      sl.ready = !!m.lock && sl.ch === c;
      broadcastLobby(); changed();
    } break;
    case 'vote': if (g) { setVote(conn.slot, !!m.v); } break;
    case 'pong': if (g && room.slots[conn.slot]) { room.slots[conn.slot].ping = Math.max(1, Math.round(now() - m.ts)); } break;
    case 'bye': if (g) { conn.bye = true; dropGuest(conn.slot); } break;
    default: break;
  }
}

function hostOnClose(conn) {
  if (conn.slot === undefined || room.role !== 'host') return;
  const g = room.guests.get(conn.slot);
  if (!g || g.conn !== conn) return;
  if (conn.bye) dropGuest(conn.slot); else markAway(conn.slot);
}

// Se cortó la conexión de un invitado: se le guarda el lugar un rato por si vuelve
function markAway(slot) {
  const g = room.guests.get(slot), s = room.slots[slot];
  if (!g || !s || s.away) return;
  s.away = true; s.ready = false; g.awayUntil = now() + AWAY_MS; g.v = 0;
  const c = g.conn; g.conn = null;
  if (c) { try { c.close(); } catch (e) { /* nada */ } }
  room.votes = room.votes.filter((v) => v !== slot);
  handlers.onGuestAway(slot); broadcastLobby(); changed();
}

function dropGuest(slot) {
  const g = room.guests.get(slot); if (!g) return;
  const name = room.slots[slot] ? room.slots[slot].name : '';
  room.guests.delete(slot);
  room.slots[slot] = empty();
  room.votes = room.votes.filter((v) => v !== slot);
  if (g.conn) { const c = g.conn; setTimeout(() => { try { c.close(); } catch (e) { /* nada */ } }, 200); }
  handlers.onGuestLeft(slot, name);
  broadcastLobby(); broadcast({ t: 'votes', v: room.votes }); changed();
}

let pingT = 0;
function hostTicker() {
  const t = now();
  for (const [slot, g] of room.guests) {
    const s = room.slots[slot];
    if (s.away) { if (t > g.awayUntil) dropGuest(slot); continue; }
    if (t - g.last > TIMEOUT_MS) markAway(slot);
  }
  if (t - pingT >= 1000) {
    pingT = t;
    broadcast({ t: 'ping', ts: t });
    if (!room.inGame) broadcastLobby();      // en la sala se actualizan los pings cada segundo
  }
  if (room.opts.public) refreshBeacon();
}

export function broadcast(msg) {
  for (const g of room.guests.values()) { if (g.conn && g.conn.open) { try { g.conn.send(msg); } catch (e) { /* nada */ } } }
}
export function broadcastLobby() { broadcast({ t: 'lobby', slots: room.slots, opts: room.opts, code: room.code, inGame: room.inGame }); }
export function setRoomOpt(key, v) {
  room.opts[key] = v;
  if (key === 'public') { if (v) startBeacon(); else stopBeacon(); }
  broadcastLobby(); changed();
}

export const humanCount = () => room.slots.filter((s) => s.kind !== 'empty').length;

/* ---------- personajes ---------- */
// ¿lo tiene otro jugador (no bot)?
export const charTaken = (c, exceptSlot) => room.slots.some((s, i) => i !== exceptSlot && s.kind !== 'empty' && s.ch === c);
function freeChar(slot) { for (let c = 0; c < CHARS.length; c++) if (!charTaken(c, slot)) return c; return 0; }
// anfitrión: su personaje
export function setHostChar(c) { if (room.role !== 'host' || !room.slots[0]) return; room.slots[0].ch = c; broadcastLobby(); changed(); }
// invitado: elegir (lock = confirmado; confirmar es estar listo)
export function sendChar(c, lock) {
  const me = room.slots[room.mySlot]; if (me) { me.ch = c; me.ready = !!lock; }
  const conn = room.hostConn; if (conn && conn.open) { try { conn.send({ t: 'char', c, lock: !!lock }); } catch (e) { /* nada */ } }
  changed();
}
const presentHumans = () => room.slots.map((s, i) => ({ s, i })).filter(({ s }) => s.kind !== 'empty' && !s.away).map(({ i }) => i);

// Por qué todavía no se puede empezar (o null si se puede)
export function startBlocker() {
  if (room.role !== 'host') return 'SOLO EL ANFITRIÓN EMPIEZA';
  if (room.status !== 'ready') return 'LA SALA TODAVÍA SE ESTÁ CREANDO';
  const away = room.slots.find((s) => s.away);
  if (away) return `ESPERANDO QUE VUELVA ${away.name}`;
  if (!room.opts.bots && humanCount() < 2) return 'FALTAN JUGADORES (O ACTIVÁ LOS BOTS)';
  const notReady = room.slots.find((s) => s.kind === 'guest' && !s.ready);
  if (notReady && !room.inGame) return `FALTA QUE ${notReady.name} ELIJA PERSONAJE`;
  return null;
}
export const canStart = () => !startBlocker();

// Qué hay en cada lugar al empezar: host | guest | bot | none
export function slotKinds() {
  return room.slots.map((s) => (s.kind === 'empty' ? (room.opts.bots ? 'bot' : 'none') : s.kind));
}

/* ---------- revancha por votación ---------- */
function setVote(slot, v) {
  room.votes = room.votes.filter((x) => x !== slot);
  if (v) room.votes.push(slot);
  broadcast({ t: 'votes', v: room.votes });
  handlers.onVotes(); changed();
}
export function castVote(v) {
  if (room.role === 'host') setVote(0, v);
  else if (room.hostConn && room.hostConn.open) { room.votes = room.votes.filter((x) => x !== room.mySlot).concat(v ? [room.mySlot] : []); room.hostConn.send({ t: 'vote', v }); changed(); }
}
export const iVoted = () => room.votes.includes(room.mySlot);
export const voteCount = () => [room.votes.length, room.role === 'host' ? presentHumans().length : room.slots.filter((s) => s.kind !== 'empty' && !s.away).length];
export const allVoted = () => { const h = presentHumans(); return h.length > 0 && h.every((i) => room.votes.includes(i)); };

/* ---------- salas públicas: "cartel" del anfitrión ---------- */
let beacon = null, beaconTries = 0;
function publicInfo() {
  return { t: 'info', v: NET_VERSION, code: room.code, host: room.slots[0] ? room.slots[0].name : '', players: humanCount(),
    max: MAX_PLAYERS, bots: room.opts.bots, mg: room.opts.mode === 'fiesta' ? 'fiesta' : room.opts.mg, points: room.opts[mgById(room.opts.mg).points.key], inGame: room.inGame };
}
function startBeacon() {
  if (beacon || room.role !== 'host' || room.status !== 'ready') return;
  const order = [...Array(PUBLIC_SLOTS).keys()].sort(() => Math.random() - 0.5);
  beaconTries = 0;
  const attempt = () => {
    if (!room.opts.public || room.role !== 'host') return;
    if (beaconTries >= order.length) { handlers.onChange('publicFull'); return; }
    const p = new Peer(pubId(order[beaconTries++]), peerOptions());
    beacon = p;
    p.on('connection', (c) => {
      c.on('open', () => { try { c.send(publicInfo()); } catch (e) { /* nada */ } setTimeout(() => { try { c.close(); } catch (e) { /* nada */ } }, 1500); });
    });
    p.on('error', (err) => {
      if (beacon !== p) return;
      if (err.type === 'unavailable-id') { try { p.destroy(); } catch (e) { /* nada */ } beacon = null; attempt(); }
    });
  };
  attempt();
}
function refreshBeacon() { if (!beacon && room.status === 'ready') startBeacon(); }
function stopBeacon() { if (beacon) { const b = beacon; beacon = null; try { b.destroy(); } catch (e) { /* nada */ } } }

/* ---------- salas públicas: buscar ---------- */
export const browse = { status: 'idle', list: [] };
let browsePeer = null, browseTimer = 0;
export function browsePublic() {
  stopBrowse();
  browse.status = 'searching'; browse.list = [];
  const peer = new Peer(peerOptions());
  browsePeer = peer;
  peer.on('open', () => {
    for (let n = 0; n < PUBLIC_SLOTS; n++) {
      const c = peer.connect(pubId(n), { reliable: true, serialization: 'json' });
      c.on('data', (m) => {
        if (browsePeer !== peer || !m || m.t !== 'info' || m.v !== NET_VERSION) return;
        if (!browse.list.some((r) => r.code === m.code)) { browse.list.push(m); changed(); }
        try { c.close(); } catch (e) { /* nada */ }
      });
    }
  });
  peer.on('error', (err) => {
    if (browsePeer !== peer || err.type === 'peer-unavailable') return;
    browse.status = 'error'; changed();
  });
  browseTimer = setTimeout(() => { if (browsePeer === peer) { browse.status = 'done'; stopBrowse(true); changed(); } }, 5000);
}
export function stopBrowse(keepList) {
  clearTimeout(browseTimer);
  if (browsePeer) { const p = browsePeer; browsePeer = null; setTimeout(() => { try { p.destroy(); } catch (e) { /* nada */ } }, 100); }
  if (!keepList) browse.list = [];
}

/* ================= INVITADO ================= */

let joinTimer = 0, reconnectTimer = 0, reconnectUntil = 0, lastHost = 0;

export function joinRoom(code) {
  leaveRoom();
  Object.assign(room, { role: 'guest', status: 'connecting', code, slots: [], inGame: false, votes: [] });
  changed();
  const peer = new Peer(peerOptions());
  room.peer = peer;
  clearTimeout(joinTimer);
  joinTimer = setTimeout(() => { if (room.peer === peer && room.status === 'connecting') fail('timeout'); }, 15000);
  peer.on('open', () => { if (room.peer === peer) connectToHost(); });
  peer.on('error', (err) => {
    if (room.peer !== peer) return;
    if (room.status === 'reconnecting') return;       // se sigue intentando hasta que venza el plazo
    if (room.status === 'connecting' || room.status === 'error') fail(err.type);
  });
  peer.on('disconnected', () => { if (room.peer === peer && room.role === 'guest') { try { peer.reconnect(); } catch (e) { /* nada */ } } });
  startTicker(guestTicker);
}

function connectToHost() {
  const conn = room.peer.connect(idFor(room.code), { reliable: true, serialization: 'json' });
  room.hostConn = conn;
  conn.on('open', () => { lastHost = now(); conn.send({ t: 'hello', v: NET_VERSION, name: myName(), token: token() }); });
  conn.on('data', (m) => { if (room.hostConn === conn) { lastHost = now(); guestOnData(m); } });
  const lost = () => { if (room.hostConn === conn) hostLost(); };
  conn.on('close', lost);
  conn.on('error', lost);
}

function guestTicker() {
  if (room.status === 'joined' && now() - lastHost > TIMEOUT_MS) hostLost();
}

// Se cortó la conexión con el anfitrión: se reintenta unos segundos antes de rendirse
function hostLost() {
  if (room.role !== 'guest') return;
  if (room.status === 'connecting') { fail('timeout'); return; }
  if (room.status !== 'joined') return;
  room.status = 'reconnecting';
  reconnectUntil = now() + AWAY_MS - 1500;
  handlers.onReconnecting(); changed();
  const retry = () => {
    if (room.role !== 'guest' || room.status !== 'reconnecting') return;
    if (now() > reconnectUntil) { leaveRoom(); handlers.onClosed('SE PERDIÓ LA CONEXIÓN'); return; }
    const peer = room.peer;
    if (peer && peer.disconnected) { try { peer.reconnect(); } catch (e) { /* nada */ } }
    if (peer && peer.open) { const old = room.hostConn; room.hostConn = null; if (old) { try { old.close(); } catch (e) { /* nada */ } } connectToHost(); }
    reconnectTimer = setTimeout(retry, 2000);
  };
  reconnectTimer = setTimeout(retry, 500);
}

function guestOnData(m) {
  if (!m || room.role !== 'guest') return;
  switch (m.t) {
    case 'welcome': {
      const again = room.status === 'reconnecting';
      room.mySlot = m.slot; room.status = 'joined'; clearTimeout(joinTimer); clearTimeout(reconnectTimer);
      if (again) handlers.onReconnected();
      changed(); break;
    }
    case 'deny': fail(m.why); break;
    case 'lobby': {
      room.slots = m.slots; room.opts = m.opts; room.inGame = m.inGame;
      const me = m.slots[room.mySlot]; if (me) room.myPing = me.ping || room.myPing;
      changed(); break;
    }
    case 'ping': if (room.hostConn && room.hostConn.open) { try { room.hostConn.send({ t: 'pong', ts: m.ts }); } catch (e) { /* nada */ } } break;
    case 'votes': room.votes = m.v || []; changed(); break;
    case 'start': room.inGame = true; room.votes = []; handlers.onStart(m); break;
    case 's': if (m.pg) room.myPing = m.pg[room.mySlot] || room.myPing; handlers.onSnap(m); break;
    case 'toLobby': room.inGame = false; room.votes = []; handlers.onToLobby(); break;
    case 'closed': { leaveRoom(); handlers.onClosed('LA SALA SE CERRÓ'); break; }
    default: break;
  }
}

// Lo que manda el invitado sobre su nave (cada minijuego decide qué: posición, dirección, golpes)
export function sendInput(data) {
  const c = room.hostConn;
  if (c && c.open) { try { c.send(Object.assign({ t: 'i' }, data)); } catch (e) { /* nada */ } }
}
export function sendReady(v) {
  const me = room.slots[room.mySlot]; if (me) me.ready = v;
  const c = room.hostConn; if (c && c.open) { try { c.send({ t: 'ready', v }); } catch (e) { /* nada */ } }
  changed();
}
export const amReady = () => !!(room.slots[room.mySlot] && room.slots[room.mySlot].ready);

// Al volver a la sala se borran los "listo" y los votos
export function resetLobbyFlags() {
  room.slots.forEach((s) => { if (s.kind === 'guest') s.ready = false; });
  room.votes = [];
}

export function cleanName(n) { return String(n || '').toUpperCase().replace(/[^A-Z0-9 ]/g, '').trim().slice(0, 8) || 'JUGADOR'; }
