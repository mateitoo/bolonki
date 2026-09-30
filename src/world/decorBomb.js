// Decorado de los mapas nuevos de Bombardeo: PUERTO (muelle al atardecer, sube la marea) y NEVADA
// (refugio en la montaña, sube la nieve). La grilla es la misma; el piso de afuera está a y = -1.7.
import * as THREE from 'three';
import { add, scaleUV, mat } from '../render/psx.js';
import { TX } from '../render/textures.js';
import { rnd } from '../config.js';
import * as P from './props.js';
import { seagulls } from './decorBolas.js';
import { lighthouse } from './decor.js';

const Y = -1.7;
const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const grp = (p, x = 0, y = 0, z = 0, ry = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; p.add(g); return g; };

/* ===================== PUERTO ===================== */
function portCrane(p, x, z, ry, col = 0xe8402a) {             // grúa pórtico del puerto, con el brazo que va y viene
  const g = grp(p, x, Y, z, ry), cm = P.M(col, { map: TX.metal }), dk = P.M(0x2a2d36, { map: TX.metal });
  [[-2, -2], [2, -2], [-2, 2], [2, 2]].forEach(([a, b]) => add(box(0.5, 12, 0.5), cm, a, 6, b, g));
  [-2, 2].forEach((b) => { add(box(4.5, 0.5, 0.5), cm, 0, 12, b, g); add(box(4.5, 0.4, 0.4), cm, 0, 6, b, g); });
  const boom = grp(g, 0, 12.6, 0);
  add(box(0.8, 0.8, 18), cm, 0, 0, -3, boom);
  add(box(2.2, 1.6, 2.2), dk, 0, 0.9, 1.5, boom);
  const trolley = grp(boom, 0, -0.6, -8);
  add(new THREE.CylinderGeometry(0.03, 0.03, 5, 4), dk, 0, -2.5, 0, trolley);
  P.container(trolley, 0, -6.2, 0, 0, [0x3a7ac8, 0x39a86a, 0xffc02a][(Math.random() * 3) | 0], 3.6);
  P.anim(g, (t) => { trolley.position.z = -8 + Math.sin(t * 0.25 + x) * 4; boom.rotation.y = Math.sin(t * 0.1 + z) * 0.15; });
}
function ship(p, x, z, ry) {                                  // barco de carga con contenedores
  const g = grp(p, x, -2.4, z, ry);
  add(box(6, 2.2, 22), P.M(0x2a3a5a, { map: TX.metal }), 0, 0.6, 0, g);
  add(box(6.1, 0.5, 22.1), P.M(0xc83a2a), 0, -0.3, 0, g);
  add(box(4.6, 4, 3.4), P.M(0xf0f0f0, { map: TX.panel }), 0, 3.6, 8.5, g);
  add(box(4.8, 0.3, 3.6), P.M(0x2a2d36), 0, 5.7, 8.5, g);
  add(new THREE.CylinderGeometry(0.5, 0.6, 2.5, 8), P.M(0x2a2d36), 1.2, 7, 9, g);
  P.smoke(g, 1.2, 8.3, 9, 4, 1.1, 0x9aa0aa);
  const cols = [0xd8463a, 0x3a7ac8, 0x39a86a, 0xffc02a, 0xe8e8ee];
  for (let i = 0; i < 4; i++) for (let l = 0; l < 2; l++) for (let s2 = -1; s2 <= 1; s2 += 2) P.container(g, s2 * 1.2, 1.7 + l * 1.6, -7 + i * 3.6, Math.PI / 2, cols[(i * 3 + l + s2 + 5) % cols.length], 3.4);
  P.anim(g, (t) => { g.position.y = -2.4 + Math.sin(t * 0.6 + x) * 0.15; g.rotation.z = Math.sin(t * 0.4 + z) * 0.015; });
}
function bollard(p, x, z) {
  add(new THREE.CylinderGeometry(0.35, 0.45, 0.8, 8), P.M(0x2a2d36, { map: TX.metal }), x, Y + 0.4, z, p);
  add(new THREE.CylinderGeometry(0.5, 0.5, 0.15, 8), P.M(0x2a2d36, { map: TX.metal }), x, Y + 0.85, z, p);
}
export function decorPuerto(g, HALF) {
  P.sky(g, [[0, '#2a1a4a'], [0.3, '#8a3a6a'], [0.42, '#ff7a4a'], [0.49, '#ffc86a'], [0.52, '#ffe8a8'], [0.56, '#6a4a6a'], [1, '#1a2040']], { stars: 10, starBand: 0.2 });
  const sun = add(new THREE.CircleGeometry(12, 20), new THREE.MeshBasicMaterial({ color: 0xffb04a, fog: false }), 20, 2, -104, g); sun.renderOrder = -9;
  // el mar alrededor y el muelle de hormigón con bordes amarillos
  const wg = scaleUV(new THREE.PlaneGeometry(260, 260, 20, 20), 40); wg.rotateX(-Math.PI / 2);
  const sea = add(wg, mat({ map: TX.water, color: 0x4a8ab0 }), 0, -2.6, 0, g);
  P.anim(g, (t) => { sea.material.uniforms.uOff.value.set((t * 0.015) % 1, (t * 0.03) % 1); });
  const E = HALF + 7;
  add(box(2 * E, 1, 2 * E), P.M(0x9a9a98, { map: TX.stone }), 0, Y - 0.5, 0, g);
  const ym = P.M(0xffc02a, { unlit: true });
  [[0, -E, 2 * E, 0.3], [0, E, 2 * E, 0.3], [-E, 0, 0.3, 2 * E], [E, 0, 0.3, 2 * E]].forEach(([x, z, w, d]) => add(box(w, 0.06, d), ym, x, Y + 0.02, z, g));
  [[-E + 0.8, -10], [-E + 0.8, 0], [-E + 0.8, 10], [E - 0.8, -10], [E - 0.8, 0], [E - 0.8, 10], [-8, E - 0.8], [8, E - 0.8]].forEach(([x, z]) => bollard(g, x, z));
  // grúas, barcos, contenedores apilados, faro, gaviotas, pallets y barriles
  portCrane(g, -E + 2.5, -8, 0.1); portCrane(g, E - 2.5, 4, Math.PI - 0.1, 0x3a7ac8);
  ship(g, -E - 5, 2, 0.05); ship(g, 6, -E - 6, Math.PI / 2 + 0.05);
  const cols = [0xd8463a, 0x3a7ac8, 0x39a86a, 0xffc02a];
  [[-12.5, 11, 0], [-12.5, 11, 1], [-12.3, 13.2, 0], [12.8, -11.5, 0], [12.8, -11.5, 1], [12.8, -11.5, 2], [13, -9.3, 0]].forEach(([x, z, l], k) => P.container(g, x, Y + l * 1.6, z, 0.02 * k, cols[k % 4], 4.2));
  lighthouse(g, E + 3, -E - 3);
  seagulls(g, 0, 7, -30, 16, 5);
  P.pallets(g, 12.5, Y, 11, 3); P.pallets(g, -13, Y, -11.5, 2);
  [[13.5, 9], [14.2, 9.8], [-13.8, -9.4]].forEach(([x, z], k) => P.barrel(g, x, Y, z, k % 2 ? 0x3a6ac8 : 0xd83a3a));
  P.forklift(g, -12, Y, 4, 0.8);
  P.lamp(g, -E + 1, Y, E - 1, 5, 0xffe8b0); P.lamp(g, E - 1, Y, E - 1, 5, 0xffe8b0); P.lamp(g, E - 1, Y, -E + 1, 5, 0xffe8b0); P.lamp(g, -E + 1, Y, -E + 1, 5, 0xffe8b0);
}

/* ===================== NEVADA ===================== */
function mountain(p, x, z, h, r) {
  const g = grp(p, x, Y - 1, z);
  add(new THREE.ConeGeometry(r, h, 7), P.M(0x6a7a8a, { map: TX.rock }), 0, h / 2, 0, g);
  add(new THREE.ConeGeometry(r * 0.46, h * 0.46, 7), P.M(0xf4f8ff, { map: TX.snow }), 0, h * 0.77, 0, g);
}
function skiLift(p, x1, z1, x2, z2) {                          // telesilla con sillitas que van subiendo
  const pm = P.M(0x5a6070, { map: TX.metal }), cm = P.M(0x1a1a1e);
  const pts = [[x1, z1, 7], [(x1 + x2) / 2, (z1 + z2) / 2, 12], [x2, z2, 18]];
  pts.forEach(([x, z, h]) => { add(box(0.4, h, 0.4), pm, x, Y + h / 2, z, p); add(box(2.4, 0.3, 0.3), pm, x, Y + h, z, p).rotation.y = Math.atan2(x2 - x1, z2 - z1) + Math.PI / 2; });
  const a = new THREE.Vector3(x1, Y + 6.8, z1), b = new THREE.Vector3(x2, Y + 17.8, z2), len = a.distanceTo(b);
  const cable = add(new THREE.CylinderGeometry(0.03, 0.03, len, 3), cm, (x1 + x2) / 2, (a.y + b.y) / 2, (z1 + z2) / 2, p);
  cable.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
  const chairs = [];
  for (let i = 0; i < 5; i++) { const c = grp(p); add(box(0.04, 1.2, 0.04), cm, 0, -0.6, 0, c); add(box(1.2, 0.12, 0.6), P.M([0xe83a3a, 0x3a7aff, 0xffd23a][i % 3]), 0, -1.2, 0, c); add(box(1.2, 0.6, 0.1), P.M([0xe83a3a, 0x3a7aff, 0xffd23a][i % 3]), 0, -0.9, -0.28, c); chairs.push({ c, k: i / 5 }); }
  const v = new THREE.Vector3();
  P.anim(p, (t) => chairs.forEach((q) => { const u = (q.k + t * 0.02) % 1; v.lerpVectors(a, b, u); q.c.position.copy(v); q.c.rotation.y = Math.atan2(x2 - x1, z2 - z1); }));
}
function cabin(p, x, z, ry) {
  const g = grp(p, x, Y, z, ry);
  P.house(g, 0, 0, 0, 0, 0x8a5a3a, 0xf4f8ff, 1.8);
  P.smoke(g, -1.2, 5.6, -0.7, 4, 0.9, 0xc8ccd4);
  add(box(1.2, 0.8, 0.08), P.M(0xffd27a, { unlit: true }), -1.1, 1.9, 2.03, g);
}
export function decorNevada(g, HALF) {
  P.sky(g, [[0, '#2a3a6a'], [0.35, '#6a8ac0'], [0.47, '#c8d8f0'], [0.52, '#f0f4ff'], [0.6, '#a8b8d0'], [1, '#4a5a70']], { stars: 20, starBand: 0.25 });
  // campo nevado y montañas
  const fl = scaleUV(new THREE.PlaneGeometry(160, 160, 16, 16), 30); fl.rotateX(-Math.PI / 2);
  add(fl, P.M(0xf0f6ff, { map: TX.snow }), 0, Y - 0.02, 0, g);
  [[-30, -40, 30, 16], [0, -52, 40, 22], [34, -42, 34, 18], [-48, -10, 26, 14], [50, -8, 28, 15], [-40, 30, 22, 13], [44, 34, 24, 14]].forEach(([x, z, h, r]) => mountain(g, x, z, h, r));
  // bosque de pinos nevados alrededor (lejos de la grilla)
  const pts = [];
  for (let k = 0; k < 80; k++) { const a = rnd(0, Math.PI * 2), d = rnd(HALF + 9, 34); pts.push([Math.sin(a) * d, Math.cos(a) * d, rnd(1, 1.9)]); }
  P.forest(g, Y, pts);
  // refugio, telesilla, muñecos de nieve, iglú, trineo, esquíes y montones de nieve
  cabin(g, -14, -13, 0.7);
  skiLift(g, 14, -12, 26, -34);
  P.snowman(g, 12.5, Y, 10, -2.2); P.snowman(g, -12.8, Y, 9.5, 2);
  P.igloo(g, -14, Y, 2, 1.3, 1.1);
  P.sled(g, 11.8, Y, -2, 0.7);
  [[-11.5, -6], [11.5, 5.5], [-9, 12], [9, -12]].forEach(([x, z]) => P.snowPile(g, x, Y, z, 1.4));
  const sk = grp(g, 12.2, Y, 13.5, 0.3);
  [[-0.2, 0xe83a3a], [0.2, 0x3a7aff]].forEach(([a, c]) => { const s = add(box(0.1, 3, 0.05), P.M(c), a, 1.4, 0, sk); s.rotation.z = a * 0.3; });
  // nieve que cae
  P.drift(g, 120, -26, 26, 18, Y, -24, 24, 0xffffff, 0.12, 1.4);
}
