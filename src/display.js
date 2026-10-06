// Pantalla: tamaño de la ventana, relación de aspecto, resolución interna y pantalla completa.
//
// La altura base siempre es de 240 líneas (como la PS1). El ancho sale de la relación de aspecto:
//   4:3 -> 320x240 · 16:10 -> 384x240 · 16:9 -> 426x240 · hasta 21:9 -> 560x240
// En panorámico la cámara mantiene el mismo campo vertical y se ve más a los costados (Hor+).
import { renderer, camera, U } from './render/psx.js';
import { settings } from './settings.js';
import { capsule } from './capsule.js';

export const BASE_H = 240;
export const view = { hw: 320, iw: 320, ih: 240, aspect: 4 / 3, boxW: 0, boxH: 0, left: 0, top: 0 };

let els = null;

export function initDisplay(stage, screen, gl, hud) {
  els = { stage, screen, gl, hud };
  window.addEventListener('resize', applyDisplay);
  document.addEventListener('fullscreenchange', applyDisplay);
  document.addEventListener('webkitfullscreenchange', applyDisplay);
  if (window.visualViewport) { window.visualViewport.addEventListener('resize', applyDisplay); window.visualViewport.addEventListener('scroll', applyDisplay); }
  // al girar el celular, el navegador (sobre todo el del iPhone) tarda en acomodar el tamaño y a veces queda con
  // zoom: se vuelve a medir varias veces y, si quedó con zoom, se lo saca
  const settle = () => [60, 250, 600, 1200].forEach((t) => setTimeout(() => { unzoom(); applyDisplay(); }, t));
  window.addEventListener('orientationchange', settle);
  window.addEventListener('pageshow', settle);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) settle(); });
  // por las dudas: una vez por segundo se fija si cambió el tamaño visible
  setInterval(() => { const v = visible(); if (v.w !== lastVis.w || v.h !== lastVis.h || v.x !== lastVis.x || v.y !== lastVis.y) applyDisplay(); if (v.scale > 1.01) unzoom(); }, 1000);
  applyDisplay();
}

// Lo que realmente se ve de la página (si el navegador hizo zoom, es menos que la ventana)
let lastVis = { w: 0, h: 0, x: 0, y: 0 };
function visible() {
  const v = window.visualViewport;
  if (v) return { w: Math.round(v.width), h: Math.round(v.height), x: Math.round(v.offsetLeft), y: Math.round(v.offsetTop), scale: v.scale || 1 };
  return { w: window.innerWidth, h: window.innerHeight, x: 0, y: 0, scale: 1 };
}
let unzoomT = 0;
function unzoom() {
  const v = window.visualViewport; if (!v || v.scale <= 1.01) return;
  const now = performance.now(); if (now - unzoomT < 800) return; unzoomT = now;
  const m = document.getElementById('vp'); if (!m) return;
  const c = 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover';
  m.setAttribute('content', c + ', minimum-scale=1');
  setTimeout(() => { m.setAttribute('content', c); window.scrollTo(0, 0); applyDisplay(); }, 60);
}

// Rendimiento: cuántos cuadros por segundo y cuánta resolución (lo que hace que el celular caliente y gaste batería)
const touchDevice = () => typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;
const PERF = {
  ahorro: { fps: 30, menuFps: 30, dpr: 1, pixels: 600000 },
  equilibrado: { fps: 60, menuFps: 30, dpr: 1.5, pixels: 1300000 },
  maximo: { fps: 0, menuFps: 0, dpr: 2, pixels: 9e9 },
};
export function perf() {
  const m = settings.perf && settings.perf !== 'auto' ? settings.perf : touchDevice() ? 'equilibrado' : 'maximo';
  return PERF[m] || PERF.maximo;
}

export function applyDisplay() {
  if (!els || !renderer) return;
  // el escenario ocupa exactamente la parte visible (aunque el navegador haya quedado con zoom, el juego entra entero)
  const vis = visible(); lastVis = vis;
  const ss = els.stage.style;
  ss.left = vis.x + 'px'; ss.top = vis.y + 'px'; ss.width = vis.w + 'px'; ss.height = vis.h + 'px'; ss.right = 'auto'; ss.bottom = 'auto';
  const winW = Math.max(1, vis.w), winH = Math.max(1, vis.h);
  const aspect = capsule ? winW / winH : settings.aspect === '4:3' ? 4 / 3 : Math.min(Math.max(winW / winH, 4 / 3), 21 / 9);
  const hw = Math.round((BASE_H * aspect) / 2) * 2;

  // tamaño en pantalla
  // (el escalado entero se calcula en píxeles reales del monitor, no en píxeles CSS)
  let boxW, boxH;
  const dprAll = window.devicePixelRatio || 1;
  const k = Math.floor(Math.min((winW * dprAll) / hw, (winH * dprAll) / BASE_H));
  const fitH = Math.min(winH, winW / aspect);
  // automático: escalado entero solo si se pierde menos del 5% de la imagen
  const useInt = settings.integer === 'auto' ? k >= 1 && (BASE_H * k) / dprAll / fitH >= 0.95 : !!settings.integer;
  if (useInt && k >= 1) { boxW = (hw * k) / dprAll; boxH = (BASE_H * k) / dprAll; }
  else { boxH = fitH; boxW = boxH * aspect; }
  if (!(useInt && k >= 1)) { boxW = Math.floor(boxW); boxH = Math.floor(boxH); }

  // resolución interna del render
  let iw, ih;
  if (settings.quality === 'sharp') {
    // cuántos píxeles se dibujan es lo que más calienta el celular: según el rendimiento elegido se limita
    const P = perf();
    let dpr = Math.min(window.devicePixelRatio || 1, P.dpr);
    const budget = P.pixels; if (boxW * boxH * dpr * dpr > budget) dpr = Math.sqrt(budget / (boxW * boxH));
    iw = Math.round(boxW * dpr); ih = Math.round(boxH * dpr);
  } else {
    const mul = settings.quality === '480' ? 2 : 1;
    iw = hw * mul; ih = BASE_H * mul;
  }
  const retro = settings.quality !== 'sharp';
  renderer.setSize(iw, ih, false);
  U.uRes.value.set(iw, ih); U.uSnap.value = retro && settings.psx !== false ? 1 : 0; U.uDither.value = retro && settings.dither !== false ? 1 : 0;
  // botones táctiles: tamaño y de qué lado va el joystick
  document.body.dataset.touchSize = settings.touchSize || 'normal'; document.body.dataset.stick = settings.stickSide || 'left';

  camera.aspect = aspect; camera.updateProjectionMatrix();

  if (els.hud.width !== hw) els.hud.width = hw;
  if (els.hud.height !== BASE_H) els.hud.height = BASE_H;

  const s = els.screen.style;
  s.width = boxW + 'px'; s.height = boxH + 'px';
  els.gl.style.imageRendering = retro ? 'pixelated' : 'auto';
  els.screen.classList.toggle('scanlines', !!settings.scanlines && !capsule);

  Object.assign(view, { hw, iw, ih, aspect, boxW, boxH, intScale: useInt && k >= 1 ? k : 0 });
}

// Convierte coordenadas del mouse/táctil a coordenadas del HUD (hw x 240)
export function toHud(clientX, clientY) {
  const r = els.hud.getBoundingClientRect();
  return { x: ((clientX - r.left) / r.width) * view.hw, y: ((clientY - r.top) / r.height) * BASE_H };
}

/* ---------- pantalla completa ---------- */
// en la versión de escritorio (Steam) la pantalla completa es la de la ventana, no la del navegador
const desk = () => (typeof window !== 'undefined' && window.bolonkiDesktop && window.bolonkiDesktop.setFullscreen ? window.bolonkiDesktop : null);
const fsEl = () => document.fullscreenElement || document.webkitFullscreenElement || null;
export const isFullscreen = () => (desk() ? desk().isFullscreen() : !!fsEl());
// ¿este navegador deja poner la página en pantalla completa? (el iPhone no: ahí hay que agregarla al inicio)
export const canFullscreen = () => !!(desk() || document.fullscreenEnabled || document.webkitFullscreenEnabled);
// Los navegadores solo dejan entrar a pantalla completa justo cuando tocás o apretás algo. Si se pidió desde
// un menú y el navegador dijo que no, queda pendiente y se hace con la próxima tecla o toque.
let pendingFs = false;
export const fullscreenPending = () => pendingFs;
export function fullscreenGesture() { if (pendingFs) { pendingFs = false; enterFullscreen(); } }

export function enterFullscreen() {
  if (isFullscreen()) return;
  if (desk()) { desk().setFullscreen(true); return; }
  const el = document.documentElement;
  const req = el.requestFullscreen ? () => el.requestFullscreen({ navigationUI: 'hide' }) : el.webkitRequestFullscreen ? () => el.webkitRequestFullscreen() : null;
  if (!req) return;
  try {
    const p = req();
    // en Chrome/Edge el juego "atrapa" el teclado: Esc pausa (se mantiene apretado para salir)
    // y atajos como Ctrl+W no cierran la pestaña en medio de la partida
    if (p && p.then) p.then(() => { pendingFs = false; try { if (navigator.keyboard && navigator.keyboard.lock) navigator.keyboard.lock().catch(() => {}); } catch (e) { /* nada */ } }).catch(() => { pendingFs = true; });
  } catch (e) { pendingFs = true; }
}
export function exitFullscreen() {
  pendingFs = false;
  if (!isFullscreen()) return;
  if (desk()) { desk().setFullscreen(false); return; }
  try { const p = document.exitFullscreen ? document.exitFullscreen() : document.webkitExitFullscreen(); if (p && p.catch) p.catch(() => {}); } catch (e) { /* nada */ }
}
export function toggleFullscreen() { if (isFullscreen() || pendingFs) exitFullscreen(); else enterFullscreen(); }
