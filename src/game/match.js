// Reglas de la partida: reinicio, disparos de torre, goles y eliminaciones.
import { CORN, R, PD, BALL, START_PTS, rnd } from '../config.js';
import { game, world } from '../state.js';
import { resetPodVisual } from '../world/pods.js';
import { removeBall } from '../world/balls.js';
import { burst, P } from '../fx/particles.js';
import { SFX } from '../audio.js';
import { pickDeath } from '../deaths/index.js';

export const settings = { deathId: 'random' };

export function resetMatch(mode) {
  Object.assign(game, {
    state: mode, elapsed: 0, spawnT: 0.8, pending: null, winner: -1, timeScale: 1, slowT: 0, slowK: 1,
    humanOut: false, pendingEnd: false, demoResetT: 0, camFocusTarget: 0,
  });
  game.players.forEach((p) => {
    Object.assign(p, { score: START_PTS, alive: true, s: 0, v: 0, swing: 0, cd: 0, flash: 0, death: null, spin: 0 });
    p.human = mode !== 'title' && p.i === 0;
    resetPodVisual(p);
  });
  world.barriers.forEach((b) => (b.y = -3));
  world.chevSets.forEach((c) => (c.warn = 0));
  game.balls.forEach(removeBall);
  if (mode === 'count') { game.countT = 3.999; SFX.tick(); }
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
  world.towers[ci].flash = 0.3; SFX.fire();
  burst(b.x, 0.8, b.z, { mat: P.RED, n: 5, sp: 3, up: [1, 3], life: [0.15, 0.3] });
}

export function scoreGoal(i, b) {
  const p = game.players[i];
  removeBall(b);
  p.score = Math.max(0, p.score - 1); p.flash = 0.6; world.goalLasers[i].t = 0.4;
  burst(b.x, 0.5, b.z, { mat: i, n: 12, sp: 6 }); game.shake = Math.max(game.shake, 0.3);
  SFX.goal();
  if (p.score === 0) eliminate(i);
}

export function eliminate(i, forcedAnim) {
  const p = game.players[i]; if (!p.alive) return;
  p.alive = false; p.score = 0;
  world.barriers[i].y = 0.55; game.shake = Math.max(game.shake, 0.5);
  const anim = forcedAnim || pickDeath(settings.deathId);
  p.death = { anim, t: 0, st: {}, done: false };
  anim.start(p, p.death.st);
  if (p.human) { game.slowT = 1.4; game.slowK = 0.35; game.camFocusTarget = 0.55; game.focus.x = p.x; game.focus.z = p.z; }
  else { game.slowT = Math.max(game.slowT, 0.35); game.slowK = Math.min(game.slowK, 0.6); }
  const alive = game.players.filter((q) => q.alive);
  if (alive.length <= 1) { game.winner = alive.length ? alive[0].i : i; game.pendingEnd = true; }
}

export const deathsRunning = () => game.players.some((p) => p.death && !p.death.done);
