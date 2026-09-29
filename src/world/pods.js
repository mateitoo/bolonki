// Naves y pilotos (personajes originales).
import * as THREE from 'three';
import { CHARS, SIDES } from '../config.js';
import { scene, mat, add, faceIn } from '../render/psx.js';
import { TX } from '../render/textures.js';

export function buildPod(i) {
  const s = SIDES[i];
  const root = new THREE.Group(); scene.add(root);
  const veh = new THREE.Group(); root.add(veh);       // la nave
  const rider = new THREE.Group(); root.add(rider);   // el piloto
  const vehMats = [];
  const M = (o) => { const m = mat(o); vehMats.push({ m, base: m.uniforms.uColor.value.clone() }); return m; };

  // nave: autito chocador redondo — casco tipo bowl, paragolpes grueso con luces al frente,
  // colmillos, aleta atrás (para ver para dónde mira) y un anillo de luz abajo (flota)
  const hullM = M({ map: TX.hull, color: 0x49b8a0 });
  const bowl = new THREE.SphereGeometry(1.0, 14, 9, 0, Math.PI * 2, Math.PI * 0.36, Math.PI * 0.64);
  add(bowl, hullM, 0, 1.12, 0, veh).scale.set(1.3, 1.12, 1.16);
  const lip = new THREE.TorusGeometry(0.93, 0.1, 4, 14); lip.rotateX(Math.PI / 2);
  add(lip, M({ color: 0x7fd6c4 }), 0, 1.58, 0, veh).scale.set(1.3, 1, 1.16);        // borde redondeado de la cabina
  add(new THREE.CylinderGeometry(0.9, 0.9, 0.08, 14), M({ color: 0x1d4f47 }), 0, 1.52, 0, veh).scale.set(1.3, 1, 1.16);
  const bump = new THREE.TorusGeometry(1.0, 0.24, 7, 16); bump.rotateX(Math.PI / 2);
  const bumpM = M({ color: 0xffffff });                                             // color del personaje (dressPod)
  add(bump, bumpM, 0, 0.6, 0, veh).scale.set(1.36, 1.35, 1.18);
  const lightM = M({ color: 0xffd23a, unlit: true });
  for (let k = 0; k < 7; k++) {
    const a = (-0.5 + k / 6) * Math.PI * 0.8;
    add(new THREE.BoxGeometry(0.2, 0.16, 0.1), lightM, Math.sin(a) * 1.66, 0.62, Math.cos(a) * 1.44, veh).rotation.y = a;
  }
  const prongG = new THREE.ConeGeometry(0.12, 0.6, 4); prongG.rotateX(Math.PI / 2);
  [-0.9, 0.9].forEach((px) => add(prongG, M({ color: 0xf2f2e8 }), px, 0.64, 1.5, veh));
  add(new THREE.BoxGeometry(0.14, 0.62, 0.42), M({ color: 0x2a6e62 }), 0, 1.75, -1.02, veh).rotation.x = -0.35;
  add(new THREE.SphereGeometry(0.13, 6, 4), M({ color: 0xff3a2a, unlit: true }), 0, 2.1, -1.18, veh);
  const glow = new THREE.TorusGeometry(0.75, 0.08, 4, 14); glow.rotateX(Math.PI / 2);
  add(glow, M({ color: 0x35f0ff, unlit: true }), 0, 0.1, 0, veh);

  const sh = new THREE.Mesh(new THREE.CircleGeometry(1, 10), new THREE.MeshBasicMaterial({ color: 0, transparent: true, opacity: 0.35, depthWrite: false }));
  sh.geometry.rotateX(-Math.PI / 2); sh.scale.set(1.95, 1, 1.6); scene.add(sh);
  const scorch = new THREE.Mesh(new THREE.CircleGeometry(1.8, 8), new THREE.MeshBasicMaterial({ color: 0x0a0806, transparent: true, opacity: 0.7, depthWrite: false }));
  scorch.geometry.rotateX(-Math.PI / 2); scorch.visible = false; scene.add(scorch);

  root.rotation.y = faceIn(s.nx, s.nz);
  const mesh = {
    root, veh, rider, mats: [], vehMats, bumpM, hullM, lightM, sh, scorch, legs: null, legL: null, legR: null, ci: -1,
    baseRot: root.rotation.y,
    riderBase: new THREE.Vector3(0, 2.05, -0.1),
  };
  dressPod(mesh, i);
  return mesh;
}

// Viste la nave con un personaje: rehace el piloto (cuerpo, ojos, accesorio, piernas) y pinta el paragolpes
export function dressPod(mesh, ci) {
  if (mesh.ci === ci) return;
  mesh.ci = ci;
  const ch = CHARS[ci], col = new THREE.Color(ch.col), rider = mesh.rider;
  for (const c of [...rider.children]) {
    rider.remove(c);
    c.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
  }
  const riderMats = [];
  const M = (o) => { const m = mat(o); riderMats.push({ m, base: m.uniforms.uColor.value.clone() }); return m; };
  const bumpCol = new THREE.Color(ch.col).multiplyScalar(0.7);
  mesh.bumpM.uniforms.uColor.value.copy(bumpCol);
  const vb = mesh.vehMats.find((o) => o.m === mesh.bumpM); if (vb) vb.base.copy(bumpCol);

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

  // piernas (solo se ven en los minijuegos a pie, sin nave)
  const wasLegs = mesh.legs ? mesh.legs.visible : false;
  const legs = new THREE.Group(); legs.visible = wasLegs; rider.add(legs);
  const legM = M({ color: new THREE.Color(ch.dark) }), shoeM = M({ color: 0x2a2a34 });
  const legL = new THREE.Group(), legR = new THREE.Group();
  [[legL, -0.3], [legR, 0.3]].forEach(([g, lx]) => {
    g.position.set(lx, -0.6, 0); legs.add(g);
    add(new THREE.BoxGeometry(0.2, 0.42, 0.2), legM, 0, -0.2, 0, g);
    add(new THREE.BoxGeometry(0.3, 0.14, 0.42), shoeM, 0, -0.44, 0.08, g);
  });
  Object.assign(mesh, { legs, legL, legR, mats: mesh.vehMats.concat(riderMats) });
}

export function resetPodVisual(p) {
  const m = p.mesh;
  m.root.visible = true; m.root.position.y = 0; m.root.rotation.set(0, m.baseRot, 0);
  m.veh.visible = true; m.veh.position.set(0, 0, 0); m.veh.rotation.set(0, 0, 0); m.veh.scale.set(1, 1, 1);
  m.rider.visible = true; m.rider.position.copy(m.riderBase); m.rider.rotation.set(0, 0, 0); m.rider.scale.set(1, 1, 1);
  m.legs.visible = false; m.legL.rotation.set(0, 0, 0); m.legR.rotation.set(0, 0, 0);
  m.mats.forEach((o) => { o.m.uniforms.uColor.value.copy(o.base); o.m.uniforms.uEmissive.value.setRGB(0, 0, 0); });
  m.scorch.visible = false;
}

// Brillo en todo el personaje (parpadeos, electrocución…)
export function setEmissive(p, r, g, b) { p.mesh.mats.forEach((o) => o.m.uniforms.uEmissive.value.setRGB(r, g, b)); }
// Oscurece todo (chamuscado)
export function charTint(p, k) { p.mesh.mats.forEach((o) => o.m.uniforms.uColor.value.copy(o.base).multiplyScalar(k)); }

const tmp = new THREE.Vector3();
export function riderWorld(p) { return p.mesh.rider.getWorldPosition(tmp); }
