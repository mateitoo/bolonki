// Partida online: el anfitrión simula y manda snapshots; el invitado los interpola y mueve su propia nave.
import { HUMAN_SPEED, clamp } from '../config.js';
import { game } from '../state.js';
import { room, broadcast, broadcastLobby, sendInput, slotKinds } from './room.js';
import { resetMatch, podPos, startSwing, eliminate } from '../game/match.js';
import { setRecording, outbox, playEvent } from '../game/fx.js';
import { movePod } from '../game/physics.js';
import { removeBall } from '../world/balls.js';
import { dropDot } from '../fx/particles.js';
import { input } from '../input.js';

const SNAP_RATE = 1 / 20;    // snapshots por segundo que manda el anfitrión
const SEND_RATE = 1 / 30;    // posición propia que manda el invitado
const DELAY = 100;           // ms: el invitado dibuja un poquito en el pasado para interpolar suave

const r2 = (v) => Math.round(v * 100) / 100;
const r1 = (v) => Math.round(v * 10) / 10;

/* ================= ANFITRIÓN ================= */
let snapT = 0;

export function hostStart() {
  const kinds = slotKinds();
  const setup = {
    ctrl: kinds.map((k, i) => (i === 0 ? 'local' : k === 'guest' ? 'remote' : k === 'bot' ? 'ai' : 'none')),
    me: 0, points: room.opts.points,
  };
  room.inGame = true;
  game.online = 'host';
  game.difficulty = room.opts.difficulty;
  setRecording(true);
  broadcast({ t: 'start', kinds, points: room.opts.points, difficulty: room.opts.difficulty });
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
    t: 's', st: game.state, c: r2(game.countT), el: r1(game.elapsed), w: game.winner,
    p: game.players.map((p) => [r2(p.s), r1(p.v), p.alive ? 1 : 0, p.score, p.swing > 0 ? 1 : 0]),
    b: game.balls.map((b) => (b.on ? [r2(b.x), r2(b.z), b.power > 0 ? 1 : 0] : 0)),
    ev: outbox.splice(0),
  });
}

// Un invitado se fue en plena partida: su lugar pasa a un bot, o se cierra si la sala es sin bots
export function hostGuestLeft(slot) {
  const p = game.players[slot];
  p.net = null;
  if (!p.alive) return;
  if (room.opts.bots) { p.ctrl = 'ai'; p.isBot = true; } else eliminate(slot);
}

export function hostBackToLobby() {
  room.inGame = false;
  broadcast({ t: 'toLobby' });
  broadcastLobby();
  endOnline();
}

export function endOnline() { setRecording(false); game.online = 'off'; }

/* ================= INVITADO ================= */
const buf = [];      // snapshots recibidos { time, m }
const evq = [];      // eventos a reproducir { time, ev }
let sendT = 0, hitCount = 0;

export function guestStart(m) {
  const setup = {
    ctrl: m.kinds.map((k, i) => (i === room.mySlot ? 'local' : k === 'none' ? 'none' : 'net')),
    me: room.mySlot, points: m.points,
  };
  game.online = 'guest';
  game.difficulty = m.difficulty;
  buf.length = 0; evq.length = 0; sendT = 0; hitCount = 0;
  resetMatch('count', setup);
  game.players.forEach((p, i) => { p.isBot = m.kinds[i] === 'bot'; });
}

export function guestSnap(m) {
  const now = performance.now();
  buf.push({ time: now, m });
  if (buf.length > 30) buf.shift();
  for (const ev of m.ev || []) evq.push({ time: now, ev });
}

// Golpe fuerte del invitado: se ve al instante acá y se avisa al anfitrión
export function guestHit() {
  const me = game.players[game.me];
  if (!me || !me.alive || me.cd > 0) return;
  startSwing(me); hitCount++;
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

    // estado general
    game.countT = A.c; game.elapsed = A.el;
    if (A.st !== game.state && !(game.state === 'paused')) {
      if (A.st === 'end' && game.state !== 'end') { game.winner = A.w; game.state = 'end'; onEnd(); }
      else if (A.st !== 'end') game.state = A.st;
    }

    // naves (la propia la mueve este jugador)
    game.players.forEach((p, i) => {
      const pa = A.p[i], pb = Bm.p[i];
      p.alive = !!pa[2]; p.score = pa[3];
      if (p.ctrl !== 'net') return;
      p.s = pa[0] + (pb[0] - pa[0]) * f; p.v = pa[1];
      if (pa[4] && !(p.swing > 0)) p.spin = 1;
      p.swing = pa[4] ? 0.1 : 0;
      podPos(p);
    });

    // pelotas
    game.balls.forEach((ball, k) => {
      const ba = A.b[k], bb = Bm.b[k];
      if (!ba) { if (ball.on) removeBall(ball); return; }
      const nx = bb ? ba[0] + (bb[0] - ba[0]) * f : ba[0];
      const nz = bb ? ba[1] + (bb[1] - ba[1]) * f : ba[1];
      if (!ball.on) { ball.on = true; ball.mesh.visible = true; ball.sh.visible = true; ball.trailT = 0; }
      const dx = nx - ball.x, dz = nz - ball.z;
      ball.x = nx; ball.z = nz; ball.power = ba[2] ? 1 : 0;
      ball.trailT -= rdt;
      if (ball.trailT <= 0 && dx * dx + dz * dz < 4) { ball.trailT = 0.04; dropDot(nx - dx * 0.5, nz - dz * 0.5); }
    });
  }

  // la nave propia, con respuesta inmediata
  const me = game.players[game.me];
  if (me) {
    me.cd -= rdt; if (me.swing > 0) me.swing -= rdt;
    const canMove = me.alive && (game.state === 'play' || game.state === 'count');
    movePod(me, canMove ? input.axis * HUMAN_SPEED : 0, rdt);
    sendT -= rdt;
    if (sendT <= 0) { sendT = SEND_RATE; sendInput(me.s, me.v, hitCount); }
  }
}
