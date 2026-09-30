// Decorado de cada escenario (fuera de la zona de juego): tribunas, jardines, fábricas, dunas, nieve…
// Solo adorna: no cambia nada de cómo se juega. Las piezas están en props.js.
import * as THREE from 'three';
import { add, scaleUV } from '../render/psx.js';
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
}

/* ---------- Rey de la colina: isla en el mar ---------- */
export function decorColina(g, rim) {
  // cielo de tarde soleada, gaviotas, islotes con palmeras, un faro y rocas alrededor
  P.sky(g, [[0, '#2a6ad8'], [0.42, '#7ab8f0'], [0.5, '#f4e0b0'], [0.53, '#9ad0f0'], [1, '#2a6aa8']]);
  P.flyers(g, 0, 14, 0, 24, 6, 0xf4f4f0, 0.6);
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
    [[-13.6, -12], [13.6, -12], [-13.6, 12], [13.6, 12]].forEach(([x, z]) => P.lamp(g, x, Y, z, 3.2));
    P.flyers(g, 0, 3.5, -2, 15, 5, 0xffe14a, 0.35);
  } else if (deco === 'cajas') {                                // FÁBRICA: caños, chimeneas, tambores
    [-1, 1].forEach((sx) => {
      P.pipe(g, sx * 14.2, Y + 1.0, -12, sx * 14.2, Y + 1.0, 12, 0.42);
      P.pipe(g, sx * 15.4, Y + 0.5, -12, sx * 15.4, Y + 0.5, 12, 0.3, 0xc05a3a);
      for (let z = -11; z <= 11; z += 5.5) add(new THREE.BoxGeometry(0.3, 1.0, 1.8), P.M(0x5a6070, { map: TX.metal }), sx * 14.8, Y + 0.5, z, g);
    });
    P.smokestack(g, -17.5, Y, -12.5, 8); P.smokestack(g, 17.5, Y, -13.5, 6.5);
    [[-16.5, 4], [-17.3, 5], [-16.3, 5.4], [17, -3], [16.4, -4.1], [17.6, 8], [16.9, 9]].forEach(([x, z], k) => P.barrel(g, x, Y, z, k % 2 ? 0xd8a02a : 0x3a6ac8));
    P.crates(g, -17.5, Y, -4, 3); P.crates(g, 18, Y, 2.5, 2); P.crates(g, 5, Y, -14, 3); P.crates(g, -6, Y, -14.2, 2);
    [[-13, -11.3], [13, -11.3], [-13, 11.3], [13, 11.3]].forEach(([x, z]) => P.beacon(g, x, Y, z));
    const hz = P.M(0xffffff, { map: TX.hazard, unlit: true });
    [-1, 1].forEach((sx) => add(new THREE.BoxGeometry(0.5, 0.04, 22), hz, sx * 13.1, Y + 0.02, 0, g));
    P.forklift(g, -17, Y, -8.5, 0.5);
    P.pallets(g, 17.2, Y, -8); P.pallets(g, -17.5, Y, 10, 2);
    P.warnSign(g, -13.3, Y, 8.5, 0.3); P.warnSign(g, 13.3, Y, -9, -0.3);
    P.container(g, 0, Y, -15.2, 0, 0x3a7ac8, 4.4);
    P.fan(g, 0, Y + 1.8, -16.4, 0, 1.1);
    P.sky(g, [[0, '#2a2a3a'], [0.45, '#8a6a6a'], [0.5, '#e0a070'], [1, '#3a3f4a']]);
  } else if (deco === 'cactus') {                               // DESIERTO: dunas, cactus, huesos, oasis
    [[-17, -6, 5, 4], [18, -9, 6, 4], [-18, 8, 5, 5], [17, 4, 4, 5], [-4, -16, 8, 3], [9, -15.5, 6, 3]].forEach(([x, z, sx, sz]) => P.dune(g, x, Y - 0.1, z, sx, sz, 0xecc888));
    P.mesa(g, -25, Y, -17, 7, 6, 5); P.mesa(g, 26, Y, -13, 6, 4.5, 5, 0xb86a3a); P.mesa(g, -27, Y, 9, 5, 3.5, 4, 0xd08a4a);
    P.scatter(g, 0, Y, 0, 22, 16, 90, 0xb88a5a, 0.18, [13.2, 11.2]);
    P.sky(g, [[0, '#4a8ad8'], [0.45, '#bcd8f0'], [0.5, '#ffe8b0'], [1, '#c8a060']]);
    [[-15.2, -9], [16, -2.5], [-16, 3], [15.5, 10.5], [-8, -13.5], [11, -13]].forEach(([x, z]) => P.cactus(g, x, Y, z, rnd(0.75, 1.05)));
    [[-14.5, 0], [15.2, -6.5], [-15, 10.5], [3, -13.8]].forEach(([x, z]) => P.rock(g, x, Y, z, rnd(0.8, 1.3), 0xc8905a));
    P.bones(g, -14.4, Y, -3.2); P.bones(g, 14.6, Y, 7.4);
    P.pond(g, 17.6, Y, 7.5, 1.8); P.palm(g, 16, Y, 5.5, 1); P.palm(g, 19.3, Y, 9.5, 0.9);
    P.sign(g, -14.2, Y, 6.2, 0.4);
    P.tumbleweed(g, -26, Y, -13, 26, -12.2, 11, 0); P.tumbleweed(g, 26, Y, 12.4, -26, 12, 13, 6);
  } else {                                                      // NIEVE: pinos nevados, muñecos, iglú y nieve que cae
    [[-16.5, -8.5], [16.8, -3], [-17.2, 2.5], [16, 6.5], [-18.5, 10], [19, 11], [-10, -14.5], [9.5, -14.8], [-15, -12], [18, -11]].forEach(([x, z]) => P.pine(g, x, Y, z, rnd(0.8, 1.2), true));
    P.snowman(g, -15, Y, 5.5, 1.2); P.snowman(g, 15.3, Y, -7, -1.2);
    P.igloo(g, 16.5, Y, 2, -1.3, 0.9);
    [[-14.5, -3], [14.6, 9.5], [0, -13.8], [-5, -14], [-14.5, 11.5]].forEach(([x, z]) => P.rock(g, x, Y, z, rnd(0.7, 1.1), 0xd4dce8, true));
    P.frozenPond(g, -16.8, Y, -5.6, 2.2);
    P.sled(g, 15.2, Y, 4.6, 0.6);
    [[-15, 8.5, 1.2], [15.6, -10.5, 1.4], [6, -14, 1.1], [-9, -13.2, 1.3], [17.5, 7.5, 1.1], [-17.5, -11, 1.2]].forEach(([x, z, s2]) => P.snowPile(g, x, Y, z, s2));
    [[-19, -2], [19.5, 4], [-12.5, -15.5], [12, -15.5]].forEach(([x, z]) => P.pine(g, x, Y, z, rnd(0.8, 1.1), true));
    P.sky(g, [[0, '#8a98b0'], [0.45, '#d8e0ec'], [0.5, '#f4f8ff'], [1, '#dde8f4']]);
    P.drift(g, 150, -22, 22, 14, Y, -16, 14, 0xffffff, 0.13, 2.2, true);   // copos que caen
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
