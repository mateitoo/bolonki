// Decorado de los mapas nuevos de Bola Brava (FERIA, PLAYA, TERRAZA). La arena es la misma (piso de 20×20 con
// torres en las esquinas); cada mapa cambia las texturas de la arena (bolas.js), el piso de afuera y todo esto
// de alrededor. El suelo de afuera está a y = -2.2 (ver world/arena.js).
import * as THREE from 'three';
import { add, scaleUV, mat } from '../render/psx.js';
import { TX } from '../render/textures.js';
import { rnd } from '../config.js';
import * as P from './props.js';

const Y = -2.2;
const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const grp = (p, x = 0, y = 0, z = 0, ry = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; p.add(g); return g; };
const ry0 = (x, z) => Math.atan2(-x, -z);            // girado mirando al centro de la arena

/* =====================================================================
   FERIA: parque de diversiones de pueblo, de noche
   ===================================================================== */
function ferrisWheel(p, x, z, r = 9) {
  const g = grp(p, x, Y, z, ry0(x, z));
  const fm = P.M(0xe8e8f0, { map: TX.metal });
  // patas en A
  [-1, 1].forEach((sd) => {
    [-1, 1].forEach((sx) => {
      const leg = add(box(0.35, r + 2.6, 0.35), fm, sx * 2.6, (r + 2.6) / 2, sd * 1.1, g);
      leg.rotation.z = sx * -0.24;
    });
  });
  add(new THREE.CylinderGeometry(0.3, 0.3, 2.8, 8), fm, 0, r + 1.6, 0, g).rotation.x = Math.PI / 2;
  const wheel = grp(g, 0, r + 1.6, 0);
  const rimG = new THREE.TorusGeometry(r, 0.14, 4, 32);
  add(rimG, P.M(0xff5fa2, { unlit: true }), 0, 0, 0.9, wheel); add(rimG, P.M(0xff5fa2, { unlit: true }), 0, 0, -0.9, wheel);
  add(new THREE.TorusGeometry(r * 0.55, 0.1, 4, 24), P.M(0x2de0c8, { unlit: true }), 0, 0, 0, wheel);
  const N = 10, cols = [0xff5a4a, 0xffe14a, 0x4a8cff, 0x39d98a, 0xb07aff];
  const cabs = [];
  for (let k = 0; k < N; k++) {
    const a = (k / N) * Math.PI * 2;
    const sp = add(box(0.12, r, 0.12), fm, Math.sin(a) * r / 2, Math.cos(a) * r / 2, 0, wheel); sp.rotation.z = -a;
    // foquitos en el aro
    for (let j = 0; j < 3; j++) { const b = a + (j / 3) * (Math.PI * 2 / N); add(box(0.3, 0.3, 0.3), P.M(j % 2 ? 0xffe07a : 0xffffff, { unlit: true }), Math.sin(b) * r, Math.cos(b) * r, 1.0, wheel); }
    const cab = grp(wheel, Math.sin(a) * r, Math.cos(a) * r, 0);
    add(box(1.3, 1.0, 1.3), P.M(cols[k % cols.length], { map: TX.metal }), 0, -0.9, 0, cab);
    add(new THREE.ConeGeometry(0.95, 0.5, 4), P.M(0xffffff), 0, -0.15, 0, cab).rotation.y = Math.PI / 4;
    cabs.push(cab);
  }
  P.anim(g, (t) => { wheel.rotation.z = t * 0.18; cabs.forEach((c) => { c.rotation.z = -t * 0.18; }); });
}
function tent(p, x, z, r = 3.2, h = 3.5, a = 0xe8303a, b = 0xfff4e6) {
  const g = grp(p, x, Y, z, rnd(0, 6));
  const n = 10;
  for (let k = 0; k < n; k++) {
    const wall = new THREE.CylinderGeometry(r, r, h * 0.55, n, 1, true, (k / n) * Math.PI * 2, (Math.PI * 2) / n);
    add(wall, P.M(k % 2 ? a : b, { side: THREE.DoubleSide }), 0, h * 0.275, 0, g);
    const roof = new THREE.ConeGeometry(r * 1.12, h * 0.6, n, 1, true, (k / n) * Math.PI * 2, (Math.PI * 2) / n);
    add(roof, P.M(k % 2 ? b : a, { side: THREE.DoubleSide }), 0, h * 0.85, 0, g);
  }
  add(new THREE.CylinderGeometry(0.06, 0.06, 1.2, 4), P.M(0x6b4a2a), 0, h * 1.3, 0, g);
  P.flag(g, 0, h * 1.15, 0, 0.9, 0xffe14a);
  add(box(1.3, 1.8, 0.05), P.M(0x1a0c10), 0, 0.9, r + 0.01, g);            // entrada
}
function stand(p, x, z, col = 0x4a8cff, sign = 0xffe14a) {
  const g = grp(p, x, Y, z, ry0(x, z));
  const wm = P.M(0xd8b890, { map: TX.wood });
  add(box(3.6, 1.1, 1.6), wm, 0, 0.55, 0, g);
  [-1.7, 1.7].forEach((sx) => add(box(0.14, 2.6, 0.14), wm, sx, 1.4, 0.7, g));
  for (let k = 0; k < 6; k++) add(box(0.62, 0.12, 1.9), P.M(k % 2 ? col : 0xffffff), -1.55 + k * 0.62, 2.75, 0.1, g).rotation.x = -0.25;
  add(box(2.6, 0.6, 0.08), P.M(sign, { unlit: true }), 0, 3.35, 0.35, g);
  for (let k = 0; k < 4; k++) add(new THREE.SphereGeometry(0.2, 6, 4), P.M([0xff5a7a, 0xffe14a, 0x39d98a, 0xffffff][k], { unlit: true }), -1.1 + k * 0.72, 1.25, 0.4, g);
}
function bulbs(p, pts, y, n = 8) {                    // guirnalda de lamparitas colgando entre postes
  const on = [0xffe07a, 0xff5fa2, 0x2de0c8, 0xffffff].map((c) => P.M(c, { unlit: true }));
  const pm = P.M(0x3a3f4a, { map: TX.metal });
  pts.forEach(([x, z]) => add(new THREE.CylinderGeometry(0.08, 0.1, y - Y, 5), pm, x, (y + Y) / 2, z, p));
  const ls = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const [x1, z1] = pts[i], [x2, z2] = pts[i + 1];
    for (let k = 1; k < n; k++) {
      const f = k / n, sag = Math.sin(f * Math.PI) * 0.9;
      ls.push(add(box(0.22, 0.22, 0.22), on[(i + k) % on.length], x1 + (x2 - x1) * f, y - sag, z1 + (z2 - z1) * f, p));
    }
  }
  P.anim(p, (t) => { const s = Math.floor(t * 3); ls.forEach((m, i) => { m.visible = (i + s) % 5 !== 0; }); });
}
export function decorFeria(g) {
  P.sky(g, [[0, '#0a0620'], [0.36, '#2a1248'], [0.47, '#5a2a6a'], [0.52, '#20102c'], [1, '#08040e']], { stars: 70, starBand: 0.38 });
  ferrisWheel(g, -26, -30, 10);
  tent(g, 27, -26, 4, 4.4); tent(g, 34, -6, 3.2, 3.6, 0x3a7aff, 0xffffff); tent(g, -33, 4, 3.4, 3.8, 0x39d98a, 0xfff4e6);
  tent(g, 26, 24, 3.4, 3.8, 0xb07aff, 0xffffff); tent(g, -24, 26, 3.8, 4.0);
  stand(g, 0, -27, 0xff5a4a); stand(g, 22, -14, 0x39d98a, 0xff9a1f); stand(g, -22, 14, 0xffe14a, 0x2de0c8); stand(g, 11, 27, 0x4a8cff);
  bulbs(g, [[-20, -19], [-8, -20], [8, -20], [20, -19]], 3.2, 9);
  bulbs(g, [[19, -20], [20, -8], [20, 8], [19, 20]], 3.2, 9);
  bulbs(g, [[-19, 20], [-20, 8], [-20, -8], [-19, -20]], 3.2, 9);
  bulbs(g, [[-20, 19], [-8, 20], [8, 20], [20, 19]], 3.2, 9);
  P.balloons(g, 30, 2, 12, 5, 7); P.balloons(g, -30, 2, -16, 5, 6);
  [[-16, -24], [16, -24], [-26, -12], [26, 12], [-16, 26], [16, 26]].forEach(([x, z]) => P.lamp(g, x, Y, z, 3.4, 0xffd27a));
  P.scatter(g, 0, Y + 0.01, 0, 44, 44, 160, 0xff5fa2, 0.14, [16, 16]);     // papelitos
  P.scatter(g, 0, Y + 0.01, 0, 44, 44, 160, 0xffe14a, 0.14, [16, 16]);
}

/* =====================================================================
   PLAYA: al atardecer, con el mar alrededor
   ===================================================================== */
function umbrella(p, x, z, a = 0xff5a4a, b = 0xffffff) {
  const g = grp(p, x, Y, z, rnd(0, 6));
  add(new THREE.CylinderGeometry(0.06, 0.06, 2.6, 5), P.M(0xe8e8e8), 0, 1.3, 0, g).rotation.z = 0.12;
  const n = 8;
  for (let k = 0; k < n; k++) add(new THREE.ConeGeometry(1.7, 0.6, n, 1, true, (k / n) * Math.PI * 2, (Math.PI * 2) / n), P.M(k % 2 ? a : b, { side: THREE.DoubleSide }), 0.15, 2.55, 0, g);
  const tw = add(box(1.0, 0.04, 1.9), P.M([0x3a7aff, 0xffe14a, 0x39d98a, 0xff5fa2][(Math.random() * 4) | 0]), 1.2, 0.03, 0.4, g); tw.rotation.y = 0.3;
}
function lifeguardChair(p, x, z) {
  const g = grp(p, x, Y, z, ry0(x, z));
  const wm = P.M(0xf4f4ee, { map: TX.wood });
  [[-0.8, -0.6], [0.8, -0.6], [-0.8, 0.6], [0.8, 0.6]].forEach(([a, b]) => add(box(0.18, 3, 0.18), wm, a, 1.5, b, g));
  add(box(1.9, 0.14, 1.5), wm, 0, 3, 0, g);
  add(box(1.9, 1.2, 0.12), P.M(0xe83a3a), 0, 3.6, -0.7, g);
  add(box(1.4, 0.3, 0.06), P.M(0xffffff, { unlit: true }), 0, 3.7, -0.62, g);
  add(new THREE.ConeGeometry(1.5, 0.8, 4), P.M(0xe83a3a), 0, 4.8, 0, g).rotation.y = Math.PI / 4;
  add(new THREE.CylinderGeometry(0.05, 0.05, 1.2, 4), wm, 0, 4.0, 0, g);
  P.flag(g, 0.9, 3, 0.7, 2.2, 0xffe14a);
}
function sandcastle(p, x, z, s = 1) {
  const g = grp(p, x, Y, z, rnd(0, 6)); g.scale.setScalar(s);
  const sm = P.M(0xe8c888, { map: TX.sand });
  add(box(2.2, 0.8, 2.2), sm, 0, 0.4, 0, g);
  [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([a, b]) => { add(new THREE.CylinderGeometry(0.42, 0.5, 1.4, 6), sm, a, 0.7, b, g); add(new THREE.ConeGeometry(0.5, 0.6, 6), sm, a, 1.7, b, g); });
  add(new THREE.CylinderGeometry(0.6, 0.7, 1.6, 6), sm, 0, 1.4, 0, g);
  P.flag(g, 0, 2.2, 0, 0.8, 0xff5a4a);
}
function boat(p, x, z, ry) {
  const g = grp(p, x, -2.45, z, ry);
  add(box(1.6, 0.6, 4.2), P.M(0xffffff, { map: TX.wood }), 0, 0.2, 0, g);
  add(box(1.7, 0.2, 4.3), P.M(0x3a7aff), 0, -0.05, 0, g);
  add(new THREE.CylinderGeometry(0.06, 0.06, 3.6, 4), P.M(0x9a7448), 0, 2.2, 0, g);
  const sail = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0.5, 0.1), new THREE.Vector3(0, 3.8, 0.1), new THREE.Vector3(0, 0.6, 1.9)]);
  sail.computeVertexNormals();
  add(sail, P.M(0xfff4e6, { side: THREE.DoubleSide }), 0, 0, 0, g);
  P.anim(g, (t) => { g.position.y = -2.45 + Math.sin(t * 1.3 + x) * 0.08; g.rotation.z = Math.sin(t * 0.9 + z) * 0.05; });
}
// Gaviotas: cuerpo, cabeza con pico naranja, cola y alas en dos tramos (forma de "M") que planean y aletean
function seagulls(p, cx, cy, cz, r, n = 4) {
  const wm = P.M(0xffffff), gm = P.M(0xb8c0cc), km = P.M(0x1a1a22), bm = P.M(0xffa01a);
  const gs = [];
  for (let i = 0; i < n; i++) {
    const g = grp(p); g.scale.setScalar(1.25);
    const b = add(new THREE.SphereGeometry(0.32, 7, 5), wm, 0, 0, 0, g); b.scale.set(0.8, 0.7, 1.7);
    add(new THREE.SphereGeometry(0.2, 6, 5), wm, 0, 0.12, 0.55, g);
    add(new THREE.ConeGeometry(0.07, 0.26, 4), bm, 0, 0.1, 0.8, g).rotation.x = Math.PI / 2;
    add(new THREE.BoxGeometry(0.02, 0.05, 0.05), km, 0.12, 0.17, 0.62, g); add(new THREE.BoxGeometry(0.02, 0.05, 0.05), km, -0.12, 0.17, 0.62, g);
    add(box(0.3, 0.05, 0.35), gm, 0, 0, -0.62, g);
    const wings = [-1, 1].map((sd) => {
      const inner = grp(g, sd * 0.18, 0.06, 0);
      add(box(0.9, 0.05, 0.5), gm, sd * 0.45, 0, 0, inner);
      const outer = grp(inner, sd * 0.9, 0, 0);
      add(box(0.85, 0.04, 0.38), gm, sd * 0.42, 0, -0.04, outer);
      add(box(0.3, 0.045, 0.3), km, sd * 0.78, 0, -0.08, outer);          // puntas negras
      return { inner, outer, sd };
    });
    gs.push({ g, wings, ph: (i / n) * Math.PI * 2, rr: r * rnd(0.6, 1.1), hh: rnd(-1.5, 1.5), sp: rnd(0.14, 0.22) * (i % 2 ? 1 : -1) });
  }
  P.anim(p, (t) => gs.forEach((q) => {
    const a = t * q.sp + q.ph;
    q.g.position.set(cx + Math.sin(a) * q.rr, cy + q.hh + Math.sin(t * 0.7 + q.ph) * 0.8, cz + Math.cos(a) * q.rr);
    q.g.rotation.y = a + (q.sp > 0 ? Math.PI / 2 : -Math.PI / 2);
    q.g.rotation.z = (q.sp > 0 ? -1 : 1) * 0.25;                               // se inclina en la curva
    const flapping = Math.sin(t * 0.5 + q.ph) > 0.2;                            // a ratos aletea, a ratos planea
    const f = flapping ? Math.sin(t * 9 + q.ph) * 0.6 : 0.12;
    q.wings.forEach((w) => { w.inner.rotation.z = w.sd * f; w.outer.rotation.z = w.sd * (flapping ? -f * 0.7 : -0.28); });
  }));
}
function parador(p, x, z) {                                    // bar de playa con techo de paja
  const g = grp(p, x, Y, z, ry0(x, z));
  const wm = P.M(0xb8905a, { map: TX.wood }), straw = P.M(0xd8b060, { map: TX.leaf });
  [[-2.2, -1.4], [2.2, -1.4], [-2.2, 1.4], [2.2, 1.4]].forEach(([a, b]) => add(box(0.22, 3, 0.22), wm, a, 1.5, b, g));
  const rf = new THREE.ConeGeometry(3.6, 1.6, 4); rf.rotateY(Math.PI / 4);
  add(rf, straw, 0, 3.7, 0, g).scale.set(1, 1, 0.75);
  add(box(4, 1.1, 0.5), P.M(0x3aa8e0, { map: TX.wood }), 0, 0.55, 1.1, g);
  add(box(4.2, 0.12, 0.8), wm, 0, 1.15, 1.1, g);
  add(box(2.6, 0.55, 0.08), P.M(0xff5fa2, { unlit: true }), 0, 2.6, 1.42, g);
  [-1.4, 0, 1.4].forEach((sx) => { add(new THREE.CylinderGeometry(0.25, 0.25, 0.08, 8), P.M(0xffe14a), sx, 0.8, 2.0, g); add(new THREE.CylinderGeometry(0.05, 0.05, 0.8, 4), wm, sx, 0.4, 2.0, g); });
  for (let k = 0; k < 5; k++) add(new THREE.CylinderGeometry(0.08, 0.08, 0.3, 5), P.M([0x39d98a, 0xff9a1f, 0xffffff, 0xff5a4a, 0x3a7aff][k]), -1.4 + k * 0.7, 1.35, 1.0, g);
}
function surfboards(p, x, z) {
  const g = grp(p, x, Y, z, rnd(0, 6));
  [[0xff5a4a, -0.6], [0x39d98a, 0], [0xffe14a, 0.6]].forEach(([c, dx], k) => {
    const b = add(new THREE.SphereGeometry(0.5, 8, 5), P.M(c), dx, 1.1, 0, g); b.scale.set(0.8, 2.4, 0.12); b.rotation.z = (k - 1) * 0.12;
  });
}
function beachKit(p, x, z) {                                   // heladerita, balde y pala, reposera
  const g = grp(p, x, Y, z, rnd(0, 6));
  add(box(0.9, 0.6, 0.6), P.M(0x3a7aff), 0, 0.3, 0, g); add(box(0.95, 0.12, 0.65), P.M(0xffffff), 0, 0.66, 0, g);
  add(new THREE.CylinderGeometry(0.28, 0.2, 0.45, 8), P.M(0xff5a4a), 1.1, 0.22, 0.3, g);
  const sh = add(box(0.12, 0.04, 0.8), P.M(0xffe14a), 1.4, 0.05, -0.2, g); sh.rotation.y = 0.6;
  const ch = grp(g, -1.4, 0, 0.6, 0.4);
  add(box(0.8, 0.06, 1.3), P.M(0xff9ac8, { map: TX.cloth }), 0, 0.35, 0, ch);
  add(box(0.8, 0.06, 0.9), P.M(0xff9ac8, { map: TX.cloth }), 0, 0.7, -0.85, ch).rotation.x = 0.9;
}
function starfish(p, x, z, col = 0xff7a3a) { P.floorStar(p, x, Y + 0.02, z, 0.35, col); }
function volleyNet(p, x, z) {
  const g = grp(p, x, Y, z, ry0(x, z) + Math.PI / 2);
  [-3.5, 3.5].forEach((sx) => add(new THREE.CylinderGeometry(0.08, 0.08, 2.6, 5), P.M(0xe8e8e8), sx, 1.3, 0, g));
  for (let k = 0; k < 5; k++) add(box(7, 0.03, 0.03), P.M(0x2a2a2a), 0, 1.6 + k * 0.18, 0, g);
  for (let k = 0; k < 14; k++) add(box(0.03, 0.75, 0.03), P.M(0x2a2a2a), -3.3 + k * 0.5, 1.95, 0, g);
  add(box(7, 0.1, 0.05), P.M(0xffffff), 0, 2.35, 0, g);
}
function kite(p, x, y, z) {                                    // barrilete volando, con la cola moviéndose
  const g = grp(p, x, y, z);
  const d = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 1, 0), new THREE.Vector3(0.7, 0, 0), new THREE.Vector3(0, -1.2, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, -1.2, 0), new THREE.Vector3(-0.7, 0, 0)]);
  d.computeVertexNormals();
  const kg = grp(g); add(d, P.M(0xff5fa2, { side: THREE.DoubleSide }), 0, 0, 0, kg);
  const tail = [];
  for (let k = 0; k < 6; k++) tail.push(add(box(0.25, 0.12, 0.05), P.M([0xffe14a, 0x2de0c8][k % 2]), 0, -1.5 - k * 0.45, 0, kg));
  P.anim(g, (t) => { kg.rotation.z = Math.sin(t * 0.9) * 0.3; kg.position.y = Math.sin(t * 0.6) * 0.8; tail.forEach((q, k) => { q.position.x = Math.sin(t * 3 - k * 0.7) * 0.25 * (k + 1) * 0.4; }); });
}
function shoreRocks(p, pts) { pts.forEach(([x, z, s]) => P.rock(p, x, -2.55, z, s, 0x7a7068)); }

export function decorPlaya(g) {
  P.sky(g, [[0, '#23204f'], [0.3, '#7a3a78'], [0.42, '#e8667a'], [0.49, '#ffb25a'], [0.52, '#ffd88a'], [0.56, '#5a4a7a'], [1, '#1a2040']], { stars: 16, starBand: 0.2 });
  // sol que se hunde en el mar
  const sun = add(new THREE.CircleGeometry(12, 20), new THREE.MeshBasicMaterial({ color: 0xffd05a, fog: false }), 0, 4, -104, g);
  sun.renderOrder = -9;
  // el mar: un plano grande que se mueve
  const wg = scaleUV(new THREE.PlaneGeometry(260, 260, 20, 20), 40); wg.rotateX(-Math.PI / 2);
  const sea = add(wg, mat({ map: TX.water, color: 0x4a9ac8 }), 0, -2.6, 0, g);
  P.anim(g, (t) => { sea.material.uniforms.uOff.value.set((t * 0.02) % 1, (t * 0.035) % 1); });
  // espuma en la orilla (alrededor de la arena de la playa, que mide ±31)
  const E = 31.5;
  [[0, -E, 2 * E + 2, 1], [0, E, 2 * E + 2, 1], [-E, 0, 1, 2 * E], [E, 0, 1, 2 * E]].forEach(([x, z, w, d], k) => {
    const fm = add(box(w, 0.05, d), P.M(0xffffff, { unlit: true }), x, -2.52, z, g);
    P.anim(fm, (t) => { const s = 1 + Math.sin(t * 1.4 + k) * 0.5; fm.scale.set(w > 2 ? 1 : 1 + s, 1, d > 2 ? 1 : 1 + s); });
  });
  [[-24, -22], [-28, -6], [24, -24], [28, 10], [-26, 22], [22, 26], [8, -28], [-10, 28]].forEach(([x, z], k) => P.palm(g, x, Y, z, 1.3 + (k % 3) * 0.2));
  [[-17, -17, 0xff5a4a], [18, -18, 0x3a7aff], [19, 16, 0xffe14a], [-18, 18, 0x39d98a], [-6, -22, 0xff5fa2], [22, 2, 0xff9a1f], [-22, -2, 0x3a7aff], [4, 22, 0xff5a4a]].forEach(([x, z, c]) => umbrella(g, x, z, c));
  lifeguardChair(g, 0, -24); lifeguardChair(g, 24, 0);
  sandcastle(g, -12, 24, 1.2); sandcastle(g, 26, -12, 0.9);
  boat(g, -40, -44, 0.6); boat(g, 44, -30, -0.4); boat(g, 12, 48, 1.2);
  seagulls(g, 0, 11, -6, 24, 5);
  parador(g, -26, -14); surfboards(g, -22, -24); surfboards(g, 27, 20);
  beachKit(g, 14, -22); beachKit(g, -23, 8); beachKit(g, 20, 22);
  volleyNet(g, 0, 26);
  kite(g, -18, 16, -34); kite(g, 30, 13, -30);
  [[-15, -26, 0xff7a3a], [16, 25, 0xff5a8a], [-27, 16, 0xffb03a], [27, -4, 0xff7a3a], [5, -29, 0xff5a8a]].forEach(([x, z, c]) => starfish(g, x, z, c));
  shoreRocks(g, [[-33, -20, 1.6], [-34, -17, 1.1], [33, 24, 1.8], [35, 27, 1.2], [20, -34, 1.4]]);
  // huellas en la arena
  for (let k = 0; k < 14; k++) add(box(0.22, 0.02, 0.36), P.M(0xc8a870), -8 + k * 1.1 + (k % 2) * 0.1, Y + 0.02, -18 - (k % 2) * 0.4 - k * 0.3, g).rotation.y = -0.3;
  P.scatter(g, 0, Y + 0.01, 0, 30, 30, 120, 0xfff4e6, 0.16, [15, 15]);   // caracoles
  P.dune(g, -30, Y, 28, 6, 4, 0xe6c98e); P.dune(g, 30, Y, -28, 5, 4, 0xe6c98e);
}

/* =====================================================================
   TERRAZA: una azotea del barrio, de noche, con la ciudad abajo
   ===================================================================== */
function waterTank(p, x, z, s = 1) {
  const g = grp(p, x, Y, z, rnd(0, 6)); g.scale.setScalar(s);
  const mm = P.M(0x7a808a, { map: TX.metal });
  [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([a, b]) => add(box(0.18, 2.4, 0.18), mm, a, 1.2, b, g));
  add(new THREE.CylinderGeometry(1.5, 1.5, 2.6, 10), P.M(0xffffff, { map: TX.tank }), 0, 3.7, 0, g);
  add(new THREE.ConeGeometry(1.65, 0.8, 10), mm, 0, 5.4, 0, g);
}
function antenna(p, x, z, h = 7) {
  const g = grp(p, x, Y, z);
  const mm = P.M(0xb8bec8, { map: TX.metal });
  add(new THREE.CylinderGeometry(0.07, 0.1, h, 5), mm, 0, h / 2, 0, g);
  [0.55, 0.72, 0.88].forEach((f, k) => add(box(2.4 - k * 0.6, 0.06, 0.06), mm, 0, h * f, 0, g).rotation.y = k * 0.3);
  const led = add(new THREE.SphereGeometry(0.22, 6, 4), P.M(0xff2030, { unlit: true }), 0, h + 0.1, 0, g);
  P.anim(g, (t) => { led.visible = (t % 1.2) < 0.6; });
}
function clothesline(p, x1, z1, x2, z2) {
  const g = grp(p), mm = P.M(0x8a92a6, { map: TX.metal }), h = 2.2;
  [[x1, z1], [x2, z2]].forEach(([x, z]) => add(new THREE.CylinderGeometry(0.06, 0.06, h, 4), mm, x, Y + h / 2, z, g));
  const len = Math.hypot(x2 - x1, z2 - z1), a = Math.atan2(x2 - x1, z2 - z1);
  add(box(0.03, 0.03, len), P.M(0xe8e8e8), (x1 + x2) / 2, Y + h - 0.05, (z1 + z2) / 2, g).rotation.y = a;
  const cols = [0xff5a4a, 0xffffff, 0x3a7aff, 0xffe14a, 0x39d98a, 0xff9ac8];
  const n = Math.max(3, Math.floor(len / 1.2)), cl = [];
  for (let k = 1; k < n; k++) {
    const f = k / n, w = rnd(0.6, 1.0), hh = rnd(0.6, 1.1);
    const c = add(box(w, hh, 0.04), P.M(cols[k % cols.length], { map: TX.cloth, side: THREE.DoubleSide }), x1 + (x2 - x1) * f, Y + h - 0.05 - hh / 2, z1 + (z2 - z1) * f, g);
    c.rotation.y = a + Math.PI / 2; cl.push(c);
  }
  P.anim(g, (t) => cl.forEach((c, i) => { c.rotation.x = Math.sin(t * 2 + i) * 0.15; }));
}
function acUnit(p, x, z, ry) {
  const g = grp(p, x, Y, z, ry);
  add(box(1.8, 1.1, 1.0), P.M(0xd8dce2, { map: TX.metal }), 0, 0.55, 0, g);
  P.fan(g, 0, 0.55, 0.52, 0, 0.38);
}
function skyline(p) {
  // edificios de alrededor, más bajos que la azotea (la base se pierde en la oscuridad)
  const fm = P.M(0xffffff, { map: TX.facade, unlit: true }), dark = P.M(0x14151f);
  const B = -45;
  for (let k = 0; k < 44; k++) {
    const a = (k / 44) * Math.PI * 2 + rnd(-0.05, 0.05), d = rnd(40, 70);
    const x = Math.sin(a) * d, z = Math.cos(a) * d;
    const w = rnd(5, 10), dd = rnd(5, 10), top = rnd(-24, d > 55 ? 14 : 2), h = top - B;
    const geo = scaleUV(box(w, h, dd), Math.round(w / 4), Math.round(h / 8));
    const bd = add(geo, [fm, fm, dark, dark, fm, fm], x, B + h / 2, z, p); bd.rotation.y = rnd(0, 3);
    if (Math.random() < 0.3) add(new THREE.SphereGeometry(0.35, 5, 4), P.M(0xff2030, { unlit: true }), x, top + 0.5, z, p);
  }
  // un par de carteles de neón a lo lejos
  [[-52, 6, -40, 0xff5fa2], [48, 2, -48, 0x2de0c8], [58, -2, 20, 0xffe14a]].forEach(([x, y, z, c]) => {
    const s = add(box(8, 2.4, 0.3), P.M(c, { unlit: true }), x, y, z, p); s.rotation.y = Math.atan2(-x, -z);
    P.anim(s, (t) => { s.visible = (t * 0.7 + x) % 3 > 0.25; });
  });
}
export function decorTerraza(g) {
  P.sky(g, [[0, '#04061a'], [0.38, '#0c1438'], [0.5, '#2a2450'], [0.56, '#140f24'], [1, '#05040a']], { stars: 50, starBand: 0.4 });
  const moon = add(new THREE.CircleGeometry(5, 16), new THREE.MeshBasicMaterial({ color: 0xf0f0d8, fog: false }), 40, 34, -92, g);
  moon.lookAt(0, 0, 0); moon.renderOrder = -9;
  skyline(g);
  // pretil alrededor de la azotea (±27.5, el piso de afuera se achica a esa medida)
  const E = 27.5, pm = P.M(0xffffff, { map: TX.parapet });
  [[0, -E, 2 * E + 1, 0.6], [0, E, 2 * E + 1, 0.6], [-E, 0, 0.6, 2 * E], [E, 0, 0.6, 2 * E]].forEach(([x, z, w, d]) => add(scaleUV(box(w, 1.2, d), Math.max(w, d) / 4, 1), pm, x, Y + 0.6, z, g));
  const wall = P.M(0xb8aca0, { map: TX.stone });
  add(box(2 * E + 1, 40, 2 * E + 1), wall, 0, Y - 20.6, 0, g);        // el edificio (se ve desde los costados)
  waterTank(g, -21, -21, 1.1); waterTank(g, 21, -20, 0.95); waterTank(g, 22, 21, 1.05);
  antenna(g, -23, 8, 8); antenna(g, 18, -24, 6.5); antenna(g, -8, -24, 5.5);
  clothesline(g, -24, 14, -14, 24); clothesline(g, 12, 23, 24, 12);
  acUnit(g, 20, 0, -Math.PI / 2); acUnit(g, -20, -6, Math.PI / 2); acUnit(g, 4, -22, 0);
  // casita de la escalera
  const st = grp(g, -20, Y, 21, Math.PI * 0.75);
  add(box(4, 3, 3), wall, 0, 1.5, 0, st); add(box(1, 2, 0.06), P.M(0x3a6a8a, { map: TX.wood }), 0, 1, 1.52, st);
  P.lantern(st, 1.0, 0, 1.6, 2.6);
  // macetas con plantas
  [[-12, -23], [12, -23], [23, -10], [-23, -12], [8, 24]].forEach(([x, z]) => { add(new THREE.CylinderGeometry(0.5, 0.4, 0.7, 6), P.M(0xc8703a, { map: TX.clay }), x, Y + 0.35, z, g); P.bush(g, x, Y + 0.5, z, 0.7); });
  // lucecitas colgadas sobre la arena
  P.chaseLights(g, -16, 3.2, -18, 16, -18, 14, 0xffd27a, 3);
  P.chaseLights(g, -16, 3.2, 18, 16, 18, 14, 0xffd27a, 3);
  P.drift(g, 14, -30, 30, 2, 10, -30, 30, 0xffe07a, 0.12, 0.6);                // luciérnagas / polvo con la luz
}

/* ---------- piezas de juego (van en cada mapa, las maneja bolas.js) ---------- */
// Calesita en el medio de la FERIA: rebota las pelotas y, como gira, las tira de costado
export function carousel(p, r) {
  const g = grp(p, 0, 0, 0);
  const rot = grp(g);
  add(new THREE.CylinderGeometry(r, r + 0.1, 0.45, 16), P.M(0xffffff, { map: TX.circus }), 0, 0.22, 0, rot);
  add(new THREE.CylinderGeometry(r * 0.3, r * 0.3, 1.6, 8), P.M(0xffe07a, { map: TX.metal }), 0, 1.1, 0, rot);
  const cols = [0xff5a7a, 0xffffff, 0x4a8cff, 0xffe14a, 0x39d98a, 0xb07aff];
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2, x = Math.sin(a) * r * 0.72, z = Math.cos(a) * r * 0.72;
    add(new THREE.CylinderGeometry(0.05, 0.05, 1.5, 4), P.M(0xffe07a, { unlit: true }), x, 1.1, z, rot);
    const h = grp(rot, x, 0.85, z, a + Math.PI / 2);                       // caballito
    add(box(0.26, 0.3, 0.65), P.M(cols[k]), 0, 0, 0, h);
    add(box(0.2, 0.34, 0.2), P.M(cols[k]), 0, 0.22, 0.3, h).rotation.x = -0.4;
    h.userData.ph = k;
  }
  const roof = new THREE.ConeGeometry(r + 0.3, 0.7, 12);
  add(roof, P.M(0xffffff, { map: TX.circus }), 0, 2.15, 0, rot);
  add(new THREE.SphereGeometry(0.2, 6, 4), P.M(0xffe07a, { unlit: true }), 0, 2.6, 0, rot);
  return { g, rot };
}
// Columna del medio de la TERRAZA: se va rajando con cada pelotazo (etapas) hasta romperse
export function column(p, r) {
  const g = grp(p, 0, 0, 0), bm = mat({ map: TX.brick, color: 0xc07a5a }), dm = P.M(0x2a1a14);     // material propio: se oscurece con el daño
  const body = add(scaleUV(new THREE.CylinderGeometry(r, r * 1.08, 2.6, 10), 3, 1.4), bm, 0, 1.3, 0, g);
  const top = grp(g, 0, 2.6, 0);
  add(new THREE.CylinderGeometry(r + 0.15, r + 0.15, 0.25, 10), P.M(0x8a8a92, { map: TX.stone }), 0, 0.12, 0, top);
  add(new THREE.CylinderGeometry(0.25, 0.25, 0.6, 6), P.M(0x5a5a62, { map: TX.metal }), 0.3, 0.5, 0, top);
  // grietas (se muestran según el daño)
  const cracks = [];
  for (let k = 0; k < 9; k++) {
    const a = (k / 9) * Math.PI * 2 + rnd(-0.2, 0.2), c = add(box(0.07, rnd(0.6, 1.4), 0.04), dm, Math.sin(a) * (r + 0.01), rnd(0.6, 2.0), Math.cos(a) * (r + 0.01), g);
    c.rotation.y = a; c.rotation.z = rnd(-0.6, 0.6); c.visible = false; cracks.push(c);
  }
  return { g, body, top, cracks };
}
// Montoncito de escombros (queda en el piso y rebota las pelotas)
export function rubble(p, r) {
  const g = grp(p, 0, 0, 0), bm = P.M(0xe08a5a, { map: TX.brick }), sm = P.M(0xc8a890, { map: TX.stone });
  for (let k = 0; k < 7; k++) {
    const a = (k / 7) * Math.PI * 2, d = k === 0 ? 0 : r * 0.55;
    const c = add(new THREE.DodecahedronGeometry(k === 0 ? r * 0.8 : r * 0.5, 0), k % 3 ? bm : sm, Math.sin(a) * d, k === 0 ? r * 0.35 : r * 0.2, Math.cos(a) * d, g);
    c.rotation.set(rnd(0, 3), rnd(0, 3), 0); c.scale.y = 0.7;
  }
  return g;
}
// Cangrejo de la PLAYA: sale de una torre, cruza la arena de costado y se mete en otra
export function crab(p) {
  const g = grp(p, 0, 0, 0); g.scale.setScalar(1.25);
  const rm = P.M(0xe8402a), dm = P.M(0xb82a1a), wm = P.M(0xffffff), km = P.M(0x111111);
  const body = grp(g);
  const sh = add(new THREE.SphereGeometry(0.62, 10, 6), rm, 0, 0.42, 0, body); sh.scale.set(1.25, 0.55, 0.9);
  // ojos en palitos
  [-0.2, 0.2].forEach((x) => { add(new THREE.CylinderGeometry(0.04, 0.04, 0.3, 4), dm, x, 0.75, 0.42, body); add(new THREE.SphereGeometry(0.1, 6, 4), wm, x, 0.92, 0.42, body); add(new THREE.SphereGeometry(0.05, 4, 3), km, x, 0.94, 0.5, body); });
  // pinzas
  const claws = [-1, 1].map((sd) => {
    const c = grp(body, sd * 0.62, 0.45, 0.45);
    add(box(0.14, 0.14, 0.45), dm, 0, 0, 0.1, c).rotation.y = -sd * 0.5;
    const pz = grp(c, sd * 0.2, 0.05, 0.42);
    add(new THREE.SphereGeometry(0.22, 6, 4), rm, 0, 0, 0, pz).scale.set(1, 0.7, 1.3);
    const jaw = add(box(0.1, 0.08, 0.3), dm, sd * 0.05, -0.1, 0.2, pz);
    return { c, pz, jaw, sd };
  });
  // patas
  const legs = [];
  [-1, 1].forEach((sd) => { for (let k = 0; k < 3; k++) { const l = grp(body, sd * 0.55, 0.35, -0.25 + k * 0.25); add(box(0.55, 0.07, 0.07), dm, sd * 0.28, -0.1, 0, l).rotation.z = sd * -0.5; legs.push({ l, sd, k }); } });
  g.visible = false;
  return { g, body, claws, legs };
}
