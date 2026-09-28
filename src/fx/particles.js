// Partículas (chispas, humo, escombros) y estela punteada de las pelotas.
import * as THREE from 'three';
import { CHARS, rnd } from '../config.js';
import { scene, mat } from '../render/psx.js';

// Índices de color: 0-3 = color de cada personaje
export const P = { WHITE: 4, ORANGE: 5, YELLOW: 6, SMOKE: 7, DEBRIS: 8, CYAN: 9, RED: 10 };
const PCOL = CHARS.map((c) => c.col).concat(['#ffffff', '#ff7a1a', '#ffe14a', '#8b8f99', '#2a2a2e', '#6ff6ff', '#ff2030']);

let pMats = [];
const PARTS = [];
const DOTS = [];
let dotIdx = 0;

export function initParticles() {
  pMats = PCOL.map((c, k) => (k === P.DEBRIS ? mat({ color: new THREE.Color(c) }) : mat({ color: new THREE.Color(c), unlit: true })));
  const pGeo = new THREE.BoxGeometry(0.24, 0.24, 0.24);
  for (let k = 0; k < 220; k++) {
    const me = new THREE.Mesh(pGeo, pMats[0]); me.visible = false; scene.add(me);
    PARTS.push({ me, life: 0, max: 1, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, g: 22, grow: 0, s0: 1 });
  }
  const dg = new THREE.PlaneGeometry(0.2, 0.2); dg.rotateX(-Math.PI / 2);
  const dm = new THREE.MeshBasicMaterial({ color: 0xf4fbff, transparent: true, opacity: 0.85, depthWrite: false });
  for (let k = 0; k < 220; k++) { const me = new THREE.Mesh(dg, dm); me.visible = false; scene.add(me); DOTS.push({ me, life: 0 }); }
}

// o: {mat, n, sp, up:[min,max], life:[min,max], g, grow, size, spread, vx, vz}
export function burst(x, y, z, o) {
  let n = o.n || 8;
  for (const p of PARTS) {
    if (n <= 0) break;
    if (p.life > 0) continue;
    p.me.material = pMats[o.mat || 0]; p.me.visible = true;
    p.max = p.life = rnd(o.life ? o.life[0] : 0.4, o.life ? o.life[1] : 0.9);
    p.x = x + rnd(-1, 1) * (o.spread || 0); p.y = y; p.z = z + rnd(-1, 1) * (o.spread || 0);
    const a = Math.random() * Math.PI * 2, v = rnd(0.3, 1) * (o.sp || 5);
    p.vx = Math.cos(a) * v + (o.vx || 0); p.vz = Math.sin(a) * v + (o.vz || 0);
    p.vy = rnd(o.up ? o.up[0] : 3, o.up ? o.up[1] : 8);
    p.g = o.g !== undefined ? o.g : 22; p.grow = o.grow || 0; p.s0 = o.size || 1;
    n--;
  }
}

const DOT_LIFE = 0.32;
export function dropDot(x, z) {
  const d = DOTS[(dotIdx = (dotIdx + 1) % DOTS.length)];
  d.life = DOT_LIFE; d.me.position.set(x, 0.04, z); d.me.visible = true; d.me.scale.set(1, 1, 1);
}

export function updateParticles(dt) {
  for (const d of DOTS) {
    if (d.life <= 0) continue;
    d.life -= dt;
    const k = Math.max(0, d.life / DOT_LIFE); d.me.scale.set(k, 1, k);
    if (d.life <= 0) d.me.visible = false;
  }
  for (const p of PARTS) {
    if (p.life <= 0) continue;
    p.life -= dt;
    p.vy -= p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
    if (p.y < 0.1 && p.g > 0) { p.y = 0.1; p.vy *= -0.35; p.vx *= 0.7; p.vz *= 0.7; }
    const age = 1 - p.life / p.max;
    const sc = p.s0 * (1 + p.grow * age) * (p.grow ? Math.max(0.15, 1 - age * 0.6) : 1);
    p.me.scale.set(sc, sc, sc); p.me.position.set(p.x, p.y, p.z);
    p.me.rotation.x += dt * 8; p.me.rotation.y += dt * 6;
    if (p.life <= 0) p.me.visible = false;
  }
}

// Borra todas las partículas (por ejemplo, después de sacar las fotos de los minijuegos)
export function clearParticles() {
  for (const p of PARTS) { p.life = 0; p.me.visible = false; }
  for (const d of DOTS) { d.life = 0; d.me.visible = false; }
}
