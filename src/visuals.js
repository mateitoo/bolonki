// Todo lo visual que se actualiza por frame: pods, pelotas, efectos de arena, animaciones de derrota y cámara.
import * as THREE from 'three';
import { BR, rnd } from './config.js';
import { game, world } from './state.js';
import { camera } from './render/psx.js';
import { updateParticles } from './fx/particles.js';

const CAM = new THREE.Vector3(0, 24, 26), LOOK = new THREE.Vector3(0, 0, -1.6);
const camPos = new THREE.Vector3(), camLook = new THREE.Vector3();
const orbitPos = new THREE.Vector3(), ORBIT_LOOK = new THREE.Vector3(0, 0, 0);
const camBase = new THREE.Vector3(), lookBase = new THREE.Vector3(), tmpOff = new THREE.Vector3();
const FOCUS_OFF = new THREE.Vector3(0, 0, 10);
let orbit = 1, orbitA = 0;

export function updateVisuals(dt, rdt) {
  game.clock += dt;
  const clock = game.clock;

  for (const p of game.players) {
    const m = p.mesh;
    if (p.flash > 0) p.flash -= dt;
    if (p.death) {
      const d = p.death;
      if (!d.done) {
        d.t += dt; d.anim.update(p, d.st, d.t, dt);
        if (d.t >= d.anim.dur) { d.done = true; m.root.visible = false; if (p.i === game.me) game.camFocusTarget = 0; }
      }
      m.sh.visible = false;
      continue;
    }
    if (p.empty) { m.root.visible = false; m.sh.visible = false; continue; }
    if (p.spin > 0) p.spin = Math.max(0, p.spin - dt * 4.5);
    m.root.position.set(p.x, Math.sin(clock * 6 + p.i) * 0.05, p.z);
    m.root.rotation.y = m.baseRot + (p.spin > 0 ? (1 - p.spin) * Math.PI * 2 : 0);
    m.veh.rotation.z = -p.v * 0.012;
    m.rider.rotation.z = -p.v * 0.02;
    const e = p.swing > 0 ? 0.8 : 0; m.hullM.uniforms.uEmissive.value.setRGB(e, e, e);
    m.sh.position.set(p.x, 0.03, p.z); m.sh.rotation.y = m.baseRot; m.sh.visible = true;
  }

  for (const b of game.balls) {
    if (!b.on) continue;
    b.mesh.position.set(b.x, BR, b.z); b.sh.position.set(b.x + 0.12, 0.035, b.z + 0.12);
    const e = b.power > 0 ? 0.55 + 0.45 * Math.sin(clock * 40) : 0;
    b.m.uniforms.uEmissive.value.setRGB(e, e * 0.6, e * 0.15);
  }

  for (const t of world.towers) {
    t.flash = Math.max(0, t.flash - dt); const k = t.flash / 0.3;
    t.holeM.uniforms.uColor.value.setRGB(0.02 + k, 0.03 + k * 0.2, 0.04 + k * 0.1);
  }
  world.chevSets.forEach((c) => {
    if (c.warn > 0) { c.warn -= dt; c.m.uniforms.uColor.value.set(((clock * 14) | 0) % 2 ? 0x3cff5a : 0x1d6b28); }
    else c.m.uniforms.uColor.value.set(0x16191e);
  });
  world.goalLasers.forEach((g) => {
    if (g.t > 0) { g.t -= dt; g.m.visible = ((clock * 30) | 0) % 2 === 0; } else g.m.visible = false;
  });
  world.barriers.forEach((b) => {
    b.g.position.y += (b.y - b.g.position.y) * Math.min(1, dt * 7);
    b.m.uniforms.uOff.value.y = (clock * 1.5) % 1;
  });
  updateParticles(dt);

  // cámara: se acerca suave al jugador cuando pierde
  game.camFocus += (game.camFocusTarget - game.camFocus) * Math.min(1, rdt * 3);
  game.shake *= Math.pow(0.02, rdt);
  // en red, cada uno ve su propio arco abajo: se rota la cámara según el lugar del jugador
  const side = game.me > 0 ? game.me : 0;
  const ang = (side * Math.PI) / 2, ca = Math.cos(ang), sa = Math.sin(ang);
  const rot = (v, out) => out.set(v.x * ca + v.z * sa, v.y, -v.x * sa + v.z * ca);
  rot(CAM, camBase); rot(LOOK, lookBase);
  const fDir = rot(FOCUS_OFF, tmpOff);
  const f = game.camFocus, fx = game.focus.x, fz = game.focus.z;
  camPos.set(camBase.x + (fx + fDir.x - camBase.x) * f, camBase.y + (9 - camBase.y) * f, camBase.z + (fz + fDir.z - camBase.z) * f);
  camLook.set(lookBase.x + (fx - lookBase.x) * f, lookBase.y + (1.2 - lookBase.y) * f, lookBase.z + (fz - lookBase.z) * f);

  // en el título y los menús la cámara gira lento alrededor de la arena
  const demo = game.state === 'title' || game.state === 'menu';
  orbit += ((demo ? 1 : 0) - orbit) * Math.min(1, rdt * 2);
  if (orbit > 0.001) {
    orbitA += rdt * 0.12;
    orbitPos.set(Math.sin(orbitA) * 27, 17, Math.cos(orbitA) * 27);
    camPos.lerp(orbitPos, orbit);
    camLook.lerp(ORBIT_LOOK, orbit);
  }
  camera.position.set(camPos.x + rnd(-1, 1) * game.shake, camPos.y + rnd(-1, 1) * game.shake * 0.5, camPos.z);
  camera.lookAt(camLook);
}
