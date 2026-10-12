// Arena: piso, bordes, arcos, láseres, chevrones y torres de esquina.
import * as THREE from 'three';
import { H, R, G, SIDES, CORN } from '../config.js';
import { scene, mat, scaleUV, add, rotT } from '../render/psx.js';
import { TX } from '../render/textures.js';
import { roundBox, bellyCylinder, organic } from '../render/shapes.js';
import { world } from '../state.js';

// Todo lo de esta arena queda en un grupo para poder mostrarla u ocultarla según el minijuego
export const arenaGroup = new THREE.Group();
// materiales que cambian según el mapa de Bola Brava (ver minigames/bolas.js)
export const arenaMats = {};

export function buildArena() {
  const before = new Set(scene.children);
  // piso y suelo exterior
  const fg = scaleUV(new THREE.PlaneGeometry(2 * H, 2 * H, 12, 12), 2); fg.rotateX(-Math.PI / 2);
  arenaMats.floor = mat({ map: TX.floor, color: 0xe8eef0 });
  add(fg, arenaMats.floor);
  const og = scaleUV(new THREE.PlaneGeometry(110, 110, 18, 18), 34); og.rotateX(-Math.PI / 2);
  arenaMats.outerMesh = add(og, mat({ map: TX.outer }), 0, -2.2, 0);
  arenaMats.strip = mat({ map: TX.lights, unlit: true });
  arenaMats.rim = mat({ map: TX.rim });
  arenaMats.tower = mat({ map: TX.tower });
  arenaMats.towerRing = mat({ color: 0x35f0ff, unlit: true });
  arenaMats.cap = mat({ map: TX.bronze });
  arenaMats.capRim = mat({ map: TX.bronze, color: 0xb0b0b0 });

  // por lado: tira de luces, foso, pared exterior, láser de gol y barrera de eliminado
  SIDES.forEach((s) => {
    const rt = rotT(s);
    const strip = scaleUV(new THREE.PlaneGeometry(2 * G, 0.7), 22, 1); strip.rotateX(-Math.PI / 2);
    arenaMats.strips = arenaMats.strips || [];
    arenaMats.strips.push(strip);
    add(strip, arenaMats.strip, s.nx * (H + 0.35), 0.02, s.nz * (H + 0.35)).rotation.y = rt;
    const pit = new THREE.PlaneGeometry(2 * G, 3.2); pit.rotateX(-Math.PI / 2);
    arenaMats.pit = arenaMats.pit || mat({ map: TX.pit });
    const pm = add(pit, arenaMats.pit, s.nx * (H + 2.3), -1.2, s.nz * (H + 2.3)); pm.rotation.y = rt;
    (arenaMats.pitMeshes = arenaMats.pitMeshes || []).push(pm);
    const wall = scaleUV(organic(roundBox(2 * G + 2, 1.4, 0.6, 0.2, 3), 0.05, 0.9, s.nx * 3 + s.nz), 8, 1);
    add(wall, arenaMats.rim, s.nx * (H + 4.1), -0.5, s.nz * (H + 4.1)).rotation.y = rt;

    const lg = new THREE.CylinderGeometry(0.1, 0.1, 2 * G, 6); lg.rotateZ(Math.PI / 2);
    const laser = add(lg, mat({ color: 0xff2030, unlit: true }), s.nx * (H + 0.1), 0.55, s.nz * (H + 0.1));
    laser.rotation.y = rt; laser.visible = false;
    world.goalLasers.push({ m: laser, t: 0 });

    const bar = new THREE.Group();
    bar.position.set(s.nx * (H - 0.05), -3, s.nz * (H - 0.05)); bar.rotation.y = rt; scene.add(bar);
    const bg = scaleUV(new THREE.CylinderGeometry(0.22, 0.22, 2 * G, 8), 1, 10); bg.rotateZ(Math.PI / 2);
    const bm = mat({ map: TX.stripes, unlit: true }); add(bg, bm, 0, 0, 0, bar);
    const glow = new THREE.CylinderGeometry(0.34, 0.34, 2 * G, 8); glow.rotateZ(Math.PI / 2);
    add(glow, new THREE.MeshBasicMaterial({ color: 0xff2030, transparent: true, opacity: 0.25, depthWrite: false }), 0, 0, 0, bar);
    world.barriers.push({ g: bar, y: -3, m: bm });
  });

  // chevrones: marcan la diagonal de disparo de cada torre y se encienden antes de disparar
  const cs = new THREE.Shape();
  cs.moveTo(-0.85, 0); cs.lineTo(0, 0.75); cs.lineTo(0.85, 0); cs.lineTo(0.85, -0.4); cs.lineTo(0, 0.33); cs.lineTo(-0.85, -0.4); cs.closePath();
  const cg = new THREE.ShapeGeometry(cs); cg.rotateX(-Math.PI / 2);
  CORN.forEach((c) => {
    const m = mat({ color: 0x16191e, unlit: true });
    const l = Math.hypot(c[0], c[1]), ux = -c[0] / l, uz = -c[1] / l;
    for (let k = 0; k < 3; k++) {
      const f = 0.52 - k * 0.075;
      add(cg, m, c[0] * f, 0.025, c[1] * f).rotation.y = Math.atan2(-ux, -uz);
    }
    world.chevSets.push({ m, warn: 0 });
  });

  // torres de esquina con boca de lanzamiento
  CORN.forEach((c) => {
    const g = new THREE.Group(); g.position.set(c[0], 0, c[1]); scene.add(g);
    // torre con panza (no un tubo perfecto), zócalo redondeado, cúpula alta con un remate y un borde como un aro de goma
    add(scaleUV(organic(bellyCylinder(R * 0.97, R + 0.2, 2.4, 20, 6, 0.07), 0.04, 1.1, c[0] + c[1]), 3, 1), arenaMats.tower, 0, 1.0, 0, g);
    const base = new THREE.TorusGeometry(R + 0.32, 0.2, 6, 24); base.rotateX(Math.PI / 2);
    add(base, arenaMats.towerRing, 0, 0.1, 0, g);
    const cap = new THREE.SphereGeometry(R * 0.98, 20, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    add(cap, arenaMats.cap, 0, 2.2, 0, g).scale.y = 0.62;
    const rim = new THREE.TorusGeometry(R + 0.04, 0.16, 6, 24); rim.rotateX(Math.PI / 2);
    add(rim, arenaMats.capRim, 0, 2.24, 0, g);
    add(new THREE.CylinderGeometry(0.1, 0.16, 0.35, 8), arenaMats.capRim, 0, 2.2 + R * 0.6, 0, g);
    add(new THREE.SphereGeometry(0.17, 8, 6), arenaMats.towerRing, 0, 2.42 + R * 0.6, 0, g);
    const l = Math.hypot(c[0], c[1]);
    const mouth = new THREE.Group(); mouth.rotation.y = Math.atan2(-c[0] / l, -c[1] / l); g.add(mouth);
    const holeM = mat({ color: 0x05070a, unlit: true });
    // boca en arco (redondeada arriba), con un marco que sobresale
    const mo = new THREE.Shape(); mo.moveTo(-0.8, -0.7); mo.lineTo(0.8, -0.7); mo.lineTo(0.8, 0.1); mo.absarc(0, 0.1, 0.8, 0, Math.PI, false); mo.lineTo(-0.8, -0.7);
    add(new THREE.ShapeGeometry(mo, 8), holeM, 0, 0.75, R + 0.12, mouth);
    const fr = new THREE.Shape(); fr.moveTo(-1.05, -0.75); fr.lineTo(1.05, -0.75); fr.lineTo(1.05, 0.1); fr.absarc(0, 0.1, 1.05, 0, Math.PI, false); fr.lineTo(-1.05, -0.75);
    fr.holes.push(mo);
    add(new THREE.ExtrudeGeometry(fr, { depth: 0.18, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 1, curveSegments: 8 }), mat({ color: 0x8a6a3c }), 0, 0.75, R + 0.02, mouth);
    world.towers.push({ holeM, flash: 0 });
  });

  scene.children.filter((c) => !before.has(c)).forEach((c) => arenaGroup.add(c));
  scene.add(arenaGroup);
}
