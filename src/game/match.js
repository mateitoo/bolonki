// Reglas de la partida: armado, disparos de torre, goles y eliminaciones.
//
// Cada lugar de la arena tiene un "control":
//   'local'  -> lo maneja quien está en esta máquina
//   'ai'     -> bot
//   'remote' -> (anfitrión) lo maneja un invitado por red
//   'net'    -> (invitado) lo mueve el anfitrión con sus snapshots
//   'none'   -> lugar vacío: el arco queda cerrado con la barrera y la pelota rebota
import { CORN, R, PD, BALL, rnd } from '../config.js';
import { settings } from '../settings.js';
import { game, world } from '../state.js';
import { resetPodVisual } from '../world/pods.js';
import { removeBall } from '../world/balls.js';
import { pickDeath } from '../deaths/index.js';
import { FX } from './fx.js';
import { MINIGAMES, mgById, activate } from '../minigames/registry.js';

// "puntos" de cada minijuego (en Bola Brava son vidas; en Empujón, rondas para ganar)
export const pointsFor = (id) => settings[mgById(id).points.key] || mgById(id).points.values[1];

export function soloSetup() { return { mode: 'solo', mg: settings.mg, ctrl: ['local', 'ai', 'ai', 'ai'], me: 0, points: pointsFor(settings.mg) }; }

// La demo del título y los menús va alternando entre los minijuegos
let demoIdx = 0;
export function nextDemo() { demoIdx = (demoIdx + 1) % MINIGAMES.length; }
export function demoSetup(id) {
  const m = id ? mgById(id) : MINIGAMES[demoIdx];
  return { mode: 'demo', mg: m.id, ctrl: ['ai', 'ai', 'ai', 'ai'], me: -1, points: m.points.demo };
}

// Multijugador local: J1 abajo, J2 enfrente, J3 y J4 a los costados
const LOCAL_SLOTS = { 2: [0, 2], 3: [0, 2, 1], 4: [0, 2, 1, 3] };
export function localSetup(n, bots, points, mgId) {
  const ctrl = [0, 1, 2, 3].map(() => (bots ? 'ai' : 'none'));
  const pads = [null, null, null, null], names = [null, null, null, null];
  LOCAL_SLOTS[n].forEach((slot, j) => { ctrl[slot] = 'local'; pads[slot] = `p${j + 1}`; names[slot] = `J${j + 1}`; });
  return { mode: 'local', mg: mgId || settings.mg, ctrl, pads, names, me: 0, points };
}

export function resetMatch(mode, setup) {
  const demo = mode === 'title' || mode === 'menu';
  const cfg = setup || (demo ? demoSetup() : soloSetup());
  const m = activate(cfg.mg || game.minigame);
  Object.assign(game, {
    state: mode, elapsed: 0, spawnT: 0.8, pending: null, winner: -1, timeScale: 1, slowT: 0, slowK: 1,
    humanOut: false, pendingEnd: false, demoResetT: 0, camFocusTarget: 0, showcaseT: 0,
    me: cfg.me, setup: cfg, mode: cfg.mode || (demo ? 'demo' : 'solo'), target: cfg.points, elimOrder: [], camYaw: 0, camPitch: 0,
  });
  game.players.forEach((p) => {
    const ctrl = cfg.ctrl[p.i];
    Object.assign(p, {
      ctrl, empty: ctrl === 'none', alive: ctrl !== 'none', score: ctrl === 'none' ? 0 : cfg.points,
      s: 0, v: 0, swing: 0, cd: 0, flash: 0, death: null, spin: 0, hitDone: false,
      pad: cfg.pads ? cfg.pads[p.i] : 'all', name: cfg.names ? cfg.names[p.i] : null,
    });
    resetPodVisual(p);
  });
  m.reset(cfg);
  if (mode === 'count') { game.countT = 3.999; FX.tick(); }
}

export function podPos(p) {
  const s = p.side;
  p.x = s.nx * PD + s.tx * p.s; p.z = s.nz * PD + s.tz * p.s;
  p.vx = s.tx * p.v; p.vz = s.tz * p.v;
}

export function startSwing(p) { p.swing = 0.2; p.cd = 0.42; p.hitDone = false; p.spin = 1; }

// La torre ci dispara una pelota rodando hacia el centro (con algo de ángulo aleatorio)
export function fireFrom(ci) {
  const b = game.balls.find((b) => !b.on); if (!b) return;
  const c = CORN[ci];
  let dx = -c[0], dz = -c[1]; const l = Math.hypot(dx, dz); dx /= l; dz /= l;
  const a = rnd(-0.38, 0.38), ca = Math.cos(a), sa = Math.sin(a);
  const ux = dx * ca - dz * sa, uz = dx * sa + dz * ca;
  Object.assign(b, { on: true, x: c[0] + dx * (R - 0.3), z: c[1] + dz * (R - 0.3), fresh: true, power: 0, trailT: 0 });
  const sp = rnd(BALL.launchMin, BALL.launchMax); b.vx = ux * sp; b.vz = uz * sp;
  b.mesh.visible = true; b.sh.visible = true;
  FX.fire(ci, b.x, b.z);
}

export function scoreGoal(i, b) {
  const p = game.players[i];
  removeBall(b);
  p.score = Math.max(0, p.score - 1);
  FX.goal(i, b.x, b.z);
  if (p.score === 0) eliminate(i);
}

export function eliminate(i, forcedAnim) {
  const p = game.players[i]; if (!p.alive) return;
  p.alive = false; p.score = 0;
  game.elimOrder.push(i);
  const anim = forcedAnim || pickDeath(settings.deathId);
  FX.elim(i, anim.id);
  // cámara lenta: fuerte si perdiste vos jugando solo, cortita en el resto de los casos
  if (i === game.me && game.mode === 'solo') { game.slowT = 1.4; game.slowK = 0.35; }
  else { game.slowT = Math.max(game.slowT, 0.35); game.slowK = Math.min(game.slowK, 0.6); }
  const alive = game.players.filter((q) => q.alive);
  if (alive.length <= 1) { game.winner = alive.length ? alive[0].i : i; game.pendingEnd = true; }
}

// Puestos al terminar un minijuego: [1°, 2°, ...] (el ganador y después los eliminados, del último al primero)
export function placement() {
  const inGame = game.players.filter((p) => !p.empty).map((p) => p.i);
  const order = [];
  const put = (i) => { if (i >= 0 && inGame.includes(i) && !order.includes(i)) order.push(i); };
  put(game.winner);
  game.players.filter((p) => p.alive && !p.empty).sort((a, b) => b.score - a.score).forEach((p) => put(p.i));
  game.elimOrder.slice().reverse().forEach(put);
  inGame.forEach(put);
  return order;
}

export const deathsRunning = () => game.players.some((p) => p.death && !p.death.done);
