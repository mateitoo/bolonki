// Minijuego 4: PETARDOS (estilo Bomberman). Mapa en grilla con paredes fijas y cajones de madera al azar;
// cada uno arranca en una esquina. Con el golpe ponés un petardo: explota en cruz, rompe cajones y
// hace explotar a otros petardos que alcanza. De los cajones salen poderes: +petardo, +fuego, +velocidad.
// Gana la ronda el último que queda. Al minuto empieza la lluvia de petardos para que no se estire.
import * as THREE from 'three';
import { register } from './registry.js';
import { CHARS, DIFFICULTIES, rnd, clamp } from '../config.js';
import { game } from '../state.js';
import { scene, mat, add, scaleUV } from '../render/psx.js';
import { TX } from '../render/textures.js';
import { input } from '../input.js';
import { FX } from '../game/fx.js';
import { resetPodVisual } from '../world/pods.js';
import { drawWalker } from '../world/walker.js';
import { sendInput } from '../net/room.js';
import { txt, rect, COL } from '../ui/draw.js';

/* ---------- medidas y reglas ---------- */
const GW = 13, GH = 11;      // celdas (con el borde de paredes)
const N = GW * GH;
const TS = 1.6;              // tamaño de cada celda
const FUSE = 2.4;            // mecha del petardo (s)
const FLAME_T = 0.55;        // cuánto dura el fuego
const CRATE_FILL = 0.72;     // qué tan lleno de cajones sale el mapa
const DROP_CHANCE = 0.38;    // cajones que esconden un poder
const SPEED0 = 3.3, SPEED_UP = 0.45, SPEED_MAX = 5.6;   // celdas por segundo
const MAX_BOMBS = 6, MAX_RANGE = 7;
const RAIN_AT = 40;                                      // lluvia de petardos (cada vez más seguida)
const CHAR_SCALE = 0.7;
const ROUND_PAUSE = 2.4;
const EMPTY = 0, WALL = 1, CRATE = 2;
const PU = ['bomba', 'fuego', 'velocidad'];

const r2 = (v) => Math.round(v * 100) / 100;
const lerpAng = (a, b, f) => { let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return a + d * f; };
const idx = (c, r) => r * GW + c;
const cxOf = (c) => (c - (GW - 1) / 2) * TS;
const czOf = (r) => (r - (GH - 1) / 2) * TS;
const colOf = (x) => clamp(Math.round(x / TS + (GW - 1) / 2), 0, GW - 1);
const rowOf = (z) => clamp(Math.round(z / TS + (GH - 1) / 2), 0, GH - 1);
const cellOf = (p) => idx(colOf(p.x), rowOf(p.z));
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
// esquinas: lugar 0 abajo a la izquierda, 2 arriba a la izquierda, 1 arriba a la derecha, 3 abajo a la derecha
const CORNERS = [[1, GH - 2], [GW - 2, 1], [1, 1], [GW - 2, GH - 2]];

/* ---------- estado ---------- */
const G = new Array(N).fill(EMPTY);   // 0 vacío · 1 pared · 2 cajón
const hidden = new Array(N).fill(-1); // poder escondido en cada cajón (-1 = nada)
let bombs = [];                       // { id, k, t, range, owner, age }
let flames = new Map();               // celda -> tiempo que le queda
let pups = [];                        // { k, type, t } (t: tiempo hasta aparecer)
let nextId = 1;
const S = { rainT: 0 };

function makeMap() {
  G.fill(EMPTY); hidden.fill(-1);
  for (let r = 0; r < GH; r++) for (let c = 0; c < GW; c++) {
    const k = idx(c, r);
    if (r === 0 || c === 0 || r === GH - 1 || c === GW - 1 || (c % 2 === 0 && r % 2 === 0)) { G[k] = WALL; continue; }
    // las esquinas quedan libres (la celda de salida y sus dos vecinas)
    const nearCorner = CORNERS.some(([cc, rr]) => Math.abs(cc - c) + Math.abs(rr - r) <= 1);
    if (!nearCorner && Math.random() < CRATE_FILL) {
      G[k] = CRATE;
      if (Math.random() < DROP_CHANCE) hidden[k] = Math.random() < 0.4 ? 0 : Math.random() < 0.67 ? 1 : 2;
    }
  }
}

/* ---------- mundo ---------- */
const W = { grp: null, crates: [], bombs: [], flames: [], pups: [], puMats: [] };

function buildWorld() {
  const grp = new THREE.Group(); grp.visible = false; scene.add(grp); W.grp = grp;
  // piso de pasto (una baldosa por celda) y base
  const fl = scaleUV(new THREE.PlaneGeometry(GW * TS, GH * TS, GW, GH), GW, GH); fl.rotateX(-Math.PI / 2);
  add(fl, mat({ map: TX.turf }), 0, 0, 0, grp);
  add(scaleUV(new THREE.BoxGeometry(GW * TS + 1, 1.4, GH * TS + 1), 8, 1), mat({ map: TX.brick, color: 0x8a8a96 }), 0, -0.72, 0, grp);
  const out = scaleUV(new THREE.PlaneGeometry(160, 160, 10, 10), 30); out.rotateX(-Math.PI / 2);
  add(out, mat({ map: TX.turf, color: 0x557755 }), 0, -1.4, 0, grp);
  // paredes fijas (borde y columnas)
  const wg = scaleUV(new THREE.BoxGeometry(TS, TS * 0.9, TS), 1, 1), wm = mat({ map: TX.brick });
  for (let r = 0; r < GH; r++) for (let c = 0; c < GW; c++) {
    if (r === 0 || c === 0 || r === GH - 1 || c === GW - 1 || (c % 2 === 0 && r % 2 === 0)) add(wg, wm, cxOf(c), TS * 0.45, czOf(r), grp);
  }
  // árboles alrededor
  const trunkM = mat({ color: 0x6b4a2a }), leafM = mat({ color: 0x2f7a3a });
  [[-14, -6], [14, -7], [-15, 4], [15, 5], [-8, -12], [9, -12.5], [-12, 11], [12, 11]].forEach(([x, z]) => {
    add(new THREE.CylinderGeometry(0.3, 0.4, 1.6, 6), trunkM, x, -0.6, z, grp);
    add(new THREE.ConeGeometry(1.6, 3, 7), leafM, x, 1.6, z, grp);
  });
  // cajones (uno por celda posible), petardos, fuego y poderes
  const cg = new THREE.BoxGeometry(TS * 0.92, TS * 0.8, TS * 0.92), cm = mat({ map: TX.crate });
  for (let k = 0; k < N; k++) { const m = add(cg, cm, cxOf(k % GW), TS * 0.4, czOf((k / GW) | 0), grp); m.visible = false; W.crates.push(m); }
  const bodyM = mat({ color: 0x22222c }), fuseM = mat({ color: 0xc8a060 }), shineM = mat({ color: 0xffffff, unlit: true });
  for (let n = 0; n < 40; n++) {
    const g = new THREE.Group(); grp.add(g); g.visible = false;
    add(new THREE.SphereGeometry(TS * 0.34, 10, 8), bodyM, 0, TS * 0.34, 0, g);
    add(new THREE.CylinderGeometry(TS * 0.12, TS * 0.14, TS * 0.12, 8), bodyM, 0, TS * 0.7, 0, g);
    add(new THREE.CylinderGeometry(0.04, 0.04, TS * 0.2, 4), fuseM, 0.05, TS * 0.84, 0, g).rotation.z = -0.4;
    add(new THREE.BoxGeometry(0.1, 0.1, 0.05), shineM, -TS * 0.14, TS * 0.48, TS * 0.28, g);
    const spark = add(new THREE.SphereGeometry(0.11, 5, 4), mat({ color: 0xffd23a, unlit: true }), 0.1, TS * 0.96, 0, g);
    g.userData.spark = spark;
    W.bombs.push(g);
  }
  const fg = new THREE.BoxGeometry(TS * 0.94, TS * 0.5, TS * 0.94), fm = mat({ map: TX.fire, unlit: true });
  W.flameM = fm;
  for (let k = 0; k < N; k++) { const m = add(fg, fm, cxOf(k % GW), TS * 0.25, czOf((k / GW) | 0), grp); m.visible = false; W.flames.push(m); }
  W.puMats = [mat({ map: TX.puBomb, unlit: true }), mat({ map: TX.puFire, unlit: true }), mat({ map: TX.puSpeed, unlit: true })];
  const pg = new THREE.BoxGeometry(TS * 0.55, TS * 0.55, TS * 0.55);
  for (let n = 0; n < 40; n++) { const m = add(pg, W.puMats[0], 0, 0, 0, grp); m.visible = false; W.pups.push(m); }
}

/* ---------- rondas ---------- */
const demo = () => game.state === 'title' || game.state === 'menu';

function placeAll() {
  makeMap();
  bombs = []; flames = new Map(); pups = []; S.rainT = RAIN_AT;
  game.players.forEach((p) => {
    resetPodVisual(p);
    p.death = null;
    p.alive = !p.empty;
    const [c, r] = CORNERS[p.i];
    Object.assign(p, { x: cxOf(c), z: czOf(r), fy: 0, vx: 0, vz: 0, onGround: true, walk: 0, cd: 0,
      maxBombs: 1, range: 2, speed: SPEED0, pass: [], wantBomb: false, thinkT: 0, path: [], aiGoal: -1 });
    p.ang = r > GH / 2 ? Math.PI : 0;
    if (p.empty) { p.mesh.root.visible = false; p.mesh.sh.visible = false; }
  });
  game.elapsed = 0;
}

function startRound() {
  game.round = { n: game.round.n + 1, over: false, winner: -1, t: 0 };
  game.timeScale = 1;
  game.elimOrder = [];
  placeAll();
  if (!demo()) { game.state = 'count'; game.countT = 3.999; FX.tick(); }
}

/* ---------- petardos ---------- */
const bombAt = (k) => bombs.find((b) => b.k === k);
const solidFor = (p, k) => G[k] !== EMPTY || (bombAt(k) && !p.pass.includes(bombAt(k).id));
const activeBombs = (p) => bombs.filter((b) => b.owner === p.i).length;

function placeBomb(p, force) {
  const k = cellOf(p);
  if (bombAt(k) || G[k] !== EMPTY) return;
  if (!force && activeBombs(p) >= p.maxBombs) return;
  const b = { id: nextId++, k, t: FUSE, range: p.range || 2, owner: p.i, age: 0 };
  bombs.push(b);
  // los que están parados arriba pueden salir caminando
  for (const q of game.players) if (q.alive && cellOf(q) === k) q.pass.push(b.id);
  FX.place();
}

// celdas que alcanza la explosión de un petardo en k con alcance range (sin romper nada)
function blastCells(k, range, grid) {
  const out = [k], c0 = k % GW, r0 = (k / GW) | 0;
  for (const [dc, dr] of DIRS) {
    for (let s = 1; s <= range; s++) {
      const c = c0 + dc * s, r = r0 + dr * s;
      if (c < 0 || r < 0 || c >= GW || r >= GH) break;
      const kk = idx(c, r), g = grid[kk];
      if (g === WALL) break;
      out.push(kk);
      if (g === CRATE) break;
    }
  }
  return out;
}

function explode(b) {
  bombs = bombs.filter((q) => q !== b);
  FX.boom(cxOf(b.k % GW), czOf((b.k / GW) | 0));
  const c0 = b.k % GW, r0 = (b.k / GW) | 0;
  const burn = (kk) => { flames.set(kk, FLAME_T); };
  burn(b.k);
  for (const [dc, dr] of DIRS) {
    for (let s = 1; s <= b.range; s++) {
      const c = c0 + dc * s, r = r0 + dr * s;
      if (c < 0 || r < 0 || c >= GW || r >= GH) break;
      const kk = idx(c, r);
      if (G[kk] === WALL) break;
      burn(kk);
      if (G[kk] === CRATE) {
        G[kk] = EMPTY; FX.crate(cxOf(c), czOf(r));
        if (hidden[kk] >= 0) { pups.push({ k: kk, type: hidden[kk], t: FLAME_T }); hidden[kk] = -1; }
        break;
      }
      const other = bombAt(kk);
      if (other) other.t = Math.min(other.t, 0.06);          // reacción en cadena
      const pu = pups.find((u) => u.k === kk && u.t <= 0);
      if (pu) { pups = pups.filter((u) => u !== pu); break; }  // el fuego quema el poder
    }
  }
}

/* ---------- movimiento por pasillos ---------- */
// Se camina por el centro de los pasillos: al doblar, el personaje se alinea solo (y si está
// medio metido en la esquina, se desliza hacia el pasillo libre).
function stepAxis(p, ax, s, dist) {
  const c = colOf(p.x), r = rowOf(p.z);
  const oth = ax === 'x' ? 'z' : 'x';
  const laneC = ax === 'x' ? czOf(r) : cxOf(c);
  const off = p[oth] - laneC;
  const ac = ax === 'x' ? c + s : c, ar = ax === 'z' ? r + s : r;
  const ahead = ac < 0 || ar < 0 || ac >= GW || ar >= GH || solidFor(p, idx(ac, ar));
  const curC = ax === 'x' ? cxOf(c) : czOf(r);
  const along = (p[ax] - curC) * s;
  if (ahead && along >= -1e-3) {
    // bloqueado adelante: si está corrido hacia un costado y por ese lado hay paso, se desliza
    if (Math.abs(off) > TS * 0.12) {
      const l2 = Math.sign(off);
      const sc = ax === 'x' ? c : c + l2, sr = ax === 'x' ? r + l2 : r;
      const nc = ax === 'x' ? c + s : c + l2, nr = ax === 'x' ? r + l2 : r + s;
      const inGrid = (a, b) => a >= 0 && b >= 0 && a < GW && b < GH;
      if (inGrid(sc, sr) && inGrid(nc, nr) && !solidFor(p, idx(sc, sr)) && !solidFor(p, idx(nc, nr))) {
        p[oth] += l2 * Math.min(dist, TS - Math.abs(off));
        return true;
      }
    }
    p[ax] = curC;
    return false;
  }
  let rem = dist;
  if (Math.abs(off) > 1e-3) { const d = Math.min(Math.abs(off), rem); p[oth] -= Math.sign(off) * d; rem -= d; }
  let nv = p[ax] + s * rem;
  if (ahead && (nv - curC) * s > 0) nv = curC;
  p[ax] = nv;
  return true;
}

function move(p, ix, iz, dt) {
  const ox = p.x, oz = p.z;
  const dist = p.speed * TS * dt;
  const ax = Math.abs(ix), az = Math.abs(iz);
  if (ax > 0.3 || az > 0.3) {
    const primX = ax >= az;
    const moved = primX ? stepAxis(p, 'x', Math.sign(ix), dist) : stepAxis(p, 'z', Math.sign(iz), dist);
    if (!moved) {
      if (primX && az > 0.3) stepAxis(p, 'z', Math.sign(iz), dist);
      else if (!primX && ax > 0.3) stepAxis(p, 'x', Math.sign(ix), dist);
    }
  }
  p.vx = (p.x - ox) / Math.max(dt, 1e-4); p.vz = (p.z - oz) / Math.max(dt, 1e-4);
  if (Math.hypot(p.vx, p.vz) > 0.3) p.ang = lerpAng(p.ang, Math.atan2(p.vx, p.vz), Math.min(1, dt * 16));
  // los petardos que dejó atrás pasan a ser sólidos para él
  const k = cellOf(p);
  if (p.pass.length) p.pass = p.pass.filter((id) => { const b = bombs.find((q) => q.id === id); return b && b.k === k; });
}

/* ---------- IA ---------- */
// Mapa de peligro: en cuántos segundos le llega fuego a cada celda (teniendo en cuenta las cadenas).
function dangerMap(extra, react, p) {
  // los petardos propios los ve siempre; los de los demás, un ratito después de que aparecen
  const list = bombs.filter((b) => b.age >= react || (p && b.owner === p.i)).map((b) => ({ k: b.k, t: b.t, range: b.range }));
  if (extra) list.push(extra);
  const cells = list.map((b) => blastCells(b.k, b.range, G));
  for (let it = 0; it < 4; it++) {
    list.forEach((b, i) => { for (const kk of cells[i]) for (const o of list) if (o !== b && o.k === kk && o.t > b.t) o.t = b.t; });
  }
  const d = new Array(N).fill(Infinity);
  list.forEach((b, i) => { for (const kk of cells[i]) d[kk] = Math.min(d[kk], b.t); });
  for (const [kk] of flames) d[kk] = 0;
  return d;
}
// Camino (por celdas) hasta la celda más cercana que cumpla want(k), pasando solo por celdas seguras a tiempo
function findPath(p, danger, want, maxSteps, startBomb) {
  const start = cellOf(p), cellT = 1 / p.speed;
  const prev = new Array(N).fill(-2), dist = new Array(N).fill(-1);
  dist[start] = 0; prev[start] = -1; const q = [start];
  while (q.length) {
    const k = q.shift();
    if (want(k, dist[k])) {
      const path = []; let x = k; while (x !== start && x >= 0) { path.unshift(x); x = prev[x]; }
      return path;
    }
    if (dist[k] >= maxSteps) continue;
    const c = k % GW, r = (k / GW) | 0;
    for (const [dc, dr] of DIRS) {
      const kk = idx(c + dc, r + dr);
      if (dist[kk] >= 0 || G[kk] !== EMPTY) continue;
      const b = bombAt(kk);
      if ((b && !(kk === start)) || (startBomb === kk && kk !== start)) continue;
      const arrive = (dist[k] + 1) * cellT;
      // no pasar por una celda que explota justo mientras la cruzo
      if (danger[kk] < arrive + cellT + 0.25 && danger[kk] > arrive - 0.6 - cellT) continue;
      if (danger[kk] <= 0.05) continue;
      dist[kk] = dist[k] + 1; prev[kk] = k; q.push(kk);
    }
  }
  return null;
}
function lineHits(k, range, target) {
  return blastCells(k, range, G).includes(target);
}
function aiThink(p, D) {
  const react = D.think[1] * 1.5;
  const danger = dangerMap(null, react, p);
  const here = cellOf(p);
  const safe = (k) => danger[k] === Infinity;
  // 1) en peligro: ir a una celda segura
  if (!safe(here)) {
    const path = findPath(p, danger, (k) => safe(k), 8);
    p.path = path || [];
    return;
  }
  // 2) ¿poner un petardo? (al lado de un cajón o con un rival en la línea) solo si hay por dónde escapar
  const rivals = game.players.filter((q) => q !== p && q.alive && !q.empty);
  const nearCrate = DIRS.some(([dc, dr]) => G[idx((here % GW) + dc, ((here / GW) | 0) + dr)] === CRATE);
  const hitsRival = rivals.some((q) => lineHits(here, p.range, cellOf(q)));
  const wantBomb = (nearCrate && Math.random() < 0.7) || (hitsRival && Math.random() < 0.3 + D.swing);
  const centered = Math.abs(p.x - cxOf(here % GW)) < TS * 0.3 && Math.abs(p.z - czOf((here / GW) | 0)) < TS * 0.3;
  if (wantBomb && centered && activeBombs(p) < p.maxBombs && !bombAt(here)) {
    const d2 = dangerMap({ k: here, t: FUSE, range: p.range }, react, p);
    const esc = findPath(p, d2, (k) => d2[k] === Infinity, 7, here);
    const reckless = D.err > 3 && Math.random() < 0.01;          // en fácil, muy de vez en cuando, se manda igual
    if (esc || reckless) { p.wantBomb = true; p.path = esc || []; return; }
  }
  // 3) moverse: poder cerca, un lugar al lado de un cajón, o ir a buscar a alguien
  if (p.path.length && safe(p.path[p.path.length - 1]) && Math.random() < 0.7) return;   // sigue con lo que venía
  const puSet = new Set(pups.filter((u) => u.t <= 0).map((u) => u.k));
  let path = findPath(p, danger, (k, d) => d > 0 && puSet.has(k), 6);
  if (!path) {
    path = findPath(p, danger, (k, d) => d > 0 && safe(k) && DIRS.some(([dc, dr]) => G[idx((k % GW) + dc, ((k / GW) | 0) + dr)] === CRATE), 10);
  }
  if (!path || Math.random() < 0.25 + D.lead * 0.3) {
    const targets = new Set(rivals.map((q) => cellOf(q)));
    const hunt = findPath(p, danger, (k, d) => d > 0 && safe(k) && [...targets].some((t) => lineHits(k, p.range, t)), 12);
    if (hunt) path = hunt;
  }
  p.path = path || [];
}
function aiInput(p, dt) {
  const D = DIFFICULTIES[game.difficulty] || DIFFICULTIES.intermedio;
  p.thinkT -= dt;
  if (p.thinkT <= 0) { p.thinkT = rnd(D.think[0], D.think[1]) * 2; aiThink(p, D); }
  // seguir el camino celda por celda
  while (p.path.length && cellOf(p) === p.path[0] && Math.hypot(cxOf(p.path[0] % GW) - p.x, czOf((p.path[0] / GW) | 0) - p.z) < TS * 0.12) p.path.shift();
  if (!p.path.length) {
    // quieto en el centro de su celda
    const k = cellOf(p), dx = cxOf(k % GW) - p.x, dz = czOf((k / GW) | 0) - p.z;
    if (Math.abs(dx) > 0.05) return { x: Math.sign(dx), z: 0 };
    if (Math.abs(dz) > 0.05) return { x: 0, z: Math.sign(dz) };
    return { x: 0, z: 0 };
  }
  const t = p.path[0];
  const dx = cxOf(t % GW) - p.x, dz = czOf((t / GW) | 0) - p.z;
  // si la próxima celda se volvió peligrosa justo ahora, esperar
  const danger = dangerMap(null, 0, p);
  if (danger[t] < 0.6 && danger[cellOf(p)] === Infinity) return { x: 0, z: 0 };
  return Math.abs(dx) >= Math.abs(dz) ? { x: Math.sign(dx), z: 0 } : { x: 0, z: Math.sign(dz) };
}

/* ---------- simulación ---------- */
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

  const alive = game.players.filter((p) => p.alive && !p.empty);
  for (const p of alive) {
    let ix = 0, iz = 0, bomb = false;
    if (p.ctrl === 'local') {
      const c = input.ctl[p.pad || 'all'];
      ix = c.x; iz = -c.y;
      bomb = p.wantBomb; p.wantBomb = false;
    } else if (p.ctrl === 'remote') {
      const n = p.net;
      if (n) { ix = n.x || 0; iz = -(n.y || 0); bomb = n.hit; n.hit = false; }
    } else if (p.ctrl === 'ai') {
      const a = aiInput(p, dt); ix = a.x; iz = a.z;
      bomb = p.wantBomb; p.wantBomb = false;
    }
    if (R.over) { ix = 0; iz = 0; bomb = false; }
    if (bomb) placeBomb(p);             // el petardo queda donde estabas al apretar
    move(p, ix, iz, dt);
    // agarrar poderes
    const k = cellOf(p);
    const pu = pups.find((u) => u.k === k && u.t <= 0);
    if (pu) {
      pups = pups.filter((u) => u !== pu);
      if (pu.type === 0) p.maxBombs = Math.min(MAX_BOMBS, p.maxBombs + 1);
      else if (pu.type === 1) p.range = Math.min(MAX_RANGE, p.range + 1);
      else p.speed = Math.min(SPEED_MAX, p.speed + SPEED_UP);
      FX.powerup(p.x, p.z);
    }
  }

  // lluvia de petardos (para que la ronda no se estire)
  if (!R.over && game.elapsed > RAIN_AT) {
    S.rainT -= dt;
    if (S.rainT <= 0) {
      S.rainT = Math.max(0.2, 0.55 - (game.elapsed - RAIN_AT) * 0.02);
      const free = [];
      for (let k = 0; k < N; k++) if (G[k] === EMPTY && !bombAt(k) && !flames.has(k)) free.push(k);
      if (free.length) { const k = free[(Math.random() * free.length) | 0]; bombs.push({ id: nextId++, k, t: FUSE, range: 3, owner: -2, age: 0 }); }
    }
  }

  // mechas, explosiones, fuego y poderes que aparecen
  for (const b of bombs) { b.t -= dt; b.age += dt; }
  let guard = 0;
  while (guard++ < 50) { const b = bombs.find((q) => q.t <= 0); if (!b) break; explode(b); }
  for (const [k, t] of flames) { if (t - dt <= 0) flames.delete(k); else flames.set(k, t - dt); }
  for (const u of pups) if (u.t > 0) u.t -= dt;

  // el fuego alcanza a los que están en esa celda
  if (!R.over) for (const p of alive) {
    if (p.alive && flames.has(cellOf(p))) {
      p.alive = false; game.elimOrder.push(p.i);
      FX.blast(p.i);
      if (p.i === game.me && game.mode === 'solo') game.timeScale = 1.5;
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
const petardos = {
  id: 'petardos',
  name: 'PETARDOS',
  desc: 'VOLÁ A LOS DEMÁS Y ROMPÉ CAJONES',
  points: { label: 'RONDAS PARA GANAR', values: [1, 2, 3], key: 'rounds', demo: 2 },
  cam: { pos: new THREE.Vector3(0, 27, 13.2), look: new THREE.Vector3(0, 0, 0.35), rotate: false },
  humanOut: false,
  tagY: 2.2, markMe: true,
  thumbSteps: 1300,
  thumbCam: { pos: new THREE.Vector3(0, 17, 9), look: new THREE.Vector3(0, 0, -0.3) },

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
    for (let k = 0; k < N; k++) W.crates[k].visible = G[k] === CRATE;
    // petardos: se inflan cada vez más rápido y la chispa titila
    W.bombs.forEach((g) => (g.visible = false));
    bombs.forEach((b, n) => {
      const g = W.bombs[n]; if (!g) return;
      g.visible = true; g.position.set(cxOf(b.k % GW), 0, czOf((b.k / GW) | 0));
      const f = 1 - clamp(b.t / FUSE, 0, 1), s = 1 + Math.sin(clock * (8 + f * 22)) * (0.05 + f * 0.08);
      g.scale.set(s, 1 / s, s);
      g.userData.spark.visible = ((clock * 20) | 0) % 2 === 0;
    });
    // fuego
    for (let k = 0; k < N; k++) {
      const t = flames.get(k), m = W.flames[k];
      if (t === undefined) { m.visible = false; continue; }
      m.visible = true; const s = 0.7 + (t / FLAME_T) * 0.35 + Math.sin(clock * 40 + k) * 0.05; m.scale.set(s, 0.6 + t / FLAME_T, s);
    }
    W.flameM.uniforms.uOff.value.set((clock * 0.7) % 1, (clock * 0.9) % 1);
    // poderes flotando
    W.pups.forEach((m) => (m.visible = false));
    pups.filter((u) => u.t <= 0).forEach((u, n) => {
      const m = W.pups[n]; if (!m) return;
      m.visible = true; m.material = W.puMats[u.type];
      m.position.set(cxOf(u.k % GW), TS * 0.45 + Math.sin(clock * 4 + u.k) * 0.12, czOf((u.k / GW) | 0));
      m.rotation.set(0.3, clock * 2 + u.k, 0);
    });
    // personajes a pie
    for (const p of game.players) {
      if (p.death || p.empty) { if (p.empty) { p.mesh.root.visible = false; p.mesh.sh.visible = false; } continue; }
      p.onGround = true;
      drawWalker(p, dt, CHAR_SCALE, 0);
    }
  },

  onLocalHit(p) { p.wantBomb = true; },

  drawScore(p, x, y) {
    if (p.empty) { txt('--', x, y, 16, '#555b6e', 'center', COL.goldShadow); return; }
    const nn = game.target || 2, w = 7, gap = 3, tot = nn * w + (nn - 1) * gap;
    for (let k = 0; k < nn; k++) {
      const bx = Math.round(x - tot / 2 + k * (w + gap));
      rect(bx, y + 3, w, w, '#000');
      rect(bx + 1, y + 4, w - 2, w - 2, k < p.score ? COL.gold : '#2a3150');
    }
  },
  hud(hw, st) {
    const R = game.round; if (!R) return;
    if (st === 'count') txt(`RONDA ${R.n}`, hw / 2, 80, 16, COL.teal, 'center');
    if (st === 'count' && R.n === 1 && game.mode !== 'demo') {
      txt('¡ROMPÉ CAJONES Y VOLÁ A LOS DEMÁS!', hw / 2, 170, 8, '#ffb31a', 'center');
      txt(input.device === 'gamepad' ? 'A = PONER PETARDO' : 'ESPACIO = PONER PETARDO', hw / 2, 184, 8, COL.dim, 'center');
    }
    if (st === 'play' && R.over) {
      const w = R.winner, p = game.players[w];
      const t = w < 0 ? '¡NADIE!' : w === game.me && game.mode !== 'local' ? '¡GANASTE LA RONDA!' : `RONDA PARA ${p.name || CHARS[w].name}`;
      rect(0, 96, hw, 34, 'rgba(4,6,14,.7)');
      txt(t, hw / 2, 104, 16, w < 0 ? COL.white : CHARS[w].col, 'center', COL.goldShadow);
    }
    if (st === 'play' && !R.over && game.elapsed > RAIN_AT && game.elapsed < RAIN_AT + 2.5 && ((game.clock * 3) | 0) % 2) txt('¡LLUVIA DE PETARDOS!', hw / 2, 64, 8, COL.red, 'center');
    // tus poderes (arriba al medio): petardos, fuego y velocidad
    const me = game.players[game.me];
    if ((st === 'play' || st === 'count') && me && me.alive && !me.empty && game.mode !== 'local') {
      const lv = Math.round((me.speed - SPEED0) / SPEED_UP) + 1, x0 = Math.round(hw / 2 - 45), y0 = 5;
      rect(x0 - 4, y0 - 2, 98, 14, 'rgba(4,6,14,.65)');
      rect(x0 + 1, y0 + 2, 6, 6, '#15151c'); rect(x0 + 2, y0 + 1, 4, 8, '#15151c'); rect(x0 + 5, y0, 2, 2, '#ffd23a');
      txt(String(me.maxBombs), x0 + 10, y0 + 1, 8, COL.white);
      rect(x0 + 33, y0 + 3, 6, 6, '#ff7a14'); rect(x0 + 34, y0 + 1, 4, 3, '#ffd23a'); rect(x0 + 35, y0 + 5, 2, 3, '#fff27a');
      txt(String(me.range), x0 + 42, y0 + 1, 8, COL.white);
      rect(x0 + 64, y0 + 5, 7, 3, '#fff'); rect(x0 + 65, y0 + 2, 3, 4, '#fff'); rect(x0 + 61, y0 + 2, 2, 1, '#39d98a'); rect(x0 + 60, y0 + 5, 2, 1, '#39d98a');
      txt(String(lv), x0 + 75, y0 + 1, 8, COL.white);
    }
    if (st === 'play' && me && !me.alive && !me.empty && !R.over && game.mode !== 'local') txt('¡VOLASTE!', hw / 2, 196, 16, COL.red, 'center');
  },

  /* ---------- online (el anfitrión manda todo; el invitado manda para dónde va y cuándo pone un petardo) ---------- */
  snapshot() {
    const R = game.round;
    return {
      ro: [R.n, R.over ? 1 : 0, R.winner, Math.round(R.t * 10) / 10],
      g: G.join(''),
      p: game.players.map((p) => [r2(p.x), r2(p.z), r2(p.ang || 0), p.alive ? 1 : 0, p.score, p.maxBombs || 1, p.range || 2, r2(p.speed || SPEED0)]),
      b: bombs.map((b) => [b.id, b.k, r2(b.t)]),
      f: [...flames].map(([k, t]) => [k, r2(t)]),
      u: pups.map((u) => [u.k, u.type, r2(u.t)]),
    };
  },
  applySnap(A, Bs, f) {
    const ro = A.ro;
    game.round = { n: ro[0], over: !!ro[1], winner: ro[2], t: ro[3] };
    for (let k = 0; k < N; k++) G[k] = +A.g[k] || 0;
    game.players.forEach((p, i) => {
      const pa = A.p[i], pb = Bs.p[i];
      if (pa[3] && p.death) { p.death = null; resetPodVisual(p); }
      p.alive = !!pa[3]; p.score = pa[4]; p.maxBombs = pa[5]; p.range = pa[6]; p.speed = pa[7];
      if (!p.alive && !p.death && !p.empty) FX.blast(i);
      if (p.death || p.empty) return;
      const nx = pa[0] + (pb[0] - pa[0]) * f, nz = pa[1] + (pb[1] - pa[1]) * f;
      p.vx = (pb[0] - pa[0]) * 20; p.vz = (pb[1] - pa[1]) * 20;
      p.x = nx; p.z = nz; p.ang = lerpAng(pa[2], pb[2], f);
    });
    bombs = A.b.map(([id, k, t]) => ({ id, k, t, range: 2, owner: -1, age: 9 }));
    flames = new Map(A.f.map(([k, t]) => [k, t]));
    pups = A.u.map(([k, type, t]) => ({ k, type, t }));
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

register(petardos);
export default petardos;
