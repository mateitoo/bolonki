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

export function soloSetup() { return { mode: 'solo', ctrl: ['local', 'ai', 'ai', 'ai'], me: 0, points: settings.points }; }
const demoSetup = () => ({ mode: 'demo', ctrl: ['ai', 'ai', 'ai', 'ai'], me: -1, points: 15 });

// Multijugador local: J1 abajo, J2 enfrente, J3 y J4 a los costados
const LOCAL_SLOTS = { 2: [0, 2], 3: [0, 2, 1], 4: [0, 2, 1, 3] };
export function localSetup(n, bots, points) {
  const ctrl = [0, 1, 2, 3].map(() => (bots ? 'ai' : 'none'));
  const pads = [null, null, null, null], names = [null, null, null, null];
  LOCAL_SLOTS[n].forEach((slot, j) => { ctrl[slot] = 'local'; pads[slot] = `p${j + 1}`; names[slot] = `J${j + 1}`; });
  return { mode: 'local', ctrl, pads, names, me: 0, points };
}

export function resetMatch(mode, setup) {
  const demo = mode === 'title' || mode === 'menu';
  const cfg = setup || (demo ? demoSetup() : soloSetup());
  Object.assign(game, {
    state: mode, elapsed: 0, spawnT: 0.8, pending: null, winner: -1, timeScale: 1, slowT: 0, slowK: 1,
    humanOut: false, pendingEnd: false, demoResetT: 0, camFocusTarget: 0, showcaseT: 0,
    me: cfg.me, setup: cfg, mode: cfg.mode || (demo ? 'demo' : 'solo'),
  });
  world.barriers.forEach((b) => (b.y = -3));
  game.players.forEach((p) => {
    const ctrl = cfg.ctrl[p.i];
    Object.assign(p, {
      ctrl, empty: ctrl === 'none', alive: ctrl !== 'none', score: ctrl === 'none' ? 0 : cfg.points,
      s: 0, v: 0, swing: 0, cd: 0, flash: 0, death: null, spin: 0, hitDone: false,
      pad: cfg.pads ? cfg.pads[p.i] : 'all', name: cfg.names ? cfg.names[p.i] : null,
    });
    resetPodVisual(p);
    if (p.empty) { p.mesh.root.visible = false; world.barriers[p.i].y = 0.55; }
    podPos(p);
  });
  world.chevSets.forEach((c) => (c.warn = 0));
  game.balls.forEach(removeBall);
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
  const anim = forcedAnim || pickDeath(settings.deathId);
  FX.elim(i, anim.id);
  // cámara lenta: fuerte si perdiste vos jugando solo, cortita en el resto de los casos
  if (i === game.me && game.mode === 'solo') { game.slowT = 1.4; game.slowK = 0.35; }
  else { game.slowT = Math.max(game.slowT, 0.35); game.slowK = Math.min(game.slowK, 0.6); }
  const alive = game.players.filter((q) => q.alive);
  if (alive.length <= 1) { game.winner = alive.length ? alive[0].i : i; game.pendingEnd = true; }
}

export const deathsRunning = () => game.players.some((p) => p.death && !p.death.done);
