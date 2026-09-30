// Utilería para decorar los escenarios: árboles, rocas, cercas, faroles, casitas, tribunas con público,
// humo, burbujas de lava, nieve que cae… Todo low poly con los materiales PS1.
// Nada de esto choca con nada: es solo decorado. Lo animado se registra con anim() y se mueve
// solo mientras su escenario está a la vista (updateProps, desde visuals.js).
import * as THREE from 'three';
import { mat, add, scaleUV } from '../render/psx.js';
import { TX } from '../render/textures.js';
import { rnd } from '../config.js';

/* ---------- animaciones ---------- */
const ANIMS = [];
export function anim(owner, fn) { ANIMS.push({ owner, fn }); }
const shown = (o) => { for (let x = o; x; x = x.parent) if (!x.visible) return false; return true; };
let T = 0;
export function updateProps(dt) {
  T += dt;
  for (const a of ANIMS) if (shown(a.owner)) a.fn(T, dt);
}

/* ---------- materiales compartidos ---------- */
const cache = {};
export function M(color, o = {}) {
  const key = `${color}|${o.map ? o.map.uuid : ''}|${o.unlit ? 1 : 0}|${o.side || 0}`;
  return cache[key] || (cache[key] = mat(Object.assign({ color }, o)));
}
const G = (parent, x = 0, y = 0, z = 0, ry = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; parent.add(g); return g; };
const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);

/* ---------- plantas ---------- */
export function tree(p, x, y, z, s = 1, leaf = 0x3f8a3a) {
  const g = G(p, x, y, z, rnd(0, 6)); g.scale.setScalar(s);
  add(new THREE.CylinderGeometry(0.22, 0.32, 1.6, 6), M(0x6b4a2a, { map: TX.wood }), 0, 0.8, 0, g);
  const lm = M(leaf, { map: TX.leaf }), lm2 = M(new THREE.Color(leaf).multiplyScalar(0.8).getHex(), { map: TX.leaf });
  add(new THREE.DodecahedronGeometry(1.1, 0), lm, 0, 2.2, 0, g);
  add(new THREE.DodecahedronGeometry(0.8, 0), lm2, 0.6, 1.9, 0.3, g);
  add(new THREE.DodecahedronGeometry(0.75, 0), lm2, -0.55, 2.0, -0.3, g);
  return g;
}
export function pine(p, x, y, z, s = 1, snow = false) {
  const g = G(p, x, y, z, rnd(0, 6)); g.scale.setScalar(s);
  add(new THREE.CylinderGeometry(0.2, 0.28, 1.2, 6), M(0x5a3c22, { map: TX.wood }), 0, 0.6, 0, g);
  const lm = M(0x2a6a4a, { map: TX.leaf }), sm = M(0xf4f8ff, { map: TX.snow });
  [[1.4, 1.6, 1.4], [1.1, 1.4, 2.3], [0.75, 1.2, 3.1]].forEach(([r, h, yy]) => {
    add(new THREE.ConeGeometry(r, h, 7), lm, 0, yy, 0, g);
    if (snow) add(new THREE.ConeGeometry(r * 0.72, h * 0.42, 7), sm, 0, yy + h * 0.32, 0, g);
  });
  return g;
}
// Bosque de pinos nevados (instanciado: muchos árboles con pocas mallas). pts: [[x, z, escala], ...]
export function forest(p, y, pts) {
  const n = pts.length, m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), sc = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  const parts = [[new THREE.CylinderGeometry(0.2, 0.28, 1.2, 6), M(0x5a3c22, { map: TX.wood }), 0.6]];
  const lm = M(0x2a6a4a, { map: TX.leaf }), sm = M(0xf4f8ff, { map: TX.snow });
  [[1.4, 1.6, 1.4], [1.1, 1.4, 2.3], [0.75, 1.2, 3.1]].forEach(([r, h, yy]) => { parts.push([new THREE.ConeGeometry(r, h, 7), lm, yy]); parts.push([new THREE.ConeGeometry(r * 0.72, h * 0.42, 7), sm, yy + h * 0.32]); });
  parts.forEach(([geo, mt, yy]) => {
    const im = new THREE.InstancedMesh(geo, mt, n);
    pts.forEach(([x, z, s2], i) => { q.setFromAxisAngle(up, (i * 2.4) % 6.28); sc.setScalar(s2); v.set(x, y + yy * s2, z); m4.compose(v, q, sc); im.setMatrixAt(i, m4); });
    p.add(im);
  });
}
export function palm(p, x, y, z, s = 1) {
  const g = G(p, x, y, z, rnd(0, 6)); g.scale.setScalar(s);
  const tm = M(0x9a7448, { map: TX.wood });
  for (let k = 0; k < 5; k++) add(new THREE.CylinderGeometry(0.2, 0.24, 0.72, 6), tm, k * 0.12, 0.36 + k * 0.68, 0, g).rotation.z = -0.12;
  const lm = M(0x3f9a44, { map: TX.leaf });
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2, l = add(box(0.35, 0.06, 1.8), lm, 0.6 + Math.sin(a) * 0.8, 3.45, Math.cos(a) * 0.8, g);
    l.rotation.set(0.45, a, 0);
  }
  add(new THREE.SphereGeometry(0.16, 5, 4), M(0x6b4a22), 0.62, 3.3, 0.12, g);
  add(new THREE.SphereGeometry(0.16, 5, 4), M(0x6b4a22), 0.5, 3.28, -0.14, g);
  return g;
}
export function cactus(p, x, y, z, s = 1) {
  const g = G(p, x, y, z, rnd(0, 6)); g.scale.setScalar(s);
  const cm = M(0x4a9a52, { map: TX.leaf });
  add(new THREE.CylinderGeometry(0.34, 0.4, 3, 8), cm, 0, 1.5, 0, g);
  add(new THREE.SphereGeometry(0.34, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2), cm, 0, 3, 0, g);
  [[-1, 1.3, 0.8], [1, 1.8, 0.6]].forEach(([sx, yy, h]) => {
    add(new THREE.CylinderGeometry(0.2, 0.2, 0.6, 6), cm, sx * 0.45, yy, 0, g).rotation.z = Math.PI / 2;
    add(new THREE.CylinderGeometry(0.2, 0.2, h, 6), cm, sx * 0.72, yy + h / 2, 0, g);
    add(new THREE.SphereGeometry(0.2, 6, 3, 0, Math.PI * 2, 0, Math.PI / 2), cm, sx * 0.72, yy + h, 0, g);
  });
  add(new THREE.SphereGeometry(0.14, 5, 4), M(0xff6a9a), 0, 3.28, 0, g);   // florcita
  return g;
}
export function bush(p, x, y, z, s = 1, col = 0x3f8a3a) {
  const g = G(p, x, y, z, rnd(0, 6)); g.scale.setScalar(s);
  const m1 = M(col, { map: TX.leaf }), m2 = M(new THREE.Color(col).multiplyScalar(0.8).getHex(), { map: TX.leaf });
  add(new THREE.DodecahedronGeometry(0.6, 0), m1, 0, 0.45, 0, g);
  add(new THREE.DodecahedronGeometry(0.45, 0), m2, 0.5, 0.35, 0.2, g);
  add(new THREE.DodecahedronGeometry(0.42, 0), m2, -0.45, 0.32, -0.15, g);
  return g;
}
// Cantero de flores (instancias: una sola malla para muchas)
export function flowers(p, cx, y, cz, rx, rz, n, colors = [0xff5a7a, 0xffe14a, 0xffffff, 0xb07aff]) {
  const stems = new THREE.InstancedMesh(box(0.05, 0.36, 0.05), M(0x3f8a3a), n);
  const heads = new THREE.InstancedMesh(box(0.18, 0.14, 0.18), M(0xffffff), n);
  const m4 = new THREE.Matrix4(), c = new THREE.Color();
  for (let i = 0; i < n; i++) {
    const x = cx + rnd(-rx, rx), z = cz + rnd(-rz, rz);
    m4.makeTranslation(x, y + 0.18, z); stems.setMatrixAt(i, m4);
    m4.makeRotationY(rnd(0, 3)).setPosition(x, y + 0.4, z); heads.setMatrixAt(i, m4);
    heads.setColorAt(i, c.set(colors[i % colors.length]));
  }
  p.add(stems); p.add(heads);
  return heads;
}
// Matas de pasto
export function grass(p, cx, y, cz, rx, rz, n, col = 0x4a9a3a) {
  const im = new THREE.InstancedMesh(new THREE.ConeGeometry(0.12, 0.5, 3), M(col), n);
  const m4 = new THREE.Matrix4();
  for (let i = 0; i < n; i++) { m4.makeRotationY(rnd(0, 3)).setPosition(cx + rnd(-rx, rx), y + 0.22, cz + rnd(-rz, rz)); im.setMatrixAt(i, m4); }
  p.add(im);
  return im;
}

/* ---------- piedras y terreno ---------- */
export function rock(p, x, y, z, s = 1, col = 0xa09a92, snow = false) {
  const g = G(p, x, y, z, rnd(0, 6));
  const r = add(new THREE.DodecahedronGeometry(s, 0), M(col, { map: TX.pebble }), 0, s * 0.45, 0, g);
  r.scale.set(1, rnd(0.55, 0.85), rnd(0.8, 1.1)); r.rotation.set(rnd(0, 1), rnd(0, 3), 0);
  if (snow) add(new THREE.SphereGeometry(s * 0.8, 7, 3, 0, Math.PI * 2, 0, Math.PI / 2), M(0xf4f8ff, { map: TX.snow }), 0, s * 0.72, 0, g).scale.set(1, 0.35, 1);
  return g;
}
export function dune(p, x, y, z, sx, sz, col = 0xd8b070) {
  const d = add(new THREE.SphereGeometry(1, 10, 5, 0, Math.PI * 2, 0, Math.PI / 2), M(col, { map: TX.sand }), x, y, z, p);
  d.scale.set(sx, Math.min(sx, sz) * 0.28, sz); d.rotation.y = rnd(0, 3);
  return d;
}
export function pond(p, x, y, z, r = 2) {
  const g = G(p, x, y, z);
  add(new THREE.CylinderGeometry(r + 0.35, r + 0.45, 0.3, 12), M(0xa8a29a, { map: TX.stone }), 0, 0.15, 0, g);
  const wm = mat({ map: TX.water, unlit: true, color: 0xcfe8ff });
  add(new THREE.CylinderGeometry(r, r, 0.32, 12), wm, 0, 0.17, 0, g);
  anim(g, (t) => wm.uniforms.uOff.value.set((t * 0.03) % 1, (t * 0.02) % 1));
  return g;
}

/* ---------- construcciones y cosas ---------- */
export function fence(p, x1, y, z1, x2, z2, col = 0xf0e6d0) {
  const g = G(p), dx = x2 - x1, dz = z2 - z1, len = Math.hypot(dx, dz), n = Math.max(1, Math.round(len / 1.1));
  const m = M(col, { map: TX.wood });
  for (let i = 0; i <= n; i++) {
    const f = i / n, px = x1 + dx * f, pz = z1 + dz * f;
    add(box(0.16, 0.9, 0.16), m, px, y + 0.45, pz, g);
    add(new THREE.ConeGeometry(0.12, 0.2, 4), m, px, y + 1.0, pz, g).rotation.y = Math.PI / 4;
  }
  const a = Math.atan2(dx, dz);
  [0.35, 0.7].forEach((h) => { add(box(0.08, 0.1, len), m, x1 + dx / 2, y + h, z1 + dz / 2, g).rotation.y = a; });
  return g;
}
export function lamp(p, x, y, z, h = 3, col = 0xffe08a) {
  const g = G(p, x, y, z);
  const pm = M(0x3a3f4a, { map: TX.metal });
  add(new THREE.CylinderGeometry(0.08, 0.12, h, 6), pm, 0, h / 2, 0, g);
  add(box(0.5, 0.1, 0.5), pm, 0, h + 0.05, 0, g);
  add(box(0.36, 0.36, 0.36), M(col, { unlit: true }), 0, h - 0.18, 0, g);
  return g;
}
export function house(p, x, y, z, ry = 0, wall = 0xf0e0c0, roof = 0xffffff, s = 1) {
  const g = G(p, x, y, z, ry); g.scale.setScalar(s);
  add(box(2.6, 1.8, 2.2), M(wall, { map: TX.stone }), 0, 0.9, 0, g);
  const rf = new THREE.CylinderGeometry(1.75, 1.75, 2.9, 3, 1); rf.rotateZ(Math.PI / 2); rf.rotateX(Math.PI / 2);
  add(rf, M(roof, { map: TX.roof }), 0, 2.35, 0, g).scale.set(1, 0.62, 0.86);
  add(box(0.6, 1.0, 0.06), M(0x6b4424, { map: TX.wood }), 0.5, 0.5, 1.12, g);
  add(box(0.5, 0.5, 0.06), M(0xffffff, { map: TX.window, unlit: true }), -0.6, 1.1, 1.12, g);
  add(box(0.4, 0.8, 0.4), M(0x9a4a3a, { map: TX.stone }), -0.7, 2.9, -0.4, g);        // chimenea
  return g;
}
export function barrel(p, x, y, z, col = 0x3a6ac8) {
  const g = G(p, x, y, z, rnd(0, 6));
  add(new THREE.CylinderGeometry(0.42, 0.42, 1.1, 10), M(col, { map: TX.metal }), 0, 0.55, 0, g);
  [0.2, 0.9].forEach((h) => add(new THREE.CylinderGeometry(0.44, 0.44, 0.07, 10), M(0x2a2d36), 0, h, 0, g));
  return g;
}
export function crates(p, x, y, z, n = 2, s = 1.2) {
  const g = G(p, x, y, z, rnd(0, 6)), cm = M(0xffffff, { map: TX.crate });
  for (let i = 0; i < n; i++) add(box(s, s, s), cm, (i % 2) * s * 1.02 - (n > 1 ? s / 2 : 0), s / 2 + ((i / 2) | 0) * s, 0, g).rotation.y = rnd(-0.2, 0.2);
  if (n >= 3) add(box(s, s, s), cm, 0, s * 1.5, 0, g).rotation.y = 0.3;
  return g;
}
export function pipe(p, x1, y1, z1, x2, y2, z2, r = 0.35, col = 0x8a92a6) {
  const g = G(p), a = new THREE.Vector3(x1, y1, z1), b = new THREE.Vector3(x2, y2, z2), len = a.distanceTo(b);
  const m = M(col, { map: TX.metal });
  const c = add(new THREE.CylinderGeometry(r, r, len, 8), m, (x1 + x2) / 2, (y1 + y2) / 2, (z1 + z2) / 2, g);
  c.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
  [a, b].forEach((v) => add(new THREE.CylinderGeometry(r * 1.25, r * 1.25, 0.2, 8), M(0x5a6070, { map: TX.metal }), v.x, v.y, v.z, g).quaternion.copy(c.quaternion));
  return g;
}
// Chimenea con humo que sube
export function smokestack(p, x, y, z, h = 7) {
  const g = G(p, x, y, z);
  add(new THREE.CylinderGeometry(0.7, 0.9, h, 10), M(0x9a6a5a, { map: TX.brick }), 0, h / 2, 0, g);
  add(new THREE.CylinderGeometry(0.8, 0.8, 0.3, 10), M(0x3a3a42, { map: TX.metal }), 0, h, 0, g);
  add(new THREE.CylinderGeometry(0.72, 0.72, 0.4, 10), M(0xffffff, { map: TX.hazard, unlit: true }), 0, h * 0.8, 0, g);
  smoke(g, 0, h + 0.3, 0, 5, 1.2);
  return g;
}
export function smoke(p, x, y, z, n = 4, size = 1, col = 0x9aa0aa) {
  const puffs = [], sm = M(col);
  for (let i = 0; i < n; i++) { const s = add(new THREE.DodecahedronGeometry(0.5, 0), sm, x, y, z, p); puffs.push({ s, ph: i / n }); }
  anim(p, (t) => puffs.forEach((q) => {
    const k = (t * 0.25 + q.ph) % 1;
    q.s.position.set(x + Math.sin(q.ph * 9 + t * 0.5) * k * 0.8, y + k * 4, z + k * 0.6);
    q.s.scale.setScalar(size * (0.4 + k * 1.3) * (k > 0.85 ? (1 - k) / 0.15 : 1));
    q.s.rotation.set(k * 2, k * 3, 0);
  }));
}
// Luz giratoria de advertencia
export function beacon(p, x, y, z, col = 0xff7a1a) {
  const g = G(p, x, y, z);
  add(new THREE.CylinderGeometry(0.28, 0.32, 0.25, 8), M(0x3a3f4a, { map: TX.metal }), 0, 0.12, 0, g);
  add(new THREE.CylinderGeometry(0.22, 0.22, 0.35, 8), M(col, { unlit: true }), 0, 0.42, 0, g);
  const rot = G(g, 0, 0.42, 0);
  const bm = M(new THREE.Color(col).lerp(new THREE.Color(0xffffff), 0.3).getHex(), { unlit: true });
  [-1, 1].forEach((s) => add(box(0.1, 0.08, 1.6), bm, 0, 0, s * 0.85, rot));
  anim(g, (t) => { rot.rotation.y = t * 5; });
  return g;
}
export function snowman(p, x, y, z, ry = 0) {
  const g = G(p, x, y, z, ry), sm = M(0xf4f8ff, { map: TX.snow });
  add(new THREE.SphereGeometry(0.7, 8, 6), sm, 0, 0.6, 0, g);
  add(new THREE.SphereGeometry(0.5, 8, 6), sm, 0, 1.5, 0, g);
  add(new THREE.SphereGeometry(0.36, 8, 6), sm, 0, 2.18, 0, g);
  const k = M(0x15151a);
  [-0.12, 0.12].forEach((ex) => add(box(0.07, 0.07, 0.05), k, ex, 2.26, 0.33, g));
  [1.3, 1.55, 1.8].forEach((yy) => add(box(0.07, 0.07, 0.05), k, 0, yy, 0.48, g));
  add(new THREE.ConeGeometry(0.06, 0.34, 4), M(0xff8a1a), 0, 2.16, 0.48, g).rotation.x = Math.PI / 2;
  add(new THREE.CylinderGeometry(0.28, 0.28, 0.36, 8), k, 0, 2.62, 0, g);
  add(new THREE.CylinderGeometry(0.42, 0.42, 0.05, 8), k, 0, 2.46, 0, g);
  add(box(0.8, 0.12, 0.12), M(0xd83a3a, { map: TX.cloth }), 0, 1.85, 0.1, g);    // bufanda
  [-1, 1].forEach((sx) => add(new THREE.CylinderGeometry(0.03, 0.03, 0.9, 4), M(0x5a3c22), sx * 0.7, 1.6, 0, g).rotation.z = sx * 0.9);
  return g;
}
export function igloo(p, x, y, z, ry = 0, s = 1) {
  const g = G(p, x, y, z, ry); g.scale.setScalar(s);
  const sm = M(0xeaf2ff, { map: TX.stone });
  add(new THREE.SphereGeometry(1.8, 10, 5, 0, Math.PI * 2, 0, Math.PI / 2), sm, 0, 0, 0, g);
  const tun = new THREE.CylinderGeometry(0.75, 0.75, 1.2, 8, 1, false, 0, Math.PI); tun.rotateZ(Math.PI / 2); tun.rotateY(Math.PI / 2);
  add(tun, sm, 0, 0, 1.8, g);
  add(new THREE.CircleGeometry(0.55, 8, 0, Math.PI), M(0x1a2230, { unlit: true }), 0, 0.01, 2.41, g);
  return g;
}
export function bones(p, x, y, z) {
  const g = G(p, x, y, z, rnd(0, 6)), bm = M(0xf0e8d6);
  add(box(0.5, 0.4, 0.45), bm, 0, 0.2, 0, g);
  [-0.12, 0.12].forEach((ex) => add(box(0.12, 0.12, 0.05), M(0x2a2018), ex, 0.24, 0.23, g));
  add(box(1.1, 0.1, 0.1), bm, 0.8, 0.06, 0.3, g).rotation.y = 0.5;
  add(box(0.8, 0.1, 0.1), bm, -0.6, 0.06, 0.5, g).rotation.y = -0.8;
  return g;
}
export function sign(p, x, y, z, ry = 0, col = 0x9a6a3c) {
  const g = G(p, x, y, z, ry), m = M(col, { map: TX.wood });
  add(box(0.14, 1.6, 0.14), m, 0, 0.8, 0, g);
  add(box(1.3, 0.45, 0.08), m, 0.3, 1.35, 0, g);
  add(new THREE.ConeGeometry(0.26, 0.4, 3), m, 1.05, 1.35, 0, g).rotation.z = -Math.PI / 2;
  return g;
}
// Planta rodadora que cruza cada tanto
export function tumbleweed(p, x1, y, z1, x2, z2, period = 9, off = 0) {
  const g = G(p), w = add(new THREE.IcosahedronGeometry(0.55, 0), M(0xa8804a, { map: TX.leaf }), 0, 0, 0, g);
  anim(g, (t) => {
    const k = ((t + off) % period) / period;
    w.visible = k < 0.6;
    const f = k / 0.6;
    w.position.set(x1 + (x2 - x1) * f, y + 0.55 + Math.abs(Math.sin(f * 20)) * 0.5, z1 + (z2 - z1) * f);
    w.rotation.set(f * 30, 0, -f * 24);
  });
  return g;
}

/* ---------- público y estadio ---------- */
// Tribuna escalonada con público que salta. w: ancho, rows: filas
export function stands(p, x, y, z, ry, w, rows = 4, stepD = 1.25, stepH = 0.9) {
  const g = G(p, x, y, z, ry);
  const sm = M(0x5a6070, { map: TX.metal }), edge = M(0xffffff, { map: TX.hazard, unlit: true });
  for (let r = 0; r < rows; r++) {
    add(box(w, stepH * (r + 1), stepD), sm, 0, (stepH * (r + 1)) / 2, r * stepD, g);
    add(box(w, 0.08, 0.1), edge, 0, stepH * (r + 1) + 0.02, r * stepD - stepD / 2 + 0.05, g);
  }
  // público: cuerpo y cabeza por instancia, cada uno salta a su ritmo
  const per = Math.floor(w / 0.9), n = per * rows;
  const bodies = new THREE.InstancedMesh(box(0.55, 0.7, 0.4), M(0xffffff, { map: TX.cloth }), n);
  const heads = new THREE.InstancedMesh(box(0.36, 0.36, 0.36), M(0xffffff), n);
  const SK = [0xf2c9a0, 0xd9a47a, 0xa8704a, 0x7a4a2e, 0xe8b890], SH = [0xff5a4a, 0x3a7bff, 0xffd23a, 0x39d98a, 0xb06aff, 0xffffff, 0xff9a1f, 0x2a2a34];
  const c = new THREE.Color(), seats = [];
  for (let r = 0; r < rows; r++) for (let i = 0; i < per; i++) {
    if (Math.random() < 0.12) continue;                                  // asientos vacíos
    const k = seats.length;
    seats.push({ x: -w / 2 + 0.45 + i * 0.9 + rnd(-0.08, 0.08), y: stepH * (r + 1), z: r * stepD, ph: rnd(0, 6), sp: rnd(5, 9) });
    bodies.setColorAt(k, c.set(SH[(Math.random() * SH.length) | 0]));
    heads.setColorAt(k, c.set(SK[(Math.random() * SK.length) | 0]));
  }
  bodies.count = heads.count = seats.length;
  g.add(bodies); g.add(heads);
  const m4 = new THREE.Matrix4();
  const place = (t, amp) => {
    seats.forEach((s, k) => {
      const j = Math.max(0, Math.sin(t * s.sp + s.ph)) * amp;
      m4.makeTranslation(s.x, s.y + 0.35 + j, s.z); bodies.setMatrixAt(k, m4);
      m4.makeTranslation(s.x, s.y + 0.9 + j, s.z); heads.setMatrixAt(k, m4);
    });
    bodies.instanceMatrix.needsUpdate = true; heads.instanceMatrix.needsUpdate = true;
  };
  place(0, 0.1);
  anim(g, (t) => place(t, 0.12 + 0.1 * Math.max(0, Math.sin(t * 0.37))));
  return g;
}
// Torre de luces del estadio
export function floodlight(p, x, y, z, h = 12) {
  const g = G(p, x, y, z, Math.atan2(-x, -z));
  const pm = M(0x6a7084, { map: TX.metal });
  add(new THREE.CylinderGeometry(0.25, 0.4, h, 6), pm, 0, h / 2, 0, g);
  add(box(2.6, 1.4, 0.3), pm, 0, h + 0.4, 0.2, g).rotation.x = 0.4;
  const lm = M(0xfff4c8, { unlit: true });
  for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) add(box(0.6, 0.45, 0.1), lm, -0.8 + i * 0.8, h + 0.1 + j * 0.55, 0.42 - j * 0.2, g).rotation.x = 0.4;
  return g;
}
// Banderín que flamea
export function flag(p, x, y, z, h = 3.5, col = 0xff5a4a) {
  const g = G(p, x, y, z);
  add(new THREE.CylinderGeometry(0.05, 0.05, h, 5), M(0xd8dce6), 0, h / 2, 0, g);
  const pv = G(g, 0, h - 0.4, 0);
  const cloth = add(box(0.05, 0.6, 1.0), M(col, { map: TX.cloth }), 0, 0, 0.5, pv);
  const ph = rnd(0, 6);
  anim(g, (t) => { pv.rotation.y = Math.sin(t * 2 + ph) * 0.5; cloth.scale.z = 0.85 + Math.sin(t * 5 + ph) * 0.15; });
  return g;
}

/* ---------- efectos de ambiente ---------- */
// Burbujas de lava que suben y revientan (sobre un plano a la altura y)
export function lavaBubbles(p, y, rMin, rMax, n = 16) {
  const ms = [M(0xffb02a, { unlit: true }), M(0xff6a1a, { unlit: true })], bs = [];
  for (let i = 0; i < n; i++) {
    const a = rnd(0, Math.PI * 2), r = rnd(rMin, rMax);
    bs.push({ m: add(new THREE.SphereGeometry(1, 7, 5), ms[i % 2], Math.sin(a) * r, y, Math.cos(a) * r, p), ph: rnd(0, 1), sp: rnd(0.25, 0.5), s: rnd(0.6, 1.6) });
  }
  anim(p, (t) => bs.forEach((b) => {
    const k = (t * b.sp + b.ph) % 1;
    b.m.scale.set(b.s * k, b.s * k * 0.7, b.s * k);
    b.m.visible = k < 0.92;
  }));
}
// Partículas que suben (brasas) o caen (nieve) sobre una zona; instanciadas
export function drift(p, n, x0, x1, y0, y1, z0, z1, col, size, speed, unlit = true) {
  const im = new THREE.InstancedMesh(box(size, size, size), M(col, { unlit }), n);
  const ps = [];
  for (let i = 0; i < n; i++) ps.push({ x: rnd(x0, x1), z: rnd(z0, z1), k: rnd(0, 1), sp: rnd(0.7, 1.3), ph: rnd(0, 6) });
  p.add(im);
  const m4 = new THREE.Matrix4();
  anim(p, (t, dt) => {
    ps.forEach((q, i) => {
      q.k = (q.k + (dt * speed * q.sp) / Math.abs(y1 - y0)) % 1;
      const yy = y0 + (y1 - y0) * q.k;
      m4.makeRotationY(t + q.ph).setPosition(q.x + Math.sin(t * 0.8 + q.ph) * 0.6, yy, q.z + Math.cos(t * 0.6 + q.ph) * 0.4);
      im.setMatrixAt(i, m4);
    });
    im.instanceMatrix.needsUpdate = true;
  });
  return im;
}
// Pájaros o mariposas dando vueltas
export function flyers(p, cx, cy, cz, r, n = 4, col = 0x2a2a34, size = 0.5) {
  const bm = M(col), fs = [];
  for (let i = 0; i < n; i++) {
    const g = G(p);
    const wl = add(box(size, 0.04, size * 0.5), bm, -size / 2, 0, 0, g), wr = add(box(size, 0.04, size * 0.5), bm, size / 2, 0, 0, g);
    fs.push({ g, wl, wr, ph: (i / n) * Math.PI * 2, rr: r * rnd(0.7, 1.1), hh: rnd(-0.6, 0.6), sp: rnd(0.25, 0.4) });
  }
  anim(p, (t) => fs.forEach((f) => {
    const a = t * f.sp + f.ph;
    f.g.position.set(cx + Math.sin(a) * f.rr, cy + f.hh + Math.sin(t * 1.3 + f.ph) * 0.4, cz + Math.cos(a) * f.rr);
    f.g.rotation.y = a + Math.PI / 2;
    const fl = Math.sin(t * 12 + f.ph) * 0.7;
    f.wl.rotation.z = fl; f.wr.rotation.z = -fl;
  }));
}
// Planeta de fondo con anillo
export function planet(p, x, y, z, r, col, ringCol) {
  const g = G(p, x, y, z);
  add(new THREE.SphereGeometry(r, 16, 10), M(col, { map: TX.rock }), 0, 0, 0, g);
  if (ringCol) { const rg = new THREE.TorusGeometry(r * 1.6, r * 0.12, 3, 24); rg.rotateX(Math.PI / 2 - 0.35); add(rg, M(ringCol, { unlit: true }), 0, 0, 0, g); }
  anim(g, (t) => { g.rotation.y = t * 0.05; });
  return g;
}

/* ---------- cielo ---------- */
// Cúpula de cielo con degradé (sin niebla ni temblor: queda siempre de fondo). stops: [[0..1, '#color'], ...] de arriba a abajo.
// stars: cantidad de estrellas en la mitad de arriba; blobs: manchas de nebulosa [[u, v, radio, 'rgba()'], ...]
export function sky(p, stops, o = {}) {
  const c = document.createElement('canvas'); c.width = 64; c.height = 64;
  const x = c.getContext('2d'), gr = x.createLinearGradient(0, 0, 0, 64);
  stops.forEach(([k, col]) => gr.addColorStop(k, col));
  x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
  (o.blobs || []).forEach(([u, v, r, col]) => {
    for (const du of [-64, 0, 64]) {
      const rg = x.createRadialGradient(u * 64 + du, v * 64, 0, u * 64 + du, v * 64, r * 64);
      rg.addColorStop(0, col); rg.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = rg; x.fillRect(0, 0, 64, 64);
    }
  });
  for (let i = 0; i < (o.stars || 0); i++) {
    x.fillStyle = `rgba(255,255,255,${rnd(0.4, 1)})`;
    x.fillRect((Math.random() * 64) | 0, (Math.random() * 64 * (o.starBand || 0.45)) | 0, 1, 1);
  }
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false;
  const m = new THREE.MeshBasicMaterial({ map: t, side: THREE.BackSide, depthWrite: false, fog: false });
  const s = new THREE.Mesh(new THREE.SphereGeometry(o.r || 110, 16, 10), m);
  s.position.y = o.y || 0; s.renderOrder = -10; p.add(s);
  if (o.spin) anim(s, (tt) => { s.rotation.y = tt * o.spin; });
  return s;
}

/* ---------- estadio ---------- */
// Letrero de pantalla gigante: una textura chica que se redibuja (letras que pasan y colores que cambian)
const FONT5 = {
  B: ['1110', '1001', '1110', '1001', '1110'], O: ['0110', '1001', '1001', '1001', '0110'], L: ['1000', '1000', '1000', '1000', '1111'],
  N: ['1001', '1101', '1011', '1001', '1001'], K: ['1001', '1010', '1100', '1010', '1001'], I: ['111', '010', '010', '010', '111'],
  G: ['0111', '1000', '1011', '1001', '0111'], '!': ['1', '1', '1', '0', '1'], ' ': ['00', '00', '00', '00', '00'],
};
export function jumbotron(p, x, y, z, ry, w = 9, h = 4.5, text = 'BOLONKI') {
  const g = G(p, x, y, z, ry);
  const fm = M(0x3a3f4a, { map: TX.metal });
  add(box(w + 0.6, h + 0.6, 0.5), fm, 0, 0, -0.1, g);
  [-1, 1].forEach((sx) => add(box(0.35, y + 3, 0.35), fm, sx * (w / 2 - 0.6), -(y + 3) / 2 - h / 2 + 1.5, -0.3, g));
  const c = document.createElement('canvas'); c.width = 48; c.height = 24;
  const cx = c.getContext('2d');
  const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false;
  const scr = add(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t, fog: false }), 0, 0, 0.17, g);
  const cols = ['#ff9a1f', '#2de0c8', '#ff5fa2', '#39d98a', '#ffe14a'];
  let last = -1;
  const draw = (tt) => {
    const step = Math.floor(tt * 8); if (step === last) return; last = step;
    cx.fillStyle = '#060a16'; cx.fillRect(0, 0, 48, 24);
    // fondo: rayas que bajan
    for (let yy = 0; yy < 24; yy += 4) { cx.fillStyle = (((yy + step) >> 2) % 2) ? '#0d1630' : '#101c3c'; cx.fillRect(0, (yy + step) % 24, 48, 2); }
    // texto que pasa
    const col = cols[Math.floor(tt / 2) % cols.length];
    let px = 48 - (step % (text.length * 6 + 48));
    for (const ch of text) {
      const gph = FONT5[ch] || FONT5[' '];
      gph.forEach((row, ry2) => [...row].forEach((b, rx) => { if (b === '1') { cx.fillStyle = col; cx.fillRect(px + rx * 2, 7 + ry2 * 2, 2, 2); } }));
      px += gph[0].length * 2 + 2;
    }
    cx.fillStyle = '#2de0c8'; cx.fillRect(0, 0, 48, 1); cx.fillRect(0, 23, 48, 1);
    t.needsUpdate = true;
  };
  draw(0);
  anim(g, (tt) => draw(tt));
  return g;
}
// Marcas pintadas en el piso (unlit, apenas arriba del piso)
export function floorRing(p, x, y, z, r0, r1, col, seg = 24, start = 0, len = Math.PI * 2) {
  const rg = new THREE.RingGeometry(r0, r1, seg, 1, start, len); rg.rotateX(-Math.PI / 2);
  return add(rg, M(col, { unlit: true }), x, y, z, p);
}
export function floorStar(p, x, y, z, r, col) {
  const s = new THREE.Shape();
  for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + (k * Math.PI) / 5, rr = k % 2 ? r * 0.45 : r; s[k ? 'lineTo' : 'moveTo'](Math.cos(a) * rr, Math.sin(a) * rr); }
  const sg = new THREE.ShapeGeometry(s); sg.rotateX(-Math.PI / 2);
  return add(sg, M(col, { unlit: true }), x, y, z, p);
}

/* ---------- volcán y lava ---------- */
export function volcano(p, x, y, z, h = 30, r = 26) {
  const g = G(p, x, y, z);
  const rm = M(0x4a3a3c, { map: TX.rock });
  add(new THREE.CylinderGeometry(r * 0.22, r, h, 12, 3), rm, 0, h / 2, 0, g);
  add(new THREE.CylinderGeometry(r * 0.2, r * 0.2, 0.6, 12), M(0xff7a1a, { unlit: true }), 0, h + 0.1, 0, g);
  // ríos de lava que bajan por la ladera
  const lm = M(0xff8a2a, { unlit: true });
  [0.3, 2.1, 4.2].forEach((a) => {
    const rv = add(box(0.9, h * 1.02, 0.3), lm, Math.sin(a) * r * 0.6, h * 0.48, Math.cos(a) * r * 0.6, g);
    rv.rotation.set(Math.cos(a) * 0.62, 0, -Math.sin(a) * 0.62);
  });
  smoke(g, 0, h + 0.5, 0, 6, 3.2, 0x4a4248);
  return g;
}
// Pedazos de hielo que flotan en la lava, subiendo y bajando
export function iceFloes(p, y, rMin, rMax, n = 8) {
  const im = M(0xd8f2ff, { map: TX.ice }), sm = M(0xffffff, { map: TX.snow }), fs = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rnd(-0.3, 0.3), r = rnd(rMin, rMax), s = rnd(0.9, 2.2);
    const g = G(p, Math.sin(a) * r, y, Math.cos(a) * r, rnd(0, 6));
    add(new THREE.CylinderGeometry(s, s * 1.1, 0.6, 6), im, 0, 0, 0, g);
    add(new THREE.CylinderGeometry(s * 0.6, s * 0.8, 0.25, 6), sm, rnd(-0.2, 0.2), 0.4, rnd(-0.2, 0.2), g);
    fs.push({ g, ph: rnd(0, 6), y });
  }
  anim(p, (t) => fs.forEach((f) => { f.g.position.y = f.y + Math.sin(t * 0.9 + f.ph) * 0.18; f.g.rotation.z = Math.sin(t * 0.7 + f.ph) * 0.06; f.g.rotation.y += 0.0015; }));
}
// Nave de carga estacionada: casco, alas, cabina iluminada, motores que brillan, patas y luces que titilan
export function spaceship(p, x, y, z, ry = 0, s = 1) {
  const g = G(p, x, y, z, ry); g.scale.setScalar(s);
  const hull = M(0xc8ccd8, { map: TX.metal }), dark = M(0x3a3f4e, { map: TX.metal }), stripe = M(0xff9a1f, { map: TX.hazard, unlit: true });
  add(box(3.4, 2.2, 9), hull, 0, 2.6, 0, g);
  add(new THREE.CylinderGeometry(1.1, 1.7, 2.6, 8), hull, 0, 2.6, 5.6, g).rotation.x = Math.PI / 2;             // trompa
  add(box(2.4, 0.7, 1.6), M(0x6ff6ff, { unlit: true }), 0, 3.5, 5.0, g);                                        // cabina
  add(box(3.5, 0.3, 9.1), stripe, 0, 1.6, 0, g);
  [-1, 1].forEach((sx) => {
    const w = add(box(4.2, 0.3, 3.6), hull, sx * 3.6, 2.3, -1.2, g); w.rotation.z = sx * 0.12;
    add(box(0.5, 0.5, 1.2), M(sx < 0 ? 0xff3a2a : 0x39ff8a, { unlit: true }), sx * 5.6, 2.55, -1.2, g).userData.nav = true;
    add(new THREE.CylinderGeometry(0.12, 0.12, 2.1, 5), dark, sx * 1.4, 1.05, 2.6, g);                           // patas
    add(new THREE.CylinderGeometry(0.12, 0.12, 2.1, 5), dark, sx * 1.4, 1.05, -2.8, g);
    add(box(0.8, 0.12, 0.8), dark, sx * 1.4, 0.06, 2.6, g); add(box(0.8, 0.12, 0.8), dark, sx * 1.4, 0.06, -2.8, g);
  });
  [-0.9, 0.9].forEach((ex) => {
    add(new THREE.CylinderGeometry(0.75, 0.9, 1.4, 8), dark, ex, 2.6, -5.1, g).rotation.x = Math.PI / 2;
    const gl = add(new THREE.CylinderGeometry(0.6, 0.6, 0.12, 8), M(0x6fd8ff, { unlit: true }), ex, 2.6, -5.85, g); gl.rotation.x = Math.PI / 2;
  });
  add(box(1.6, 0.9, 2.2), dark, 0, 4.1, -2.0, g);                                                               // antena/radar arriba
  const blink = add(new THREE.SphereGeometry(0.2, 5, 4), M(0xffffff, { unlit: true }), 0, 4.8, -2.0, g);
  anim(g, (t) => { blink.visible = ((t * 2) | 0) % 2 === 0; });
  return g;
}
// Tanque de combustible esférico sobre patas
export function fuelTank(p, x, y, z, s = 1, col = 0xe8e8ee) {
  const g = G(p, x, y, z); g.scale.setScalar(s);
  add(new THREE.SphereGeometry(1.5, 10, 8), M(col, { map: TX.metal }), 0, 2.6, 0, g);
  add(new THREE.CylinderGeometry(1.52, 1.52, 0.3, 10), M(0xffffff, { map: TX.hazard, unlit: true }), 0, 2.6, 0, g);
  for (let k = 0; k < 4; k++) { const a = (k / 4) * Math.PI * 2 + 0.4; add(new THREE.CylinderGeometry(0.1, 0.12, 2.2, 5), M(0x5a6070, { map: TX.metal }), Math.sin(a) * 1.1, 1.1, Math.cos(a) * 1.1, g); }
  add(new THREE.CylinderGeometry(0.15, 0.15, 1.6, 5), M(0x8a92a6, { map: TX.metal }), 0, 4.4, 0, g);
  return g;
}
// Tira de luces que se prenden en secuencia (x1,z1 → x2,z2)
export function chaseLights(p, x1, y, z1, x2, z2, n = 12, col = 0x2de0c8, speed = 6) {
  const on = M(col, { unlit: true }), off = M(new THREE.Color(col).multiplyScalar(0.25).getHex(), { unlit: true }), ls = [];
  for (let i = 0; i < n; i++) { const f = n === 1 ? 0.5 : i / (n - 1); ls.push(add(box(0.22, 0.12, 0.22), off, x1 + (x2 - x1) * f, y, z1 + (z2 - z1) * f, p)); }
  anim(p, (t) => { const k = Math.floor(t * speed); ls.forEach((m, i) => { m.material = (i + k) % 4 === 0 ? on : off; }); });
  return ls;
}

// Erupción: piedras de lava que salen volando del cráter y caen hasta el pie del volcán (en loop)
export function eruption(p, x, y, z, fall = 24, n = 8, sp = 9) {
  const g = G(p, x, y, z), bm = M(0xff8a2a, { unlit: true }), hm = M(0xffe070, { unlit: true }), bs = [];
  for (let i = 0; i < n; i++) { const m = add(new THREE.DodecahedronGeometry(rnd(0.5, 1.1), 0), i % 3 ? bm : hm, 0, 0, 0, g); m.visible = false; bs.push({ m, wait: i * 0.4, fly: false, vx: 0, vy: 0, vz: 0 }); }
  anim(g, (t, dt) => {
    const d = Math.min(dt || 1 / 60, 0.05);
    bs.forEach((b) => {
      if (!b.fly) {
        b.wait -= d; if (b.wait > 0) return;
        b.fly = true; b.m.visible = true; b.m.position.set(0, 0, 0);
        b.vx = rnd(-0.5, 0.5) * sp; b.vz = rnd(-0.1, 0.6) * sp; b.vy = rnd(1.2, 1.9) * sp;
        return;
      }
      b.vy -= 16 * d; b.m.position.x += b.vx * d; b.m.position.y += b.vy * d; b.m.position.z += b.vz * d; b.m.rotation.x += d * 3;
      if (b.m.position.y < -fall) { b.fly = false; b.m.visible = false; b.wait = rnd(0.3, 2.5); }
    });
  });
  return g;
}
// Cascada de lava que cae por un acantilado
export function lavafall(p, x, y, z, ry = 0, h = 16, w = 3) {
  const g = G(p, x, y, z, ry), rm = M(0x3a2c2e, { map: TX.rock });
  add(box(w + 5, h + 2, 4), rm, 0, (h + 2) / 2, -2.4, g);                               // el acantilado
  add(new THREE.ConeGeometry(3.2, 4, 6), rm, -w / 2 - 2.2, h + 3.4, -2.2, g);
  add(new THREE.ConeGeometry(2.6, 3, 6), rm, w / 2 + 2, h + 2.9, -2.6, g);
  const fm = mat({ map: TX.magma, unlit: true });
  add(scaleUV(new THREE.PlaneGeometry(w, h + 1, 1, 4), 1, 4), fm, 0, (h + 1) / 2, -0.35, g);
  add(new THREE.CylinderGeometry(w * 0.9, w * 1.3, 0.5, 8), M(0xffc050, { unlit: true }), 0, 0.25, 0.4, g);   // donde cae, brilla
  smoke(g, 0, 0.6, 0.6, 4, 1.6, 0x5a3a30);
  anim(g, (t) => { fm.uniforms.uOff.value.set(0, (t * 0.6) % 1); });
  return g;
}
// Columnas de basalto hexagonales que salen de la lava (unas más altas que otras)
export function basalt(p, x, y, z, n = 7, r = 1.1, h0 = 4, h1 = 12) {
  const g = G(p, x, y, z), rm = M(0x4a3e44, { map: TX.rock }), tm = M(0x6a5a60, { map: TX.rock }), gm = M(0xff7a1a, { unlit: true });
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rnd(-0.3, 0.3), d = i === 0 ? 0 : rnd(r * 1.6, r * 2.6), h = rnd(h0, h1);
    const cx = Math.sin(a) * d, cz = Math.cos(a) * d;
    add(new THREE.CylinderGeometry(r, r, h, 6), rm, cx, h / 2, cz, g).rotation.y = rnd(0, 1);
    add(new THREE.CylinderGeometry(r * 0.98, r * 0.98, 0.12, 6), i % 2 ? tm : gm, cx, h + 0.06, cz, g);        // algunas con la punta al rojo
    if (i % 3 === 0) add(new THREE.CylinderGeometry(r * 1.02, r * 1.02, 0.18, 6), gm, cx, rnd(0.8, h * 0.4), cz, g);    // grieta que brilla
  }
  return g;
}
// Chorro de lava que sale cada tanto
export function geyser(p, x, y, z, period = 7, off = 0, h = 9) {
  const g = G(p, x, y, z);
  add(new THREE.CylinderGeometry(1.4, 1.8, 0.8, 8), M(0x3a2c2e, { map: TX.rock }), 0, 0.2, 0, g);
  const jet = add(new THREE.CylinderGeometry(0.45, 0.8, 1, 7), M(0xffa030, { unlit: true }), 0, 0.5, 0, g);
  const top = add(new THREE.DodecahedronGeometry(0.9, 0), M(0xffe070, { unlit: true }), 0, 1, 0, g);
  const drops = [];
  for (let i = 0; i < 6; i++) drops.push({ m: add(box(0.3, 0.3, 0.3), M(0xff7a1a, { unlit: true }), 0, 0, 0, g), a: (i / 6) * Math.PI * 2, v: rnd(2, 3.5) });
  anim(g, (t) => {
    const k = ((t + off) % period) / period, on = k < 0.28;
    const e = on ? Math.sin((k / 0.28) * Math.PI) : 0;
    jet.visible = top.visible = e > 0.02;
    jet.scale.set(1, Math.max(0.01, e * h), 1); jet.position.y = (e * h) / 2 + 0.3;
    top.position.y = e * h + 0.5; top.rotation.set(t * 3, t * 2, 0);
    drops.forEach((d) => {
      const f = on ? k / 0.28 : 0;
      d.m.visible = on && f > 0.3;
      const tt = (f - 0.3) * 2.2;
      d.m.position.set(Math.sin(d.a) * d.v * tt, e * h * 0.9 + tt * 4 - tt * tt * 9, Math.cos(d.a) * d.v * tt);
    });
  });
  return g;
}

/* ---------- espacio ---------- */
export function asteroids(p, n, rMin, rMax, yMin, yMax) {
  const rm = M(0x7a7078, { map: TX.rock }), as = [];
  for (let i = 0; i < n; i++) {
    const a = rnd(0, Math.PI * 2), r = rnd(rMin, rMax);
    const m = add(new THREE.DodecahedronGeometry(rnd(0.6, 2), 0), rm, Math.sin(a) * r, rnd(yMin, yMax), Math.cos(a) * r, p);
    as.push({ m, a, r, y: m.position.y, sp: rnd(0.005, 0.015) * (Math.random() < 0.5 ? -1 : 1), rs: rnd(0.2, 0.6) });
  }
  anim(p, (t) => as.forEach((q) => { const a = q.a + t * q.sp; q.m.position.set(Math.sin(a) * q.r, q.y + Math.sin(t * 0.3 + q.a) * 0.5, Math.cos(a) * q.r); q.m.rotation.set(t * q.rs, t * q.rs * 0.7, 0); }));
}
export function dish(p, x, y, z, ry = 0, s = 1) {
  const g = G(p, x, y, z, ry); g.scale.setScalar(s);
  const mm = M(0xd8dce6, { map: TX.metal });
  add(new THREE.CylinderGeometry(0.2, 0.35, 2.4, 6), mm, 0, 1.2, 0, g);
  const head = G(g, 0, 2.5, 0); head.rotation.x = -0.6;
  const d = new THREE.SphereGeometry(1.6, 10, 4, 0, Math.PI * 2, 0, Math.PI * 0.32); d.rotateX(Math.PI / 2);
  add(d, M(0xeef0f6, { map: TX.metal, side: THREE.DoubleSide }), 0, 0, 0, head);
  add(new THREE.CylinderGeometry(0.04, 0.04, 1.6, 4), mm, 0, 0, 0.8, head).rotation.x = Math.PI / 2;
  const blink = add(new THREE.SphereGeometry(0.14, 5, 4), M(0xff3a2a, { unlit: true }), 0, 0, 1.6, head);
  anim(g, (t) => { head.rotation.y = Math.sin(t * 0.2) * 0.8; blink.visible = ((t * 1.5) | 0) % 2 === 0; });
  return g;
}
export function container(p, x, y, z, ry = 0, col = 0xd8463a, len = 4) {
  const g = G(p, x, y, z, ry), m = M(col, { map: TX.metal });
  add(box(len, 1.6, 1.6), m, 0, 0.8, 0, g);
  const rib = M(new THREE.Color(col).multiplyScalar(0.7).getHex(), { map: TX.metal });
  for (let i = 0; i < Math.round(len / 0.5); i++) add(box(0.08, 1.5, 1.64), rib, -len / 2 + 0.25 + i * 0.5, 0.8, 0, g);
  add(box(0.06, 1.4, 1.5), M(0x2a2d36), len / 2 + 0.02, 0.8, 0, g);
  return g;
}
// Dron que da vueltas con una luz
export function drone(p, cx, cy, cz, r, sp = 0.4) {
  const g = G(p), bm = M(0x3a3f4a, { map: TX.metal }), pm = M(0xd8dce6);
  add(box(0.8, 0.3, 0.8), bm, 0, 0, 0, g);
  const props = [];
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => {
    add(box(0.5, 0.06, 0.08), bm, sx * 0.45, 0.05, sz * 0.45, g).rotation.y = Math.atan2(sx, sz);
    props.push(add(box(0.6, 0.02, 0.08), pm, sx * 0.62, 0.15, sz * 0.62, g));
  });
  const eye = add(box(0.2, 0.12, 0.05), M(0x35f0ff, { unlit: true }), 0, -0.05, 0.42, g);
  anim(g, (t) => {
    const a = t * sp;
    g.position.set(cx + Math.sin(a) * r, cy + Math.sin(t * 1.7) * 0.4, cz + Math.cos(a) * r);
    g.rotation.y = a + Math.PI / 2;
    props.forEach((q, i) => { q.rotation.y = t * 30 + i; });
    eye.visible = ((t * 2) | 0) % 3 !== 0;
  });
  return g;
}
// Estructura de vigas (reticulado) de a a b, con cruces
export function truss(p, x1, y1, z1, x2, y2, z2, w = 0.8, col = 0x6a7288) {
  const g = G(p), a = new THREE.Vector3(x1, y1, z1), b = new THREE.Vector3(x2, y2, z2), len = a.distanceTo(b);
  const m = M(col, { map: TX.metal }), q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
  const inner = new THREE.Group(); inner.position.copy(a).add(b).multiplyScalar(0.5); inner.quaternion.copy(q); g.add(inner);
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => add(box(0.12, len, 0.12), m, sx * w / 2, 0, sz * w / 2, inner));
  const n = Math.max(1, Math.round(len / w));
  for (let i = 0; i < n; i++) {
    const yy = -len / 2 + (i + 0.5) * (len / n);
    const d = add(box(0.07, Math.hypot(w, len / n), 0.07), m, 0, yy, w / 2, inner); d.rotation.z = Math.atan2(w, len / n) * (i % 2 ? 1 : -1);
    const d2 = add(box(0.07, Math.hypot(w, len / n), 0.07), m, 0, yy, -w / 2, inner); d2.rotation.z = -d.rotation.z;
  }
  return g;
}

/* ---------- plaza, fábrica, desierto, nieve ---------- */
export function bench(p, x, y, z, ry = 0) {
  const g = G(p, x, y, z, ry), wm = M(0xa06a3a, { map: TX.wood }), im = M(0x2a2d36);
  add(box(1.8, 0.1, 0.5), wm, 0, 0.5, 0, g);
  add(box(1.8, 0.45, 0.08), wm, 0, 0.8, -0.24, g).rotation.x = -0.12;
  [-0.75, 0.75].forEach((sx) => { add(box(0.08, 0.5, 0.45), im, sx, 0.25, 0, g); add(box(0.08, 0.6, 0.08), im, sx, 0.75, -0.25, g); });
  return g;
}
export function stones(p, pts, col = 0xb8b4ae) {
  const sm = M(col, { map: TX.stone });
  pts.forEach(([x, z, y = 0]) => { const s = add(new THREE.CylinderGeometry(0.42, 0.46, 0.1, 7), sm, x, y + 0.05, z, p); s.rotation.y = rnd(0, 3); s.scale.set(rnd(0.8, 1.1), 1, rnd(0.7, 1)); });
}
export function birdbath(p, x, y, z) {
  const g = G(p, x, y, z), sm = M(0xd8d2c8, { map: TX.stone });
  add(new THREE.CylinderGeometry(0.2, 0.32, 0.9, 7), sm, 0, 0.45, 0, g);
  add(new THREE.CylinderGeometry(0.62, 0.4, 0.22, 9), sm, 0, 1.0, 0, g);
  add(new THREE.CylinderGeometry(0.5, 0.5, 0.06, 9), M(0x8ad0ff, { map: TX.water, unlit: true }), 0, 1.1, 0, g);
  flyers(g, 0, 1.6, 0, 0.9, 2, 0x6a4a2a, 0.3);
  return g;
}
export function forklift(p, x, y, z, ry = 0) {
  const g = G(p, x, y, z, ry), ym = M(0xffc02a, { map: TX.metal }), dk = M(0x2a2d36), tire = M(0x15151a);
  add(box(1.4, 0.7, 2.0), ym, 0, 0.6, 0, g);
  add(box(1.3, 0.6, 0.6), dk, 0, 1.2, -0.6, g);                             // contrapeso
  [[-0.6, -0.65], [0.6, -0.65], [-0.6, 0.6], [0.6, 0.6]].forEach(([sx, sz]) => { const w = add(new THREE.CylinderGeometry(0.3, 0.3, 0.25, 8), tire, sx, 0.3, sz, g); w.rotation.z = Math.PI / 2; });
  [-0.55, 0.55].forEach((sx) => add(box(0.08, 2.2, 0.08), dk, sx, 1.6, 0.2, g));
  add(box(1.2, 0.08, 1.4), dk, 0, 2.7, 0.1, g);                             // techito
  [-0.5, 0.5].forEach((sx) => add(box(0.08, 2.4, 0.08), dk, sx, 1.4, 1.05, g));  // mástil
  const fk = G(g, 0, 0.35, 1.2);
  [-0.35, 0.35].forEach((sx) => add(box(0.12, 0.06, 1.0), M(0x8a92a6, { map: TX.metal }), sx, 0, 0.45, fk));
  add(box(1.0, 0.8, 1.0), M(0xffffff, { map: TX.crate }), 0, 0.45, 0.45, fk);
  anim(g, (t) => { fk.position.y = 0.35 + (Math.sin(t * 0.5) * 0.5 + 0.5) * 1.2; });
  return g;
}
export function fan(p, x, y, z, ry = 0, r = 1.2) {
  const g = G(p, x, y, z, ry), mm = M(0x5a6070, { map: TX.metal });
  add(box(r * 2.3, r * 2.3, 0.3), mm, 0, 0, 0, g);
  add(new THREE.CylinderGeometry(r * 1.02, r * 1.02, 0.34, 12), M(0x15171d), 0, 0, 0.02, g).rotation.x = Math.PI / 2;
  const rot = G(g, 0, 0, 0.2);
  for (let k = 0; k < 4; k++) add(box(0.3, r * 0.95, 0.05), M(0xc8ced8, { map: TX.metal }), 0, r * 0.47, 0, G(rot, 0, 0, 0, 0)).parent.rotation.z = (k * Math.PI) / 2;
  anim(g, (t) => { rot.rotation.z = t * 6; });
  return g;
}
export function warnSign(p, x, y, z, ry = 0) {
  const g = G(p, x, y, z, ry);
  add(box(0.1, 1.4, 0.1), M(0x5a6070), 0, 0.7, 0, g);
  const tg = new THREE.CylinderGeometry(0.62, 0.62, 0.06, 3); tg.rotateX(Math.PI / 2);
  add(tg, M(0xffc02a, { unlit: true }), 0, 1.55, 0.06, g);
  add(box(0.08, 0.34, 0.02), M(0x15151a), 0, 1.55, 0.1, g);
  add(box(0.08, 0.08, 0.02), M(0x15151a), 0, 1.3, 0.1, g);
  return g;
}
export function pallets(p, x, y, z, n = 3) {
  const g = G(p, x, y, z, rnd(0, 6)), wm = M(0xb88a52, { map: TX.wood });
  for (let i = 0; i < n; i++) {
    add(box(1.4, 0.08, 1.2), wm, 0, 0.12 + i * 0.24, 0, g);
    [-0.5, 0, 0.5].forEach((sz) => add(box(1.4, 0.12, 0.14), wm, 0, 0.04 + i * 0.24, sz, g));
  }
  return g;
}
export function mesa(p, x, y, z, w, h, d, col = 0xc8703a) {
  const g = G(p, x, y, z, rnd(0, 6)), rm = M(col, { map: TX.pebble }), rm2 = M(new THREE.Color(col).multiplyScalar(0.8).getHex(), { map: TX.pebble });
  add(new THREE.CylinderGeometry(w * 0.42, w * 0.52, h, 7), rm, 0, h / 2, 0, g).scale.z = d / w;
  add(new THREE.CylinderGeometry(w * 0.44, w * 0.42, h * 0.12, 7), rm2, 0, h * 0.94, 0, g).scale.z = d / w;
  add(new THREE.CylinderGeometry(w * 0.55, w * 0.6, h * 0.15, 7), rm2, 0, h * 0.07, 0, g).scale.z = d / w;
  return g;
}
export function torch(p, x, y, z, h = 1.8) {
  const g = G(p, x, y, z);
  add(new THREE.CylinderGeometry(0.08, 0.1, h, 5), M(0x6b4a2a, { map: TX.wood }), 0, h / 2, 0, g);
  add(new THREE.CylinderGeometry(0.18, 0.1, 0.25, 6), M(0x3a2a1a), 0, h + 0.05, 0, g);
  const f1 = add(new THREE.ConeGeometry(0.16, 0.5, 5), M(0xffa030, { unlit: true }), 0, h + 0.4, 0, g);
  const f2 = add(new THREE.ConeGeometry(0.09, 0.32, 5), M(0xffe070, { unlit: true }), 0, h + 0.32, 0, g);
  const ph = rnd(0, 6);
  anim(g, (t) => { const k = 1 + Math.sin(t * 13 + ph) * 0.15 + Math.sin(t * 7.3 + ph) * 0.1; f1.scale.set(1, k, 1); f2.scale.set(1, 2 - k, 1); f1.rotation.y = t * 2; });
  return g;
}
export function lantern(p, x, y, z, h = 2.2, col = 0xffd27a) {
  const g = G(p, x, y, z), pm = M(0x2a2d36, { map: TX.metal });
  add(new THREE.CylinderGeometry(0.07, 0.09, h, 5), pm, 0, h / 2, 0, g);
  add(box(0.5, 0.06, 0.08), pm, 0.2, h - 0.05, 0, g);
  add(box(0.28, 0.36, 0.28), M(col, { unlit: true }), 0.38, h - 0.35, 0, g);
  add(new THREE.ConeGeometry(0.26, 0.18, 4), pm, 0.38, h - 0.1, 0, g).rotation.y = Math.PI / 4;
  return g;
}
export function sled(p, x, y, z, ry = 0) {
  const g = G(p, x, y, z, ry), wm = M(0xc0463a, { map: TX.wood }), rm = M(0x8a92a6, { map: TX.metal });
  add(box(0.8, 0.1, 1.6), wm, 0, 0.35, 0, g);
  [-0.35, 0.35].forEach((sx) => { add(box(0.06, 0.06, 1.8), rm, sx, 0.08, 0, g); add(box(0.06, 0.3, 0.06), rm, sx, 0.2, -0.5, g); add(box(0.06, 0.3, 0.06), rm, sx, 0.2, 0.5, g); });
  add(box(0.06, 0.06, 0.4), rm, 0, 0.2, 0.95, g).rotation.x = 0.8;
  return g;
}
export function frozenPond(p, x, y, z, r = 2.5) {
  const g = G(p, x, y, z);
  add(new THREE.CylinderGeometry(r + 0.3, r + 0.4, 0.2, 10), M(0xf4f8ff, { map: TX.snow }), 0, 0.1, 0, g);
  const im = M(0xa8dcff, { map: TX.ice });
  add(new THREE.CylinderGeometry(r, r, 0.22, 10), im, 0, 0.12, 0, g);
  const sp = add(box(0.18, 0.02, 0.18), M(0xffffff, { unlit: true }), 0, 0.25, 0, g);
  anim(g, (t) => { const k = (t * 0.4) % 1; sp.position.set(Math.sin(t) * r * 0.6, 0.25, Math.cos(t * 0.7) * r * 0.5); sp.scale.setScalar(k < 0.5 ? k * 4 : (1 - k) * 4); });
  return g;
}
export function snowPile(p, x, y, z, s = 1) {
  const sm = M(0xf4f8ff, { map: TX.snow });
  const m = add(new THREE.SphereGeometry(s, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2), sm, x, y, z, p); m.scale.set(1, 0.4, rnd(0.7, 1.1)); m.rotation.y = rnd(0, 3);
  return m;
}
// Piedritas o cosas chicas desparramadas (instanciadas)
export function scatter(p, cx, y, cz, rx, rz, n, col, size = 0.2, avoid = null) {
  const im = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(size, 0), M(col, { map: TX.pebble }), n);
  const m4 = new THREE.Matrix4();
  let k = 0;
  for (let i = 0; i < n * 3 && k < n; i++) {
    const x = cx + rnd(-rx, rx), z = cz + rnd(-rz, rz);
    if (avoid && Math.abs(x) < avoid[0] && Math.abs(z) < avoid[1]) continue;
    m4.makeRotationY(rnd(0, 3)).setPosition(x, y + size * 0.3, z); im.setMatrixAt(k++, m4);
  }
  im.count = k; p.add(im);
  return im;
}

/* ---------- fiesta ---------- */
export function balloons(p, cx, cy, cz, r, n = 6) {
  const cols = [0xff5a7a, 0xffe14a, 0x4a8cff, 0x39d98a, 0xb07aff, 0xff9a1f], bs = [];
  for (let i = 0; i < n; i++) {
    const g = G(p);
    add(new THREE.SphereGeometry(0.6, 8, 6), M(cols[i % cols.length]), 0, 0, 0, g).scale.y = 1.2;
    add(new THREE.CylinderGeometry(0.02, 0.02, 1.6, 3), M(0xffffff), 0, -1.5, 0, g);
    bs.push({ g, a: (i / n) * Math.PI * 2, rr: r * rnd(0.6, 1.1), h: rnd(0, 3), ph: rnd(0, 6) });
  }
  anim(p, (t) => bs.forEach((b) => { const a = b.a + t * 0.05; b.g.position.set(cx + Math.sin(a) * b.rr, cy + b.h + Math.sin(t * 0.8 + b.ph) * 0.5, cz + Math.cos(a) * b.rr); b.g.rotation.z = Math.sin(t + b.ph) * 0.15; }));
}
// Guirnalda de banderines entre dos puntos
export function bunting(p, x1, y1, z1, x2, y2, z2, n = 9) {
  const g = G(p), cols = [0xff5a4a, 0xffe14a, 0x4a8cff, 0x39d98a, 0xffffff], ang = Math.atan2(x2 - x1, z2 - z1);
  const len = Math.hypot(x2 - x1, z2 - z1);
  const c = add(box(0.03, 0.03, len), M(0xf0e8d6), (x1 + x2) / 2, (y1 + y2) / 2 - 0.2, (z1 + z2) / 2, g); c.rotation.y = ang;
  for (let i = 1; i < n; i++) {
    const f = i / n, sag = Math.sin(f * Math.PI) * 0.6;
    const tg = new THREE.ConeGeometry(0.22, 0.45, 3); tg.rotateX(Math.PI);
    const m = add(tg, M(cols[i % cols.length]), x1 + (x2 - x1) * f, y1 + (y2 - y1) * f - sag - 0.4, z1 + (z2 - z1) * f, g);
    m.rotation.y = ang; m.scale.z = 0.25;
  }
  return g;
}
export function arch(p, x, y, z, ry = 0, w = 3.2, h = 3.2) {
  const g = G(p, x, y, z, ry), pm = M(0xffffff, { map: TX.stripes });
  [-1, 1].forEach((sx) => add(new THREE.CylinderGeometry(0.16, 0.2, h, 6), pm, sx * w / 2, h / 2, 0, g));
  const top = new THREE.TorusGeometry(w / 2, 0.18, 5, 12, Math.PI);
  add(top, pm, 0, h, 0, g);
  add(box(w * 0.7, 0.55, 0.12), M(0xff9a1f, { unlit: true }), 0, h + w / 2 - 0.2, 0.1, g);
  balloons(g, 0, h - 0.5, 0, w * 0.55, 4);
  return g;
}
