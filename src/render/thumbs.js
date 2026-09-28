// Saca una "foto" de cada minijuego al arrancar: arma su demo, la simula unos segundos
// para que haya acción, y la renderiza chiquita con su cámara. Se usa en los menús.
import * as THREE from 'three';
import { renderer, scene, camera, U } from './psx.js';
import { thumbs } from './thumbStore.js';
import { MINIGAMES } from '../minigames/registry.js';
import { resetMatch, demoSetup } from '../game/match.js';
import { game } from '../state.js';
import { updateVisuals } from '../visuals.js';
import { clearParticles } from '../fx/particles.js';

const TW = 176, TH = 99;

export function makeThumbs() {
  const rt = new THREE.WebGLRenderTarget(TW, TH, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
  const px = new Uint8Array(TW * TH * 4);
  const saveRes = U.uRes.value.clone(), saveAspect = camera.aspect;
  for (const m of MINIGAMES) {
    try {
      resetMatch('menu', demoSetup(m.id));
      for (let k = 0; k < (m.thumbSteps || 150); k++) m.step(1 / 120);
      game.shake = 0;
      updateVisuals(0, 0);
      const c = m.thumbCam || m.cam;
      camera.aspect = TW / TH; camera.updateProjectionMatrix();
      camera.position.copy(c.pos); camera.lookAt(c.look);
      U.uRes.value.set(TW, TH);
      renderer.setRenderTarget(rt);
      renderer.render(scene, camera);
      renderer.readRenderTargetPixels(rt, 0, 0, TW, TH, px);
      renderer.setRenderTarget(null);
      const cv = document.createElement('canvas'); cv.width = TW; cv.height = TH;
      const ctx = cv.getContext('2d'), img = ctx.createImageData(TW, TH);
      for (let y = 0; y < TH; y++) img.data.set(px.subarray((TH - 1 - y) * TW * 4, (TH - y) * TW * 4), y * TW * 4);
      ctx.putImageData(img, 0, 0);
      thumbs[m.id] = cv;
    } catch (e) { renderer.setRenderTarget(null); }
  }
  U.uRes.value.copy(saveRes); camera.aspect = saveAspect; camera.updateProjectionMatrix();
  rt.dispose();
  clearParticles();
}
