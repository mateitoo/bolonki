// Decorado de HEXÁGONOS: los pisos flotan en un cielo celeste con nubes, globos y un arcoíris; abajo de todo, el slime.
import * as THREE from 'three';
import { add, mat, scaleUV } from '../render/psx.js';
import { TX } from '../render/textures.js';
import { rnd } from '../config.js';
import * as P from './props.js';

const grp = (p, x = 0, y = 0, z = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); p.add(g); return g; };

function cloud(p, x, y, z, s) {
  const g = grp(p, x, y, z); g.scale.setScalar(s);
  const m = P.M(0xffffff), sh = P.M(0xdfe8f8);
  [[0, 0, 0, 2.2], [1.9, -0.3, 0.3, 1.6], [-1.8, -0.4, -0.2, 1.7], [0.7, 0.9, -0.3, 1.5], [-0.8, 0.7, 0.4, 1.3], [3.2, -0.6, 0, 1.1], [-3.1, -0.7, 0.2, 1.0]]
    .forEach(([a, b, c, r], k) => add(new THREE.DodecahedronGeometry(r, 1), k % 3 === 2 ? sh : m, a, b, c, g));
  return g;
}
function hexPillar(p, x, y, z, h, col) {
  const g = grp(p, x, y, z);
  add(new THREE.CylinderGeometry(1.6, 1.3, h, 6), P.M(col, { map: TX.hexSide }), 0, -h / 2, 0, g);
  add(new THREE.CylinderGeometry(1.35, 1.35, 0.1, 6), P.M(col, { map: TX.hexTop }), 0, 0.05, 0, g);
  const ph = rnd(0, 6);
  P.anim(g, (t) => { g.position.y = y + Math.sin(t * 0.5 + ph) * 0.6; g.rotation.y = t * 0.05 + ph; });
  return g;
}

export function decorHexagonos(g, slimeY) {
  P.sky(g, [[0, '#2a6ae0'], [0.35, '#5aa8ff'], [0.48, '#bfe6ff'], [0.52, '#e8f6ff'], [0.62, '#9ad8a0'], [1, '#2a6a20']], { r: 120, y: -10 });
  // slime abajo de todo
  const sg = scaleUV(new THREE.PlaneGeometry(240, 240, 20, 20), 36); sg.rotateX(-Math.PI / 2);
  const slimeM = mat({ map: TX.slime, color: 0xffffff });
  add(sg, slimeM, 0, slimeY, 0, g);
  P.drift(g, 24, -18, 18, slimeY, slimeY + 3, -18, 18, 0xc8ff6a, 0.35, 0.8);      // burbujas que suben
  // nubes alrededor (algunas abajo, entre los pisos y el slime)
  for (let k = 0; k < 16; k++) {
    const a = (k / 16) * Math.PI * 2 + rnd(-0.15, 0.15), d = rnd(24, 48), y = k % 3 === 0 ? rnd(-20, -12) : rnd(-6, 8);
    const c = cloud(g, Math.sin(a) * d, y, Math.cos(a) * d, rnd(1.2, 2.4));
    const sp = rnd(0.01, 0.025), a0 = a;
    P.anim(c, (t) => { const aa = a0 + t * sp; c.position.x = Math.sin(aa) * d; c.position.z = Math.cos(aa) * d; });
  }
  // columnas hexagonales flotando de adorno
  [[-19, -3, -12, 8, 0xb07aff], [20, -5, -10, 10, 0x39d98a], [-22, -9, 10, 6, 0xffc83a], [21, -12, 12, 9, 0xff6fae], [0, -8, -26, 12, 0x4ad8ff], [-8, -16, 22, 7, 0xff9a1f]]
    .forEach(([x, y, z, h, c]) => hexPillar(g, x, y, z, h, c));
  // arcoíris de fondo
  const cols = [0xff4a4a, 0xff9a1f, 0xffe14a, 0x39d98a, 0x4a8cff, 0xb07aff];
  cols.forEach((c, k) => { const t = new THREE.TorusGeometry(38 - k * 1.3, 0.65, 4, 28, Math.PI); add(t, P.M(c, { unlit: true }), 0, -12, -70, g); });
  P.balloons(g, -16, 2, -18, 5, 6); P.balloons(g, 18, 0, 14, 5, 5);
  return slimeM;
}

/* ===================== DULCES: pisos de galletita con glaseado sobre un río de chocolate ===================== */
function lollipop(p, x, y, z, s, col) {
  const g = grp(p, x, y, z); g.scale.setScalar(s);
  add(new THREE.CylinderGeometry(0.15, 0.15, 7, 6), P.M(0xffffff), 0, -3.5, 0, g);
  const cv = document.createElement('canvas'); cv.width = 64; cv.height = 64; const c = cv.getContext('2d');
  c.fillStyle = '#ffffff'; c.fillRect(0, 0, 64, 64); c.strokeStyle = col; c.lineWidth = 6; c.beginPath();
  for (let a = 0; a < 18; a += 0.1) { const r = a * 1.7; c.lineTo(32 + Math.cos(a) * r, 32 + Math.sin(a) * r); } c.stroke();
  const t = new THREE.CanvasTexture(cv); t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter;
  const disc = add(new THREE.CylinderGeometry(2.4, 2.4, 0.6, 20), mat({ map: t }), 0, 0.5, 0, g); disc.rotation.x = Math.PI / 2;
  const ph = rnd(0, 6); P.anim(g, (tt) => { g.rotation.y = Math.sin(tt * 0.4 + ph) * 0.5; g.position.y = y + Math.sin(tt * 0.6 + ph) * 0.5; });
}
function candyCane(p, x, y, z, s) {
  const g = grp(p, x, y, z); g.scale.setScalar(s); g.rotation.y = rnd(0, 6);
  const m = P.M(0xffffff, { map: TX.candyStripe });
  add(new THREE.CylinderGeometry(0.45, 0.45, 9, 8), m, 0, -4.5, 0, g);
  const hook = new THREE.TorusGeometry(1.3, 0.45, 8, 12, Math.PI); add(hook, m, 1.3, 0, 0, g);
  add(new THREE.CylinderGeometry(0.45, 0.45, 1.2, 8), m, 2.6, -0.6, 0, g);
}
function gumdrop(p, x, y, z, col) {
  const g = add(new THREE.SphereGeometry(1, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), P.M(col), x, y, z, p);
  g.scale.set(1, 1.2, 1); const ph = rnd(0, 6);
  P.anim(g, (t) => { g.position.y = y + Math.sin(t * 0.8 + ph) * 0.6; g.rotation.y = t * 0.3 + ph; });
}
function cupcake(p, x, y, z, s) {
  const g = grp(p, x, y, z); g.scale.setScalar(s);
  add(new THREE.CylinderGeometry(1.6, 1.2, 1.8, 10), P.M(0xffffff, { map: TX.wafer }), 0, 0, 0, g);
  add(new THREE.SphereGeometry(1.8, 12, 8), P.M(0xffc8e0, { map: TX.frosting }), 0, 1.1, 0, g).scale.y = 0.7;
  add(new THREE.SphereGeometry(0.4, 8, 6), P.M(0xe8203a), 0, 2.4, 0, g);
  const ph = rnd(0, 6); P.anim(g, (t) => { g.position.y = y + Math.sin(t * 0.5 + ph) * 0.5; });
}
function cottonCloud(p, x, y, z, s, col) {
  const g = grp(p, x, y, z); g.scale.setScalar(s);
  [[0, 0, 0, 2.2], [1.9, -0.3, 0.3, 1.6], [-1.8, -0.4, -0.2, 1.7], [0.7, 0.9, -0.3, 1.5], [-0.8, 0.7, 0.4, 1.3]]
    .forEach(([a, b, c, r]) => add(new THREE.DodecahedronGeometry(r, 1), P.M(col), a, b, c, g));
  return g;
}
export function decorDulces(g, slimeY) {
  P.sky(g, [[0, '#ff9ad8'], [0.35, '#ffc8e8'], [0.5, '#fff0f8'], [0.6, '#d8b0ff'], [1, '#8a5ac8']], { r: 120, y: -10 });
  const sg = scaleUV(new THREE.PlaneGeometry(240, 240, 20, 20), 30); sg.rotateX(-Math.PI / 2);
  const choco = mat({ map: TX.choco, color: 0xffffff });
  add(sg, choco, 0, slimeY, 0, g);
  P.drift(g, 20, -18, 18, slimeY, slimeY + 3, -18, 18, 0x8a4a2a, 0.35, 0.6);          // burbujas de chocolate
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2 + rnd(-0.2, 0.2), d = rnd(24, 44);
    cottonCloud(g, Math.sin(a) * d, rnd(-16, 6), Math.cos(a) * d, rnd(1.2, 2), [0xffb0e0, 0xb0e0ff, 0xfff0a0, 0xd0b0ff][k % 4]);
  }
  [[-20, -2, -14, 1.3, '#e8203a'], [21, -6, -10, 1.1, '#3a8aff'], [-22, -10, 12, 1.2, '#39c86a'], [18, -4, 16, 1.4, '#b04ae8']].forEach(([x, y, z, s, c]) => lollipop(g, x, y, z, s, c));
  [[0, -6, -26, 1.3], [-26, -14, 0, 1.1], [25, -12, 2, 1.2]].forEach(([x, y, z, s]) => candyCane(g, x, y, z, s));
  [[-14, -20, -18, 1.3], [15, -22, -16, 1.1], [-10, -24, 20, 1.2], [14, -18, 22, 1.4]].forEach(([x, y, z, s]) => cupcake(g, x, y, z, s));
  for (let k = 0; k < 10; k++) { const a = rnd(0, 6.28), d = rnd(18, 30); gumdrop(g, Math.sin(a) * d, rnd(-24, 2), Math.cos(a) * d, [0xff3a5a, 0x3ad86a, 0xffd23a, 0x3a9aff, 0xff8a1a][k % 5]); }
  P.drift(g, 60, -30, 30, 12, -30, -30, 30, 0xffffff, 0.14, 1.1, true);               // granitos que caen
  return choco;
}

/* ===================== NEÓN: pisos que brillan en una noche synthwave, sobre una grilla infinita ===================== */
export function decorNeon(g, slimeY) {
  P.sky(g, [[0, '#08001a'], [0.35, '#1a0440'], [0.47, '#5a0a6a'], [0.5, '#ff3a8a'], [0.53, '#1a0430'], [1, '#050010']], { stars: 90, starBand: 0.45, r: 120, y: -10 });
  // sol retro con rayas, a lo lejos
  const cv = document.createElement('canvas'); cv.width = 64; cv.height = 64; const c = cv.getContext('2d');
  const gr = c.createLinearGradient(0, 0, 0, 64); gr.addColorStop(0, '#ffe03a'); gr.addColorStop(1, '#ff2a8a');
  c.fillStyle = gr; c.beginPath(); c.arc(32, 32, 31, 0, 7); c.fill();
  c.globalCompositeOperation = 'destination-out'; for (let y = 36; y < 64; y += 6) c.fillRect(0, y, 64, 2 + (y - 36) / 8);
  const st = new THREE.CanvasTexture(cv);
  const sun = add(new THREE.PlaneGeometry(40, 40), new THREE.MeshBasicMaterial({ map: st, transparent: true, fog: false, depthWrite: false }), 0, -18, -100, g); sun.renderOrder = -9;
  // la grilla de abajo, que corre
  const gg = scaleUV(new THREE.PlaneGeometry(240, 240, 20, 20), 60); gg.rotateX(-Math.PI / 2);
  const grid = mat({ map: TX.neonGrid, unlit: true });
  add(gg, grid, 0, slimeY, 0, g);
  // pirámides y anillos de neón flotando
  const pyr = (x, y, z, s, col) => {
    const pg = grp(g, x, y, z); pg.scale.setScalar(s);
    add(new THREE.ConeGeometry(3, 4, 4), P.M(0x14082a), 0, 0, 0, pg);
    const e = new THREE.EdgesGeometry(new THREE.ConeGeometry(3.02, 4.02, 4)); pg.add(new THREE.LineSegments(e, new THREE.LineBasicMaterial({ color: col, fog: false })));
    const ph = rnd(0, 6); P.anim(pg, (t) => { pg.rotation.y = t * 0.3 + ph; pg.position.y = y + Math.sin(t * 0.7 + ph) * 0.8; });
  };
  [[-20, -4, -14, 1.3, 0x3af0ff], [21, -8, -12, 1.1, 0xff3aa8], [-22, -14, 12, 1.2, 0xffe03a], [20, -6, 16, 1.5, 0x9a5aff], [0, -12, -26, 1.4, 0xff3aa8]].forEach(([x, y, z, s, c2]) => pyr(x, y, z, s, c2));
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2, d = rnd(26, 34);
    const r = add(new THREE.TorusGeometry(rnd(2, 3.5), 0.18, 4, 24), P.M([0x3af0ff, 0xff3aa8, 0xffe03a][k % 3], { unlit: true }), Math.sin(a) * d, rnd(-20, 2), Math.cos(a) * d, g);
    const ph = rnd(0, 6); P.anim(r, (t) => { r.rotation.x = t * 0.5 + ph; r.rotation.y = t * 0.3; });
  }
  P.drift(g, 40, -30, 30, slimeY, 10, -30, 30, 0xff3aa8, 0.12, 1.4);               // chispitas que suben
  return grid;
}

/* ===================== VOLCÁN: pisos de roca sobre un mar de magma, con volcanes que escupen fuego ===================== */
function floatRock(p, x, y, z, s, glow) {
  const g = grp(p, x, y, z); g.scale.setScalar(s);
  const rm = P.M(0x3a2e32, { map: TX.rock });
  add(new THREE.DodecahedronGeometry(2.2, 0), rm, 0, 0, 0, g).scale.set(1.3, 0.7, 1.1);
  add(new THREE.ConeGeometry(1.6, 3.4, 6), rm, 0, -2.2, 0, g).rotation.x = Math.PI;          // punta de abajo
  if (glow) add(new THREE.CylinderGeometry(1.9, 1.9, 0.14, 7), P.M(0xff7a1a, { unlit: true }), 0, 0.2, 0, g);   // grieta que brilla
  const ph = rnd(0, 6);
  P.anim(g, (t) => { g.position.y = y + Math.sin(t * 0.45 + ph) * 0.7; g.rotation.y = t * 0.06 + ph; });
  return g;
}
export function decorVolcan(g, slimeY) {
  P.sky(g, [[0, '#0a0204'], [0.3, '#2a0808'], [0.46, '#6a1a0a'], [0.5, '#ff6a1a'], [0.54, '#5a1208'], [1, '#1a0404']], { stars: 30, starBand: 0.3, r: 120, y: -10 });
  // el magma de abajo, que corre despacio (la animación del piso la maneja el minijuego)
  const sg = scaleUV(new THREE.PlaneGeometry(240, 240, 20, 20), 26); sg.rotateX(-Math.PI / 2);
  const magma = mat({ map: TX.magma, unlit: true });
  add(sg, magma, 0, slimeY, 0, g);
  P.lavaBubbles(g, slimeY + 0.2, 8, 40, 26);
  // volcanes a lo lejos (uno grande que escupe bolas de fuego)
  P.volcano(g, -6, slimeY, -78, 70, 36);
  P.eruption(g, -6, slimeY + 70.5, -78, 90, 10, 12);
  P.volcano(g, 58, slimeY, -58, 46, 24); P.volcano(g, -64, slimeY, -40, 40, 22);
  // columnas de basalto que salen del magma y cascadas de lava desde rocas flotantes
  [[-24, slimeY, -14], [25, slimeY, -10], [-26, slimeY, 14], [22, slimeY, 18], [2, slimeY, -30]].forEach(([x, y, z], k) => P.basalt(g, x * 1.25, y, z * 1.25, 7, 1.3, 5 + k, 13 + k * 2));        // bajitas: no tapan los pisos
  P.lavafall(g, 40, slimeY, -40, -0.6, 22, 4); P.lavafall(g, -42, slimeY, -34, 0.7, 20, 3.5);
  // rocas flotando alrededor de los pisos
  [[-19, -3, -12, 1.2, true], [20, -6, -11, 1.0, false], [-22, -12, 10, 1.3, true], [21, -10, 13, 1.1, true], [0, -8, -25, 1.4, false], [-9, -18, 21, 0.9, true], [12, -20, -19, 1.0, false]]
    .forEach(([x, y, z, s, gl]) => floatRock(g, x, y, z, s, gl));
  // brasas que suben y ceniza que cae
  P.drift(g, 70, -30, 30, slimeY, 12, -30, 30, 0xff8a2a, 0.16, 1.6);
  P.drift(g, 50, -34, 34, 16, slimeY, -34, 34, 0x5a5058, 0.12, 0.6, false);
  // humo en el horizonte
  P.smoke(g, 20, slimeY + 6, -60, 6, 5, 0x3a2a2a); P.smoke(g, -40, slimeY + 6, -50, 5, 4, 0x3a2a2a);
  return magma;
}
