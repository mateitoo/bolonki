// Decorado de HEXÁGONOS: los pisos flotan en un cielo celeste con nubes, globos y un arcoíris; abajo de todo, el slime.
import * as THREE from 'three';
import { add, mat, scaleUV } from '../render/psx.js';
import { TX } from '../render/textures.js';
import { rnd } from '../config.js';
import * as P from './props.js';

const grp = (p, x = 0, y = 0, z = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); p.add(g); return g; };

function cloud(p, x, y, z, s) {
  const g = grp(p, x, y, z); g.scale.setScalar(s);
  const m = P.M(0xffffff), sh = P.M(0xdfe8f8);
  [[0, 0, 0, 2.2], [1.9, -0.3, 0.3, 1.6], [-1.8, -0.4, -0.2, 1.7], [0.7, 0.9, -0.3, 1.5], [-0.8, 0.7, 0.4, 1.3], [3.2, -0.6, 0, 1.1], [-3.1, -0.7, 0.2, 1.0]]
    .forEach(([a, b, c, r], k) => add(new THREE.DodecahedronGeometry(r, 1), k % 3 === 2 ? sh : m, a, b, c, g));
  return g;
}
function hexPillar(p, x, y, z, h, col) {
  const g = grp(p, x, y, z);
  add(new THREE.CylinderGeometry(1.6, 1.3, h, 6), P.M(col, { map: TX.hexSide }), 0, -h / 2, 0, g);
  add(new THREE.CylinderGeometry(1.35, 1.35, 0.1, 6), P.M(col, { map: TX.hexTop }), 0, 0.05, 0, g);
  const ph = rnd(0, 6);
  P.anim(g, (t) => { g.position.y = y + Math.sin(t * 0.5 + ph) * 0.6; g.rotation.y = t * 0.05 + ph; });
  return g;
}

export function decorHexagonos(g, slimeY) {
  P.sky(g, [[0, '#2a6ae0'], [0.35, '#5aa8ff'], [0.48, '#bfe6ff'], [0.52, '#e8f6ff'], [0.62, '#9ad8a0'], [1, '#2a6a20']], { r: 120, y: -10 });
  // slime abajo de todo
  const sg = scaleUV(new THREE.PlaneGeometry(240, 240, 20, 20), 36); sg.rotateX(-Math.PI / 2);
  const slimeM = mat({ map: TX.slime, color: 0xffffff });
  add(sg, slimeM, 0, slimeY, 0, g);
  P.drift(g, 24, -18, 18, slimeY, slimeY + 3, -18, 18, 0xc8ff6a, 0.35, 0.8);      // burbujas que suben
  // nubes alrededor (algunas abajo, entre los pisos y el slime)
  for (let k = 0; k < 16; k++) {
    const a = (k / 16) * Math.PI * 2 + rnd(-0.15, 0.15), d = rnd(24, 48), y = k % 3 === 0 ? rnd(-20, -12) : rnd(-6, 8);
    const c = cloud(g, Math.sin(a) * d, y, Math.cos(a) * d, rnd(1.2, 2.4));
    const sp = rnd(0.01, 0.025), a0 = a;
    P.anim(c, (t) => { const aa = a0 + t * sp; c.position.x = Math.sin(aa) * d; c.position.z = Math.cos(aa) * d; });
  }
  // columnas hexagonales flotando de adorno
  [[-19, -3, -12, 8, 0xb07aff], [20, -5, -10, 10, 0x39d98a], [-22, -9, 10, 6, 0xffc83a], [21, -12, 12, 9, 0xff6fae], [0, -8, -26, 12, 0x4ad8ff], [-8, -16, 22, 7, 0xff9a1f]]
    .forEach(([x, y, z, h, c]) => hexPillar(g, x, y, z, h, c));
  // arcoíris de fondo
  const cols = [0xff4a4a, 0xff9a1f, 0xffe14a, 0x39d98a, 0x4a8cff, 0xb07aff];
  cols.forEach((c, k) => { const t = new THREE.TorusGeometry(38 - k * 1.3, 0.65, 4, 28, Math.PI); add(t, P.M(c, { unlit: true }), 0, -12, -70, g); });
  P.balloons(g, -16, 2, -18, 5, 6); P.balloons(g, 18, 0, 14, 5, 5);
  return slimeM;
}
