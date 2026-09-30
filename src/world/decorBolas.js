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
  P.flyers(g, 0, 10, -10, 26, 5, 0xffffff, 0.8);
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
// Chimeneas de la TERRAZA (postes fijos que rebotan las pelotas)
export function chimney(p, x, z, r) {
  const g = grp(p, x, 0, z);
  add(scaleUV(new THREE.CylinderGeometry(r, r, 1.9, 8), 2, 1), P.M(0xc07a5a, { map: TX.brick }), 0, 0.95, 0, g);
  add(new THREE.CylinderGeometry(r + 0.12, r + 0.12, 0.2, 8), P.M(0x5a5a62, { map: TX.metal }), 0, 1.95, 0, g);
  add(new THREE.CircleGeometry(r * 0.75, 8), P.M(0x0a0a0c), 0, 2.06, 0, g).rotation.x = -Math.PI / 2;
  return g;
}
