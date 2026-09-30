// Lo visual que se actualiza por frame y es común a todos los minijuegos:
// animaciones de derrota, partículas y cámara. Lo propio de cada minijuego está en su visuals().
import * as THREE from 'three';
import { rnd } from './config.js';
import { game } from './state.js';
import { camera, U } from './render/psx.js';
import { updateParticles } from './fx/particles.js';
import { mg } from './minigames/registry.js';
import { input, isTouch } from './input.js';
import { updateProps } from './world/props.js';
import { settings } from './settings.js';

const camPos = new THREE.Vector3(), camLook = new THREE.Vector3();
const orbitPos = new THREE.Vector3(), ORBIT_LOOK = new THREE.Vector3(0, 0, 0);
const camBase = new THREE.Vector3(), lookBase = new THREE.Vector3(), tmpOff = new THREE.Vector3();
const FOCUS_OFF = new THREE.Vector3(0, 0, 10);
let orbit = 1, orbitA = 0;

// gira la posición de la cámara alrededor del punto al que mira (yaw) y la sube/baja (pitch)
const tmpV = new THREE.Vector3();
function orbit3(pos, look, yaw, pitch) {
  tmpV.subVectors(pos, look);
  const r = tmpV.length();
  let az = Math.atan2(tmpV.x, tmpV.z) + yaw;
  let el = Math.asin(Math.max(-1, Math.min(1, tmpV.y / r))) + pitch;
  el = Math.max(0.35, Math.min(1.45, el));
  pos.set(look.x + Math.sin(az) * Math.cos(el) * r, look.y + Math.sin(el) * r, look.z + Math.cos(az) * Math.cos(el) * r);
}

// Niebla de cada escenario: lo lejano se funde con el color del horizonte (el cielo queda atrás)
const FOG0 = { col: 0x04060b, near: 40, far: 80 };
function applyFog(m) {
  const f = (typeof m.fog === 'function' ? m.fog() : m.fog) || FOG0;
  U.uFogCol.value.set(f.col); U.uFogNear.value = f.near; U.uFogFar.value = f.far;
}

export function updateVisuals(dt, rdt) {
  game.clock += dt;
  const m = mg();
  applyFog(m);

  // animaciones de derrota (explosión, cortocircuito, eyección, caída…)
  for (const p of game.players) {
    if (p.flash > 0) p.flash -= dt;
    if (!p.death) continue;
    const d = p.death;
    if (!d.done) {
      d.t += dt; d.anim.update(p, d.st, d.t, dt);
      if (d.t >= d.anim.dur) { d.done = true; p.mesh.root.visible = false; if (p.i === game.me) game.camFocusTarget = 0; }
    }
    p.mesh.sh.visible = false;
  }

  m.visuals(dt, rdt);
  updateProps(dt);
  updateParticles(dt);

  // cámara: la de cada minijuego; se acerca suave al jugador cuando pierde
  game.camFocus += (game.camFocusTarget - game.camFocus) * Math.min(1, rdt * 3);
  game.shake *= Math.pow(0.02, rdt);
  // en red (Bola Brava), cada uno ve su propio arco abajo: se rota la cámara según su lugar
  const side = m.cam.rotate && game.me > 0 ? game.me : 0;
  const ang = (side * Math.PI) / 2, ca = Math.cos(ang), sa = Math.sin(ang);
  const rot = (v, out) => out.set(v.x * ca + v.z * sa, v.y, -v.x * sa + v.z * ca);
  rot(m.cam.pos, camBase); rot(m.cam.look, lookBase);
  // cámara que se gira arrastrando con el mouse / el dedo o con el stick derecho (en los minijuegos con cam.orbit)
  const playing = game.state === 'play' || game.state === 'count' || game.state === 'end';
  const d = input.drag;
  // en el celular, girar la cámara arrastrando el dedo es opcional (viene apagado: se tocaba sin querer)
  if (isTouch() && !settings.touchCam) { d.dx = 0; d.dy = 0; }
  if (m.cam.orbit && playing) {
    const sens = (settings.camSens || 5) / 5, inv = settings.camInvert ? -1 : 1;
    game.camYaw = (game.camYaw || 0) - (d.dx * 0.008 + input.camStick.x * 2.4 * rdt) * sens;
    game.camPitch = Math.max(-0.55, Math.min(0.4, (game.camPitch || 0) + (d.dy * 0.005 + input.camStick.y * 1.6 * rdt) * sens * inv));
    if (input.events.some((e) => e.a === 'camReset')) { game.camYaw = 0; game.camPitch = 0; }
  }
  d.dx = 0; d.dy = 0;
  if (m.cam.orbit && (game.camYaw || game.camPitch)) orbit3(camBase, lookBase, game.camYaw || 0, game.camPitch || 0);
  const fDir = rot(FOCUS_OFF, tmpOff);
  const f = game.camFocus, fx = game.focus.x, fz = game.focus.z;
  camPos.set(camBase.x + (fx + fDir.x - camBase.x) * f, camBase.y + (9 - camBase.y) * f, camBase.z + (fz + fDir.z - camBase.z) * f);
  camLook.set(lookBase.x + (fx - lookBase.x) * f, lookBase.y + (1.2 - lookBase.y) * f, lookBase.z + (fz - lookBase.z) * f);

  // en el título y los menús la cámara gira lento alrededor de la arena
  const demo = (game.state === 'title' || game.state === 'menu') && !m.cam.fixed;   // la sala tiene cámara quieta
  orbit += ((demo ? 1 : 0) - orbit) * Math.min(1, rdt * 2.5);
  if (orbit > 0.001) {
    orbitA += rdt * 0.12;
    orbitPos.set(Math.sin(orbitA) * 27, 17, Math.cos(orbitA) * 27);
    camPos.lerp(orbitPos, orbit);
    camLook.lerp(ORBIT_LOOK, orbit);
  }
  const sh = settings.shake === false ? 0 : game.shake;
  camera.position.set(camPos.x + rnd(-1, 1) * sh, camPos.y + rnd(-1, 1) * sh * 0.5, camPos.z);
  // vibración (joystick y celular) cuando hay un sacudón fuerte
  if (game.shake > lastShake + 0.12 && settings.vibrate !== false) rumble(Math.min(1, game.shake * 2.5));
  lastShake = game.shake;
  camera.lookAt(camLook);
}

let lastShake = 0, lastRumble = 0;
function rumble(k) {
  const now = performance.now(); if (now - lastRumble < 120) return; lastRumble = now;
  try {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const p of pads) {
      const a = p && p.vibrationActuator;
      if (a && a.playEffect) a.playEffect('dual-rumble', { duration: 90 + k * 120, strongMagnitude: 0.3 + k * 0.6, weakMagnitude: 0.4 + k * 0.5 }).catch(() => {});
    }
    if (navigator.vibrate && matchMedia('(pointer: coarse)').matches) navigator.vibrate(Math.round(25 + k * 50));
  } catch (e) { /* sin vibración */ }
}
