// La isla del Rey de la colina: costa irregular, tres colinas distintas (el Morro, la Mesa y el Peñón),
// un puente colgante entre el Morro y la Mesa, un muelle que sale al mar y cosas en la playa que estorban
// (palmeras, rocas, un bote, barriles). Acá está la forma (para la física) y el armado (para verla).
import * as THREE from 'three';
import { mat, add, scaleUV } from '../render/psx.js';
import { TX } from '../render/textures.js';
import { rnd } from '../config.js';
import * as P from './props.js';

export const WATER_Y = -0.9;
export const RMAX = 14.2;          // lo más lejos que llega la costa (para la ola)

/* ---------- la costa: radio según el ángulo (0 = hacia la cámara, crece hacia la derecha) ---------- */
const RIM = [10.4, 11.6, 12.6, 13.2, 12.0, 12.8, 11.2, 12.4, 13.6, 12.8, 11.4, 10.0];   // cada 30°
export function rim(a) {
  const u = (((a / (Math.PI * 2)) % 1) + 1) % 1 * RIM.length, i = Math.floor(u), f = u - i;
  const p0 = RIM[(i + RIM.length - 1) % RIM.length], p1 = RIM[i], p2 = RIM[(i + 1) % RIM.length], p3 = RIM[(i + 2) % RIM.length];
  // Catmull-Rom: una costa suave que pasa por todos los puntos
  const r = 0.5 * (2 * p1 + (-p0 + p2) * f + (2 * p0 - 5 * p1 + 4 * p2 - p3) * f * f + (-p0 + 3 * p1 - 3 * p2 + p3) * f * f * f);
  return r + Math.sin(a * 7 + 1.3) * 0.25;
}
export const onIsland = (x, z, margin = 0) => Math.hypot(x, z) < rim(Math.atan2(x, z)) - margin;

/* ---------- colinas: escalones redondos corridos (de un lado son anchos, del otro angostos) ---------- */
// cada escalón: radio, altura de arriba y corrimiento respecto de la base
function hill(name, x, z, tiers) {
  const ts = tiers.map(([r, h, ox = 0, oz = 0]) => ({ r, h, x: x + ox, z: z + oz }));
  const t = ts[ts.length - 1];
  return { name, tiers: ts, x: t.x, z: t.z, r: t.r, h: t.h };   // x, z, r, h: la cima (donde se suma)
}
export const HILLS = [
  hill('MORRO', -5.2, -3.6, [[5.0, 0.8], [3.6, 1.6, -0.5, -0.6], [2.15, 2.4, -1.0, -1.2]]),
  hill('MESA', 5.3, -3.9, [[3.9, 0.85], [2.6, 1.7, 0.5, -0.3]]),
  hill('PEÑÓN', 3.3, 5.6, [[2.9, 0.8], [1.8, 1.6, 0.55, 0.5]]),
];

/* ---------- puente colgante (Morro, 2° escalón → Mesa, arriba) ---------- */
export const BRIDGE = { ax: -2.35, az: -4.05, ah: 1.6, bx: 3.1, bz: -4.2, bh: 1.7, w: 1.5, sag: 0.25 };
function bridgeAt(x, z) {
  const B = BRIDGE, dx = B.bx - B.ax, dz = B.bz - B.az, L2 = dx * dx + dz * dz;
  const t = ((x - B.ax) * dx + (z - B.az) * dz) / L2;
  if (t < 0 || t > 1) return -99;
  const px = B.ax + dx * t, pz = B.az + dz * t;
  if (Math.hypot(x - px, z - pz) > B.w / 2) return -99;
  return B.ah + (B.bh - B.ah) * t - Math.sin(t * Math.PI) * B.sag;
}

/* ---------- muelle (sale al mar por la izquierda, adelante) ---------- */
const PA = -0.9;                                  // ángulo del muelle
export const PIER = { a: PA, r0: rim(PA) - 1.6, len: 6.2, w: 1.7, h: 0.22 };
function pierAt(x, z) {
  const ux = Math.sin(PIER.a), uz = Math.cos(PIER.a);
  const s = x * ux + z * uz, lat = -x * uz + z * ux;
  if (s < PIER.r0 || s > PIER.r0 + PIER.len || Math.abs(lat) > PIER.w / 2) return -99;
  return PIER.h;
}
export const pierTip = () => { const s = PIER.r0 + PIER.len - 0.8; return [Math.sin(PIER.a) * s, Math.cos(PIER.a) * s]; };

/* ---------- cosas que estorban (círculos) ---------- */
export const OBST = [];
const PALMS = [[-9.4, 2.6, 1.0], [-3.2, 8.2, 0.9], [9.6, 1.4, 1.05], [0.6, -9.6, 1.0], [10.3, -6.6, 0.85], [-10.6, -6.2, 0.9], [7.3, 8.1, 0.8]];
const ROCKS = [[-6.8, 6.4, 0.8], [1.2, 1.6, 0.6], [11.0, 4.6, 0.9], [-1.4, -6.9, 0.7]];
PALMS.forEach(([x, z]) => OBST.push({ x, z, r: 0.38 }));
ROCKS.forEach(([x, z, s]) => OBST.push({ x, z, r: s * 0.85 }));
const BOAT = { x: 8.6, z: 4.4, a: 0.9 };
[-0.9, 0, 0.9].forEach((o) => OBST.push({ x: BOAT.x + Math.sin(BOAT.a) * o, z: BOAT.z + Math.cos(BOAT.a) * o, r: 0.62 }));
const BARRELS = [[-7.6, 7.2], [-8.3, 6.3]];
BARRELS.forEach(([x, z]) => OBST.push({ x, z, r: 0.45 }));
// columnas en ruinas en la cima del Morro (del lado de atrás, así no tapan)
const COLS = [-2.4, 2.5].map((a) => [HILLS[0].x + Math.sin(Math.PI + a * 0.35) * 1.75, HILLS[0].z + Math.cos(Math.PI + a * 0.35) * 1.75, a > 0 ? 1.6 : 0.8]);
COLS.forEach(([x, z]) => OBST.push({ x, z, r: 0.3, y0: HILLS[0].h - 0.1 }));

/* ---------- altura del piso ---------- */
// sin fy: solo el terreno (para ubicar cosas); con fy: también el puente, si estás a su altura
export function groundAt(x, z, fy) {
  let h = onIsland(x, z) ? 0 : -99;
  if (h === 0) for (const c of HILLS) for (const t of c.tiers) if (t.h > h && Math.hypot(x - t.x, z - t.z) < t.r) h = t.h;
  const pr = pierAt(x, z); if (pr > h) h = pr;
  if (fy !== undefined) { const b = bridgeAt(x, z); if (b > h && b <= fy + 0.9) h = b; }
  return h;
}
// empuja un círculo (radio r) afuera de los obstáculos
export function pushOut(p, r) {
  for (const o of OBST) {
    if (o.y0 !== undefined && (p.fy || 0) < o.y0) continue;
    const dx = p.x - o.x, dz = p.z - o.z, d = Math.hypot(dx, dz), min = o.r + r;
    if (d >= min || d < 1e-4) continue;
    const nx = dx / d, nz = dz / d;
    p.x = o.x + nx * min; p.z = o.z + nz * min;
    const vn = (p.vx || 0) * nx + (p.vz || 0) * nz; if (vn < 0) { p.vx -= vn * nx; p.vz -= vn * nz; }
    const kn = (p.kx || 0) * nx + (p.kz || 0) * nz; if (kn < 0) { p.kx -= kn * nx * 1.6; p.kz -= kn * nz * 1.6; }   // rebota un poco
  }
}
export const freeSpot = (x, z, m = 0.9) => groundAt(x, z) === 0 && onIsland(x, z, 1.2) && OBST.every((o) => Math.hypot(x - o.x, z - o.z) > o.r + m);

/* ---------- armado ---------- */
const N = 96;
function ringStrip(inner, outer, yIn, yOut, uvScale, cliff) {
  // tira alrededor de la isla entre dos "radios" (funciones del ángulo)
  const pos = [], uv = [], idx = [];
  for (let i = 0; i <= N; i++) {
    const a = (i / N) * Math.PI * 2, s = Math.sin(a), c = Math.cos(a), r0 = inner(a), r1 = outer(a);
    pos.push(s * r0, yIn, c * r0, s * r1, yOut, c * r1);
    if (cliff) uv.push((i / N) * uvScale, 1, (i / N) * uvScale, 0);
    else uv.push((s * r0) / uvScale, (c * r0) / uvScale, (s * r1) / uvScale, (c * r1) / uvScale);
    if (i < N) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}

export function buildIsla(grp) {
  const W = { rings: [], ringM: [] };
  const grassM = mat({ map: TX.grass, color: 0xb8d890, side: THREE.DoubleSide }), sandM = mat({ map: TX.sand, side: THREE.DoubleSide });
  const SB = 1.5;                                  // ancho de la playa
  // pasto: dos anillos (así los triángulos no son larguísimos) · playa · acantilado
  add(ringStrip(() => 0.01, (a) => (rim(a) - SB) * 0.5, 0, 0, 3), grassM, 0, 0, 0, grp);
  add(ringStrip((a) => (rim(a) - SB) * 0.5, (a) => rim(a) - SB, 0, 0, 3), grassM, 0, 0, 0, grp);
  add(ringStrip((a) => rim(a) - SB, rim, 0, 0, 3), sandM, 0, 0, 0, grp);
  add(ringStrip(rim, (a) => rim(a) + 0.9, 0, -3.2, 30, true), mat({ map: TX.pebble, color: 0xc8a878, side: THREE.DoubleSide }), 0, 0, 0, grp);
  // espuma siguiendo la costa
  W.foam = add(ringStrip((a) => rim(a) + 0.3, (a) => rim(a) + 1.6, WATER_Y + 0.05, WATER_Y + 0.05, 3), mat({ color: 0xe8f6ff, unlit: true, side: THREE.DoubleSide }), 0, 0, 0, grp);

  // colinas: costados de piedra, pasto arriba; la cima de piedra con un aro que brilla
  const sideM = mat({ map: TX.stone, color: 0xd0c4b0 }), topM = mat({ map: TX.grass, color: 0xa8d080 });
  const plazaM = [mat({ map: TX.stone, color: 0xf0e8d8 }), mat({ map: TX.stone, color: 0xd8c8a8 }), mat({ map: TX.pebble, color: 0xb8aa98 })];
  const edgeM = mat({ color: 0x8a7a64 });
  HILLS.forEach((c, hk) => {
    c.tiers.forEach((t, k) => {
      const y0 = k === 0 ? 0 : c.tiers[k - 1].h, hh = t.h - y0, top = k === c.tiers.length - 1;
      const m = new THREE.Mesh(new THREE.CylinderGeometry(t.r, t.r * (k === 0 ? 1.04 : 1), hh, 28, 1), [sideM, top ? plazaM[hk] : topM, sideM]);
      m.position.set(t.x, y0 + hh / 2, t.z); grp.add(m);
      const eg = new THREE.RingGeometry(t.r - 0.14, t.r, 28, 1); eg.rotateX(-Math.PI / 2);
      add(eg, edgeM, t.x, t.h + 0.02, t.z, grp);
    });
    const rm = mat({ color: 0xffd23a, unlit: true }); W.ringM.push(rm);
    const rg = new THREE.RingGeometry(c.r - 0.42, c.r - 0.18, 28, 1); rg.rotateX(-Math.PI / 2);
    W.rings.push(add(rg, rm, c.x, c.h + 0.04, c.z, grp));
  });
  // ruinas en el Morro: dos columnas (una rota) y un bloque caído
  const colM = mat({ map: TX.stone, color: 0xf4ecd8 });
  COLS.forEach(([x, z, h]) => {
    const y = HILLS[0].h;
    add(new THREE.CylinderGeometry(0.26, 0.3, h, 8), colM, x, y + h / 2, z, grp);
    add(new THREE.BoxGeometry(0.7, 0.18, 0.7), colM, x, y + 0.09, z, grp);
    if (h > 1) add(new THREE.BoxGeometry(0.72, 0.2, 0.72), colM, x, y + h + 0.1, z, grp);
  });
  add(new THREE.BoxGeometry(1.0, 0.4, 0.5), colM, HILLS[0].tiers[1].x - 2.6, HILLS[0].tiers[1].h + 0.2, HILLS[0].tiers[1].z + 1.2, grp).rotation.y = 0.5;
  // la Mesa: un mástil con bandera; el Peñón: musgo y un cartel
  P.flag(grp, HILLS[1].x + 1.7, HILLS[1].h, HILLS[1].z - 1.3, 3.2, 0xff5a4a);
  P.grass(grp, HILLS[2].tiers[0].x, HILLS[2].tiers[0].h + 0.01, HILLS[2].tiers[0].z, 1.6, 1.6, 10, 0x4a8a3a);

  // puente colgante: tablones con panza, sogas y postes
  const B = BRIDGE, wood = mat({ map: TX.wood, color: 0xc89868 }), rope = mat({ color: 0xd8c8a0 });
  const dx = B.bx - B.ax, dz = B.bz - B.az, L = Math.hypot(dx, dz), ang = Math.atan2(dx, dz), NP = 11;
  const hAt = (t) => B.ah + (B.bh - B.ah) * t - Math.sin(t * Math.PI) * B.sag;
  for (let k = 0; k < NP; k++) {
    const t = (k + 0.5) / NP;
    const m = add(new THREE.BoxGeometry(B.w, 0.1, (L / NP) * 0.82), wood, B.ax + dx * t, hAt(t) - 0.05, B.az + dz * t, grp);
    m.rotation.y = ang; m.rotation.x = Math.atan2(hAt(t + 0.05) - hAt(t - 0.05), L * 0.1) * -1;
  }
  [-1, 1].forEach((sd) => {
    const ox = Math.cos(ang) * sd * (B.w / 2 + 0.05), oz = -Math.sin(ang) * sd * (B.w / 2 + 0.05);
    [[B.ax, B.az, B.ah], [B.bx, B.bz, B.bh]].forEach(([x, z, h]) => add(new THREE.CylinderGeometry(0.09, 0.11, 1.4, 5), wood, x + ox, h + 0.6, z + oz, grp));
    for (let k = 0; k < 8; k++) {
      const t0 = k / 8, t1 = (k + 1) / 8, tm = (t0 + t1) / 2;
      const y = (tt) => hAt(tt) + 0.95 - Math.sin(tt * Math.PI) * 0.1;
      const seg = add(new THREE.BoxGeometry(0.05, 0.05, L / 8 + 0.02), rope, B.ax + dx * tm + ox, y(tm), B.az + dz * tm + oz, grp);
      seg.rotation.y = ang; seg.rotation.x = -Math.atan2(y(t1) - y(t0), L / 8);
    }
  });

  // muelle: tablones sobre pilotes, y un bote amarrado
  const ux = Math.sin(PIER.a), uz = Math.cos(PIER.a);
  const deck = new THREE.Group(); deck.position.set(ux * (PIER.r0 + PIER.len / 2), 0, uz * (PIER.r0 + PIER.len / 2)); deck.rotation.y = PIER.a; grp.add(deck);
  for (let k = 0; k < 12; k++) add(new THREE.BoxGeometry(PIER.w, 0.12, PIER.len / 12 * 0.85), wood, 0, PIER.h - 0.06, -PIER.len / 2 + (k + 0.5) * PIER.len / 12, deck);
  [-1, 1].forEach((sx) => [0.3, 2.2, 4.1, 5.9].forEach((s) => add(new THREE.CylinderGeometry(0.13, 0.13, 2.2, 5), wood, sx * (PIER.w / 2 - 0.1), PIER.h - 1.1, -PIER.len / 2 + s, deck)));
  [-1, 1].forEach((sx) => add(new THREE.CylinderGeometry(0.1, 0.12, 0.7, 5), wood, sx * (PIER.w / 2 - 0.1), PIER.h + 0.3, PIER.len / 2 - 0.2, deck));
  P.lantern(deck, PIER.w / 2 - 0.1, PIER.h, PIER.len / 2 - 0.3, 2.0);
  W.boat = boat(grp, ux * (PIER.r0 + 4.4) + uz * 1.8, WATER_Y + 0.15, uz * (PIER.r0 + 4.4) - ux * 1.8, PIER.a + 0.15, 0x8ad0ff);

  // playa: palmeras, rocas, bote varado, barriles, antorchas y estrellas de mar
  PALMS.forEach(([x, z, s]) => P.palm(grp, x, 0, z, s));
  ROCKS.forEach(([x, z, s]) => P.rock(grp, x, 0, z, s, 0xa89c8c));
  boat(grp, BOAT.x, 0.05, BOAT.z, BOAT.a, 0xd85a3a).rotation.z = 0.18;
  BARRELS.forEach(([x, z], k) => P.barrel(grp, x, 0, z, k ? 0x8a5a32 : 0x3a6ac8));
  [[-4.6, 9.2], [5.4, 10.0], [-11.2, -1.4], [11.6, -2.8]].forEach(([x, z]) => { if (onIsland(x, z, 0.3)) P.torch(grp, x, 0, z, 1.9); });
  const starM = mat({ color: 0xff8a5a });
  for (let k = 0; k < 7; k++) {
    const a = rnd(0, Math.PI * 2), r = rim(a) - rnd(0.4, 1.1);
    const st = new THREE.CircleGeometry(0.22, 5); st.rotateX(-Math.PI / 2);
    add(st, starM, Math.sin(a) * r, 0.02, Math.cos(a) * r, grp).rotation.y = rnd(0, 6);
  }
  // flores y pastito en el llano (lejos de las colinas)
  for (let k = 0; k < 8; k++) {
    const a = rnd(0, Math.PI * 2), r = rnd(2, 9), x = Math.sin(a) * r, z = Math.cos(a) * r;
    if (groundAt(x, z) === 0 && onIsland(x, z, 2)) { P.flowers(grp, x, 0.01, z, 0.9, 0.9, 5); P.grass(grp, x, 0.01, z, 1.2, 1.2, 6, 0x5aa048); }
  }
  return W;
}

// botecito de madera (casco y bancos)
function boat(p, x, y, z, a, col) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = a; p.add(g);
  const hull = mat({ map: TX.wood, color: col }), inner = mat({ map: TX.wood, color: 0xb88a52 });
  add(new THREE.BoxGeometry(1.2, 0.45, 2.6), hull, 0, 0.22, 0, g);
  const bow = add(new THREE.ConeGeometry(0.62, 0.9, 4), hull, 0, 0.22, 1.72, g); bow.rotation.x = Math.PI / 2; bow.rotation.y = Math.PI / 4; bow.scale.set(1, 1, 0.5);
  add(new THREE.BoxGeometry(1.0, 0.06, 2.3), inner, 0, 0.36, 0, g);
  [-0.5, 0.5].forEach((s) => add(new THREE.BoxGeometry(1.1, 0.08, 0.3), inner, 0, 0.46, s, g));
  const oar = add(new THREE.BoxGeometry(0.08, 0.06, 1.8), inner, 0.5, 0.5, -0.1, g); oar.rotation.y = 0.3;
  return g;
}
