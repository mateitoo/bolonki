// Escenario de la sala: cuatro podios en fila donde se paran los personajes mientras eligen.
// Es una escena más (como el tablero de la Fiesta), escondida de las listas de minijuegos.
// La sala (sala.js) le dice qué hay en cada podio con STAGE; acá solo se dibuja y se anima.
import * as THREE from 'three';
import { register } from '../minigames/registry.js';
import { game } from '../state.js';
import { scene, camera, mat, add, scaleUV } from '../render/psx.js';
import { TX } from '../render/textures.js';
import { drawWalker } from '../world/walker.js';
import { charOf } from '../chars.js';
import { burst } from '../fx/particles.js';

// Podio k (de izquierda a derecha) -> lugar de la partida. Es el mismo orden en que entran
// los jugadores locales (J1, J2, J3, J4) y los invitados online (anfitrión, 1°, 2°, 3°).
export const PODIUM_SLOT = [0, 2, 1, 3];
export const PODIUM_X = [-5.4, -1.8, 1.8, 5.4];   // se reacomodan según el ancho de la pantalla (ver layout)
const TOP = 0.62;

// occ: 'human' | 'cpu' | 'none' · locked: ya eligió · pick: se cambió de personaje (anima)
export const STAGE = { occ: ['human', 'cpu', 'cpu', 'cpu'], locked: [false, false, false, false], pick: [0, 0, 0, 0], lockT: [0, 0, 0, 0] };

const W = { grp: null, rings: [], ringM: [], pods: [], bulbs: [], t: 0 };

// Los cuatro podios reparten el ancho de la pantalla (en 4:3 van más juntos), así cada tarjeta queda abajo del suyo
function layout() {
  const half = Math.tan((18.5 * Math.PI) / 180) * 15.1 * camera.aspect;
  for (let k = 0; k < 4; k++) {
    PODIUM_X[k] = ((k + 0.5) / 2 - 1) * half * 0.94;
    if (W.pods[k]) { W.pods[k].position.x = PODIUM_X[k]; W.rings[k].position.x = PODIUM_X[k]; }
  }
}

function build() {
  const grp = new THREE.Group(); grp.visible = false; scene.add(grp); W.grp = grp;
  // piso del salón y tarima
  const floor = scaleUV(new THREE.PlaneGeometry(90, 60, 6, 4), 18, 12); floor.rotateX(-Math.PI / 2);
  add(floor, mat({ map: TX.tile, color: 0x3a4466 }), 0, -0.02, 0, grp);
  add(scaleUV(new THREE.BoxGeometry(17, 0.3, 6.2), 8, 1), mat({ map: TX.metal, color: 0x6a7090 }), 0, 0.15, 0.2, grp);
  // tira de lucecitas al frente de la tarima
  add(scaleUV(new THREE.PlaneGeometry(17, 0.26), 24, 1), mat({ map: TX.lights, unlit: true }), 0, 0.15, 3.31, grp);
  // telón de fondo: pliegues de dos rojos
  const cA = mat({ color: 0x9a1c2c }), cB = mat({ color: 0x6e1220 });
  for (let k = 0; k < 22; k++) add(new THREE.BoxGeometry(1.0, 11, 0.5), k % 2 ? cA : cB, -10.5 + k, 5.5, -4.2 - (k % 2) * 0.25, grp);
  // marco dorado del telón
  const gold = mat({ map: TX.bronze, color: 0xffd060 });
  add(new THREE.BoxGeometry(23, 0.7, 0.9), gold, 0, 10.6, -3.9, grp);
  [-11.6, 11.6].forEach((x) => add(new THREE.BoxGeometry(0.7, 11, 0.9), gold, x, 5.5, -3.9, grp));
  // cartel de lamparitas arriba (parpadean)
  const bulbM = [mat({ color: 0xffe07a, unlit: true }), mat({ color: 0x8a6a2a, unlit: true })];
  for (let k = 0; k < 17; k++) { const b = add(new THREE.SphereGeometry(0.16, 5, 3), bulbM[0], -8 + k, 9.9, -3.3, grp); W.bulbs.push(b); }
  W.bulbM = bulbM;
  // podios
  PODIUM_X.forEach((x, k) => {
    W.pods[k] = add(scaleUV(new THREE.CylinderGeometry(1.2, 1.32, TOP, 12, 1), 3, 1), mat({ map: TX.tower, color: 0xb8c0d8 }), x, TOP / 2 + 0.3, 0.4, grp);
    const ringG = new THREE.TorusGeometry(1.24, 0.09, 4, 16); ringG.rotateX(Math.PI / 2);
    const rm = mat({ color: 0xffffff, unlit: true });
    W.ringM[k] = rm;
    W.rings[k] = add(ringG, rm, x, TOP + 0.3, 0.4, grp);
  });
  // columnas a los costados
  const colM = mat({ map: TX.tower, color: 0x8890b0 });
  [-13.5, 13.5].forEach((x) => { add(new THREE.CylinderGeometry(0.9, 1, 12, 10), colM, x, 6, -2.5, grp); add(new THREE.BoxGeometry(2.4, 0.6, 2.4), gold, x, 12, -2.5, grp); });
}

function reset() {
  game.players.forEach((p) => {
    p.alive = true; p.death = null; p.fy = 0; p.onGround = true; p.vx = 0; p.vz = 0; p.walk = 0;
    p.mesh.scorch.visible = false;
  });
  STAGE.pick = [0, 0, 0, 0]; STAGE.lockT = [0, 0, 0, 0];
}

const tmpCol = new THREE.Color();
function visuals(dt, rdt) {
  W.t += rdt;
  layout();
  PODIUM_SLOT.forEach((slot, k) => {
    const p = game.players[slot], occ = STAGE.occ[k];
    const on = occ !== 'none';
    p.mesh.root.visible = on;
    // anillo del podio: color del personaje (apagado si está vacío, parpadea mientras elige)
    const ch = charOf(slot);
    tmpCol.set(on ? ch.col : '#2a3150');
    if (on && occ === 'human' && !STAGE.locked[k]) tmpCol.multiplyScalar(0.55 + 0.45 * Math.abs(Math.sin(W.t * 3 + k)));
    if (occ === 'cpu') tmpCol.multiplyScalar(0.45);
    W.ringM[k].uniforms.uColor.value.copy(tmpCol);
    if (!on) { p.mesh.sh.visible = false; return; }
    // se para en su podio mirando a cámara; se balancea mientras elige, salta al confirmar
    if (STAGE.pick[k] > 0) STAGE.pick[k] = Math.max(0, STAGE.pick[k] - rdt * 3);
    if (STAGE.lockT[k] > 0) STAGE.lockT[k] = Math.max(0, STAGE.lockT[k] - rdt);
    const lt = STAGE.lockT[k];
    p.x = PODIUM_X[k]; p.z = 0.4;
    p.fy = TOP + 0.3 + (lt > 0 ? Math.abs(Math.sin((1 - lt) * Math.PI * 2)) * 1.1 : 0);
    p.onGround = lt <= 0;
    const sway = STAGE.locked[k] ? Math.sin(W.t * 1.3 + k) * 0.12 : Math.sin(W.t * 2 + k * 1.7) * 0.35;
    p.ang = sway + STAGE.pick[k] * Math.PI * 2;
    p.vx = 0; p.vz = 0;
    drawWalker(p, rdt, 1.25, TOP + 0.3);
    p.mesh.root.position.y = p.fy;
    if (occ === 'cpu') p.mesh.rider.position.y -= 0.1;
  });
  // lamparitas del cartel: una ola que recorre
  W.bulbs.forEach((b, k) => { b.material = W.bulbM[((W.t * 8 - k) | 0) % 3 === 0 ? 1 : 0]; });
}

// Chispas al elegir o confirmar (las llama la sala)
export function stagePuff(k, big) {
  const slot = PODIUM_SLOT[k];
  burst(PODIUM_X[k], TOP + 2.2, 0.4, { mat: slot, n: big ? 24 : 10, sp: big ? 6 : 3.5, up: big ? [4, 9] : [2, 5], life: [0.35, 0.7] });
}

const sala = {
  id: 'sala',
  name: 'SALA',
  desc: '',
  points: { label: '', values: [1], key: 'salaX', demo: 1 },
  cam: { pos: new THREE.Vector3(0, 3.4, 15.5), look: new THREE.Vector3(0, 1.75, 0), rotate: false, fixed: true },
  humanOut: false,
  noThumb: true,
  build,
  show(on) { if (W.grp) W.grp.visible = on; },
  reset,
  step() {},
  visuals,
  onLocalHit() {},
  drawScore() {},
  hud() {},
  snapshot() { return {}; },
  applySnap() {},
  guestLocal() {},
  guestHitFx() {},
};
register(sala, { hidden: true });
export default sala;
