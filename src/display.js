// Pantalla: tamaño de la ventana, relación de aspecto, resolución interna y pantalla completa.
//
// La altura base siempre es de 240 líneas (como la PS1). El ancho sale de la relación de aspecto:
//   4:3 -> 320x240 · 16:10 -> 384x240 · 16:9 -> 426x240 · hasta 21:9 -> 560x240
// En panorámico la cámara mantiene el mismo campo vertical y se ve más a los costados (Hor+).
import { renderer, camera, U } from './render/psx.js';
import { settings } from './settings.js';

export const BASE_H = 240;
export const view = { hw: 320, iw: 320, ih: 240, aspect: 4 / 3, boxW: 0, boxH: 0, left: 0, top: 0 };

let els = null;

export function initDisplay(stage, screen, gl, hud) {
  els = { stage, screen, gl, hud };
  window.addEventListener('resize', applyDisplay);
  document.addEventListener('fullscreenchange', applyDisplay);
  if (window.visualViewport) window.visualViewport.addEventListener('resize', applyDisplay);
  applyDisplay();
}

export function applyDisplay() {
  if (!els || !renderer) return;
  const winW = Math.max(1, els.stage.clientWidth), winH = Math.max(1, els.stage.clientHeight);
  const aspect = settings.aspect === '4:3' ? 4 / 3 : Math.min(Math.max(winW / winH, 4 / 3), 21 / 9);
  const hw = Math.round((BASE_H * aspect) / 2) * 2;

  // tamaño en pantalla
  let boxW, boxH;
  const k = Math.floor(Math.min(winW / hw, winH / BASE_H));
  if (settings.integer && k >= 1) { boxW = hw * k; boxH = BASE_H * k; }
  else { boxH = Math.min(winH, winW / aspect); boxW = boxH * aspect; }
  boxW = Math.floor(boxW); boxH = Math.floor(boxH);

  // resolución interna del render
  let iw, ih;
  if (settings.quality === 'sharp') {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    iw = Math.round(boxW * dpr); ih = Math.round(boxH * dpr);
  } else {
    const mul = settings.quality === '480' ? 2 : 1;
    iw = hw * mul; ih = BASE_H * mul;
  }
  const retro = settings.quality !== 'sharp';
  renderer.setSize(iw, ih, false);
  U.uRes.value.set(iw, ih); U.uSnap.value = retro ? 1 : 0; U.uDither.value = retro ? 1 : 0;

  camera.aspect = aspect; camera.updateProjectionMatrix();

  if (els.hud.width !== hw) els.hud.width = hw;
  if (els.hud.height !== BASE_H) els.hud.height = BASE_H;

  const s = els.screen.style;
  s.width = boxW + 'px'; s.height = boxH + 'px';
  els.gl.style.imageRendering = retro ? 'pixelated' : 'auto';
  els.screen.classList.toggle('scanlines', !!settings.scanlines);

  Object.assign(view, { hw, iw, ih, aspect, boxW, boxH });
}

// Convierte coordenadas del mouse/táctil a coordenadas del HUD (hw x 240)
export function toHud(clientX, clientY) {
  const r = els.hud.getBoundingClientRect();
  return { x: ((clientX - r.left) / r.width) * view.hw, y: ((clientY - r.top) / r.height) * BASE_H };
}

/* ---------- pantalla completa ---------- */
export const isFullscreen = () => !!document.fullscreenElement;

export function enterFullscreen() {
  if (isFullscreen()) return;
  const el = document.documentElement;
  try {
    const p = el.requestFullscreen ? el.requestFullscreen({ navigationUI: 'hide' }) : null;
    if (p && p.catch) p.catch(() => {});
  } catch (e) { /* el navegador no lo permite acá */ }
}
export function exitFullscreen() {
  if (!isFullscreen()) return;
  try { const p = document.exitFullscreen(); if (p && p.catch) p.catch(() => {}); } catch (e) { /* nada */ }
}
export function toggleFullscreen() { if (isFullscreen()) exitFullscreen(); else enterFullscreen(); }
