// Minijuego 2: EMPUJÓN. Todos arriba de una plataforma redonda sobre un abismo. Hay dos mapas que se van
// turnando por ronda: GLACIAR (un iceberg que patina, flotando arriba de un valle nevado; del cielo caen carámbanos
// que te dejan mareado un rato) y VOLCÁN (tierra con charcos de barro que
// resbalan, sobre la lava, y un volcán que tira bolas de fuego: empujan al caer y después ruedan hasta caerse).
// Las naves se mueven libres (patinan un poco, es hielo) y con el botón de golpe hacen una EMBESTIDA.
// Gana la ronda el último que queda arriba; gana la partida el primero que llega a N rondas.
// A los 14 s la plataforma empieza a achicarse para que nadie se quede quieto.
import * as THREE from 'three';
import { register } from './registry.js';
import { DIFFICULTIES, rnd, clamp } from '../config.js';
import { charOf } from '../chars.js';
import { game } from '../state.js';
import { scene, mat, add, scaleUV } from '../render/psx.js';
import { TX } from '../render/textures.js';
import { decorGlaciar, decorVolcan } from '../world/decor.js';
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
const ACC = 22;              // aceleración (en el hielo; en la tierra y el barro cambia, ver surface())
const MAXV = 7.2;            // velocidad máxima normal
const FRICTION = 2.0;        // cuánto frena sola (poco: es hielo)
const DASH_V = 15, DASH_T = 0.22, DASH_CD = 1.1;    // embestida
const BOUNCE = 0.85;         // rebote de los choques
const DASH_PUSH = 3.2;       // empujón extra de la embestida
const DASH_MASS = 2.2;       // la embestida "pesa" más
const HAZARD_AT = 10;         // desde cuándo caen bolas de fuego (volcán) y carámbanos (glaciar)
const SHRINK_AT = 14, SHRINK_RATE = 0.11, WARN_AT = 11;
const ROUND_PAUSE = 2.4;     // segundos de festejo entre rondas
const SPAWN_R = 5.3;
const SPAWN = [[0, 1], [1, 0], [0, -1], [-1, 0]];   // lugar 0 abajo en la pantalla

const r2 = (v) => Math.round(v * 100) / 100;
const lerpAng = (a, b, f) => { let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return a + d * f; };

/* ---------- mapas ---------- */
// barro del volcán: círculos en coordenadas de la plataforma (se achican con ella)
const MUD = [[-3.5, 2.0, 1.9], [3.8, -2.6, 2.1], [1.2, 4.9, 1.5], [-4.6, -4.2, 1.6], [5.9, 3.0, 1.3], [-0.6, -0.4, 1.1]];
const VOLC = { x: 2, y: -6, z: -30 };      // el cráter del volcán que tira bolas de fuego
const MAPS = [
  { name: 'GLACIAR', extra: 'HIELO Y CARÁMBANOS QUE MAREAN', fog: { col: 0xc8d8ea, near: 32, far: 118 }, fall: 'abyss' },
  { name: 'VOLCÁN', extra: 'BARRO Y BOLAS DE FUEGO', fog: { col: 0x2a0c08, near: 45, far: 115 }, fall: 'lava' },
];
const S = { map: 0, fb: [], fbT: 5, fbId: 1, ic: [], icT: 5 };
const onMud = (x, z) => { const k = (game.radius || R0) / R0; return MUD.some(([mx, mz, r]) => Math.hypot(x - mx * k, z - mz * k) < r * k); };
// cómo agarra el piso: hielo (patina), tierra (agarra bien) o barro (patina más que el hielo)
function surface(p) {
  if (S.map === 0) return { acc: ACC, fr: FRICTION };
  if (onMud(p.x, p.z)) return { acc: 11, fr: 0.7 };
  // en la tierra se frena rápido caminando, pero si te empujaron fuerte (vas más rápido que caminando) patinás un rato
  return { acc: 34, fr: Math.hypot(p.vx, p.vz) > MAXV * 1.05 ? 1.3 : 4.8 };
}

/* ---------- mundo ---------- */
const W = { grp: null, maps: [], fb: [], marks: [], ic: [], icMarks: [] };

function buildMap(mi) {
  const grp = new THREE.Group(); grp.visible = false; W.grp.add(grp);
  const plat = new THREE.Group(); grp.add(plat);
  const M = { g: grp, plat, rocks: [] };
  if (mi === 0) {
    // GLACIAR: hielo liso con la marca del centro
    add(scaleUV(new THREE.CylinderGeometry(R0, R0, 0.8, 28, 1), 4, 1), mat({ map: TX.ice }), 0, -0.4, 0, plat);
    const ring = new THREE.RingGeometry(1.4, 1.75, 20); ring.rotateX(-Math.PI / 2);
    add(ring, mat({ color: 0x5aa8c0, unlit: true }), 0, 0.02, 0, plat);
    const dot = new THREE.CircleGeometry(0.35, 12); dot.rotateX(-Math.PI / 2);
    add(dot, mat({ color: 0x5aa8c0, unlit: true }), 0, 0.02, 0, plat);
    M.rimM = mat({ map: TX.lights, unlit: true }); M.rimBase = 0xffffff;
    add(scaleUV(new THREE.CylinderGeometry(R0 + 0.03, R0 + 0.03, 0.28, 28, 1, true), 26, 1), M.rimM, 0, -0.16, 0, plat);
    // abajo: un iceberg desparejo (no un cono liso), con carámbanos en el borde
    const bg = new THREE.CylinderGeometry(R0 * 0.99, 1.4, 11, 18, 7, true), bp = bg.attributes.position;
    for (let i = 0; i < bp.count; i++) {
      const x = bp.getX(i), y = bp.getY(i), z = bp.getZ(i), a = Math.atan2(x, z), depth = (5.5 - y) / 11;   // 0 arriba, 1 en la punta
      if (depth < 0.02) continue;                                            // el borde de arriba queda redondo (pega con la plataforma)
      const f = 1 + (Math.sin(a * 3 + y * 0.7) * 0.16 + Math.sin(a * 7 + 2) * 0.1 + Math.cos(a * 5 - y) * 0.08) * Math.min(1, depth * 3);
      bp.setX(i, x * f); bp.setZ(i, z * f); bp.setY(i, y + Math.sin(a * 4 + y) * 0.6 * depth);
    }
    bg.computeVertexNormals();
    add(scaleUV(bg, 5, 3), mat({ map: TX.ice, color: 0xc8eaf8 }), 0, -0.8 - 5.5, 0, plat);
    const chunkM = mat({ map: TX.ice, color: 0xb0dcf0 });
    [[0.6, 5.2, -3.4, 2.2], [2.3, 4.4, -5.6, 1.7], [4.0, 5.6, -2.6, 1.9], [5.3, 3.8, -6.8, 1.4], [1.4, 2.4, -8.6, 1.3]].forEach(([a, r, y, sz]) => {
      const c = add(new THREE.DodecahedronGeometry(sz, 0), chunkM, Math.sin(a) * r, y, Math.cos(a) * r, plat); c.rotation.set(a, a * 2, 0); c.scale.set(1, 1.4, 1);
    });
    const icM = mat({ map: TX.ice, color: 0xe0f6ff });
    for (let k = 0; k < 26; k++) {
      const a = (k / 26) * Math.PI * 2, r = R0 * 0.96, h = rnd(0.7, 1.6);
      const c = add(new THREE.ConeGeometry(0.22, h, 4), icM, Math.sin(a) * r, -0.8 - h / 2, Math.cos(a) * r, plat); c.rotation.x = Math.PI;
    }
    // bolas de hielo flotando alrededor (dan vueltas despacio y suben y bajan)
    const im = mat({ map: TX.ice, color: 0xd8f2ff });
    for (let k = 0; k < 10; k++) {
      const a = (k / 10) * Math.PI * 2 + rnd(-0.2, 0.2), rr = rnd(14, 19);
      const m = add(new THREE.DodecahedronGeometry(rnd(0.8, 1.8), 0), im, Math.sin(a) * rr, rnd(-9, -3), Math.cos(a) * rr, grp);
      m.rotation.set(rnd(0, 3), rnd(0, 3), 0);
      M.rocks.push({ m, y: m.position.y, ph: rnd(0, 6), a, rr, sp: rnd(0.04, 0.09) * (k % 2 ? 1 : -1) });
    }
    decorGlaciar(grp);
  } else {
    // VOLCÁN: tierra con charcos de barro, sobre un cono de roca
    add(scaleUV(new THREE.CylinderGeometry(R0, R0 * 0.97, 0.8, 28, 1, true), 8, 1), mat({ map: TX.dirt, color: 0xc8b0a0 }), 0, -0.4, 0, plat);
    const topG = scaleUV(new THREE.RingGeometry(0.01, R0, 28, 6), 5, 5); topG.rotateX(-Math.PI / 2);
    add(topG, mat({ map: TX.dirt }), 0, 0, 0, plat);
    const mudM = mat({ map: TX.mud });
    MUD.forEach(([x, z, r], k) => {
      const g = new THREE.CircleGeometry(r, 12); g.rotateX(-Math.PI / 2);
      const pos = g.attributes.position;                        // borde desparejo
      for (let i = 1; i < pos.count; i++) { const f = 1 + Math.sin(i * 2.3 + k) * 0.08; pos.setX(i, pos.getX(i) * f); pos.setZ(i, pos.getZ(i) * f); }
      add(g, mudM, x, 0.02, z, plat);
    });
    M.rimM = mat({ color: 0xff8a2a, unlit: true }); M.rimBase = 0xff8a2a;
    add(new THREE.CylinderGeometry(R0 + 0.03, R0 + 0.03, 0.12, 28, 1, true), M.rimM, 0, -0.06, 0, plat);
    const cone = scaleUV(new THREE.ConeGeometry(R0 * 0.98, 6.5, 14, 2, true), 5, 2); cone.rotateX(Math.PI);
    add(cone, mat({ map: TX.rock, color: 0x9a8f9e }), 0, -4.05, 0, plat);
    M.lavaM = mat({ map: TX.magma, unlit: true, color: 0xffffff });
    const lava = scaleUV(new THREE.PlaneGeometry(220, 220, 16, 16), 34); lava.rotateX(-Math.PI / 2);
    add(lava, M.lavaM, 0, -26, 0, grp);
    const rockM = mat({ map: TX.rock, color: 0xb0a4b6 });
    for (let k = 0; k < 10; k++) {
      const a = (k / 10) * Math.PI * 2 + rnd(-0.2, 0.2), rr = rnd(15, 25);
      const m = add(new THREE.DodecahedronGeometry(rnd(0.9, 2.2), 0), rockM, Math.sin(a) * rr, rnd(-9, -3), Math.cos(a) * rr, grp);
      m.rotation.set(rnd(0, 3), rnd(0, 3), 0);
      M.rocks.push({ m, y: m.position.y, ph: rnd(0, 6) });
    }
    decorVolcan(grp, plat, R0, VOLC);
  }
  W.maps.push(M);
}

function buildWorld() {
  const grp = new THREE.Group(); grp.visible = false; scene.add(grp); W.grp = grp;
  MAPS.forEach((_, i) => buildMap(i));
  // bolas de fuego y la marca de dónde van a caer
  const fm = mat({ map: TX.fire, unlit: true }); W.fbM = fm;
  const coreM = mat({ color: 0xffe070, unlit: true });
  for (let n = 0; n < 5; n++) {
    const g = new THREE.Group(); g.visible = false; grp.add(g);
    add(new THREE.DodecahedronGeometry(FB_R, 1), fm, 0, 0, 0, g);
    add(new THREE.DodecahedronGeometry(FB_R * 0.6, 0), coreM, 0, 0, 0, g).scale.setScalar(1.25);
    W.fb.push(g);
    const rg = new THREE.RingGeometry(FB_HIT * 0.8, FB_HIT, 20); rg.rotateX(-Math.PI / 2);
    const mk = add(rg, mat({ color: 0xff3a1a, unlit: true }), 0, 0.05, 0, grp); mk.visible = false;
    W.marks.push(mk);
    // carámbano que cae y su círculo de aviso
    const ic = new THREE.Group(); ic.visible = false; grp.add(ic);
    const cg = new THREE.ConeGeometry(0.6, 3.2, 6); cg.rotateX(Math.PI);
    add(cg, mat({ map: TX.ice, color: 0x7ab8e0 }), 0, 1.6, 0, ic);
    add(new THREE.CylinderGeometry(0.75, 0.62, 0.35, 6), mat({ map: TX.snow }), 0, 3.3, 0, ic);           // un pedazo de nieve arriba
    add(new THREE.ConeGeometry(0.22, 1.2, 5), mat({ color: 0xffffff, unlit: true }), 0.25, 2.4, 0.2, ic);
    W.ic.push(ic);
    const ig = new THREE.RingGeometry(IC_R * 0.78, IC_R, 20); ig.rotateX(-Math.PI / 2);
    const im2 = add(ig, mat({ color: 0xff3a1a, unlit: true }), 0, 0.05, 0, grp); im2.visible = false;
    W.icMarks.push(im2);
  }
}

/* ---------- bolas de fuego (mapa volcán) ---------- */
const FB_R = 1.0, FB_HIT = 2.5, FB_FLY = 1.6, FB_MASS = 2.6;
function spawnFireball() {
  const alive = game.players.filter((p) => p.alive && !p.empty);
  const r = game.radius * 0.85;
  let tx, tz;
  if (alive.length && Math.random() < 0.65) {                // casi siempre cerca de alguien
    const q = alive[(Math.random() * alive.length) | 0];
    tx = q.x + rnd(-1.5, 1.5); tz = q.z + rnd(-1.5, 1.5);
  } else { const a = rnd(0, Math.PI * 2), d = rnd(0, r); tx = Math.sin(a) * d; tz = Math.cos(a) * d; }
  const l = Math.hypot(tx, tz); if (l > r) { tx *= r / l; tz *= r / l; }
  S.fb.push({ id: S.fbId++, st: 0, u: 0, x: VOLC.x, y: VOLC.y, z: VOLC.z, tx, tz, vx: 0, vz: 0, vy: 0 });
  FX.snd('fireball');
}
/* ---------- carámbanos (mapa glaciar): caen del cielo y marean ---------- */
const IC_R = 1.35, IC_WARN = 1.5, IC_STUN = 1.7;
function stepIcicles(dt, R) {
  if (S.map !== 0) { S.ic = []; return; }
  if (!R.over && game.elapsed > HAZARD_AT) {
    S.icT -= dt;
    if (S.icT <= 0 && S.ic.length < 3) {
      const alive = game.players.filter((p) => p.alive && !p.empty), r = game.radius * 0.85;
      let tx, tz;
      if (alive.length && Math.random() < 0.65) { const q = alive[(Math.random() * alive.length) | 0]; tx = q.x + rnd(-1.2, 1.2); tz = q.z + rnd(-1.2, 1.2); }
      else { const a = rnd(0, Math.PI * 2), d = rnd(0, r); tx = Math.sin(a) * d; tz = Math.cos(a) * d; }
      const l = Math.hypot(tx, tz); if (l > r) { tx *= r / l; tz *= r / l; }
      S.ic.push({ id: S.fbId++, x: tx, z: tz, u: 0 });
      S.icT = rnd(2.2, 3.8) * (game.radius < R0 - 2 ? 0.75 : 1);
    }
  }
  for (const c of S.ic) {
    c.u += dt / IC_WARN;
    if (c.u < 1) continue;
    // ¡pum!: el que esté abajo queda mareado (y lo corre un poquito)
    for (const p of game.players) {
      if (!p.alive || p.empty || p.death) continue;
      const dx = p.x - c.x, dz = p.z - c.z, d = Math.hypot(dx, dz);
      if (d > IC_R + PR * 0.5) continue;
      p.stunT = IC_STUN; p.dashT = 0;
      const nx = d > 0.01 ? dx / d : 1, nz = d > 0.01 ? dz / d : 0; p.vx += nx * 3; p.vz += nz * 3;
      FX.sparkle(p.x, 1.6, p.z, P.YELLOW, 6);
    }
    FX.icicle(c.x, c.z);
  }
  S.ic = S.ic.filter((c) => c.u < 1);
}

function stepFireballs(dt, R) {
  if (S.map !== 1) { S.fb = []; return; }
  if (!R.over && game.elapsed > HAZARD_AT) {
    S.fbT -= dt;
    if (S.fbT <= 0 && S.fb.length < 4) { spawnFireball(); S.fbT = rnd(2.0, 3.6) * (game.radius < R0 - 2 ? 0.75 : 1); }
  }
  for (const b of S.fb) {
    if (b.st === 0) {                                            // volando desde el cráter
      b.u += dt / FB_FLY;
      const u = Math.min(1, b.u);
      b.x = VOLC.x + (b.tx - VOLC.x) * u; b.z = VOLC.z + (b.tz - VOLC.z) * u;
      b.y = VOLC.y + (FB_R - VOLC.y) * u + 16 * 4 * u * (1 - u);
      if (b.u >= 1) {
        // cae: empuja a los que estén cerca y sigue rodando para el mismo lado
        b.st = 1; b.y = FB_R;
        for (const p of game.players) {
          if (!p.alive || p.empty || p.death) continue;
          const dx = p.x - b.x, dz = p.z - b.z, d = Math.hypot(dx, dz);
          if (d > FB_HIT) continue;
          const f = 4 + 9 * (1 - d / FB_HIT), nx = d > 0.01 ? dx / d : 1, nz = d > 0.01 ? dz / d : 0;
          p.vx += nx * f; p.vz += nz * f;
        }
        FX.boom(b.x, b.z);
        let hx = b.tx - VOLC.x, hz = b.tz - VOLC.z; const hl = Math.hypot(hx, hz) || 1;
        b.vx = (hx / hl) * 5 + rnd(-1, 1); b.vz = (hz / hl) * 5 + rnd(-1, 1);
      }
    } else if (b.st === 1) {                                     // rodando por la plataforma
      const d = Math.hypot(b.x, b.z) || 1;
      b.vx += (b.x / d) * 1.4 * dt; b.vz += (b.z / d) * 1.4 * dt;   // la plataforma es un poquito curva: siempre termina cayéndose
      b.x += b.vx * dt; b.z += b.vz * dt;
      for (const p of game.players) {
        if (!p.alive || p.empty || p.death) continue;
        const dx = p.x - b.x, dz = p.z - b.z, dd = Math.hypot(dx, dz), min = PR + FB_R * 0.8;
        if (dd >= min || dd < 1e-4) continue;
        const nx = dx / dd, nz = dz / dd, mp = p.dashT > 0 ? DASH_MASS : 1, ov = min - dd;
        p.x += nx * ov * (FB_MASS / (mp + FB_MASS)); p.z += nz * ov * (FB_MASS / (mp + FB_MASS));
        b.x -= nx * ov * (mp / (mp + FB_MASS)); b.z -= nz * ov * (mp / (mp + FB_MASS));
        const rv = (p.vx - b.vx) * nx + (p.vz - b.vz) * nz;
        if (rv < 0) {
          const j = (-(1 + 0.9) * rv) / (1 / mp + 1 / FB_MASS);
          p.vx += (j / mp) * nx; p.vz += (j / mp) * nz; b.vx -= (j / FB_MASS) * nx; b.vz -= (j / FB_MASS) * nz;
          if (-rv > 2) FX.bump((p.x + b.x) / 2, (p.z + b.z) / 2, true);
        }
      }
      if (Math.hypot(b.x, b.z) > game.radius + 0.2) { b.st = 2; b.vy = 0; }
    } else {                                                     // se cae de la plataforma
      b.vy -= 22 * dt; b.y += b.vy * dt; b.x += b.vx * dt * 0.6; b.z += b.vz * dt * 0.6;
    }
  }
  S.fb = S.fb.filter((b) => b.y > -28);
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
  S.fb = []; S.fbT = 1; S.ic = []; S.icT = 1.6;       // (cuentan recién desde HAZARD_AT)
  game.players.forEach((p) => { p.stunT = 0; });
}

let warned = false;
function pickMap(first) {
  if (game.online === 'guest') return;
  S.map = first ? (Math.random() * MAPS.length) | 0 : (S.map + 1) % MAPS.length;   // se van turnando
}
function startRound() {
  game.round = { n: game.round.n + 1, over: false, winner: -1, t: 0 };
  pickMap(false);
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
    // se viene una bola de fuego justo acá: los más vivos se corren (hacia el centro, no hacia el borde)
    const hz = S.fb.filter((b) => b.st === 0 && b.u > 0.35).map((b) => [b.tx, b.tz, FB_HIT]).concat(S.ic.filter((c) => c.u > 0.2).map((c) => [c.x, c.z, IC_R]));
    for (const [hx, hzz, hr] of hz) {
      if (Math.random() > D.lead) continue;
      const dx = p.x - hx, dz = p.z - hzz, dd = Math.hypot(dx, dz);
      if (dd > hr + 0.8) continue;
      const ox = dx / (dd || 1) - p.x / (d0 || 1) * 0.8, oz = dz / (dd || 1) - p.z / (d0 || 1) * 0.8, ol = Math.hypot(ox, oz) || 1;
      tx = p.x + (ox / ol) * 3.5; tz = p.z + (oz / ol) * 3.5; p.aiDash = false;
      const tl = Math.hypot(tx, tz), safe = r - margin * 0.8; if (tl > safe) { tx *= safe / tl; tz *= safe / tl; }
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
  const sf = surface(p);
  p.vx += wx * sf.acc * dt; p.vz += wz * sf.acc * dt;
  const fr = Math.exp(-sf.fr * dt); p.vx *= fr; p.vz *= fr;
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
      burst(Math.sin(a) * r, 0, Math.cos(a) * r, { mat: S.map === 1 ? P.DEBRIS : P.WHITE, n: 2, sp: 1.5, up: [0.5, 2], life: [0.4, 0.8], size: 0.8 });
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
    if (p.stunT > 0) { p.stunT -= dt; wx = 0; wz = 0; dash = false; }   // mareado: no maneja (y sigue patinando)
    drive(p, wx, wz, dash, dt);
  }
  for (let i = 0; i < alive.length; i++) for (let j = i + 1; j < alive.length; j++) collide(alive[i], alive[j]);
  stepFireballs(dt, R);
  stepIcicles(dt, R);

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
  howTo: 'EMBESTIDA',
  points: { label: 'RONDAS PARA GANAR', values: [1, 2, 3], key: 'rounds', demo: 2 },
  cam: { pos: new THREE.Vector3(0, 24, 21), look: new THREE.Vector3(0, 0, -1.2), rotate: false, orbit: true },
  fog: () => MAPS[S.map].fog,
  humanOut: false,
  tense: () => game.elapsed > SHRINK_AT,        // música más rápida cuando se achica la plataforma
  thumbSteps: 90,
  thumbCam: { pos: new THREE.Vector3(0, 17, 16), look: new THREE.Vector3(0, -1, -0.5) },

  build: buildWorld,
  show(on) { if (W.grp) W.grp.visible = on; },
  _S: S,

  reset() {
    game.round = { n: 1, over: false, winner: -1, t: 0 };
    game.players.forEach((p) => { p.score = 0; });
    pickMap(true);
    placeAll();
    sendT = 0;
  },
  step,

  visuals(dt) {
    const clock = game.clock;
    const k = (game.radius || R0) / R0, M = W.maps[S.map];
    W.maps.forEach((m, i) => { m.g.visible = i === S.map; });
    game.fallStyle = MAPS[S.map].fall;                // la caída: al vacío helado o a la lava
    M.plat.scale.set(k, 1, k);
    // luces del borde: rojas titilando cuando la plataforma se está por achicar o se achica
    const danger = game.elapsed > WARN_AT && !(game.round && game.round.over);
    M.rimM.uniforms.uColor.value.set(danger && ((clock * (game.elapsed > SHRINK_AT ? 4 : 10)) | 0) % 2 ? 0xff3a2a : M.rimBase);
    if (M.lavaM) M.lavaM.uniforms.uOff.value.set((clock * 0.01) % 1, (clock * 0.006) % 1);
    M.rocks.forEach((r) => {
      r.m.position.y = r.y + Math.sin(clock * 0.7 + r.ph) * 0.4; r.m.rotation.y += dt * 0.1;
      if (r.sp) { r.a += r.sp * dt; r.m.position.x = Math.sin(r.a) * r.rr; r.m.position.z = Math.cos(r.a) * r.rr; r.m.rotation.x += dt * 0.2; }
    });
    // carámbanos: círculo celeste que titila y el carámbano que baja cada vez más rápido
    W.ic.forEach((g, n) => {
      const c = S.ic[n], mk = W.icMarks[n];
      g.visible = mk.visible = !!c;
      if (!c) return;
      mk.position.set(c.x, 0.05, c.z);
      mk.material.uniforms.uColor.value.setHex(((clock * (c.u > 0.6 ? 16 : 8)) | 0) % 2 ? 0xff3a1a : 0xffe14a);   // rojo y amarillo: se ve bien sobre el hielo
      mk.scale.setScalar(1.2 - Math.min(1, c.u) * 0.2);
      const f = clamp((c.u - 0.35) / 0.65, 0, 1);
      g.visible = c.u > 0.35;
      g.position.set(c.x, 15 * (1 - f * f), c.z); g.rotation.y = clock;
    });
    // bolas de fuego: la bola (volando, rodando o cayendo) y la marca roja donde va a caer
    W.fbM.uniforms.uOff.value.set((clock * 0.7) % 1, (clock * 0.9) % 1);
    W.fb.forEach((g, n) => {
      const b = S.fb[n], mk = W.marks[n];
      g.visible = !!b; mk.visible = !!b && b.st === 0;
      if (!b) return;
      g.position.set(b.x, b.y, b.z); g.rotation.set(clock * 4 + n, clock * 3, 0);
      if (b.st === 1) { g.rotation.x = clock * 8; }
      if (mk.visible) {
        mk.position.set(b.tx, 0.05, b.tz);
        const u = Math.min(1, b.u), fast = u > 0.6 ? 16 : 8;
        mk.material.uniforms.uColor.value.setHex(((clock * fast) | 0) % 2 ? 0xff3a1a : 0xffc050);
        mk.scale.setScalar(1.25 - u * 0.25);
      }
      if (Math.random() < 0.5) burst(b.x, b.y, b.z, { mat: Math.random() < 0.5 ? P.ORANGE : P.YELLOW, n: 1, sp: 1, up: [0.5, 2], life: [0.2, 0.4], size: 0.9 });
    });
    for (const p of game.players) {
      const m = p.mesh;
      if (p.death || p.empty) { if (p.empty) { m.root.visible = false; m.sh.visible = false; } continue; }
      m.root.visible = true;
      m.root.position.set(p.x, Math.sin(clock * 6 + p.i) * 0.05, p.z);
      m.root.scale.setScalar(POD_SCALE);
      m.root.rotation.set(0, p.ang || 0, 0);
      const e = p.dashT > 0 ? 0.9 : 0; m.hullM.uniforms.uEmissive.value.setRGB(e, e * 0.9, e * 0.6);
      if (p.stunT > 0) {                               // mareado: se bambolea y le dan vueltas estrellitas
        m.root.rotation.z = Math.sin(clock * 16) * 0.2; m.root.rotation.x = Math.cos(clock * 13) * 0.12;
        if (Math.random() < 0.35) { const a = clock * 9 + Math.random(); burst(p.x + Math.cos(a) * 0.8, 2.6, p.z + Math.sin(a) * 0.8, { mat: P.YELLOW, n: 1, sp: 0.2, up: [0.1, 0.4], life: [0.2, 0.35], g: 0, size: 0.7 }); }
      }
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
    if (st === 'count') {
      txt(`RONDA ${R.n}`, hw / 2, 80, 16, COL.teal, 'center');
      txt(`MAPA: ${MAPS[S.map].name}`, hw / 2, 48, 8, COL.white, 'center');
      txt(MAPS[S.map].extra, hw / 2, 60, 8, '#ffb31a', 'center');
    }
    if (st === 'count' && R.n === 1 && game.mode !== 'demo') {
      txt('¡TIRALOS DE LA PLATAFORMA!', hw / 2, 170, 8, '#ffb31a', 'center');
      txt('GOLPE = EMBESTIDA', hw / 2, 184, 8, COL.dim, 'center');
    }
    if (st === 'play' && R.over) {
      const w = R.winner, p = game.players[w];
      const t = w < 0 ? '¡NADIE!' : w === game.me && game.mode !== 'local' ? '¡GANASTE LA RONDA!' : `RONDA PARA ${p.name || charOf(w).name}`;
      rect(0, 96, hw, 34, 'rgba(4,6,14,.7)');
      txt(t, hw / 2, 104, 16, w < 0 ? COL.white : charOf(w).col, 'center', COL.goldShadow);
    }
    const me = game.players[game.me];
    if (st === 'play' && me && !me.alive && !R.over && game.mode !== 'local') txt('¡TE CAÍSTE!', hw / 2, 196, 16, COL.red, 'center');
    if (st === 'play' && me && me.alive && me.stunT > 0 && game.mode !== 'local') txt('¡MAREADO!', hw / 2, 196, 16, '#ffe14a', 'center', COL.goldShadow);
    if (st === 'play' && game.elapsed > WARN_AT && game.elapsed < SHRINK_AT + 1.5 && !R.over && ((game.clock * 3) | 0) % 2) {
      txt('¡LA PLATAFORMA SE ACHICA!', hw / 2, 64, 8, COL.red, 'center');
    }
  },

  /* ---------- online (el anfitrión manda todo; el invitado solo manda para dónde va) ---------- */
  snapshot() {
    const R = game.round;
    return {
      r: r2(game.radius), ro: [R.n, R.over ? 1 : 0, R.winner, Math.round(R.t * 10) / 10], m: S.map,
      fb: S.fb.map((b) => [b.id, b.st, r2(b.x), r2(b.y), r2(b.z), r2(b.tx), r2(b.tz), r2(b.u)]),
      ic: S.ic.map((c) => [c.id, r2(c.x), r2(c.z), r2(c.u)]),
      p: game.players.map((p) => [r2(p.x), r2(p.z), r2(p.ang || 0), p.alive ? 1 : 0, p.dashT > 0 ? 1 : 0, p.score, p.stunT > 0 ? 1 : 0]),
    };
  },
  applySnap(A, B, f) {
    game.radius = A.r + (B.r - A.r) * f;
    S.map = B.m || 0;
    S.ic = (B.ic || []).map(([id, x, z, u]) => { const a = (A.ic || []).find((q) => q[0] === id); return { id, x, z, u: a ? a[3] + (u - a[3]) * f : u }; });
    S.fb = (B.fb || []).map(([id, st, x, y, z, tx, tz, u]) => {
      const a = (A.fb || []).find((q) => q[0] === id && q[1] === st);
      return a ? { id, st, x: a[2] + (x - a[2]) * f, y: a[3] + (y - a[3]) * f, z: a[4] + (z - a[4]) * f, tx, tz, u: a[7] + (u - a[7]) * f } : { id, st, x, y, z, tx, tz, u };
    });
    const ro = A.ro;
    game.round = { n: ro[0], over: !!ro[1], winner: ro[2], t: ro[3] };
    game.players.forEach((p, i) => {
      const pa = A.p[i], pb = B.p[i];
      if (pa[3] && p.death) { p.death = null; resetPodVisual(p); }          // empezó otra ronda
      p.alive = !!pa[3]; p.score = pa[5]; p.dashT = pa[4] ? 0.1 : 0; p.stunT = pb[6] ? 0.2 : 0;
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
