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
};
setWhiteTexture(TX.white);
