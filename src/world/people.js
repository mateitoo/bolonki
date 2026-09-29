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

export const PEOPLE = { clown: buildClown, gnome: buildGnome };
