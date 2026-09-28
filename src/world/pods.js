// Naves y pilotos (personajes originales).
import * as THREE from 'three';
import { CHARS, SIDES } from '../config.js';
import { scene, mat, add, faceIn } from '../render/psx.js';
import { TX } from '../render/textures.js';

export function buildPod(i) {
  const ch = CHARS[i], col = new THREE.Color(ch.col), s = SIDES[i];
  const root = new THREE.Group(); scene.add(root);
  const veh = new THREE.Group(); root.add(veh);       // la nave
  const rider = new THREE.Group(); root.add(rider);   // el piloto
  const mats = [];
  const M = (o) => { const m = mat(o); mats.push({ m, base: m.uniforms.uColor.value.clone() }); return m; };

  // nave: casco ovalado, cubierta, luces amarillas al frente y colmillos
  const hullM = M({ map: TX.hull, color: 0x49b8a0 });
  add(new THREE.CylinderGeometry(1.0, 1.15, 0.8, 12), hullM, 0, 0.45, 0, veh).scale.set(1.8, 1, 0.95);
  add(new THREE.CylinderGeometry(0.85, 1.0, 0.28, 12), M({ color: 0x2a6e62 }), 0, 0.95, -0.15, veh).scale.set(1.6, 1, 0.8);
  const lightM = M({ color: 0xffd23a, unlit: true });
  for (let k = 0; k < 9; k++) {
    const a = (-0.5 + k / 8) * Math.PI * 0.85;
    add(new THREE.BoxGeometry(0.22, 0.16, 0.12), lightM, Math.sin(a) * 2.08, 0.35, Math.cos(a) * 1.1, veh).rotation.y = a;
  }
  const prongG = new THREE.ConeGeometry(0.12, 0.75, 4); prongG.rotateX(Math.PI / 2);
  [-1.45, 1.45].forEach((px) => add(prongG, M({ color: 0xf2f2e8 }), px, 0.62, 0.95, veh));

  // piloto
  add(new THREE.SphereGeometry(0.78, 8, 6), M({ color: col }), 0, 0, 0, rider).scale.set(1, 0.95, 0.9);
  const white = M({ color: 0xffffff }), black = M({ color: 0x101010, unlit: true }), dark = M({ color: new THREE.Color(ch.dark) });
  [-0.27, 0.27].forEach((ex) => {
    add(new THREE.BoxGeometry(0.25, 0.32, 0.1), white, ex, 0.15, 0.66, rider);
    add(new THREE.BoxGeometry(0.12, 0.15, 0.06), black, ex, 0.13, 0.72, rider);
  });
  [-0.8, 0.8].forEach((ax) => { add(new THREE.BoxGeometry(0.22, 0.5, 0.22), M({ color: col }), ax, -0.35, 0.35, rider).rotation.z = ax * 0.4; });
  if (ch.acc === 'beak') {
    const b = new THREE.ConeGeometry(0.2, 0.55, 4); b.rotateX(Math.PI / 2);
    add(b, M({ color: 0xff7a00 }), 0, -0.12, 0.85, rider);
    add(new THREE.ConeGeometry(0.14, 0.45, 4), dark, 0, 0.9, 0, rider);
  } else if (ch.acc === 'antenna') {
    [-0.3, 0.3].forEach((ax) => {
      add(new THREE.CylinderGeometry(0.04, 0.04, 0.6, 4), dark, ax, 0.95, 0, rider).rotation.z = -ax * 0.8;
      add(new THREE.SphereGeometry(0.12, 6, 4), M({ color: 0xfff27a, unlit: true }), ax * 1.6, 1.25, 0, rider);
    });
  } else if (ch.acc === 'ears') {
    [-0.28, 0.28].forEach((ax) => {
      add(new THREE.BoxGeometry(0.2, 0.85, 0.1), M({ color: col }), ax, 1.0, -0.05, rider).rotation.z = -ax * 0.5;
      add(new THREE.BoxGeometry(0.1, 0.6, 0.04), dark, ax * 1.03, 1.0, 0.01, rider).rotation.z = -ax * 0.5;
    });
  } else {
    [-0.44, 0.44].forEach((ax) => { add(new THREE.ConeGeometry(0.14, 0.5, 4), M({ color: 0xf0e6c8 }), ax, 0.75, 0, rider).rotation.z = -ax * 1.1; });
    add(new THREE.BoxGeometry(0.7, 0.08, 0.08), black, 0, 0.4, 0.66, rider).rotation.z = 0.12;
  }

  const sh = new THREE.Mesh(new THREE.CircleGeometry(1, 10), new THREE.MeshBasicMaterial({ color: 0, transparent: true, opacity: 0.35, depthWrite: false }));
  sh.geometry.rotateX(-Math.PI / 2); sh.scale.set(2.2, 1, 1.25); scene.add(sh);
  const scorch = new THREE.Mesh(new THREE.CircleGeometry(1.8, 8), new THREE.MeshBasicMaterial({ color: 0x0a0806, transparent: true, opacity: 0.7, depthWrite: false }));
  scorch.geometry.rotateX(-Math.PI / 2); scorch.visible = false; scene.add(scorch);

  root.rotation.y = faceIn(s.nx, s.nz);
  return {
    root, veh, rider, mats, hullM, lightM, sh, scorch,
    baseRot: root.rotation.y,
    riderBase: new THREE.Vector3(0, 1.7, -0.25),
  };
}

export function resetPodVisual(p) {
  const m = p.mesh;
  m.root.visible = true; m.root.position.y = 0; m.root.rotation.set(0, m.baseRot, 0);
  m.veh.visible = true; m.veh.position.set(0, 0, 0); m.veh.rotation.set(0, 0, 0); m.veh.scale.set(1, 1, 1);
  m.rider.visible = true; m.rider.position.copy(m.riderBase); m.rider.rotation.set(0, 0, 0); m.rider.scale.set(1, 1, 1);
  m.mats.forEach((o) => { o.m.uniforms.uColor.value.copy(o.base); o.m.uniforms.uEmissive.value.setRGB(0, 0, 0); });
  m.scorch.visible = false;
}

// Brillo en todo el personaje (parpadeos, electrocución…)
export function setEmissive(p, r, g, b) { p.mesh.mats.forEach((o) => o.m.uniforms.uEmissive.value.setRGB(r, g, b)); }
// Oscurece todo (chamuscado)
export function charTint(p, k) { p.mesh.mats.forEach((o) => o.m.uniforms.uColor.value.copy(o.base).multiplyScalar(k)); }

const tmp = new THREE.Vector3();
export function riderWorld(p) { return p.mesh.rider.getWorldPosition(tmp); }
