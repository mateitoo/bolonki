// Clima de cada partido: en los mapas de afuera, a veces llueve (o nieva fino, en los de nieve).
// Es solo de adorno: cada pantalla lo sortea por su cuenta al empezar la cuenta regresiva.
import * as THREE from 'three';
import { scene, U } from '../render/psx.js';
import { game } from '../state.js';
import { rnd } from '../config.js';

const N = 260, AREA = 26, TOP = 16;
let rain = null, drops = [], splash = null, sps = [], lastState = '', lastKey = '';
export const weather = { kind: null, k: 0 };

function build() {
  rain = new THREE.InstancedMesh(new THREE.BoxGeometry(0.06, 1.0, 0.06), new THREE.MeshBasicMaterial({ color: 0xb8c8e8, transparent: true, opacity: 0.65, depthWrite: false }), N);
  rain.frustumCulled = false; rain.visible = false; scene.add(rain);
  for (let i = 0; i < N; i++) drops.push({ x: rnd(-AREA, AREA), y: rnd(-2, TOP), z: rnd(-AREA, AREA), sp: rnd(0.8, 1.2) });
  const rg = new THREE.RingGeometry(0.12, 0.2, 8); rg.rotateX(-Math.PI / 2);
  splash = new THREE.InstancedMesh(rg, new THREE.MeshBasicMaterial({ color: 0xd8e4ff, transparent: true, opacity: 0.6, depthWrite: false }), 60);
  splash.frustumCulled = false; splash.visible = false; scene.add(splash);
  for (let i = 0; i < 60; i++) sps.push({ x: 0, z: 0, k: rnd(0, 1) });
}

const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), s = new THREE.Vector3(), tilt = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.18, 0, 0.12));
// f: lo que devuelve fog() del minijuego; rain: true si el mapa admite lluvia ('snow' para nevada fina)
export function updateWeather(f, dt) {
  if (!rain) build();
  const key = `${game.minigame}|${game.map ?? ''}`;
  if (game.state === 'count' && (lastState !== 'count' || key !== lastKey)) weather.kind = f.rain && game.mode !== 'demo' && Math.random() < 0.3 ? (f.rain === 'snow' ? 'snow' : 'rain') : null;
  if (game.state === 'title' || game.state === 'menu') weather.kind = null;
  lastState = game.state; lastKey = key;
  weather.k += ((weather.kind ? 1 : 0) - weather.k) * Math.min(1, dt * 1.5);
  const k = weather.k, on = k > 0.02;
  rain.visible = on; splash.visible = on && weather.kind === 'rain';
  if (!on) return;
  // más oscuro y la niebla más cerca mientras llueve
  U.uAmb.value.multiplyScalar(1 - 0.22 * k); U.uLCol.value.multiplyScalar(1 - 0.35 * k);
  U.uFogCol.value.lerp(new THREE.Color(0x6a7488), 0.45 * k); U.uFogNear.value *= 1 - 0.3 * k; U.uFogFar.value *= 1 - 0.2 * k;
  const snow = weather.kind === 'snow', fall = snow ? 2.2 : 22, gy = f.ground || 0;
  rain.material.color.set(snow ? 0xffffff : 0xb8c8e8);
  for (let i = 0; i < N; i++) {
    const d = drops[i];
    d.y -= fall * d.sp * dt; if (snow) { d.x += Math.sin(game.clock + i) * dt * 0.6; }
    if (d.y < gy) { d.y = TOP; d.x = rnd(-AREA, AREA); d.z = rnd(-AREA, AREA); if (!snow) { const sp = sps[(i * 7) % sps.length]; sp.x = d.x; sp.z = d.z; sp.k = 0; } }
    v.set(d.x, d.y, d.z); s.set(snow ? 2.6 : 1, snow ? 0.12 : k, snow ? 2.6 : 1); m4.compose(v, snow ? q : tilt, s); rain.setMatrixAt(i, m4);
  }
  rain.instanceMatrix.needsUpdate = true;
  if (!snow) {
    for (let i = 0; i < sps.length; i++) { const sp = sps[i]; sp.k = Math.min(1, sp.k + dt * 2.5); const r = sp.k < 1 ? 0.4 + sp.k * 2 : 0; v.set(sp.x, gy + 0.03, sp.z); s.set(r, 1, r); m4.compose(v, q, s); splash.setMatrixAt(i, m4); }
    splash.instanceMatrix.needsUpdate = true;
  }
}
