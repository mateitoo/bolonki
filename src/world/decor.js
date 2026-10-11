// Decorado de cada escenario (fuera de la zona de juego): tribunas, jardines, fábricas, dunas, nieve…
// Solo adorna: no cambia nada de cómo se juega. Las piezas están en props.js.
import * as THREE from 'three';
import { add, scaleUV, mat } from '../render/psx.js';
import { TX } from '../render/textures.js';
import { rnd } from '../config.js';
import * as P from './props.js';

/* ---------- Bola Brava ---------- */
export function decorBolas(g) {
  // solo el cielo de noche: la arena flotando en la oscuridad, como siempre (el estadio le sacaba inmersión)
  P.sky(g, [[0, '#03040e'], [0.45, '#070a1c'], [0.52, '#0a0816'], [1, '#04060b']], { stars: 60 });
}

/* ---------- Futbolonki: estadio de noche ---------- */
export function decorFutbol(g, HX, HZ) {
  // piso de afuera (pista de cemento) debajo del pasto
  // (bien subdividido y un poco más abajo: los triángulos grandes "bailan" con el temblor PS1 y se meten en el pasto)
  const fl = new THREE.PlaneGeometry(90, 70, 18, 14); fl.rotateX(-Math.PI / 2);
  add(fl, P.M(0x3a3e4a, { map: TX.floor }), 0, -0.3, 0, g);
  // tribunas en los cuatro lados, con banderas arriba
  const D = HZ + 4.3, DX = HX + 5.3;
  const cols = [0x35a0ff, 0xff5a4a, 0xffe14a, 0xffffff, 0x39d98a];
  [[0, -D, Math.PI, 34], [0, D, 0, 34], [DX, 0, Math.PI / 2, 22], [-DX, 0, -Math.PI / 2, 22]].forEach(([x, z, ry, w], k) => {
    const s = P.stands(g, x, 0, z, ry, w, 4);
    const nf = Math.floor(w / 5.5);
    for (let i = 0; i < nf; i++) P.flag(s, -w / 2 + 2.5 + i * ((w - 5) / (nf - 1)), 3.6, 4.2, 3, cols[(i + k) % cols.length]);
  });
  // bancos de suplentes contra la pared de adelante
  [-6, 6].forEach((x) => P.bench(g, x, 0, HZ + 1.6, Math.PI));
  // torres de luces en las esquinas y pantallas gigantes detrás de las tribunas de los arcos y del fondo
  [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sz]) => P.floodlight(g, sx * (HX + 9), 0, sz * (HZ + 8), 15));
  P.jumbotron(g, 0, 8.5, -(D + 7.5), 0, 13, 5.2);
  P.jumbotron(g, DX + 7.5, 7.5, 0, -Math.PI / 2, 10, 4.6);
  P.jumbotron(g, -(DX + 7.5), 7.5, 0, Math.PI / 2, 10, 4.6);
  P.planet(g, -40, 22, -60, 7, 0x3a6ab8, 0xa0d0ff);
  P.sky(g, [[0, '#04061a'], [0.38, '#0b1236'], [0.48, '#1a2a5a'], [0.52, '#101830'], [1, '#04060b']], { stars: 80 });
  P.twinkleStars(g, 70, 95, 20);
  P.fireworks(g, 0, -38, 28, 6, 12, 20, 3);
  // carteles de LED que cambian de color al costado de la cancha y detrás de los arcos
  const ledCols = [0xff3a5a, 0xffd23a, 0x35a0ff, 0x39d98a, 0xffffff].map((c) => P.M(c, { unlit: true }));
  const leds = [];
  const ledRow = (x1, z1, x2, z2, n) => { const a2 = Math.atan2(x2 - x1, z2 - z1); for (let i = 0; i < n; i++) { const f = (i + 0.5) / n, b = add(new THREE.BoxGeometry(0.2, 0.8, Math.hypot(x2 - x1, z2 - z1) / n - 0.08), ledCols[0], x1 + (x2 - x1) * f, 0.1, z1 + (z2 - z1) * f, g); b.rotation.y = a2; leds.push(b); } };
  ledRow(-HX + 1, -HZ - 1.7, HX - 1, -HZ - 1.7, 12);
  ledRow(-HX - 2.6, -HZ + 1, -HX - 2.6, -2.4, 4); ledRow(-HX - 2.6, 2.4, -HX - 2.6, HZ - 1, 4);
  ledRow(HX + 2.6, -HZ + 1, HX + 2.6, -2.4, 4); ledRow(HX + 2.6, 2.4, HX + 2.6, HZ - 1, 4);
  P.anim(g, (t) => { const s2 = Math.floor(t * 1.5); leds.forEach((b, i) => { b.material = ledCols[(Math.floor(i / 2) + s2) % ledCols.length]; }); });
  // fotógrafos agachados detrás de los arcos, con el flash que salta
  [-1, 1].forEach((sd) => {
    const pts = [[sd * (HX + 3.6), -4.2, -sd * Math.PI / 2], [sd * (HX + 3.6), 4.4, -sd * Math.PI / 2], [sd * (HX + 3.9), 0.2, -sd * Math.PI / 2]];
    P.fans(g, -0.75, pts, { shirts: [0x2a2a30, 0x3a4a6a, 0x1a1a24] });
    pts.forEach(([x, z], k) => {
      const cam = add(new THREE.BoxGeometry(0.35, 0.3, 0.3), P.M(0x1a1a1e), x - sd * 0.35, 0.55, z, g);
      const fl = add(new THREE.BoxGeometry(0.12, 0.12, 0.12), P.M(0xffffff, { unlit: true }), x - sd * 0.5, 0.75, z, g);
      P.anim(fl, (t) => { fl.visible = ((t * 0.7 + k * 0.37 + sd) % 1.7) < 0.06; }); void cam;
    });
  });
  // la mascota del estadio (una pelota gigante con patas) corriendo y saludando por el costado
  const mas = new THREE.Group(); g.add(mas);
  add(new THREE.SphereGeometry(0.9, 12, 8), P.M(0xffffff, { map: TX.stripes }), 0, 1.5, 0, mas);
  [-0.3, 0.3].forEach((sx) => { add(new THREE.SphereGeometry(0.2, 6, 5), P.M(0xffffff), sx, 1.8, 0.78, mas); add(new THREE.SphereGeometry(0.1, 5, 4), P.M(0x1a1a1e), sx, 1.8, 0.95, mas); });
  add(new THREE.BoxGeometry(0.5, 0.1, 0.1), P.M(0xd83a3a), 0, 1.25, 0.85, mas);
  const mlegs = [-0.35, 0.35].map((sx) => { const l = new THREE.Group(); l.position.set(sx, 0.7, 0); mas.add(l); add(new THREE.BoxGeometry(0.22, 0.7, 0.22), P.M(0x35a0ff), 0, -0.3, 0, l); add(new THREE.BoxGeometry(0.3, 0.15, 0.45), P.M(0xffffff), 0, -0.65, 0.08, l); return l; });
  const marms = [-1, 1].map((sx) => { const a2 = new THREE.Group(); a2.position.set(sx * 0.85, 1.6, 0); mas.add(a2); add(new THREE.BoxGeometry(0.18, 0.7, 0.18), P.M(0x35a0ff), 0, 0.3, 0, a2); return a2; });
  P.anim(mas, (t) => {
    const u = Math.sin(t * 0.22), x = u * (HX - 2), run = Math.abs(Math.cos(t * 0.22)) > 0.15;
    mas.position.set(x, -0.3 + (run ? Math.abs(Math.sin(t * 10)) * 0.15 : 0), -HZ - 3.0); mas.rotation.y = run ? (Math.cos(t * 0.22) > 0 ? Math.PI / 2 : -Math.PI / 2) : 0;
    mlegs.forEach((l, k) => { l.rotation.x = run ? Math.sin(t * 10 + k * Math.PI) * 0.7 : 0; });
    marms.forEach((a2, k) => { a2.rotation.z = (k ? -1 : 1) * (run ? 0.3 : 2.4 + Math.sin(t * 8) * 0.4); });
  });
  // cámara de TV sobre un trípode, que sigue el juego
  const tv = new THREE.Group(); tv.position.set(-HX - 1.2, -0.3, -HZ - 2.6); g.add(tv);
  [0, 2.1, 4.2].forEach((a2) => { const l = add(new THREE.BoxGeometry(0.06, 1.5, 0.06), P.M(0x2a2a30), Math.sin(a2) * 0.3, 0.7, Math.cos(a2) * 0.3, tv); l.rotation.set(Math.cos(a2) * 0.2, 0, -Math.sin(a2) * 0.2); });
  const head = new THREE.Group(); head.position.y = 1.5; tv.add(head);
  add(new THREE.BoxGeometry(0.45, 0.45, 0.9), P.M(0x3a3f4a, { map: TX.metal }), 0, 0, 0, head);
  add(new THREE.CylinderGeometry(0.16, 0.2, 0.4, 8), P.M(0x1a1a1e), 0, 0, 0.6, head).rotation.x = Math.PI / 2;
  add(new THREE.BoxGeometry(0.08, 0.08, 0.08), P.M(0xff2a2a, { unlit: true }), 0.15, 0.27, 0.3, head);
  P.anim(tv, (t) => { head.rotation.y = 0.8 + Math.sin(t * 0.4) * 0.5; });
  // dron de TV sobrevolando, el árbitro asistente con la bandera y un utilero que pasa con pelotas
  P.drone(g, 0, 7, -HZ - 3.5, 7, 0.25);
  [0xffffff, 0x35a0ff, 0xff5a4a].forEach((c) => P.drift(g, 24, -HX - 6, HX + 6, 12, -0.3, -HZ - 6, HZ + 2, c, 0.14, 1.1));   // papelitos de la hinchada
  P.walker(g, -HX + 1, -0.3, -HZ - 0.9, HX - 1, -HZ - 0.9, { shirt: 0xffd23a, pants: 0x1a1a1e, sp: 0.25, carry: (w) => { add(new THREE.CylinderGeometry(0.02, 0.02, 0.8, 3), P.M(0x1a1a1e), 0.35, 1.1, 0.1, w); add(new THREE.BoxGeometry(0.04, 0.3, 0.4), P.M(0xff3a3a), 0.35, 1.4, 0.3, w); } });
  P.walker(g, -HX - 2.6, -0.3, HZ + 2.4, -HX - 2.6, -HZ - 2.4, { shirt: 0x39d98a, sp: 0.18, ph: 0.6, carry: (w) => { add(new THREE.BoxGeometry(0.6, 0.4, 0.4), P.M(0x2a2a30, { map: TX.cloth }), 0, 0.75, 0.35, w); for (let i = 0; i < 3; i++) add(new THREE.SphereGeometry(0.13, 6, 4), P.M(0xffffff, { map: TX.stripes }), -0.18 + i * 0.18, 1.0, 0.35, w); } });
}

/* ---------- Rey de la colina: isla en el mar ---------- */
export function decorColina(g, rim) {
  // cielo de tarde soleada, gaviotas, islotes con palmeras, un faro y rocas alrededor
  P.sky(g, [[0, '#2a6ad8'], [0.42, '#7ab8f0'], [0.5, '#f4e0b0'], [0.53, '#9ad0f0'], [1, '#2a6aa8']]);
  P.flyers(g, 0, 14, 0, 24, 6, 0xf4f4f0, 0.6);
  P.skyClouds(g, 10, 45, 75, 12, 22, 0xffffff, 0.005);
  P.cloudShadows(g, 0, 3, 24);
  const islets = [[-26, -30, 1.3], [30, -24, 1.0], [-34, 8, 0.9], [36, 14, 1.2], [8, -40, 1.5]];
  islets.forEach(([x, z, s], k) => {
    const r = add(new THREE.CylinderGeometry(3.2 * s, 4.2 * s, 2.2, 10), P.M(0xd8b878, { map: TX.sand }), x, -0.4, z, g);
    r.rotation.y = k;
    P.palm(g, x + 0.6 * s, 0.7, z - 0.3 * s, 1.1 * s);
    if (k % 2 === 0) P.palm(g, x - 1.2 * s, 0.7, z + 0.8 * s, 0.85 * s);
    P.rock(g, x + 2 * s, 0.4, z + 1.4 * s, 0.9 * s, 0xb0a494);
  });
  // faro sobre un peñasco, atrás a la derecha
  lighthouse(g, 17.5, -14.5);
  // rocas saliendo del agua cerca de la costa (dejando libre el muelle)
  for (let k = 0; k < 11; k++) {
    const a = (k / 11) * Math.PI * 2 + 0.3;
    if (Math.abs(a - (Math.PI * 2 - 0.9)) < 0.35) continue;
    const r = rim(a) + 2.6 + (k % 3) * 1.4;
    P.rock(g, Math.sin(a) * r, -1.0, Math.cos(a) * r, 0.6 + (k % 3) * 0.35, 0x9a9488);
  }
  const WY = -0.9;
  // destellos del sol sobre el mar (fuera de la isla)
  P.windblown(g, 30, -20, 20, 0.5, 4, -18, 18, 1, 0.3, 1.2, 0xfff4a0, 0.07, false);   // polen que lleva la brisa
  P.waterSparkles(g, WY + 0.2, 0, 0, 34, 30, 90, 0xffffff, (x, z) => Math.hypot(x, z) < rim(Math.atan2(x, z)) + 1.5);
  // un velero que da vueltas lejos de la isla
  const sb = new THREE.Group(); g.add(sb);
  add(new THREE.BoxGeometry(1.6, 0.8, 4.4), P.M(0xf4f0e8, { map: TX.wood }), 0, 0.2, 0, sb);
  add(new THREE.ConeGeometry(0.8, 1.2, 4), P.M(0xf4f0e8, { map: TX.wood }), 0, 0.2, 2.7, sb).rotation.set(Math.PI / 2, Math.PI / 4, 0);
  add(new THREE.CylinderGeometry(0.06, 0.08, 5.5, 5), P.M(0x6b4a2a, { map: TX.wood }), 0, 3.2, 0.2, sb);
  const sail = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0.9, -1.4), new THREE.Vector3(0, 5.6, 0.15), new THREE.Vector3(0, 0.9, 0.15)]); sail.computeVertexNormals();
  add(sail, P.M(0xff5a4a, { side: THREE.DoubleSide }), 0.05, 0, 0, sb);
  P.anim(sb, (t) => { const a = t * 0.04; sb.position.set(Math.sin(a) * 30, WY + Math.sin(t * 1.2) * 0.12, Math.cos(a) * 26); sb.rotation.y = a + Math.PI / 2; sb.rotation.z = Math.sin(t * 0.9) * 0.06; });
  // delfines que saltan en arco cada tanto
  const dm = P.M(0x7a8aa8);
  [[-20, 4, 0.0], [22, -2, 2.6], [-6, 22, 5.1]].forEach(([x, z, ph]) => {
    const d = new THREE.Group(); d.position.set(x, WY - 2, z); d.rotation.y = rnd(0, 6); g.add(d);
    const body = new THREE.Group(); d.add(body);
    add(new THREE.SphereGeometry(0.5, 8, 6), dm, 0, 0, 0, body).scale.set(0.8, 0.8, 2.4);
    add(new THREE.ConeGeometry(0.25, 0.6, 3), dm, 0, 0.5, -0.2, body).scale.z = 0.3;
    add(new THREE.BoxGeometry(1.0, 0.08, 0.4), dm, 0, 0, -1.2, body);
    P.anim(d, (t) => { const u = ((t + ph) % 7) / 1.4; if (u > 1) { d.visible = false; return; } d.visible = true; body.position.set(0, WY + 0.2 + Math.sin(u * Math.PI) * 2.2 - (WY - 2), (u - 0.5) * 5); body.rotation.x = (u - 0.5) * 1.8; });
  });
  // flotador de dona, una fila de boyas y una tortuga que nada
  const don = add(new THREE.TorusGeometry(0.7, 0.3, 6, 12), P.M(0xff8ac8, { map: TX.stripes }), 0, WY + 0.1, 0, g); don.rotation.x = Math.PI / 2;
  P.anim(don, (t) => { const a = t * 0.06 + 1; don.position.set(Math.sin(a) * 19, WY + 0.08 + Math.sin(t * 1.5) * 0.06, Math.cos(a) * 17); don.rotation.z = t * 0.2; });
  for (let k = 0; k < 7; k++) { const a = -0.6 + k * 0.2, b = add(new THREE.SphereGeometry(0.28, 6, 4), P.M(k % 2 ? 0xffffff : 0xff4a3a), Math.sin(a) * 21, WY + 0.1, -Math.cos(a) * 19, g); P.anim(b, (t) => { b.position.y = WY + 0.1 + Math.sin(t * 1.4 + k) * 0.08; }); }
  const tt = new THREE.Group(); g.add(tt);
  add(new THREE.SphereGeometry(0.55, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2), P.M(0x4a7a3a, { map: TX.leaf, sway: 0 }), 0, 0, 0, tt).scale.y = 0.5;
  add(new THREE.SphereGeometry(0.18, 6, 4), P.M(0x8aa86a), 0, 0.05, 0.62, tt);
  const flip = [[-0.4, 0.3], [0.4, 0.3], [-0.35, -0.35], [0.35, -0.35]].map(([a2, b2]) => add(new THREE.BoxGeometry(0.35, 0.05, 0.18), P.M(0x8aa86a), a2, 0, b2, tt));
  P.anim(tt, (t) => { const a = -t * 0.05 + 3; tt.position.set(Math.sin(a) * 16.5, WY + 0.02, Math.cos(a) * 15); tt.rotation.y = a - Math.PI / 2; flip.forEach((f, i) => { f.rotation.y = Math.sin(t * 3 + i) * 0.5; }); });
  P.critters(g, 5, 0, 0, 10, 9, 3.5, 'butterfly', [0xffffff, 0xffe14a, 0xff9ad0]);
  // gaviotas paradas en la playa: si alguien se acerca, salen volando
  { const pts = []; for (let k = 0; k < 9; k++) { const a = (k / 9) * Math.PI * 2 + 0.5; if (Math.abs(a - (Math.PI * 2 - 0.9)) < 0.4) continue; const r = rim(a) - 1.1; pts.push([Math.sin(a) * r, Math.cos(a) * r]); } P.shyBirds(g, pts, 0.02); }
  // cangrejos caminando por la orilla
  [[0.4, 0xe8503a], [2.4, 0xff7a3a], [4.3, 0xe8503a]].forEach(([a, c], k) => { const r = rim(a) - 0.5, r2 = rim(a + 0.25) - 0.5; P.crabWalk(g, Math.sin(a) * r, 0.02, Math.cos(a) * r, Math.sin(a + 0.25) * r2, Math.cos(a + 0.25) * r2, c, 0.35, k * 2); });
  // una ballena que asoma el lomo lejos y tira un chorro de agua
  const wh = new THREE.Group(); wh.position.set(-34, -0.9, -22); wh.rotation.y = 0.9; g.add(wh);
  const back = add(new THREE.SphereGeometry(2.4, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), P.M(0x3a4a6a), 0, -1.2, 0, wh); back.scale.set(1, 0.6, 2.4);
  const tail = add(new THREE.BoxGeometry(3.2, 0.2, 1.2), P.M(0x3a4a6a), 0, -1.2, -5.5, wh);
  const spout = []; for (let i = 0; i < 8; i++) spout.push(add(new THREE.SphereGeometry(0.3, 5, 4), P.M(0xf0f8ff, { unlit: true }), 0, 0, 1.5, wh));
  P.anim(wh, (t) => {
    const u = (t % 16) / 6, up = u < 1 ? Math.sin(u * Math.PI) : 0;
    back.position.y = -1.6 + up * 1.4; tail.position.y = -1.6 + Math.max(0, Math.sin((u - 0.55) * Math.PI * 2)) * 2.4 * (u > 0.55 ? 1 : 0); tail.rotation.x = -tail.position.y * 0.3;
    spout.forEach((sp, i) => { const k = (u - 0.25) * 3 - i * 0.06; sp.visible = k > 0 && k < 1; if (sp.visible) sp.position.set(Math.sin(i * 2.3) * k * 0.8, 0.4 + k * 3.5 - k * k * 1.5, 1.5 + Math.cos(i * 2.3) * k * 0.8); });
  });
  // un cofre del tesoro en un islote
  const ch = new THREE.Group(); ch.position.set(-25.2, 0.7, -29.2); ch.rotation.y = 0.5; g.add(ch);
  add(new THREE.BoxGeometry(1.2, 0.6, 0.8), P.M(0x8a5a2a, { map: TX.wood }), 0, 0.3, 0, ch);
  const lid = new THREE.Group(); lid.position.set(0, 0.6, -0.4); ch.add(lid);
  add(new THREE.BoxGeometry(1.2, 0.3, 0.8), P.M(0x8a5a2a, { map: TX.wood }), 0, 0.15, 0.4, lid);
  add(new THREE.BoxGeometry(1.0, 0.12, 0.6), P.M(0xffd23a, { unlit: true }), 0, 0.62, 0, ch);
  P.anim(ch, (t) => { lid.rotation.x = -0.6 - Math.max(0, Math.sin(t * 0.8)) * 0.4; });
}
export function lighthouse(g, x, z) {
  const base = add(new THREE.CylinderGeometry(3.0, 3.8, 2.4, 9), P.M(0x9a9488, { map: TX.pebble }), x, -0.3, z, g); base.rotation.y = 0.4;
  const wh = P.M(0xf4f0e8, { map: TX.stone }), rd = P.M(0xd8402e, { map: TX.stone });
  for (let k = 0; k < 5; k++) add(new THREE.CylinderGeometry(1.15 - k * 0.1 - 0.1, 1.15 - k * 0.1, 1.5, 10), k % 2 ? rd : wh, x, 1.65 + k * 1.5, z, g);
  add(new THREE.CylinderGeometry(0.95, 0.95, 0.2, 10), P.M(0x2a2d36), x, 9.2, z, g);
  add(new THREE.CylinderGeometry(0.6, 0.6, 1.0, 8), P.M(0xfff4b0, { unlit: true }), x, 9.8, z, g);
  add(new THREE.ConeGeometry(0.85, 0.9, 8), rd, x, 10.75, z, g);
}

/* ---------- Empujón, mapa VOLCÁN: lava, agujas de roca, volcanes que escupen ---------- */
export function decorVolcan(grp, plat, R0, V) {
  const Y = -26;
  P.lavaBubbles(grp, Y + 0.2, 12, 34, 24);
  P.drift(grp, 70, -30, 30, Y, -4, -30, 26, 0xffa030, 0.22, 3.2);          // brasas que suben
  // agujas de roca que salen de la lava
  const rm = P.M(0x6a5a5e, { map: TX.rock }), glow = P.M(0xff7a1a, { unlit: true });
  [[-19, -14, 12], [21, -10, 10], [-24, 6, 9], [25, 9, 12], [-14, -26, 11], [15, -25, 10], [-28, -6, 8]].forEach(([x, z, h]) => {
    const sp = add(new THREE.ConeGeometry(rnd(2.2, 3.2), h, 6), rm, x, Y + h / 2, z, grp); sp.rotation.y = rnd(0, 3);
    add(new THREE.CylinderGeometry(3.4, 3.8, 0.5, 8), glow, x, Y + 0.25, z, grp);
  });
  // cielo rojizo, volcán al fondo, hielo flotando y chorros de lava
  P.sky(grp, [[0, '#0c0406'], [0.36, '#2a0a0a'], [0.47, '#8a3212'], [0.52, '#3a0e08'], [1, '#120404']], { stars: 25 });
  P.volcano(grp, 0, Y, -60, 17, 24);
  P.volcano(grp, -52, Y, -18, 16, 14);
  P.geyser(grp, 16, Y, -15, 7, 0); P.geyser(grp, -17, Y, 10, 8.5, 3.2); P.geyser(grp, 9, Y, 21, 9.5, 6.1);
  // el volcán del fondo escupe piedras de lava; cascadas de lava bajando por acantilados; columnas de basalto
  P.eruption(grp, 0, Y + 17, -60, 24, 9, 9);
  P.eruption(grp, -52, Y + 16, -18, 16, 5, 7);
  P.lavafall(grp, -21, Y, -27, 0.5, 18, 3.4);
  P.lavafall(grp, 27, Y, -20, -0.7, 15, 2.6);
  P.basalt(grp, -16, Y, -3, 7, 1.5, 2, 8);
  P.basalt(grp, 15, Y, 3, 6, 1.3, 2, 7);
  P.basalt(grp, 4, Y, -20, 6, 1.4, 3, 10);
  P.basalt(grp, -7, Y, 17, 5, 1.2, 1.5, 6);
  // el volcán de cerca: el que tira las bolas de fuego a la plataforma (arriba de la pantalla, con el cráter al rojo)
  const vh = V.y - Y, vg = new THREE.Group(); vg.position.set(V.x, Y, V.z); grp.add(vg);
  add(new THREE.CylinderGeometry(3.2, 13, vh, 10, 3), P.M(0x3e3034, { map: TX.rock }), 0, vh / 2, 0, vg);
  add(new THREE.CylinderGeometry(3.4, 3.3, 0.8, 10), P.M(0x2a2022, { map: TX.rock }), 0, vh + 0.1, 0, vg);
  add(new THREE.CylinderGeometry(2.7, 2.7, 0.5, 10), P.M(0xffa030, { unlit: true }), 0, vh + 0.35, 0, vg);
  [0.6, 2.4, 3.9, 5.2].forEach((a, k) => {                        // grietas de lava bajando (pegadas a la ladera)
    const r0 = 3.6, r1 = 12.2, hh = vh * (0.55 + (k % 2) * 0.25);
    const len = Math.hypot(r1 - r0, vh) * (hh / vh), ang = Math.atan2(r1 - r0, vh);
    const cr = add(new THREE.BoxGeometry(0.5, len, 0.15), P.M(0xff7a1a, { unlit: true }), 0, 0, 0, vg);
    const mid = vh - hh / 2, rr = r0 + (r1 - r0) * (1 - mid / vh);
    cr.position.set(Math.sin(a) * rr, mid, Math.cos(a) * rr); cr.rotation.set(Math.cos(a) * ang, 0, -Math.sin(a) * ang, 'YXZ'); cr.rotation.y = 0;
    cr.rotation.x = Math.cos(a) * ang; cr.rotation.z = -Math.sin(a) * ang;
  });
  P.smoke(vg, 0, vh + 0.6, 0, 6, 2.6, 0x4a4248);
  P.eruption(grp, V.x, V.y, V.z, vh, 4, 5);
  // rocas que flotan cerca de la plataforma, con fuego encima, y murciélagos de fuego dando vueltas
  [[14.5, -3, -4, 1], [-14, -4, 3, 0.9], [-6, -3.5, -14.5, 1.1], [9, -5, 13.5, 0.8], [-12, -6, 11, 0.7]].forEach(([x, y, z, s2], k) => {
    const fr = new THREE.Group(); fr.position.set(x, y, z); grp.add(fr); fr.scale.setScalar(s2);
    add(new THREE.DodecahedronGeometry(1.4, 0), P.M(0x4a3a3e, { map: TX.rock }), 0, 0, 0, fr).scale.set(1.3, 0.6, 1.1);
    add(new THREE.ConeGeometry(1.1, 2.6, 6), P.M(0x3a2e32, { map: TX.rock }), 0, -1.6, 0, fr).rotation.x = Math.PI;
    add(new THREE.CylinderGeometry(1.2, 1.2, 0.1, 7), P.M(0xff7a1a, { unlit: true }), 0, -0.25, 0, fr);
    P.torch(fr, 0.4, 0.6, 0.2, 0.3);
    const ph = k * 1.7; P.anim(fr, (t) => { fr.position.y = y + Math.sin(t * 0.5 + ph) * 0.5; fr.rotation.y = t * 0.08 + ph; });
  });
  P.flyers(grp, 0, 3, 0, 16, 4, 0xff6a1a, 0.45);
  P.lightFlicker(grp, 0xff6a2a, 0.12, 2.6);
  // cristales de obsidiana que flotan girando y brillan por dentro
  [[16, -1, 6, 0xff5a1a], [-15.5, -2, -6, 0xffa01a], [4, -1.5, -16, 0xff3a2a], [-5, -2.5, 15.5, 0xffc04a]].forEach(([x, y, z, c], k) => {
    const cr = new THREE.Group(); cr.position.set(x, y, z); grp.add(cr);
    add(new THREE.OctahedronGeometry(0.9, 0), P.M(0x1a1018), 0, 0, 0, cr).scale.set(0.6, 1.6, 0.6);
    const core = add(new THREE.OctahedronGeometry(0.5, 0), P.M(c, { unlit: true }), 0, 0, 0, cr); core.scale.set(0.5, 1.4, 0.5);
    P.anim(cr, (t) => { cr.rotation.y = t * 0.8 + k; cr.position.y = y + Math.sin(t * 0.9 + k) * 0.5; core.scale.setScalar(0.45 + Math.abs(Math.sin(t * 2 + k)) * 0.15); core.scale.y = 1.4; });
  });
  // piedras sueltas en el borde de la plataforma (se achican con ella)
  const rk = P.M(0x7a6a5e, { map: TX.rock });
  for (let k = 0; k < 18; k++) {
    const a = (k / 18) * Math.PI * 2 + rnd(-0.1, 0.1), r = R0 * 0.99;
    const m = add(new THREE.DodecahedronGeometry(rnd(0.25, 0.5), 0), rk, Math.sin(a) * r, -0.5 - rnd(0, 0.6), Math.cos(a) * r, plat); m.rotation.set(rnd(0, 3), rnd(0, 3), 0);
  }
}

/* ---------- Empujón, mapa GLACIAR: un iceberg flotando arriba de un valle nevado con bosque ---------- */
export function decorGlaciar(grp) {
  const Y = -46;
  // el valle: nieve con lomas, un lago congelado, un río helado y una cabaña con humo
  const gr = new THREE.PlaneGeometry(240, 240, 24, 24); gr.rotateX(-Math.PI / 2);
  const pos = gr.attributes.position;
  for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), z = pos.getZ(i); pos.setY(i, Math.sin(x * 0.09) * 1.6 + Math.cos(z * 0.07 + 1) * 1.8 + Math.sin((x + z) * 0.05) * 1.2); }
  gr.computeVertexNormals();
  add(scaleUV(gr, 30, 30), P.M(0xf0f6ff, { map: TX.snow }), 0, Y, 0, grp);
  P.frozenPond(grp, 12, Y + 1.2, 6, 7);
  const river = add(new THREE.BoxGeometry(5, 0.3, 90), P.M(0xa8dcff, { map: TX.ice }), -12, Y + 0.6, -10, grp); river.rotation.y = 0.35;
  P.house(grp, 30, Y + 1, -26, -0.6, 0x8a5a3a, 0xf4f8ff, 2.6);
  P.smoke(grp, 30.9, Y + 8.8, -26.5, 5, 1.8, 0xd8dce6);
  // el bosque: pinos nevados por todos lados (menos arriba del lago y del río)
  const pts = [];
  for (let k = 0; k < 190; k++) {
    const a = rnd(0, Math.PI * 2), r = Math.sqrt(rnd(0, 1)) * 70 + 4, x = Math.sin(a) * r, z = Math.cos(a) * r;
    if (Math.hypot(x - 12, z - 6) < 9) continue;
    const rx = (x + 12) * Math.cos(0.35) - (z + 10) * Math.sin(0.35); if (Math.abs(rx) < 4.5) continue;
    if (Math.hypot(x - 30, z + 26) < 7) continue;
    pts.push([x, z, rnd(2.2, 3.6)]);
  }
  P.forest(grp, Y + 1, pts);
  for (let k = 0; k < 14; k++) P.snowPile(grp, rnd(-50, 50), Y + 1.2, rnd(-50, 40), rnd(2, 4));
  // montañas nevadas a lo lejos
  const mm = P.M(0x9aaac0, { map: TX.rock }), sm = P.M(0xffffff, { map: TX.snow });
  [[-70, -60, 38, 26], [-20, -85, 50, 30], [40, -75, 44, 28], [85, -30, 36, 24], [-90, 10, 34, 22], [75, 40, 30, 20]].forEach(([x, z, h, r]) => {
    add(new THREE.ConeGeometry(r, h, 7), mm, x, Y + h / 2, z, grp).rotation.y = rnd(0, 3);
    add(new THREE.ConeGeometry(r * 0.42, h * 0.42, 7), sm, x, Y + h * 0.79 + 0.3, z, grp).rotation.y = rnd(0, 3);
  });
  // cielo de invierno y nieve que cae
  P.sky(grp, [[0, '#5a8ac8'], [0.4, '#a8c8e8'], [0.5, '#e8f0f8'], [0.56, '#c8d8ea'], [1, '#e8eef6']]);
  P.drift(grp, 150, -24, 24, 14, -30, -30, 20, 0xffffff, 0.13, 2.0, true);
  P.flyers(grp, 0, 6, -4, 22, 4, 0x2a2a34, 0.5);
  // témpanos chiquitos flotando en el aire alrededor del iceberg, con pingüinos que se balancean
  [[14, -2.2, -3, 1.6, 2], [-14.5, -3, 2, 1.3, 1], [6, -4, -15, 1.4, 2], [-8, -2.5, 13.5, 1.2, 1], [13, -5, 9, 1, 0]].forEach(([x, y, z, s2, np], k) => {
    const fl = new THREE.Group(); fl.position.set(x, y, z); grp.add(fl);
    add(new THREE.CylinderGeometry(1.8 * s2, 1.2 * s2, 0.7, 7), P.M(0xe8f4ff, { map: TX.snow }), 0, 0, 0, fl);
    add(new THREE.ConeGeometry(1.2 * s2, 2.4 * s2, 7), P.M(0xa8dcff, { map: TX.ice }), 0, -1.5 * s2, 0, fl).rotation.x = Math.PI;
    for (let i = 0; i < np; i++) {
      const pg = new THREE.Group(); pg.position.set((i - (np - 1) / 2) * 0.8, 0.35, rnd(-0.3, 0.3)); pg.rotation.y = rnd(0, 6); fl.add(pg);
      add(new THREE.SphereGeometry(0.3, 7, 5), P.M(0x1a1a24), 0, 0.42, 0, pg).scale.set(1, 1.4, 0.9);
      add(new THREE.SphereGeometry(0.22, 6, 5), P.M(0xffffff), 0, 0.38, 0.12, pg).scale.set(1, 1.3, 0.8);
      add(new THREE.SphereGeometry(0.18, 6, 5), P.M(0x1a1a24), 0, 0.92, 0, pg);
      add(new THREE.ConeGeometry(0.06, 0.18, 4), P.M(0xffa01a), 0, 0.9, 0.2, pg).rotation.x = Math.PI / 2;
      const ph = rnd(0, 6); P.anim(pg, (t) => { pg.rotation.z = Math.sin(t * 3 + ph) * 0.15; });
    }
    const ph = k * 1.3; P.anim(fl, (t) => { fl.position.y = y + Math.sin(t * 0.6 + ph) * 0.4; fl.rotation.y = t * 0.05 + ph; });
  });
  // pajaritos que pasan cerca
  P.flyers(grp, 0, 2, 0, 15, 3, 0x3a3a48, 0.4);
  P.mist(grp, -3, 12, 22, 8, 0xffffff, 0.22, 16);
  // nubecitas que pasan por debajo del iceberg y un búho blanco que planea
  const cw = P.M(0xffffff), cs = P.M(0xe0e8f4);
  for (let k = 0; k < 6; k++) {
    const c = new THREE.Group(); grp.add(c);
    for (let j = 0; j < 4; j++) add(new THREE.DodecahedronGeometry(rnd(1, 1.8), 1), j % 2 ? cw : cs, rnd(-2.5, 2.5), rnd(-0.4, 0.4), rnd(-1, 1), c);
    const a0 = (k / 6) * Math.PI * 2, d = rnd(13, 18), y = rnd(-7, -4), sp = rnd(0.02, 0.04);
    P.anim(c, (t) => { const a = a0 + t * sp; c.position.set(Math.sin(a) * d, y, Math.cos(a) * d); });
  }
  const owl = new THREE.Group(); grp.add(owl);
  add(new THREE.SphereGeometry(0.4, 8, 6), P.M(0xf4f4f0), 0, 0, 0, owl).scale.set(0.9, 1, 1.2);
  [-0.12, 0.12].forEach((sx) => add(new THREE.SphereGeometry(0.07, 5, 4), P.M(0xffc02a, { unlit: true }), sx, 0.15, 0.4, owl));
  const ow = [-1, 1].map((sd) => { const w = new THREE.Group(); w.position.x = sd * 0.3; owl.add(w); add(new THREE.BoxGeometry(1.2, 0.05, 0.5), P.M(0xe8e8e0), sd * 0.6, 0, 0, w); return w; });
  P.anim(owl, (t) => { const a = t * 0.25; owl.position.set(Math.sin(a) * 13, 4 + Math.sin(t * 0.7) * 1, Math.cos(a) * 11); owl.rotation.y = a + Math.PI / 2; owl.rotation.z = -0.3; ow.forEach((w, i) => { w.rotation.z = (i ? -1 : 1) * Math.sin(t * 2.5) * 0.5; }); });
}

/* ---------- Bombardeo: depósito espacial ---------- */
export function decorBombardeo(grp, HALF) {
  const Y = -1.7, E = HALF + 0.8;
  // líneas del piso alrededor
  const ym = P.M(0xffc02a, { unlit: true });
  [[0, -(E + 1.4), 2 * E + 3, 0.18], [0, E + 1.4, 2 * E + 3, 0.18], [-(E + 1.4), 0, 0.18, 2 * E + 3], [E + 1.4, 0, 0.18, 2 * E + 3]].forEach(([x, z, w, d]) => add(new THREE.BoxGeometry(w, 0.04, d), ym, x, Y + 0.02, z, grp));
  // luces giratorias arriba de los postes de las esquinas
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => P.beacon(grp, sx * (HALF + 0.9), 3.4, sz * (HALF + 0.9)));
  // cañerías por los costados
  [-1, 1].forEach((sx) => {
    const x = sx * (E + 3.2);
    P.pipe(grp, x, Y + 1.2, -13, x, Y + 1.2, 11, 0.45, 0x8a92a6);
    P.pipe(grp, x + sx * 1.1, Y + 0.6, -13, x + sx * 1.1, Y + 0.6, 11, 0.3, 0xc05a3a);
    for (let z = -12; z <= 10; z += 5.5) add(new THREE.BoxGeometry(0.3, 1.2, 0.3), P.M(0x5a6070, { map: TX.metal }), x, Y + 0.6, z, grp);
  });
  // tambores, cajones y respiraderos con vapor
  [[-13.5, -8], [-14.2, -6.8], [-12.8, -7], [14, 4.5], [13.3, 5.6], [14.6, 6]].forEach(([x, z], k) => P.barrel(grp, x, Y, z, k % 3 === 0 ? 0xd83a3a : 0x3a6ac8));
  P.crates(grp, -14, Y, 6, 3); P.crates(grp, 13.8, Y, -7.5, 2);
  [[-11.5, -12], [11.8, 10.5]].forEach(([x, z]) => {
    add(new THREE.BoxGeometry(1.6, 0.3, 1.6), P.M(0x2a2d36, { map: TX.metal }), x, Y + 0.15, z, grp);
    for (let i = 0; i < 4; i++) add(new THREE.BoxGeometry(1.4, 0.06, 0.12), P.M(0x15171d), x, Y + 0.32, z - 0.5 + i * 0.33, grp);
    P.smoke(grp, x, Y + 0.4, z, 4, 0.8, 0xc8d0dc);
  });
  // grúa que gira allá al fondo
  const cr = new THREE.Group(); cr.position.set(-12, Y, -15); grp.add(cr);
  const cm = P.M(0xffc02a, { map: TX.metal }), dk = P.M(0x2a2d36, { map: TX.metal });
  add(new THREE.BoxGeometry(1, 11, 1), cm, 0, 5.5, 0, cr);
  const arm = new THREE.Group(); arm.position.y = 11; cr.add(arm);
  add(new THREE.BoxGeometry(12, 0.6, 0.6), cm, 3.5, 0, 0, arm);
  add(new THREE.BoxGeometry(2, 1.2, 1.2), dk, -2.6, 0, 0, arm);
  add(new THREE.CylinderGeometry(0.04, 0.04, 4, 4), dk, 8.5, -2, 0, arm);
  add(new THREE.BoxGeometry(1.4, 1.4, 1.4), P.M(0xffffff, { map: TX.block }), 8.5, -4.6, 0, arm);
  P.anim(cr, (t) => { arm.rotation.y = Math.sin(t * 0.15) * 0.9 + 0.4; });
  P.planet(grp, 30, 6, -40, 8, 0x4a7ab8, 0xa8d8ff);
  // espacio: nebulosa, asteroides, antena, contenedores y un dron que vigila
  P.sky(grp, [[0, '#03040c'], [0.45, '#070b1c'], [0.55, '#0a0816'], [1, '#020308']], {
    stars: 140, starBand: 0.7, blobs: [[0.2, 0.3, 0.3, 'rgba(120,60,160,.45)'], [0.65, 0.22, 0.25, 'rgba(40,140,170,.4)'], [0.85, 0.45, 0.2, 'rgba(170,70,110,.35)']],
  });
  P.asteroids(grp, 14, 28, 44, -2, 14);
  P.twinkleStars(grp, 80, 95, 10);
  P.dish(grp, 15.5, Y, -8.5, -0.8, 1);
  P.container(grp, -14.5, Y, 11.5, 0.15, 0xd8463a, 4.2); P.container(grp, -14.2, Y + 1.6, 11.4, 0.05, 0x3a7ac8, 3.6);
  P.container(grp, 15, Y, 1, Math.PI / 2 + 0.1, 0x39a86a, 4);
  P.drone(grp, 0, 6.5, 0, 14.5, 0.35);
  // luces que corren arriba de la baranda
  const B = HALF + 0.55, ly = 0.53;
  P.chaseLights(grp, -B, ly, -B, B, -B, 14); P.chaseLights(grp, B, ly, -B, B, B, 14);
  P.chaseLights(grp, B, ly, B, -B, B, 14); P.chaseLights(grp, -B, ly, B, -B, -B, 14);
  // nave de carga estacionada al fondo, con una pista de luces, y tanques de combustible
  P.spaceship(grp, 9.5, Y, -19.5, 0.45, 1.05);
  P.chaseLights(grp, 4.5, Y + 0.05, -10.5, 8.2, -15.5, 8, 0xffc02a, 5);
  P.chaseLights(grp, 6.8, Y + 0.05, -9.4, 10.5, -14.4, 8, 0xffc02a, 5);
  P.fuelTank(grp, -17, Y, -2.5, 1); P.fuelTank(grp, -18.6, Y, 1.2, 0.8, 0xd8463a);
  P.pipe(grp, -15.6, Y + 2.6, -2.5, -13.7, Y + 1.2, -2.5, 0.2, 0x8a92a6);
  // grilla de luz tenue en el piso de afuera
  const gl = P.M(0x1a3a5a, { unlit: true });
  for (let v = -30; v <= 30; v += 6) {
    if (Math.abs(v) < HALF + 3) { [-1, 1].forEach((sd) => { add(new THREE.BoxGeometry(0.08, 0.02, 30 - HALF - 3), gl, v, Y + 0.02, sd * (HALF + 3 + (30 - HALF - 3) / 2), grp); add(new THREE.BoxGeometry(30 - HALF - 3, 0.02, 0.08), gl, sd * (HALF + 3 + (30 - HALF - 3) / 2), Y + 0.02, v, grp); }); continue; }
    add(new THREE.BoxGeometry(0.08, 0.02, 60), gl, v, Y + 0.02, 0, grp);
    add(new THREE.BoxGeometry(60, 0.02, 0.08), gl, 0, Y + 0.02, v, grp);
  }
  P.drift(grp, 40, -16, 16, Y, 6, -16, 14, 0x8aa0c0, 0.06, 0.25);        // polvito flotando a la luz
  // robotitos de limpieza que dan la vuelta a la cancha, conos, manchas de aceite y una caja de herramientas
  [0, Math.PI].forEach((ph, k) => {
    const rb = new THREE.Group(); grp.add(rb);
    add(new THREE.CylinderGeometry(0.55, 0.6, 0.35, 10), P.M(k ? 0xffc02a : 0xe8e8ee, { map: TX.metal }), 0, 0.2, 0, rb);
    add(new THREE.SphereGeometry(0.3, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2), P.M(0x2a3a5a), 0, 0.37, 0, rb);
    const eye = add(new THREE.BoxGeometry(0.3, 0.08, 0.05), P.M(0x35f0ff, { unlit: true }), 0, 0.5, 0.26, rb);
    const brush = add(new THREE.CylinderGeometry(0.25, 0.25, 0.06, 6), P.M(0x5a6070), 0.45, 0.04, 0.35, rb);
    P.anim(rb, (t) => {
      const u = ((t * 0.035 + ph / (Math.PI * 2)) % 1) * 4, side = Math.floor(u), f = u - side, L = HALF + 2.2;
      const c = [[-L, -L], [L, -L], [L, L], [-L, L]], [x1, z1] = c[side], [x2, z2] = c[(side + 1) % 4];
      rb.position.set(x1 + (x2 - x1) * f, Y, z1 + (z2 - z1) * f); rb.rotation.y = Math.atan2(x2 - x1, z2 - z1);
      brush.rotation.y = t * 12; eye.scale.x = 0.6 + Math.abs(Math.sin(t * 2)) * 0.5;
    });
  });
  [[-11.1, 3], [-11.1, 4.2], [11.1, -3.5], [11.1, -2.3], [3.5, 11.6], [-4, -11.6]].forEach(([x, z]) => {
    add(new THREE.ConeGeometry(0.28, 0.75, 8), P.M(0xff7a1a), x, Y + 0.38, z, grp);
    add(new THREE.BoxGeometry(0.62, 0.06, 0.62), P.M(0xff7a1a), x, Y + 0.03, z, grp);
    add(new THREE.CylinderGeometry(0.19, 0.22, 0.12, 8), P.M(0xffffff, { unlit: true }), x, Y + 0.45, z, grp);
  });
  [[-10.8, -4.5, 0.8], [11.2, 7.5, 0.6], [-2, 11.5, 0.7], [6, -11.2, 0.5]].forEach(([x, z, r]) => P.patch(grp, x, Y, z, r, 0x0a0c14));
  const tb = new THREE.Group(); tb.position.set(1, Y, -11.8); tb.rotation.y = 0.1; grp.add(tb);
  add(new THREE.BoxGeometry(1.2, 1.1, 0.6), P.M(0xd83a3a, { map: TX.metal }), 0, 0.55, 0, tb);
  for (let i = 0; i < 3; i++) add(new THREE.BoxGeometry(1.1, 0.04, 0.02), P.M(0x1a1a1e), 0, 0.3 + i * 0.3, 0.31, tb);
  add(new THREE.BoxGeometry(0.5, 0.06, 0.08), P.M(0xc8ccd8, { map: TX.metal }), 0.1, 1.14, 0, tb).rotation.y = 0.5;
  // un mecánico con traje que camina revisando y un perro robot que lo sigue
  const mech = P.walker(grp, -9, Y, HALF + 2.9, 9, HALF + 2.9, { shirt: 0xe8e8ee, pants: 0xe8e8ee, skin: 0x3a5a8a, sp: 0.15, carry: (w) => add(new THREE.BoxGeometry(0.3, 0.2, 0.15), P.M(0xffc02a, { map: TX.metal }), 0.35, 0.8, 0.1, w) });
  const rd = new THREE.Group(); grp.add(rd);
  add(new THREE.BoxGeometry(0.4, 0.3, 0.8), P.M(0xc8ccd8, { map: TX.metal }), 0, 0.5, 0, rd);
  add(new THREE.BoxGeometry(0.3, 0.25, 0.3), P.M(0xc8ccd8, { map: TX.metal }), 0, 0.7, 0.5, rd);
  add(new THREE.BoxGeometry(0.2, 0.06, 0.04), P.M(0x35f0ff, { unlit: true }), 0, 0.75, 0.66, rd);
  const rl = [[-0.15, 0.3], [0.15, 0.3], [-0.15, -0.3], [0.15, -0.3]].map(([a2, b2]) => add(new THREE.BoxGeometry(0.08, 0.4, 0.08), P.M(0x3a3f4a), a2, 0.2, b2, rd));
  P.anim(rd, (t) => { rd.position.set(mech.position.x + (Math.sin(mech.rotation.y) > 0 ? -1.2 : 1.2), Y, mech.position.z + 0.7); rd.rotation.y = mech.rotation.y; rl.forEach((l, i) => { l.rotation.x = Math.sin(t * 12 + (i % 2) * Math.PI) * 0.5; }); });
}

/* ---------- Petardos: una por cancha ---------- */
export function decorPetardos(g, deco, L) {
  const Y = -1.4;
  if (L) cancha(g, deco, L);
  if (deco === 'arboles') {                                     // PATIO: jardín con cerca, casita y estanque
    [-1, 1].forEach((sx) => P.fence(g, sx * 13.6, Y, -11.2, sx * 13.6, 11.2));
    [[-16.5, -8.5], [16.8, -3], [-17.2, 2.5], [16, 6.5], [-18.5, 10], [19, 11], [-10, -14.5], [9.5, -14.8]].forEach(([x, z], k) => P.tree(g, x, Y, z, rnd(0.9, 1.25), k % 2 ? 0x3f8a3a : 0x4f9a42));
    P.house(g, -17, Y, -13.2, 0.35, 0xf0e0c0, 0xffffff, 1.1);
    P.pond(g, 16.8, Y, -11.5, 2.2);
    P.flowers(g, -15, Y, -1, 0.8, 3.5, 40); P.flowers(g, 15, Y, 1.5, 0.8, 3.5, 40); P.flowers(g, 0, Y, -12.8, 7, 0.7, 50);
    P.grass(g, -16, Y, 0, 3.5, 11, 70); P.grass(g, 16, Y, 0, 3.5, 11, 70); P.grass(g, 0, Y, -13.5, 12, 1.5, 60);
    [[-14.8, -5], [14.8, -7.5], [-14.6, 7.5], [14.6, 9.5]].forEach(([x, z]) => P.bush(g, x, Y, z, 0.9));
    P.bench(g, -15.6, Y, 5, Math.PI / 2); P.bench(g, 17.8, Y, 2.2, -Math.PI / 2);
    P.birdbath(g, -17.6, Y, -4.6);
    P.stones(g, [-8, -6.6, -5.1, -3.7, -2.2, -0.7, 0.8, 2.3, 3.7, 5.2, 6.6, 8].map((x, k) => [x, -11.9 + (k % 2) * 0.25, Y]));
    P.sky(g, [[0, '#3a7ad8'], [0.45, '#9ac8f4'], [0.5, '#e8f0f8'], [1, '#6a9a5a']]);
    P.skyClouds(g, 8, 40, 60, 14, 22, 0xffffff, 0.006);
    P.cloudShadows(g, 0, 3, 24);
    [[-13.6, -12], [13.6, -12], [-13.6, 12], [13.6, 12]].forEach(([x, z]) => P.lamp(g, x, Y, z, 3.2));
    P.flyers(g, 0, 3.5, -2, 15, 5, 0xffe14a, 0.35);
    P.windblown(g, 24, -20, 20, Y + 0.2, Y + 3, -16, 14, 1, 0.4, 1.4, 0x6ab04a, 0.1);   // hojitas que lleva el viento
    P.critters(g, 5, 0, 0, 11, 9, Y + 3.2, 'butterfly');
    // regador que gira tirando agua, carretilla, enanito de jardín y un gato que camina por la cerca
    const spr = new THREE.Group(); spr.position.set(15.6, Y, -6.2); g.add(spr);
    add(new THREE.CylinderGeometry(0.08, 0.12, 0.5, 6), P.M(0x3a8a3a), 0, 0.25, 0, spr);
    const head = new THREE.Group(); head.position.y = 0.5; spr.add(head);
    add(new THREE.BoxGeometry(0.8, 0.06, 0.06), P.M(0xc8ccd8, { map: TX.metal }), 0, 0, 0, head);
    const drops = [];
    for (let i = 0; i < 10; i++) drops.push(add(new THREE.BoxGeometry(0.07, 0.07, 0.07), P.M(0x9ad8ff, { unlit: true }), 0, 0, 0, head));
    P.anim(spr, (t) => { head.rotation.y = t * 2.2; drops.forEach((d, i) => { const sd = i % 2 ? 1 : -1, u = ((t * 1.6 + i * 0.2) % 1); d.position.set(sd * (0.4 + u * 1.6), Math.sin(u * Math.PI) * 0.7, 0); }); });
    const wb = new THREE.Group(); wb.position.set(-16.4, Y, -9.6); wb.rotation.y = 0.6; g.add(wb);
    add(new THREE.BoxGeometry(0.9, 0.4, 1.2), P.M(0x3a8ad8, { map: TX.metal }), 0, 0.55, 0, wb);
    add(new THREE.BoxGeometry(0.8, 0.1, 1.0), P.M(0x6a4a2a, { map: TX.pebble }), 0, 0.72, 0, wb);
    add(new THREE.CylinderGeometry(0.25, 0.25, 0.1, 8), P.M(0x1a1a1e), 0, 0.25, 0.7, wb).rotation.z = Math.PI / 2;
    [-0.35, 0.35].forEach((sx) => add(new THREE.BoxGeometry(0.06, 0.06, 1.3), P.M(0x6b4a2a, { map: TX.wood }), sx, 0.6, -0.8, wb));
    const gn = new THREE.Group(); gn.position.set(-15.2, Y, 8.6); gn.rotation.y = 1.2; g.add(gn);
    add(new THREE.CylinderGeometry(0.2, 0.26, 0.45, 7), P.M(0x3a6ad8), 0, 0.22, 0, gn);
    add(new THREE.SphereGeometry(0.17, 7, 5), P.M(0xf0c8a0), 0, 0.55, 0, gn);
    add(new THREE.ConeGeometry(0.15, 0.25, 7), P.M(0xffffff), 0, 0.45, 0.08, gn);
    add(new THREE.ConeGeometry(0.18, 0.45, 7), P.M(0xd83a3a), 0, 0.85, 0, gn);
    const cat = new THREE.Group(); g.add(cat);
    add(new THREE.BoxGeometry(0.22, 0.22, 0.6), P.M(0x2a2a30), 0, 0.12, 0, cat);
    add(new THREE.BoxGeometry(0.22, 0.2, 0.2), P.M(0x2a2a30), 0, 0.25, 0.36, cat);
    [-0.07, 0.07].forEach((sx) => add(new THREE.ConeGeometry(0.05, 0.1, 3), P.M(0x2a2a30), sx, 0.39, 0.36, cat));
    const tail = add(new THREE.BoxGeometry(0.05, 0.4, 0.05), P.M(0x2a2a30), 0, 0.3, -0.32, cat);
    P.anim(cat, (t) => { const u = Math.sin(t * 0.12); cat.position.set(-13.6, Y + 1.0, u * 10); cat.rotation.y = Math.cos(t * 0.12) > 0 ? 0 : Math.PI; tail.rotation.x = Math.sin(t * 3) * 0.4; });
    for (let k = 0; k < 4; k++) { const bf = new THREE.Group(); g.add(bf); const wl = [-1, 1].map((sd) => add(new THREE.BoxGeometry(0.22, 0.02, 0.18), P.M([0xff8ac8, 0xffe14a, 0x8ad8ff, 0xffffff][k], { side: THREE.DoubleSide }), sd * 0.11, 0, 0, bf));
      P.anim(bf, (t) => { const a = t * 0.3 + k * 1.6; bf.position.set((k % 2 ? 15 : -15.5) + Math.sin(a * 1.3) * 1.5, Y + 0.8 + Math.sin(t * 2 + k) * 0.4, -3 + k * 3 + Math.cos(a) * 1.5); wl.forEach((w, i) => { w.rotation.z = (i ? -1 : 1) * Math.sin(t * 18) * 0.9; }); }); }
    // hamaca con un chico que se hamaca
    const sw = new THREE.Group(); sw.position.set(-17.5, Y, -1.2); sw.rotation.y = 0; g.add(sw);
    const fm = P.M(0xd83a3a, { map: TX.metal });
    [-1, 1].forEach((sx) => { [-0.6, 0.6].forEach((sz) => { const l = add(new THREE.BoxGeometry(0.1, 2.6, 0.1), fm, sx * 1.1, 1.25, sz, sw); l.rotation.x = sz * 0.35; }); });
    add(new THREE.BoxGeometry(2.4, 0.1, 0.1), fm, 0, 2.45, 0, sw);
    const seat = new THREE.Group(); seat.position.y = 2.4; sw.add(seat);
    [-0.3, 0.3].forEach((sx) => add(new THREE.BoxGeometry(0.03, 1.8, 0.03), P.M(0x8a92a6), sx, -0.9, 0, seat));
    add(new THREE.BoxGeometry(0.7, 0.06, 0.35), P.M(0x3a8ad8), 0, -1.8, 0, seat);
    const kid = P.fans(seat, -2.25, [[0, 0, 0]], { shirts: [0xffd23a] })[0]; kid.g.scale.setScalar(0.6);
    P.anim(sw, (t) => { seat.rotation.x = Math.sin(t * 1.6) * 0.6; kid.g.position.y = -2.3; });
  } else if (deco === 'cajas') {                                // FÁBRICA: caños, chimeneas, tambores
    [-1, 1].forEach((sx) => {
      P.pipe(g, sx * 14.2, Y + 1.0, -12, sx * 14.2, Y + 1.0, 12, 0.42);
      P.pipe(g, sx * 15.4, Y + 0.5, -12, sx * 15.4, Y + 0.5, 12, 0.3, 0xc05a3a);
      for (let z = -11; z <= 11; z += 5.5) add(new THREE.BoxGeometry(0.3, 1.0, 1.8), P.M(0x5a6070, { map: TX.metal }), sx * 14.8, Y + 0.5, z, g);
    });
    P.smokestack(g, -17.5, Y, -12.5, 8); P.smokestack(g, 17.5, Y, -13.5, 6.5);
    [[-16.5, 4], [-17.3, 5], [-16.3, 5.4], [17, -3], [16.4, -4.1], [17.6, 8], [16.9, 9]].forEach(([x, z], k) => P.barrel(g, x, Y, z, k % 2 ? 0xd8a02a : 0x3a6ac8));
    P.crates(g, -17.5, Y, -4, 3); P.crates(g, 18, Y, 2.5, 2);
    [[-13, -11.3], [13, -11.3], [-13, 11.3], [13, 11.3]].forEach(([x, z]) => P.beacon(g, x, Y, z));
    const hz = P.M(0xffffff, { map: TX.hazard, unlit: true });
    [-1, 1].forEach((sx) => add(new THREE.BoxGeometry(0.5, 0.04, 22), hz, sx * 13.1, Y + 0.02, 0, g));
    P.forklift(g, -17, Y, -8.5, 0.5);
    P.pallets(g, 17.2, Y, -8); P.pallets(g, -17.5, Y, 10, 2);
    P.warnSign(g, -13.3, Y, 8.5, 0.3); P.warnSign(g, 13.3, Y, -9, -0.3);
    P.container(g, 0, Y, -15.2, 0, 0x3a7ac8, 4.4);
    P.fan(g, 0, Y + 1.8, -16.4, 0, 1.1);
    P.sky(g, [[0, '#2a2a3a'], [0.45, '#8a6a6a'], [0.5, '#e0a070'], [1, '#3a3f4a']]);
    P.drift(g, 36, -18, 18, Y, Y + 6, -15, 14, 0xc8b8a0, 0.06, 0.3);       // polvo de fábrica
    // cinta transportadora de adelante, con cajas que pasan y una lámpara que gira en la punta
    { const bz = -12.9, bm = mat({ map: TX.belt, unlit: true });
      const bg = scaleUV(new THREE.PlaneGeometry(22, 1.3), 1, 14); bg.rotateX(-Math.PI / 2); bg.rotateY(Math.PI / 2);
      add(bg, bm, 0, Y + 0.62, bz, g);
      [-1, 1].forEach((s2) => add(new THREE.BoxGeometry(22.4, 0.3, 0.12), P.M(0xffc02a, { map: TX.metal }), 0, Y + 0.62, bz + s2 * 0.7, g));
      for (let k = -5; k <= 5; k++) add(new THREE.BoxGeometry(0.15, 0.6, 1.3), P.M(0x3a3f4a, { map: TX.metal }), k * 2.1, Y + 0.3, bz, g);
      const boxes = []; for (let k = 0; k < 7; k++) { const c = add(new THREE.BoxGeometry(0.75, 0.6, 0.75), P.M(k % 3 ? 0xc8a070 : 0xd8b888, { map: TX.cardboard }), 0, Y + 0.95, bz, g); boxes.push({ c, u: k / 7 }); }
      P.anim(g, (t) => { bm.uniforms.uOff.value.set(0, (-t * 0.6) % 1); boxes.forEach((q) => { const u = (q.u + t * 0.03) % 1; q.c.position.x = -10.8 + u * 21.6; q.c.visible = u > 0.02 && u < 0.98; }); });
      P.beacon(g, 11.4, Y + 0.6, bz + 0.9); }
    // brazos robot que sueldan (chispas), operarios con casco y manchas de aceite
    [[-17.2, 0.5, 0.4], [17.4, 5.5, Math.PI + 0.3]].forEach(([x, z, ry], k) => {
      const ra = new THREE.Group(); ra.position.set(x, Y, z); ra.rotation.y = ry; g.add(ra);
      const om = P.M(0xff8a1a, { map: TX.metal }), dk = P.M(0x2a2d36, { map: TX.metal });
      add(new THREE.CylinderGeometry(0.6, 0.7, 0.4, 8), dk, 0, 0.2, 0, ra);
      const base = new THREE.Group(); base.position.y = 0.4; ra.add(base);
      add(new THREE.BoxGeometry(0.5, 1.6, 0.5), om, 0, 0.8, 0, base);
      const el = new THREE.Group(); el.position.y = 1.6; base.add(el);
      add(new THREE.BoxGeometry(0.4, 1.4, 0.4), om, 0, 0.7, 0, el);
      add(new THREE.ConeGeometry(0.15, 0.4, 6), dk, 0, 1.55, 0, el).rotation.x = Math.PI;
      const sparks = []; for (let i = 0; i < 6; i++) sparks.push(add(new THREE.BoxGeometry(0.06, 0.06, 0.06), P.M(i % 2 ? 0xffe07a : 0xffffff, { unlit: true }), 0, 1.4, 0, el));
      P.anim(ra, (t) => { base.rotation.y = Math.sin(t * 0.7 + k) * 0.7; el.rotation.x = 0.9 + Math.sin(t * 1.1 + k) * 0.3; const on = Math.sin(t * 2 + k) > 0;
        sparks.forEach((sp, i) => { const u = (t * 3 + i / 6) % 1; sp.visible = on; sp.position.set(Math.sin(i * 2.1) * u * 0.6, 1.35 + Math.sin(u * Math.PI) * 0.4 - u * 0.5, Math.cos(i * 2.1) * u * 0.6); }); });
    });
    P.fans(g, Y, [[-16.2, -1.6, 1.4], [16.4, 0.2, -1.2], [15.6, 11.4, -2.4]], { shirts: [0x3a6ad8, 0xff8a1a, 0x3a6ad8], hats: [0xffd23a, 0xffd23a, 0xffffff] });
    [[-15.6, 7.5, 0.7], [16, -1.5, 0.6], [-3, -13.9, 0.8]].forEach(([x, z, r]) => P.patch(g, x, Y, z, r, 0x14161c));
    P.walker(g, -16.4, Y, -11, -16.4, 11, { shirt: 0xff8a1a, hat: 0xffd23a, sp: 0.16, carry: (w) => add(new THREE.BoxGeometry(0.6, 0.5, 0.5), P.M(0xc8a070, { map: TX.crate }), 0, 1.0, 0.35, w) });
  } else if (deco === 'cactus') {                               // DESIERTO: dunas, cactus, huesos, oasis
    [[-17, -6, 5, 4], [18, -9, 6, 4], [-18, 8, 5, 5], [17, 4, 4, 5], [-4, -16, 8, 3], [9, -15.5, 6, 3]].forEach(([x, z, sx, sz]) => P.dune(g, x, Y - 0.1, z, sx, sz, 0xecc888));
    P.mesa(g, -25, Y, -17, 7, 6, 5); P.mesa(g, 26, Y, -13, 6, 4.5, 5, 0xb86a3a); P.mesa(g, -27, Y, 9, 5, 3.5, 4, 0xd08a4a);
    P.scatter(g, 0, Y, 0, 22, 16, 90, 0xb88a5a, 0.18, [13.2, 11.2]);
    P.sky(g, [[0, '#4a8ad8'], [0.45, '#bcd8f0'], [0.5, '#ffe8b0'], [1, '#c8a060']]);
    P.skyClouds(g, 5, 42, 62, 16, 24, 0xfff8ec, 0.004);
    P.cloudShadows(g, 0, 2, 24);
    [[-15.2, -9], [16, -2.5], [-16, 3], [15.5, 10.5], [-8, -13.5], [11, -13]].forEach(([x, z]) => P.cactus(g, x, Y, z, rnd(0.75, 1.05)));
    [[-14.5, 0], [15.2, -6.5], [-15, 10.5], [3, -13.8]].forEach(([x, z]) => P.rock(g, x, Y, z, rnd(0.8, 1.3), 0xc8905a));
    P.bones(g, -14.4, Y, -3.2); P.bones(g, 14.6, Y, 7.4);
    P.pond(g, 17.6, Y, 7.5, 1.8); P.palm(g, 16, Y, 5.5, 1); P.palm(g, 19.3, Y, 9.5, 0.9);
    P.sign(g, -14.2, Y, 6.2, 0.4);
    P.tumbleweed(g, -26, Y, -13, 26, -12.2, 11, 0); P.tumbleweed(g, 26, Y, 12.4, -26, 12, 13, 6);
    P.windblown(g, 60, -24, 24, Y + 0.1, Y + 1.6, -17, 16, 1, 0.15, 4, 0xe8c888, 0.08);   // arena que vuela al ras del piso
    // buitres dando vueltas, una carreta vieja, un camello echado y una lagartija que corre
    P.flyers(g, 0, 9, -2, 12, 3, 0x2a1a1a, 0.7);
    const wg = new THREE.Group(); wg.position.set(-17.4, Y, -2); wg.rotation.y = 1.3; g.add(wg);
    add(new THREE.BoxGeometry(1.6, 0.6, 2.6), P.M(0x9a6a3a, { map: TX.wood }), 0, 0.8, 0, wg);
    [[-0.9, -0.8], [0.9, -0.8], [-0.9, 0.8]].forEach(([a2, b2]) => add(new THREE.TorusGeometry(0.5, 0.08, 4, 10), P.M(0x6b4a2a, { map: TX.wood }), a2, 0.5, b2, wg).rotation.y = Math.PI / 2);
    const wh = add(new THREE.TorusGeometry(0.5, 0.08, 4, 10), P.M(0x6b4a2a, { map: TX.wood }), 1.2, 0.08, 1.1, wg); wh.rotation.x = Math.PI / 2;
    add(new THREE.BoxGeometry(1.4, 0.06, 2.4), P.M(0xf0e0c0, { map: TX.cloth }), 0, 1.6, 0, wg).rotation.z = 0.08;
    const cm = new THREE.Group(); cm.position.set(16.6, Y, -8.4); cm.rotation.y = -0.8; g.add(cm);
    const cc = P.M(0xc89a5a);
    add(new THREE.BoxGeometry(0.9, 0.6, 1.8), cc, 0, 0.35, 0, cm);
    add(new THREE.SphereGeometry(0.4, 7, 5), cc, 0, 0.85, -0.1, cm).scale.y = 0.9;
    const neck = new THREE.Group(); neck.position.set(0, 0.5, 0.85); cm.add(neck);
    add(new THREE.BoxGeometry(0.28, 1.0, 0.28), cc, 0, 0.45, 0.15, neck).rotation.x = 0.3;
    add(new THREE.BoxGeometry(0.32, 0.3, 0.55), cc, 0, 0.95, 0.38, neck);
    P.anim(cm, (t) => { neck.rotation.x = Math.sin(t * 0.6) * 0.15; neck.rotation.y = Math.sin(t * 0.25) * 0.4; });
    const lz = new THREE.Group(); g.add(lz);
    add(new THREE.BoxGeometry(0.14, 0.06, 0.5), P.M(0x6aa83a), 0, 0.04, 0, lz); add(new THREE.BoxGeometry(0.04, 0.03, 0.4), P.M(0x6aa83a), 0, 0.03, -0.42, lz);
    const sn = new THREE.Group(); g.add(sn);
    const segs = []; for (let i = 0; i < 8; i++) segs.push(add(new THREE.SphereGeometry(0.13 - i * 0.008, 6, 4), P.M(i % 2 ? 0xc8a03a : 0x8a6a2a), 0, 0.1, 0, sn));
    P.anim(sn, (t) => segs.forEach((sg, i) => { const u = t * 0.4 - i * 0.06; sg.position.set(-15 + Math.sin(u) * 1.5 + Math.sin(u * 8) * 0.2, Y + 0.1, -6 + Math.cos(u) * 1.5); }));
    P.anim(lz, (t) => { const u = (t * 0.25) % 1, v = Math.min(1, u / 0.25), back = Math.floor(t * 0.25) % 2; lz.position.set(14.2 + Math.sin(v * 20) * 0.1, Y, back ? -5 - v * 6 : -11 + v * 6); lz.rotation.y = back ? Math.PI : 0; });
  } else {                                                      // NIEVE: pinos nevados, muñecos, iglú y nieve que cae
    const pinePts = [[-16.5, -8.5], [16.8, -3], [-17.2, 2.5], [16, 6.5], [-18.5, 10], [19, 11], [-10, -14.5], [9.5, -14.8], [-15, -12], [18, -11], [-19, -2], [19.5, 4], [-12.5, -15.5], [12, -15.5]].map(([x, z]) => [x, z, rnd(0.8, 1.2)]);
    P.forest(g, Y, pinePts);
    P.snowman(g, -15, Y, 5.5, 1.2); P.snowman(g, 15.3, Y, -7, -1.2);
    P.igloo(g, 16.5, Y, 2, -1.3, 0.9);
    [[-14.5, -3], [14.6, 9.5], [0, -13.8], [-5, -14], [-14.5, 11.5]].forEach(([x, z]) => P.rock(g, x, Y, z, rnd(0.7, 1.1), 0xd4dce8, true));
    P.frozenPond(g, -16.8, Y, -5.6, 2.2);
    P.sled(g, 15.2, Y, 4.6, 0.6);
    [[-15, 8.5, 1.2], [15.6, -10.5, 1.4], [6, -14, 1.1], [-9, -13.2, 1.3], [17.5, 7.5, 1.1], [-17.5, -11, 1.2]].forEach(([x, z, s2]) => P.snowPile(g, x, Y, z, s2));
    P.sky(g, [[0, '#8a98b0'], [0.45, '#d8e0ec'], [0.5, '#f4f8ff'], [1, '#dde8f4']]);
    P.skyClouds(g, 9, 40, 60, 12, 20, 0xd8e0ec, 0.004);
    P.drift(g, 150, -22, 22, 14, Y, -16, 14, 0xffffff, 0.13, 2.2, true);   // copos que caen
    // alguien patinando en la laguna, un ciervo, guerra de bolas de nieve armada y luces de colores
    const sk = P.fans(g, Y + 0.25, [[-16.8, -5.6, 0]], { hats: [0xd83a3a], shirts: [0x3a7ad8] })[0];
    P.anim(sk.g, (t) => { const a = t * 0.9; sk.g.position.x = -16.8 + Math.sin(a) * 1.3; sk.g.position.z = -5.6 + Math.cos(a) * 1.3; sk.g.rotation.y = a + Math.PI / 2; });
    const dr = new THREE.Group(); dr.position.set(17.6, Y, -1.5); dr.rotation.y = -1.9; g.add(dr);
    const dm = P.M(0x9a6a3a);
    add(new THREE.BoxGeometry(0.5, 0.5, 1.2), dm, 0, 1.0, 0, dr);
    [[-0.18, 0.45], [0.18, 0.45], [-0.18, -0.45], [0.18, -0.45]].forEach(([a2, b2]) => add(new THREE.BoxGeometry(0.1, 0.8, 0.1), dm, a2, 0.4, b2, dr));
    const dh = new THREE.Group(); dh.position.set(0, 1.25, 0.6); dr.add(dh);
    add(new THREE.BoxGeometry(0.22, 0.6, 0.22), dm, 0, 0.25, 0.05, dh); add(new THREE.BoxGeometry(0.26, 0.26, 0.45), dm, 0, 0.6, 0.15, dh);
    add(new THREE.BoxGeometry(0.08, 0.08, 0.08), P.M(0x1a1a1e), 0, 0.6, 0.4, dh);
    [-1, 1].forEach((sd) => { add(new THREE.BoxGeometry(0.04, 0.4, 0.04), P.M(0x6b4a2a), sd * 0.12, 0.9, 0.08, dh).rotation.z = sd * 0.5; add(new THREE.BoxGeometry(0.04, 0.2, 0.04), P.M(0x6b4a2a), sd * 0.22, 1.0, 0.1, dh).rotation.z = -sd * 0.4; });
    P.anim(dr, (t) => { const graze = Math.sin(t * 0.4) > 0.2; dh.rotation.x = graze ? 1.1 : 0; dh.rotation.y = graze ? 0 : Math.sin(t * 1.3) * 0.4; });
    [[15.2, 9.6], [-15.6, 2.2]].forEach(([x, z]) => { for (let i = 0; i < 6; i++) add(new THREE.SphereGeometry(0.2, 6, 5), P.M(0xffffff, { map: TX.snow }), x + (i % 3) * 0.36 - 0.36, Y + 0.18 + (i >= 3 ? 0.3 : 0), z + (i >= 3 ? 0.1 : 0), g); P.snowPile(g, x, Y, z - 0.9, 0.9); });
    P.stringLights(g, -13.6, Y + 3, -11.6, 13.6, Y + 3, -11.6, 18, [0xff5a5a, 0x5aff8a, 0xffe14a, 0x5ab0ff]);
    P.walker(g, 16.6, Y, 11, 16.6, -9, { shirt: 0xd83a3a, hat: 0x3a7aff, sp: 0.14, carry: (w) => { const sl = new THREE.Group(); sl.position.set(0, 0, -1.4); w.add(sl); P.sled(sl, 0, 0, 0, 0); } });
  }
}

// Remate de la pared de afuera de la cancha y columnas en las esquinas (con un adorno según la cancha)
function cancha(g, deco, L) {
  const { TS, GW, GH, cx, cz, wallCol, wallTex } = L;
  const top = TS * 0.9, capM = P.M(new THREE.Color(wallCol).lerp(new THREE.Color(0xffffff), 0.2).getHex(), { map: wallTex });
  const W2 = GW * TS, H2 = GH * TS;
  add(new THREE.BoxGeometry(W2 + 0.1, 0.14, TS * 1.06), capM, 0, top + 0.07, cz(0), g);
  add(new THREE.BoxGeometry(W2 + 0.1, 0.14, TS * 1.06), capM, 0, top + 0.07, cz(GH - 1), g);
  add(new THREE.BoxGeometry(TS * 1.06, 0.14, H2 + 0.1), capM, cx(0), top + 0.07, 0, g);
  add(new THREE.BoxGeometry(TS * 1.06, 0.14, H2 + 0.1), capM, cx(GW - 1), top + 0.07, 0, g);
  if (deco === 'pinos') {                                       // nieve acumulada arriba del muro
    const sn = P.M(0xffffff, { map: TX.snow });
    add(new THREE.BoxGeometry(W2 - 0.2, 0.12, TS * 0.8), sn, 0, top + 0.2, cz(0), g);
    add(new THREE.BoxGeometry(W2 - 0.2, 0.12, TS * 0.8), sn, 0, top + 0.2, cz(GH - 1), g);
    add(new THREE.BoxGeometry(TS * 0.8, 0.12, H2 - 0.2), sn, cx(0), top + 0.2, 0, g);
    add(new THREE.BoxGeometry(TS * 0.8, 0.12, H2 - 0.2), sn, cx(GW - 1), top + 0.2, 0, g);
  }
  [[0, 0], [GW - 1, 0], [0, GH - 1], [GW - 1, GH - 1]].forEach(([c, r]) => {
    const x = cx(c), z = cz(r);
    add(new THREE.BoxGeometry(TS * 1.16, TS * 1.35, TS * 1.16), capM, x, TS * 0.675, z, g);
    add(new THREE.BoxGeometry(TS * 1.3, 0.2, TS * 1.3), capM, x, TS * 1.4, z, g);
    const yy = TS * 1.5;
    if (deco === 'arboles') {                                   // maceta con flores
      add(new THREE.CylinderGeometry(0.42, 0.32, 0.5, 8), P.M(0xc0643a, { map: TX.brick }), x, yy + 0.25, z, g);
      P.bush(g, x, yy + 0.35, z, 0.55, 0x4f9a42);
      P.flowers(g, x, yy + 0.4, z, 0.35, 0.35, 6);
    } else if (deco === 'cajas') P.beacon(g, x, yy - 0.1, z);
    else if (deco === 'cactus') P.torch(g, x, yy - 0.1, z, 0.9);
    else {                                                      // nieve: farol y nieve arriba
      P.snowPile(g, x, yy - 0.08, z, 0.75);
      P.lantern(g, x - 0.2, yy, z, 1.4);
    }
  });
}

/* ---------- Fiesta: el tablero en la isla ---------- */
export function decorFiesta(grp, start) {
  // cielo de día, arco de bienvenida en la largada, globos y guirnaldas
  P.sky(grp, [[0, '#2f62c8'], [0.4, '#7ab0ec'], [0.48, '#f4dcc0'], [0.53, '#2a4a8a'], [1, '#0a1a3a']]);
  if (start) P.arch(grp, start.x, 0.3, start.z, start.ang, 3.4, 3.2);
  P.balloons(grp, 0, 5.5, 0, 3.6, 6);
  P.bunting(grp, -7.5, 2.6, 12.2, -2, 2.6, 10.6); P.bunting(grp, 11, 2.6, -11, 2.5, 2.6, -10.2);
  // casitas y cercas en los bordes, faroles, flores y hongos
  P.house(grp, -5.5, 0, -13.4, 0.15, 0xf6e6c6, 0xffffff, 0.85);
  P.house(grp, 7, 0, 13.2, Math.PI + 0.25, 0xe8d8ff, 0xffffff, 0.8);
  P.fence(grp, -3.5, 0, -14.6, 1.5, -14.8); P.fence(grp, 4.5, 0, 14.6, 10, 13.2);
  [[-14.6, -1.5], [14.8, 1.5], [-7.5, 12.2], [11, -11], [-2, 10.6], [2.5, -10.2]].forEach(([x, z]) => P.lamp(grp, x, 0, z, 2.6));
  P.flowers(grp, -4, 0, 0.5, 1.6, 1.2, 30); P.flowers(grp, 4.6, 0, 1.2, 1.4, 1.0, 26);
  P.flowers(grp, -11, 0, -11.5, 1.5, 1, 26); P.flowers(grp, 12.5, 0, 10, 1.2, 1.2, 24);
  P.grass(grp, 0, 0, 0, 5, 3, 60, 0x3f8a3a);
  P.grass(grp, 0, 0, -13, 9, 1.8, 70, 0x3f8a3a); P.grass(grp, 0, 0, 13, 9, 1.8, 70, 0x3f8a3a);
  const cap = P.M(0xe83a3a), dot = P.M(0xffffff), st = P.M(0xf0e8d6);
  [[-15, 4.5], [-13.8, 5.4], [15.3, -5.5], [-1, -10.8], [9, 10.8]].forEach(([x, z]) => {
    add(new THREE.CylinderGeometry(0.1, 0.13, 0.4, 6), st, x, 0.2, z, grp);
    add(new THREE.SphereGeometry(0.3, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2), cap, x, 0.38, z, grp);
    add(new THREE.BoxGeometry(0.08, 0.04, 0.08), dot, x + 0.12, 0.62, z, grp);
  });
  // estanque con cascada que cae por el borde de la isla
  P.pond(grp, -10.6, 0, 9.2, 1.5);
  const wmat = P.M(0xcfe8ff, { map: TX.water, unlit: true, side: THREE.DoubleSide });
  const ex = -0.76, ez = 0.65, er = 16.45;                                // punto del borde hacia donde cae
  add(new THREE.BoxGeometry(0.9, 0.1, 3.2), wmat, (-10.6 + ex * er) / 2 + 0.3, 0.2, (9.2 + ez * er) / 2 + 0.3, grp).rotation.y = Math.atan2(ex, ez);
  const wf = add(new THREE.PlaneGeometry(1.2, 14, 1, 4), wmat, ex * (er + 0.15), -6.9, ez * (er + 0.15), grp); wf.rotation.y = Math.atan2(ex, ez);
  P.anim(grp, (t) => wmat.uniforms.uOff.value.set(0, (t * 0.6) % 1));
  // nubes que pasan por abajo y pájaros dando vueltas
  const cm = P.M(0xf4f6ff);
  const clouds = [];
  for (let k = 0; k < 7; k++) {
    const c = new THREE.Group(); grp.add(c);
    [[0, 0, 1.6], [1.4, -0.2, 1.1], [-1.3, -0.1, 1.2], [0.4, 0.5, 1]].forEach(([dx, dy, r]) => add(new THREE.DodecahedronGeometry(r, 0), cm, dx, dy, 0, c));
    clouds.push({ c, a: (k / 7) * Math.PI * 2, r: rnd(19, 25), y: rnd(-9, -3), sp: rnd(0.02, 0.04) });
  }
  P.anim(grp, (t) => clouds.forEach((q) => { const a = q.a + t * q.sp; q.c.position.set(Math.sin(a) * q.r, q.y, Math.cos(a) * q.r); }));
  P.flyers(grp, 0, 9, 0, 13, 5, 0x2a2a34, 0.6);
}

/* ---------- Empujón: TORMENTA (balsa en alta mar, de noche, con lluvia y rayos) ---------- */
export function decorTormenta(g, R0) {
  P.sky(g, [[0, '#0a0e18'], [0.35, '#1a2230'], [0.48, '#2a3444'], [0.52, '#1a222e'], [1, '#080a10']], { blobs: [[0.2, 0.35, 0.3, 'rgba(90,100,120,.35)'], [0.6, 0.3, 0.35, 'rgba(70,80,100,.35)'], [0.85, 0.4, 0.25, 'rgba(100,110,130,.3)']] });
  // nubarrones bajos que pasan
  const cm = P.M(0x3a4250), cm2 = P.M(0x2a303c);
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2, d = rnd(30, 50), cg = new THREE.Group(); cg.position.set(Math.sin(a) * d, rnd(8, 16), Math.cos(a) * d); g.add(cg);
    for (let j = 0; j < 5; j++) add(new THREE.DodecahedronGeometry(rnd(2, 4), 1), j % 2 ? cm : cm2, rnd(-4, 4), rnd(-1, 1), rnd(-2, 2), cg);
    const sp = rnd(0.01, 0.02), a0 = a; P.anim(cg, (t) => { const aa = a0 + t * sp; cg.position.x = Math.sin(aa) * d; cg.position.z = Math.cos(aa) * d; });
  }
  // olas: bloques de espuma que suben y bajan alrededor
  const fm = P.M(0x8a9aac);
  for (let k = 0; k < 16; k++) {
    const a = rnd(0, Math.PI * 2), d = rnd(R0 + 3, 30), w = add(new THREE.BoxGeometry(rnd(2, 4), 0.12, 0.35), fm, Math.sin(a) * d, -2.75, Math.cos(a) * d, g);
    w.rotation.y = a + Math.PI / 2; const ph = rnd(0, 6);
    P.anim(w, (t) => { w.position.y = -2.75 + Math.sin(t * 1.2 + ph) * 0.35; w.scale.x = 0.6 + Math.abs(Math.sin(t * 0.6 + ph)) * 0.8; });
  }
  // faro a lo lejos con la luz que gira
  lighthouse(g, -26, -24);
  const beam = new THREE.Mesh(new THREE.ConeGeometry(3, 34, 10, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff0b0, transparent: true, opacity: 0.12, depthWrite: false, fog: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
  beam.geometry.translate(0, -17, 0); beam.rotation.z = Math.PI / 2;
  const bg = new THREE.Group(); bg.position.set(-26, 9.8, -24); bg.add(beam); g.add(bg);
  P.anim(bg, (t) => { bg.rotation.y = t * 0.7; });
  // rocas, el mástil de un barco hundido y aletas de tiburón dando vueltas
  [[18, -22, 3], [22, -18, 2], [-20, 18, 2.5], [26, 14, 1.8]].forEach(([x, z, s]) => P.rock(g, x, -3, z, s, 0x4a4a54));
  const wr = new THREE.Group(); wr.position.set(20, -3, 20); wr.rotation.z = 0.35; g.add(wr);
  add(new THREE.CylinderGeometry(0.25, 0.35, 10, 6), P.M(0x5a3a1a, { map: TX.wood }), 0, 4, 0, wr);
  add(new THREE.BoxGeometry(4, 0.2, 0.2), P.M(0x5a3a1a, { map: TX.wood }), 0, 7, 0, wr);
  add(new THREE.PlaneGeometry(3.4, 2.4), P.M(0xc8c0a8, { side: THREE.DoubleSide }), 0.4, 5.6, 0.1, wr).rotation.y = 0.3;
  const finM = P.M(0x4a5468);
  for (let k = 0; k < 3; k++) {
    const f = add(new THREE.ConeGeometry(0.5, 1.2, 3), finM, 0, -2.4, 0, g); f.scale.z = 0.3;
    const r = R0 + 3 + k * 2.2, sp = (k % 2 ? 1 : -1) * rnd(0.25, 0.4), ph = rnd(0, 6);
    P.anim(f, (t) => { const a = t * sp + ph; f.position.set(Math.sin(a) * r, -2.4 + Math.sin(t * 2 + k) * 0.1, Math.cos(a) * r); f.rotation.y = a + (sp > 0 ? Math.PI / 2 : -Math.PI / 2); });
  }
  // cosas que flotan alrededor de la balsa: barriles, cajones, un salvavidas y boyas con luz que titila
  const bob = (o, y0, ph, k = 1) => P.anim(o, (t) => { o.position.y = y0 + Math.sin(t * 1.3 + ph) * 0.3 * k; o.rotation.x = Math.sin(t * 0.9 + ph) * 0.2 * k; o.rotation.z = Math.cos(t * 1.1 + ph) * 0.2 * k; });
  const drifters = [];
  [[R0 + 3.5, 0.6], [R0 + 5, 2.1], [R0 + 3, 3.3], [R0 + 6.5, 4.4], [R0 + 4, 5.5], [R0 + 7, 1.2]].forEach(([d, a], k) => {
    const o = new THREE.Group(); o.position.set(Math.sin(a) * d, -2.8, Math.cos(a) * d); g.add(o);
    if (k % 3 === 0) { add(new THREE.CylinderGeometry(0.5, 0.5, 1.2, 8), P.M(k % 2 ? 0x8a5a2a : 0x3a6ac8, { map: TX.wood }), 0, 0, 0, o).rotation.z = Math.PI / 2; }
    else if (k % 3 === 1) add(new THREE.BoxGeometry(1.1, 0.9, 1.1), P.M(0xc8a070, { map: TX.crate }), 0, 0.1, 0, o).rotation.y = rnd(0, 3);
    else { const ring = add(new THREE.TorusGeometry(0.55, 0.2, 5, 12), P.M(0xff6a2a, { map: TX.stripes }), 0, 0.1, 0, o); ring.rotation.x = Math.PI / 2; }
    bob(o, -2.8, k * 1.7); drifters.push({ o, a, d, sp: rnd(0.01, 0.025) * (k % 2 ? 1 : -1) });
  });
  P.anim(g, (t) => drifters.forEach((q) => { const a = q.a + t * q.sp; q.o.position.x = Math.sin(a) * q.d; q.o.position.z = Math.cos(a) * q.d; }));
  [[R0 + 9, -0.7, 0xff3a2a], [R0 + 10, 2.6, 0x3aff6a], [R0 + 8, 4.1, 0xff3a2a]].forEach(([d, a, c], k) => {
    const o = new THREE.Group(); o.position.set(Math.sin(a) * d, -2.8, Math.cos(a) * d); g.add(o);
    add(new THREE.CylinderGeometry(0.2, 0.8, 1.6, 8), P.M(k % 2 ? 0x2a9a4a : 0xd83a2a, { map: TX.stripes }), 0, 0.6, 0, o);
    add(new THREE.CylinderGeometry(0.05, 0.05, 1.1, 4), P.M(0x2a2d36), 0, 1.9, 0, o);
    const l = add(new THREE.SphereGeometry(0.22, 6, 4), P.M(c, { unlit: true }), 0, 2.5, 0, o);
    bob(o, -2.8, k * 2.3, 0.6); P.anim(l, (t) => { l.visible = ((t * 1.4 + k * 0.4) % 1) < 0.35; });
  });
  // un barco pirata medio hundido, escorado y meciéndose, con la vela rota
  const sh = new THREE.Group(); sh.position.set(-17, -3.2, -20); sh.rotation.set(0.12, 0.7, 0.18); g.add(sh);
  const hw = P.M(0x4a3020, { map: TX.wood }), hd = P.M(0x2a1a10, { map: TX.wood });
  add(new THREE.BoxGeometry(4, 2.4, 12), hw, 0, 0.6, 0, sh); add(new THREE.BoxGeometry(4.2, 0.4, 12.2), hd, 0, 1.9, 0, sh);
  add(new THREE.BoxGeometry(3.6, 1.6, 3), hw, 0, 2.6, -4.2, sh);
  [[0, 2], [0, -2]].forEach(([x, z], k) => { add(new THREE.CylinderGeometry(0.18, 0.24, 9 - k * 2, 6), hd, x, 6.4 - k, z, sh); add(new THREE.BoxGeometry(4, 0.15, 0.15), hd, x, 8.6 - k * 2, z, sh); });
  const sail = add(new THREE.PlaneGeometry(3.6, 3, 3, 2), P.M(0xc8c0a8, { side: THREE.DoubleSide }), 0, 6.6, 2.15, sh);
  const sp2 = sail.geometry.attributes.position; sp2.setY(0, sp2.getY(0) - 0.8); sp2.setX(11, sp2.getX(11) - 0.6);
  add(new THREE.BoxGeometry(0.8, 0.5, 0.05), P.M(0x1a1a1e), 0, 9.6, 2, sh);                       // bandera negra
  for (let k = 0; k < 3; k++) add(new THREE.CircleGeometry(0.28, 6), P.M(0x14100c), 2.11, 0.9, -2.5 + k * 2.5, sh).rotation.y = Math.PI / 2;   // ojos de buey
  const lamp = add(new THREE.BoxGeometry(0.4, 0.5, 0.4), P.M(0xffc86a, { unlit: true }), 0, 3.7, -5.6, sh);
  P.anim(sh, (t) => { sh.rotation.x = 0.12 + Math.sin(t * 0.7) * 0.05; sh.rotation.z = 0.18 + Math.sin(t * 0.5) * 0.06; sh.position.y = -3.2 + Math.sin(t * 0.8) * 0.2; lamp.visible = Math.sin(t * 9) > -0.8; });
  // más espuma, y tablas sueltas de otra balsa
  for (let k = 0; k < 14; k++) {
    const a = rnd(0, Math.PI * 2), d = rnd(R0 + 1.5, 16), w = add(new THREE.BoxGeometry(rnd(1, 2.4), 0.1, 0.3), fm, Math.sin(a) * d, -2.75, Math.cos(a) * d, g);
    w.rotation.y = a + Math.PI / 2; const ph = rnd(0, 6);
    P.anim(w, (t) => { w.position.y = -2.78 + Math.sin(t * 1.6 + ph) * 0.25; w.scale.x = 0.5 + Math.abs(Math.sin(t * 0.8 + ph)); });
  }
  for (let k = 0; k < 5; k++) { const a = rnd(0, 6), d = rnd(R0 + 2, 14); const pl = add(new THREE.BoxGeometry(0.5, 0.12, rnd(1.8, 3)), P.M(0x6a4a2a, { map: TX.wood }), Math.sin(a) * d, -2.7, Math.cos(a) * d, g); pl.rotation.y = rnd(0, 3); bob(pl, -2.7, k * 1.3, 0.5); }
  // tentáculos de un pulpo gigante que asoman del agua cada tanto
  const tm = P.M(0x8a3a6a), sm = P.M(0xe8b0c8);
  const tents = [[-R0 - 6, 6], [R0 + 7, -3], [3, R0 + 8]].map(([x, z], k) => {
    const tg = new THREE.Group(); tg.position.set(x, -3, z); g.add(tg);
    const segs = [];
    let parent = tg;
    for (let i = 0; i < 6; i++) { const sg = new THREE.Group(); sg.position.y = i ? 0.9 : 0; parent.add(sg); add(new THREE.CylinderGeometry(0.42 - i * 0.06, 0.48 - i * 0.06, 0.95, 7), tm, 0, 0.45, 0, sg); add(new THREE.SphereGeometry(0.1, 5, 4), sm, 0, 0.45, 0.4 - i * 0.05, sg); segs.push(sg); parent = sg; }
    return { tg, segs, ph: k * 2.6 };
  });
  P.anim(g, (t) => tents.forEach((q) => { const u = (t * 0.12 + q.ph / 6) % 1, up = u < 0.4 ? Math.sin((u / 0.4) * Math.PI) : 0; q.tg.position.y = -3 - 6 + up * 6; q.tg.visible = up > 0.02; q.segs.forEach((sg, i) => { sg.rotation.x = Math.sin(t * 2 + i * 0.6 + q.ph) * 0.25; sg.rotation.z = Math.cos(t * 1.6 + i * 0.5) * 0.2; }); }));
  P.rainRipples(g, -2.55, 0, 0, 26, 24, 50, 0x8aa0c0, (x, z) => Math.hypot(x, z) < R0 + 0.5);
  P.lightningLight(g);
  // lluvia (rápida y en diagonal)
  P.drift(g, 160, -24, 24, 20, -3, -22, 22, 0xa8c0e0, 0.06, 18);
  // rayos lejanos cada tanto (se prende un zigzag en el horizonte)
  const boltM = new THREE.MeshBasicMaterial({ color: 0xeef4ff, fog: false });
  const bolts = [0, 1].map(() => {
    const b = new THREE.Group(); b.visible = false; g.add(b);
    let x = 0, y = 26;
    for (let i = 0; i < 7; i++) { const nx = x + rnd(-2.5, 2.5), ny = y - rnd(3.5, 5); const len = Math.hypot(nx - x, ny - y); const seg = add(new THREE.BoxGeometry(0.35, len, 0.35), boltM, (x + nx) / 2, (y + ny) / 2, 0, b); seg.rotation.z = Math.atan2(-(nx - x), ny - y) + Math.PI; x = nx; y = ny; }
    return { b, t: rnd(2, 6) };
  });
  P.anim(g, (t, dt) => bolts.forEach((q) => {
    q.t -= dt;
    if (q.t <= 0 && !q.b.visible) { const a = rnd(-1.2, 1.2) + Math.PI; q.b.position.set(Math.sin(a) * 60, -8, Math.cos(a) * 60); q.b.lookAt(0, -8, 0); q.b.visible = true; q.on = 0.18; P.flash.t = 0.18; }
    if (q.b.visible) { q.on -= dt; if (q.on <= 0) { q.b.visible = false; q.t = rnd(3, 7); } else q.b.children.forEach((c) => { c.visible = ((t * 30) | 0) % 3 !== 0; }); }
  }));
}
