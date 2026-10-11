// Partículas (chispas, humo, escombros) y estela punteada de las pelotas.
import * as THREE from 'three';
import { CHARS, rnd } from '../config.js';
import { scene, mat } from '../render/psx.js';

// Índices de color: 0-3 = color de cada personaje
export const P = { WHITE: 4, ORANGE: 5, YELLOW: 6, SMOKE: 7, DEBRIS: 8, CYAN: 9, RED: 10, SAND: 11, GRASS: 12, DIRT: 13, DUST: 14 };
const PCOL = [0, 1, 2, 3].map((i) => CHARS[i].col).concat(   // 0..3: color de cada lugar (se tiñe con su personaje)
  ['#ffffff', '#ff7a1a', '#ffe14a', '#8b8f99', '#2a2a2e', '#6ff6ff', '#ff2030', '#e0c080', '#5aa040', '#7a5a3a', '#c8c8d0']);

let pMats = [];
const PARTS = [];
const DOTS = [];
const RIPS = [];
let PRINTS = null; const PR = []; let prIdx = 0;
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
  // anillos que se abren en el agua cuando algo cae (salpicón)
  const rg = new THREE.RingGeometry(0.8, 1, 18); rg.rotateX(-Math.PI / 2);
  for (let k = 0; k < 12; k++) { const me = new THREE.Mesh(rg, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, depthWrite: false })); me.visible = false; scene.add(me); RIPS.push({ me, life: 0, max: 1, r: 1 }); }
}

// o: {mat, n, sp, up:[min,max], life:[min,max], g, grow, size, spread, vx, vz}
// Las partículas 0..3 son del color del personaje de cada lugar (cambia al elegir personaje)
export function tintSlotParticles(i, col) { if (pMats[i]) pMats[i].uniforms.uColor.value.set(col); }

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
    p.g = o.g !== undefined ? o.g : 22; p.grow = o.grow || 0; p.s0 = o.size || 1; p.fl = o.floor !== undefined ? o.floor : Math.min(0.1, y - 0.05);
    n--;
  }
}

// Ondas en el agua: n anillos uno tras otro que se agrandan y se apagan
export function ripple(x, y, z, n = 3, r = 3) {
  for (let i = 0; i < n; i++) {
    const q = RIPS.find((o) => o.life <= 0); if (!q) return;
    q.max = 1.1 + i * 0.25; q.life = q.max + i * 0.18; q.r = r * (1 - i * 0.2); q.delay = i * 0.18;
    q.me.position.set(x, y, z); q.me.scale.setScalar(0.1); q.me.visible = false;
  }
}
// Huellas que quedan en la nieve o la arena y se borran solas a los segundos
const PR_N = 140, PR_LIFE = 7;
export function stepPrint(x, y, z, ang, col) {
  if (!PRINTS) {
    const g = new THREE.CircleGeometry(0.11, 6); g.rotateX(-Math.PI / 2); g.scale(1, 1, 1.7);
    PRINTS = new THREE.InstancedMesh(g, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, depthWrite: false }), PR_N);
    PRINTS.frustumCulled = false; scene.add(PRINTS);
    const m4 = new THREE.Matrix4().makeScale(0, 0, 0), c = new THREE.Color(1, 1, 1);
    for (let i = 0; i < PR_N; i++) { PR.push({ life: 0, x: 0, y: 0, z: 0, a: 0 }); PRINTS.setMatrixAt(i, m4); PRINTS.setColorAt(i, c); }
  }
  const i = (prIdx = (prIdx + 1) % PR_N), q = PR[i];
  q.life = PR_LIFE; q.x = x; q.y = y + 0.025; q.z = z; q.a = ang;
  PRINTS.setColorAt(i, new THREE.Color(col)); PRINTS.instanceColor.needsUpdate = true;
}
const prM = new THREE.Matrix4(), prQ = new THREE.Quaternion(), prV = new THREE.Vector3(), prS = new THREE.Vector3(), prUp = new THREE.Vector3(0, 1, 0);
function updatePrints(dt) {
  if (!PRINTS) return;
  let any = false;
  for (let i = 0; i < PR_N; i++) {
    const q = PR[i]; if (q.life <= 0) continue;
    q.life -= dt; any = true;
    const k = q.life <= 0 ? 0 : Math.min(1, q.life / 1.5);
    prQ.setFromAxisAngle(prUp, q.a); prV.set(q.x, q.y, q.z); prS.set(k, 1, k); prM.compose(prV, prQ, prS); PRINTS.setMatrixAt(i, prM);
  }
  if (any) PRINTS.instanceMatrix.needsUpdate = true;
}
// Marcas quemadas en el piso (explosiones): manchón oscuro irregular que se va borrando
const SC_N = 60, SC_LIFE = 12; let SCORCH = null; const SC = []; let scIdx = 0;
export function scorch(x, y, z, r = 1) {
  if (!SCORCH) {
    const c = document.createElement('canvas'); c.width = c.height = 32; const x2 = c.getContext('2d');
    for (let i = 0; i < 9; i++) { const g = x2.createRadialGradient(16 + rnd(-6, 6), 16 + rnd(-6, 6), 0, 16, 16, rnd(8, 15)); g.addColorStop(0, 'rgba(30,20,12,.38)'); g.addColorStop(1, 'rgba(30,20,12,0)'); x2.fillStyle = g; x2.fillRect(0, 0, 32, 32); }
    const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter;
    const g = new THREE.PlaneGeometry(2, 2); g.rotateX(-Math.PI / 2);
    SCORCH = new THREE.InstancedMesh(g, new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3 }), SC_N);
    SCORCH.frustumCulled = false; scene.add(SCORCH);
    const m4 = new THREE.Matrix4().makeScale(0, 0, 0);
    for (let i = 0; i < SC_N; i++) { SC.push({ life: 0 }); SCORCH.setMatrixAt(i, m4); }
  }
  const i = (scIdx = (scIdx + 1) % SC_N);
  Object.assign(SC[i], { life: SC_LIFE, x, y: y + 0.02, z, r: r * rnd(0.85, 1.15), a: rnd(0, 6.28) });
}
function updateScorch(dt) {
  if (!SCORCH) return;
  let any = false;
  for (let i = 0; i < SC_N; i++) {
    const q = SC[i]; if (q.life <= 0) continue;
    q.life -= dt; any = true;
    const k = q.life <= 0 ? 0 : Math.min(1, q.life / 3) * q.r;
    prQ.setFromAxisAngle(prUp, q.a); prV.set(q.x, q.y, q.z); prS.set(k, 1, k); prM.compose(prV, prQ, prS); SCORCH.setMatrixAt(i, prM);
  }
  if (any) SCORCH.instanceMatrix.needsUpdate = true;
}
// Pedacitos que quedan tirados en el piso (astillas de un cajón, cartón, barro cocido…) y se van achicando
const LT_N = 120, LT_LIFE = 9; let LITTER = null; const LT = []; let ltIdx = 0;
export function litter(x, y, z, col, n = 5, r = 0.7) {
  if (!LITTER) {
    LITTER = new THREE.InstancedMesh(new THREE.BoxGeometry(0.22, 0.05, 0.1), mat({ color: 0xffffff }), LT_N);
    LITTER.frustumCulled = false; scene.add(LITTER);
    const m4 = new THREE.Matrix4().makeScale(0, 0, 0), c = new THREE.Color(1, 1, 1);
    for (let i = 0; i < LT_N; i++) { LT.push({ life: 0 }); LITTER.setMatrixAt(i, m4); LITTER.setColorAt(i, c); }
  }
  const c = new THREE.Color(col);
  for (let j = 0; j < n; j++) {
    const i = (ltIdx = (ltIdx + 1) % LT_N), a = rnd(0, 6.28), d = rnd(0.1, r);
    Object.assign(LT[i], { life: LT_LIFE + rnd(0, 2), x: x + Math.cos(a) * d, y: y + 0.03, z: z + Math.sin(a) * d, a: rnd(0, 6.28), s: rnd(0.7, 1.4) });
    LITTER.setColorAt(i, c.clone().multiplyScalar(rnd(0.75, 1.1)));
  }
  LITTER.instanceColor.needsUpdate = true;
}
function updateLitter(dt) {
  if (!LITTER) return;
  let any = false;
  for (let i = 0; i < LT_N; i++) {
    const q = LT[i]; if (q.life <= 0) continue;
    q.life -= dt; any = true;
    const k = q.life <= 0 ? 0 : Math.min(1, q.life / 2) * q.s;
    prQ.setFromAxisAngle(prUp, q.a); prV.set(q.x, q.y, q.z); prS.set(k, k, k); prM.compose(prV, prQ, prS); LITTER.setMatrixAt(i, prM);
  }
  if (any) LITTER.instanceMatrix.needsUpdate = true;
}
const DOT_LIFE = 0.32;
export function dropDot(x, z) {
  const d = DOTS[(dotIdx = (dotIdx + 1) % DOTS.length)];
  d.life = DOT_LIFE; d.me.position.set(x, 0.04, z); d.me.visible = true; d.me.scale.set(1, 1, 1);
}

export function updateParticles(dt) {
  updatePrints(dt); updateScorch(dt); updateLitter(dt);
  for (const q of RIPS) {
    if (q.life <= 0) continue;
    q.life -= dt;
    const age = q.max - q.life;
    if (age < 0) { q.me.visible = false; continue; }
    const k = Math.min(1, age / q.max);
    q.me.visible = q.life > 0; q.me.scale.setScalar(0.3 + k * q.r); q.me.material.opacity = 0.8 * (1 - k);
  }
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
    if (p.y < p.fl && p.g > 0) { p.y = p.fl; p.vy *= -0.35; p.vx *= 0.7; p.vz *= 0.7; }
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
  for (const q of RIPS) { q.life = 0; q.me.visible = false; }
  for (const q of PR) q.life = 0.001;
  for (const q of SC) if (q.life > 0) q.life = 0.001;
  for (const q of LT) if (q.life > 0) q.life = 0.001;
}
