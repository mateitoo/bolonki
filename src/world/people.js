// Personajes "con ropa" (cabeza, torso, brazos y piernas), hechos con formas simples y texturas chiquitas.
// Usan el mismo esqueleto que los bichos redondos: el origen del piloto es el centro del torso,
// las piernas cuelgan de la cadera (legL / legR) y los pies terminan en y = -1.25 (un poco más largos que
// los bichos, que llegan a -1.11), así funcionan igual en la nave, a pie y en las animaciones de derrota. Los brazos (armL / armR) se animan al caminar.
import * as THREE from 'three';
import { add } from '../render/psx.js';
import { TX } from '../render/textures.js';

const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const HIP = -0.5;                // altura de la cadera (de ahí cuelgan las piernas, 0.75 de largo)

// brazo: grupo en el hombro, manga y mano hacia abajo
function arm(parent, x, y, sleeve, hand, o) {
  const g = new THREE.Group(); g.position.set(x, y, 0); parent.add(g);
  add(box(o.sw, o.sl, o.sd), sleeve, 0, -o.sl / 2 + 0.04, 0, g);
  if (o.cuff) add(box(o.sw + 0.04, 0.08, o.sd + 0.04), o.cuff, 0, -o.sl + 0.06, 0, g);
  add(box(o.hw, o.hh, o.hw * 0.9), hand, 0, -o.sl - o.hh / 2 + 0.06, 0.02, g);
  g.rotation.z = Math.sign(x) * 0.12;
  return g;
}
function legPair(parent, x, build) {
  const legs = new THREE.Group(); parent.add(legs);
  const legL = new THREE.Group(), legR = new THREE.Group();
  [[legL, -x], [legR, x]].forEach(([g, lx]) => { g.position.set(lx, HIP, 0); legs.add(g); build(g); });
  return { legs, legL, legR };
}

/* ---------- COCO: payaso triste con gorro, buzo y pantalón camuflado ---------- */
export function buildClown(rider, M) {
  const skin = M({ color: 0xa8cbd2 });
  const hoodie = M({ map: TX.hoodie }), shirt = M({ color: 0xe8dcc8 }), belt = M({ color: 0x4a3024 }), buckle = M({ color: 0xf08a1c });
  const camo = M({ map: TX.camo }), shoe = M({ map: TX.cloth, color: 0x3c2c24 }), sole = M({ color: 0xd98a2c }), lace = M({ color: 0x9a9088 });
  const knit = M({ map: TX.knit }), hair = M({ map: TX.cloth, color: 0xc85a1e, side: THREE.DoubleSide }), nose = M({ color: 0xff3a1a });
  const face = M({ map: TX.clownFace });

  // buzo con capucha, bien inflado
  add(box(0.92, 0.8, 0.64), hoodie, 0, 0.1, 0, rider);
  add(box(0.96, 0.12, 0.68), hoodie, 0, -0.3, 0, rider);                   // elástico de abajo
  add(box(0.64, 0.26, 0.26), hoodie, 0, 0.52, -0.25, rider);                // capucha caída atrás
  add(box(0.9, 0.06, 0.6), shirt, 0, -0.39, 0, rider);                      // remera que asoma
  add(box(0.88, 0.08, 0.6), belt, 0, -0.45, 0, rider);
  const bk = add(new THREE.CylinderGeometry(0.08, 0.08, 0.04, 8), buckle, 0, -0.45, 0.31, rider); bk.rotation.x = Math.PI / 2;
  add(new THREE.CylinderGeometry(0.16, 0.18, 0.14, 8), skin, 0, 0.54, 0, rider);   // cuello
  // cabeza, nariz, pelo y gorro
  add(new THREE.SphereGeometry(0.41, 10, 8), face, 0, 0.94, 0.02, rider).scale.set(1.04, 1.08, 0.9);
  add(new THREE.SphereGeometry(0.09, 6, 4), nose, 0, 0.9, 0.41, rider);
  add(new THREE.CylinderGeometry(0.44, 0.48, 0.56, 10, 1, true, Math.PI * 0.34, Math.PI * 1.32), hair, 0, 0.86, 0.01, rider);
  add(new THREE.CylinderGeometry(0.42, 0.45, 0.28, 10), knit, 0, 1.22, 0.01, rider);
  add(new THREE.SphereGeometry(0.42, 10, 5, 0, Math.PI * 2, 0, Math.PI / 2), knit, 0, 1.35, 0.01, rider).scale.set(1, 0.6, 1);
  // brazos: mangas anchas y manos celestes
  const o = { sw: 0.32, sl: 0.56, sd: 0.36, hw: 0.22, hh: 0.22, cuff: hoodie };
  const armL = arm(rider, -0.6, 0.4, hoodie, skin, o), armR = arm(rider, 0.6, 0.4, hoodie, skin, o);
  // piernas: pantalón ancho camuflado y zapatillas con suela naranja
  const lp = legPair(rider, 0.23, (g) => {
    add(box(0.4, 0.54, 0.42), camo, 0, -0.26, 0, g);
    add(box(0.36, 0.16, 0.5), shoe, 0, -0.61, 0.05, g);
    add(box(0.2, 0.03, 0.2), lace, 0, -0.52, 0.13, g);
    add(box(0.39, 0.06, 0.52), sole, 0, -0.72, 0.05, g);
  });
  return { ...lp, armL, armR };
}

/* ---------- PINO: gnomo con gorro puntiagudo, túnica y botas ---------- */
export function buildGnome(rider, M) {
  const skin = M({ color: 0xe2a47e }), face = M({ map: TX.gnomeFace });
  const tunic = M({ map: TX.tunic }), hat = M({ map: TX.cloth, color: 0xb9cf82 }), belt = M({ color: 0x4e3020 });
  const gold = M({ color: 0xcaa24a }), goldIn = M({ color: 0x4e3020 });
  const pants = M({ map: TX.cloth, color: 0x6b7a38 }), boot = M({ map: TX.cloth, color: 0x6e4228 });

  // túnica: torso y faldón que se abre abajo
  add(box(0.84, 0.66, 0.56), tunic, 0, 0.05, 0, rider);
  add(new THREE.CylinderGeometry(0.46, 0.54, 0.34, 8), tunic, 0, -0.42, 0, rider);
  add(box(0.88, 0.1, 0.6), belt, 0, -0.22, 0, rider);
  add(box(0.19, 0.15, 0.03), gold, 0, -0.22, 0.31, rider);
  add(box(0.08, 0.06, 0.03), goldIn, 0, -0.22, 0.32, rider);
  add(new THREE.CylinderGeometry(0.14, 0.16, 0.14, 8), skin, 0, 0.44, 0, rider);
  // cabeza con nariz, orejas en punta y gorro alto
  add(new THREE.SphereGeometry(0.41, 10, 8), face, 0, 0.82, 0.02, rider).scale.set(1, 1.06, 0.95);
  const nz = add(new THREE.ConeGeometry(0.075, 0.22, 4), skin, 0.01, 0.8, 0.45, rider); nz.rotation.x = Math.PI / 2;
  [-1, 1].forEach((sx) => {
    const e = add(new THREE.ConeGeometry(0.1, 0.4, 4), skin, sx * 0.47, 0.9, -0.02, rider);
    e.rotation.z = -sx * (Math.PI / 2 - 0.35); e.scale.set(1, 1, 0.45);
  });
  add(new THREE.ConeGeometry(0.46, 1.15, 8), hat, 0, 1.575, 0, rider);
  // brazos: mangas y manos
  const o = { sw: 0.26, sl: 0.5, sd: 0.28, hw: 0.18, hh: 0.2, cuff: tunic };
  const armL = arm(rider, -0.56, 0.3, tunic, skin, o), armR = arm(rider, 0.56, 0.3, tunic, skin, o);
  // piernas: pantalón oliva y botas con borde
  const lp = legPair(rider, 0.17, (g) => {
    add(box(0.26, 0.42, 0.28), pants, 0, -0.2, 0, g);
    add(box(0.32, 0.28, 0.34), boot, 0, -0.54, 0, g);
    add(box(0.37, 0.08, 0.39), boot, 0, -0.42, 0, g);
    add(box(0.32, 0.13, 0.48), boot, 0, -0.685, 0.06, g);
  });
  return { ...lp, armL, armR };
}


/* ---------- HUESO: esqueleto con moño y galera ---------- */
export function buildSkeleton(rider, M) {
  const bone = M({ color: 0xece6d4 }), boneD = M({ color: 0xb8ae94 }), dark = M({ color: 0x1a1410 });
  const face = M({ map: TX.skullFace }), glow = M({ color: 0x6ff6ff, unlit: true }), bow = M({ color: 0xd8303a }), hat = M({ color: 0x1e1e26 }), band = M({ color: 0x8a2a8a });
  // columna, costillas y pelvis
  add(new THREE.CylinderGeometry(0.07, 0.08, 0.95, 6), boneD, 0, 0.02, -0.12, rider);
  for (let k = 0; k < 4; k++) {
    const r = add(new THREE.TorusGeometry(0.34 - k * 0.03, 0.045, 4, 12, Math.PI * 1.4), bone, 0, 0.36 - k * 0.15, -0.08, rider);
    r.rotation.set(Math.PI / 2, 0, -Math.PI * 0.2); r.scale.set(1.15, 0.85, 1);
  }
  add(box(0.08, 0.5, 0.06), bone, 0, 0.18, 0.22, rider);                                     // esternón
  add(box(0.86, 0.1, 0.12), bone, 0, 0.5, -0.05, rider);                                     // clavículas
  add(new THREE.CylinderGeometry(0.3, 0.2, 0.22, 8, 1, true), M({ color: 0xece6d4, side: THREE.DoubleSide }), 0, -0.42, 0, rider);
  // moño rojo
  [-1, 1].forEach((sx) => { const b = add(new THREE.ConeGeometry(0.1, 0.16, 4), bow, sx * 0.09, 0.55, 0.12, rider); b.rotation.z = sx * Math.PI / 2; });
  add(box(0.06, 0.06, 0.06), bow, 0, 0.55, 0.13, rider);
  // cráneo, mandíbula, ojos que brillan y galera
  add(new THREE.CylinderGeometry(0.07, 0.08, 0.2, 6), boneD, 0, 0.62, -0.02, rider);
  add(new THREE.SphereGeometry(0.4, 12, 9), face, 0, 0.98, 0.02, rider).scale.set(1, 1.02, 0.95);
  add(box(0.4, 0.1, 0.3), bone, 0, 0.66, 0.1, rider);
  [-0.13, 0.13].forEach((ex) => add(new THREE.SphereGeometry(0.045, 5, 4), glow, ex, 1.0, 0.37, rider));
  add(new THREE.CylinderGeometry(0.44, 0.44, 0.04, 12), hat, 0, 1.3, 0, rider);
  add(new THREE.CylinderGeometry(0.28, 0.3, 0.46, 12), hat, 0, 1.54, 0, rider);
  add(new THREE.CylinderGeometry(0.305, 0.305, 0.09, 12), band, 0, 1.36, 0, rider);
  // brazos de hueso (huesito, codo y mano con dedos)
  const boneArm = (x) => {
    const g = new THREE.Group(); g.position.set(x, 0.44, 0); rider.add(g);
    add(new THREE.CylinderGeometry(0.05, 0.045, 0.3, 5), bone, 0, -0.16, 0, g);
    add(new THREE.SphereGeometry(0.07, 5, 4), boneD, 0, -0.32, 0, g);
    add(new THREE.CylinderGeometry(0.04, 0.035, 0.28, 5), bone, 0, -0.48, 0, g);
    add(box(0.14, 0.1, 0.08), bone, 0, -0.66, 0.02, g);
    for (let k = 0; k < 3; k++) add(box(0.025, 0.1, 0.025), bone, -0.045 + k * 0.045, -0.75, 0.03, g);
    g.rotation.z = Math.sign(x) * 0.12;
    return g;
  };
  const armL = boneArm(-0.46), armR = boneArm(0.46);
  // piernas de hueso con rodilla y pie
  const lp = legPair(rider, 0.16, (g) => {
    add(new THREE.CylinderGeometry(0.06, 0.05, 0.34, 5), bone, 0, -0.17, 0, g);
    add(new THREE.SphereGeometry(0.08, 5, 4), boneD, 0, -0.36, 0, g);
    add(new THREE.CylinderGeometry(0.05, 0.045, 0.3, 5), bone, 0, -0.53, 0, g);
    add(box(0.16, 0.08, 0.32), bone, 0, -0.71, 0.07, g);
  });
  void dark;
  return { ...lp, armL, armR };
}

/* ---------- RANULFO: rana con piloto y gorro de lluvia amarillos ---------- */
export function buildFrog(rider, M) {
  const skin = M({ color: 0x5ac83a }), skinD = M({ color: 0x3a9a2a }), face = M({ map: TX.frogFace });
  const eyeW = M({ color: 0xfaf8e8 }), pupil = M({ color: 0x111111 }), shine = M({ color: 0xffffff, unlit: true });
  const coat = M({ map: TX.raincoat }), coatD = M({ color: 0xd8a820 }), boot = M({ color: 0xe8303a }), soleM = M({ color: 0x3a1a1a });
  // piloto amarillo (abierto abajo) con cuello y bolsillos
  add(box(0.9, 0.78, 0.62), coat, 0, 0.08, 0, rider);
  add(new THREE.CylinderGeometry(0.47, 0.56, 0.36, 8), coat, 0, -0.42, 0, rider);
  add(box(0.96, 0.12, 0.3), coatD, 0, 0.5, -0.1, rider);
  [-0.26, 0.26].forEach((px) => add(box(0.2, 0.14, 0.04), coatD, px, -0.12, 0.32, rider));
  // cabeza ancha y achatada, ojos grandes arriba y gorro de lluvia
  add(new THREE.SphereGeometry(0.46, 12, 9), face, 0, 0.84, 0.03, rider).scale.set(1.18, 0.82, 1);
  [-0.22, 0.22].forEach((ex) => {
    add(new THREE.SphereGeometry(0.16, 8, 6), skin, ex, 1.14, 0.12, rider);
    add(new THREE.SphereGeometry(0.13, 8, 6), eyeW, ex, 1.16, 0.2, rider);
    add(new THREE.SphereGeometry(0.065, 6, 4), pupil, ex + (ex > 0 ? 0.01 : -0.01), 1.16, 0.32, rider);
    add(new THREE.SphereGeometry(0.02, 4, 3), shine, ex + 0.03, 1.2, 0.34, rider);
  });
  const hat = new THREE.Group(); hat.position.set(0, 1.2, -0.12); hat.rotation.x = -0.25; rider.add(hat);
  add(new THREE.CylinderGeometry(0.3, 0.34, 0.22, 10), coat, 0, 0.1, 0, hat);
  add(new THREE.CylinderGeometry(0.55, 0.62, 0.05, 12), coatD, 0, 0, 0.05, hat);
  // brazos: manga amarilla y mano verde con dedos gorditos
  const o = { sw: 0.28, sl: 0.5, sd: 0.3, hw: 0.2, hh: 0.14, cuff: coatD };
  const armL = arm(rider, -0.58, 0.36, coat, skin, o), armR = arm(rider, 0.58, 0.36, coat, skin, o);
  [armL, armR].forEach((g) => { for (let k = 0; k < 3; k++) add(new THREE.SphereGeometry(0.045, 5, 4), skinD, -0.07 + k * 0.07, -0.66, 0.07, g); });
  // piernas verdes y botas de lluvia rojas
  const lp = legPair(rider, 0.2, (g) => {
    add(box(0.26, 0.36, 0.28), skin, 0, -0.17, 0, g);
    add(box(0.32, 0.34, 0.36), boot, 0, -0.52, 0.02, g);
    add(box(0.34, 0.07, 0.46), soleM, 0, -0.715, 0.06, g);
  });
  return { ...lp, armL, armR };
}

/* ---------- TRISTÁN: payaso triste de circo, con galerita, gorguera y saco remendado ---------- */
export function buildSadClown(rider, M) {
  const skin = M({ color: 0xf4f2ee }), face = M({ map: TX.sadFace }), nose = M({ color: 0xd8303a });
  const jacket = M({ map: TX.patched }), shirt = M({ map: TX.sadShirt }), ruff = M({ color: 0xf8f8ff }), pants = M({ map: TX.cloth, color: 0x3a3a4a });
  const shoe = M({ color: 0xd8303a }), hat = M({ color: 0x2a2a2e }), flower = M({ color: 0xffe14a }), hair = M({ color: 0x5a6aa8 });
  // remera rayada y saco remendado abierto adelante
  add(box(0.84, 0.76, 0.6), shirt, 0, 0.08, 0, rider);
  [-1, 1].forEach((sx) => add(box(0.3, 0.8, 0.64), jacket, sx * 0.3, 0.06, 0, rider));
  add(box(0.9, 0.3, 0.64), jacket, 0, -0.38, 0, rider);
  [-0.2, 0.2].forEach((px) => add(box(0.05, 0.7, 0.03), M({ color: 0xd8303a }), px, 0.1, 0.31, rider));   // tiradores
  // gorguera (cuello de volados)
  for (let k = 0; k < 10; k++) { const a = (k / 10) * Math.PI * 2; add(new THREE.SphereGeometry(0.13, 6, 4), ruff, Math.sin(a) * 0.28, 0.56, Math.cos(a) * 0.24, rider).scale.set(1, 0.55, 1); }
  // cabeza blanca, nariz roja, pelo azul a los costados y galerita chiquita torcida con flor
  add(new THREE.SphereGeometry(0.4, 12, 9), face, 0, 0.92, 0.02, rider).scale.set(1, 1.08, 0.95);
  add(new THREE.SphereGeometry(0.08, 6, 4), nose, 0, 0.9, 0.4, rider);
  [-1, 1].forEach((sx) => { for (let k = 0; k < 3; k++) add(new THREE.SphereGeometry(0.12, 6, 4), hair, sx * 0.4, 0.95 + k * 0.08 - 0.08, -0.05 - k * 0.05, rider); });
  const h = new THREE.Group(); h.position.set(0.1, 1.33, 0); h.rotation.z = -0.25; rider.add(h);
  add(new THREE.CylinderGeometry(0.28, 0.28, 0.03, 10), hat, 0, 0, 0, h);
  add(new THREE.SphereGeometry(0.18, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2), hat, 0, 0, 0, h).scale.y = 1.3;
  add(new THREE.CylinderGeometry(0.01, 0.01, 0.3, 3), M({ color: 0x3a8a3a }), 0.16, 0.18, 0, h);
  add(new THREE.SphereGeometry(0.06, 5, 4), flower, 0.16, 0.34, 0, h);
  // brazos: mangas del saco y guantes blancos
  const o = { sw: 0.26, sl: 0.54, sd: 0.3, hw: 0.2, hh: 0.2, cuff: ruff };
  const armL = arm(rider, -0.57, 0.36, jacket, ruff, o), armR = arm(rider, 0.57, 0.36, jacket, ruff, o);
  // pantalón ancho y zapatones rojos enormes
  const lp = legPair(rider, 0.2, (g) => {
    add(box(0.34, 0.5, 0.36), pants, 0, -0.24, 0, g);
    add(box(0.32, 0.18, 0.66), shoe, 0, -0.63, 0.14, g);
    add(new THREE.SphereGeometry(0.18, 6, 4), shoe, 0, -0.62, 0.44, g).scale.set(1, 0.7, 1);
  });
  void skin;
  return { ...lp, armL, armR };
}

/* ---------- TORNADO: luchador de feria con máscara, capa y cinturón de campeón ---------- */
export function buildWrestler(rider, M) {
  const skin = M({ color: 0xe8b890 }), skinD = M({ color: 0xc8906a }), mask = M({ map: TX.luchaMask });
  const cape = M({ color: 0xb030d0, side: THREE.DoubleSide }), capeIn = M({ color: 0xffd24a }), gold = M({ color: 0xffd24a, emissive: 0x2a1a00 });
  const beltM = M({ color: 0x2a1a3a }), tights = M({ map: TX.tights }), boot = M({ color: 0xb030d0 }), bootW = M({ color: 0xffffff });
  // torso musculoso: pecho, panza y hombros grandes
  add(box(0.98, 0.72, 0.6), skin, 0, 0.12, 0, rider);
  [-0.22, 0.22].forEach((px) => add(box(0.4, 0.26, 0.08), skinD, px, 0.28, 0.29, rider));               // pectorales
  for (let k = 0; k < 3; k++) [-0.1, 0.1].forEach((px) => add(box(0.16, 0.1, 0.05), skinD, px, 0.02 - k * 0.12, 0.3, rider));   // abdominales
  [-1, 1].forEach((sx) => add(new THREE.SphereGeometry(0.24, 8, 6), skin, sx * 0.56, 0.4, 0, rider));
  // cinturón de campeón
  add(box(1.0, 0.2, 0.64), beltM, 0, -0.34, 0, rider);
  add(box(0.36, 0.26, 0.05), gold, 0, -0.34, 0.33, rider);
  add(new THREE.CylinderGeometry(0.08, 0.08, 0.03, 8), M({ color: 0xd8303a, unlit: true }), 0, -0.34, 0.36, rider).rotation.x = Math.PI / 2;
  // capa (atrás) con el forro dorado
  add(box(1.0, 1.1, 0.04), cape, 0, -0.02, -0.34, rider).rotation.x = 0.12;
  add(box(0.96, 1.06, 0.02), capeIn, 0, -0.02, -0.31, rider).rotation.x = 0.12;
  add(box(1.1, 0.12, 0.3), cape, 0, 0.5, -0.2, rider);
  // cabeza con máscara y cuello grueso
  add(new THREE.CylinderGeometry(0.2, 0.24, 0.16, 8), skin, 0, 0.54, 0, rider);
  add(new THREE.SphereGeometry(0.4, 12, 9), mask, 0, 0.9, 0.02, rider).scale.set(1, 1.08, 0.95);
  // brazos: sin mangas, con muñequeras
  const o = { sw: 0.28, sl: 0.54, sd: 0.3, hw: 0.24, hh: 0.22, cuff: gold };
  const armL = arm(rider, -0.64, 0.36, skin, skin, o), armR = arm(rider, 0.64, 0.36, skin, skin, o);
  // piernas: calzas con franja dorada y botas altas con cordones blancos
  const lp = legPair(rider, 0.22, (g) => {
    add(box(0.32, 0.36, 0.34), tights, 0, -0.17, 0, g);
    add(box(0.34, 0.36, 0.38), boot, 0, -0.52, 0.01, g);
    for (let k = 0; k < 3; k++) add(box(0.2, 0.025, 0.02), bootW, 0, -0.42 - k * 0.08, 0.2, g);
    add(box(0.36, 0.06, 0.48), bootW, 0, -0.71, 0.06, g);
  });
  return { ...lp, armL, armR };
}

export const PEOPLE = { clown: buildClown, gnome: buildGnome, skeleton: buildSkeleton, frog: buildFrog, sadclown: buildSadClown, wrestler: buildWrestler };
