// Decorado de los mapas nuevos de Futbolonki: el POTRERO (canchita de tierra del barrio, al atardecer) y el
// LAGO HELADO (pista de hielo en un lago del bosque, de noche con aurora). La cancha mide lo mismo en todos
// (HX × HZ); los cambios de juego (charcos de barro, hielo que patina) están en minigames/futbol.js.
import * as THREE from 'three';
import { add, scaleUV } from '../render/psx.js';
import { TX } from '../render/textures.js';
import { rnd } from '../config.js';
import * as P from './props.js';

const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const grp = (p, x = 0, y = 0, z = 0, ry = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; p.add(g); return g; };

/* ===================== POTRERO ===================== */
// Alambrado: postes y una malla (grilla de alambres finos)
function wireFence(p, x1, z1, x2, z2, h = 3.2) {
  const g = grp(p), pm = P.M(0x8a8f98, { map: TX.metal }), wm = P.M(0xb8bcc4);
  const dx = x2 - x1, dz = z2 - z1, len = Math.hypot(dx, dz), a = Math.atan2(dx, dz), n = Math.max(1, Math.round(len / 3));
  for (let i = 0; i <= n; i++) { const f = i / n; add(new THREE.CylinderGeometry(0.07, 0.07, h, 5), pm, x1 + dx * f, h / 2, z1 + dz * f, g); }
  for (let k = 1; k <= 5; k++) add(box(0.025, 0.025, len), wm, x1 + dx / 2, (k / 5) * h, z1 + dz / 2, g).rotation.y = a;
  const m = Math.round(len / 0.7);
  for (let i = 0; i <= m; i++) { const f = i / m; add(box(0.025, h, 0.025), wm, x1 + dx * f, h / 2, z1 + dz * f, g); }
  return g;
}
function car(p, x, z, ry, col) {
  const g = grp(p, x, -0.3, z, ry);
  add(box(1.8, 0.7, 3.8), P.M(col, { map: TX.metal }), 0, 0.65, 0, g);
  add(box(1.6, 0.6, 2.0), P.M(col, { map: TX.metal }), 0, 1.3, -0.2, g);
  add(box(1.62, 0.45, 1.9), P.M(0x2a3a4a), 0, 1.32, -0.2, g);
  [[-0.9, 1.2], [0.9, 1.2], [-0.9, -1.2], [0.9, -1.2]].forEach(([a, b]) => add(new THREE.CylinderGeometry(0.35, 0.35, 0.25, 8), P.M(0x1a1a1e), a, 0.35, b, g).rotation.z = Math.PI / 2);
  add(box(0.5, 0.2, 0.05), P.M(0xffe8a0, { unlit: true }), -0.55, 0.75, 1.92, g); add(box(0.5, 0.2, 0.05), P.M(0xffe8a0, { unlit: true }), 0.55, 0.75, 1.92, g);
}
function dog(p, cx, cz, r, sp, col = 0xc89a5a) {         // perro dando vueltas por afuera de la cancha
  const g = grp(p), m = P.M(col), dm = P.M(0x3a2a1a);
  add(box(0.35, 0.35, 0.8), m, 0, 0.55, 0, g);
  add(box(0.3, 0.3, 0.35), m, 0, 0.8, 0.5, g); add(box(0.12, 0.12, 0.12), dm, 0, 0.78, 0.72, g);
  [-0.1, 0.1].forEach((sx) => add(box(0.08, 0.15, 0.08), dm, sx, 1.0, 0.42, g));
  const tail = add(box(0.06, 0.06, 0.35), m, 0, 0.72, -0.5, g); tail.rotation.x = 0.7;
  const legs = [[-0.12, 0.28], [0.12, 0.28], [-0.12, -0.28], [0.12, -0.28]].map(([a, b]) => add(box(0.09, 0.4, 0.09), m, a, 0.2, b, g));
  P.anim(g, (t) => {
    const a = t * sp; g.position.set(cx + Math.sin(a) * r, -0.3, cz + Math.cos(a) * r * 0.45); g.rotation.y = a + Math.PI / 2 * Math.sign(sp);
    legs.forEach((l, i) => { l.rotation.x = Math.sin(t * 14 + (i % 2) * Math.PI) * 0.6; }); tail.rotation.y = Math.sin(t * 18) * 0.5;
  });
}
function powerLine(p, pts, h = 7) {                       // postes de luz con cables
  const wm = P.M(0x6b4a2a, { map: TX.wood }), cm = P.M(0x1a1a1e);
  pts.forEach(([x, z]) => { add(new THREE.CylinderGeometry(0.12, 0.16, h, 5), wm, x, -0.3 + h / 2, z, p); add(box(1.6, 0.1, 0.1), wm, x, -0.3 + h - 0.4, z, p); });
  for (let i = 0; i < pts.length - 1; i++) {
    const [x1, z1] = pts[i], [x2, z2] = pts[i + 1], len = Math.hypot(x2 - x1, z2 - z1), a = Math.atan2(x2 - x1, z2 - z1);
    [-0.7, 0.7].forEach((o) => add(box(0.03, 0.03, len), cm, (x1 + x2) / 2 + Math.cos(a) * o, -0.3 + h - 0.55, (z1 + z2) / 2 - Math.sin(a) * o, p).rotation.y = a);
  }
}
export function decorPotrero(g, HX, HZ) {
  P.sky(g, [[0, '#1a1848'], [0.3, '#5a2a6a'], [0.42, '#e0605a'], [0.49, '#ffa04a'], [0.53, '#ffcf7a'], [0.56, '#3a2a2a'], [1, '#1a120e']], { stars: 20, starBand: 0.25 });
  const sun = add(new THREE.CircleGeometry(9, 16), new THREE.MeshBasicMaterial({ color: 0xffc05a, fog: false }), -30, 3, -98, g); sun.renderOrder = -9;
  // tierra y pasto de alrededor
  const fl = scaleUV(new THREE.PlaneGeometry(110, 90, 20, 16), 20, 16); fl.rotateX(-Math.PI / 2);
  add(fl, P.M(0x8a7a50, { map: TX.potrero }), 0, -0.3, 0, g);
  // alambrado atrás de los arcos y a los costados (con la puerta abierta)
  const FX = HX + 5, FZ = HZ + 4.5;
  wireFence(g, -FX, -FZ, FX, -FZ); wireFence(g, -FX, FZ, -3, FZ); wireFence(g, 3, FZ, FX, FZ);
  wireFence(g, -FX, -FZ, -FX, FZ); wireFence(g, FX, -FZ, FX, FZ);
  // casas del barrio alrededor
  const cols = [[0xf0e0c0, 0xc86a4a], [0xc8e0f0, 0x8a4a3a], [0xf0c8d8, 0xa05a3a], [0xe8f0c0, 0x7a5a4a], [0xffd8a8, 0xb04a3a]];
  [-22, -14, -6, 2, 10, 18, 26].forEach((x, k) => P.house(g, x, -0.3, -FZ - 6.5 - (k % 2) * 1.5, 0, cols[k % 5][0], cols[k % 5][1], 1.6));
  [-22, -12, 12, 22].forEach((x, k) => P.house(g, x, -0.3, FZ + 7, Math.PI, cols[(k + 2) % 5][0], cols[(k + 2) % 5][1], 1.5));
  [-10, 0, 10].forEach((z, k) => { P.house(g, -FX - 7, -0.3, z, Math.PI / 2, cols[k % 5][0], cols[(k + 3) % 5][1], 1.5); P.house(g, FX + 7, -0.3, z, -Math.PI / 2, cols[(k + 1) % 5][0], cols[k % 5][1], 1.5); });
  // árboles, faroles, postes de luz, autos, un perro
  [[-FX - 2.5, -FZ - 2], [FX + 2.5, -FZ - 2], [-FX - 3, FZ + 2.5], [FX + 3, FZ + 2], [-8, -FZ - 2.5], [9, -FZ - 2.2]].forEach(([x, z], k) => P.tree(g, x, -0.3, z, 1.3 + (k % 3) * 0.2, k % 2 ? 0x4a8a3a : 0x3a7a3a));
  [[-FX + 1, FZ + 1.2], [FX - 1, FZ + 1.2], [-FX + 1, -FZ - 1.2], [FX - 1, -FZ - 1.2]].forEach(([x, z]) => P.lamp(g, x, -0.3, z, 4.5, 0xffd27a));
  powerLine(g, [[-28, FZ + 3.5], [-10, FZ + 3.5], [10, FZ + 3.5], [28, FZ + 3.5]]);
  car(g, -7, FZ + 3.2, Math.PI / 2, 0xd83a3a); car(g, 8, FZ + 3.4, -Math.PI / 2, 0x3a7ad8);
  dog(g, 0, FZ + 2.2, 12, 0.35);
  // banco de suplentes (un tablón) y bolsos
  P.bench(g, -4, -0.3, -HZ - 2, 0); P.bench(g, 4, -0.3, -HZ - 2, 0);
  [[-6, -HZ - 1.8, 0x2a5aff], [6, -HZ - 1.8, 0xff5a4a], [-2, -HZ - 1.9, 0x39d98a]].forEach(([x, z, c]) => add(box(0.8, 0.4, 0.4), P.M(c, { map: TX.cloth }), x, -0.1, z, g));
  P.bunting(g, -FX, 3.3, -FZ, FX, 3.3, -FZ, 16);                   // banderines de cumpleaños del club
}

/* ===================== LAGO HELADO ===================== */
export function decorHielo(g, HX, HZ) {
  P.sky(g, [[0, '#040818'], [0.3, '#0a1a3a'], [0.45, '#1a3a5a'], [0.52, '#2a4a6a'], [0.56, '#0a1020'], [1, '#04060a']],
    { stars: 90, starBand: 0.45, blobs: [[0.2, 0.22, 0.25, 'rgba(60,255,160,.35)'], [0.45, 0.18, 0.2, 'rgba(80,200,255,.3)'], [0.75, 0.25, 0.22, 'rgba(160,90,255,.25)']] });
  // nieve alrededor del lago (el lago es la pista)
  const sn = scaleUV(new THREE.PlaneGeometry(120, 100, 20, 16), 24, 20); sn.rotateX(-Math.PI / 2);
  add(sn, P.M(0xe8f0ff, { map: TX.snow }), 0, -0.3, 0, g);
  // hielo del lago que sigue un poco afuera de la cancha
  const lk = new THREE.CircleGeometry(1, 28); lk.rotateX(-Math.PI / 2);
  add(lk, P.M(0xc8e4f8, { map: TX.icePitch }), 0, -0.25, 0, g).scale.set(HX + 5, 1, HZ + 4);
  // bosque de pinos nevados alrededor (instanciado)
  const pts = [];
  for (let k = 0; k < 70; k++) {
    const a = rnd(0, Math.PI * 2), rx = HX + rnd(9, 30), rz = HZ + rnd(8, 26);
    pts.push([Math.sin(a) * rx, Math.cos(a) * rz, rnd(1.2, 2.2)]);
  }
  P.forest(g, -0.3, pts);
  // muñecos de nieve, iglú, cabaña con luz, bancos y luces colgadas
  P.snowman(g, -HX - 3.5, -0.3, -HZ + 1, 0.6); P.snowman(g, HX + 3.8, -0.3, HZ - 2, -2.4); P.snowman(g, 3, -0.3, -HZ - 3.2, 0.2);
  P.igloo(g, -HX - 6, -0.3, HZ + 3, 0.8, 1.2);
  P.house(g, HX + 7, -0.3, -HZ - 3, -0.6, 0xa8784a, 0xf4f8ff, 1.6);
  P.bench(g, -5, -0.3, -HZ - 2.2, 0); P.bench(g, 5, -0.3, -HZ - 2.2, 0);
  P.chaseLights(g, -HX - 1, 3.2, -HZ - 1.8, HX + 1, -HZ - 1.8, 20, 0xffd27a, 2.5);
  P.chaseLights(g, -HX - 1, 3.2, HZ + 1.8, HX + 1, HZ + 1.8, 20, 0x8ad8ff, 2.5);
  [[-HX - 1, -HZ - 1.8], [HX + 1, -HZ - 1.8], [-HX - 1, HZ + 1.8], [HX + 1, HZ + 1.8]].forEach(([x, z]) => P.lantern(g, x, -0.3, z, 3.6, 0xffd27a));
  // nieve que cae
  P.drift(g, 90, -26, 26, 16, -0.3, -20, 20, 0xffffff, 0.12, 1.3);
}
