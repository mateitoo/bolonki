// Texturas procedurales de baja resolución, sin filtrado (look PS1).
import * as THREE from 'three';
import { rnd } from '../config.js';
import { setWhiteTexture } from './psx.js';

function tex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
function noisy(x, w, h, base, amt) {
  x.fillStyle = base; x.fillRect(0, 0, w, h);
  for (let i = 0; i < (w * h) / 3; i++) {
    const v = Math.random() < 0.5 ? 0 : 255;
    x.fillStyle = `rgba(${v},${v},${v},${amt * Math.random()})`;
    x.fillRect((Math.random() * w) | 0, (Math.random() * h) | 0, 1, 1);
  }
}

export const TX = {
  white: tex(4, 4, (x) => { x.fillStyle = '#fff'; x.fillRect(0, 0, 4, 4); }),
  floor: tex(64, 64, (x, w, h) => {           // piso claro, metálico, con vetas
    x.fillStyle = '#a9b5b8'; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 60; i++) {
      x.fillStyle = Math.random() < 0.5 ? 'rgba(230,240,240,.10)' : 'rgba(40,60,70,.10)';
      x.fillRect(Math.random() * w, Math.random() * h, rnd(10, 40), rnd(1, 4));
    }
    for (let i = 0; i < (w * h) / 2; i++) {
      const v = Math.random() < 0.5 ? 0 : 255;
      x.fillStyle = `rgba(${v},${v},${v},${0.07 * Math.random()})`;
      x.fillRect((Math.random() * w) | 0, (Math.random() * h) | 0, 1, 1);
    }
  }),
  lights: tex(16, 8, (x, w, h) => {           // tira de luces cian del borde
    x.fillStyle = '#0a1418'; x.fillRect(0, 0, w, h);
    x.fillStyle = '#0f7e86'; x.fillRect(2, 1, 12, 6);
    x.fillStyle = '#35f0ff'; x.fillRect(3, 2, 10, 4);
    x.fillStyle = '#c8ffff'; x.fillRect(5, 3, 5, 1);
  }),
  outer: tex(32, 32, (x, w, h) => { noisy(x, w, h, '#0d1119', 0.25); x.fillStyle = '#161d2c'; x.fillRect(0, 0, w, 1); x.fillRect(0, 0, 1, h); }),
  rim: tex(32, 16, (x, w, h) => { noisy(x, w, h, '#1f3438', 0.25); x.fillStyle = '#0d1a1d'; x.fillRect(0, 0, w, 2); x.fillStyle = '#35f0ff'; for (let i = 2; i < w; i += 8) x.fillRect(i, 8, 4, 3); }),
  tower: tex(32, 32, (x, w, h) => {
    noisy(x, w, h, '#1e4a4c', 0.2);
    x.fillStyle = '#0d2729'; for (let i = 0; i < w; i += 8) x.fillRect(i, 0, 1, h);
    x.fillStyle = '#35f0ff'; for (let i = 2; i < w; i += 8) x.fillRect(i, 24, 4, 3);
    x.fillStyle = '#12302f'; x.fillRect(0, 12, w, 2);
  }),
  bronze: tex(16, 16, (x, w, h) => { noisy(x, w, h, '#8a6a3c', 0.25); x.fillStyle = '#5e4424'; for (let i = 0; i < w; i += 4) x.fillRect(i, 0, 1, h); }),
  stripes: tex(8, 16, (x, w, h) => { x.fillStyle = '#fff1f1'; x.fillRect(0, 0, w, h); x.fillStyle = '#ff1e2a'; x.fillRect(0, 0, w, 8); }),
  hull: tex(16, 16, (x, w, h) => { noisy(x, w, h, '#bfe9e0', 0.2); x.fillStyle = '#8ccfc2'; x.fillRect(0, 11, w, 2); }),
  metal: tex(16, 16, (x, w, h) => { noisy(x, w, h, '#9aa3b8', 0.25); x.fillStyle = '#6d768c'; x.fillRect(0, 7, w, 2); }),
  chrome: tex(4, 32, (x, w, h) => {           // bandas de reflejo de la pelota cromada
    const g = [['#ffffff', 0], ['#dff1ff', 5], ['#9fc6de', 10], ['#4b6070', 15], ['#2a3440', 16], ['#8795a2', 19], ['#c9d3dc', 25], ['#eef3f6', 30]];
    for (let i = 0; i < g.length; i++) {
      const y0 = g[i][1], y1 = i + 1 < g.length ? g[i + 1][1] : h;
      x.fillStyle = g[i][0]; x.fillRect(0, y0, w, y1 - y0);
    }
  }),
  pit: tex(16, 16, (x, w, h) => { noisy(x, w, h, '#05070b', 0.3); }),
  // Empujón: hielo de la plataforma, roca de abajo y magma del fondo
  ice: tex(32, 32, (x, w, h) => {
    x.fillStyle = '#9fd4e6'; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 40; i++) { x.fillStyle = Math.random() < 0.5 ? 'rgba(255,255,255,.18)' : 'rgba(40,90,120,.12)'; x.fillRect(Math.random() * w, Math.random() * h, rnd(3, 12), rnd(1, 3)); }
    x.fillStyle = 'rgba(30,70,100,.55)';
    for (let k = 0; k < 3; k++) { let cx = Math.random() * w, cy = Math.random() * h; for (let i = 0; i < 12; i++) { cx += rnd(-2, 2.5); cy += rnd(-1, 2); x.fillRect(cx | 0, cy | 0, 1, 1); } }
    x.fillStyle = '#e8fbff'; x.fillRect(3, 3, 2, 1); x.fillRect(20, 14, 3, 1);
  }),
  // Fiesta: pasto de la isla, bloque del dado
  grass: tex(32, 32, (x, w, h) => {
    x.fillStyle = '#3f8a3a'; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 90; i++) { x.fillStyle = ['#4fa246', '#357a31', '#5cb450', '#2e6b2a'][(Math.random() * 4) | 0]; x.fillRect(Math.random() * w, Math.random() * h, 1, rnd(1, 3)); }
    x.fillStyle = '#e8e070'; x.fillRect(6, 9, 1, 1); x.fillRect(22, 25, 1, 1);
  }),
  dice: tex(16, 16, (x, w, h) => {
    x.fillStyle = '#ffc83a'; x.fillRect(0, 0, w, h);
    x.fillStyle = '#b8801a'; x.fillRect(0, 0, w, 1); x.fillRect(0, 0, 1, h); x.fillRect(0, h - 1, w, 1); x.fillRect(w - 1, 0, 1, h);
    x.fillStyle = '#fff6d0'; [[6, 3], [7, 3], [8, 3], [9, 4], [9, 5], [8, 6], [7, 7], [7, 8], [7, 11], [7, 12]].forEach(([a, b]) => x.fillRect(a, b, 2, 1));
  }),
  rock: tex(16, 16, (x, w, h) => { noisy(x, w, h, '#3a3440', 0.3); x.fillStyle = '#26212b'; x.fillRect(0, 5, w, 1); x.fillRect(0, 12, w, 1); }),
  pebble: tex(16, 16, (x, w, h) => { noisy(x, w, h, '#d8d2ca', 0.22); x.fillStyle = 'rgba(0,0,0,.12)'; x.fillRect(0, 6, w, 1); x.fillRect(5, 11, w, 1); }),   // piedra clara (se tiñe)
  magma: tex(32, 32, (x, w, h) => {
    x.fillStyle = '#3a0a04'; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 70; i++) { x.fillStyle = ['#7a1a06', '#b8320a', '#ff6a14', '#ffb040'][(Math.random() * 4) | 0]; x.fillRect(Math.random() * w, Math.random() * h, rnd(1, 5), rnd(1, 3)); }
  }),
  // Bombardeo: baldosas de metal, bloques que caen y franjas de peligro
  tile: tex(32, 32, (x, w, h) => {
    noisy(x, w, h, '#8a93a6', 0.22);
    x.fillStyle = '#5b6376'; x.fillRect(0, 0, w, 2); x.fillRect(0, 0, 2, h);
    x.fillStyle = '#b4bccc'; x.fillRect(0, h - 2, w, 2); x.fillRect(w - 2, 0, 2, h);
    x.fillStyle = 'rgba(60,68,86,.35)'; for (let i = 6; i < w - 4; i += 6) x.fillRect(4, i, w - 8, 1);
    x.fillStyle = '#3e4456'; [[4, 4], [w - 6, 4], [4, h - 6], [w - 6, h - 6]].forEach(([a, b]) => x.fillRect(a, b, 2, 2));
  }),
  block: tex(32, 32, (x, w, h) => {
    noisy(x, w, h, '#4c5262', 0.25);
    x.fillStyle = '#6d7488'; x.fillRect(0, 0, w, 3); x.fillRect(0, 0, 3, h);
    x.fillStyle = '#2c3040'; x.fillRect(0, h - 3, w, 3); x.fillRect(w - 3, 0, 3, h);
    x.fillStyle = '#f2c21a'; x.fillRect(3, 12, w - 6, 8);                       // franja de peligro
    x.fillStyle = '#1c1c22'; for (let y = 0; y < 8; y++) for (let i = -8; i < w; i += 6) x.fillRect(Math.max(3, i + y), 12 + y, 3, 1);
    x.fillStyle = '#9aa2b6'; [[6, 6], [w - 8, 6], [6, h - 8], [w - 8, h - 8]].forEach(([a, b]) => x.fillRect(a, b, 2, 2));
  }),
  hazard: tex(16, 16, (x, w, h) => {
    x.fillStyle = '#f2c21a'; x.fillRect(0, 0, w, h);
    x.fillStyle = '#1c1c22'; for (let y = 0; y < h; y++) for (let i = -h; i < w; i += 8) x.fillRect(i + y, y, 4, 1);
  }),
  // Petardos: pasto a cuadros, ladrillo (fijo), cajón de madera (se rompe) e íconos de poderes
  turf: tex(32, 32, (x, w, h) => {
    x.fillStyle = '#4f9a3c'; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 70; i++) { x.fillStyle = ['#5caa46', '#468c35', '#63b44c'][(Math.random() * 3) | 0]; x.fillRect(Math.random() * w, Math.random() * h, 1, rnd(1, 3)); }
    x.fillStyle = 'rgba(0,0,0,.12)'; x.fillRect(0, h - 1, w, 1); x.fillRect(w - 1, 0, 1, h);
  }),
  brick: tex(32, 32, (x, w, h) => {
    x.fillStyle = '#6c6f7c'; x.fillRect(0, 0, w, h);
    for (let r = 0; r < 4; r++) for (let c = -1; c < 3; c++) {
      const bx = c * 16 + (r % 2 ? 8 : 0), by = r * 8;
      x.fillStyle = ['#8a8e9c', '#7d8190', '#949aa8'][(r + c + 3) % 3]; x.fillRect(bx + 1, by + 1, 14, 6);
      x.fillStyle = '#a7adbb'; x.fillRect(bx + 1, by + 1, 14, 1);
    }
  }),
  crate: tex(32, 32, (x, w, h) => {
    x.fillStyle = '#b07a3c'; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 4; i++) { x.fillStyle = i % 2 ? '#a06c32' : '#bb8646'; x.fillRect(3, 3 + i * 6.5, w - 6, 6); }
    x.fillStyle = '#6e4620'; x.fillRect(0, 0, w, 3); x.fillRect(0, h - 3, w, 3); x.fillRect(0, 0, 3, h); x.fillRect(w - 3, 0, 3, h);
    for (let i = 0; i < w - 6; i++) { x.fillRect(3 + i, 3 + i * ((h - 8) / (w - 6)), 3, 2); }
    x.fillStyle = '#d8d0b0'; [[1, 1], [w - 3, 1], [1, h - 3], [w - 3, h - 3]].forEach(([a, b]) => x.fillRect(a, b, 2, 2));
  }),
  sand: tex(32, 32, (x, w, h) => {
    x.fillStyle = '#d8b26a'; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 80; i++) { x.fillStyle = ['#e2c07c', '#c9a15a', '#ecd092'][(Math.random() * 3) | 0]; x.fillRect(Math.random() * w, Math.random() * h, rnd(1, 3), 1); }
    x.fillStyle = 'rgba(0,0,0,.1)'; x.fillRect(0, h - 1, w, 1); x.fillRect(w - 1, 0, 1, h);
  }),
  snow: tex(32, 32, (x, w, h) => {
    x.fillStyle = '#e8eef8'; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 60; i++) { x.fillStyle = ['#f8fbff', '#d6e0ee', '#ffffff'][(Math.random() * 3) | 0]; x.fillRect(Math.random() * w, Math.random() * h, rnd(1, 3), 1); }
    x.fillStyle = 'rgba(0,0,40,.08)'; x.fillRect(0, h - 1, w, 1); x.fillRect(w - 1, 0, 1, h);
  }),
  belt: tex(16, 16, (x, w, h) => {                 // cinta transportadora: flechas hacia "arriba" de la textura
    x.fillStyle = '#2a2d36'; x.fillRect(0, 0, w, h);
    x.fillStyle = '#44485a'; x.fillRect(0, 0, 2, h); x.fillRect(w - 2, 0, 2, h);
    x.fillStyle = '#f2c21a'; for (let k = 0; k < 5; k++) { x.fillRect(3 + k, 9 - k, 2, 2); x.fillRect(11 - k, 9 - k, 2, 2); }
  }),
  quicksand: tex(32, 32, (x, w, h) => {
    x.fillStyle = '#a4783c'; x.fillRect(0, 0, w, h);
    for (let a = 0; a < 26; a += 0.12) { const r = a * 0.6; x.fillStyle = a % 2 < 1 ? '#8a6230' : '#b88a4a'; x.fillRect(16 + Math.cos(a) * r, 16 + Math.sin(a) * r, 2, 2); }
  }),
  puBoots: tex(16, 16, (x, w, h) => {
    x.fillStyle = '#8a3ad8'; x.fillRect(0, 0, w, h); x.fillStyle = '#d0a0ff'; x.fillRect(0, 0, w, 1); x.fillRect(0, 0, 1, h);
    x.fillStyle = '#ffd23a'; x.fillRect(5, 3, 4, 7); x.fillRect(5, 9, 8, 3); x.fillStyle = '#b8801a'; x.fillRect(5, 12, 8, 1);
    x.fillStyle = '#fff'; x.fillRect(1, 4, 3, 1); x.fillRect(2, 6, 3, 1); x.fillRect(1, 8, 3, 1);
  }),
  puShield: tex(16, 16, (x, w, h) => {
    x.fillStyle = '#1fa8b8'; x.fillRect(0, 0, w, h); x.fillStyle = '#a0f0ff'; x.fillRect(0, 0, w, 1); x.fillRect(0, 0, 1, h);
    x.fillStyle = '#e8fbff'; x.fillRect(4, 3, 8, 6); x.fillRect(5, 9, 6, 2); x.fillRect(6, 11, 4, 1); x.fillRect(7, 12, 2, 1);
    x.fillStyle = '#1fa8b8'; x.fillRect(7, 4, 2, 6); x.fillRect(5, 6, 6, 2);
  }),
  puKick: tex(16, 16, (x, w, h) => {
    x.fillStyle = '#e07a1a'; x.fillRect(0, 0, w, h); x.fillStyle = '#ffc080'; x.fillRect(0, 0, w, 1); x.fillRect(0, 0, 1, h);
    x.fillStyle = '#fff'; x.fillRect(3, 4, 3, 6); x.fillRect(3, 9, 7, 3);
    x.fillStyle = '#111'; x.fillRect(10, 6, 4, 4); x.fillRect(11, 5, 2, 6); x.fillStyle = '#ffd23a'; x.fillRect(13, 4, 1, 1);
  }),
  puSkull: tex(16, 16, (x, w, h) => {
    x.fillStyle = '#5a1a7a'; x.fillRect(0, 0, w, h); x.fillStyle = '#a060c8'; x.fillRect(0, 0, w, 1); x.fillRect(0, 0, 1, h);
    x.fillStyle = '#f0ece0'; x.fillRect(4, 3, 8, 7); x.fillRect(3, 4, 10, 5); x.fillRect(5, 10, 6, 3);
    x.fillStyle = '#111'; x.fillRect(5, 6, 2, 2); x.fillRect(9, 6, 2, 2); x.fillRect(7, 9, 2, 1); x.fillRect(6, 12, 1, 1); x.fillRect(9, 12, 1, 1);
  }),
  fire: tex(16, 16, (x, w, h) => {
    x.fillStyle = '#ff7a14'; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 40; i++) { x.fillStyle = ['#ffd23a', '#fff6b0', '#ff9a1f', '#ffe070'][(Math.random() * 4) | 0]; x.fillRect(Math.random() * w, Math.random() * h, rnd(1, 4), rnd(1, 3)); }
  }),
  puBomb: tex(16, 16, (x, w, h) => {
    x.fillStyle = '#2f6fe0'; x.fillRect(0, 0, w, h); x.fillStyle = '#9cc0ff'; x.fillRect(0, 0, w, 1); x.fillRect(0, 0, 1, h);
    x.fillStyle = '#111'; x.fillRect(4, 6, 8, 7); x.fillRect(5, 5, 6, 9); x.fillRect(3, 7, 10, 5);
    x.fillStyle = '#fff'; x.fillRect(5, 7, 2, 2); x.fillStyle = '#c8a060'; x.fillRect(9, 3, 2, 3); x.fillStyle = '#ffd23a'; x.fillRect(11, 2, 2, 2);
  }),
  puFire: tex(16, 16, (x, w, h) => {
    x.fillStyle = '#d8321e'; x.fillRect(0, 0, w, h); x.fillStyle = '#ff9a80'; x.fillRect(0, 0, w, 1); x.fillRect(0, 0, 1, h);
    x.fillStyle = '#ffb31a'; x.fillRect(5, 5, 6, 8); x.fillRect(4, 8, 8, 5); x.fillRect(7, 2, 2, 4);
    x.fillStyle = '#fff27a'; x.fillRect(6, 9, 4, 4);
  }),
  puSpeed: tex(16, 16, (x, w, h) => {
    x.fillStyle = '#27a85a'; x.fillRect(0, 0, w, h); x.fillStyle = '#9af0b8'; x.fillRect(0, 0, w, 1); x.fillRect(0, 0, 1, h);
    x.fillStyle = '#fff'; x.fillRect(3, 9, 9, 3); x.fillRect(4, 6, 4, 4); x.fillRect(11, 10, 2, 2);
    x.fillStyle = '#ffd23a'; x.fillRect(1, 5, 3, 1); x.fillRect(0, 8, 3, 1); x.fillRect(1, 11, 2, 1);
  }),
  /* ---------- decorado de los escenarios ---------- */
  water: tex(32, 32, (x, w, h) => {
    x.fillStyle = '#2f78c8'; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 14; i++) { x.fillStyle = i % 2 ? 'rgba(170,220,255,.55)' : 'rgba(20,60,130,.4)'; x.fillRect((Math.random() * w) | 0, (Math.random() * h) | 0, rnd(4, 10), 1); }
  }),
  wood: tex(16, 16, (x, w, h) => {
    noisy(x, w, h, '#9a6a3c', 0.08);
    x.fillStyle = 'rgba(60,30,10,.35)'; for (let i = 3; i < h; i += 5) x.fillRect(0, i, w, 1);
  }),
  roof: tex(16, 16, (x, w, h) => {
    x.fillStyle = '#b8402e'; x.fillRect(0, 0, w, h);
    x.fillStyle = 'rgba(60,10,5,.4)'; for (let i = 0; i < h; i += 4) { x.fillRect(0, i, w, 1); for (let j = (i / 4) % 2 ? 0 : 2; j < w; j += 4) x.fillRect(j, i, 1, 4); }
  }),
  leaf: tex(16, 16, (x, w, h) => { noisy(x, w, h, '#ffffff', 0.18); }),
  stone: tex(16, 16, (x, w, h) => { noisy(x, w, h, '#b8b4ae', 0.14); x.fillStyle = 'rgba(0,0,0,.18)'; x.fillRect(0, 7, w, 1); x.fillRect(7, 0, 1, 7); x.fillRect(3, 8, 1, 8); }),
  window: tex(8, 8, (x, w, h) => { x.fillStyle = '#ffe9a0'; x.fillRect(0, 0, w, h); x.fillStyle = '#6b4a2a'; x.fillRect(3, 0, 2, h); x.fillRect(0, 3, w, 2); }),
  /* ---------- personajes con ropa (payaso, gnomo) ---------- */
  // caras: van en una esfera; el frente (+z) queda en u = 0.25 -> x = 32 de 128. Arriba de la imagen = arriba de la cabeza
  clownFace: tex(128, 64, (x, w, h) => {
    noisy(x, w, h, '#a9ccd4', 0.03);
    x.fillStyle = 'rgba(40,70,90,.18)'; x.fillRect(64, 0, 64, h);          // la nuca un poco más oscura
    const star = (cx, cy, R, r) => {
      x.beginPath();
      for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + (k * Math.PI) / 5, rr = k % 2 ? r : R; x.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); }
      x.closePath(); x.fill();
    };
    x.fillStyle = '#3a2624'; star(24.5, 30, 5.5, 2.4); star(39.5, 30, 5.5, 2.4);
    // boca triste: labios gruesos con las puntas para abajo
    x.fillStyle = '#d2645e';
    x.beginPath(); x.moveTo(23, 43); x.quadraticCurveTo(32, 34, 41, 43); x.quadraticCurveTo(32, 40, 23, 43); x.fill();
    x.beginPath(); x.moveTo(24, 42); x.quadraticCurveTo(32, 37.5, 40, 42); x.lineTo(40, 43.5); x.quadraticCurveTo(32, 45, 24, 43.5); x.fill();
    x.fillStyle = '#7a2e2e'; x.fillRect(26, 40, 12, 1);
  }),
  gnomeFace: tex(128, 64, (x, w, h) => {
    noisy(x, w, h, '#dea07a', 0.03);
    x.fillStyle = 'rgba(120,50,30,.12)'; x.fillRect(64, 0, 64, h);
    // ojos de costado (mirada canchera), párpados
    [[25, 28], [38, 28]].forEach(([ex, ey]) => {
      x.fillStyle = '#f4f0ea'; x.fillRect(ex - 3, ey - 2, 7, 4);
      x.fillStyle = '#111'; x.fillRect(ex + 1, ey - 2, 2, 4);
      x.fillStyle = '#8a5236'; x.fillRect(ex - 3, ey - 3, 7, 1);
    });
    x.fillStyle = 'rgba(200,90,70,.25)'; x.fillRect(20, 34, 5, 3); x.fillRect(40, 34, 5, 3);   // cachetes
    x.fillStyle = '#9a2a22'; x.fillRect(29, 40, 8, 2); x.fillRect(37, 39, 2, 2);                // media sonrisa
  }),
  camo: tex(32, 32, (x, w, h) => {
    x.fillStyle = '#7d7a3e'; x.fillRect(0, 0, w, h);
    const cols = ['#c7ae66', '#56602c', '#9c9552', '#c7ae66', '#4a5226'];
    for (let i = 0; i < 16; i++) {
      x.fillStyle = cols[i % cols.length];
      const cx = Math.random() * w, cy = Math.random() * h, r = rnd(2.5, 5);
      for (const [dx, dy] of [[0, 0], [w, 0], [-w, 0], [0, h], [0, -h]]) { x.beginPath(); x.ellipse(cx + dx, cy + dy, r, r * rnd(0.7, 1.2), 0, 0, Math.PI * 2); x.fill(); }
    }
    for (let i = 0; i < 180; i++) { x.fillStyle = `rgba(0,0,0,${0.08 * Math.random()})`; x.fillRect((Math.random() * w) | 0, (Math.random() * h) | 0, 1, 1); }
  }),
  hoodie: tex(32, 32, (x, w, h) => {
    noisy(x, w, h, '#62402f', 0.04);
    x.fillStyle = 'rgba(0,0,0,.18)'; x.fillRect(0, 29, w, 3); x.fillRect(15, 0, 1, h);
  }),
  knit: tex(32, 16, (x, w, h) => {
    noisy(x, w, h, '#2f62d8', 0.04);
    x.fillStyle = 'rgba(10,30,90,.35)'; for (let i = 0; i < w; i += 3) x.fillRect(i, 0, 1, h);
  }),
  tunic: tex(32, 32, (x, w, h) => { noisy(x, w, h, '#b9cd82', 0.04); x.fillStyle = 'rgba(60,80,20,.12)'; x.fillRect(0, 30, w, 2); }),
  cloth: tex(16, 16, (x, w, h) => { noisy(x, w, h, '#ffffff', 0.06); }),   // tela neutra: se tiñe con el color del material
  /* ---------- Empujón: la cara de arriba del hielo (un disco entero: centro en 64,64, radio 64) ---------- */
  iceArena: tex(128, 128, (x, w, h) => {
    x.fillStyle = '#a8dcee'; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 500; i++) { x.fillStyle = Math.random() < 0.5 ? 'rgba(255,255,255,.2)' : 'rgba(40,100,140,.12)'; x.fillRect((Math.random() * w) | 0, (Math.random() * h) | 0, rnd(2, 10) | 0, 1); }
    const C = 64, ring = (r, col, t = 1) => { x.fillStyle = col; for (let a = 0; a < Math.PI * 2; a += 0.6 / r) for (let k = 0; k < t; k++) x.fillRect((C + Math.cos(a) * (r + k)) | 0, (C + Math.sin(a) * (r + k)) | 0, 1, 1); };
    // cosas congeladas adentro del hielo (sombras oscuras): un pez, un hueso y burbujas
    x.fillStyle = 'rgba(30,70,110,.35)';
    for (let i = 0; i < 12; i++) x.fillRect(84 + i, 36 + Math.round(Math.sin(i * 0.5) * 1.5), 1, 6 - Math.abs(i - 5) * 0.5);   // pez
    x.fillRect(96, 35, 4, 2); x.fillRect(96, 41, 4, 2); x.fillRect(97, 37, 3, 4);
    x.fillRect(30, 88, 14, 2); x.fillRect(28, 86, 3, 3); x.fillRect(28, 89, 3, 3); x.fillRect(43, 86, 3, 3); x.fillRect(43, 89, 3, 3);   // hueso
    for (let i = 0; i < 18; i++) { const bx = rnd(20, 108), by = rnd(20, 108); if (Math.hypot(bx - C, by - C) < 56) { x.fillStyle = 'rgba(240,255,255,.55)'; x.fillRect(bx | 0, by | 0, 2, 2); } }
    // grietas
    x.fillStyle = 'rgba(40,90,130,.5)';
    for (let k = 0; k < 7; k++) { const a = rnd(0, 6.3); let px = C + Math.cos(a) * rnd(30, 60), py = C + Math.sin(a) * rnd(30, 60); for (let i = 0; i < 18; i++) { px += rnd(-1.5, 1.5) + Math.cos(a) * 0.4; py += rnd(-1.5, 1.5) + Math.sin(a) * 0.4; x.fillRect(px | 0, py | 0, 1, 1); } }
    // marcas de la arena: anillos, rayas de brújula y un copo en el centro
    ring(40, 'rgba(90,200,230,.8)', 2); ring(20, 'rgba(90,200,230,.7)', 1); ring(60, 'rgba(255,255,255,.5)', 2);
    x.fillStyle = 'rgba(90,200,230,.7)';
    for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2 + Math.PI / 8; for (let r = 23; r < 38; r++) x.fillRect((C + Math.cos(a) * r) | 0, (C + Math.sin(a) * r) | 0, 2, 2); }
    x.fillStyle = 'rgba(255,255,255,.85)';
    for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2; for (let r = 0; r < 12; r++) { x.fillRect((C + Math.cos(a) * r) | 0, (C + Math.sin(a) * r) | 0, 2, 2); if (r === 7) { x.fillRect((C + Math.cos(a + 0.5) * 9) | 0, (C + Math.sin(a + 0.5) * 9) | 0, 2, 2); x.fillRect((C + Math.cos(a - 0.5) * 9) | 0, (C + Math.sin(a - 0.5) * 9) | 0, 2, 2); } } }
    // escarcha en el borde
    for (let i = 0; i < 400; i++) { const a = rnd(0, 6.3), r = rnd(54, 64); x.fillStyle = `rgba(255,255,255,${rnd(0.2, 0.7)})`; x.fillRect((C + Math.cos(a) * r) | 0, (C + Math.sin(a) * r) | 0, 2, 1); }
  }),
  // Empujón, volcán: tierra con piedritas (plataforma) y barro brilloso (resbala)
  dirt: tex(32, 32, (x, w, h) => {
    x.fillStyle = '#7a5434'; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 140; i++) { x.fillStyle = ['#8a6240', '#6a4628', '#946c46', '#5a3c22'][(Math.random() * 4) | 0]; x.fillRect((Math.random() * w) | 0, (Math.random() * h) | 0, rnd(1, 3) | 0, rnd(1, 2) | 0); }
    for (let i = 0; i < 6; i++) { x.fillStyle = '#a8927a'; const px = (Math.random() * w) | 0, py = (Math.random() * h) | 0; x.fillRect(px, py, 2, 2); x.fillStyle = '#5e5044'; x.fillRect(px + 1, py + 2, 2, 1); }
  }),
  mud: tex(32, 32, (x, w, h) => {
    x.fillStyle = '#3e2818'; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 60; i++) { x.fillStyle = ['#4a3020', '#34200f', '#523624'][(Math.random() * 3) | 0]; x.fillRect((Math.random() * w) | 0, (Math.random() * h) | 0, rnd(2, 6) | 0, 1); }
    x.fillStyle = 'rgba(255,220,180,.35)';                                           // brillos de mojado
    [[5, 6, 6], [18, 12, 4], [10, 24, 5], [24, 26, 3]].forEach(([a, b, l]) => { x.fillRect(a, b, l, 1); x.fillRect(a + 1, b + 1, l - 2, 1); });
  }),
  /* ---------- Bombardeo: baldosas con marcas y la plataforma de aterrizaje del centro ---------- */
  tileVent: tex(32, 32, (x, w, h) => {
    noisy(x, w, h, '#8a93a6', 0.22);
    x.fillStyle = '#5b6376'; x.fillRect(0, 0, w, 2); x.fillRect(0, 0, 2, h); x.fillStyle = '#b4bccc'; x.fillRect(0, h - 2, w, 2); x.fillRect(w - 2, 0, 2, h);
    x.fillStyle = '#2a2e3a'; x.fillRect(7, 7, 18, 18); x.fillStyle = '#6a7284'; for (let i = 0; i < 5; i++) x.fillRect(8, 9 + i * 3.4, 16, 1);
    x.fillStyle = '#3e4456'; [[4, 4], [w - 6, 4], [4, h - 6], [w - 6, h - 6]].forEach(([a, b]) => x.fillRect(a, b, 2, 2));
  }),
  tileWarn: tex(32, 32, (x, w, h) => {
    noisy(x, w, h, '#8a93a6', 0.22);
    x.fillStyle = '#5b6376'; x.fillRect(0, 0, w, 2); x.fillRect(0, 0, 2, h); x.fillStyle = '#b4bccc'; x.fillRect(0, h - 2, w, 2); x.fillRect(w - 2, 0, 2, h);
    for (let i = 0; i < 12; i++) { x.fillStyle = (i >> 1) % 2 ? '#1c1c22' : '#f2c21a'; x.fillRect(2 + i, 2, 1, 12 - i); x.fillRect(2, 2 + i, 12 - i, 1); }
    x.fillStyle = '#f2c21a'; x.fillRect(19, 22, 8, 2); x.fillRect(22, 19, 2, 8);           // cruz de ubicación
  }),
  pad: tex(64, 64, (x, w, h) => {
    x.fillStyle = '#3a4052'; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 300; i++) { x.fillStyle = Math.random() < 0.5 ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.12)'; x.fillRect((Math.random() * w) | 0, (Math.random() * h) | 0, 1, 1); }
    x.fillStyle = '#f2c21a';
    for (let a = 0; a < Math.PI * 2; a += 0.02) { for (let k = 0; k < 3; k++) x.fillRect((32 + Math.cos(a) * (26 + k)) | 0, (32 + Math.sin(a) * (26 + k)) | 0, 1, 1); }
    x.fillStyle = '#f4f6fa'; x.fillRect(20, 18, 5, 28); x.fillRect(39, 18, 5, 28); x.fillRect(25, 30, 14, 5);   // H
    x.fillStyle = '#5b6376'; x.fillRect(31, 0, 2, 3); x.fillRect(31, 61, 2, 3); x.fillRect(0, 31, 3, 2); x.fillRect(61, 31, 3, 2);
  }),
  /* ---------- Petardos: paredes y cajones de cada cancha ---------- */
  // cerco de ligustro podado (patio)
  hedge: tex(32, 32, (x, w, h) => {
    x.fillStyle = '#3a7a34'; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 160; i++) { x.fillStyle = ['#4a9442', '#2f6a2a', '#56a44c', '#28592a', '#62b056'][(Math.random() * 5) | 0]; x.fillRect((Math.random() * w) | 0, (Math.random() * h) | 0, rnd(1, 3) | 0, rnd(1, 3) | 0); }
    x.fillStyle = 'rgba(255,255,255,.08)'; x.fillRect(0, 0, w, 2);
  }),
  // maceta de ladrillo (patio: la base del cerco)
  planter: tex(32, 16, (x, w, h) => {
    x.fillStyle = '#9a4a2c'; x.fillRect(0, 0, w, h);
    for (let r = 0; r < 2; r++) for (let c = -1; c < 3; c++) { const bx = c * 16 + (r % 2 ? 8 : 0); x.fillStyle = ['#c0643a', '#b25a34', '#cc7044'][(r + c + 3) % 3]; x.fillRect(bx + 1, r * 8 + 1, 14, 6); }
    x.fillStyle = '#e8d8c0'; x.fillRect(0, 0, w, 2);
  }),
  // piedra arenisca en capas (desierto)
  sandstone: tex(32, 32, (x, w, h) => {
    const bands = ['#e0b070', '#d4a060', '#e8bc80', '#c8945a', '#dcaa6a'];
    for (let y = 0; y < h; y += 4) { x.fillStyle = bands[(y / 4) % bands.length]; x.fillRect(0, y, w, 4); }
    for (let i = 0; i < 70; i++) { x.fillStyle = Math.random() < 0.5 ? 'rgba(255,240,200,.3)' : 'rgba(90,50,20,.18)'; x.fillRect((Math.random() * w) | 0, (Math.random() * h) | 0, rnd(1, 4) | 0, 1); }
    x.fillStyle = 'rgba(80,40,10,.45)';                                           // grietas
    for (let k = 0; k < 2; k++) { let cx = rnd(4, w - 4), cy = rnd(2, 10); for (let i = 0; i < 14; i++) { cx += rnd(-1.2, 1.2); cy += 1; x.fillRect(cx | 0, cy | 0, 1, 1); } }
    x.fillStyle = '#8a5a2c'; x.fillRect(0, h - 2, w, 2); x.fillRect(w - 1, 0, 1, h);
  }),
  // bloque de hielo (nieve): celeste con brillos
  iceBlock: tex(32, 32, (x, w, h) => {
    x.fillStyle = '#8ec8e8'; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 30; i++) { x.fillStyle = Math.random() < 0.6 ? 'rgba(255,255,255,.25)' : 'rgba(30,90,140,.15)'; x.fillRect((Math.random() * w) | 0, (Math.random() * h) | 0, rnd(2, 8) | 0, 1); }
    x.fillStyle = 'rgba(255,255,255,.7)'; for (let i = 0; i < 9; i++) x.fillRect(4 + i, 3 + i, 2, 1);   // brillo en diagonal
    x.fillRect(22, 20, 5, 1); x.fillRect(24, 21, 3, 1);
    x.fillStyle = '#5a9cc8'; x.fillRect(0, h - 2, w, 2); x.fillRect(w - 2, 0, 2, h);
    x.fillStyle = '#d8f2ff'; x.fillRect(0, 0, w, 1); x.fillRect(0, 0, 1, h);
  }),
  // tapa de cajón con escarcha y un poco de nieve (nieve: se distingue de las paredes, que tienen nieve entera)
  crateSnow: tex(32, 32, (x, w, h) => {
    x.fillStyle = '#9a7a5a'; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 4; i++) { x.fillStyle = i % 2 ? '#8a6c4e' : '#a88a68'; x.fillRect(3, 3 + i * 6.5, w - 6, 6); }
    x.fillStyle = '#5e4630'; x.fillRect(0, 0, w, 3); x.fillRect(0, h - 3, w, 3); x.fillRect(0, 0, 3, h); x.fillRect(w - 3, 0, 3, h);
    x.fillStyle = '#f4f8ff';
    [[6, 6, 7], [20, 9, 5], [11, 20, 6], [24, 24, 4]].forEach(([cx, cy, r]) => { for (let yy = -r; yy <= r; yy++) for (let xx = -r; xx <= r; xx++) if (xx * xx + yy * yy * 1.6 <= r * r) x.fillRect(cx + xx, cy + yy, 1, 1); });
    for (let i = 0; i < 25; i++) x.fillRect((Math.random() * w) | 0, (Math.random() * h) | 0, 1, 1);
  }),
  // caja de cartón con cinta (fábrica)
  cardboard: tex(32, 32, (x, w, h) => {
    noisy(x, w, h, '#c89a5c', 0.1);
    x.fillStyle = '#b0844a'; x.fillRect(0, 0, w, 2); x.fillRect(0, h - 2, w, 2); x.fillRect(0, 0, 2, h); x.fillRect(w - 2, 0, 2, h);
    x.fillStyle = '#d8c290'; x.fillRect(13, 0, 6, h);                           // cinta
    x.fillStyle = '#5a3a1a'; x.fillRect(5, 6, 5, 1); x.fillRect(7, 4, 1, 5); x.fillRect(6, 5, 3, 1);  // flecha "este lado arriba"
    x.fillRect(22, 22, 6, 1); x.fillRect(22, 25, 6, 1); x.fillRect(22, 22, 1, 4); x.fillRect(27, 22, 1, 4);
  }),
  // panel de máquina con rejilla y luces (fábrica: algunas paredes)
  panel: tex(32, 32, (x, w, h) => {
    noisy(x, w, h, '#5a6274', 0.2);
    x.fillStyle = '#7c8498'; x.fillRect(0, 0, w, 3); x.fillRect(0, 0, 3, h);
    x.fillStyle = '#2a2e3a'; x.fillRect(0, h - 3, w, 3); x.fillRect(w - 3, 0, 3, h);
    x.fillStyle = '#1c1f28'; for (let i = 0; i < 5; i++) x.fillRect(6, 7 + i * 3, 14, 2);   // rejilla
    x.fillStyle = '#39d98a'; x.fillRect(24, 8, 3, 3); x.fillStyle = '#ff5a3a'; x.fillRect(24, 14, 3, 3);
    x.fillStyle = '#e8e0c0'; x.fillRect(6, 24, 20, 3); x.fillStyle = '#ff9a1f'; x.fillRect(6, 24, 9, 3);  // medidor
  }),
  // barro cocido (desierto: vasijas)
  clay: tex(32, 16, (x, w, h) => {
    noisy(x, w, h, '#c06a3a', 0.12);
    x.fillStyle = '#f0d8b0'; x.fillRect(0, 4, w, 2);
    x.fillStyle = '#5a2a1a'; for (let i = 0; i < w; i += 4) { x.fillRect(i, 9, 2, 1); x.fillRect(i + 1, 10, 2, 1); }
    x.fillStyle = '#f0d8b0'; x.fillRect(0, 12, w, 1);
  }),
  // Futbolonki: pelota de gajos (se envuelve en una esfera: 32 de ancho = la vuelta, 16 de alto = de polo a polo)
  football: tex(32, 16, (x, w, h) => {
    noisy(x, w, h, '#f4f4f0', 0.05);
    const blob = (cx, cy, r) => { x.fillStyle = '#16161c'; for (let yy = -r; yy <= r; yy++) for (let xx = -r; xx <= r; xx++) if (Math.abs(xx) + Math.abs(yy) * 1.2 <= r + 0.4) x.fillRect((cx + xx + w) % w, cy + yy, 1, 1); };
    for (let k = 0; k < 5; k++) { blob(k * 6.4 + 1, 5, 2); blob(k * 6.4 + 4, 10, 2); }
  }),
  oldBall: tex(32, 16, (x, w, h) => {             // pelota vieja de cuero, gastada y con tierra (el potrero)
    noisy(x, w, h, '#c89a62', 0.2);
    x.fillStyle = 'rgba(70,40,20,.55)'; for (let k = 0; k < w; k += 8) x.fillRect(k, 0, 1, h); x.fillRect(0, 8, w, 1);   // costuras de los gajos
    for (let i = 0; i < 26; i++) { x.fillStyle = Math.random() < 0.6 ? 'rgba(80,50,25,.45)' : 'rgba(240,220,180,.35)'; x.fillRect(Math.random() * w, Math.random() * h, rnd(1, 3), rnd(1, 2)); }
  }),
  // publicidad de los carteles de la cancha: tiras de colores con "letras" de píxeles
  ads: tex(64, 8, (x, w, h) => {
    const cols = [['#ff9a1f', '#3a1200'], ['#1a2a6a', '#ffe14a'], ['#e8e8f0', '#d8262e'], ['#1f8a4a', '#ffffff']];
    for (let k = 0; k < 4; k++) {
      const [bg, fg] = cols[k]; x.fillStyle = bg; x.fillRect(k * 16, 0, 16, h);
      x.fillStyle = fg; for (let i = 0; i < 5; i++) { const hh = 2 + ((i * 7 + k * 3) % 3); x.fillRect(k * 16 + 2 + i * 3, 4 - (hh >> 1), 2, hh); }
      x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(k * 16 + 15, 0, 1, h);
    }
    x.fillStyle = 'rgba(255,255,255,.25)'; x.fillRect(0, 0, w, 1);
  }),
  // pasto de la cancha: franjas claras y oscuras (una franja por textura)
  pitch: tex(32, 32, (x, w, h) => {
    x.fillStyle = '#3f8f3a'; x.fillRect(0, 0, w, h); x.fillStyle = '#4aa243'; x.fillRect(0, 0, w / 2, h);
    for (let i = 0; i < 90; i++) { x.fillStyle = ['rgba(120,200,90,.35)', 'rgba(20,60,20,.25)'][i % 2]; x.fillRect(Math.random() * w, Math.random() * h, 1, rnd(1, 3)); }
  }),

  /* ---------- Bola Brava: mapas nuevos ---------- */
  carnival: tex(64, 64, (x, w, h) => {            // FERIA: tablones pintados a cuadros rojo y crema
    for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) { x.fillStyle = (i + j) % 2 ? '#c8323a' : '#f2e2c0'; x.fillRect(i * 16, j * 16, 16, 16); }
    for (let i = 0; i < 260; i++) { x.fillStyle = Math.random() < 0.5 ? 'rgba(0,0,0,.10)' : 'rgba(255,255,255,.08)'; x.fillRect(Math.random() * w, Math.random() * h, rnd(2, 8), 1); }
    x.fillStyle = 'rgba(60,20,10,.35)'; for (let k = 0; k < h; k += 8) x.fillRect(0, k, w, 1);
  }),
  circus: tex(32, 32, (x, w, h) => {              // torres de la feria: rayas rojas y blancas con foquitos
    for (let i = 0; i < w; i += 8) { x.fillStyle = '#e8303a'; x.fillRect(i, 0, 4, h); x.fillStyle = '#fff4e6'; x.fillRect(i + 4, 0, 4, h); }
    x.fillStyle = '#6a1a10'; x.fillRect(0, 20, w, 5);
    for (let i = 1; i < w; i += 4) { x.fillStyle = '#ffe07a'; x.fillRect(i, 21, 2, 3); }
  }),
  fairFence: tex(32, 16, (x, w, h) => {           // borde de la feria: madera con foquitos
    noisy(x, w, h, '#6a3e22', 0.25); x.fillStyle = '#3e2412'; x.fillRect(0, 0, w, 2); x.fillRect(0, 14, w, 2);
    for (let i = 2; i < w; i += 6) { x.fillStyle = '#ffd24a'; x.fillRect(i, 6, 3, 3); }
  }),
  beachFloor: tex(64, 64, (x, w, h) => {          // PLAYA: arena apisonada
    noisy(x, w, h, '#e6c98e', 0.22);
    for (let i = 0; i < 40; i++) { x.fillStyle = 'rgba(160,110,60,.14)'; x.fillRect(Math.random() * w, Math.random() * h, rnd(6, 20), 1); }
    for (let i = 0; i < 30; i++) { x.fillStyle = 'rgba(255,255,255,.3)'; x.fillRect(Math.random() * w, Math.random() * h, 1, 1); }
  }),
  lifeguard: tex(32, 32, (x, w, h) => {           // torres de la playa: tablas blancas y celestes
    for (let k = 0; k < h; k += 4) { x.fillStyle = (k / 4) % 2 ? '#f4f4ee' : '#3aa8e0'; x.fillRect(0, k, w, 4); }
    x.fillStyle = 'rgba(0,0,0,.18)'; for (let i = 0; i < w; i += 8) x.fillRect(i, 0, 1, h);
    x.fillStyle = '#e83a3a'; x.fillRect(0, 12, w, 4); x.fillStyle = '#ffffff'; x.fillRect(12, 12, 8, 4);
  }),
  beachRim: tex(32, 16, (x, w, h) => {            // borde de la playa: tablas de madera gastada
    noisy(x, w, h, '#b8905a', 0.25); x.fillStyle = '#7a5a34'; for (let i = 0; i < w; i += 8) x.fillRect(i, 0, 1, h); x.fillRect(0, 15, w, 1);
  }),
  circusBall: tex(32, 8, (x, w, h) => {          // pelota de circo: gajos rojos y blancos
    for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? '#ffffff' : '#e8202a'; x.fillRect(i * 4, 0, 4, h); }
    x.fillStyle = '#ffd24a'; x.fillRect(0, 0, w, 1); x.fillRect(0, h - 1, w, 1);
  }),
  beachBall: tex(32, 8, (x, w, h) => {            // pelota de playa: gajos de colores (a lo largo de la vuelta)
    ['#ff3a3a', '#ffffff', '#3a7aff', '#ffe03a', '#ffffff', '#2ec46a'].forEach((c, i) => { x.fillStyle = c; x.fillRect(Math.round((i * w) / 6), 0, Math.ceil(w / 6), h); });
    x.fillStyle = '#ffffff'; x.fillRect(0, 0, w, 1); x.fillRect(0, h - 1, w, 1);
  }),
  roofTiles: tex(64, 64, (x, w, h) => {           // TERRAZA: baldosas de azotea con juntas de brea
    x.fillStyle = '#8a4a36'; x.fillRect(0, 0, w, h);
    for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) {
      const v = rnd(-14, 14); x.fillStyle = `rgb(${150 + v},${82 + v * 0.6},${60 + v * 0.4})`; x.fillRect(i * 16 + 1, j * 16 + 1, 14, 14);
    }
    for (let i = 0; i < 300; i++) { x.fillStyle = Math.random() < 0.5 ? 'rgba(0,0,0,.12)' : 'rgba(255,220,180,.08)'; x.fillRect(Math.random() * w, Math.random() * h, 1, 1); }
    x.fillStyle = 'rgba(20,14,12,.55)'; for (let k = 0; k < w; k += 16) { x.fillRect(k, 0, 1, h); x.fillRect(0, k, w, 1); }
  }),
  tank: tex(32, 32, (x, w, h) => {                // torres de la terraza: tanque de agua de chapa
    noisy(x, w, h, '#8c9aa4', 0.22);
    x.fillStyle = '#5d6a74'; for (let k = 0; k < h; k += 8) x.fillRect(0, k, w, 2);
    for (let i = 0; i < 12; i++) { x.fillStyle = 'rgba(150,80,30,.35)'; x.fillRect(Math.random() * w, Math.random() * h, 2, rnd(2, 6)); }
    x.fillStyle = '#ff5a8a'; x.fillRect(0, 24, w, 2);
  }),
  parapet: tex(32, 16, (x, w, h) => {             // borde de la terraza: murito revocado
    noisy(x, w, h, '#b8aca0', 0.2); x.fillStyle = '#8a7e72'; x.fillRect(0, 0, w, 2); x.fillStyle = 'rgba(0,0,0,.15)'; x.fillRect(0, 9, w, 1);
  }),
  facade: tex(32, 64, (x, w, h) => {              // edificios de la ciudad: ventanas, algunas prendidas
    x.fillStyle = '#1a1c2c'; x.fillRect(0, 0, w, h);
    for (let j = 2; j < h - 2; j += 6) for (let i = 2; i < w - 2; i += 6) {
      const r = Math.random(); x.fillStyle = r < 0.35 ? '#ffd88a' : r < 0.45 ? '#8ad8ff' : '#0c0e18'; x.fillRect(i, j, 3, 3);
    }
  }),

  /* ---------- Hexágonos ---------- */
  hexTop: tex(32, 32, (x, w, h) => {              // tapa de la baldosa: clarita en el medio, con brillo
    x.fillStyle = '#ffffff'; x.fillRect(0, 0, w, h);
    const g = x.createRadialGradient(16, 16, 2, 16, 16, 18); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(0,0,0,.28)');
    x.fillStyle = g; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 40; i++) { x.fillStyle = 'rgba(255,255,255,.35)'; x.fillRect(Math.random() * w, Math.random() * h, 1, 1); }
  }),
  hexSide: tex(16, 16, (x, w, h) => {             // costado: rayitas, más oscuro abajo
    noisy(x, w, h, '#e8e8e8', 0.12); x.fillStyle = 'rgba(0,0,0,.25)'; x.fillRect(0, 10, w, 6); x.fillStyle = 'rgba(255,255,255,.4)'; x.fillRect(0, 0, w, 2);
  }),
  slime: tex(32, 32, (x, w, h) => {               // slime verde con burbujas
    noisy(x, w, h, '#4ec81a', 0.25);
    for (let i = 0; i < 18; i++) { const cx = Math.random() * w, cy = Math.random() * h, r = rnd(1, 3); x.fillStyle = 'rgba(210,255,120,.7)'; x.beginPath(); x.arc(cx, cy, r, 0, 7); x.fill(); x.fillStyle = 'rgba(40,120,10,.5)'; x.fillRect(cx + r * 0.3, cy + r * 0.3, 1, 1); }
  }),

  /* ---------- Futbolonki: mapas nuevos ---------- */
  potrero: tex(32, 32, (x, w, h) => {             // POTRERO: tierra apisonada con matas de pasto
    noisy(x, w, h, '#a8784a', 0.28);
    for (let i = 0; i < 6; i++) { const cx = Math.random() * w, cy = Math.random() * h; for (let k = 0; k < 18; k++) { x.fillStyle = Math.random() < 0.5 ? '#6a8a3a' : '#587a2e'; x.fillRect((cx + rnd(-4, 4) + w) % w, (cy + rnd(-3, 3) + h) % h, 1, rnd(1, 3)); } }
    for (let i = 0; i < 16; i++) { x.fillStyle = 'rgba(60,40,20,.35)'; x.fillRect(Math.random() * w, Math.random() * h, rnd(2, 5), 1); }
  }),
  graffiti: tex(64, 16, (x, w, h) => {            // pared del potrero: ladrillo con grafitis
    x.fillStyle = '#9a4a32'; x.fillRect(0, 0, w, h);
    for (let r = 0; r < 4; r++) for (let c = -1; c < 9; c++) { x.fillStyle = `rgb(${150 + rnd(-20, 20)},${70 + rnd(-10, 10)},${50 + rnd(-10, 10)})`; x.fillRect(c * 8 + (r % 2) * 4 + 1, r * 4 + 1, 7, 3); }
    const cols = ['#2de0c8', '#ff5fa2', '#ffe14a', '#6aff5a', '#ffffff', '#4a8cff'];
    for (let k = 0; k < 5; k++) {                 // manchones y garabatos de aerosol
      x.strokeStyle = cols[(Math.random() * cols.length) | 0]; x.lineWidth = 2; x.beginPath();
      let px = rnd(0, w), py = rnd(3, 13); x.moveTo(px, py);
      for (let j = 0; j < 5; j++) { px += rnd(-6, 8); py = Math.max(2, Math.min(14, py + rnd(-5, 5))); x.lineTo(px, py); }
      x.stroke();
    }
    x.fillStyle = 'rgba(0,0,0,.25)'; x.fillRect(0, 14, w, 2);
  }),
  icePitch: tex(32, 32, (x, w, h) => {            // HIELO: pista con rayones de patines
    noisy(x, w, h, '#d8eefa', 0.12);
    for (let i = 0; i < 26; i++) { x.fillStyle = Math.random() < 0.5 ? 'rgba(255,255,255,.7)' : 'rgba(120,170,210,.35)'; const l = rnd(4, 14), a = rnd(0, 3); for (let k = 0; k < l; k++) x.fillRect((rnd(0, w) + Math.cos(a) * k) % w, (rnd(0, h) * 0 + (i * 1.3) % h + Math.sin(a) * k + h) % h, 1, 1); }
  }),
  boards: tex(32, 16, (x, w, h) => {              // tablas blancas de la pista de hielo, con franja azul
    noisy(x, w, h, '#f4f6fa', 0.08); x.fillStyle = '#2a5aff'; x.fillRect(0, 11, w, 3); x.fillStyle = '#e8303a'; x.fillRect(0, 14, w, 2);
    x.fillStyle = 'rgba(0,0,0,.08)'; for (let i = 0; i < w; i += 8) x.fillRect(i, 0, 1, 11);
  }),

  /* ---------- personajes nuevos: caras (el frente de la esfera cae en x ≈ 32 de 128) ---------- */
  skullFace: tex(128, 64, (x, w, h) => {          // HUESO: calavera con cuencas hondas, nariz y dientes
    noisy(x, w, h, '#ece6d4', 0.05);
    x.fillStyle = 'rgba(120,100,70,.2)'; x.fillRect(64, 0, 64, h);
    x.fillStyle = 'rgba(150,130,100,.35)'; x.fillRect(40, 10, 1, 8); x.fillRect(41, 17, 3, 1);          // rajadura
    [[24, 29], [40, 29]].forEach(([ex, ey]) => { x.fillStyle = '#1a1410'; x.beginPath(); x.ellipse(ex, ey, 6, 5.5, 0, 0, 7); x.fill(); });
    x.fillStyle = '#1a1410'; x.beginPath(); x.moveTo(32, 34); x.lineTo(29.5, 39); x.lineTo(34.5, 39); x.closePath(); x.fill();
    x.fillStyle = '#d8d0b8'; x.fillRect(22, 43, 20, 6);
    x.fillStyle = '#3a3026'; for (let k = 0; k <= 5; k++) x.fillRect(22 + k * 4, 43, 1, 6); x.fillRect(22, 46, 20, 1);
  }),
  frogFace: tex(128, 64, (x, w, h) => {           // RANULFO: sonrisa ancha de oreja a oreja, cachetes y pecas
    noisy(x, w, h, '#62c83a', 0.06);
    x.fillStyle = 'rgba(30,90,20,.35)'; x.fillRect(64, 0, 64, h);
    for (let i = 0; i < 14; i++) { x.fillStyle = 'rgba(40,110,30,.6)'; x.beginPath(); x.arc(64 + Math.random() * 64, Math.random() * h, rnd(1.5, 3), 0, 7); x.fill(); }
    x.fillStyle = '#d8f07a'; x.fillRect(0, 44, 64, 20);                          // panza/papada clarita
    x.strokeStyle = '#1e4a14'; x.lineWidth = 2; x.beginPath(); x.moveTo(12, 36); x.quadraticCurveTo(32, 48, 52, 36); x.stroke();
    x.fillStyle = '#ff7a8a'; x.fillRect(29, 43, 6, 2);                             // lengüita
    x.fillStyle = 'rgba(255,120,120,.35)'; x.fillRect(14, 32, 5, 3); x.fillRect(45, 32, 5, 3);
    x.fillStyle = '#1e4a14'; x.fillRect(29, 30, 1, 1); x.fillRect(34, 30, 1, 1);   // agujeritos de la nariz
  }),
  sadFace: tex(128, 64, (x, w, h) => {            // TRISTÁN: cara blanca de payaso, cejas caídas, lágrima azul
    noisy(x, w, h, '#f4f2ee', 0.03);
    x.fillStyle = 'rgba(160,170,200,.25)'; x.fillRect(64, 0, 64, h);
    x.fillStyle = '#2a2a3a';
    [[24, 30], [40, 30]].forEach(([ex, ey]) => { x.fillRect(ex - 2, ey - 1, 4, 3); });
    x.fillStyle = '#1a1a2a'; x.fillRect(19, 24, 7, 1); x.fillRect(18, 25, 2, 1); x.fillRect(38, 24, 7, 1); x.fillRect(44, 25, 2, 1);   // cejas para abajo por afuera
    x.fillStyle = '#3a7aff'; x.beginPath(); x.moveTo(24, 34); x.quadraticCurveTo(21.5, 38, 24, 39.5); x.quadraticCurveTo(26.5, 38, 24, 34); x.fill();
    x.fillStyle = '#c8303a'; x.beginPath(); x.moveTo(25, 45); x.quadraticCurveTo(32, 39, 39, 45); x.lineTo(39, 46.5); x.quadraticCurveTo(32, 42, 25, 46.5); x.fill();
  }),
  luchaMask: tex(128, 64, (x, w, h) => {          // TORNADO: máscara de luchador con llamas y ojos blancos
    x.fillStyle = '#b030d0'; x.fillRect(0, 0, w, h);
    x.fillStyle = '#ffd24a';
    for (const cx of [32, 96]) { x.beginPath(); x.moveTo(cx, 6); x.lineTo(cx + 5, 18); x.lineTo(cx + 2, 16); x.lineTo(cx, 24); x.lineTo(cx - 2, 16); x.lineTo(cx - 5, 18); x.closePath(); x.fill(); }
    x.fillStyle = '#ffffff';
    [[23, 30], [41, 30]].forEach(([ex, ey]) => { x.beginPath(); x.moveTo(ex - 7, ey - 3); x.lineTo(ex + 6, ey - 1); x.lineTo(ex + 5, ey + 4); x.lineTo(ex - 6, ey + 3); x.closePath(); x.fill(); });
    x.fillStyle = '#e8b890'; [[23, 30.5], [41, 30.5]].forEach(([ex, ey]) => x.fillRect(ex - 4, ey - 1, 8, 3));   // piel por los agujeros
    x.fillStyle = '#111'; x.fillRect(21, 29, 3, 3); x.fillRect(40, 29, 3, 3);
    x.fillStyle = '#ffffff'; x.beginPath(); x.ellipse(32, 44, 7, 4, 0, 0, 7); x.fill();
    x.fillStyle = '#e8b890'; x.beginPath(); x.ellipse(32, 44, 5, 2.6, 0, 0, 7); x.fill();
    x.fillStyle = '#9a2a2a'; x.fillRect(28, 44, 8, 1);
    x.strokeStyle = '#ffd24a'; x.lineWidth = 1; x.beginPath(); x.moveTo(64, 0); x.lineTo(64, h); x.stroke();   // costura de atrás
  }),
  raincoat: tex(32, 32, (x, w, h) => { noisy(x, w, h, '#ffd23a', 0.05); x.fillStyle = 'rgba(160,110,0,.35)'; x.fillRect(15, 0, 2, h); x.fillStyle = '#ffffff'; [6, 14, 22].forEach((yy) => x.fillRect(12, yy, 2, 2)); }),
  sadShirt: tex(32, 32, (x, w, h) => { for (let yy = 0; yy < h; yy += 6) { x.fillStyle = '#e8e8f0'; x.fillRect(0, yy, w, 3); x.fillStyle = '#3a4a8a'; x.fillRect(0, yy + 3, w, 3); } }),
  patched: tex(32, 32, (x, w, h) => {             // saco viejo con remiendos
    noisy(x, w, h, '#6a5a78', 0.08);
    x.fillStyle = '#b89a5a'; x.fillRect(4, 18, 8, 7); x.fillStyle = '#8a3a3a'; x.fillRect(20, 6, 6, 6);
    x.fillStyle = 'rgba(0,0,0,.4)'; [[4, 18, 8, 7], [20, 6, 6, 6]].forEach(([a, b, c, d]) => { x.fillRect(a, b, c, 1); x.fillRect(a, b + d - 1, c, 1); });
  }),
  tights: tex(16, 16, (x, w, h) => { noisy(x, w, h, '#2a2a3a', 0.08); x.fillStyle = '#ffd24a'; x.fillRect(0, 0, 3, h); x.fillRect(13, 0, 3, h); }),

  wizardFace: tex(128, 64, (x, w, h) => {         // BERTO: mago viejito, cejas y bigote blancos
    noisy(x, w, h, '#f0c8a8', 0.03);
    x.fillStyle = 'rgba(140,70,50,.15)'; x.fillRect(64, 0, 64, h);
    x.fillStyle = '#ffffff'; x.fillRect(18, 23, 10, 3); x.fillRect(36, 23, 10, 3);                       // cejas tupidas
    x.fillStyle = '#2a2a3a'; x.fillRect(22, 28, 3, 3); x.fillRect(39, 28, 3, 3);
    x.fillStyle = 'rgba(220,120,110,.35)'; x.fillRect(17, 34, 5, 3); x.fillRect(42, 34, 5, 3);
    x.fillStyle = '#e8a890'; x.fillRect(29, 30, 6, 6);                                                  // nariz
  }),
  grannyFace: tex(128, 64, (x, w, h) => {         // TITA: abuela con anteojos redondos, rouge y sonrisa
    noisy(x, w, h, '#f2cfb4', 0.03);
    x.fillStyle = 'rgba(150,90,70,.15)'; x.fillRect(64, 0, 64, h);
    x.strokeStyle = '#8a5a2a'; x.lineWidth = 1.5;
    [[24, 30], [40, 30]].forEach(([ex, ey]) => { x.beginPath(); x.arc(ex, ey, 5, 0, 7); x.stroke(); x.fillStyle = '#2a2a3a'; x.fillRect(ex - 1, ey - 1, 2, 2); });
    x.beginPath(); x.moveTo(29, 30); x.lineTo(35, 30); x.stroke();
    x.fillStyle = 'rgba(255,110,130,.45)'; x.beginPath(); x.arc(17, 37, 3.5, 0, 7); x.arc(47, 37, 3.5, 0, 7); x.fill();
    x.strokeStyle = '#c83a5a'; x.lineWidth = 2; x.beginPath(); x.moveTo(26, 42); x.quadraticCurveTo(32, 47, 38, 42); x.stroke();
    x.strokeStyle = 'rgba(150,100,80,.4)'; x.lineWidth = 1; x.beginPath(); x.moveTo(15, 42); x.lineTo(18, 44); x.moveTo(49, 42); x.lineTo(46, 44); x.stroke();
  }),
  robotFace: tex(128, 64, (x, w, h) => {          // LATITA: robot de lata con pantalla, remaches y boca de parlante
    x.fillStyle = '#b8c0c8'; x.fillRect(0, 0, w, h);
    for (let i = 0; i < w; i += 8) { x.fillStyle = 'rgba(0,0,0,.08)'; x.fillRect(i, 0, 1, h); }
    x.fillStyle = '#1a2a2a'; x.fillRect(14, 22, 36, 14);
    x.fillStyle = '#6ff6ff'; x.fillRect(18, 25, 8, 8); x.fillRect(38, 25, 8, 8);
    x.fillStyle = '#ffffff'; x.fillRect(19, 26, 2, 2); x.fillRect(39, 26, 2, 2);
    x.fillStyle = '#5a6068'; for (let k = 0; k < 5; k++) x.fillRect(22 + k * 4, 41, 2, 6);
    x.fillStyle = '#7a8088'; [[10, 12], [54, 12], [10, 50], [54, 50]].forEach(([a, b]) => { x.beginPath(); x.arc(a, b, 1.6, 0, 7); x.fill(); });
    x.fillStyle = 'rgba(200,120,40,.35)'; x.fillRect(46, 44, 5, 3); x.fillRect(90, 20, 4, 6);             // óxido
  }),
  kidFace: tex(128, 64, (x, w, h) => {            // COSMO: nene astronauta, pecoso y con dientito
    noisy(x, w, h, '#e8b890', 0.03);
    x.fillStyle = '#6a3a1a'; x.fillRect(0, 0, w, 16); x.fillRect(64, 0, 64, 34);                         // flequillo y pelo de atrás
    x.fillStyle = '#6a3a1a'; x.beginPath(); x.moveTo(16, 16); x.lineTo(24, 22); x.lineTo(30, 16); x.lineTo(38, 21); x.lineTo(46, 16); x.fill();
    x.fillStyle = '#ffffff'; x.fillRect(20, 26, 8, 7); x.fillRect(36, 26, 8, 7);
    x.fillStyle = '#2a5a9a'; x.fillRect(23, 28, 4, 4); x.fillRect(39, 28, 4, 4);
    x.fillStyle = '#111'; x.fillRect(24, 29, 2, 2); x.fillRect(40, 29, 2, 2);
    x.fillStyle = '#b8704a'; [[18, 36], [21, 37], [44, 36], [47, 37]].forEach(([a, b]) => x.fillRect(a, b, 1, 1));
    x.fillStyle = '#9a2a2a'; x.beginPath(); x.moveTo(26, 40); x.quadraticCurveTo(32, 46, 38, 40); x.fill();
    x.fillStyle = '#ffffff'; x.fillRect(30, 40, 3, 2);
  }),
  starRobe: tex(32, 32, (x, w, h) => {            // túnica azul de mago con estrellas y lunas
    noisy(x, w, h, '#2a3a9a', 0.06);
    x.fillStyle = '#ffd24a';
    [[5, 5], [20, 10], [10, 20], [26, 26], [16, 28]].forEach(([a, b]) => { x.fillRect(a, b - 1, 1, 3); x.fillRect(a - 1, b, 3, 1); });
    x.beginPath(); x.arc(24, 18, 2.5, 0, 7); x.fill(); x.fillStyle = '#2a3a9a'; x.beginPath(); x.arc(25, 17, 2.2, 0, 7); x.fill();
  }),
  flowered: tex(32, 32, (x, w, h) => {            // batón floreado de la abuela
    noisy(x, w, h, '#b8d8f0', 0.05);
    for (let i = 0; i < 9; i++) { const cx = rnd(2, 30), cy = rnd(2, 30), c = ['#ff7aa8', '#ffd24a', '#ffffff'][i % 3]; x.fillStyle = c; x.fillRect(cx - 1, cy, 3, 1); x.fillRect(cx, cy - 1, 1, 3); x.fillStyle = '#e85a8a'; x.fillRect(cx, cy, 1, 1); }
  }),
  tin: tex(16, 16, (x, w, h) => { noisy(x, w, h, '#b8c0c8', 0.12); x.fillStyle = 'rgba(0,0,0,.18)'; x.fillRect(0, 7, w, 1); x.fillStyle = '#7a8088'; x.fillRect(2, 2, 1, 1); x.fillRect(13, 2, 1, 1); x.fillRect(2, 13, 1, 1); x.fillRect(13, 13, 1, 1); }),
  suit: tex(16, 16, (x, w, h) => { noisy(x, w, h, '#f0f0f4', 0.08); x.fillStyle = 'rgba(0,0,0,.1)'; x.fillRect(0, 5, w, 1); x.fillRect(0, 11, w, 1); }),

  /* ---------- Bola Brava: línea del arco de cada mapa ---------- */
  marquee: tex(16, 8, (x, w, h) => {              // CIRCO: marquesina roja con foquitos (se desplaza: parecen prenderse en fila)
    x.fillStyle = '#7a0a14'; x.fillRect(0, 0, w, h); x.fillStyle = '#ffd24a'; x.fillRect(0, 0, w, 1); x.fillRect(0, 7, w, 1);
    x.fillStyle = '#fff6c8'; x.fillRect(2, 2, 4, 4); x.fillStyle = '#ffb020'; x.fillRect(10, 3, 3, 2);
    x.fillStyle = '#ffffff'; x.fillRect(3, 3, 1, 1);
  }),
  rope: tex(64, 8, (x, w, h) => {                 // PLAYA: soga trenzada con boyas rojas y blancas
    x.fillStyle = 'rgba(0,0,0,0)'; x.fillStyle = '#d8c090'; x.fillRect(0, 0, w, h);
    x.fillStyle = '#c8a870'; x.fillRect(0, 2, w, 4);
    x.fillStyle = '#8a6a3a'; for (let i = 0; i < w; i += 3) x.fillRect(i, 2 + (i % 2), 1, 3);
    x.fillStyle = '#e8303a'; x.fillRect(6, 0, 7, 8); x.fillStyle = '#ffffff'; x.fillRect(8, 0, 3, 8);
    x.fillStyle = '#ffffff'; x.fillRect(38, 0, 7, 8); x.fillStyle = '#e8303a'; x.fillRect(40, 0, 3, 8);
  }),
  tape: tex(16, 8, (x, w, h) => {                 // TERRAZA: cinta de peligro amarilla y negra
    x.fillStyle = '#ffd21a'; x.fillRect(0, 0, w, h);
    x.fillStyle = '#1a1a1a'; for (let i = -8; i < w; i += 8) { x.beginPath(); x.moveTo(i, h); x.lineTo(i + 4, h); x.lineTo(i + 8, 0); x.lineTo(i + 4, 0); x.fill(); }
    x.fillStyle = 'rgba(255,255,255,.25)'; x.fillRect(0, 1, w, 1);
  }),
  velvet: tex(16, 16, (x, w, h) => {              // foso del circo: terciopelo rojo con flecos dorados
    noisy(x, w, h, '#5a0a14', 0.2); x.fillStyle = 'rgba(0,0,0,.25)'; for (let i = 0; i < w; i += 4) x.fillRect(i, 0, 1, h);
    x.fillStyle = '#ffd24a'; for (let i = 0; i < w; i += 2) x.fillRect(i, 0, 1, 2);
  }),
  gutter: tex(16, 16, (x, w, h) => {              // foso de la terraza: canaleta con rejilla
    noisy(x, w, h, '#2a2c32', 0.2); x.fillStyle = '#16171b'; for (let i = 1; i < w; i += 3) x.fillRect(i, 3, 1, 10);
    x.fillStyle = '#4a4c52'; x.fillRect(0, 2, w, 1); x.fillRect(0, 13, w, 1);
  }),
};
setWhiteTexture(TX.white);
