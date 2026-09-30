// Minijuego 3: BOMBARDEO (a pie). Del cielo caen cajas de metal sobre una grilla de baldosas.
// Antes de cada caída aparece la sombra de la caja en la baldosa (o la pila) y la caja baja flotando desde arriba.
// Las cajas QUEDAN donde caen y se apilan: hay que ir saltando de pila en pila (se sube de a una caja),
// no quedarse encerrado en un pozo y que no te caiga ninguna encima.
// Sin naves: los personajes van caminando y el botón de golpe es SALTAR.
// A los 25 s el piso se vuelve lava y empieza a subir: hay que estar cada vez más arriba.
// Cajas especiales: RESORTE (verde; si caés encima te lanza unas tres cajas de alto)
// y EXPLOSIVA (roja; al caer vuela la caja de arriba de las 4 pilas de al lado).
// Gana la ronda el último que queda; gana la partida el primero que llega a N rondas.
import * as THREE from 'three';
import { register } from './registry.js';
import { DIFFICULTIES, rnd, clamp } from '../config.js';
import { charOf } from '../chars.js';
import { game } from '../state.js';
import { scene, mat, add, scaleUV, camera } from '../render/psx.js';
import { TX } from '../render/textures.js';
import { decorBombardeo } from '../world/decor.js';
import { input } from '../input.js';
import { FX } from '../game/fx.js';
import { burst, P } from '../fx/particles.js';
import { SFX } from '../audio.js';
import { resetPodVisual } from '../world/pods.js';
import { drawWalker } from '../world/walker.js';
import { camMove } from '../game/controls.js';
import { sendInput } from '../net/room.js';
import { txt, rect, COL } from '../ui/draw.js';

/* ---------- medidas ---------- */
const GN = 8;                // baldosas por lado
const TS = 2.0;              // tamaño de cada baldosa (y de cada caja)
const HALF = (GN * TS) / 2;
const CS = TS - 0.04;        // la caja, apenas más chica para que se vean las juntas
const LAVA_AT = 25;          // segundos hasta que empieza a subir la lava
const LAVA_WARN = 20;        // cuándo se avisa
const LAVA_V = 0.12, LAVA_ACC = 0.005;             // velocidad con la que sube (y cuánto acelera)
const HOVER_HIGH = 9, HOVER_LOW = 4.5;              // la caja aparece flotando a esta altura (sobre la pila) y baja hasta acá antes de caer
const FALL_T = 0.4;          // cuánto tarda en caer (al final del aviso)
const PR = 0.55;             // radio del personaje
const CHAR_SCALE = 0.86;     // tamaño del personaje a pie
const BODY_H = 1.7;          // altura del personaje (para ver si la caja lo agarra)
const ACC = 60, MAXV = 6.2, FRICTION = 12;         // caminando: arranca y frena rápido
const GRAV = 34, JUMP_V = 13.2;                    // salta un poco más de una caja (sube ~2.55)
const STEP = 0.3;            // escalón que se sube caminando (sin saltar)
const COYOTE = 0.1, BUFFER = 0.14;                 // perdón al saltar justo al borde / apretar un poquito antes
const ROUND_PAUSE = 2.4;
const SPAWN = [[-0.5, 2.5], [2.5, -0.5], [0.5, -2.5], [-2.5, 0.5]];   // en baldosas desde el centro; lugar 0 abajo

const r2 = (v) => Math.round(v * 100) / 100;
const r1 = (v) => Math.round(v * 10) / 10;
const lerpAng = (a, b, f) => { let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return a + d * f; };
const cx = (k) => ((k % GN) - (GN - 1) / 2) * TS;
const cz = (k) => (((k / GN) | 0) - (GN - 1) / 2) * TS;
const col = (x) => clamp(Math.floor(x / TS + GN / 2), 0, GN - 1);
const tileOf = (x, z) => col(z) * GN + col(x);
const NB = (k) => { const c = k % GN, r = (k / GN) | 0, o = []; if (c > 0) o.push(k - 1); if (c < GN - 1) o.push(k + 1); if (r > 0) o.push(k - GN); if (r < GN - 1) o.push(k + GN); return o; };

/* ---------- estado ---------- */
const H = new Array(GN * GN).fill(0);     // cajas apiladas en cada baldosa
const top = (k) => H[k] * TS;             // altura de la superficie de esa baldosa
const TT = new Array(GN * GN).fill('n');  // qué caja quedó arriba de cada pila: n normal · s resorte
const SPRING_V = JUMP_V * 1.55;
let drops = [];                           // cajas en camino: { id, k, t, warn }
let nextId = 1;
const B = { waveT: 2.0, n: 0, lava: -1 };          // lava: altura de la lava (-1 = todavía no)

/* ---------- mundo ---------- */
const W = { grp: null, shadows: [], falling: [], stack: [], coils: [], stackGeo: null, stackMat: null, lampM: null, lava: null, lavaM: null, camY: 0 };

function buildWorld() {
  const grp = new THREE.Group(); grp.visible = false; scene.add(grp); W.grp = grp;
  add(scaleUV(new THREE.BoxGeometry(GN * TS + 1.6, 1.2, GN * TS + 1.6), 6, 1), mat({ map: TX.metal, color: 0x6a7288 }), 0, -1.1, 0, grp);
  const out = scaleUV(new THREE.PlaneGeometry(140, 140, 10, 10), 24); out.rotateX(-Math.PI / 2);
  add(out, mat({ map: TX.outer }), 0, -1.7, 0, grp);
  const tg = scaleUV(new THREE.BoxGeometry(TS - 0.08, 0.5, TS - 0.08), 1, 1);
  const sg = new THREE.PlaneGeometry(CS, CS); sg.rotateX(-Math.PI / 2);
  // baldosas: la plataforma de aterrizaje en las 4 del medio, alguna rejilla y marcas amarillas en las esquinas
  const padG = scaleUV(new THREE.BoxGeometry(TS - 0.08, 0.5, TS - 0.08), 0.5, 0.5), mid = GN / 2;
  const hsh = (k) => { const v = Math.sin(k * 91.7 + 13.1) * 43758.5453; return v - Math.floor(v); };
  for (let k = 0; k < GN * GN; k++) {
    const c = k % GN, r = (k / GN) | 0, dark = (c + r) % 2 === 1, tint = dark ? 0xc4cad8 : 0xffffff;
    if ((c === mid - 1 || c === mid) && (r === mid - 1 || r === mid)) {
      const m = mat({ map: TX.pad }); m.uniforms.uOff.value.set(c === mid ? 0.5 : 0, r === mid - 1 ? 0.5 : 0);
      add(padG, m, cx(k), -0.25, cz(k), grp);
    } else {
      const corner = (c === 0 || c === GN - 1) && (r === 0 || r === GN - 1);
      const tex = corner ? TX.tileWarn : hsh(k) < 0.14 ? TX.tileVent : TX.tile;
      const t = add(tg, mat({ map: tex, color: tint }), cx(k), -0.25, cz(k), grp);
      if (corner) t.rotation.y = c === 0 ? (r === 0 ? 0 : Math.PI / 2) : (r === 0 ? -Math.PI / 2 : Math.PI);   // la marca mira hacia la esquina
    }
    const sh = add(sg, mat({ color: 0x000000, unlit: true }), cx(k), 0.02, cz(k), grp); sh.visible = false; W.shadows.push(sh);
  }
  // baranda alrededor (no te podés caer de la grilla)
  const hz = mat({ map: TX.hazard, unlit: true }), len = GN * TS + 1.6;
  [[0, HALF + 0.55, 0], [0, -HALF - 0.55, 0], [HALF + 0.55, 0, Math.PI / 2], [-HALF - 0.55, 0, Math.PI / 2]].forEach(([x, z, r]) => {
    add(scaleUV(new THREE.BoxGeometry(len, 0.55, 0.5), len / 1.2, 1), hz, x, 0.2, z, grp).rotation.y = r;
  });
  const postM = mat({ map: TX.metal, color: 0x8890a6 }), lampM = mat({ color: 0xff5a2a, unlit: true }); W.lampM = lampM;
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => {
    add(new THREE.CylinderGeometry(0.22, 0.28, 3.4, 6), postM, sx * (HALF + 0.9), 1.2, sz * (HALF + 0.9), grp);
    add(new THREE.BoxGeometry(0.5, 0.5, 0.5), lampM, sx * (HALF + 0.9), 3.1, sz * (HALF + 0.9), grp);
  });
  const bm = mat({ map: TX.block });
  [[-12, -4, 2], [-11.5, 3, 1], [12, -2, 3], [11.8, 5, 1], [-6, -12.5, 2], [7, -12, 1], [-13, 10, 1], [13, 11, 2]].forEach(([x, z, n]) => {
    for (let h = 0; h < n; h++) add(new THREE.BoxGeometry(CS, CS, CS), bm, x + rnd(-0.2, 0.2), -1.7 + CS / 2 + h * CS, z + rnd(-0.2, 0.2), grp).rotation.y = rnd(-0.3, 0.3);
  });
  // cajas: las que caen y las apiladas (mallas reutilizables)
  const bg = new THREE.BoxGeometry(CS, CS, CS), fm = mat({ map: TX.block });
  W.fallMats = { n: fm, s: mat({ map: TX.block, color: 0x7dff8a }), x: mat({ map: TX.block, color: 0xff6a5a, emissive: 0x401000 }) };
  for (let n = 0; n < 40; n++) { const b = add(bg, fm, 0, -20, 0, grp); b.visible = false; W.falling.push(b); }
  // resortes: una tapa verde con un espiral, arriba de la pila
  W.springMat = W.fallMats.s;
  const coilM = mat({ color: 0xd8dce6 }), padM = mat({ map: TX.metal, color: 0xb8c0d0 });
  for (let n = 0; n < 24; n++) {
    const sg = new THREE.Group(); sg.visible = false; grp.add(sg);
    for (let i = 0; i < 3; i++) { const t = new THREE.TorusGeometry(0.42, 0.07, 4, 10); t.rotateX(Math.PI / 2); add(t, coilM, 0, 0.12 + i * 0.16, 0, sg); }
    add(new THREE.BoxGeometry(CS * 0.7, 0.14, CS * 0.7), padM, 0, 0.56, 0, sg);
    W.coils.push(sg);
  }
  W.stackGeo = bg; W.stackMat = mat({ map: TX.block, color: 0xd6dae6 });
  for (let n = 0; n < GN * GN * 3; n++) newStackBox();
  // lava (sube desde el piso)
  W.lavaM = mat({ map: TX.magma, unlit: true });
  const lg = scaleUV(new THREE.PlaneGeometry(GN * TS + 1.2, GN * TS + 1.2, 8, 8), 6); lg.rotateX(-Math.PI / 2);
  W.lava = add(lg, W.lavaM, 0, -5, 0, grp); W.lava.visible = false;
  decorBombardeo(grp, HALF);
}
function newStackBox() { const b = add(W.stackGeo, W.stackMat, 0, -20, 0, W.grp); b.visible = false; W.stack.push(b); return b; }

/* ---------- rondas ---------- */
const demo = () => game.state === 'title' || game.state === 'menu';

function placeAll() {
  H.fill(0); TT.fill('n'); drops = []; B.waveT = 2.0; B.n = 0; B.lava = -1; B.lavaWarned = false;
  game.players.forEach((p) => {
    resetPodVisual(p);
    p.death = null;
    p.alive = !p.empty;
    const [sx, sz] = SPAWN[p.i];
    Object.assign(p, { x: sx * TS, z: sz * TS, fy: 0, vy: 0, vx: 0, vz: 0, onGround: true, coyote: 0, jumpBuf: 0, wantJump: false,
      walk: 0, cd: 0, thinkT: 0, aiTx: sx * TS, aiTz: sz * TS, aiNext: -1, stuckT: 0, burned: false });
    p.ang = Math.atan2(-p.x, -p.z);
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

/* ---------- tandas de cajas (piezas estilo Tetris) ---------- */
const PIECES = {
  uno: [[0, 0]],
  dos: [[0, 0], [1, 0]],
  tres: [[0, 0], [1, 0], [2, 0]],
  ele: [[0, 0], [0, 1], [1, 1]],
  cuadrado: [[0, 0], [1, 0], [0, 1], [1, 1]],
  te: [[0, 0], [1, 0], [2, 0], [1, 1]],
  palo: [[0, 0], [1, 0], [2, 0], [3, 0]],
  ese: [[0, 0], [1, 0], [1, 1], [2, 1]],
};
const busy = (k) => drops.some((d) => d.k === k);
function drop(k, warn, kind) {
  if (k < 0 || k >= GN * GN || busy(k)) return false;
  drops.push({ id: nextId++, k, t: 0, warn, kind: kind || 'n' });
  return true;
}
// de vez en cuando sale una caja especial (cada vez más seguido)
function boxKind() {
  const e = game.elapsed, r = Math.random();
  if (e > 8 && r < 0.09) return 's';
  if (e > 14 && r < 0.16) return 'x';
  return 'n';
}
function piece(name, c0, r0, rot, warn) {
  for (const [a, b] of PIECES[name]) {
    const c = c0 + (rot ? b : a), r = r0 + (rot ? a : b);
    if (c >= 0 && c < GN && r >= 0 && r < GN) drop(r * GN + c, warn, boxKind());
  }
}
function wave() {
  const e = game.elapsed;
  const warn = Math.max(1.1, 1.8 - e * 0.012);
  const alive = game.players.filter((p) => p.alive && !p.empty);
  const early = ['uno', 'dos', 'uno', 'ele'];
  const later = ['dos', 'tres', 'ele', 'cuadrado', 'te', 'ese'];
  const late = ['tres', 'cuadrado', 'te', 'palo', 'ese', 'ele'];
  const pool = e < 10 ? early : e < 25 ? later : late;
  const count = e < 12 ? 2 : e < 30 ? (Math.random() < 0.5 ? 2 : 3) : e < 50 ? 3 : 4;
  for (let n = 0; n < count; n++) {
    const name = pool[(Math.random() * pool.length) | 0];
    piece(name, (Math.random() * GN) | 0, (Math.random() * GN) | 0, Math.random() < 0.5, warn * rnd(0.95, 1.15));
  }
  // de vez en cuando, una caja justo arriba de cada uno (para que nadie se quede quieto)
  if (e > 8 && Math.random() < Math.min(0.4, 0.18 + e * 0.004)) alive.forEach((p) => drop(tileOf(p.x, p.z), warn * 1.15));
  B.n++;
  FX.alert();
  return Math.max(1.5, 2.8 - e * 0.02);
}

/* ---------- movimiento a pie ---------- */
// las pilas más altas que tus pies (más un escaloncito) son paredes: el personaje (círculo) no las atraviesa
function pushOutOfTile(p, k) {
  const h = TS / 2, bx = cx(k), bz = cz(k);
  const qx = clamp(p.x, bx - h, bx + h), qz = clamp(p.z, bz - h, bz + h);
  const dx = p.x - qx, dz = p.z - qz, d = Math.hypot(dx, dz);
  if (d >= PR) return;
  if (d < 1e-4) {
    // quedó adentro (le cayó una caja al lado): se lo saca por el lado más cercano
    const ox = p.x - bx, oz = p.z - bz;
    if (Math.abs(ox) > Math.abs(oz)) { p.x = bx + Math.sign(ox || 1) * (h + PR); p.vx = 0; } else { p.z = bz + Math.sign(oz || 1) * (h + PR); p.vz = 0; }
    return;
  }
  const nx = dx / d, nz = dz / d, ov = PR - d;
  p.x += nx * ov; p.z += nz * ov;
  const vn = p.vx * nx + p.vz * nz;
  if (vn < 0) { p.vx -= vn * nx; p.vz -= vn * nz; }
}

// Devuelve a quién pisoteó (-1 si a nadie)
function move(p, wx, wz, jump, dt) {
  if (p.stunT > 0) { p.stunT -= dt; wx = 0; wz = 0; jump = false; }       // mareado: no se mueve
  const l = Math.hypot(wx, wz);
  if (l > 1) { wx /= l; wz /= l; }
  // caminar: velocidad objetivo, agarre fuerte en el piso y un poco menos en el aire
  const grip = p.onGround ? 1 : 0.55;
  const k = Math.min(1, (ACC * grip * dt) / MAXV);
  p.vx += (wx * MAXV - p.vx) * k; p.vz += (wz * MAXV - p.vz) * k;
  if (l < 0.1 && p.onGround) { const fr = Math.exp(-FRICTION * dt); p.vx *= fr; p.vz *= fr; }
  if (Math.hypot(p.vx, p.vz) > 0.5) p.ang = lerpAng(p.ang, Math.atan2(p.vx, p.vz), Math.min(1, dt * 14));
  // salto (con un perdón chiquito al borde y al apretar un poco antes de tocar el piso)
  if (jump) p.jumpBuf = BUFFER;
  if (p.jumpBuf > 0) p.jumpBuf -= dt;
  if (p.onGround) p.coyote = COYOTE; else if (p.coyote > 0) p.coyote -= dt;
  if (p.jumpBuf > 0 && p.coyote > 0) { p.vy = JUMP_V; p.onGround = false; p.coyote = 0; p.jumpBuf = 0; p.jN = (p.jN || 0) + 1; FX.jump(p.i); }
  // horizontal y paredes de las pilas
  p.x += p.vx * dt; p.z += p.vz * dt;
  const lim = HALF - PR;
  p.x = clamp(p.x, -lim, lim); p.z = clamp(p.z, -lim, lim);
  const c0 = col(p.x), r0 = col(p.z);
  for (let r = r0 - 1; r <= r0 + 1; r++) for (let c = c0 - 1; c <= c0 + 1; c++) {
    if (r < 0 || r >= GN || c < 0 || c >= GN) continue;
    const kk = r * GN + c;
    if (top(kk) > p.fy + STEP) pushOutOfTile(p, kk);
  }
  // vertical
  const ground = top(tileOf(p.x, p.z));
  let stomped = -1;
  const springHere = TT[tileOf(p.x, p.z)] === 's' && ground > 0;
  if (p.vy <= 0 && p.fy <= ground + 0.02 && p.fy >= ground - STEP) {
    if (!p.onGround && p.vy < -8) SFX.land();
    p.fy = ground; p.vy = 0; p.onGround = true;
    if (springHere) { p.vy = SPRING_V; p.onGround = false; p.coyote = 0; p.fy = ground + 0.03; p.sprN = (p.sprN || 0) + 1; FX.spring(p.i); }
  } else {
    const prev = p.fy;
    p.vy -= GRAV * dt; p.fy += p.vy * dt; p.onGround = false;
    if (p.vy < 0) stomped = stompCheck(p, prev);
    if (stomped < 0 && p.fy <= ground) { if (p.vy < -8) SFX.land(); p.fy = ground; p.vy = 0; p.onGround = true; }
  }
  return stomped;
}

// Pisotón: cayendo sobre la cabeza de otro, rebotás (y el otro queda mareado)
function stompCheck(p, prevFy) {
  for (const q of game.players) {
    if (q === p || !q.alive || q.empty || q.death) continue;
    const head = (q.fy || 0) + BODY_H;
    if (Math.abs(q.x - p.x) < PR * 1.5 && Math.abs(q.z - p.z) < PR * 1.5 && prevFy >= head - 0.12 && p.fy <= head + 0.12) {
      p.fy = head; p.vy = JUMP_V * 0.72; p.onGround = false; p.coyote = 0;
      return q.i;
    }
  }
  return -1;
}


function separate(a, b) {
  if (Math.abs(a.fy - b.fy) > BODY_H) return;
  const dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz), min = PR * 2;
  if (d >= min || d < 1e-4) return;
  const nx = dx / d, nz = dz / d, ov = (min - d) / 2;
  a.x -= nx * ov; a.z -= nz * ov; b.x += nx * ov; b.z += nz * ov;
}

/* ---------- IA ---------- */
// Los bots ven cada aviso un ratito después de que aparece (según la dificultad) y piensan por baldosas:
// a cuáles pueden llegar (subiendo de a una caja), cuáles están por recibir una caja y cuáles son pozos.
function aiInput(p, dt) {
  const D = DIFFICULTIES[game.difficulty] || DIFFICULTIES.intermedio;
  const react = D.think[1] * 1.8;
  const here = tileOf(p.x, p.z);
  const warnT = (k) => { let t = Infinity; for (const o of drops) if (o.k === k && o.t >= react) t = Math.min(t, o.warn - o.t); return t; };
  p.thinkT -= dt;
  if (p.thinkT <= 0) {
    p.thinkT = rnd(D.think[0], D.think[1]) * 1.3;
    // recorrido por baldosas (hasta 4 pasos): se puede ir a una vecina si está a lo sumo una caja más alta
    const dist = new Array(GN * GN).fill(-1), first = new Array(GN * GN).fill(-1);
    dist[here] = 0; const q = [here];
    while (q.length) {
      const k = q.shift();
      if (dist[k] >= 4) continue;
      for (const n of NB(k)) {
        if (dist[n] >= 0 || H[n] - H[k] > (TT[k] === 's' && H[k] > 0 ? 3 : 1)) continue;
        dist[n] = dist[k] + 1; first[n] = k === here ? n : first[k]; q.push(n);
      }
    }
    let best = here, bs = -1e9;
    for (let k = 0; k < GN * GN; k++) {
      if (dist[k] < 0) continue;
      const eta = dist[k] * 0.42 + 0.25;
      const w = warnT(k);
      let sc = H[k] * 1.1 - dist[k] * 0.7;                         // mejor arriba, y cerca
      const lv = B.lava >= 0 ? B.lava : game.elapsed > LAVA_WARN - 3 ? 0 : -1;   // cuando se acerca la lava, a subirse
      if (lv >= 0 && top(k) < lv + 0.8 + eta * 0.4) sc -= 40;    // la lava llega ahí
      if (w < eta + 0.5) sc -= 60;                                 // le cae antes de llegar o mientras está ahí
      else if (w < Infinity) sc -= 4;                              // le cae después: mejor no
      if (dist[k] > 0 && warnT(first[k]) < 0.75) sc -= 30;         // el primer paso es peligroso
      const exits = NB(k).filter((n) => H[n] - H[k] <= 1).length;
      if (exits <= 1) sc -= 5;                                     // pozo: una caja más y quedás encerrado
      sc -= NB(k).filter((n) => H[n] - H[k] >= 2).length * 0.8;
      if (k === here) sc += 0.6;                                   // no cambiar por cambiar
      sc += rnd(-1, 1) * D.err * 0.35;
      if (sc > bs) { bs = sc; best = k; }
    }
    p.aiNext = best === here ? here : first[best];
    const jitter = best === here ? 0.3 : 0;
    p.aiTx = cx(p.aiNext) + rnd(-jitter, jitter); p.aiTz = cz(p.aiNext) + rnd(-jitter, jitter);
  }
  let dx = p.aiTx - p.x, dz = p.aiTz - p.z;
  const l = Math.hypot(dx, dz);
  if (l > 0.001) { dx /= l; dz /= l; }
  // saltar: si la baldosa a la que va es más alta y ya está cerca; o si se trabó contra algo
  let jump = false;
  const nk = p.aiNext >= 0 ? p.aiNext : here;
  if (nk !== here && top(nk) > p.fy + STEP && p.onGround && l < TS * 0.95) jump = true;
  if (l > 0.4 && Math.hypot(p.vx, p.vz) < 0.8 && p.onGround) { p.stuckT += dt; if (p.stuckT > 0.25) { jump = true; p.stuckT = 0; } } else p.stuckT = 0;
  const k = Math.min(1, l / 0.35) * Math.min(1, D.spd / 11);
  return { x: dx * k, z: dz * k, jump };
}

/* ---------- simulación ---------- */
function step(dt) {
  const st = game.state;
  if (st === 'count') {
    const before = Math.ceil(game.countT); game.countT -= dt; const after = Math.ceil(game.countT);
    if (after !== before) { if (after > 0) { if (after <= 3) FX.tick(); } else { FX.go(); game.state = 'play'; } }
    return;
  }
  if (st !== 'play' && !demo()) return;
  const R = game.round;
  if (!R.over) {
    game.elapsed += dt;
    B.waveT -= dt;
    if (B.waveT <= 0) B.waveT = wave();
    if (game.elapsed > LAVA_WARN && !B.lavaWarned) { B.lavaWarned = true; FX.shrinkWarn(); }
    if (game.elapsed > LAVA_AT) { const t = game.elapsed - LAVA_AT; B.lava = Math.max(B.lava, 0) + (LAVA_V + LAVA_ACC * t) * dt; }
  }

  const alive = game.players.filter((p) => p.alive && !p.empty);
  for (const p of alive) {
    let wx = 0, wz = 0, jump = false;
    if (p.ctrl === 'local') {
      const c = input.ctl[p.pad || 'all'];
      [wx, wz] = camMove(c.x, c.y);
      jump = p.wantJump; p.wantJump = false;
    } else if (p.ctrl === 'remote') {
      const n = p.net;
      // el invitado simula su propio personaje (sin demora) y manda cómo quedó: acá se usa tal cual
      if (n && n.st) {
        const s = n.st;
        Object.assign(p, { x: s.x, z: s.z, fy: s.fy, vy: s.vy, onGround: !!s.og, vx: s.vx, vz: s.vz, ang: s.a });
        if ((s.jN || 0) > (p.lastJN || 0)) { p.lastJN = s.jN; SFX.jump(); }
        if ((s.pN || 0) > (p.lastPN || 0)) { p.lastPN = s.pN; FX.spring(p.i); }
        if ((s.sN || 0) > (p.lastSN || 0)) { p.lastSN = s.sN; if (game.players[s.sI] && game.players[s.sI].alive) FX.stun(s.sI); }
        if (p.stunT > 0) p.stunT -= dt;
        continue;
      }
      if (n) { wx = n.x || 0; wz = -(n.y || 0); jump = n.hit; n.hit = false; }
    } else if (p.ctrl === 'ai') {
      const a = aiInput(p, dt); wx = a.x; wz = a.z; jump = a.jump;
    }
    const s = move(p, wx, wz, jump, dt);
    if (s >= 0) FX.stun(s);
  }
  for (let i = 0; i < alive.length; i++) for (let j = i + 1; j < alive.length; j++) separate(alive[i], alive[j]);

  // cajas: cuando termina el aviso, cae y se suma a la pila
  for (const o of drops) {
    o.t += dt;
    if (o.t < o.warn) continue;
    o.done = true;
    const k = o.k, oldTop = top(k), newTop = oldTop + TS;
    H[k] += 1; TT[k] = o.kind === 's' ? 's' : 'n';
    FX.slam(cx(k), cz(k), oldTop);
    for (const p of alive) {
      if (!p.alive || R.over) continue;
      if (Math.abs(p.x - cx(k)) >= TS / 2 || Math.abs(p.z - cz(k)) >= TS / 2) continue;
      if (p.fy >= newTop - 0.35) { if (p.fy < newTop) { p.fy = newTop; p.vy = Math.max(0, p.vy); } continue; }   // saltó justo: queda arriba
      if (p.fy + BODY_H > oldTop) {
        p.alive = false; game.elimOrder.push(p.i);
        FX.crush(p.i);
        if (p.i === game.me && game.mode === 'solo') game.timeScale = 1.5;
      }
    }
  }
  // las explosivas: después de aplastar lo que tenían abajo, vuelan (ella y la caja de arriba de las 4 pilas vecinas)
  for (const o of drops) {
    if (!o.done || o.kind !== 'x') continue;
    const k = o.k;
    H[k] = Math.max(0, H[k] - 1); TT[k] = 'n';
    for (const n of NB(k)) if (H[n] > 0 && !drops.some((d) => d.k === n && !d.done)) { H[n]--; TT[n] = 'n'; }
    FX.tnt(cx(k), top(k), cz(k));
  }
  drops = drops.filter((o) => !o.done);
  // la lava quema a los que tocan
  if (B.lava > 0 && !R.over) for (const p of alive) {
    if (p.alive && p.fy < B.lava - 0.05) { p.alive = false; game.elimOrder.push(p.i); FX.burn(p.i, B.lava); if (p.i === game.me && game.mode === 'solo') game.timeScale = 1.5; }
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

const V3 = new THREE.Vector3();
let guestRound = -1;

/* ---------- el minijuego ---------- */
let sendT = 0;
const CAM_POS = new THREE.Vector3(0, 29, 12.5), CAM_LOOK = new THREE.Vector3(0, 0, -0.6);   // bastante desde arriba: las pilas tapan menos
const bombardeo = {
  id: 'bombardeo',
  name: 'BOMBARDEO',
  mapName: 'HANGAR',
  desc: 'SALTÁ ARRIBA DE LAS CAJAS QUE CAEN',
  howTo: 'SALTAR',
  points: { label: 'RONDAS PARA GANAR', values: [1, 2, 3], key: 'rounds', demo: 2 },
  cam: { pos: CAM_POS.clone(), look: CAM_LOOK.clone(), rotate: false, orbit: true },
  fog: { col: 0x05070f, near: 45, far: 115 },
  humanOut: false,
  tense: () => B.lava > 0,                      // música más rápida con la lava
  tagY: 2.6, tagFeet: true, markMe: true,     // nombre arriba de la cabeza (a la altura de la pila donde está parado)
  thumbSteps: 1500,
  thumbCam: { pos: new THREE.Vector3(0, 19, 13), look: new THREE.Vector3(0, 0, -0.6) },

  rules(K) { return ['¡QUE NO TE CAIGA UNA CAJA ENCIMA!', `${K} = SALTAR · SUBITE A LAS PILAS`, 'CAYENDO SOBRE OTRO LO DEJÁS MAREADO', 'A LOS 25 S EL PISO ES LAVA Y SUBE', `GANA EL PRIMERO EN GANAR ${game.target || 2} RONDAS`]; },
  build: buildWorld,
  show(on) { if (W.grp) W.grp.visible = on; },

  reset() {
    game.round = { n: 1, over: false, winner: -1, t: 0 };
    game.players.forEach((p) => { p.score = 0; });
    placeAll();
    W.camY = 0;
    sendT = 0;
  },
  step,

  visuals(dt) {
    const clock = game.clock;
    // pilas
    // (las cajas tapadas por la lava no se dibujan)
    let n = 0;
    const h0 = B.lava > 0 ? Math.max(0, Math.floor(B.lava / TS) - 1) : 0;
    for (let k = 0; k < GN * GN; k++) for (let h = h0; h < H[k]; h++) {
      const b = n < W.stack.length ? W.stack[n] : newStackBox(); n++;
      b.visible = true; b.position.set(cx(k), h * TS + CS / 2, cz(k));
      b.material = h === H[k] - 1 && TT[k] === 's' ? W.springMat : W.stackMat;      // el resorte es la caja verde de arriba
    }
    for (; n < W.stack.length; n++) W.stack[n].visible = false;
    let cn = 0;
    for (let k = 0; k < GN * GN && cn < W.coils.length; k++) {
      if (TT[k] !== 's' || H[k] <= 0) continue;
      const c = W.coils[cn++]; c.visible = true;
      const bounce = game.players.some((p) => p.alive && tileOf(p.x, p.z) === k && p.vy > 5 && (p.fy || 0) - top(k) < 1.2);
      c.position.set(cx(k), top(k), cz(k)); c.scale.set(1, bounce ? 1.5 : 1, 1);
    }
    for (; cn < W.coils.length; cn++) W.coils[cn].visible = false;
    W.lava.visible = B.lava > 0; W.lava.position.y = Math.max(0.01, B.lava);
    W.lavaM.uniforms.uOff.value.set((clock * 0.03) % 1, (clock * 0.02) % 1);
    // avisos y cajas cayendo
    // aviso: la sombra de la caja en el piso (cada vez más grande y oscura) y la caja que baja flotando desde arriba
    W.shadows.forEach((s) => (s.visible = false));
    let m = 0;
    for (const o of drops) {
      const k = o.k, y0 = top(k), f = clamp(o.t / o.warn, 0, 1), left = o.warn - o.t;
      const sh = W.shadows[k]; sh.visible = true; sh.position.y = y0 + 0.03;
      const s = 0.35 + f * 0.6; sh.scale.set(s, 1, s);
      const g = 0.02 + 0.2 * (1 - f); sh.material.uniforms.uColor.value.setRGB(g, g, g * 1.1);
      if (m >= W.falling.length) continue;
      let y;
      if (left < FALL_T) { const u = 1 - left / FALL_T; y = y0 + CS / 2 + HOVER_LOW * (1 - u * u); }       // la caída
      else if (f > 0.3) { const u = (o.t - o.warn * 0.3) / (o.warn * 0.7 - FALL_T); y = y0 + CS / 2 + HOVER_HIGH + (HOVER_LOW - HOVER_HIGH) * clamp(u, 0, 1); }
      else continue;
      const b = W.falling[m++]; b.visible = true; b.material = W.fallMats[o.kind || 'n'];
      b.position.set(cx(k), y, cz(k));
      b.rotation.set(Math.sin(clock * 5 + k) * 0.04, 0, Math.cos(clock * 4 + k) * 0.04);
    }
    for (; m < W.falling.length; m++) W.falling[m].visible = false;
    W.lampM.uniforms.uColor.value.set(drops.length && ((clock * 6) | 0) % 2 ? 0xff5a2a : 0x5a2010);
    // la cámara sube de a poco cuando las pilas crecen
    let sum = 0;
    for (let k = 0; k < GN * GN; k++) sum += H[k];
    // sigue a los que siguen vivos (que suelen estar arriba de todo) sin despegarse mucho del resto
    let fy = 0, na = 0;
    for (const p of game.players) if (p.alive && !p.empty) { fy += p.fy || 0; na++; }
    const want = Math.max((sum / (GN * GN)) * TS * 0.8, B.lava + 1, na ? (fy / na) * 0.85 : 0);
    W.camY += (want - W.camY) * Math.min(1, dt * 1.5);
    if (!bombardeo.freeCam) {                   // (freeCam: para mirar el decorado en las pruebas)
      bombardeo.cam.pos.set(CAM_POS.x, CAM_POS.y + W.camY, CAM_POS.z);
      bombardeo.cam.look.set(CAM_LOOK.x, CAM_LOOK.y + W.camY * 0.9, CAM_LOOK.z);
    }
    // personajes a pie
    for (const p of game.players) {
      if (p.death || p.empty) { if (p.empty) { p.mesh.root.visible = false; p.mesh.sh.visible = false; } continue; }
      drawWalker(p, dt, CHAR_SCALE, top(tileOf(p.x, p.z)));
      // mareado: estrellitas dando vueltas arriba de la cabeza
      if (p.stunT > 0) {
        p.mesh.root.rotation.z = Math.sin(clock * 18) * 0.15;
        if (Math.random() < 0.35) { const a = clock * 10 + Math.random(); burst(p.x + Math.cos(a) * 0.6, (p.fy || 0) + 2.1, p.z + Math.sin(a) * 0.6, { mat: P.YELLOW, n: 1, sp: 0.2, up: [0.1, 0.4], life: [0.2, 0.35], g: 0, size: 0.7 }); }
      }
    }
  },

  onLocalHit(p) { p.wantJump = true; },

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
      txt('¡QUE NO TE CAIGA UNA CAJA ENCIMA!', hw / 2, 170, 8, '#ffb31a', 'center');
      txt(input.device === 'gamepad' ? 'A = SALTAR · SUBITE A LAS PILAS' : 'ESPACIO = SALTAR · SUBITE A LAS PILAS', hw / 2, 184, 8, COL.dim, 'center');
    }
    if (st === 'play' && R.over) {
      const w = R.winner, p = game.players[w];
      const t = w < 0 ? '¡NADIE!' : w === game.me && game.mode !== 'local' ? '¡GANASTE LA RONDA!' : `RONDA PARA ${p.name || charOf(w).name}`;
      rect(0, 96, hw, 34, 'rgba(4,6,14,.7)');
      txt(t, hw / 2, 104, 16, w < 0 ? COL.white : charOf(w).col, 'center', COL.goldShadow);
    }
    if (st === 'play' && !R.over && game.elapsed > LAVA_WARN && game.elapsed < LAVA_AT + 2.5 && ((game.clock * 3) | 0) % 2) {
      txt('¡EL PISO ES LAVA! ¡SUBÍ!', hw / 2, 64, 8, COL.red, 'center');
    }
    const me = game.players[game.me];
    if (st === 'play' && me && !me.alive && !me.empty && !R.over && game.mode !== 'local') txt(me.burned ? '¡TE QUEMASTE!' : '¡APLASTADO!', hw / 2, 196, 16, COL.red, 'center');
  },

  /* ---------- online (el anfitrión manda todo; el invitado solo manda para dónde va y si saltó) ---------- */
  snapshot() {
    const R = game.round;
    return {
      ro: [R.n, R.over ? 1 : 0, R.winner, Math.round(R.t * 10) / 10],
      p: game.players.map((p) => [r2(p.x), r2(p.z), r2(p.fy || 0), r2(p.ang || 0), p.alive ? 1 : 0, p.onGround ? 1 : 0, p.score, r2(p.vx || 0), r2(p.vz || 0), p.stunT > 0 ? 1 : 0]),
      h: H.join(','), tt: TT.join(''), lv: r2(B.lava), el: r1(game.elapsed),
      d: drops.map((o) => [o.id, o.k, r2(o.t), r2(o.warn), o.kind]),
    };
  },
  applySnap(A, Bs, f) {
    const ro = A.ro;
    game.round = { n: ro[0], over: !!ro[1], winner: ro[2], t: ro[3] };
    const hs = A.h.split(',');
    for (let k = 0; k < GN * GN; k++) TT[k] = (A.tt && A.tt[k]) || 'n';
    for (let k = 0; k < GN * GN; k++) H[k] = +hs[k] || 0;
    B.lava = A.lv + ((Bs.lv || A.lv) - A.lv) * f;
    const newRound = ro[0] !== guestRound; guestRound = ro[0];
    game.players.forEach((p, i) => {
      const pa = A.p[i], pb = Bs.p[i];
      if (pa[4] && p.death) { p.death = null; resetPodVisual(p); }
      const mine = i === game.me && !!pa[4] && !p.death && !newRound;
      if (mine) { p.alive = true; p.score = pa[6]; return; }      // tu personaje lo movés vos
      p.alive = !!pa[4]; p.score = pa[6]; p.onGround = !!pa[5]; p.vx = pa[7]; p.vz = pa[8];
      if (i !== game.me) p.stunT = pa[9] ? Math.max(p.stunT || 0, 0.2) : 0;
      if (newRound && i === game.me) { p.fy = pa[2]; p.vy = 0; p.stunT = 0; }
      if (!p.alive && !p.death && !p.empty) { p.fy = pa[2]; if (B.lava > 0 && p.fy < B.lava) FX.burn(i, B.lava); else FX.crush(i); }
      if (p.death || p.empty) return;
      p.x = pa[0] + (pb[0] - pa[0]) * f; p.z = pa[1] + (pb[1] - pa[1]) * f; p.fy = pa[2] + (pb[2] - pa[2]) * f;
      p.ang = lerpAng(pa[3], pb[3], f);
    });
    drops = A.d.map(([id, k, t, warn, kind]) => {
      const b = Bs.d.find((q) => q[0] === id);
      return { id, k, t: b ? t + (b[2] - t) * f : t, warn, kind: kind || 'n' };
    });
  },
  // El invitado simula su propio personaje acá mismo (responde al instante) y le manda al anfitrión cómo quedó
  guestLocal(rdt, hits) {
    const me = game.players[game.me];
    const c = input.ctl.all, [wx, wz] = camMove(c.x, c.y);
    if (me && me.alive && !me.empty && !me.death) {
      const playing = game.state === 'play' && !(game.round && game.round.over);
      const jump = playing && me.wantJump; me.wantJump = false;
      const s = move(me, playing ? wx : 0, playing ? wz : 0, jump, Math.min(rdt, 1 / 30));
      if (s >= 0) { me.sN = (me.sN || 0) + 1; me.sI = s; }
    }
    sendT -= rdt;
    if (sendT > 0) return;
    sendT = 1 / 30;
    const st = me && me.alive ? { x: r2(me.x), z: r2(me.z), fy: r2(me.fy || 0), vy: r2(me.vy || 0), og: me.onGround ? 1 : 0,
      vx: r2(me.vx || 0), vz: r2(me.vz || 0), a: r2(me.ang || 0), jN: me.jN || 0, sN: me.sN || 0, sI: me.sI || 0, pN: me.sprN || 0 } : null;
    sendInput({ x: Math.round(wx * 100) / 100, y: Math.round(-wz * 100) / 100, h: hits, st });
  },
  guestHitFx(me) { me.wantJump = true; },
};

register(bombardeo);
export default bombardeo;
