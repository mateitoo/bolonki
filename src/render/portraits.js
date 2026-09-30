// Retratos de cada personaje (cabeza y hombros, en 3D) para la grilla de "ELEGÍ TU PERSONAJE".
// Se sacan una vez al arrancar, como las fotos de los minijuegos: se arma el piloto de cada personaje
// en una escena aparte, se encuadra la parte de arriba y se guarda en un canvas chiquito.
import * as THREE from 'three';
import { renderer, U, mat } from './psx.js';
import { CHARS } from '../config.js';
import { dressPod } from '../world/pods.js';
import { ui, rect } from '../ui/draw.js';

export const portraits = [];            // índice del personaje -> canvas
const PW = 64, PH = 64;

export function makePortraits() {
  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(30, PW / PH, 0.1, 50);
  const rt = new THREE.WebGLRenderTarget(PW, PH, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
  const px = new Uint8Array(PW * PH * 4);
  const saveRes = U.uRes.value.clone(), saveClear = new THREE.Color(), saveAlpha = renderer.getClearAlpha();
  renderer.getClearColor(saveClear);
  const box = new THREE.Box3();
  for (let c = 0; c < CHARS.length; c++) {
    try {
      // un "piloto" suelto: dressPod arma el cuerpo, los ojos, el accesorio o la ropa
      const fake = { rider: new THREE.Group(), bumpM: mat({}), vehMats: [], legs: null, ci: -1 };
      dressPod(fake, c);
      if (fake.legs) fake.legs.visible = !!CHARS[c].model;          // los de ropa se ven con piernas; los bichos, sin
      if (fake.armL) { fake.armL.rotation.set(0, 0, -0.15); fake.armR.rotation.set(0, 0, 0.15); }
      fake.rider.rotation.y = 0.38;                                   // un poquito de costado
      scene.add(fake.rider);
      fake.rider.updateMatrixWorld(true);
      box.setFromObject(fake.rider);
      // encuadre: desde arriba de todo (gorro, orejas) hasta los hombros
      const top = box.max.y + 0.08, H = Math.min(box.max.y - box.min.y, 2.3) + 0.15, cy = top - H / 2;
      const d = (H / 2) / Math.tan((15 * Math.PI) / 180);
      cam.position.set(0.15, cy + 0.15, d); cam.lookAt(0, cy, 0);
      U.uRes.value.set(PW, PH);
      renderer.setClearColor(new THREE.Color(CHARS[c].dark).lerp(new THREE.Color(0x0b1020), 0.45), 1);
      renderer.setRenderTarget(rt);
      renderer.clear();
      renderer.render(scene, cam);
      renderer.readRenderTargetPixels(rt, 0, 0, PW, PH, px);
      renderer.setRenderTarget(null);
      const cv = document.createElement('canvas'); cv.width = PW; cv.height = PH;
      const ctx = cv.getContext('2d'), img = ctx.createImageData(PW, PH);
      for (let y = 0; y < PH; y++) img.data.set(px.subarray((PH - 1 - y) * PW * 4, (PH - y) * PW * 4), y * PW * 4);
      ctx.putImageData(img, 0, 0);
      portraits[c] = cv;
      scene.remove(fake.rider);
      fake.rider.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
    } catch (e) { renderer.setRenderTarget(null); }
  }
  U.uRes.value.copy(saveRes); renderer.setClearColor(saveClear, saveAlpha);
  rt.dispose();
}

// Dibuja el retrato de un personaje (dim: más oscuro, para los que ya eligió otro o las CPU)
export function drawPortrait(c, x, y, w, h, dim) {
  const cv = portraits[c], ctx = ui.ctx;
  if (!cv) { rect(x, y, w, h, '#121a34'); return; }
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(cv, x, y, w, h);
  if (dim) rect(x, y, w, h, 'rgba(4,6,14,.55)');
}
