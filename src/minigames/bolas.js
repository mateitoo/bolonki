// Minijuego 1: BOLA BRAVA. Cada uno defiende su arco; las pelotas salen de las torres.
import * as THREE from 'three';
import { register } from './registry.js';
import { BR, HUMAN_SPEED } from '../config.js';
import { game, world } from '../state.js';
import { buildArena, arenaGroup } from '../world/arena.js';
import { buildBalls, removeBall } from '../world/balls.js';
import { dropDot } from '../fx/particles.js';
import { step as ballStep, movePod } from '../game/physics.js';
import { podPos, startSwing } from '../game/match.js';
import { localAxis } from '../game/controls.js';
import { txt, COL } from '../ui/draw.js';
import { sendInput } from '../net/room.js';

const r2 = (v) => Math.round(v * 100) / 100;
const r1 = (v) => Math.round(v * 10) / 10;
let sendT = 0;

const bolas = {
  id: 'bolas',
  name: 'BOLA BRAVA',
  desc: 'DEFENDÉ TU ARCO DE LAS PELOTAS',
  howTo: 'GOLPE FUERTE',
  points: { label: 'PUNTOS', values: [5, 10, 15], key: 'points', demo: 15 },
  cam: { pos: new THREE.Vector3(0, 24, 26), look: new THREE.Vector3(0, 0, -1.6), rotate: true },
  humanOut: true,
  tense: () => game.players.filter((p) => p.alive && !p.empty).length <= 2,   // mano a mano: música más rápida
  thumbSteps: 460,

  build() { buildArena(); buildBalls(); },
  show(on) {
    arenaGroup.visible = on;
    if (!on) game.balls.forEach(removeBall);
  },

  reset() {
    world.barriers.forEach((b) => (b.y = -3));
    game.players.forEach((p) => {
      p.mesh.root.rotation.set(0, p.mesh.baseRot, 0);
      if (p.empty) { p.mesh.root.visible = false; world.barriers[p.i].y = 0.55; }
      podPos(p);
    });
    world.chevSets.forEach((c) => (c.warn = 0));
    game.balls.forEach(removeBall);
    sendT = 0;
  },

  step(dt) { ballStep(dt); },

  visuals(dt) {
    const clock = game.clock;
    for (const p of game.players) {
      const m = p.mesh;
      if (p.death) continue;
      if (p.empty) { m.root.visible = false; m.sh.visible = false; continue; }
      if (p.spin > 0) p.spin = Math.max(0, p.spin - dt * 4.5);
      m.root.position.set(p.x, Math.sin(clock * 6 + p.i) * 0.05, p.z);
      m.root.scale.set(1, 1, 0.86);          // un poco menos profunda: queda justa con la línea del arco
      m.root.rotation.y = m.baseRot + (p.spin > 0 ? (1 - p.spin) * Math.PI * 2 : 0);
      m.veh.rotation.z = -p.v * 0.012;
      m.rider.rotation.z = -p.v * 0.02;
      const e = p.swing > 0 ? 0.8 : 0; m.hullM.uniforms.uEmissive.value.setRGB(e, e, e);
      m.sh.position.set(p.x, 0.03, p.z); m.sh.rotation.y = m.baseRot; m.sh.scale.set(1.95, 1, 1.4); m.sh.visible = true;
    }
    for (const b of game.balls) {
      if (!b.on) continue;
      b.mesh.position.set(b.x, BR, b.z); b.sh.position.set(b.x + 0.12, 0.035, b.z + 0.12);
      const e = b.power > 0 ? 0.55 + 0.45 * Math.sin(clock * 40) : 0;
      b.m.uniforms.uEmissive.value.setRGB(e, e * 0.6, e * 0.15);
    }
    for (const t of world.towers) {
      t.flash = Math.max(0, t.flash - dt); const k = t.flash / 0.3;
      t.holeM.uniforms.uColor.value.setRGB(0.02 + k, 0.03 + k * 0.2, 0.04 + k * 0.1);
    }
    world.chevSets.forEach((c) => {
      if (c.warn > 0) { c.warn -= dt; c.m.uniforms.uColor.value.set(((clock * 14) | 0) % 2 ? 0x3cff5a : 0x1d6b28); }
      else c.m.uniforms.uColor.value.set(0x16191e);
    });
    world.goalLasers.forEach((g) => {
      if (g.t > 0) { g.t -= dt; g.m.visible = ((clock * 30) | 0) % 2 === 0; } else g.m.visible = false;
    });
    world.barriers.forEach((b) => {
      b.g.position.y += (b.y - b.g.position.y) * Math.min(1, dt * 7);
      b.m.uniforms.uOff.value.y = (clock * 1.5) % 1;
    });
  },

  onLocalHit(p) { if (p.cd <= 0) startSwing(p); },

  drawScore(p, x, y) {
    txt(p.empty ? '--' : String(p.score).padStart(2, '0'), x, y, 16, p.alive ? COL.gold : '#555b6e', 'center', COL.goldShadow);
  },
  hud() {},

  /* ---------- online ---------- */
  snapshot() {
    return {
      p: game.players.map((p) => [r2(p.s), r1(p.v), p.alive ? 1 : 0, p.score, p.swing > 0 ? 1 : 0]),
      b: game.balls.map((b) => (b.on ? [r2(b.x), r2(b.z), b.power > 0 ? 1 : 0] : 0)),
    };
  },
  applySnap(A, B, f, rdt, resumed) {
    game.players.forEach((p, i) => {
      const pa = A.p[i], pb = B.p[i];
      p.alive = !!pa[2]; p.score = pa[3];
      // eliminado antes de que volvieras (al reconectarte): arco cerrado sin animación
      if (resumed && !p.alive && !p.death && !p.empty) { p.death = { anim: { dur: 0, update() {} }, t: 0, st: {}, done: true }; p.mesh.root.visible = false; world.barriers[i].y = 0.55; }
      if (p.ctrl !== 'net') return;
      p.s = pa[0] + (pb[0] - pa[0]) * f; p.v = pa[1];
      if (pa[4] && !(p.swing > 0)) p.spin = 1;
      p.swing = pa[4] ? 0.1 : 0;
      podPos(p);
    });
    game.balls.forEach((ball, k) => {
      const ba = A.b[k], bb = B.b[k];
      if (!ba) { if (ball.on) removeBall(ball); return; }
      const nx = bb ? ba[0] + (bb[0] - ba[0]) * f : ba[0];
      const nz = bb ? ba[1] + (bb[1] - ba[1]) * f : ba[1];
      if (!ball.on) { ball.on = true; ball.mesh.visible = true; ball.sh.visible = true; ball.trailT = 0; }
      const dx = nx - ball.x, dz = nz - ball.z;
      ball.x = nx; ball.z = nz; ball.power = ba[2] ? 1 : 0;
      ball.trailT -= rdt;
      if (ball.trailT <= 0 && dx * dx + dz * dz < 4) { ball.trailT = 0.04; dropDot(nx - dx * 0.5, nz - dz * 0.5); }
    });
  },
  // la nave propia del invitado se mueve acá mismo (respuesta inmediata) y se le avisa al anfitrión
  guestLocal(rdt, hits) {
    const me = game.players[game.me]; if (!me) return;
    me.cd -= rdt; if (me.swing > 0) me.swing -= rdt;
    const canMove = me.alive && (game.state === 'play' || game.state === 'count');
    movePod(me, canMove ? localAxis(me) * HUMAN_SPEED : 0, rdt);
    sendT -= rdt;
    if (sendT <= 0) { sendT = 1 / 30; sendInput({ s: Math.round(me.s * 100) / 100, v: Math.round(me.v * 10) / 10, h: hits }); }
  },
  guestHitFx(me) { startSwing(me); },
};

register(bolas);
export default bolas;
