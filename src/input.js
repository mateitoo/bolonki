// Teclado, táctil y controles de la página.
import { DIFF_ORDER } from './config.js';
import { game } from './state.js';
import { ensureAudio, SFX } from './audio.js';
import { resetMatch, startSwing } from './game/match.js';

let onDifficulty = () => {};

export function setDifficulty(id, notify = true) {
  if (!DIFF_ORDER.includes(id)) return;
  game.difficulty = id;
  try { localStorage.setItem('bolonki:difficulty', id); } catch (e) { /* sin storage */ }
  if (notify) onDifficulty(id);
}
export function savedDifficulty() {
  try { return localStorage.getItem('bolonki:difficulty'); } catch (e) { return null; }
}

// Espacio / tocar: empezar, reintentar o golpe fuerte según el momento
export function actionPress() {
  ensureAudio();
  const st = game.state;
  if (st === 'title' || st === 'end' || (st === 'play' && game.humanOut)) { resetMatch('count'); return; }
  if (st === 'play' || st === 'count') {
    const p = game.players[0];
    if (p.alive && p.cd <= 0) startSwing(p);
  }
}

function cycleDifficulty(dir) {
  const i = DIFF_ORDER.indexOf(game.difficulty);
  setDifficulty(DIFF_ORDER[(i + dir + DIFF_ORDER.length) % DIFF_ORDER.length]);
  ensureAudio(); SFX.select();
}

export function initInput({ stage, onDifficultyChange }) {
  onDifficulty = onDifficultyChange || onDifficulty;
  const input = game.input;

  window.addEventListener('keydown', (e) => {
    if (e.target && e.target.tagName === 'SELECT') return;
    const k = e.code;
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].includes(k)) e.preventDefault();
    if (game.state === 'title' && !e.repeat) {
      // en la pantalla de título, izquierda/derecha eligen la dificultad
      if (k === 'ArrowLeft' || k === 'KeyA') { cycleDifficulty(-1); return; }
      if (k === 'ArrowRight' || k === 'KeyD') { cycleDifficulty(1); return; }
    }
    if (k === 'ArrowLeft' || k === 'KeyA') input.l = true;
    if (k === 'ArrowRight' || k === 'KeyD') input.r = true;
    if ((k === 'Space' || k === 'KeyJ' || k === 'Enter') && !e.repeat) actionPress();
    if (k === 'KeyP' || k === 'Escape') {
      if (game.state === 'play') game.state = 'paused';
      else if (game.state === 'paused') game.state = 'play';
    }
    if (k === 'KeyR' && game.state !== 'title') { ensureAudio(); resetMatch('count'); }
  });
  window.addEventListener('keyup', (e) => {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') input.l = false;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') input.r = false;
  });
  window.addEventListener('blur', () => { input.l = input.r = false; if (game.state === 'play') game.state = 'paused'; });
  stage.addEventListener('pointerdown', () => { stage.focus(); if (game.state === 'title' || game.state === 'end') actionPress(); });

  const hold = (id, on, off) => {
    const el = document.getElementById(id); if (!el) return;
    el.addEventListener('pointerdown', (e) => { e.preventDefault(); el.setPointerCapture(e.pointerId); el.classList.add('on'); on(); });
    const up = () => { el.classList.remove('on'); if (off) off(); };
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up); el.addEventListener('lostpointercapture', up);
  };
  hold('tl', () => (game.state === 'title' ? cycleDifficulty(-1) : (input.l = true)), () => (input.l = false));
  hold('tr', () => (game.state === 'title' ? cycleDifficulty(1) : (input.r = true)), () => (input.r = false));
  hold('th', actionPress);
}
