// Decorado de los mapas nuevos de Bombardeo: PUERTO (muelle al atardecer, sube la marea) y NEVADA
// (refugio en la montaña, sube la nieve). La grilla es la misma; el piso de afuera está a y = -1.7.
import * as THREE from 'three';
import { add, scaleUV, mat, waterMat } from '../render/psx.js';
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
  P.skyClouds(g, 8, 45, 65, 12, 20, 0xffa890, 0.004);
  // el mar alrededor y el muelle de hormigón con bordes amarillos
  const wg = scaleUV(new THREE.PlaneGeometry(260, 260, 20, 20), 40); wg.rotateX(-Math.PI / 2);
  const sea = add(wg, waterMat({ map: TX.water, color: 0x6aaad8, deep: 0x2a4a7a, sky: 0xffa070, glint: 1, wave: 0.15 }), 0, -2.6, 0, g);
  P.anim(g, (t) => { sea.material.uniforms.uOff.value.set((t * 0.015) % 1, (t * 0.03) % 1); });
  P.waterSparkles(g, -2.3, 0, 0, 40, 40, 90, 0xffd0a0, (x, z) => Math.abs(x) < HALF + 7.5 && Math.abs(z) < HALF + 7.5);
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
  // lo de cerca de la cancha: rayas pintadas, charcos, manchas de aceite, sogas, cajones de pescado
  const wm = P.M(0xf0f0e8, { unlit: true });
  for (let k = -6; k <= 6; k++) { add(box(0.18, 0.04, 1.1), wm, -10.6, Y + 0.03, k * 2, g); add(box(0.18, 0.04, 1.1), wm, 10.6, Y + 0.03, k * 2, g); }
  add(box(3.4, 0.04, 0.18), ym, 0, Y + 0.03, 10.4, g); add(box(3.4, 0.04, 0.18), ym, 0, Y + 0.03, -10.4, g);
  [[-11.5, -3, 1.3], [10.4, -7.5, 0.9], [3.5, 11.6, 1.1], [-5, -11.8, 0.8], [12.5, 2.5, 0.7]].forEach(([x, z, r]) => P.patch(g, x, Y, z, r, 0x4a6a8a));
  [[-9.8, 9.6, 0.8], [11.2, 7, 0.6], [-4, 11, 0.5]].forEach(([x, z, r]) => P.patch(g, x, Y, z, r, 0x2a2a30));
  [[-10.2, -10.5], [10.6, 12.8], [-3, -12.5]].forEach(([x, z]) => P.ropeCoil(g, x, Y, z, 1));
  const fb = P.M(0x3a8ac8, { map: TX.crate });
  [[9.8, -12.4, 0], [10.9, -12.6, 0], [10.3, -12.5, 1]].forEach(([x, z, l]) => { add(box(1, 0.5, 0.7), fb, x, Y + 0.25 + l * 0.5, z, g).rotation.y = l * 0.3; });
  add(box(0.9, 0.08, 0.6), P.M(0xb8c8d8), 10.3, Y + 1.04, -12.5, g);           // hielo y pescado arriba del cajón
  [[10.1, 0x8a9aaa], [10.5, 0xc8a87a]].forEach(([x, c]) => add(box(0.55, 0.14, 0.18), P.M(c), x, Y + 1.14, -12.5, g).rotation.y = 0.4);
  // defensas de neumáticos en el borde del muelle y botes amarrados
  for (let k = -5; k <= 5; k += 2) { P.tire(g, -E - 0.15, Y - 0.6, k * 2.4, Math.PI / 2); P.tire(g, E + 0.15, Y - 0.6, k * 2.4 + 1.2, Math.PI / 2); }
  for (let k = -5; k <= 5; k += 2) P.tire(g, k * 2.4, Y - 0.6, E + 0.15, 0);
  P.rowboat(g, -E - 2.2, -2.75, -9, 0.1, 0xd8463a); P.rowboat(g, E + 2.2, -2.75, 10, -0.15, 0x3a8ad8); P.rowboat(g, -6, -2.75, E + 2.4, Math.PI / 2 + 0.2, 0xffc02a);
  P.stringLights(g, -E + 1, Y + 5, E - 1, E - 1, Y + 5, E - 1, 14);
  P.warnSign(g, -11.6, Y, 7.2, 0.5); P.tire(g, 11.6, Y + 0.17, 0.6, 0, false); P.tire(g, 11.7, Y + 0.51, 0.7, 0.4, false);
  // pescadores sentados en el borde con la caña, un marinero que camina y un gato que mira los pescados
  [[-E + 0.6, -4, Math.PI / 2], [E - 0.6, 7.5, -Math.PI / 2], [3, E - 0.6, 0]].forEach(([x, z, ry], k) => {
    const f = P.fans(g, Y, [[x, z, ry]], { hats: [0xffd23a], shirts: [[0x3a5a8a, 0xd8463a, 0x2a8a5a][k]] })[0];
    const rod = new THREE.Group(); rod.position.set(0.3, 1.1, 0.3); f.g.add(rod);
    add(box(0.04, 0.04, 2.6), P.M(0x2a2a30), 0, 0.4, 1.2, rod).rotation.x = -0.35;
    add(new THREE.CylinderGeometry(0.01, 0.01, 2.6, 3), P.M(0xe8e8e8), 0, -0.4, 2.45, rod);
    P.anim(rod, (t) => { rod.rotation.x = Math.max(0, Math.sin(t * 0.5 + k * 2)) ** 10 * -0.5; });
  });
  P.walker(g, -10.5, Y, -E + 1.2, 10.5, -E + 1.2, { shirt: 0xffffff, pants: 0x2a3a6a, hat: 0xffffff, sp: 0.16 });
  P.edgeFoam(g, [[-E - 0.4, -E - 0.4], [E + 0.4, -E - 0.4], [E + 0.4, E + 0.4], [-E - 0.4, E + 0.4], [-E - 0.4, -E - 0.4]], -2.45, 0.7);
  const cat = new THREE.Group(); cat.position.set(9.6, Y + 1.04, -12.1); g.add(cat);
  add(box(0.22, 0.22, 0.5), P.M(0xe8a04a), 0, 0.12, 0, cat); add(box(0.22, 0.2, 0.2), P.M(0xe8a04a), 0, 0.3, 0.25, cat);
  const ct = add(box(0.05, 0.35, 0.05), P.M(0xe8a04a), 0, 0.3, -0.25, cat);
  P.anim(cat, (t) => { ct.rotation.x = Math.sin(t * 2.5) * 0.5; cat.rotation.y = 0.4 + Math.sin(t * 0.3) * 0.4; });
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
  P.skyClouds(g, 8, 42, 62, 14, 22, 0xe8eef8, 0.004);
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
  // cerca de la cancha: lomitas de nieve, rocas nevadas, pinos, banderitas de slalom, laguna helada y huellas
  [[-10.5, -2, 2.2, 1.4], [10.8, 1, 1.8, 2.6], [-4, 11.5, 2.8, 1.2], [5.5, -11, 2.4, 1.3], [-10.5, 12.5, 1.6, 1.6], [13, -6, 1.6, 2]].forEach(([x, z, a2, b2]) => { P.dune(g, x, Y, z, a2, b2).material = P.M(0xf4f8ff, { map: TX.snow }); });
  [[-11, 6.5, 0.7], [11, -9.5, 0.9], [7.5, 11.8, 0.6], [-7.5, -11.6, 0.8]].forEach(([x, z, r]) => P.rock(g, x, Y, z, r, 0x7a8698, true));
  [[13.6, -14, 1.3], [-15.5, 13.6, 1.5], [15, 9.5, 1.1], [-15.5, -4.5, 1.2], [4, -14.5, 1], [-1.5, 14.8, 1.1]].forEach(([x, z, sc]) => P.pine(g, x, Y, z, sc, true));
  for (let k = 0; k < 6; k++) P.pennant(g, -9.5 + k * 3.8, Y, -10.6 + (k % 2) * 0.6, k % 2 ? 0x3a7aff : 0xff3a3a, 1.4);
  P.frozenPond(g, -12, Y, -6.5, 1.7);
  P.footprints(g, Y, [[-13, -11], [-10, -7], [-10.2, 0], [-12.6, 4], [-12.2, 9]]);
  P.footprints(g, Y, [[12.2, 9], [10.4, 4], [10.6, -3], [12.5, -8]], 0xb0c0d8);
  [[-11, 10.5], [11, -11], [10.3, 8.5]].forEach(([x, z]) => P.lantern(g, x, Y, z, 2.2, 0xffd27a));
  P.stringLights(g, -14, Y + 4.6, -13, -9, Y + 3, -10.6, 7, [0xff5a5a, 0x5aff8a, 0xffe14a, 0x5ab0ff]);
  // esquiadores sentados en la telesilla, un chico tirando bolas de nieve y otro que hace un ángel en la nieve
  P.walker(g, 10.5, Y, 12.6, -10.5, 12.6, { shirt: 0x3a7aff, hat: 0xd83a3a, sp: 0.14, carry: (w) => { const sl = new THREE.Group(); sl.position.set(0, 0, -1.4); w.add(sl); P.sled(sl, 0, 0, 0, 0); } });
  const ang = new THREE.Group(); ang.position.set(-10.6, Y + 0.05, -9.8); g.add(ang);
  add(new THREE.CircleGeometry(1, 10), P.M(0xdce8f8), 0, 0.01, 0, ang).rotation.x = -Math.PI / 2;
  const kid = P.fans(ang, 0, [[0, 0, 0]], { hats: [0xffd23a], shirts: [0x39d98a] })[0]; kid.g.rotation.x = -Math.PI / 2; kid.g.position.y = 0.15; kid.g.scale.setScalar(0.8);
  P.anim(ang, (t) => { kid.arms.forEach((a, i) => { a.rotation.z = (i ? -1 : 1) * (1.2 + Math.sin(t * 3) * 0.6); }); kid.g.position.y = 0.15; });
}

/* ===================== SELVA: ruinas de un templo en la selva; sube el pantano ===================== */
function pyramid(p, x, z, s = 1, ry = 0) {                   // templo escalonado con una puertita y antorchas
  const g = grp(p, x, Y, z, ry); g.scale.setScalar(s);
  const sm = P.M(0x9aa080, { map: TX.sandstone }), dk = P.M(0x6a7458, { map: TX.sandstone });
  for (let k = 0; k < 5; k++) { const w = 12 - k * 2.2; add(box(w, 1.6, w), k % 2 ? dk : sm, 0, 0.8 + k * 1.6, 0, g); }
  add(box(2.6, 2.4, 2.6), sm, 0, 9.2, 0, g);
  add(box(1.2, 1.6, 0.1), P.M(0x14180e), 0, 9, 1.32, g);
  add(box(1.6, 8, 0.4), dk, 0, 4, 5.4, g).rotation.x = -0.64;                    // escalera
  [[-1.1, 1.4], [1.1, 1.4]].forEach(([a, b]) => P.torch(g, a, 10.4, b, 1.2));
  // enredaderas colgando
  for (let k = 0; k < 8; k++) add(box(0.12, rnd(1.5, 4), 0.12), P.M(0x2a6a2a, { map: TX.leaf }), rnd(-5, 5), rnd(2, 6), rnd(-5, 5), g);
}
function idol(p, x, z, ry) {                                  // cabeza de piedra gigante, medio tapada de musgo
  const g = grp(p, x, Y, z, ry), sm = P.M(0x8a9078, { map: TX.stone }), moss = P.M(0x4a8a3a, { map: TX.leaf, sway: 0 });
  add(box(2.6, 3.4, 2.2), sm, 0, 1.7, 0, g);
  add(box(2.7, 0.25, 2.3), moss, 0, 3.5, 0, g);
  [-0.6, 0.6].forEach((a) => add(box(0.5, 0.35, 0.1), P.M(0x1a1e14), a, 2.4, 1.12, g));
  add(box(0.5, 0.9, 0.35), sm, 0, 1.8, 1.2, g);
  add(box(1.4, 0.25, 0.1), P.M(0x1a1e14), 0, 1.0, 1.12, g);
}
function waterfall(p, x, z, ry, h = 12) {                     // cascada que baja por las rocas al pantano
  const g = grp(p, x, Y, z, ry), rm = P.M(0x5a6a58, { map: TX.rock });
  add(box(9, h + 2, 4), rm, 0, (h + 2) / 2, -2.4, g);
  const wm = mat({ map: TX.water, color: 0xbfe8ff });
  add(scaleUV(new THREE.PlaneGeometry(3.2, h + 1, 1, 4), 1, 4), wm, 0, (h + 1) / 2, -0.35, g);
  add(new THREE.CylinderGeometry(2.4, 3.2, 0.4, 8), P.M(0xffffff, { unlit: true }), 0, 0.2, 0.4, g);
  P.anim(g, (t) => { wm.uniforms.uOff.value.set(0, (t * 0.9) % 1); });
  for (let k = 0; k < 6; k++) P.tree(g, rnd(-4, 4), h + 1.5, rnd(-4, -1), rnd(0.8, 1.2), [0x2a7a2a, 0x3a8a2a][k % 2]);
}
function mushroom(p, x, z, s, col) {
  const g = grp(p, x, Y, z); g.scale.setScalar(s);
  add(new THREE.CylinderGeometry(0.18, 0.24, 0.8, 6), P.M(0xf4ecd8), 0, 0.4, 0, g);
  add(new THREE.SphereGeometry(0.6, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2), P.M(col), 0, 0.75, 0, g);
}
export function decorSelva(g, HALF) {
  P.sky(g, [[0, '#0a2a1a'], [0.35, '#2a6a4a'], [0.46, '#9ad8a0'], [0.5, '#e8f8c8'], [0.55, '#3a6a2a'], [1, '#0a1a0a']], { r: 120 });
  P.skyClouds(g, 7, 45, 65, 16, 24, 0xe8f8e0, 0.004);
  // piso de la selva: pasto y tierra, con el pantano alrededor más abajo
  const fl = scaleUV(new THREE.PlaneGeometry(160, 160, 16, 16), 30); fl.rotateX(-Math.PI / 2);
  add(fl, P.M(0x5a8a3a, { map: TX.grass }), 0, Y - 0.02, 0, g);
  const E = HALF + 6;
  add(scaleUV(box(2 * E, 1, 2 * E), 7), P.M(0xb0ac88, { map: TX.sandstone }), 0, Y - 0.5, 0, g);          // la base del templo donde está la grilla
  // árboles grandes, palmeras y arbustos alrededor (lejos de la grilla)
  const pts = [];
  for (let k = 0; k < 70; k++) { const a = rnd(0, Math.PI * 2), d = rnd(HALF + 10, 38); pts.push([Math.sin(a) * d, Math.cos(a) * d, rnd(1.4, 2.4)]); }
  pts.forEach(([x, z, s], k) => (k % 4 === 0 ? P.palm(g, x, Y, z, s) : P.tree(g, x, Y, z, s, [0x2a7a2a, 0x3a8a2a, 0x1a6a3a][k % 3])));
  for (let k = 0; k < 24; k++) { const a = rnd(0, Math.PI * 2), d = rnd(HALF + 7, HALF + 12); P.bush(g, Math.sin(a) * d, Y, Math.cos(a) * d, rnd(0.8, 1.4), [0x2a7a2a, 0x4a9a3a][k % 2]); }
  // templo al fondo, cabezas de piedra, cascada y hongos
  pyramid(g, 0, -E - 12, 1.3);
  pyramid(g, -E - 14, -8, 0.8, 0.9);
  idol(g, -E - 5, 8, Math.PI / 2 - 0.3); idol(g, E + 5, -8, -Math.PI / 2 + 0.3); idol(g, 10, -E - 5, 0.2);
  waterfall(g, E + 9, 6, -Math.PI / 2 - 0.3, 14);
  [[-12, 12, 1.2, 0xe83a3a], [-11, 13.2, 0.8, 0xffd23a], [12, 12.5, 1, 0xe83a3a], [13, -12, 0.9, 0xb04ae8], [-12.5, -12, 1.1, 0xe83a3a]].forEach(([x, z, s, c]) => mushroom(g, x, z, s, c));
  [[-E + 1, -E + 1], [E - 1, -E + 1], [-E + 1, E - 1], [E - 1, E - 1]].forEach(([x, z]) => P.torch(g, x, Y, z, 2.2));
  // loros volando, luciérnagas y hojas que caen
  P.flyers(g, 0, 10, -8, 22, 5, 0xe83a3a, 0.6);
  P.flyers(g, 4, 12, 4, 18, 3, 0x2a9aff, 0.5);
  P.drift(g, 60, -26, 26, Y, 8, -26, 26, 0xd8ff6a, 0.1, 0.5);
  P.drift(g, 40, -26, 26, 16, Y, -26, 26, 0x6ab03a, 0.16, 0.7, false);
  // la explanada del templo: musgo, losas sueltas, pasto en las juntas, columnas rotas, raíces y helechos
  [[-11, -3, 1.6], [10.8, 4, 1.3], [-6, 11, 1.5], [7, -11, 1.4], [11.5, -9.5, 1], [-11.8, 9.8, 1.1], [2, 12.2, 1], [-2.5, -11.6, 1.2]].forEach(([x, z, r]) => P.patch(g, x, Y, z, r, 0x4a7a32, { map: TX.leaf }));
  [[-9.6, 5, 0.6], [9.8, -3, 0.8], [3, -10.4, 0.6]].forEach(([x, z, r]) => P.patch(g, x, Y, z, r, 0x2a3a2a));
  const lp = [];
  for (let k = 0; k < 40; k++) { const a2 = rnd(0, Math.PI * 2), d = rnd(9.4, 13.5); lp.push([Math.sin(a2) * d, Math.cos(a2) * d, Y]); }
  P.stones(g, lp, 0xa8a88a);
  for (let k = 0; k < 4; k++) { const sx = k % 2 ? 1 : -1, sz = k < 2 ? 1 : -1; P.grass(g, sx * 11, Y, sz * 6, 2.2, 5.5, 22, 0x5aa03a); P.grass(g, sx * 6, Y, sz * 11, 5.5, 2, 22, 0x4a9a3a); }
  P.column(g, -11.5, Y, -7.5, 4, false, 0xb8b89a, TX.sandstone); P.column(g, 11.6, Y, 9, 4, true, 0xb8b89a, TX.sandstone);
  P.column(g, -12, Y, 4.5, 4, true, 0xb8b89a, TX.sandstone); P.column(g, 7.5, Y, -12, 4, false, 0xb8b89a, TX.sandstone);
  P.log(g, -6.5, Y, 12.6, 0.15, 3.4); P.log(g, 12.4, Y, -2.5, Math.PI / 2 - 0.2, 2.6);
  [[-12.6, 0.5, 1], [12.8, 4.5, 0.9], [-9.5, -12, 1.1], [4, 12.8, 1], [-12.8, 12.8, 1.3], [12.6, -12.8, 1.2], [0.5, -13, 0.8]].forEach(([x, z, sc], k) => P.fern(g, x, Y, z, sc, k % 2 ? 0x4aa03a : 0x3a8a3a));
  P.flowers(g, -10.5, Y, 10.5, 1.4, 1.2, 14, [0xff5a7a, 0xffe14a, 0xff9a2a]); P.flowers(g, 10.4, Y, -10.6, 1.2, 1.4, 12, [0xb07aff, 0xffffff, 0xff5a7a]);
  // un estanque con nenúfares y una rana que salta
  P.pond(g, 12.2, Y, 1.4, 1.4); P.lilies(g, 12.2, Y + 0.33, 1.4, 1.1, 5);
  P.mist(g, Y + 0.6, 14, 26, 9, 0xe0ffe0, 0.16, 12);
  P.lightShafts(g, [[-13, Y + 14, -6, 0.3], [12, Y + 14, 8, 0.25], [-4, Y + 15, -14, 0.2], [9, Y + 13, -13, 0.3]], 14, 0xfff8c8, 0.1);
  // monos hamacándose de las lianas y tucanes que pasan volando
  P.monkey(g, -14.5, Y + 5.5, -11.5, 2.4, 0); P.monkey(g, 14.8, Y + 6, 11.2, 2.8, 1.7); P.monkey(g, 13.2, Y + 5, -13.8, 2.2, 3.1);
  [[-14.5, Y + 5.5, -11.5], [14.8, Y + 6, 11.2], [13.2, Y + 5, -13.8]].forEach(([x, y, z]) => add(new THREE.BoxGeometry(2.4, 0.3, 0.3), P.M(0x6b4a2a, { map: TX.wood }), x, y + 0.1, z, g));
  P.flyers(g, 0, 7, 0, 16, 3, 0x1a1a1e, 0.6);
  const frog = grp(g, 11.4, Y + 0.34, 2.1);
  add(new THREE.SphereGeometry(0.2, 6, 4), P.M(0x3aaa3a), 0, 0.12, 0, frog).scale.set(1, 0.7, 1.2);
  [-0.09, 0.09].forEach((a2) => add(new THREE.SphereGeometry(0.06, 4, 3), P.M(0xffffff), a2, 0.25, 0.12, frog));
  P.anim(frog, (t) => { const u = (t * 0.35) % 1, j = u < 0.15 ? Math.sin((u / 0.15) * Math.PI) : 0; frog.position.y = Y + 0.34 + j * 0.6; frog.rotation.y = Math.floor(t * 0.35) * 1.7; });
}
