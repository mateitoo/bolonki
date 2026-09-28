// Flujo del juego: título, menús, partida, pausa y fin. Conecta la entrada con los menús y la partida.
import { DIFFICULTIES, DIFF_ORDER, CHARS } from './config.js';
import { game } from './state.js';
import { settings, saveSettings, IS_DESKTOP } from './settings.js';
import { input, has } from './input.js';
import { applyDisplay, enterFullscreen, exitFullscreen, isFullscreen } from './display.js';
import { SFX, setVolume } from './audio.js';
import { resetMatch, startSwing, eliminate, deathsRunning } from './game/match.js';
import { DEATH_ANIMS } from './deaths/index.js';
import { openMenu, replaceMenus, closeMenu, closeAllMenus, menuOpen, menuInput } from './ui/menu.js';

const yesNo = [{ v: true, label: 'SÍ' }, { v: false, label: 'NO' }];
const set = (key, after) => (v) => { settings[key] = v; saveSettings(); if (after) after(v); };

/* ---------- pantallas ---------- */
const MAIN = {
  id: 'main', style: 'big',
  items: [
    { kind: 'action', label: 'JUGAR', action: () => openMenu(PLAY) },
    { kind: 'action', label: 'OPCIONES', action: () => openMenu(OPTIONS) },
    { kind: 'action', label: 'SALIR', corner: true, action: () => quit() },
  ],
  onBack: () => goTitle(),
};

const PLAY = {
  id: 'play', title: 'PARTIDA', width: 250,
  items: [
    { kind: 'info', label: 'PERSONAJE', value: `${CHARS[0].name} (PRONTO MÁS)` },
    { kind: 'choice', label: 'CPU', values: DIFF_ORDER.map((d) => ({ v: d, label: DIFFICULTIES[d].label })),
      get: () => settings.difficulty, set: set('difficulty', (v) => (game.difficulty = v)) },
    { kind: 'choice', label: 'PUNTOS', values: [5, 10, 15].map((n) => ({ v: n, label: String(n) })),
      get: () => settings.points, set: set('points') },
    { kind: 'action', label: 'COMENZAR', action: () => startMatch() },
  ],
};

const OPTIONS = {
  id: 'options', title: 'OPCIONES', width: 290,
  tabs: [
    { label: 'VIDEO', items: [
      { kind: 'choice', label: 'PANTALLA COMPLETA', values: yesNo, get: () => settings.fullscreen,
        set: set('fullscreen', (v) => (v ? enterFullscreen() : exitFullscreen())) },
      { kind: 'choice', label: 'ASPECTO', values: [{ v: 'wide', label: 'PANORÁMICO' }, { v: '4:3', label: '4:3' }],
        get: () => settings.aspect, set: set('aspect', applyDisplay) },
      { kind: 'choice', label: 'CALIDAD', values: [{ v: '240', label: '240P' }, { v: '480', label: '480P' }, { v: 'sharp', label: 'NÍTIDA' }],
        get: () => settings.quality, set: set('quality', applyDisplay) },
      { kind: 'choice', label: 'ESCALADO ENTERO', values: yesNo, get: () => settings.integer, set: set('integer', applyDisplay) },
      { kind: 'choice', label: 'SCANLINES', values: yesNo, get: () => settings.scanlines, set: set('scanlines', applyDisplay) },
    ] },
    { label: 'AUDIO', items: [
      { kind: 'slider', label: 'EFECTOS', max: 10, get: () => settings.sfx, set: set('sfx', (v) => setVolume(v / 10)) },
      { kind: 'info', label: 'MÚSICA', value: 'PRÓXIMAMENTE' },
    ] },
    { label: 'CONTROLES', items: [
      { kind: 'info', label: 'MOVER', value: 'FLECHAS / STICK' },
      { kind: 'info', label: 'GOLPE FUERTE', value: 'ESPACIO / A' },
      { kind: 'info', label: 'PAUSA', value: 'ESC / START' },
      { kind: 'info', label: 'VOLVER', value: 'ESC / B' },
      { kind: 'info', label: 'CAMBIAR SOLAPA', value: 'Q E / LB RB' },
      { kind: 'info', label: 'PANTALLA COMPLETA', value: 'F' },
    ] },
    { label: 'EXTRAS', items: [
      { kind: 'choice', label: 'DERROTA', values: [{ v: 'random', label: 'ALEATORIA' }].concat(DEATH_ANIMS.map((a) => ({ v: a.id, label: a.name }))),
        get: () => settings.deathId, set: set('deathId') },
      { kind: 'action', label: 'VER DERROTA EN CPU', hidden: () => game.state !== 'menu', action: () => showcaseDeath() },
    ] },
  ],
};

const PAUSE = {
  id: 'pause', title: 'PAUSA',
  items: [
    { kind: 'action', label: 'CONTINUAR', action: () => resume() },
    { kind: 'action', label: 'REINICIAR', action: () => startMatch() },
    { kind: 'action', label: 'OPCIONES', action: () => openMenu(OPTIONS) },
    { kind: 'action', label: 'SALIR AL MENÚ', danger: true, action: () => goMainMenu() },
  ],
  onBack: () => resume(),
};

function endMenu() {
  const won = game.winner === 0;
  return {
    id: 'end', title: won ? '¡GANASTE!' : `GANA ${CHARS[game.winner].name}`,
    titleColor: won ? '#ff9a1f' : CHARS[game.winner].col, offsetY: 16,
    items: [
      { kind: 'action', label: 'REVANCHA', action: () => startMatch() },
      { kind: 'action', label: 'MENÚ PRINCIPAL', action: () => goMainMenu() },
    ],
    onBack: () => goMainMenu(),
  };
}

/* ---------- transiciones ---------- */
let wantFullscreen = true;
export function goTitle() { closeAllMenus(); if (game.state !== 'title' && game.state !== 'menu') resetMatch('title'); game.state = 'title'; }
export function goMainMenu() {
  if (game.state !== 'title' && game.state !== 'menu') resetMatch('menu');
  game.state = 'menu';
  replaceMenus(MAIN);
}
export function startMatch() {
  closeAllMenus();
  game.difficulty = settings.difficulty;
  resetMatch('count');
}
let prevState = 'play';
function pause() {
  if (game.state !== 'play' && game.state !== 'count') return;
  prevState = game.state; game.state = 'paused'; SFX.back(); replaceMenus(PAUSE);
}
function resume() { closeAllMenus(); if (game.state === 'paused') game.state = prevState; }
// En Steam cierra el juego; en la web vuelve al título y sale de pantalla completa
function quit() {
  if (IS_DESKTOP && window.bolonkiDesktop.quit) { window.bolonkiDesktop.quit(); return; }
  exitFullscreen(); wantFullscreen = true; goTitle();
}
function showcaseDeath() {
  const cpus = game.players.filter((p) => p.alive);
  if (cpus.length <= 1) { resetMatch('menu'); return; }
  game.showcaseT = 0.4;
  eliminate(cpus[(Math.random() * cpus.length) | 0].i);
}

function maybeFullscreen() { if (settings.fullscreen && wantFullscreen && !isFullscreen()) { enterFullscreen(); wantFullscreen = false; } }

/* ---------- por frame ---------- */
export function updateFlow() {
  if (has('blur') && (game.state === 'play' || game.state === 'count')) pause();

  // "ver derrota": el menú se esconde mientras dura la animación
  if (game.showcaseT > 0) {
    if (!deathsRunning()) { game.showcaseT -= 1 / 60; }
    return;
  }

  if (menuOpen()) { menuInput(); return; }

  switch (game.state) {
    case 'title':
      if (has('confirm') || has('start') || has('click')) { SFX.confirm(); maybeFullscreen(); goMainMenu(); }
      break;
    case 'count':
    case 'play': {
      if (has('pause')) { pause(); break; }
      const me = game.players[0];
      if (game.humanOut) { if (has('confirm') || has('start')) startMatch(); break; }
      if (has('hit') && me.alive && me.cd <= 0) startSwing(me);
      break;
    }
    case 'end':
      replaceMenus(endMenu());
      break;
    default: break;
  }
}

export function onMatchEnd() { replaceMenus(endMenu()); }
export function initFlow() { setVolume(settings.sfx / 10); game.difficulty = settings.difficulty; }
export const inDemo = () => game.state === 'title' || game.state === 'menu';
export { input };
