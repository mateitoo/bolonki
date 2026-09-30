// Partida online (común a todos los minijuegos): el anfitrión simula y manda snapshots;
// el invitado los interpola. Lo propio de cada minijuego (qué se manda, cómo se aplica,
// qué hace el invitado con su nave) está en su snapshot() / applySnap() / guestLocal().
import { clamp } from '../config.js';
import { game } from '../state.js';
import { room, broadcast, broadcastFast, broadcastLobby, slotKinds, resetLobbyFlags } from './room.js';
import { resetMatch, eliminate } from '../game/match.js';
import { setRecording, outbox, playEvent } from '../game/fx.js';
import { mg, mgById } from '../minigames/registry.js';
import { fillChars } from '../chars.js';

const SNAP_RATE = 1 / 30;    // snapshots por segundo que manda el anfitrión
// El invitado dibuja a los demás un poquito en el pasado (para tener dos fotos entre las cuales
// interpolar). Ese retraso se ajusta solo: con una conexión pareja es chico, con una que va a los
// tirones (wifi del celular) crece lo necesario para que no se vea a saltos.
const DELAY_MIN = 45, DELAY_MAX = 260;
const r2 = (v) => Math.round(v * 100) / 100;
const r1 = (v) => Math.round(v * 10) / 10;

/* ================= ANFITRIÓN ================= */
let snapT = 0;

// La Fiesta arranca desde su propio módulo (lo registra él, para no tener imports circulares)
let fiestaStarter = null;
export function setFiestaStarter(fn) { fiestaStarter = fn; }

// Cambia de escena en toda la sala (minijuego o tablero): lo arma acá y les avisa a los invitados
export function hostLaunch(setup, info) {
  game.online = 'host';
  room.startInfo = Object.assign({ t: 'start', chars: setup.chars || game.chars }, info);
  broadcast(room.startInfo);
  resetMatch('count', setup);
  game.players.forEach((p) => { p.net = room.guests.get(p.i) || null; p.isBot = info.kinds[p.i] === 'bot'; });
  snapT = 0;
}

export function hostStart() {
  const kinds = slotKinds();
  const names = room.slots.map((s) => (s.kind === 'empty' ? null : s.name));
  const chars = fillChars(room.slots.map((s) => (s.kind === 'empty' ? -1 : s.ch)));   // los bots, con los que quedan
  if (room.opts.mode === 'fiesta' && fiestaStarter) {
    room.inGame = true; room.votes = [];
    game.difficulty = room.opts.difficulty;
    setRecording(true);
    broadcast({ t: 'votes', v: [] });
    broadcastLobby();
    const ctrl = kinds.map((k, i) => (i === 0 ? 'local' : k === 'guest' ? 'remote' : k === 'bot' ? 'ai' : 'none'));
    fiestaStarter({ mode: 'online', ctrl, names, kinds, me: 0, chars }, room.opts.turns);
    return;
  }
  const m = mgById(room.opts.mg);
  const points = room.opts[m.points.key];
  const setup = {
    mode: 'online', mg: m.id, names,
    ctrl: kinds.map((k, i) => (i === 0 ? 'local' : k === 'guest' ? 'remote' : k === 'bot' ? 'ai' : 'none')),
    me: 0, points, chars, map: room.opts.maps && Number.isInteger(room.opts.maps[m.id]) ? room.opts.maps[m.id] : -1,
  };
  room.inGame = true; room.votes = [];
  game.online = 'host';
  game.difficulty = room.opts.difficulty;
  setRecording(true);
  room.startInfo = { t: 'start', mg: m.id, kinds, names, points, difficulty: room.opts.difficulty, chars };
  broadcast(room.startInfo);
  broadcast({ t: 'votes', v: [] });
  broadcastLobby();
  resetMatch('count', setup);
  game.players.forEach((p) => { p.net = room.guests.get(p.i) || null; p.isBot = kinds[p.i] === 'bot'; });
  snapT = 0;
}

let snapSeq = 0;
export function hostTick(rdt) {
  snapT -= rdt;
  if (snapT > 0) return;
  snapT = Math.max(snapT + SNAP_RATE, SNAP_RATE * 0.5);
  const ts = Math.round(performance.now());
  // los eventos (sonidos, explosiones, goles) van por el canal seguro: no se pueden perder
  if (outbox.length) broadcast({ t: 'ev', ts, ev: outbox.splice(0) });
  // la foto del estado va por el canal rápido: si se pierde una, llega la siguiente
  broadcastFast({
    t: 's', ts, sq: ++snapSeq, mg: game.minigame, st: game.state, c: r2(game.countT), el: r1(game.elapsed), w: game.winner,
    m: mg().snapshot(),
    pg: room.slots.map((s) => (s && s.ping) || 0),
  });
}

// Un invitado se fue en plena partida: su lugar pasa a un bot, o queda afuera si la sala es sin bots
export function hostGuestLeft(slot) {
  const p = game.players[slot];
  p.net = null;
  if (!p.alive) return;
  if (room.opts.bots || game.minigame === 'fiesta' || (game.setup && game.setup.fiesta)) { p.ctrl = 'ai'; p.isBot = true; }
  else if (game.minigame === 'bolas') eliminate(slot);
  else { p.ctrl = 'none'; }        // en Empujón se queda quieto hasta que lo tiren
}

export function hostBackToLobby() {
  room.inGame = false;
  resetLobbyFlags();
  broadcast({ t: 'toLobby' });
  broadcastLobby();
  endOnline();
}

export function endOnline() { setRecording(false); game.online = 'off'; }

/* ================= INVITADO ================= */
const buf = [];      // snapshots recibidos { time, m } (time: en el reloj de acá)
const evq = [];      // eventos a reproducir { time, ev }
let hitCount = 0, resumed = false;
// reloj: offset = cuánto hay que sumarle a la hora del anfitrión para tenerla en el reloj de acá
// (incluye la demora del viaje más corto visto); jit = cuánto más tardan, a veces, los paquetes
const clock = { offset: null, jit: 0, delay: 100, lastSq: 0 };
function resetClock() { clock.offset = null; clock.jit = 0; clock.delay = 100; clock.lastSq = 0; }
function hostToLocal(ts) {
  const now = performance.now();
  const sample = now - ts;
  if (clock.offset === null || sample < clock.offset) clock.offset = sample;
  else clock.offset += (sample - clock.offset) * 0.002;           // si la ruta se hizo más lenta, se acomoda de a poco
  clock.jit = Math.max(clock.jit * 0.99, sample - clock.offset);
  return ts + clock.offset;
}

export function guestStart(m) {
  // volvió después de un corte: la partida sigue, solo se limpia lo recibido
  if (m.resume && game.online === 'guest' && (m.mg || 'bolas') === game.minigame) { buf.length = 0; evq.length = 0; resetClock(); resumed = true; return; }
  const setup = {
    mode: 'online', mg: m.mg || 'bolas', names: m.names || null,
    ctrl: m.kinds.map((k, i) => (k === 'none' ? 'none' : i === room.mySlot ? 'local' : 'net')),   // en un duelo de la Fiesta podés no jugar
    me: room.mySlot, points: m.points, fiesta: !!m.fiesta, duel: !!m.duel, chars: m.chars || null,
  };
  game.online = 'guest';
  game.difficulty = m.difficulty;
  buf.length = 0; evq.length = 0; hitCount = 0; resetClock();
  resetMatch('count', setup);
  game.players.forEach((p, i) => { p.isBot = m.kinds[i] === 'bot'; });
}

export function guestSnap(m) {
  if (m.sq !== undefined) {
    // por el canal rápido pueden llegar desordenadas: una más vieja que la última se descarta
    if (m.sq <= clock.lastSq && m.sq > clock.lastSq - 3000) return;
    clock.lastSq = m.sq;
  }
  const time = m.ts !== undefined ? hostToLocal(m.ts) : performance.now();
  buf.push({ time, m });
  if (buf.length > 40) buf.shift();
  for (const ev of m.ev || []) evq.push({ time, ev });
}
// eventos del anfitrión (llegan aparte, por el canal seguro)
export function guestEvents(m) {
  const time = m.ts !== undefined && clock.offset !== null ? m.ts + clock.offset : performance.now();
  for (const ev of m.ev || []) evq.push({ time, ev });
  evq.sort((a, b) => a.time - b.time);
}

// Busca las dos fotos que rodean el momento rt (y cuánto de una a la otra)
function around(rt) {
  let i = 0;
  while (i < buf.length - 2 && buf[i + 1].time <= rt) i++;
  const a = buf[i], b = buf[i + 1] || a;
  const f = b === a ? 0 : clamp((rt - a.time) / (b.time - a.time), 0, 1);
  return { a, b, f };
}

// Golpe del invitado: se le avisa al anfitrión (y cada minijuego decide si lo muestra ya)
export function guestHit() {
  const me = game.players[game.me];
  if (!me || !me.alive || me.cd > 0) return;
  hitCount++;
  mg().guestHitFx(me);
}

let onEnd = () => {};
export function setGuestEndHandler(fn) { onEnd = fn; }

export function guestFrame(rdt) {
  const now = performance.now();
  // retraso: un intervalo entre fotos más lo que vienen variando los paquetes (con un margen)
  const want = clamp(SNAP_RATE * 1000 * 1.25 + clock.jit * 1.1 + 8, DELAY_MIN, DELAY_MAX);
  clock.delay += (want - clock.delay) * Math.min(1, rdt * (want > clock.delay ? 6 : 0.8));   // sube rápido, baja despacio
  const rt = now - clock.delay;
  while (evq.length && evq[0].time <= rt) playEvent(evq.shift().ev);

  if (buf.length) {
    while (buf.length > 2 && buf[1].time <= rt) buf.shift();
    const { a, b, f } = around(rt);
    const A = a.m, Bm = b.m;
    if (A.mg && (A.mg !== game.minigame || Bm.mg !== game.minigame)) { mg().guestLocal(rdt, hitCount); return; }   // todavía no llegó el cambio de escena
    game.countT = A.c; game.elapsed = A.el;
    if (A.st !== game.state && game.state !== 'paused') {
      if (A.st === 'end' && game.state !== 'end') { game.winner = A.w; game.state = 'end'; onEnd(); }
      else if (A.st !== 'end') game.state = A.st;
    }
    if (A.m && Bm.m) mg().applySnap(A.m, Bm.m, f, rdt, resumed);
    resumed = false;
    ownFresh(now);
  }
  mg().guestLocal(rdt, hitCount);
}

// Tu propio personaje (en los minijuegos donde lo mueve el anfitrión) se dibuja con la foto más
// nueva que llegó, no con el retraso de los demás: así responde bastante antes a lo que tocás.
const lerpAng = (a, b, f) => { let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return a + d * f; };
function ownFresh(now) {
  const o = mg().ownPos; if (!o || !buf.length) return;
  const p = game.players[game.me]; if (!p || p.empty || p.death || !p.alive) return;
  const { a, b, f } = around(now - clamp(clock.jit * 1.1 + 6, 6, 120));
  if (a.m.mg !== game.minigame || b.m.mg !== game.minigame) return;
  const pa = a.m.m && a.m.m.p && a.m.m.p[game.me], pb = b.m.m && b.m.m.p && b.m.m.p[game.me];
  if (!pa || !pb || Math.hypot(pb[o.x] - pa[o.x], pb[o.z] - pa[o.z]) > 4) return;
  const nx = pa[o.x] + (pb[o.x] - pa[o.x]) * f, nz = pa[o.z] + (pb[o.z] - pa[o.z]) * f;
  if (Math.hypot(nx - p.x, nz - p.z) > 5) return;              // un salto grande (volvió a aparecer): que lo resuelva la foto normal
  p.x = nx; p.z = nz;
  if (o.fy !== undefined) p.fy = pa[o.fy] + (pb[o.fy] - pa[o.fy]) * f;
  if (o.ang !== undefined) p.ang = lerpAng(pa[o.ang], pb[o.ang], f);
}

// para las pruebas: cómo viene la conexión del invitado
export const netStats = () => ({ delay: Math.round(clock.delay), jit: Math.round(clock.jit), buf: buf.length, lastSq: clock.lastSq });
