// Minijuego 7: HEXÁGONOS (a pie, estilo "hex-a-gone"). Cuatro pisos de baldosas hexagonales flotando en el cielo:
// cada baldosa que pisás tiembla y se cae al rato, así que no te podés quedar quieto. Si se te cae el piso, caés al
// piso de abajo; si te caés del último, al slime: quedás afuera. Gana la ronda el último que queda en pie.
// El golpe es AGARRAR: agarrás al que tenés adelante y lo frenás (su baldosa se sigue cayendo); al soltarlo
// (apretando otra vez, o solo al rato) lo tirás para adelante. A los 45 s el piso empieza a caerse solo.
import * as THREE from 'three';
import { register, fixedMap } from './registry.js';
import { DIFFICULTIES, rnd, clamp } from '../config.js';
import { charOf } from '../chars.js';
import { game } from '../state.js';
import { scene, mat, add, scaleUV } from '../render/psx.js';
import { TX } from '../render/textures.js';
import { input } from '../input.js';
import { FX } from '../game/fx.js';
import { SFX } from '../audio.js';
import { burst, P } from '../fx/particles.js';
import { resetPodVisual } from '../world/pods.js';
import { drawWalker } from '../world/walker.js';
import { camMove } from '../game/controls.js';
import { sendInput } from '../net/room.js';
import { txt, rect, COL } from '../ui/draw.js';
import { decorHexagonos, decorDulces, decorNeon } from '../world/decorHex.js';

/* ---------- medidas ---------- */
const N = 8, HS = 1.0, TR = 0.95, SQ3 = Math.sqrt(3);          // anillos de baldosas, separación y radio de cada una
const FLOORS = [0, -6, -12, -18], SLIME_Y = -40, OUT_Y = -30;         // alto de cada piso, el slime y dónde quedás afuera
const FLOOR_COL = [0xff6fae, 0xffc83a, 0x5ae07a, 0x4ad8ff];
// mapas: los mismos 4 pisos con otra pinta y otro fondo (abajo de todo: slime, chocolate o la grilla de neón)
const MAPS = [
  { name: 'CIELO', decor: decorHexagonos, fog: { col: 0xbfe0ff, near: 42, far: 100 }, top: 'hexTop', side: 'hexSide', cols: FLOOR_COL, bottom: 'SLIME', fall: P.YELLOW },
  { name: 'DULCES', decor: decorDulces, fog: { col: 0xffd8f0, near: 42, far: 100 }, top: 'frosting', side: 'wafer', cols: [0xffb0d8, 0xb0e8ff, 0xfff0a0, 0xc8ffb0], bottom: 'CHOCOLATE', fall: P.DEBRIS },
  { name: 'NEÓN', decor: decorNeon, fog: { col: 0x14062a, near: 45, far: 110 }, top: 'neonTop', side: 'neonSide', cols: [0xff3aa8, 0x3af0ff, 0xffe03a, 0x9a5aff], bottom: 'VACÍO', fall: P.CYAN, glow: true },
];
const PR = 0.45, CHAR_SCALE = 0.86;
const ACC = 55, MAXV = 5.4, FRICTION = 14, GRAV = 24;
const WARN_T = 0.55, FALL_T = 1.4;                               // lo que tarda en caerse una baldosa pisada
const GRAB_R = 1.3, GRAB_T = 1.8, GRAB_CD = 1.1, WHIFF_CD = 0.45, THROW = 8.5, THROW_UP = 4.2, HOLD_SLOW = 0.62;
const CRUMBLE_AT = 45, ROUND_PAUSE = 2.4;

const r2 = (v) => Math.round(v * 100) / 100;
const lerpAng = (a, b, f) => { let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return a + d * f; };
const demo = () => game.state === 'title' || game.state === 'menu';

/* ---------- la grilla hexagonal ---------- */
const CELLS = [];                    // [{ q, r, x, z }]
const IDX = new Map();               // "q,r" -> índice
for (let q = -N; q <= N; q++) for (let r = -N; r <= N; r++) {
  if (Math.abs(q + r) > N) continue;
  IDX.set(q + ',' + r, CELLS.length);
  CELLS.push({ q, r, x: HS * SQ3 * (q + r / 2), z: HS * 1.5 * r });
}
const NT = CELLS.length;
const NEIGH = CELLS.map((c) => [[1, 0], [-1, 0], [0, 1], [0, -1], [1, -1], [-1, 1]].map(([a, b]) => IDX.get((c.q + a) + ',' + (c.r + b))).filter((k) => k !== undefined));
// baldosa debajo de (x, z) (o -1)
function cellAt(x, z) {
  const fq = ((SQ3 / 3) * x - z / 3) / HS, fr = ((2 / 3) * z) / HS, fs = -fq - fr;
  let q = Math.round(fq), r = Math.round(fr); const s = Math.round(fs);
  const dq = Math.abs(q - fq), dr = Math.abs(r - fr), ds = Math.abs(s - fs);
  if (dq > dr && dq > ds) q = -r - s; else if (dr > ds) r = -q - s;
  const k = IDX.get(q + ',' + r);
  return k === undefined ? -1 : k;
}

/* ---------- estado ---------- */
// st de cada baldosa: 0 entera · 1 temblando (se va a caer) · 2 cayéndose · 3 ya no está
const S = { st: FLOORS.map(() => new Uint8Array(NT)), t: FLOORS.map(() => new Float32Array(NT)), crumbleT: 0, camY: 0, map: 0 };

/* ---------- mundo ---------- */
const W = { grp: null, body: [], cap: [], dirty: [true, true, true], seen: null, slimeM: null, tilt: FLOORS.map(() => new Float32Array(NT * 2)) };
const m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion(), v3 = new THREE.Vector3(), s3 = new THREE.Vector3(), e3 = new THREE.Euler();
const WHITE = new THREE.Color(1, 1, 1), WARN_A = new THREE.Color(1.6, 1.6, 1.6), WARN_B = new THREE.Color(1.3, 0.45, 0.4);

function buildWorld() {
  const grp = new THREE.Group(); grp.visible = false; scene.add(grp); W.grp = grp;
  const bodyG = new THREE.CylinderGeometry(TR, TR * 0.86, 0.55, 6); bodyG.translate(0, -0.275, 0);
  const capG = new THREE.CylinderGeometry(TR * 0.8, TR * 0.8, 0.06, 6); capG.translate(0, 0.02, 0);
  FLOORS.forEach((fy, f) => {
    const col = new THREE.Color(FLOOR_COL[f]);
    const bm = mat({ map: TX.hexSide, color: col.clone().multiplyScalar(0.8).getHex() }), cm = mat({ map: TX.hexTop, color: FLOOR_COL[f] });
    const body = new THREE.InstancedMesh(bodyG, bm, NT), cap = new THREE.InstancedMesh(capG, cm, NT);
    for (let k = 0; k < NT; k++) { body.setColorAt(k, WHITE); cap.setColorAt(k, WHITE); W.tilt[f][k * 2] = rnd(-1, 1); W.tilt[f][k * 2 + 1] = rnd(-1, 1); }
    body.position.y = fy; cap.position.y = fy;
    body.frustumCulled = false; cap.frustumCulled = false;
    grp.add(body); grp.add(cap); W.body.push(body); W.cap.push(cap);
  });
  W.seen = FLOORS.map(() => new Uint8Array(NT));
  W.maps = MAPS.map((m) => { const g = new THREE.Group(); g.visible = false; grp.add(g); return { g, bottom: m.decor(g, SLIME_Y) }; });
  applyMap(0);
}
function applyMap(i) {
  S.map = i; const m = MAPS[i];
  W.maps.forEach((q, k) => { q.g.visible = k === i; });
  W.slimeM = W.maps[i].bottom;
  FLOORS.forEach((fy, f) => {
    const col = new THREE.Color(m.cols[f]);
    W.body[f].material.uniforms.uMap.value = TX[m.side]; W.body[f].material.uniforms.uColor.value.copy(col).multiplyScalar(m.glow ? 1 : 0.8);
    W.cap[f].material.uniforms.uMap.value = TX[m.top]; W.cap[f].material.uniforms.uColor.value.copy(col);
    W.cap[f].material.uniforms.uUnlit.value = m.glow ? 1 : 0; W.body[f].material.uniforms.uUnlit.value = m.glow ? 1 : 0;
  });
}
function pickMap() {
  if (game.online === 'guest') return;
  const f = fixedMap(MAPS.length);
  applyMap(f >= 0 ? f : (Math.random() * MAPS.length) | 0);
}

// posición de cada baldosa según su estado (temblando: se hunde y vibra; cayéndose: cae girando)
function updateFloor(f, clock) {
  const st = S.st[f], tt = S.t[f], body = W.body[f], cap = W.cap[f];
  let colorDirty = false, any = false;
  for (let k = 0; k < NT; k++) {
    const c = CELLS[k], s = st[k];
    if (s === 3) { if (W.seen[f][k] !== 3) { m4.makeScale(0, 0, 0); body.setMatrixAt(k, m4); cap.setMatrixAt(k, m4); W.seen[f][k] = 3; any = true; } continue; }
    if (s === 0 && W.seen[f][k] === 0 && !W.dirty[f]) continue;
    let y = 0, rx = 0, rz = 0, jx = 0, jz = 0;
    if (s === 1) {
      const u = 1 - Math.max(0, tt[k]) / WARN_T;
      y = -0.12 * u; jx = Math.sin(clock * 60 + k) * 0.05 * u; jz = Math.cos(clock * 55 + k) * 0.05 * u;
      const blink = ((clock * (8 + u * 10)) | 0) % 2;
      body.setColorAt(k, blink ? WARN_A : WARN_B); cap.setColorAt(k, blink ? WARN_A : WARN_B); colorDirty = true;
    } else if (s === 2) {
      const u = Math.max(0, tt[k]);
      y = -0.3 - 9 * u * u; rx = W.tilt[f][k * 2] * u * 2.2; rz = W.tilt[f][k * 2 + 1] * u * 2.2;
      body.setColorAt(k, WARN_B); cap.setColorAt(k, WARN_B); colorDirty = true;
    } else if (W.seen[f][k] !== 0) { body.setColorAt(k, WHITE); cap.setColorAt(k, WHITE); colorDirty = true; }
    const sc = s === 2 ? Math.max(0.05, 1 - Math.max(0, tt[k]) / FALL_T * 0.6) : 1;
    q4.setFromEuler(e3.set(rx, 0, rz)); v3.set(c.x + jx, y, c.z + jz); s3.set(sc, sc, sc);
    m4.compose(v3, q4, s3); body.setMatrixAt(k, m4); cap.setMatrixAt(k, m4);
    W.seen[f][k] = s; any = true;
  }
  W.dirty[f] = false;
  if (any) { body.instanceMatrix.needsUpdate = true; cap.instanceMatrix.needsUpdate = true; }
  if (colorDirty) { body.instanceColor.needsUpdate = true; cap.instanceColor.needsUpdate = true; }
}

/* ---------- baldosas ---------- */
const solid = (f, k) => k >= 0 && S.st[f][k] < 2;
function trigger(f, k, t = WARN_T) { if (k >= 0 && S.st[f][k] === 0) { S.st[f][k] = 1; S.t[f][k] = t; } }
function stepTiles(dt) {
  for (let f = 0; f < FLOORS.length; f++) {
    const st = S.st[f], tt = S.t[f];
    for (let k = 0; k < NT; k++) {
      if (st[k] === 1) { tt[k] -= dt; if (tt[k] <= 0) { st[k] = 2; tt[k] = 0; SFX.crumble(); } }
      else if (st[k] === 2) { tt[k] += dt; if (tt[k] >= FALL_T) st[k] = 3; }
    }
  }
}
function resetTiles() {
  S.st.forEach((a) => a.fill(0)); S.t.forEach((a) => a.fill(0));
  W.dirty = FLOORS.map(() => true);
  if (W.body.length) W.body.forEach((b, f) => { for (let k = 0; k < NT; k++) { b.setColorAt(k, WHITE); W.cap[f].setColorAt(k, WHITE); } b.instanceColor.needsUpdate = true; W.cap[f].instanceColor.needsUpdate = true; W.seen[f].fill(255); });
}

/* ---------- partido ---------- */
function placeAll() {
  resetTiles();
  S.crumbleT = 0;
  game.players.forEach((p) => {
    resetPodVisual(p);
    p.death = null; p.alive = !p.empty;
    const a = [0, Math.PI / 2, Math.PI, -Math.PI / 2][p.i] + Math.PI / 4, r = 6.5;
    Object.assign(p, {
      x: Math.sin(a) * r, z: Math.cos(a) * r, fy: 0, vy: 0, vx: 0, vz: 0, kx: 0, kz: 0, onGround: true, floor: 0,
      cd: 0, swingT: 0, stunT: 0, grab: -1, grabbedBy: -1, grabT: 0, wantHit: false, thinkT: 0, hitN: 0, outT: 0, splashed: false,
    });
    p.ang = a + Math.PI;
    if (p.empty) { p.mesh.root.visible = false; p.mesh.sh.visible = false; }
  });
}
function startRound() {
  game.round = { n: game.round.n + 1, over: false, winner: -1, t: 0 };
  game.elimOrder = [];
  game.elapsed = 0;
  placeAll();
  if (!demo()) { game.state = 'count'; game.countT = 3.999; FX.tick(); }
}

/* ---------- IA ---------- */
function aiInput(p, dt) {
  const D = DIFFICULTIES[game.difficulty] || DIFFICULTIES.intermedio;
  p.thinkT -= dt;
  const f = p.floor;
  // ¿hay que elegir otro destino? (no tengo, llegué, o se está cayendo); la reacción tarda según la dificultad
  let bad = p.aiK === undefined || p.aiK < 0 || p.aiF !== f || S.st[f][p.aiK] !== 0 || Math.hypot(p.aiTx - p.x, p.aiTz - p.z) < 0.9;
  if (!bad && p.onGround) {                          // lo que tengo adelante se cayó: cambio de rumbo
    const dx = p.aiTx - p.x, dz = p.aiTz - p.z, l = Math.hypot(dx, dz) || 1;
    for (const a of [0.7, 1.4]) { if (a > l) break; if (!solid(f, cellAt(p.x + (dx / l) * a, p.z + (dz / l) * a))) { bad = true; break; } }
  }
  if (bad && p.onGround) {
    if (p.aiWait === undefined || p.aiWait < 0) p.aiWait = rnd(D.think[0], D.think[1]) * (p.aiK >= 0 && p.aiF === f && S.st[f][p.aiK] !== 0 ? 1.0 : 0.3);
    p.aiWait -= dt;
    if (p.aiWait <= 0) {
      p.aiWait = -1;
      // una baldosa sana cerca, con vecinas sanas, y que el camino hasta ahí no tenga agujeros
      let best = -1, bs = -1e9;
      for (let k = 0; k < NT; k++) {
        if (S.st[f][k] !== 0) continue;
        const c = CELLS[k], d = Math.hypot(c.x - p.x, c.z - p.z);
        if (d < 2.4 || d > 7.5) continue;
        let sc = NEIGH[k].filter((n) => S.st[f][n] === 0).length - d * 0.2 + rnd(0, 1.5) * (1 - D.lead * 0.5);
        for (let u = 0.1; u < 1; u += 0.12) { const mk = cellAt(p.x + (c.x - p.x) * u, p.z + (c.z - p.z) * u); if (!solid(f, mk)) sc -= 5; else if (S.st[f][mk] === 1) sc -= 1.5 * D.lead; }
        if (Math.hypot(c.x, c.z) > HS * 1.5 * N * 0.85) sc -= 1.2;          // lejos del borde
        // no ir justo donde está otro (se pisan las baldosas)
        for (const q of game.players) if (q !== p && q.alive && !q.empty && q.floor === f && Math.hypot(q.x - c.x, q.z - c.z) < 1.8) sc -= 1;
        if (sc > bs) { bs = sc; best = k; }
      }
      if (best >= 0) { p.aiTx = CELLS[best].x; p.aiTz = CELLS[best].z; p.aiK = best; p.aiF = f; }
    }
  }
  if (p.thinkT <= 0 && p.onGround) {
    p.thinkT = rnd(D.think[0], D.think[1]) * 2 + 0.1;
    // agarrar al que tengo cerca (y soltarlo al rato)
    p.aiHit = false;
    if (p.grab < 0 && p.cd <= 0) {
      for (const q of game.players) {
        if (q === p || !q.alive || q.empty || q.grabbedBy >= 0 || q.floor !== f) continue;
        const dx = q.x - p.x, dz = q.z - p.z, d = Math.hypot(dx, dz);
        if (d < GRAB_R + 0.2 && (dx * Math.sin(p.ang) + dz * Math.cos(p.ang)) / (d || 1) > 0.3 && Math.random() < D.swing * 1.2) { p.aiHit = true; p.aiHold = rnd(0.5, 1.3); }
      }
    } else if (p.grab >= 0 && p.grabT > (p.aiHold || 1)) p.aiHit = true;
  }
  if (p.aiTx === undefined) { p.aiTx = p.x; p.aiTz = p.z; }
  let dx = p.aiTx - p.x, dz = p.aiTz - p.z;
  const l = Math.hypot(dx, dz);
  if (l > 0.001) { dx /= l; dz /= l; }
  const k = Math.min(1, D.spd / 11);
  const hit = p.aiHit; p.aiHit = false;
  return { x: dx * k, z: dz * k, hit };
}

/* ---------- física ---------- */
function move(p, wx, wz, dt) {
  if (p.stunT > 0) { p.stunT -= dt; wx *= 0.2; wz *= 0.2; }
  if (p.grabbedBy >= 0) { wx *= 0.15; wz *= 0.15; }
  const l = Math.hypot(wx, wz);
  if (l > 1) { wx /= l; wz /= l; }
  const vmax = MAXV * (p.grab >= 0 ? HOLD_SLOW : 1);
  const grip = p.onGround ? 1 : 0.3;
  const kk = Math.min(1, (ACC * grip * dt) / vmax);
  p.vx += (wx * vmax - p.vx) * kk; p.vz += (wz * vmax - p.vz) * kk;
  if (l < 0.1 && p.onGround) { const fr = Math.exp(-FRICTION * dt); p.vx *= fr; p.vz *= fr; }
  if (Math.hypot(p.vx, p.vz) > 0.5 && p.grabbedBy < 0) p.ang = lerpAng(p.ang, Math.atan2(p.vx, p.vz), Math.min(1, dt * 14));
  const kf = Math.exp(-(p.onGround ? 3.5 : 0.4) * dt); p.kx *= kf; p.kz *= kf;
  p.x += (p.vx + p.kx) * dt; p.z += (p.vz + p.kz) * dt;
  // vertical: ¿hay baldosa debajo?
  const k = cellAt(p.x, p.z);
  if (p.onGround) {
    if (solid(p.floor, k)) { p.fy = FLOORS[p.floor]; p.vy = 0; return k; }
    p.onGround = false; p.vy = 0;
  }
  const y0 = p.fy;
  p.vy -= GRAV * dt; p.fy += p.vy * dt;
  for (let f = 0; f < FLOORS.length; f++) {
    const fy = FLOORS[f];
    if (y0 >= fy - 0.05 && p.fy <= fy && p.vy <= 0 && solid(f, k)) { p.fy = fy; p.vy = 0; p.onGround = true; p.floor = f; if (y0 - fy > 1) { FX.snd('thump'); burst(p.x, fy + 0.1, p.z, { mat: P.WHITE, n: 4, sp: 2, up: [0.5, 1.5], life: [0.2, 0.4] }); } return k; }
  }
  // de qué piso "es" mientras cae (para agarrar y para la cámara)
  let f2 = FLOORS.length - 1; for (let f = 0; f < FLOORS.length; f++) if (p.fy > FLOORS[f] - 0.5) { f2 = f; break; }
  p.floor = f2;
  return -1;
}

function separate(a, b) {
  if (Math.abs(a.fy - b.fy) > 1.2) return;
  if ((a.grab === b.i) || (b.grab === a.i)) return;
  const dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz), min = PR * 2;
  if (d >= min || d < 1e-4) return;
  const nx = dx / d, nz = dz / d, ov = (min - d) / 2;
  a.x -= nx * ov; a.z -= nz * ov; b.x += nx * ov; b.z += nz * ov;
}

function release(p, thr) {
  const q = game.players[p.grab];
  p.grab = -1; p.grabT = 0; p.cd = GRAB_CD;
  if (!q) return;
  q.grabbedBy = -1;
  if (thr && q.alive) {
    const fx = Math.sin(p.ang), fz = Math.cos(p.ang);
    q.kx = fx * THROW; q.kz = fz * THROW; q.vx = 0; q.vz = 0; q.vy = THROW_UP; q.onGround = false; q.stunT = 0.35;
    FX.bump(q.x, q.z, true); FX.snd('swing');
  }
}
function doGrab(p) {
  if (p.grab >= 0) { release(p, true); return; }
  if (p.cd > 0 || p.grabbedBy >= 0) return;
  p.swingT = 0.25; p.hitN = (p.hitN || 0) + 1;
  const fx = Math.sin(p.ang), fz = Math.cos(p.ang);
  let best = null, bd = 1e9;
  for (const q of game.players) {
    if (q === p || !q.alive || q.empty || q.grabbedBy >= 0 || q.grab >= 0) continue;
    const dx = q.x - p.x, dz = q.z - p.z, d = Math.hypot(dx, dz);
    if (d > GRAB_R + PR || Math.abs(q.fy - p.fy) > 0.8) continue;
    if (d > 0.4 && (dx * fx + dz * fz) / d < 0.2) continue;
    if (d < bd) { bd = d; best = q; }
  }
  if (!best) { p.cd = WHIFF_CD; FX.snd('swing'); return; }
  p.grab = best.i; p.grabT = 0; best.grabbedBy = p.i;
  FX.snd('thump'); FX.sparkle(best.x, best.fy + 1.3, best.z, P.YELLOW, 4);
}
// el agarrado va adelante del que lo agarra
function holdStep(p, dt) {
  const q = game.players[p.grab];
  if (!q || !q.alive || !p.alive || Math.abs(q.fy - p.fy) > 1.0 || !p.onGround) { release(p, false); return; }
  p.grabT += dt;
  if (p.grabT >= GRAB_T) { release(p, true); return; }
  const fx = Math.sin(p.ang), fz = Math.cos(p.ang), tx = p.x + fx * 0.95, tz = p.z + fz * 0.95;
  const k = Math.min(1, dt * 12);
  q.x += (tx - q.x) * k; q.z += (tz - q.z) * k; q.vx = p.vx; q.vz = p.vz;
  q.ang = lerpAng(q.ang, p.ang + Math.PI, Math.min(1, dt * 8));
}

function step(dt) {
  const st = game.state;
  if (st === 'count') {
    const before = Math.ceil(game.countT); game.countT -= dt; const after = Math.ceil(game.countT);
    if (after !== before) { if (after > 0) { if (after <= 3) FX.tick(); } else { FX.go(); game.state = 'play'; } }
    return;
  }
  if (st !== 'play' && !demo()) return;
  const R = game.round;
  if (!R.over) game.elapsed += dt;
  if (!R.over) stepTiles(dt);

  // a los 35 s el piso se empieza a caer solo (cada vez más rápido)
  if (!R.over && game.elapsed > CRUMBLE_AT) {
    S.crumbleT -= dt;
    if (S.crumbleT <= 0) {
      S.crumbleT = Math.max(0.05, 0.3 - (game.elapsed - CRUMBLE_AT) * 0.006);
      for (let f = 0; f < FLOORS.length; f++) { const k = (Math.random() * NT) | 0; trigger(f, k, WARN_T * 1.6); }
    }
  }
  // los pisos que quedaron arriba de todos se desarman (así se ve bien lo de abajo)
  const alive = game.players.filter((p) => p.alive && !p.empty);
  const topF = alive.length ? Math.min(...alive.map((p) => p.floor)) : FLOORS.length;
  for (let f = 0; f < topF && f < FLOORS.length && !R.over; f++) { const k = (Math.random() * NT) | 0; trigger(f, k, rnd(0.1, 0.6)); trigger(f, (k + 37) % NT, rnd(0.1, 0.6)); }

  for (const p of alive) {
    p.cd -= dt; if (p.swingT > 0) p.swingT -= dt;
    let wx = 0, wz = 0, hit = false;
    if (p.ctrl === 'local') {
      const c = input.ctl[p.pad || 'all'];
      [wx, wz] = camMove(c.x, c.y);
      hit = p.wantHit; p.wantHit = false;
    } else if (p.ctrl === 'remote') {
      const n = p.net;
      if (n) { wx = n.x || 0; wz = -(n.y || 0); hit = n.hit; n.hit = false; }
    } else if (p.ctrl === 'ai') {
      const a = aiInput(p, dt); wx = a.x; wz = a.z; hit = a.hit;
    }
    if (R.over) { wx *= 0.3; wz *= 0.3; hit = false; }
    const k = move(p, wx, wz, dt);
    if (hit) doGrab(p);
    if (k >= 0 && p.onGround && !R.over) trigger(p.floor, k);          // la baldosa que pisás se va a caer
    if (p.fy < OUT_Y) {                                                  // al slime
      p.alive = false; game.elimOrder.push(p.i);
      if (p.grab >= 0) release(p, false);
      if (p.grabbedBy >= 0) { const g = game.players[p.grabbedBy]; if (g) { g.grab = -1; g.cd = GRAB_CD; } p.grabbedBy = -1; }
      FX.snd('splash'); FX.sparkle(p.x, SLIME_Y + 0.5, p.z, MAPS[S.map].fall, 10);
      if (p.i === game.me && game.mode === 'solo') game.timeScale = 1.5;
    }
  }
  for (const p of alive) if (p.grab >= 0) holdStep(p, dt);
  for (let i = 0; i < alive.length; i++) for (let j = i + 1; j < alive.length; j++) separate(alive[i], alive[j]);
  // los que ya quedaron afuera siguen cayendo al slime
  for (const p of game.players) if (!p.empty && !p.alive && p.fy > SLIME_Y - 3) { p.vy -= GRAV * dt; p.fy += p.vy * dt; }

  // ¿terminó la ronda?
  const left = game.players.filter((p) => p.alive && !p.empty);
  if (!R.over && left.length <= 1 && !(demo() && game.players.filter((p) => !p.empty).length < 2)) {
    R.over = true; R.winner = left.length ? left[0].i : -1; R.t = ROUND_PAUSE;
    if (R.winner >= 0) game.players[R.winner].score++;
    FX.round(R.winner);
    left.forEach((p) => { if (p.grab >= 0) release(p, false); });
  }
  if (R.over) {
    R.t -= dt;
    if (R.t <= 0) {
      if (demo()) { game.players.forEach((p) => { p.score = 0; }); startRound(); }
      else if (!game.pendingEnd) {
        const champ = R.winner >= 0 && game.players[R.winner].score >= game.target;
        if (champ) { game.winner = R.winner; game.pendingEnd = true; }
        else startRound();
      }
    }
  }
}

/* ---------- el minijuego ---------- */
let sendT = 0;
const CAM_Y0 = 29;
const hexagonos = {
  id: 'hexagonos',
  name: 'HEXÁGONOS',
  maps: MAPS.map((m) => m.name),
  desc: 'EL PISO SE CAE DONDE PISÁS',
  howTo: 'AGARRAR',
  points: { label: 'RONDAS PARA GANAR', values: [1, 2, 3], key: 'rounds', demo: 2 },
  cam: { pos: new THREE.Vector3(0, CAM_Y0, 22.5), look: new THREE.Vector3(0, 0, 2.2), rotate: false, orbit: true },
  fog: () => MAPS[S.map].fog,
  humanOut: false,
  tense: () => game.elapsed > CRUMBLE_AT,
  tagY: 2.4, tagFeet: true, markMe: true,
  thumbSteps: 500,
  thumbCam: { pos: new THREE.Vector3(0, 18, 14), look: new THREE.Vector3(0, -1.5, 0.5) },

  rules(K) {
    return [`¡NO TE CAIGAS ${MAPS[S.map].bottom === 'VACÍO' ? 'AL VACÍO' : 'AL ' + MAPS[S.map].bottom}!`, 'CADA BALDOSA QUE PISÁS SE CAE: ¡NO TE QUEDES QUIETO!', `${K} = AGARRAR · ${K} OTRA VEZ = TIRARLO`,
      'HAY 4 PISOS: SI SE TE CAE EL PISO, SEGUÍS EN EL DE ABAJO', `GANA EL ÚLTIMO EN PIE · A ${game.target || 2} RONDAS`];
  },
  build: buildWorld,
  show(on) { if (W.grp) W.grp.visible = on; },
  _S: S,

  reset() {
    game.round = { n: 1, over: false, winner: -1, t: 0 };
    game.players.forEach((p) => { p.score = 0; });
    game.elimOrder = []; game.elapsed = 0;
    pickMap();
    placeAll();
    S.camY = 0;
    sendT = 0;
  },
  step,

  visuals(dt) {
    const clock = game.clock;
    for (let f = 0; f < FLOORS.length; f++) updateFloor(f, clock);
    if (W.slimeM) W.slimeM.uniforms.uOff.value.set(MAPS[S.map].glow ? 0 : (clock * 0.03) % 1, MAPS[S.map].glow ? (clock * 0.25) % 1 : (clock * 0.02) % 1);
    // cámara: baja siguiendo a los que quedan (al piso promedio donde están)
    const alive = game.players.filter((p) => p.alive && !p.empty);
    const target = alive.length ? alive.reduce((a, p) => a + Math.max(FLOORS[p.floor], p.fy), 0) / alive.length : S.camY;
    S.camY += (clamp(target, FLOORS[FLOORS.length - 1], 0) - S.camY) * Math.min(1, dt * 1.6);
    hexagonos.cam.pos.y = CAM_Y0 + S.camY; hexagonos.cam.look.y = S.camY;
    for (const p of game.players) {
      const me = p.mesh;
      if (p.empty) { me.root.visible = false; me.sh.visible = false; continue; }
      const k = cellAt(p.x, p.z);
      let gy = -99;
      for (let f = 0; f < FLOORS.length; f++) if (FLOORS[f] <= p.fy + 0.05 && solid(f, k)) { gy = FLOORS[f]; break; }
      drawWalker(p, dt, CHAR_SCALE, gy);
      if (gy === -99) me.sh.visible = false;
      if (!p.alive && p.fy < SLIME_Y + 0.5) { me.root.visible = false; me.sh.visible = false; }
      p.hideTag = !p.alive;
      // agarrando: brazos para adelante; agarrado: patalea
      if (p.grab >= 0) { if (me.armL) { me.armL.rotation.set(-1.5, 0, -0.2); me.armR.rotation.set(-1.5, 0, 0.2); } me.rider.rotation.x = -0.12; }
      else if (p.swingT > 0 && me.armL) { const u = p.swingT / 0.25; me.armL.rotation.set(-1.6 * Math.sin(u * Math.PI), 0, -0.1); me.armR.rotation.set(-1.6 * Math.sin(u * Math.PI), 0, 0.1); }
      if (p.grabbedBy >= 0) { me.root.position.y += 0.25; me.root.rotation.z = Math.sin(clock * 22) * 0.2; me.legL.rotation.x = Math.sin(clock * 25) * 0.8; me.legR.rotation.x = -Math.sin(clock * 25) * 0.8; }
      if (p.stunT > 0 && p.grabbedBy < 0) me.root.rotation.z = Math.sin(clock * 18) * 0.15;
    }
  },

  onLocalHit(p) { p.wantHit = true; },

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
    if (st === 'count' && game.mode !== 'demo') txt(`RONDA ${R.n}`, hw / 2, 80, 16, COL.teal, 'center');
    if (st !== 'play') return;
    if (R.over) {
      const w = R.winner, p = game.players[w];
      const t = w < 0 ? '¡NADIE!' : w === game.me && game.mode !== 'local' ? '¡GANASTE LA RONDA!' : `RONDA PARA ${p.name || charOf(w).name}`;
      rect(0, 96, hw, 34, 'rgba(4,6,14,.7)');
      txt(t, hw / 2, 104, 16, w < 0 ? COL.white : charOf(w).col, 'center', COL.goldShadow);
      return;
    }
    const blink = ((game.clock * 3) | 0) % 2;
    if (game.elapsed > CRUMBLE_AT && game.elapsed < CRUMBLE_AT + 2.5 && blink) txt('¡EL PISO SE CAE SOLO!', hw / 2, 64, 8, COL.red, 'center');
    const me = game.players[game.me];
    if (game.mode === 'local' || !me || me.empty) return;
    if (!me.alive) txt(MAPS[S.map].bottom === 'VACÍO' ? '¡AL VACÍO!' : `¡AL ${MAPS[S.map].bottom}!`, hw / 2, 196, 16, '#b8ff5a', 'center', '#1a3a00');
    else if (me.grabbedBy >= 0) txt('¡TE AGARRARON!', hw / 2, 196, 16, COL.red, 'center');
    else if (me.grab >= 0) txt(`¡LO TENÉS! ${input.device === 'gamepad' ? 'A' : 'ESPACIO'} = TIRARLO`, hw / 2, 200, 8, COL.gold, 'center');
  },

  /* ---------- online (el anfitrión manda todo; el invitado solo manda para dónde va y si agarró) ---------- */
  snapshot() {
    const R = game.round;
    return {
      ro: [R.n, R.over ? 1 : 0, R.winner, Math.round(R.t * 10) / 10, Math.round(game.elapsed)], m: S.map,
      tl: S.st.map((a) => String.fromCharCode(...a.map((v) => 48 + v))),
      p: game.players.map((p) => [r2(p.x), r2(p.z), r2(p.fy || 0), r2(p.ang || 0), p.alive ? 1 : 0, p.score, p.grab, p.grabbedBy, p.hitN || 0,
        r2(p.vx || 0), r2(p.vz || 0), p.onGround ? 1 : 0, p.floor || 0, p.stunT > 0 ? 1 : 0]),
    };
  },
  applySnap(A, B, f) {
    const ro = A.ro;
    game.round = { n: ro[0], over: !!ro[1], winner: ro[2], t: ro[3] };
    game.elapsed = ro[4];
    if (B.m !== undefined && B.m !== S.map) applyMap(B.m);
    // baldosas: el estado que manda el anfitrión (las que empiezan a caer arrancan su animación acá)
    (B.tl || []).forEach((s, fl) => {
      const st = S.st[fl], tt = S.t[fl];
      for (let k = 0; k < NT && k < s.length; k++) {
        const v = s.charCodeAt(k) - 48;
        if (v === st[k]) continue;
        if (v === 0) { st[k] = 0; tt[k] = 0; W.dirty[fl] = true; continue; }
        if (v === 1) { st[k] = 1; tt[k] = WARN_T; } else if (v === 2) { if (st[k] !== 2) { st[k] = 2; tt[k] = 0; SFX.crumble(); } } else if (st[k] !== 2) st[k] = 3;
      }
    });
    game.players.forEach((p, i) => {
      const pa = A.p[i], pb = B.p[i];
      if (p.empty) return;
      p.alive = !!pb[4]; p.score = pb[5]; p.grab = pb[6]; p.grabbedBy = pb[7];
      if ((pb[8] || 0) > (p.hitSeen || 0)) p.swingT = 0.25;
      p.hitSeen = pb[8] || 0;
      p.vx = pb[9]; p.vz = pb[10]; p.onGround = !!pb[11]; p.floor = pb[12]; p.stunT = pb[13] ? 0.1 : 0;
      if (Math.hypot(pb[0] - pa[0], pb[1] - pa[1]) > 5) { p.x = pb[0]; p.z = pb[1]; p.fy = pb[2]; }
      else { p.x = pa[0] + (pb[0] - pa[0]) * f; p.z = pa[1] + (pb[1] - pa[1]) * f; p.fy = pa[2] + (pb[2] - pa[2]) * f; }
      p.ang = lerpAng(pa[3], pb[3], f);
    });
  },
  guestLocal(rdt, hits) {
    // el invitado anima solo las baldosas (el estado lo manda el anfitrión)
    for (let fl = 0; fl < FLOORS.length; fl++) { const st = S.st[fl], tt = S.t[fl]; for (let k = 0; k < NT; k++) { if (st[k] === 1) tt[k] = Math.max(0, tt[k] - rdt); else if (st[k] === 2) tt[k] = Math.min(FALL_T, tt[k] + rdt); } }
    game.players.forEach((p) => { if (p.swingT > 0) p.swingT -= rdt; });
    sendT -= rdt;
    if (sendT > 0) return;
    sendT = 1 / 30;
    const c = input.ctl.all, [wx, wz] = camMove(c.x, c.y);
    sendInput({ x: Math.round(wx * 100) / 100, y: Math.round(-wz * 100) / 100, h: hits });
  },
  guestHitFx() {},
};

register(hexagonos);
export default hexagonos;
