// Pelotas cromadas y su sombra.
import * as THREE from 'three';
import { BR } from '../config.js';
import { scene, mat } from '../render/psx.js';
import { TX } from '../render/textures.js';
import { game } from '../state.js';

export function buildBalls(n = 7) {
  for (let k = 0; k < n; k++) {
    const m = mat({ map: TX.chrome });
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(BR, 8, 6), m); mesh.visible = false; scene.add(mesh);
    const sh = new THREE.Mesh(new THREE.CircleGeometry(BR * 1.05, 8), new THREE.MeshBasicMaterial({ color: 0, transparent: true, opacity: 0.4, depthWrite: false }));
    sh.geometry.rotateX(-Math.PI / 2); sh.visible = false; scene.add(sh);
    game.balls.push({ on: false, x: 0, z: 0, vx: 0, vz: 0, power: 0, fresh: false, trailT: 0, mesh, sh, m });
  }
}

export function removeBall(b) { b.on = false; b.mesh.visible = false; b.sh.visible = false; }
