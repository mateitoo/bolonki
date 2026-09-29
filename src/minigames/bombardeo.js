// Minijuego 3: BOMBARDEO. El piso es una grilla de baldosas cuadradas; del cielo caen bloques de metal.
// Antes de cada caída la baldosa titila y aparece la sombra del bloque: hay que salir de ahí.
// Si te cae encima quedás aplastado. Con el golpe hacés una EMBESTIDA para empujar a otros abajo de un bloque.
// Los bloques quedan un rato como obstáculo y después se hunden. Cada vez caen más y más rápido.
// Gana la ronda el último que queda; gana la partida el primero que llega a N rondas.
import * as THREE from 'three';
import { register } from './registry.js';
import { CHARS, DIFFICULTIES, rnd, clamp } from '../config.js';
import { game } from '../state.js';
import { scene, mat, add, scaleUV } from '../render/psx.js';
import { TX } from '../render/textures.js';
import { input } from '../input.js';
import { FX } from '../game/fx.js';
import { resetPodVisual } from '../world/pods.js';
import { sendInput } from '../net/room.js';
import { txt, rect, COL } from '../ui/draw.js';

/* ---------- medidas ---------- */
const GN = 7;                // baldosas por lado
const TS = 2.6;              // tamaño de cada baldosa
const HALF = (GN * TS) / 2;  // medio lado de la grilla
const CS = 2.35;             // tamaño del bloque que cae
const DROP_H = 10;           // altura desde la que cae
const FALL_T = 0.42;         // cuánto tarda en caer (al final del aviso)
const LAND_T = 1.5;          // cuánto queda como obstáculo
const SINK_T = 0.45;         // cuánto tarda en hundirse
const PR = 1.05;             // radio de la nave para los choques
const POD_SCALE = 0.66;
const ACC = 34, MAXV = 7.6, FRICTION = 6.5;          // agarra bien (no es hielo)
const DASH_V = 15, DASH_T = 0.2, DASH_CD = 1.0, DASH_PUSH = 3.4, DASH_MASS = 2.2, BOUNCE = 0.6;
const ROUND_PAUSE = 2.4;
const SPAWN = [[0, 2], [2, 0], [0, -2], [-2, 0]];     // en baldosas desde el centro; lugar 0 abajo en la pantalla

const r2 = (v) => Math.round(v * 100) / 100;
const lerpAng = (a, b, f) => { let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return a + d * f; };
const cx = (k) => ((k % GN) - (GN - 1) / 2) * TS;
const cz = (k) => (((k / GN) | 0) - (GN - 1) / 2) * TS;
const tileOf = (x, z) => clamp(Math.round(z / TS + (GN - 1) / 2), 0, GN - 1) * GN + clamp(Math.round(x / TS + (GN - 1) / 2), 0, GN - 1);
const ring = (k) => Math.max(Math.abs((k % GN) - 3), Math.abs(((k / GN) | 0) - 3));   // 0 = centro, 3 = borde

/* ---------- mundo ---------- */
const W = { grp: null, tiles: [], shadows: [], frames: [], blocks: [], props: [] };
let drops = [];              // bloques en juego: { id, k, t, warn, st: 'warn' | 'land' | 'sink', hit }
let nextId = 1;

function buildWorld() {
  const grp = new THREE.Group(); grp.visible = false; scene.add(grp); W.grp = grp;
  // base de la plataforma y piso de afuera
  add(scaleUV(new THREE.BoxGeometry(GN * TS + 1.6, 1.2, GN * TS + 1.6), 6, 1), mat({ map: TX.metal, color: 0x6a7288 }), 0, -1.1, 0, grp);
  const out = scaleUV(new THREE.PlaneGeometry(140, 140, 10, 10), 24); out.rotateX(-Math.PI / 2);
  add(out, mat({ map: TX.outer }), 0, -1.7, 0, grp);
  // baldosas (cada una con su material: titila sola cuando le va a caer un bloque)
  const tg = scaleUV(new THREE.BoxGeometry(TS - 0.1, 0.5, TS - 0.1), 1, 1);
  const sg = new THREE.PlaneGeometry(CS, CS); sg.rotateX(-Math.PI / 2);
  // marco del aviso: un anillo de 4 lados girado 45° queda cuadrado
  const fr = new THREE.RingGeometry((TS / 2 - 0.3) * Math.SQRT2, (TS / 2 - 0.06) * Math.SQRT2, 4, 1, Math.PI / 4); fr.rotateX(-Math.PI / 2);
  for (let k = 0; k < GN * GN; k++) {
    const dark = ((k % GN) + ((k / GN) | 0)) % 2 === 1;
    const m = mat({ map: TX.tile, color: dark ? 0xc4cad8 : 0xffffff });
    add(tg, m, cx(k), -0.25, cz(k), grp);
    W.tiles.push({ m, base: new THREE.Color(dark ? 0xc4cad8 : 0xffffff) });
    const sh = add(sg, mat({ color: 0x000000, unlit: true }), cx(k), 0.02, cz(k), grp); sh.visible = false;
    W.shadows.push(sh);
    const f = add(fr, mat({ color: 0xff3a2a, unlit: true }), cx(k), 0.03, cz(k), grp); f.visible = false;
    W.frames.push(f);
  }
  // baranda de peligro alrededor (no te podés caer: el peligro viene de arriba)
  const hz = mat({ map: TX.hazard, unlit: true });
  const len = GN * TS + 1.6;
  [[0, HALF + 0.55, 0], [0, -HALF - 0.55, 0], [HALF + 0.55, 0, Math.PI / 2], [-HALF - 0.55, 0, Math.PI / 2]].forEach(([x, z, r]) => {
    const g = scaleUV(new THREE.BoxGeometry(len, 0.55, 0.5), len / 1.2, 1);
    add(g, hz, x, 0.2, z, grp).rotation.y = r;
  });
  // postes con luces en las esquinas
  const postM = mat({ map: TX.metal, color: 0x8890a6 }), lampM = mat({ color: 0xff5a2a, unlit: true });
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => {
    add(new THREE.CylinderGeometry(0.22, 0.28, 3.4, 6), postM, sx * (HALF + 0.9), 1.2, sz * (HALF + 0.9), grp);
    W.props.push(add(new THREE.BoxGeometry(0.5, 0.5, 0.5), lampM, sx * (HALF + 0.9), 3.1, sz * (HALF + 0.9), grp));
  });
  W.lampM = lampM;
  // pilas de bloques de decoración afuera
  const bm = mat({ map: TX.block });
  [[-13, -4, 2], [-12.5, 3, 1], [13, -2, 3], [12.8, 5, 1], [-6, -13.5, 2], [7, -13, 1], [-14, 10, 1], [14, 11, 2]].forEach(([x, z, n]) => {
    for (let h = 0; h < n; h++) add(new THREE.BoxGeometry(CS, CS, CS), bm, x + rnd(-0.2, 0.2), -1.7 + CS / 2 + h * CS, z + rnd(-0.2, 0.2), grp).rotation.y = rnd(-0.3, 0.3);
  });
  // bloques que caen (pila de mallas reutilizables)
  const bg = new THREE.BoxGeometry(CS, CS, CS);
  for (let n = 0; n < GN * GN; n++) { const b = add(bg, mat({ map: TX.block }), 0, -10, 0, grp); b.visible = false; W.blocks.push(b); }
}

/* ---------- rondas ---------- */
const demo = () => game.state === 'title' || game.state === 'menu';
const B = { waveT: 2.2, n: 0 };     // cuándo sale la próxima tanda y cuántas salieron

function placeAll() {
  game.players.forEach((p) => {
    resetPodVisual(p);
    p.death = null;
    p.alive = !p.empty;
    const [sx, sz] = SPAWN[p.i];
    Object.assign(p, { x: sx * TS, z: sz * TS, vx: 0, vz: 0, dashT: 0, cd: 0, wantDash: false, aiDash: false, thinkT: 0, aiTx: sx * TS, aiTz: sz * TS, aiMode: 'idle' });
    p.ang = Math.atan2(-p.x, -p.z);
    if (p.empty) { p.mesh.root.visible = false; p.mesh.sh.visible = false; }
  });
  drops = []; B.waveT = 2.0; B.n = 0;
  game.elapsed = 0;
}

function startRound() {
  game.round = { n: game.round.n + 1, over: false, winner: -1, t: 0 };
  game.timeScale = 1;
  game.elimOrder = [];
  placeAll();
  if (!demo()) { game.state = 'count'; game.countT = 3.999; FX.tick(); }
}

/* ---------- las tandas de bloques ---------- */
const busy = (k) => drops.some((d) => d.k === k);
function drop(k, warn) {
  if (k < 0 || k >= GN * GN || busy(k)) return;
  drops.push({ id: nextId++, k, t: 0, warn, st: 'warn', hit: false });
}
// qué tanda sale, según cuánto lleva la ronda (cada vez más difícil)
function wave() {
  const e = game.elapsed;
  const warn = Math.max(0.95, 1.75 - e * 0.02);
  const free = [...Array(GN * GN).keys()].filter((k) => !busy(k));
  const pick = (n) => { for (let i = 0; i < n && free.length; i++) drop(free.splice((Math.random() * free.length) | 0, 1)[0], warn); };
  const alive = game.players.filter((p) => p.alive && !p.empty);
  const kinds = ['random'];
  if (e > 7) kinds.push('row', 'col', 'target');
  if (e > 16) kinds.push('cross', 'target', 'ring');
  if (e > 26) kinds.push('checker', 'double');
  const kind = B.n < 2 ? 'random' : kinds[(Math.random() * kinds.length) | 0];
  const line = (r, horiz, gap) => { for (let j = 0; j < GN; j++) if (j !== gap) drop(horiz ? r * GN + j : j * GN + r, warn); };
  switch (kind) {
    case 'random': pick(Math.min(14, 3 + Math.floor(e / 5))); break;
    case 'row': line((Math.random() * GN) | 0, true, e < 20 ? (Math.random() * GN) | 0 : -1); break;
    case 'col': line((Math.random() * GN) | 0, false, e < 20 ? (Math.random() * GN) | 0 : -1); break;
    case 'double': { const r = (Math.random() * (GN - 2)) | 0; const h = Math.random() < 0.5; line(r, h, -1); line(r + 2, h, -1); break; }
    case 'target': alive.forEach((p) => drop(tileOf(p.x, p.z), warn * 1.15)); pick(2); break;
    case 'cross': {
      const p = alive[(Math.random() * alive.length) | 0]; const k = p ? tileOf(p.x, p.z) : 24;
      line((k / GN) | 0, true, -1); line(k % GN, false, -1); break;
    }
    case 'ring': { const rr = 1 + ((Math.random() * 3) | 0); for (let k = 0; k < GN * GN; k++) if (ring(k) === rr) drop(k, warn * 1.1); break; }
    case 'checker': { const par = Math.random() < 0.5 ? 0 : 1; for (let k = 0; k < GN * GN; k++) if (((k % GN) + ((k / GN) | 0)) % 2 === par) drop(k, warn * 1.25); break; }
    default: break;
  }
  B.n++;
  FX.alert();
  return Math.max(0.85, 2.3 - e * 0.035);       // tiempo hasta la próxima tanda
}

/* ---------- IA ---------- */
// Los bots ven cada aviso recién un ratito después de que aparece (según la dificultad).
const CRUSH = TS / 2 + 0.3;              // si tu centro está a menos de esto del centro de la baldosa, te aplasta
// segundos hasta que cae algo sobre el punto (x, z) según lo que ve el bot (Infinity = nada)
function warnAt(x, z, react, pad) {
  let t = Infinity; const lim = CRUSH + (pad || 0);
  for (const o of drops) {
    if (o.st !== 'warn' || o.t < react) continue;
    if (Math.abs(x - cx(o.k)) < lim && Math.abs(z - cz(o.k)) < lim) t = Math.min(t, o.warn - o.t);
  }
  return t;
}
const blockedAt = (x, z) => drops.some((o) => o.st === 'land' && Math.abs(x - cx(o.k)) < CS / 2 + PR * 0.8 && Math.abs(z - cz(o.k)) < CS / 2 + PR * 0.8);
// ¿se puede ir en línea recta hasta (tx, tz) sin pasar por un aviso que cae justo cuando pasás?
function pathOk(p, tx, tz, react) {
  const dx = tx - p.x, dz = tz - p.z, d = Math.hypot(dx, dz), n = Math.ceil(d / 0.6);
  for (let i = 1; i <= n; i++) {
    const f = i / n, x = p.x + dx * f, z = p.z + dz * f, arrive = (d * f) / (MAXV * 0.85) + 0.15;
    const w = warnAt(x, z, react, 0.15);
    if (w < arrive + 0.45) return false;
    if (i > 1 && blockedAt(x, z)) return false;
  }
  return true;
}
function safeTiles(react) {
  const out = [];
  for (let k = 0; k < GN * GN; k++) if (warnAt(cx(k), cz(k), react, 0.2) === Infinity && !drops.some((o) => o.k === k && o.st !== 'sink')) out.push(k);
  return out;
}
function aiInput(p, dt) {
  const D = DIFFICULTIES[game.difficulty] || DIFFICULTIES.intermedio;
  const react = D.think[1] * 1.8;                      // fácil ~0.5 s, extremo ~0.1 s
  p.thinkT -= dt;
  if (p.thinkT <= 0) {
    p.thinkT = rnd(D.think[0], D.think[1]) * 1.3;
    const danger = warnAt(p.x, p.z, react, 0.2) !== Infinity;
    const reached = Math.hypot(p.aiTx - p.x, p.aiTz - p.z) < 0.45;
    p.aiDash = false;
    if (danger || (p.aiMode === 'escape' && !reached)) {
      // escapar a la baldosa libre más conveniente a la que se llega sin pasar por otro aviso
      const cand = safeTiles(react);
      let best = -1, bs = -1e9;
      for (const k of cand) {
        const dist = Math.hypot(cx(k) - p.x, cz(k) - p.z);
        let near = 0; for (const o of drops) if (o.st === 'warn' && Math.abs(cx(o.k) - cx(k)) <= TS && Math.abs(cz(o.k) - cz(k)) <= TS) near++;
        let sc = -dist - near * 0.9 - ring(k) * 0.3 + rnd(-1, 1) * D.err * 0.4;
        if (!pathOk(p, cx(k), cz(k), react)) sc -= 12;
        if (sc > bs) { bs = sc; best = k; }
      }
      // en fácil a veces se confunde y elige cualquiera
      if (cand.length && Math.random() < D.err * 0.04) best = cand[(Math.random() * cand.length) | 0];
      if (best >= 0) { p.aiTx = cx(best); p.aiTz = cz(best); }
      p.aiMode = 'escape';
      if (!danger && reached) p.aiMode = 'idle';
    } else {
      p.aiMode = 'idle';
      // a quién empujar: alguien al lado de un aviso que cae pronto
      let plan = null;
      for (const q of game.players) {
        if (q === p || !q.alive || q.empty || q.death) continue;
        for (const o of drops) {
          if (o.st !== 'warn' || o.t < react) continue;
          const left = o.warn - o.t; if (left < 0.25 || left > 1.3) continue;
          const kx = cx(o.k) - q.x, kz = cz(o.k) - q.z, kd = Math.hypot(kx, kz);
          if (kd > TS * 1.2 || kd < 0.5) continue;
          const ux = kx / kd, uz = kz / kd;                           // de la víctima hacia el aviso
          const ax = q.x - ux * 1.9, az = q.z - uz * 1.9;               // desde dónde embestir
          const dist = Math.hypot(ax - p.x, az - p.z);
          if (!plan || dist < plan.dist) plan = { q, ux, uz, ax, az, dist };
        }
      }
      if (plan && plan.dist < 4.5 && pathOk(p, plan.ax, plan.az, react) && Math.random() < 0.35 + D.swing) {
        const vx = plan.q.x - p.x, vz = plan.q.z - p.z, vd = Math.hypot(vx, vz) || 1;
        const align = (vx * plan.ux + vz * plan.uz) / vd;
        if (vd < 3.2 && align > 0.6) { p.aiTx = plan.q.x; p.aiTz = plan.q.z; p.aiDash = Math.random() < D.swing * 2; }
        else { p.aiTx = plan.ax; p.aiTz = plan.az; }
      } else if (reached || warnAt(p.aiTx, p.aiTz, react, 0.2) !== Infinity) {
        // paseo tranquilo: alguna baldosa libre cerca, mejor hacia el centro
        const cand = safeTiles(react).filter((k) => Math.hypot(cx(k) - p.x, cz(k) - p.z) < TS * 1.6 && pathOk(p, cx(k), cz(k), react));
        if (cand.length && Math.random() < 0.5) {
          cand.sort((a, b) => ring(a) - ring(b));
          const k = cand[Math.min(cand.length - 1, (Math.random() * 3) | 0)];
          p.aiTx = cx(k) + rnd(-0.5, 0.5); p.aiTz = cz(k) + rnd(-0.5, 0.5);
        }
      }
    }
  }
  let dx = (p.aiTx || 0) - p.x, dz = (p.aiTz || 0) - p.z;
  const l = Math.hypot(dx, dz);
  if (l > 0.001) { dx /= l; dz /= l; }
  // freno: si está a salvo y lo que tiene adelante está por caer, no se mete
  if (p.aiMode !== 'escape' && warnAt(p.x + dx * 1.2, p.z + dz * 1.2, react, 0.1) < 1.3 && warnAt(p.x, p.z, react, 0) === Infinity) { p.thinkT = Math.min(p.thinkT, 0.05); return { x: -p.vx * 0.05, z: -p.vz * 0.05, dash: false }; }
  const k = Math.min(1, l / 0.9) * Math.min(1, D.spd / 11);
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
  if (sp > max) { const ns = max + (sp - max) * Math.exp(-6 * dt); p.vx *= ns / sp; p.vz *= ns / sp; }
  p.x += p.vx * dt; p.z += p.vz * dt;
  if (sp > 0.6) p.ang = lerpAng(p.ang, Math.atan2(p.vx, p.vz), Math.min(1, dt * 12));
  // baranda
  const lim = HALF - PR * 0.9;
  if (p.x > lim) { p.x = lim; p.vx = -Math.abs(p.vx) * 0.4; } else if (p.x < -lim) { p.x = -lim; p.vx = Math.abs(p.vx) * 0.4; }
  if (p.z > lim) { p.z = lim; p.vz = -Math.abs(p.vz) * 0.4; } else if (p.z < -lim) { p.z = -lim; p.vz = Math.abs(p.vz) * 0.4; }
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

// los bloques apoyados son obstáculos: la nave (círculo) no los atraviesa
function pushOutOfBlock(p, k) {
  const h = CS / 2, bx = cx(k), bz = cz(k);
  const qx = clamp(p.x, bx - h, bx + h), qz = clamp(p.z, bz - h, bz + h);
  let dx = p.x - qx, dz = p.z - qz, d = Math.hypot(dx, dz);
  if (d >= PR) return;
  if (d < 1e-4) { dx = p.x - bx; dz = p.z - bz; d = Math.hypot(dx, dz) || 1; }
  const nx = dx / d, nz = dz / d, ov = PR - (d < 1e-4 ? 0 : d);
  p.x += nx * ov; p.z += nz * ov;
  const vn = p.vx * nx + p.vz * nz;
  if (vn < 0) { p.vx -= vn * nx * 1.4; p.vz -= vn * nz * 1.4; }
}

function step(dt) {
  const st = game.state;
  if (st === 'count') {
    const before = Math.ceil(game.countT); game.countT -= dt; const after = Math.ceil(game.countT);
    if (after !== before) { if (after > 0) FX.tick(); else { FX.go(); game.state = 'play'; } }
    return;
  }
  if (st !== 'play' && !demo()) return;
  const R = game.round;
  if (!R.over) {
    game.elapsed += dt;
    B.waveT -= dt;
    if (B.waveT <= 0) B.waveT = wave();
  }

  // naves
  const alive = game.players.filter((p) => p.alive && !p.empty);
  for (const p of alive) {
    p.cd -= dt;
    let wx = 0, wz = 0, dash = false;
    if (p.ctrl === 'local') {
      const c = input.ctl[p.pad || 'all'];
      wx = c.x; wz = -c.y;
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

  // bloques: aviso -> caída -> apoyado (obstáculo) -> se hunde
  for (const o of drops) {
    o.t += dt;
    if (o.st === 'warn' && o.t >= o.warn) {
      o.st = 'land'; o.t = 0;
      FX.slam(cx(o.k), cz(o.k));
      // aplastados: los que tienen el centro adentro de la baldosa (con un poquito de margen)
      const lim = CRUSH;
      for (const p of alive) {
        if (!p.alive || R.over) continue;
        if (Math.abs(p.x - cx(o.k)) < lim && Math.abs(p.z - cz(o.k)) < lim) {
          p.alive = false; game.elimOrder.push(p.i);
          FX.crush(p.i);
          if (p.i === game.me && game.mode === 'solo') game.timeScale = 1.5;
        }
      }
    } else if (o.st === 'land' && o.t >= LAND_T) { o.st = 'sink'; o.t = 0; }
  }
  drops = drops.filter((o) => !(o.st === 'sink' && o.t >= SINK_T));
  for (const o of drops) if (o.st === 'land') for (const p of alive) if (p.alive) pushOutOfBlock(p, o.k);

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
const bombardeo = {
  id: 'bombardeo',
  name: 'BOMBARDEO',
  desc: 'QUE NO TE CAIGA UN BLOQUE ENCIMA',
  points: { label: 'RONDAS PARA GANAR', values: [1, 2, 3], key: 'rounds', demo: 2 },
  cam: { pos: new THREE.Vector3(0, 24, 20.5), look: new THREE.Vector3(0, 0, -1.2), rotate: false },
  humanOut: false,
  thumbSteps: 820,
  thumbCam: { pos: new THREE.Vector3(0, 19, 17), look: new THREE.Vector3(0, -1, -0.8) },

  build: buildWorld,
  show(on) { if (W.grp) W.grp.visible = on; if (!on) W.blocks.forEach((b) => (b.visible = false)); },

  reset() {
    game.round = { n: 1, over: false, winner: -1, t: 0 };
    game.players.forEach((p) => { p.score = 0; });
    placeAll();
    sendT = 0;
  },
  step,

  visuals(dt) {
    const clock = game.clock;
    // baldosas y bloques
    W.tiles.forEach((t) => { t.m.uniforms.uEmissive.value.setRGB(0, 0, 0); });
    W.shadows.forEach((s) => (s.visible = false));
    W.frames.forEach((f) => (f.visible = false));
    let n = 0;
    for (const o of drops) {
      const x = cx(o.k), z = cz(o.k), tile = W.tiles[o.k];
      let y = -10;
      if (o.st === 'warn') {
        const left = o.warn - o.t, f = clamp(o.t / o.warn, 0, 1);
        // titila más rápido cuanto más cerca está de caer
        const on = ((clock * (4 + f * 14)) | 0) % 2 === 0;
        tile.m.uniforms.uEmissive.value.setRGB(on ? 0.5 + f * 0.3 : 0.18, on ? 0.12 : 0.04, 0.02);
        const fm = W.frames[o.k]; fm.visible = true; fm.material.uniforms.uColor.value.set(on ? 0xffe14a : 0xff3a2a);
        // la sombra del bloque crece y se oscurece a medida que baja
        const sh = W.shadows[o.k]; sh.visible = f > 0.15; const s = 0.2 + f * 0.62; sh.scale.set(s, 1, s);
        const g = 0.07 + 0.26 * (1 - f); sh.material.uniforms.uColor.value.setRGB(g, g * 0.92, g * 0.85);
        if (left < FALL_T) { const u = 1 - left / FALL_T; y = CS / 2 + (DROP_H - CS / 2) * (1 - u * u); }
      } else if (o.st === 'land') {
        y = CS / 2 - (o.t < 0.12 ? Math.sin((o.t / 0.12) * Math.PI) * 0.18 : 0);
      } else {
        y = CS / 2 - (o.t / SINK_T) * (CS + 0.2);
      }
      if (y > -5 && n < W.blocks.length) { const b = W.blocks[n++]; b.visible = true; b.position.set(x, y, z); }
    }
    for (; n < W.blocks.length; n++) W.blocks[n].visible = false;
    // luces de las esquinas: titilan cuando hay una tanda en camino
    const alarm = drops.some((o) => o.st === 'warn');
    W.lampM.uniforms.uColor.value.set(alarm && ((clock * 6) | 0) % 2 ? 0xff5a2a : 0x5a2010);
    // naves
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
      txt('¡SALÍ DE LAS BALDOSAS QUE TITILAN!', hw / 2, 170, 8, '#ffb31a', 'center');
      txt('GOLPE = EMBESTIDA', hw / 2, 184, 8, COL.dim, 'center');
    }
    if (st === 'play' && R.over) {
      const w = R.winner, p = game.players[w];
      const t = w < 0 ? '¡NADIE!' : w === game.me && game.mode !== 'local' ? '¡GANASTE LA RONDA!' : `RONDA PARA ${p.name || CHARS[w].name}`;
      rect(0, 96, hw, 34, 'rgba(4,6,14,.7)');
      txt(t, hw / 2, 104, 16, w < 0 ? COL.white : CHARS[w].col, 'center', COL.goldShadow);
    }
    const me = game.players[game.me];
    if (st === 'play' && me && !me.alive && !me.empty && !R.over && game.mode !== 'local') txt('¡APLASTADO!', hw / 2, 196, 16, COL.red, 'center');
  },

  /* ---------- online (el anfitrión manda todo; el invitado solo manda para dónde va) ---------- */
  snapshot() {
    const R = game.round;
    return {
      ro: [R.n, R.over ? 1 : 0, R.winner, Math.round(R.t * 10) / 10],
      p: game.players.map((p) => [r2(p.x), r2(p.z), r2(p.ang || 0), p.alive ? 1 : 0, p.dashT > 0 ? 1 : 0, p.score]),
      d: drops.map((o) => [o.id, o.k, o.st === 'warn' ? 0 : o.st === 'land' ? 1 : 2, r2(o.t), r2(o.warn)]),
    };
  },
  applySnap(A, Bs, f) {
    const ro = A.ro;
    game.round = { n: ro[0], over: !!ro[1], winner: ro[2], t: ro[3] };
    game.players.forEach((p, i) => {
      const pa = A.p[i], pb = Bs.p[i];
      if (pa[3] && p.death) { p.death = null; resetPodVisual(p); }           // empezó otra ronda
      p.alive = !!pa[3]; p.score = pa[5]; p.dashT = pa[4] ? 0.1 : 0;
      if (!p.alive && !p.death && !p.empty) FX.crush(i);                     // por si se perdió el aviso
      if (p.death || p.empty) return;
      p.x = pa[0] + (pb[0] - pa[0]) * f; p.z = pa[1] + (pb[1] - pa[1]) * f;
      p.ang = lerpAng(pa[2], pb[2], f);
    });
    const STS = ['warn', 'land', 'sink'];
    drops = A.d.map(([id, k, s, t, warn]) => {
      const b = Bs.d.find((q) => q[0] === id);
      const tt = b && b[2] === s ? t + (b[3] - t) * f : t;
      return { id, k, st: STS[s], t: tt, warn };
    });
  },
  guestLocal(rdt, hits) {
    sendT -= rdt;
    if (sendT > 0) return;
    sendT = 1 / 30;
    const c = input.ctl.all;
    sendInput({ x: Math.round(c.x * 100) / 100, y: Math.round(c.y * 100) / 100, h: hits });
  },
  guestHitFx() {},
};

register(bombardeo);
export default bombardeo;
