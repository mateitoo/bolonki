// Decorado de los mapas nuevos de Bola Brava (CIRCO, PLAYA, TERRAZA; la FERIA quedó sin usar). La arena es la misma (piso de 20×20 con
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
   CIRCO: adentro de la carpa, con tribunas llenas, reflectores y números de circo alrededor de la pista
   ===================================================================== */
function pedestal(p, x, z, h = 0.9, r = 0.9) {                // tamborcito de circo con estrella arriba
  const g = grp(p, x, Y, z);
  add(new THREE.CylinderGeometry(r, r * 1.05, h, 12), P.M(0xffffff, { map: TX.circus }), 0, h / 2, 0, g);
  add(new THREE.CylinderGeometry(r + 0.06, r + 0.06, 0.1, 12), P.M(0xffd24a, { unlit: true }), 0, h, 0, g);
  P.floorStar(g, 0, h + 0.06, 0, r * 0.7, 0x3a7aff);
  return g;
}
function bigBall(p, x, z, r = 1.1) {                          // pelota de circo rayada
  const b = add(new THREE.SphereGeometry(r, 12, 8), P.M(0xffffff, { map: TX.circusBall }), x, Y + r, z, p);
  P.anim(b, (t) => { b.rotation.y = t * 0.6 + x; });
  return b;
}
function elephant(p, x, z, ry) {                              // elefante parado arriba de un tambor
  const pd = pedestal(p, x, z, 1.0, 1.4); pd.rotation.y = ry;
  const g = grp(pd, 0, 1.05, 0), gm = P.M(0x9aa0b0), dk = P.M(0x6a7080);
  const b = add(new THREE.SphereGeometry(1, 10, 7), gm, 0, 1.3, 0, g); b.scale.set(0.85, 0.8, 1.25);
  const hd = add(new THREE.SphereGeometry(0.62, 8, 6), gm, 0, 1.75, 1.05, g);
  [-1, 1].forEach((sd) => { const e = add(new THREE.CircleGeometry(0.55, 8), P.M(0xc8a0b0, { side: THREE.DoubleSide }), sd * 0.55, 1.8, 0.9, g); e.rotation.y = sd * 1.1; });
  const trunk = grp(hd, 0, -0.2, 0.5);
  for (let k = 0; k < 4; k++) add(new THREE.CylinderGeometry(0.16 - k * 0.025, 0.18 - k * 0.025, 0.4, 6), dk, 0, -k * 0.3, k * 0.08, trunk).rotation.x = 0.3;
  [[-0.45, 0.6], [0.45, 0.6], [-0.45, -0.6], [0.45, -0.6]].forEach(([a, c]) => add(new THREE.CylinderGeometry(0.24, 0.26, 0.9, 6), gm, a, 0.45, c, g));
  add(box(0.9, 0.08, 1.1), P.M(0xe8303a, { map: TX.cloth }), 0, 2.02, 0, g);                 // mantita
  add(new THREE.ConeGeometry(0.2, 0.45, 6), P.M(0xffd24a), 0, 2.42, 1.05, g);                  // gorrito
  P.anim(g, (t) => { trunk.rotation.x = Math.sin(t * 1.2) * 0.4; });
}
function cannon(p, x, z, ry) {
  const g = grp(p, x, Y, z, ry);
  [-0.7, 0.7].forEach((sx) => { const w = add(new THREE.CylinderGeometry(0.7, 0.7, 0.2, 12), P.M(0xe8303a, { map: TX.wood }), sx, 0.7, 0, g); w.rotation.z = Math.PI / 2; });
  const b = add(new THREE.CylinderGeometry(0.55, 0.75, 3.2, 12), P.M(0x3a7aff, { map: TX.metal }), 0, 1.6, 0.4, g); b.rotation.x = -0.9;
  add(new THREE.TorusGeometry(0.6, 0.1, 4, 12), P.M(0xffd24a), 0, 2.6, 1.35, g).rotation.x = -0.9 + Math.PI / 2;
}
function fireHoop(p, x, z, ry) {                              // aro con fuego sobre un soporte
  const g = grp(p, x, Y, z, ry);
  add(new THREE.CylinderGeometry(0.08, 0.1, 1.6, 5), P.M(0x8a8f98, { map: TX.metal }), 0, 0.8, 0, g);
  add(new THREE.TorusGeometry(1.1, 0.1, 5, 16), P.M(0xffd24a), 0, 2.7, 0, g);
  const fl = [];
  for (let k = 0; k < 10; k++) { const a = (k / 10) * Math.PI * 2; fl.push(add(new THREE.ConeGeometry(0.16, 0.5, 4), P.M(k % 2 ? 0xff7a1a : 0xffd24a, { unlit: true }), Math.cos(a) * 1.1, 2.7 + Math.sin(a) * 1.1, 0, g)); }
  P.anim(g, (t) => fl.forEach((f, k) => { f.scale.y = 0.7 + Math.abs(Math.sin(t * 9 + k)) * 0.6; }));
}
function trapeze(p, x, z, h = 16) {
  const g = grp(p, x, Y + h, z), rm = P.M(0xd8c8a0);
  const sw = grp(g);
  [-0.8, 0.8].forEach((sx) => add(box(0.05, 6, 0.05), rm, sx, -3, 0, sw));
  add(new THREE.CylinderGeometry(0.06, 0.06, 1.7, 5), P.M(0xffd24a), 0, -6, 0, sw).rotation.z = Math.PI / 2;
  const ph = rnd(0, 6);
  P.anim(g, (t) => { sw.rotation.x = Math.sin(t * 1.1 + ph) * 0.5; });
}
function spotlight(p, x, z, tx, tz, col, ph) {                // reflector colgado con su haz de luz que barre la pista
  const g = grp(p, x, 18, z);
  add(new THREE.CylinderGeometry(0.5, 0.7, 1.1, 8), P.M(0x2a2d36, { map: TX.metal }), 0, 0, 0, g);
  const beamG = new THREE.ConeGeometry(4.2, 20, 12, 1, true); beamG.translate(0, -10, 0);
  const beam = new THREE.Mesh(beamG, new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.1, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
  g.add(beam);
  const base = new THREE.Vector3(tx, Y, tz), cur = new THREE.Vector3();
  P.anim(g, (t) => {
    cur.set(base.x + Math.sin(t * 0.4 + ph) * 7, 18 - 20, base.z + Math.cos(t * 0.33 + ph) * 7);
    const dx = cur.x - x, dz = cur.z - z, dy = -20;
    beam.rotation.set(0, 0, 0); beam.lookAt(g.position.x + dx, g.position.y + dy, g.position.z + dz); beam.rotateX(Math.PI / 2);
  });
}
function ringmaster(p, x, z) {                                // presentador con galera y saco rojo, arriba de un tambor, saludando
  const pd = pedestal(p, x, z, 1.1, 1.1);
  const g = grp(pd, 0, 1.15, 0), red = P.M(0xd8202a), blk = P.M(0x1a1a1e), skin = P.M(0xf0c8a8), gold = P.M(0xffd24a);
  add(box(0.5, 0.9, 0.3), blk, 0, 0.45, 0, g);                                  // pantalón
  add(box(0.7, 0.8, 0.45), red, 0, 1.3, 0, g);                                   // saco
  [-0.12, 0.12].forEach((sx) => add(box(0.06, 0.06, 0.02), gold, sx, 1.45, 0.24, g));
  add(new THREE.SphereGeometry(0.26, 8, 6), skin, 0, 1.95, 0, g);
  add(box(0.3, 0.06, 0.05), blk, 0, 1.9, 0.25, g);                               // bigote
  add(new THREE.CylinderGeometry(0.36, 0.36, 0.04, 10), blk, 0, 2.18, 0, g); add(new THREE.CylinderGeometry(0.22, 0.24, 0.5, 10), blk, 0, 2.42, 0, g);
  add(new THREE.CylinderGeometry(0.245, 0.245, 0.08, 10), red, 0, 2.24, 0, g);
  const arm = grp(g, 0.42, 1.55, 0); add(box(0.16, 0.6, 0.16), red, 0, 0.25, 0, arm); add(new THREE.SphereGeometry(0.1, 6, 4), P.M(0xffffff), 0, 0.6, 0, arm);
  add(box(0.16, 0.6, 0.16), red, -0.42, 1.25, 0, g);
  P.anim(g, (t) => { arm.rotation.z = -0.4 + Math.sin(t * 3) * 0.5; g.rotation.y = Math.sin(t * 0.5) * 0.6; });
}
function popcorn(p, x, z, ry) {                                  // carrito de pochoclos
  const g = grp(p, x, Y, z, ry);
  add(box(1.8, 1.0, 1.1), P.M(0xe8303a, { map: TX.circus }), 0, 0.7, 0, g);
  [[-0.8, -0.45], [0.8, -0.45], [-0.8, 0.45], [0.8, 0.45]].forEach(([a, b]) => add(box(0.08, 1.4, 0.08), P.M(0xffd24a), a, 1.9, b, g));
  add(box(1.9, 0.2, 1.2), P.M(0xe8303a), 0, 2.65, 0, g);
  add(box(1.5, 0.8, 0.9), P.M(0xfff4c8, { map: TX.pebble }), 0, 1.6, 0, g);        // pochoclos adentro
  [-0.55, 0.55].forEach((a) => { const w = add(new THREE.CylinderGeometry(0.4, 0.4, 0.1, 10), P.M(0x2a2a2e), a, 0.3, 0.6, g); w.rotation.x = Math.PI / 2; });
  add(box(1.4, 0.35, 0.05), P.M(0xffd24a, { unlit: true }), 0, 2.95, 0.6, g);
}
function cottonCandy(p, x, z, ry) {                             // puesto de algodón de azúcar
  const g = grp(p, x, Y, z, ry);
  add(new THREE.CylinderGeometry(0.8, 0.9, 1.1, 10), P.M(0xff8ac0, { map: TX.circus }), 0, 0.55, 0, g);
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2, sx = Math.sin(a) * 0.5, sz = Math.cos(a) * 0.5;
    add(new THREE.CylinderGeometry(0.03, 0.03, 0.9, 4), P.M(0xffffff), sx, 1.5, sz, g);
    add(new THREE.DodecahedronGeometry(0.32, 1), P.M([0xffb0e0, 0x9ad8ff, 0xffffff, 0xd8b0ff][k]), sx, 2.1, sz, g);
  }
}
function clownCar(p, x, z) {                                    // autito de payasos (tiembla, como a punto de explotar de gente)
  const g = grp(p, x, Y, z, -Math.PI / 2 + 0.3);
  add(box(1.6, 0.8, 2.4), P.M(0xffd23a, { map: TX.metal }), 0, 0.7, 0, g);
  add(box(1.4, 0.6, 1.2), P.M(0x3a8aff, { map: TX.metal }), 0, 1.4, -0.2, g);
  [[-0.8, 0.8], [0.8, 0.8], [-0.8, -0.8], [0.8, -0.8]].forEach(([a, b]) => { const w = add(new THREE.CylinderGeometry(0.4, 0.4, 0.3, 10), P.M(0x1a1a1e), a, 0.4, b, g); w.rotation.z = Math.PI / 2; });
  [[-0.35, 0xff5a4a], [0.1, 0x39d98a], [0.45, 0xb07aff]].forEach(([a, c]) => { add(new THREE.SphereGeometry(0.24, 8, 6), P.M(0xf4f2ee), a, 1.95, 0.1, g); add(new THREE.SphereGeometry(0.07, 5, 4), P.M(0xe8203a), a, 1.93, 0.33, g); add(new THREE.SphereGeometry(0.2, 6, 4), P.M(c), a, 2.12, 0.05, g); });
  add(new THREE.SphereGeometry(0.2, 6, 4), P.M(0xff3a3a), 0, 1.2, 1.25, g);   // bocina
  P.anim(g, (t) => { g.position.y = Y + Math.abs(Math.sin(t * 9)) * 0.08; g.rotation.z = Math.sin(t * 7) * 0.03; });
}
export function decorCirco(g) {
  P.sky(g, [[0, '#1a0610'], [0.4, '#3a0a1a'], [0.5, '#5a1a2a'], [1, '#12060a']], { r: 110 });
  // la carpa: pared rayada alrededor y el techo en punta (alto, así no tapa la cámara)
  const R = 38;
  const wall = scaleUV(new THREE.CylinderGeometry(R, R, 18, 32, 1, true), 16, 1);
  add(wall, P.M(0xffffff, { map: TX.circus, side: THREE.DoubleSide }), 0, Y + 9, 0, g);
  const roof = scaleUV(new THREE.ConeGeometry(R, 26, 32, 1, true), 16, 1);
  add(roof, P.M(0xd0c0c0, { map: TX.circus, side: THREE.DoubleSide }), 0, Y + 18 + 13, 0, g);
  // mástiles con guirnaldas
  const poles = [[-26, -26], [26, -26], [26, 26], [-26, 26]];
  poles.forEach(([x, z]) => { add(new THREE.CylinderGeometry(0.35, 0.45, 36, 8), P.M(0xffffff, { map: TX.stripes }), x, Y + 18, z, g); });
  for (let k = 0; k < 4; k++) { const [x1, z1] = poles[k], [x2, z2] = poles[(k + 1) % 4]; P.bunting(g, x1, 14, z1, x2, 14, z2, 18); }
  // tribunas llenas mirando a la pista (una por lado)
  [[0, -19.5, 0], [19.5, 0, Math.PI / 2], [0, 19.5, Math.PI], [-19.5, 0, -Math.PI / 2]].forEach(([x, z, a]) => {
    const st = P.stands(g, x, Y, z, a, 22, 5, 1.2, 0.8);
    void st;
  });
  // pista: borde redondo rojo y dorado alrededor de la arena
  const curb = new THREE.TorusGeometry(16.2, 0.45, 4, 40); curb.rotateX(Math.PI / 2);
  add(curb, P.M(0xe8303a), 0, Y + 0.35, 0, g);
  const curbTop = new THREE.TorusGeometry(16.2, 0.2, 3, 40); curbTop.rotateX(Math.PI / 2);
  add(curbTop, P.M(0xffd24a, { unlit: true }), 0, Y + 0.8, 0, g);
  // números de circo en las esquinas de la pista
  elephant(g, -15, -11.5, 0.6);
  cannon(g, 14.5, -11, -0.7);
  fireHoop(g, 13, 13.5, -0.7);
  pedestal(g, -14, 12.5); bigBall(g, -12.2, 14.5, 1.0); bigBall(g, 15.5, 8, 0.8);
  pedestal(g, 11, -14.5, 0.7, 0.7); pedestal(g, -11.5, 14.8, 0.6, 0.6);
  // arriba: trapecios y reflectores que barren la pista
  trapeze(g, -6, -4, 17); trapeze(g, 6, 4, 17);
  spotlight(g, -18, -18, 0, 0, 0xfff0b0, 0); spotlight(g, 18, -18, 0, 0, 0xffb0d0, 2); spotlight(g, 18, 18, 0, 0, 0xb0e0ff, 4); spotlight(g, -18, 18, 0, 0, 0xfff0b0, 5);
  P.balloons(g, -16, 3, -2, 3, 5); P.balloons(g, 16, 3, 2, 3, 5);
  ringmaster(g, 0, -17.6);
  popcorn(g, -17.4, 5.5, 0.9); cottonCandy(g, 17.4, 6, -0.9);
  clownCar(g, 17.2, -5.5);
  // guirnaldas de lamparitas colgadas del techo hasta el borde de la pista
  for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2 + 0.2; P.chaseLights(g, 0, 22, 0, Math.sin(a) * 17, 9, Math.cos(a) * 17, 10, [0xffe07a, 0xff5fa2, 0x7ae0ff][k % 3], 2); }
  P.scatter(g, 0, Y + 0.01, 0, 30, 30, 200, 0xffe14a, 0.12, [15, 15]);        // papel picado
  P.scatter(g, 0, Y + 0.01, 0, 30, 30, 200, 0xff5fa2, 0.12, [15, 15]);
}

/* =====================================================================
   PLAYA: al atardecer, con el mar alrededor
   ===================================================================== */
export function umbrella(p, x, z, a = 0xff5a4a, b = 0xffffff) {
  const g = grp(p, x, Y, z, rnd(0, 6));
  add(new THREE.CylinderGeometry(0.06, 0.06, 2.6, 5), P.M(0xe8e8e8), 0, 1.3, 0, g).rotation.z = 0.12;
  const n = 8;
  for (let k = 0; k < n; k++) add(new THREE.ConeGeometry(1.7, 0.6, n, 1, true, (k / n) * Math.PI * 2, (Math.PI * 2) / n), P.M(k % 2 ? a : b, { side: THREE.DoubleSide }), 0.15, 2.55, 0, g);
  const tw = add(box(1.0, 0.04, 1.9), P.M([0x3a7aff, 0xffe14a, 0x39d98a, 0xff5fa2][(Math.random() * 4) | 0]), 1.2, 0.03, 0.4, g); tw.rotation.y = 0.3;
}
export function lifeguardChair(p, x, z) {
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
export function sandcastle(p, x, z, s = 1) {
  const g = grp(p, x, Y, z, rnd(0, 6)); g.scale.setScalar(s);
  const sm = P.M(0xe8c888, { map: TX.sand });
  add(box(2.2, 0.8, 2.2), sm, 0, 0.4, 0, g);
  [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([a, b]) => { add(new THREE.CylinderGeometry(0.42, 0.5, 1.4, 6), sm, a, 0.7, b, g); add(new THREE.ConeGeometry(0.5, 0.6, 6), sm, a, 1.7, b, g); });
  add(new THREE.CylinderGeometry(0.6, 0.7, 1.6, 6), sm, 0, 1.4, 0, g);
  P.flag(g, 0, 2.2, 0, 0.8, 0xff5a4a);
}
export function boat(p, x, z, ry) {
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
export function seagulls(p, cx, cy, cz, r, n = 4) {
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
export function parador(p, x, z) {                                    // bar de playa con techo de paja
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
export function surfboards(p, x, z) {
  const g = grp(p, x, Y, z, rnd(0, 6));
  [[0xff5a4a, -0.6], [0x39d98a, 0], [0xffe14a, 0.6]].forEach(([c, dx], k) => {
    const b = add(new THREE.SphereGeometry(0.5, 8, 5), P.M(c), dx, 1.1, 0, g); b.scale.set(0.8, 2.4, 0.12); b.rotation.z = (k - 1) * 0.12;
  });
}
export function beachKit(p, x, z) {                                   // heladerita, balde y pala, reposera
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
export function kite(p, x, y, z) {                                    // barrilete volando, con la cola moviéndose
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
  // la parrilla con el asado (humito y brasas), mesa de plástico con sillas, antena de TV satelital y palomas
  parrilla(g, 16, -22.5, 0);
  patioTable(g, 24, -16);
  P.dish(g, -24.5, Y + 1.2, -3, Math.PI / 2, 0.9);
  pigeons(g, [[-6, -24.2], [-4.8, -24.6], [9, 24.3], [-25, 0.5], [25, 4]]);
  // guirnaldas de lamparitas cruzadas de tanque a tanque
  P.chaseLights(g, -21, 6.2, -21, 21, 6.2, -20, 20, 0xffe0a0, 1.5);
  P.chaseLights(g, 21, 6.2, -20, 22, 6.2, 21, 20, 0xffe0a0, 1.5);
}
function parrilla(p, x, z, ry) {                                // parrilla de ladrillo con brasas y humo
  const g = grp(p, x, Y, z, ry), bm = P.M(0xc07a5a, { map: TX.brick }), mm = P.M(0x2a2a2e, { map: TX.metal });
  add(box(3.2, 1.1, 1.3), bm, 0, 0.55, 0, g);
  add(box(0.9, 2.6, 1.3), bm, -1.95, 1.3, 0, g);
  add(new THREE.CylinderGeometry(0.35, 0.45, 1.8, 6), bm, -1.95, 3.5, 0, g);
  add(box(3.0, 0.05, 1.1), P.M(0xff5a1a, { unlit: true }), 0, 1.1, 0, g);                   // brasas
  for (let k = 0; k < 9; k++) add(box(0.04, 0.04, 1.1), mm, -1.3 + k * 0.33, 1.25, 0, g);  // la parrilla
  [[-0.8, 0x8a3a2a], [0, 0xa84a2a], [0.8, 0x7a2a1a]].forEach(([a, c]) => add(box(0.55, 0.12, 0.3), P.M(c), a, 1.35, 0.1, g));   // carne y chorizos
  [-0.4, 0.4].forEach((a) => { const ch = add(new THREE.CylinderGeometry(0.08, 0.08, 0.6, 6), P.M(0x9a3a2a), a, 1.36, -0.35, g); ch.rotation.z = Math.PI / 2; });
  P.smoke(g, -1.95, 4.5, 0, 5, 1.1, 0x8a8a94);
  P.smoke(g, 0.3, 1.5, 0, 3, 0.6, 0xa0a0a8);
}
function patioTable(p, x, z) {                                  // mesa de plástico blanca con sillas y una sombrilla
  const g = grp(p, x, Y, z, rnd(0, 3)), w = P.M(0xf0f0f0);
  add(new THREE.CylinderGeometry(1.1, 1.1, 0.08, 12), w, 0, 1.0, 0, g);
  add(new THREE.CylinderGeometry(0.08, 0.1, 1.0, 5), w, 0, 0.5, 0, g);
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2 + 0.4, ch = grp(g, Math.sin(a) * 1.6, 0, Math.cos(a) * 1.6, a + Math.PI);
    add(box(0.7, 0.06, 0.7), w, 0, 0.6, 0, ch); add(box(0.7, 0.7, 0.06), w, 0, 0.95, -0.32, ch);
    [[-0.3, -0.3], [0.3, -0.3], [-0.3, 0.3], [0.3, 0.3]].forEach(([a2, b2]) => add(box(0.05, 0.6, 0.05), w, a2, 0.3, b2, ch));
  }
  add(new THREE.CylinderGeometry(0.05, 0.05, 2.6, 4), w, 0, 1.6, 0, g);
  const n = 8;
  for (let k = 0; k < n; k++) add(new THREE.ConeGeometry(1.8, 0.6, n, 1, true, (k / n) * Math.PI * 2, (Math.PI * 2) / n), P.M(k % 2 ? 0x39a86a : 0xffffff, { side: THREE.DoubleSide }), 0, 2.9, 0, g);
  [[0.3, 0.2, 0x3a8a3a], [-0.35, -0.2, 0x7a4a1a]].forEach(([a, b, c]) => add(new THREE.CylinderGeometry(0.09, 0.09, 0.4, 6), P.M(c), a, 1.24, b, g));   // botellas
}
function pigeons(p, pts) {                                      // palomas que picotean el piso del pretil
  pts.forEach(([x, z], i) => {
    const g = grp(p, x, Y + 1.2, z, rnd(0, 6)), gm = P.M(0x8a8a9a), dk = P.M(0x5a5a6a);
    const b = add(new THREE.SphereGeometry(0.22, 6, 5), gm, 0, 0.2, 0, g); b.scale.set(0.8, 0.8, 1.3);
    const h = grp(g, 0, 0.36, 0.22);
    add(new THREE.SphereGeometry(0.12, 6, 5), dk, 0, 0, 0, h); add(new THREE.ConeGeometry(0.04, 0.12, 4), P.M(0xe8a040), 0, -0.02, 0.14, h).rotation.x = Math.PI / 2;
    add(box(0.18, 0.05, 0.25), dk, 0, 0.22, -0.3, g).rotation.x = 0.3;
    P.anim(g, (t) => { h.rotation.x = Math.max(0, Math.sin(t * 3 + i * 2)) * 0.9; g.rotation.y += Math.sin(t * 0.7 + i) * 0.004; });
  });
}

/* ---------- piezas de juego (van en cada mapa, las maneja bolas.js) ---------- */
// Tambor giratorio en el medio del CIRCO (con una foca que hace equilibrio con una pelota): rebota las pelotas
// y, como gira, las tira de costado
export function carousel(p, r) {
  const g = grp(p, 0, 0, 0);
  const rot = grp(g);
  add(scaleUV(new THREE.CylinderGeometry(r, r + 0.08, 0.8, 18), 3, 1), P.M(0xffffff, { map: TX.circus }), 0, 0.4, 0, rot);
  add(new THREE.CylinderGeometry(r + 0.08, r + 0.08, 0.12, 18), P.M(0xffd24a, { unlit: true }), 0, 0.82, 0, rot);
  for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; add(new THREE.SphereGeometry(0.09, 5, 4), P.M(k % 2 ? 0xffffff : 0xffe07a, { unlit: true }), Math.sin(a) * (r + 0.1), 0.62, Math.cos(a) * (r + 0.1), rot); }
  P.floorStar(rot, 0, 0.9, 0, r * 0.75, 0x3a7aff);
  // foca
  const seal = grp(rot, 0, 0.88, 0), sm = P.M(0x5a6878), km = P.M(0x111111);
  const body = add(new THREE.SphereGeometry(0.42, 10, 7), sm, 0, 0.42, -0.1, seal); body.scale.set(0.9, 1.15, 1.2);
  add(new THREE.SphereGeometry(0.28, 8, 6), sm, 0, 0.95, 0.12, seal);
  add(new THREE.SphereGeometry(0.08, 5, 4), km, 0, 0.93, 0.4, seal);
  [-0.1, 0.1].forEach((x) => add(new THREE.SphereGeometry(0.045, 4, 3), km, x, 1.05, 0.33, seal));
  [-1, 1].forEach((sd) => { const f = add(box(0.35, 0.06, 0.2), sm, sd * 0.4, 0.35, 0.1, seal); f.rotation.z = sd * -0.5; });
  const ball = add(new THREE.SphereGeometry(0.3, 10, 7), P.M(0xffffff, { map: TX.circusBall }), 0, 1.48, 0.28, seal);
  ball.userData.ph = -1;
  return { g, rot, seal, ball };
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

/* =====================================================================
   ESPACIO: la arena flotando en el espacio, con galaxias, nebulosas, planetas y estrellas fugaces.
   La cámara mira para abajo, así que el fondo que se ve está debajo del horizonte: el cielo está pintado
   entero (arriba y abajo) y los planetas van abajo, detrás de la arena. Todo sin niebla (MeshBasic).
   ===================================================================== */
function spaceCanvas() {
  const W = 1024, H = 512, c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d');
  x.fillStyle = '#03040c'; x.fillRect(0, 0, W, H);
  const blob = (u, v, r, col, sx = 1) => {
    for (const du of [-W, 0, W]) {
      x.save(); x.translate(u * W + du, v * H); x.scale(sx, 1);
      const g = x.createRadialGradient(0, 0, 0, 0, 0, r); g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = g; x.fillRect(-r, -r, r * 2, r * 2); x.restore();
    }
  };
  // nebulosas (sobre todo en la mitad de abajo, que es la que se ve)
  blob(0.15, 0.7, 150, 'rgba(120,40,160,.35)', 1.8); blob(0.22, 0.75, 90, 'rgba(255,90,160,.22)', 1.5);
  blob(0.55, 0.62, 170, 'rgba(30,110,170,.3)', 2); blob(0.62, 0.68, 80, 'rgba(60,220,200,.2)', 1.4);
  blob(0.85, 0.8, 130, 'rgba(160,60,40,.25)', 1.7); blob(0.4, 0.3, 120, 'rgba(70,50,160,.25)', 2);
  // estrellas de varios tamaños
  for (let i = 0; i < 2600; i++) {
    const a = Math.random() ** 3; x.fillStyle = `rgba(${220 + rnd(0, 35)},${220 + rnd(0, 35)},255,${0.25 + a * 0.75})`;
    x.fillRect(Math.random() * W, Math.random() * H, a > 0.6 ? 2 : 1, a > 0.6 ? 2 : 1);
  }
  for (let i = 0; i < 40; i++) {                                   // estrellas con cruz de brillo
    const sx = Math.random() * W, sy = Math.random() * H, col = ['#ffffff', '#bfe0ff', '#ffe8b0', '#ffc0d8'][i % 4];
    x.fillStyle = col; x.fillRect(sx - 3, sy, 7, 1); x.fillRect(sx, sy - 3, 1, 7); x.fillRect(sx - 1, sy - 1, 3, 3);
  }
  // galaxias espirales (puntitos en dos brazos) y una elíptica
  const spiral = (u, v, R, tilt, rot, cols) => {
    x.save(); x.translate(u * W, v * H); x.rotate(rot); x.scale(1, tilt);
    const g = x.createRadialGradient(0, 0, 0, 0, 0, R * 0.35); g.addColorStop(0, 'rgba(255,240,210,.9)'); g.addColorStop(1, 'rgba(255,200,150,0)');
    x.fillStyle = g; x.beginPath(); x.arc(0, 0, R * 0.35, 0, 7); x.fill();
    for (let arm = 0; arm < 2; arm++) for (let i = 0; i < 700; i++) {
      const t = Math.random(), ang = arm * Math.PI + t * 5.5, r = t * R + rnd(-4, 4) * (0.4 + t);
      x.fillStyle = cols[(Math.random() * cols.length) | 0]; x.globalAlpha = 0.25 + (1 - t) * 0.6;
      x.fillRect(Math.cos(ang) * r + rnd(-2, 2), Math.sin(ang) * r + rnd(-2, 2), 1.5, 1.5);
    }
    x.restore(); x.globalAlpha = 1;
  };
  spiral(0.3, 0.72, 70, 0.45, 0.4, ['#bfd8ff', '#ffffff', '#c8b0ff', '#ffc8e8']);
  spiral(0.74, 0.66, 48, 0.6, -0.8, ['#ffe0b0', '#ffffff', '#ffb0a0']);
  spiral(0.52, 0.86, 34, 0.35, 1.2, ['#a0ffe8', '#ffffff', '#b0c8ff']);
  const el = x.createRadialGradient(0.9 * W, 0.58 * H, 0, 0.9 * W, 0.58 * H, 22); el.addColorStop(0, 'rgba(255,230,200,.8)'); el.addColorStop(1, 'rgba(255,200,160,0)');
  x.fillStyle = el; x.beginPath(); x.ellipse(0.9 * W, 0.58 * H, 22, 12, 0.5, 0, 7); x.fill();
  const t = new THREE.CanvasTexture(c); t.minFilter = THREE.LinearFilter; t.generateMipmaps = false;
  return t;
}
function planetTex(kind) {
  const W = 256, H = 128, c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d');
  if (kind === 'gas') {                                           // gigante gaseoso con bandas y una tormenta
    const cols = ['#e8c89a', '#c89060', '#f0dcb8', '#a8704a', '#e0b080', '#f4e8d0', '#b88058'];
    let y = 0; while (y < H) { const hh = rnd(4, 14); x.fillStyle = cols[(Math.random() * cols.length) | 0]; x.fillRect(0, y, W, hh); y += hh; }
    for (let i = 0; i < 60; i++) { x.fillStyle = 'rgba(255,255,255,.12)'; x.fillRect(Math.random() * W, Math.random() * H, rnd(10, 60), 1); }
    x.fillStyle = '#c8603a'; x.beginPath(); x.ellipse(70, 78, 16, 8, 0, 0, 7); x.fill(); x.fillStyle = '#e88a5a'; x.beginPath(); x.ellipse(70, 78, 9, 4, 0, 0, 7); x.fill();
  } else if (kind === 'rock') {                                   // planeta rojo con cráteres
    x.fillStyle = '#b8503a'; x.fillRect(0, 0, W, H);
    for (let i = 0; i < 400; i++) { x.fillStyle = Math.random() < 0.5 ? 'rgba(90,30,20,.3)' : 'rgba(240,150,110,.25)'; x.fillRect(Math.random() * W, Math.random() * H, rnd(2, 8), rnd(1, 4)); }
    for (let i = 0; i < 26; i++) { const cx = Math.random() * W, cy = rnd(10, H - 10), r = rnd(2, 9); x.fillStyle = 'rgba(70,20,15,.5)'; x.beginPath(); x.arc(cx, cy, r, 0, 7); x.fill(); x.fillStyle = 'rgba(255,190,150,.35)'; x.beginPath(); x.arc(cx - r * 0.3, cy - r * 0.3, r * 0.6, 0, 7); x.fill(); }
    x.fillStyle = 'rgba(255,255,255,.7)'; x.fillRect(0, 0, W, 6); x.fillRect(0, H - 5, W, 5);           // polos helados
  } else {                                                        // luna helada / planeta de océano
    const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#dff4ff'); g.addColorStop(0.5, '#4a9ad8'); g.addColorStop(1, '#dff4ff');
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    for (let i = 0; i < 30; i++) { x.fillStyle = 'rgba(80,170,90,.7)'; x.beginPath(); x.ellipse(Math.random() * W, rnd(30, 98), rnd(6, 20), rnd(4, 10), rnd(0, 3), 0, 7); x.fill(); }
    for (let i = 0; i < 40; i++) { x.fillStyle = 'rgba(255,255,255,.55)'; x.fillRect(Math.random() * W, Math.random() * H, rnd(10, 40), rnd(1, 3)); }
  }
  const t = new THREE.CanvasTexture(c); t.minFilter = THREE.LinearFilter; t.generateMipmaps = false;
  return t;
}
export function decorEspacio(g) {
  const sky = new THREE.Mesh(new THREE.SphereGeometry(118, 32, 20), new THREE.MeshBasicMaterial({ map: spaceCanvas(), side: THREE.BackSide, depthWrite: false, fog: false }));
  sky.renderOrder = -10; g.add(sky);
  P.anim(sky, (t) => { sky.rotation.y = t * 0.004; });
  const B = (o) => new THREE.MeshBasicMaterial(Object.assign({ fog: false }, o));
  // planetas abajo, detrás de la arena (se ven entre la arena y el borde de la pantalla)
  const planet = (kind, pos, r, ring, tilt = 0.4) => {
    const pg = grp(g, pos[0], pos[1], pos[2]);
    const m = new THREE.Mesh(new THREE.SphereGeometry(r, 28, 18), B({ map: planetTex(kind) })); pg.add(m);
    // lado oscuro: una media esfera negra transparente un poco más grande (sombra del planeta)
    const sh = new THREE.Mesh(new THREE.SphereGeometry(r * 1.01, 28, 18, 0, Math.PI), B({ color: 0x000000, transparent: true, opacity: 0.55, depthWrite: false }));
    sh.rotation.y = 2.2; pg.add(sh);
    if (ring) {
      const rg = new THREE.RingGeometry(r * 1.35, r * 2.1, 48);
      const rm = new THREE.Mesh(rg, B({ color: ring, side: THREE.DoubleSide, transparent: true, opacity: 0.7 })); rm.rotation.x = Math.PI / 2 - tilt; pg.add(rm);
      const rg2 = new THREE.RingGeometry(r * 2.15, r * 2.35, 48);
      const rm2 = new THREE.Mesh(rg2, B({ color: ring, side: THREE.DoubleSide, transparent: true, opacity: 0.35 })); rm2.rotation.x = Math.PI / 2 - tilt; pg.add(rm2);
    }
    P.anim(pg, (t) => { m.rotation.y = t * 0.03; });
    return pg;
  };
  planet('gas', [-46, -34, -58], 14, 0xe8d0a8, 0.35);
  planet('rock', [44, -26, -50], 6.5);
  planet('ice', [18, -48, -78], 4.2);
  planet('rock', [-70, -60, 10], 5).scale.setScalar(0.8);
  planet('ice', [64, -52, 26], 9);
  // la base de la arena (se ve al girar la cámara): plataforma de metal con propulsores que brillan
  const base = grp(g, 0, -2.2, 0), mm = P.M(0x3a4458, { map: TX.metal });
  add(new THREE.BoxGeometry(29, 1.6, 29), mm, 0, -0.8, 0, base);
  add(new THREE.CylinderGeometry(12, 5, 7, 8), mm, 0, -5, 0, base).rotation.y = Math.PI / 8;
  const glowM = P.M(0x35f0ff, { unlit: true });
  [[-10, -10], [10, -10], [10, 10], [-10, 10]].forEach(([x, z]) => {
    add(new THREE.CylinderGeometry(1.2, 1.6, 1.6, 8), P.M(0x2a3040, { map: TX.metal }), x, -2.3, z, base);
    const fl = add(new THREE.ConeGeometry(1.1, 3, 8), glowM, x, -4.4, z, base); fl.rotation.x = Math.PI;
    P.anim(fl, (t) => { fl.scale.y = 0.8 + Math.abs(Math.sin(t * 13 + x)) * 0.4; });
  });
  add(new THREE.ConeGeometry(4, 5, 8), glowM, 0, -10.8, 0, base).rotation.x = Math.PI;
  // asteroides flotando cerca (con la niebla del mapa, como el resto de la arena)
  P.asteroids(g, 18, 26, 44, -14, -4);
  // estrellas fugaces: cada tanto cruza una por el fondo
  const tm = document.createElement('canvas'); tm.width = 64; tm.height = 4;
  const tx = tm.getContext('2d'), tg = tx.createLinearGradient(0, 0, 64, 0); tg.addColorStop(0, 'rgba(255,255,255,0)'); tg.addColorStop(0.85, 'rgba(200,230,255,.8)'); tg.addColorStop(1, '#ffffff');
  tx.fillStyle = tg; tx.fillRect(0, 0, 64, 4);
  const trailM = B({ map: new THREE.CanvasTexture(tm), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const stars = [0, 1].map(() => { const m = new THREE.Mesh(new THREE.PlaneGeometry(9, 0.28), trailM); m.visible = false; m.renderOrder = -9; g.add(m); return { m, t: 1, next: rnd(1, 4), a: new THREE.Vector3(), b: new THREE.Vector3() }; });
  const tmp = new THREE.Vector3();
  P.anim(g, (t, dt) => stars.forEach((s) => {
    if (s.t >= 1) {
      s.m.visible = false; s.next -= dt;
      if (s.next > 0) return;
      // de un punto a otro del fondo visible (abajo y atrás de la arena)
      const x0 = rnd(-80, 80), y0 = rnd(-18, -45), z0 = rnd(-95, -70), dir = Math.random() < 0.5 ? 1 : -1;
      s.a.set(x0, y0, z0); s.b.set(x0 + dir * rnd(35, 60), y0 - rnd(6, 20), z0 + rnd(-8, 8));
      s.t = 0; s.dur = rnd(0.7, 1.2); s.next = rnd(2.5, 6);
    }
    s.t = Math.min(1, s.t + dt / s.dur);
    s.m.visible = true;
    tmp.lerpVectors(s.a, s.b, s.t); s.m.position.copy(tmp);
    const d = new THREE.Vector3().subVectors(s.b, s.a).normalize();
    s.m.rotation.set(0, 0, 0); s.m.lookAt(tmp.x, tmp.y + 10, tmp.z + 30);      // de cara a la cámara
    s.m.rotateZ(Math.atan2(d.y, d.x));
    s.m.material.opacity = Math.sin(s.t * Math.PI);
    s.m.scale.x = 0.4 + Math.sin(s.t * Math.PI) * 0.8;
  }));
}
