// Decorado de HEXÁGONOS: los pisos flotan en un cielo celeste con nubes, globos y un arcoíris; abajo de todo, el slime.
import * as THREE from 'three';
import { add, mat, scaleUV, waterMat } from '../render/psx.js';
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
  const slimeM = waterMat({ map: TX.slime, color: 0xe0ffb0, deep: 0x3a8a1a, sky: 0xf0ffd8, glint: 1, foam: 0.15, wave: 0.35 });
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
  // globos aerostáticos que suben y bajan despacio, y bandadas de pájaros
  [[-20, -2, 4, 0xff5a4a, 0xffe14a], [22, -8, -6, 0x4a8cff, 0xffffff], [6, -14, -24, 0x39d98a, 0xffd23a]].forEach(([x, y, z, c1, c2], k) => {
    const hb = grp(g, x, y, z);
    const env = add(new THREE.SphereGeometry(2.4, 10, 8), P.M(0xffffff, { map: TX.stripes }), 0, 3, 0, hb); env.scale.y = 1.2;
    env.material = P.M(c1, { map: TX.stripes });
    add(new THREE.ConeGeometry(1.4, 1.6, 10), P.M(c2), 0, 0.2, 0, hb).rotation.x = Math.PI;
    add(new THREE.BoxGeometry(1, 0.8, 1), P.M(0x9a6a3a, { map: TX.wood }), 0, -1.4, 0, hb);
    [[-0.45, -0.45], [0.45, -0.45], [-0.45, 0.45], [0.45, 0.45]].forEach(([a2, b2]) => add(new THREE.CylinderGeometry(0.02, 0.02, 1.2, 3), P.M(0x3a2a1a), a2, -0.6, b2, hb));
    P.anim(hb, (t) => { hb.position.y = y + Math.sin(t * 0.25 + k * 2) * 2.5; hb.rotation.y = t * 0.08 + k; });
  });
  P.flyers(g, 0, 6, 0, 24, 6, 0x2a2a34, 0.45); P.flyers(g, -6, -4, 8, 19, 4, 0xffffff, 0.4);
  P.blimp(g, 0, 6, -4, 26, 0.035, 0xfff4e6, 0xff5a4a);
  // mariposas gigantes de colores que revolotean cerca de los pisos
  for (let k = 0; k < 4; k++) {
    const bf = grp(g), col = [0xff8ac8, 0xffe14a, 0x8ad8ff, 0xb08aff][k];
    const wl = [-1, 1].map((sd) => add(new THREE.BoxGeometry(1.2, 0.04, 0.9), P.M(col, { side: THREE.DoubleSide }), sd * 0.6, 0, 0, grp(bf)).parent);
    add(new THREE.BoxGeometry(0.15, 0.15, 0.9), P.M(0x2a2a34), 0, 0, 0, bf);
    const a0 = (k / 4) * Math.PI * 2, d = 17 + k, y0 = -2 - k * 3;
    P.anim(bf, (t) => { const a = a0 + t * 0.15; bf.position.set(Math.sin(a) * d, y0 + Math.sin(t * 1.5 + k) * 1.2, Math.cos(a) * d); bf.rotation.y = a + Math.PI / 2; wl.forEach((w, i) => { w.rotation.z = (i ? -1 : 1) * Math.sin(t * 9 + k) * 0.8; }); });
  }
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
  const choco = waterMat({ map: TX.choco, color: 0xd09070, deep: 0x3a1a08, sky: 0xffd8c0, glint: 0.9, foam: 0, wave: 0.3 });
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
  // más cerca de los pisos: donas que giran, cucuruchos de helado y ositos de goma saltando en nubes de algodón
  [[-17, -2, 5, 0xffb0d8], [16.5, -7, -5, 0x8a4a2a], [-5, -13, -19, 0xfff0a0], [10, -16, 16, 0xb0e0ff]].forEach(([x, y, z, c], k) => {
    const d = grp(g, x, y, z);
    add(new THREE.TorusGeometry(1.3, 0.6, 8, 16), P.M(0xd8a060, { map: TX.wafer }), 0, 0, 0, d);
    const fr = add(new THREE.TorusGeometry(1.3, 0.62, 8, 16, Math.PI * 2), P.M(c, { map: TX.frosting }), 0, 0.12, 0, d); fr.scale.set(1, 1, 0.6);
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; add(new THREE.BoxGeometry(0.25, 0.08, 0.08), P.M([0xff3a5a, 0x3ad86a, 0xffd23a, 0x3a9aff][i % 4], { unlit: true }), Math.sin(a) * 1.3, Math.cos(a) * 1.3, 0.45, d).rotation.z = a * 2; }
    const ph = k * 1.4; P.anim(d, (t) => { d.rotation.set(Math.sin(t * 0.5 + ph) * 0.5 + 1.1, t * 0.3 + ph, 0); d.position.y = y + Math.sin(t * 0.7 + ph) * 0.6; });
  });
  [[17, -3, 8, 0xffb0d8], [-16.5, -10, -7, 0xb0ffd0], [3, -6, -19, 0xfff0a0]].forEach(([x, y, z, c], k) => {
    const ic = grp(g, x, y, z);
    add(new THREE.ConeGeometry(0.8, 2.6, 8), P.M(0xd8a060, { map: TX.wafer }), 0, -1.3, 0, ic).rotation.x = Math.PI;
    add(new THREE.SphereGeometry(0.95, 10, 8), P.M(c, { map: TX.frosting }), 0, 0.3, 0, ic);
    add(new THREE.SphereGeometry(0.2, 6, 5), P.M(0xe8203a), 0, 1.3, 0, ic);
    const ph = k * 2; P.anim(ic, (t) => { ic.position.y = y + Math.sin(t * 0.6 + ph) * 0.7; ic.rotation.z = Math.sin(t * 0.4 + ph) * 0.3; });
  });
  [[-15, -6, 13, 0xff3a5a], [15, -11, -14, 0x3ad86a], [0, -9, 19, 0xffd23a]].forEach(([x, y, z, c], k) => {
    const cl = cottonCloud(g, x, y, z, 0.8, 0xffffff), bm = P.M(c);
    const bear = grp(cl, 0, 2.2, 0);
    add(new THREE.SphereGeometry(0.55, 8, 6), bm, 0, 0, 0, bear).scale.set(1, 1.2, 0.8);
    add(new THREE.SphereGeometry(0.42, 8, 6), bm, 0, 0.85, 0, bear);
    [-0.3, 0.3].forEach((sx) => { add(new THREE.SphereGeometry(0.16, 6, 4), bm, sx, 1.2, 0, bear); add(new THREE.SphereGeometry(0.2, 6, 4), bm, sx * 1.6, 0.1, 0, bear); add(new THREE.SphereGeometry(0.22, 6, 4), bm, sx, -0.6, 0, bear); });
    const ph = k * 1.1; P.anim(bear, (t) => { const u = Math.abs(Math.sin(t * 2.4 + ph)); bear.position.y = 2.2 + u * 1.4; bear.scale.set(1 + (1 - u) * 0.15, 1 - (1 - u) * 0.15, 1); bear.rotation.y = t + ph; });
  });
  // una fuente de chocolate flotando, con el chorro que cae
  const fu = grp(g, -18, -6, -8);
  [2, 1.4, 0.8].forEach((r, i) => { add(new THREE.CylinderGeometry(r, r * 0.9, 0.35, 12), P.M(0xffffff, { map: TX.wafer }), 0, i * 1.3, 0, fu); add(new THREE.CylinderGeometry(r * 0.92, r * 0.92, 0.1, 12), P.M(0x7a3a1a, { map: TX.choco }), 0, i * 1.3 + 0.2, 0, fu); });
  add(new THREE.CylinderGeometry(0.2, 0.2, 2.8, 6), P.M(0xffffff, { map: TX.wafer }), 0, 1.3, 0, fu);
  const fall = add(new THREE.CylinderGeometry(1.6, 2.1, 1.2, 12, 1, true), P.M(0x6a2a10, { map: TX.choco, side: THREE.DoubleSide }), 0, 0.6, 0, fu);
  P.anim(fu, (t) => { fu.position.y = -6 + Math.sin(t * 0.5) * 0.6; fall.scale.set(1 + Math.sin(t * 6) * 0.03, 1, 1 + Math.cos(t * 6) * 0.03); });
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
  // islitas flotantes con palmeras de neón (contornos que brillan) alrededor de los pisos
  const neonLine = (geo, col) => new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: col, fog: false }));
  const palm = (x, y, z, col, s) => {
    const pg = grp(g, x, y, z); pg.scale.setScalar(s);
    const base = new THREE.CylinderGeometry(2.2, 0.6, 1.4, 6);
    add(base, P.M(0x14082a), 0, -0.7, 0, pg); const bl = neonLine(base, 0x3af0ff); bl.position.y = -0.7; pg.add(bl);
    for (let k = 0; k < 5; k++) { const tg = new THREE.CylinderGeometry(0.22, 0.26, 0.9, 5), seg = neonLine(tg, col); seg.position.set(k * 0.14, 0.45 + k * 0.85, 0); seg.rotation.z = -0.14; pg.add(seg); }
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2, lg = new THREE.BoxGeometry(0.5, 0.05, 2.2), lf = neonLine(lg, 0x39ff9a);
      lf.position.set(0.7 + Math.sin(a) * 1, 4.4, Math.cos(a) * 1); lf.rotation.set(0.5, a, 0, 'YXZ'); pg.add(lf);
    }
    const ph = rnd(0, 6); P.anim(pg, (t) => { pg.position.y = y + Math.sin(t * 0.6 + ph) * 0.6; });
  };
  [[-17, -3, 6, 0xff3aa8, 1], [17, -5, -4, 0xffe03a, 1.1], [-14, -9, -16, 0x9a5aff, 0.9], [15, -11, 14, 0x3af0ff, 1.2], [4, -15, 19, 0xff3aa8, 1], [-6, -13, -21, 0xffe03a, 1]].forEach(([x, y, z, c2, sc]) => palm(x, y, z, c2, sc));
  // reflectores: rayos de luz de colores que barren desde abajo
  const beams = [0xff3aa8, 0x3af0ff, 0x9a5aff, 0xffe03a].map((c2, k) => {
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 2.4, 60, 8, 1, true), new THREE.MeshBasicMaterial({ color: c2, transparent: true, opacity: 0.1, depthWrite: false, fog: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
    b.geometry.translate(0, 30, 0);
    const a = (k / 4) * Math.PI * 2 + 0.4, bg = grp(g, Math.sin(a) * 30, slimeY + 2, Math.cos(a) * 30); bg.add(b);
    return { bg, ph: k * 1.6 };
  });
  P.anim(g, (t) => beams.forEach((q) => { q.bg.rotation.x = Math.sin(t * 0.4 + q.ph) * 0.45; q.bg.rotation.z = Math.cos(t * 0.33 + q.ph) * 0.45; }));
  // cubos de neón chiquitos dando vueltas cerca
  for (let k = 0; k < 10; k++) {
    const cg = new THREE.BoxGeometry(0.9, 0.9, 0.9), cu = neonLine(cg, [0x3af0ff, 0xff3aa8, 0xffe03a][k % 3]);
    const a0 = (k / 10) * Math.PI * 2, d = rnd(16, 22), y0 = rnd(-14, 3), sp = rnd(0.05, 0.1); g.add(cu);
    P.anim(cu, (t) => { const a = a0 + t * sp; cu.position.set(Math.sin(a) * d, y0 + Math.sin(t + k) * 0.8, Math.cos(a) * d); cu.rotation.set(t * 0.8 + k, t * 0.6, 0); });
  }
  P.ufo(g, 0, 4, 0, 20, 0.15, 0x3af0ff);
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
  const magma = waterMat({ map: TX.magma, color: 0xffffff, emit: 1, glint: 0.3, foam: 0, wave: 0.3 });
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
  // rocas flotantes más cerca, con un hilo de lava que cae de cada una
  [[-16, -5, 5, 0.7], [16, -9, -3, 0.8], [-12, -15, -15, 0.6], [13, -13, 15, 0.7]].forEach(([x, y, z, sc]) => {
    const r = floatRock(g, x, y, z, sc, true);
    const fall = add(new THREE.BoxGeometry(0.35, 18, 0.35), P.M(0xff8a2a, { unlit: true }), 0, -11, 0, r);
    P.anim(fall, (t) => { fall.scale.x = 1 + Math.sin(t * 6 + x) * 0.25; });
  });
  // meteoritos de fuego que cruzan el cielo cada tanto
  const mets = [0, 1, 2].map((k) => {
    const m = grp(g); m.visible = false;
    add(new THREE.DodecahedronGeometry(0.9, 0), P.M(0xffc04a, { unlit: true }), 0, 0, 0, m);
    for (let i = 1; i < 6; i++) add(new THREE.BoxGeometry(0.6 - i * 0.08, 0.6 - i * 0.08, 0.6 - i * 0.08), P.M(i < 3 ? 0xff7a1a : 0x8a2a1a, { unlit: true }), -i * 0.9, i * 0.5, 0, m);
    return { m, t: 2 + k * 3.1 };
  });
  P.anim(g, (t, dt) => mets.forEach((q) => {
    q.t -= dt;
    if (q.t <= 0 && !q.m.visible) { q.m.visible = true; q.u = 0; q.a = rnd(0, Math.PI * 2); q.from = [Math.sin(q.a) * 50, 26, Math.cos(q.a) * 50 - 20]; q.to = [Math.sin(q.a + 2.2) * 40, -6, Math.cos(q.a + 2.2) * 40 - 30]; }
    if (q.m.visible) {
      q.u += dt * 0.35; const u = q.u, f = q.from, e = q.to;
      q.m.position.set(f[0] + (e[0] - f[0]) * u, f[1] + (e[1] - f[1]) * u, f[2] + (e[2] - f[2]) * u);
      q.m.rotation.y = Math.atan2(-(e[2] - f[2]), e[0] - f[0]);
      if (u >= 1) { q.m.visible = false; q.t = rnd(4, 9); }
    }
  }));
  // fueguitos que flotan alrededor de los pisos (espíritus de fuego)
  for (let k = 0; k < 6; k++) {
    const w = grp(g), a0 = (k / 6) * Math.PI * 2, d = rnd(15, 19), y0 = rnd(-14, 2);
    const f1 = add(new THREE.ConeGeometry(0.5, 1.4, 6), P.M(0xff7a1a, { unlit: true }), 0, 0, 0, w), f2 = add(new THREE.ConeGeometry(0.28, 0.9, 6), P.M(0xffe07a, { unlit: true }), 0, -0.15, 0, w);
    [-0.15, 0.15].forEach((sx) => add(new THREE.BoxGeometry(0.1, 0.12, 0.05), P.M(0x2a0a0a), sx, -0.2, 0.42, w));
    P.anim(w, (t) => { const a = a0 + t * 0.2; w.position.set(Math.sin(a) * d, y0 + Math.sin(t * 1.4 + k) * 1, Math.cos(a) * d); w.rotation.y = a + Math.PI; const s2 = 1 + Math.sin(t * 10 + k) * 0.15; f1.scale.set(1, s2, 1); f2.scale.set(1, 2 - s2, 1); });
  }
  return magma;
}
