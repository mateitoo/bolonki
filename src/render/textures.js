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
};
setWhiteTexture(TX.white);
