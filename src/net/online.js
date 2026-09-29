// Partida online (común a todos los minijuegos): el anfitrión simula y manda snapshots;
// el invitado los interpola. Lo propio de cada minijuego (qué se manda, cómo se aplica,
// qué hace el invitado con su nave) está en su snapshot() / applySnap() / guestLocal().
import { clamp } from '../config.js';
import { game } from '../state.js';
import { room, broadcast, broadcastLobby, slotKinds, resetLobbyFlags } from './room.js';
import { resetMatch, eliminate } from '../game/match.js';
import { setRecording, outbox, playEvent } from '../game/fx.js';
import { mg, mgById } from '../minigames/registry.js';
import { fillChars } from '../chars.js';

const SNAP_RATE = 1 / 20;    // snapshots por segundo que manda el anfitrión
const DELAY = 100;           // ms: el invitado dibuja un poquito en el pasado para interpolar suave
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
    me: 0, points, chars,
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

export function hostTick(rdt) {
  snapT -= rdt;
  if (snapT > 0) return;
  snapT = SNAP_RATE;
  broadcast({
    t: 's', mg: game.minigame, st: game.state, c: r2(game.countT), el: r1(game.elapsed), w: game.winner,
    m: mg().snapshot(),
    ev: outbox.splice(0),
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
const buf = [];      // snapshots recibidos { time, m }
const evq = [];      // eventos a reproducir { time, ev }
let hitCount = 0, resumed = false;

export function guestStart(m) {
  // volvió después de un corte: la partida sigue, solo se limpia lo recibido
  if (m.resume && game.online === 'guest' && (m.mg || 'bolas') === game.minigame) { buf.length = 0; evq.length = 0; resumed = true; return; }
  const setup = {
    mode: 'online', mg: m.mg || 'bolas', names: m.names || null,
    ctrl: m.kinds.map((k, i) => (k === 'none' ? 'none' : i === room.mySlot ? 'local' : 'net')),   // en un duelo de la Fiesta podés no jugar
    me: room.mySlot, points: m.points, fiesta: !!m.fiesta, duel: !!m.duel, chars: m.chars || null,
  };
  game.online = 'guest';
  game.difficulty = m.difficulty;
  buf.length = 0; evq.length = 0; hitCount = 0;
  resetMatch('count', setup);
  game.players.forEach((p, i) => { p.isBot = m.kinds[i] === 'bot'; });
}

export function guestSnap(m) {
  const now = performance.now();
  buf.push({ time: now, m });
  if (buf.length > 30) buf.shift();
  for (const ev of m.ev || []) evq.push({ time: now, ev });
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
  const now = performance.now(), rt = now - DELAY;
  while (evq.length && evq[0].time <= rt) playEvent(evq.shift().ev);

  if (buf.length) {
    while (buf.length > 2 && buf[1].time <= rt) buf.shift();
    const a = buf[0], b = buf[1] || a;
    const f = b === a ? 0 : clamp((rt - a.time) / (b.time - a.time), 0, 1);
    const A = a.m, Bm = b.m;
    if (A.mg && (A.mg !== game.minigame || Bm.mg !== game.minigame)) { mg().guestLocal(rdt, hitCount); return; }   // todavía no llegó el cambio de escena
    game.countT = A.c; game.elapsed = A.el;
    if (A.st !== game.state && game.state !== 'paused') {
      if (A.st === 'end' && game.state !== 'end') { game.winner = A.w; game.state = 'end'; onEnd(); }
      else if (A.st !== 'end') game.state = A.st;
    }
    if (A.m && Bm.m) mg().applySnap(A.m, Bm.m, f, rdt, resumed);
    resumed = false;
  }
  mg().guestLocal(rdt, hitCount);
}
