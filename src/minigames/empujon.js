// Minijuego 2: EMPUJÓN. Todos arriba de una plataforma redonda sobre un abismo con magma.
// Las naves se mueven libres (patinan un poco, es hielo) y con el botón de golpe hacen una EMBESTIDA.
// Gana la ronda el último que queda arriba; gana la partida el primero que llega a N rondas.
// A los 14 s la plataforma empieza a achicarse para que nadie se quede quieto.
import * as THREE from 'three';
import { register } from './registry.js';
import { CHARS, DIFFICULTIES, rnd } from '../config.js';
import { game } from '../state.js';
import { scene, mat, add, scaleUV } from '../render/psx.js';
import { TX } from '../render/textures.js';
import { input } from '../input.js';
import { burst, P } from '../fx/particles.js';
import { FX } from '../game/fx.js';
import { SFX } from '../audio.js';
import { resetPodVisual } from '../world/pods.js';
import { sendInput } from '../net/room.js';
import { txt, rect, COL } from '../ui/draw.js';
import { camMove } from '../game/controls.js';

/* ---------- medidas ---------- */
const R0 = 9.5;              // radio inicial de la plataforma
const RMIN = 4.2;            // radio mínimo
const PR = 1.35;             // radio de la nave para los choques
const POD_SCALE = 0.82;      // las naves van un poco más chicas en la plataforma
const ACC = 22;              // aceleración
const MAXV = 7.2;            // velocidad máxima normal
const FRICTION = 2.0;        // cuánto frena sola (poco: es hielo)
const DASH_V = 15, DASH_T = 0.22, DASH_CD = 1.1;    // embestida
const BOUNCE = 0.85;         // rebote de los choques
const DASH_PUSH = 3.2;       // empujón extra de la embestida
const DASH_MASS = 2.2;       // la embestida "pesa" más
const SHRINK_AT = 14, SHRINK_RATE = 0.11, WARN_AT = 11;
const ROUND_PAUSE = 2.4;     // segundos de festejo entre rondas
const SPAWN_R = 5.3;
const SPAWN = [[0, 1], [1, 0], [0, -1], [-1, 0]];   // lugar 0 abajo en la pantalla

const r2 = (v) => Math.round(v * 100) / 100;
const lerpAng = (a, b, f) => { let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return a + d * f; };

/* ---------- mundo ---------- */
const W = { grp: null, plat: null, rimM: null, lavaM: null, rocks: [] };

function buildWorld() {
  const grp = new THREE.Group(); grp.visible = false; scene.add(grp); W.grp = grp;
  const plat = new THREE.Group(); grp.add(plat); W.plat = plat;
  // hielo de arriba
  add(scaleUV(new THREE.CylinderGeometry(R0, R0, 0.8, 28, 1), 4, 1), mat({ map: TX.ice }), 0, -0.4, 0, plat);
  // luces del borde
  W.rimM = mat({ map: TX.lights, unlit: true });
  add(scaleUV(new THREE.CylinderGeometry(R0 + 0.03, R0 + 0.03, 0.28, 28, 1, true), 26, 1), W.rimM, 0, -0.16, 0, plat);
  // roca de abajo (cono invertido)
  const cone = scaleUV(new THREE.ConeGeometry(R0 * 0.98, 6.5, 14, 2, true), 5, 2); cone.rotateX(Math.PI);
  add(cone, mat({ map: TX.rock, color: 0x9a8f9e }), 0, -4.05, 0, plat);
  // marca del centro
  const ring = new THREE.RingGeometry(1.4, 1.75, 20); ring.rotateX(-Math.PI / 2);
  add(ring, mat({ color: 0x5aa8c0, unlit: true }), 0, 0.02, 0, plat);
  const dot = new THREE.CircleGeometry(0.35, 12); dot.rotateX(-Math.PI / 2);
  add(dot, mat({ color: 0x5aa8c0, unlit: true }), 0, 0.02, 0, plat);
  // magma del fondo
  W.lavaM = mat({ map: TX.magma, unlit: true, color: 0xffffff });
  const lava = scaleUV(new THREE.PlaneGeometry(220, 220, 16, 16), 34); lava.rotateX(-Math.PI / 2);
  add(lava, W.lavaM, 0, -26, 0, grp);
  // rocas flotando alrededor
  const rockM = mat({ map: TX.rock, color: 0xb0a4b6 });
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * Math.PI * 2 + rnd(-0.2, 0.2), rr = rnd(15, 25);
    const m = add(new THREE.DodecahedronGeometry(rnd(0.9, 2.2), 0), rockM, Math.sin(a) * rr, rnd(-9, -3), Math.cos(a) * rr, grp);
    m.rotation.set(rnd(0, 3), rnd(0, 3), 0);
    W.rocks.push({ m, y: m.position.y, ph: rnd(0, 6) });
  }
}

/* ---------- rondas ---------- */
const demo = () => game.state === 'title' || game.state === 'menu';

function placeAll() {
  game.players.forEach((p) => {
    resetPodVisual(p);
    p.death = null;
    p.alive = !p.empty;
    const [sx, sz] = SPAWN[p.i];
    Object.assign(p, { x: sx * SPAWN_R, z: sz * SPAWN_R, vx: 0, vz: 0, dashT: 0, cd: 0, wantDash: false, aiDash: false, thinkT: 0 });
    p.ang = Math.atan2(-p.x, -p.z);           // mirando al centro
    if (p.empty) { p.mesh.root.visible = false; p.mesh.sh.visible = false; }
  });
  game.radius = R0;
  game.elapsed = 0;
  warned = false;
}

let warned = false;
function startRound() {
  game.round = { n: game.round.n + 1, over: false, winner: -1, t: 0 };
  game.timeScale = 1;
  game.elimOrder = [];
  placeAll();
  if (!demo()) { game.state = 'count'; game.countT = 3.999; FX.tick(); }
}

/* ---------- IA ---------- */
function aiInput(p, dt) {
  const D = DIFFICULTIES[game.difficulty] || DIFFICULTIES.intermedio;
  p.thinkT -= dt;
  if (p.thinkT <= 0) {
    p.thinkT = rnd(D.think[0], D.think[1]) * 1.4;
    const r = game.radius, d0 = Math.hypot(p.x, p.z);
    const margin = 2.2 + D.lead * 1.4;       // qué tan lejos del borde se mantiene
    let tx = 0, tz = 0;
    p.aiDash = false;
    if (d0 < r - margin) {
      // víctima: la que está más cerca del borde y más cerca mío
      let best = null, bs = -1e9;
      for (const q of game.players) {
        if (q === p || !q.alive || q.empty || q.death) continue;
        const dq = Math.hypot(q.x, q.z), dist = Math.hypot(q.x - p.x, q.z - p.z);
        const sc = (dq / r) * 2 - dist / r + (q.i === p.aiTarget ? 0.3 : 0);
        if (sc > bs) { bs = sc; best = q; }
      }
      if (best) {
        p.aiTarget = best.i;
        const dq = Math.hypot(best.x, best.z) || 1, ox = best.x / dq, oz = best.z / dq;   // hacia afuera
        const ax = best.x - p.x, az = best.z - p.z, toB = Math.hypot(ax, az) || 1;
        const align = (ax * ox + az * oz) / toB;   // 1 = la víctima está entre yo y el borde
        if (align > 0.5 || toB < 2.6) {
          tx = best.x + ox * 0.8; tz = best.z + oz * 0.8;
          p.aiDash = toB < 3.4 && align > 0.45 && Math.random() < D.swing * 1.3;
        } else { tx = best.x - ox * 2.3; tz = best.z - oz * 2.3; }   // rodearla por el lado del centro
        // nunca apuntar más allá de la zona segura (si no, se cae persiguiendo a la víctima)
        const td = Math.hypot(tx, tz), safe = r - margin * 0.8;
        if (td > safe) { tx *= safe / td; tz *= safe / td; p.aiDash = p.aiDash && d0 < safe - 1; }
      }
    }
    const e = D.err * 0.35;                    // error de puntería según dificultad
    p.aiTx = tx + rnd(-e, e); p.aiTz = tz + rnd(-e, e);
  }
  let dx = (p.aiTx || 0) - p.x, dz = (p.aiTz || 0) - p.z;
  const l = Math.hypot(dx, dz);
  if (l > 0.001) { dx /= l; dz /= l; }
  const k = Math.min(1, l / 1.2) * Math.min(1, D.spd / 12);
  return { x: dx * k, z: dz * k, dash: p.aiDash };
}

/* ---------- simulación ---------- */
function drive(p, wx, wz, dash, dt) {
  const l = Math.hypot(wx, wz);
  if (l > 1) { wx /= l; wz /= l; }
  if (p.dashT > 0) p.dashT -= dt;
  if (dash && p.cd <= 0) {
    let dx = wx, dz = wz;
    if (Math.hypot(dx, dz) < 0.3) { dx = Math.sin(p.ang); dz = Math.cos(p.ang); }
    const dl = Math.hypot(dx, dz) || 1;
    p.vx = (dx / dl) * DASH_V; p.vz = (dz / dl) * DASH_V;
    p.dashT = DASH_T; p.cd = DASH_CD; p.aiDash = false;
    FX.dash(p.i, p.x, p.z);
  }
  p.vx += wx * ACC * dt; p.vz += wz * ACC * dt;
  const fr = Math.exp(-FRICTION * dt); p.vx *= fr; p.vz *= fr;
  const sp = Math.hypot(p.vx, p.vz), max = p.dashT > 0 ? DASH_V : MAXV;
  if (sp > max) { const ns = max + (sp - max) * Math.exp(-4 * dt); p.vx *= ns / sp; p.vz *= ns / sp; }
  p.x += p.vx * dt; p.z += p.vz * dt;
  if (sp > 0.6) p.ang = lerpAng(p.ang, Math.atan2(p.vx, p.vz), Math.min(1, dt * 10));
}

function collide(a, b) {
  const dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz), min = PR * 2;
  if (d >= min || d < 1e-4) return;
  const nx = dx / d, nz = dz / d;
  const ma = a.dashT > 0 ? DASH_MASS : 1, mb = b.dashT > 0 ? DASH_MASS : 1;
  const ov = min - d;
  a.x -= nx * ov * (mb / (ma + mb)); a.z -= nz * ov * (mb / (ma + mb));
  b.x += nx * ov * (ma / (ma + mb)); b.z += nz * ov * (ma / (ma + mb));
  const rv = (b.vx - a.vx) * nx + (b.vz - a.vz) * nz;
  if (rv >= 0) return;
  const j = (-(1 + BOUNCE) * rv) / (1 / ma + 1 / mb);
  a.vx -= (j / ma) * nx; a.vz -= (j / ma) * nz;
  b.vx += (j / mb) * nx; b.vz += (j / mb) * nz;
  const hard = a.dashT > 0 || b.dashT > 0;
  if (a.dashT > 0) { b.vx += nx * DASH_PUSH; b.vz += nz * DASH_PUSH; a.dashT = 0; }
  if (b.dashT > 0) { a.vx -= nx * DASH_PUSH; a.vz -= nz * DASH_PUSH; b.dashT = 0; }
  if (-rv > 2) FX.bump((a.x + b.x) / 2, (a.z + b.z) / 2, hard);
}

let crumbleT = 0;
function step(dt) {
  const st = game.state;
  if (st === 'count') {
    const before = Math.ceil(game.countT); game.countT -= dt; const after = Math.ceil(game.countT);
    if (after !== before) { if (after > 0) FX.tick(); else { FX.go(); game.state = 'play'; } }
    return;
  }
  if (st !== 'play' && !demo()) return;
  const R = game.round;
  if (!R.over) game.elapsed += dt;

  // la plataforma se achica
  if (!R.over && game.elapsed > WARN_AT && !warned) { warned = true; FX.shrinkWarn(); }
  if (!R.over && game.elapsed > SHRINK_AT && game.radius > RMIN) {
    game.radius = Math.max(RMIN, game.radius - SHRINK_RATE * dt);
    crumbleT -= dt;
    if (crumbleT <= 0) {
      crumbleT = 0.08;
      const a = Math.random() * Math.PI * 2, r = game.radius;
      burst(Math.sin(a) * r, 0, Math.cos(a) * r, { mat: P.WHITE, n: 2, sp: 1.5, up: [0.5, 2], life: [0.4, 0.8], size: 0.8 });
      SFX.crumble();
    }
  }

  // naves
  const alive = game.players.filter((p) => p.alive && !p.empty);
  for (const p of alive) {
    p.cd -= dt;
    let wx = 0, wz = 0, dash = false;
    if (p.ctrl === 'local') {
      const c = input.ctl[p.pad || 'all'];
      [wx, wz] = camMove(c.x, c.y);             // arriba en la pantalla = hacia donde mira la cámara
      dash = p.wantDash; p.wantDash = false;
    } else if (p.ctrl === 'remote') {
      const n = p.net;
      if (n) { wx = n.x || 0; wz = -(n.y || 0); dash = n.hit; n.hit = false; }
    } else if (p.ctrl === 'ai') {
      const a = aiInput(p, dt); wx = a.x; wz = a.z; dash = a.dash;
    }
    drive(p, wx, wz, dash, dt);
  }
  for (let i = 0; i < alive.length; i++) for (let j = i + 1; j < alive.length; j++) collide(alive[i], alive[j]);

  // ¿alguien se cayó?
  for (const p of alive) {
    const d = Math.hypot(p.x, p.z);
    if (R.over) {                                // festejando: nadie se cae
      if (d > game.radius - 0.4) { const k = (game.radius - 0.4) / d; p.x *= k; p.z *= k; p.vx *= 0.5; p.vz *= 0.5; }
      continue;
    }
    if (d > game.radius + 0.15) {
      p.alive = false;
      game.elimOrder.push(p.i);
      FX.fall(p.i, p.vx, p.vz);
      if (p.i === game.me && game.mode === 'solo') game.timeScale = 1.5;   // mirás el resto un poco más rápido
    }
  }

  // ¿terminó la ronda?
  const left = game.players.filter((p) => p.alive && !p.empty);
  if (!R.over && left.length <= 1) {
    R.over = true; R.winner = left.length ? left[0].i : -1; R.t = ROUND_PAUSE;
    if (R.winner >= 0) game.players[R.winner].score++;
    FX.round(R.winner);
  }
  if (R.over) {
    R.t -= dt;
    if (R.t <= 0 && !game.pendingEnd) {
      const champ = R.winner >= 0 && game.players[R.winner].score >= game.target;
      if (champ) { game.winner = R.winner; game.pendingEnd = true; }
      else startRound();
    }
  }
}

/* ---------- el minijuego ---------- */
let sendT = 0;
const empujon = {
  id: 'empujon',
  name: 'EMPUJÓN',
  desc: 'TIRALOS DE LA PLATAFORMA',
  points: { label: 'RONDAS PARA GANAR', values: [1, 2, 3], key: 'rounds', demo: 2 },
  cam: { pos: new THREE.Vector3(0, 24, 21), look: new THREE.Vector3(0, 0, -1.2), rotate: false, orbit: true },
  humanOut: false,
  tense: () => game.elapsed > SHRINK_AT,        // música más rápida cuando se achica la plataforma
  thumbSteps: 90,
  thumbCam: { pos: new THREE.Vector3(0, 17, 16), look: new THREE.Vector3(0, -1, -0.5) },

  build: buildWorld,
  show(on) { if (W.grp) W.grp.visible = on; },

  reset() {
    game.round = { n: 1, over: false, winner: -1, t: 0 };
    game.players.forEach((p) => { p.score = 0; });
    placeAll();
    sendT = 0;
  },
  step,

  visuals(dt) {
    const clock = game.clock;
    const k = (game.radius || R0) / R0;
    W.plat.scale.set(k, 1, k);
    // luces del borde: rojas titilando cuando la plataforma se está por achicar o se achica
    const danger = game.elapsed > WARN_AT && !(game.round && game.round.over);
    W.rimM.uniforms.uColor.value.set(danger && ((clock * (game.elapsed > SHRINK_AT ? 4 : 10)) | 0) % 2 ? 0xff3a2a : 0xffffff);
    W.lavaM.uniforms.uOff.value.set((clock * 0.01) % 1, (clock * 0.006) % 1);
    W.rocks.forEach((r) => { r.m.position.y = r.y + Math.sin(clock * 0.7 + r.ph) * 0.4; r.m.rotation.y += dt * 0.1; });
    for (const p of game.players) {
      const m = p.mesh;
      if (p.death || p.empty) { if (p.empty) { m.root.visible = false; m.sh.visible = false; } continue; }
      m.root.visible = true;
      m.root.position.set(p.x, Math.sin(clock * 6 + p.i) * 0.05, p.z);
      m.root.scale.setScalar(POD_SCALE);
      m.root.rotation.set(0, p.ang || 0, 0);
      const e = p.dashT > 0 ? 0.9 : 0; m.hullM.uniforms.uEmissive.value.setRGB(e, e * 0.9, e * 0.6);
      m.veh.rotation.x = p.dashT > 0 ? -0.18 : 0;
      m.sh.position.set(p.x, 0.03, p.z); m.sh.rotation.y = p.ang || 0; m.sh.scale.set(1.95 * POD_SCALE, 1, 1.6 * POD_SCALE); m.sh.visible = true;
    }
  },

  onLocalHit(p) { p.wantDash = true; },

  // rondas ganadas: una casilla por ronda
  drawScore(p, x, y) {
    if (p.empty) { txt('--', x, y, 16, '#555b6e', 'center', COL.goldShadow); return; }
    const n = game.target || 2, w = 7, gap = 3, tot = n * w + (n - 1) * gap;
    for (let k = 0; k < n; k++) {
      const bx = Math.round(x - tot / 2 + k * (w + gap));
      rect(bx, y + 3, w, w, '#000');
      rect(bx + 1, y + 4, w - 2, w - 2, k < p.score ? COL.gold : '#2a3150');
    }
  },
  hud(hw, st) {
    const R = game.round; if (!R) return;
    if (st === 'count') txt(`RONDA ${R.n}`, hw / 2, 80, 16, COL.teal, 'center');
    if (st === 'count' && R.n === 1 && game.mode !== 'demo') {
      txt('¡TIRALOS DE LA PLATAFORMA!', hw / 2, 170, 8, '#ffb31a', 'center');
      txt('GOLPE = EMBESTIDA', hw / 2, 184, 8, COL.dim, 'center');
    }
    if (st === 'play' && R.over) {
      const w = R.winner, p = game.players[w];
      const t = w < 0 ? '¡NADIE!' : w === game.me && game.mode !== 'local' ? '¡GANASTE LA RONDA!' : `RONDA PARA ${p.name || CHARS[w].name}`;
      rect(0, 96, hw, 34, 'rgba(4,6,14,.7)');
      txt(t, hw / 2, 104, 16, w < 0 ? COL.white : CHARS[w].col, 'center', COL.goldShadow);
    }
    const me = game.players[game.me];
    if (st === 'play' && me && !me.alive && !R.over && game.mode !== 'local') txt('¡TE CAÍSTE!', hw / 2, 196, 16, COL.red, 'center');
    if (st === 'play' && game.elapsed > WARN_AT && game.elapsed < SHRINK_AT + 1.5 && !R.over && ((game.clock * 3) | 0) % 2) {
      txt('¡LA PLATAFORMA SE ACHICA!', hw / 2, 64, 8, COL.red, 'center');
    }
  },

  /* ---------- online (el anfitrión manda todo; el invitado solo manda para dónde va) ---------- */
  snapshot() {
    const R = game.round;
    return {
      r: r2(game.radius), ro: [R.n, R.over ? 1 : 0, R.winner, Math.round(R.t * 10) / 10],
      p: game.players.map((p) => [r2(p.x), r2(p.z), r2(p.ang || 0), p.alive ? 1 : 0, p.dashT > 0 ? 1 : 0, p.score]),
    };
  },
  applySnap(A, B, f) {
    game.radius = A.r + (B.r - A.r) * f;
    const ro = A.ro;
    game.round = { n: ro[0], over: !!ro[1], winner: ro[2], t: ro[3] };
    game.players.forEach((p, i) => {
      const pa = A.p[i], pb = B.p[i];
      if (pa[3] && p.death) { p.death = null; resetPodVisual(p); }          // empezó otra ronda
      p.alive = !!pa[3]; p.score = pa[5]; p.dashT = pa[4] ? 0.1 : 0;
      if (!p.alive && !p.death && !p.empty) FX.fall(i, 0, 0);               // por si se perdió el aviso
      if (p.death || p.empty) return;
      p.x = pa[0] + (pb[0] - pa[0]) * f; p.z = pa[1] + (pb[1] - pa[1]) * f;
      p.ang = lerpAng(pa[2], pb[2], f);
    });
  },
  guestLocal(rdt, hits) {
    sendT -= rdt;
    if (sendT > 0) return;
    sendT = 1 / 30;
    // se manda la dirección ya girada según tu cámara (el anfitrión la usa tal cual)
    const c = input.ctl.all, [wx, wz] = camMove(c.x, c.y);
    sendInput({ x: Math.round(wx * 100) / 100, y: Math.round(-wz * 100) / 100, h: hits });
  },
  guestHitFx() {},
};

register(empujon);
export default empujon;
