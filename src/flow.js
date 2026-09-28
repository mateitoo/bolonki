// Flujo del juego: título, menús, partida, pausa y fin. Conecta la entrada con los menús y la partida.
import { CHARS } from './config.js';
import { game } from './state.js';
import { settings, saveSettings, IS_DESKTOP } from './settings.js';
import { input, has, freezeControls } from './input.js';
import { applyDisplay, enterFullscreen, exitFullscreen, isFullscreen } from './display.js';
import { SFX, setVolume } from './audio.js';
import { resetMatch, eliminate, deathsRunning, soloSetup, localSetup, demoSetup, pointsFor } from './game/match.js';
import { localHit } from './game/controls.js';
import { mg, mgById } from './minigames/registry.js';
import { DEATH_ANIMS } from './deaths/index.js';
import { openMenu, replaceMenus, closeAllMenus, menuOpen, menuInput } from './ui/menu.js';
import { COL } from './ui/draw.js';
import { yesNo, diffValues, mgChoice, mgArt, mgDescCentered, pointsChoice, botValues } from './ui/values.js';
import { MULTI, ONLINE_PAUSE, onlineEndMenu, initMultiplayer } from './multiplayer.js';
import { guestHit } from './net/online.js';

const set = (key, after) => (v) => { settings[key] = v; saveSettings(); if (after) after(v); };

/* ---------- pantallas ---------- */
export const MAIN = {
  id: 'main', style: 'big', noFooter: true,
  items: [
    { kind: 'action', label: 'JUGAR', action: () => openMenu(JUGAR) },
    { kind: 'action', label: 'OPCIONES', action: () => openMenu(OPTIONS) },
    { kind: 'action', label: 'SALIR', corner: true, action: () => quit() },
  ],
  onBack: () => goTitle(),
};

export const JUGAR = {
  id: 'jugar', title: 'JUGAR', width: 240,
  items: [
    { kind: 'action', label: 'SOLITARIO', action: () => openMenu(SOLO) },
    { kind: 'action', label: 'MULTIJUGADOR', action: () => openMenu(MULTI) },
  ],
};

const setPoints = (v) => { settings[mgById(settings.mg).points.key] = v; saveSettings(); };

const SOLO = {
  id: 'solo', title: 'SOLITARIO', width: 270,
  items: [
    mgChoice(() => settings.mg, set('mg')),
    mgArt(() => settings.mg),
    mgDescCentered(() => settings.mg),
    { kind: 'info', label: 'PERSONAJE', value: `${CHARS[0].name} (PRONTO MÁS)` },
    { kind: 'choice', label: 'CPU', values: diffValues, get: () => settings.difficulty, set: set('difficulty', (v) => (game.difficulty = v)) },
    pointsChoice(() => settings.mg, () => pointsFor(settings.mg), setPoints),
    { kind: 'action', label: 'COMENZAR', action: () => startMatch(soloSetup()) },
  ],
};

// Multijugador local: 2 a 4 en la misma compu (teclado compartido y/o joysticks)
const padStatus = (n) => (input.pads >= n ? `JOYSTICK ${n}` : `JOYSTICK ${n} (NO HAY)`);
export const LOCAL = {
  id: 'local', title: 'MULTIJUGADOR LOCAL', width: 300, rowH: 11,
  items: [
    mgChoice(() => settings.mg, set('mg')),
    mgArt(() => settings.mg, 52),
    mgDescCentered(() => settings.mg),
    { kind: 'choice', label: 'JUGADORES', values: [2, 3, 4].map((n) => ({ v: n, label: String(n) })),
      get: () => settings.localPlayers, set: set('localPlayers') },
    { kind: 'info', label: 'J1', labelColor: () => CHARS[0].col, value: () => (input.pads >= 1 ? 'FLECHAS+ESPACIO/CTRL O JOY 1' : 'FLECHAS · ESPACIO / CTRL') },
    { kind: 'info', label: 'J2', labelColor: () => CHARS[2].col, value: () => (input.pads >= 2 ? 'WASD+E/Q O JOY 2' : 'WASD · E / Q') },
    { kind: 'info', label: 'J3', labelColor: () => CHARS[1].col, hidden: () => settings.localPlayers < 3,
      value: () => padStatus(3), valueColor: () => (input.pads >= 3 ? COL.text : COL.red) },
    { kind: 'info', label: 'J4', labelColor: () => CHARS[3].col, hidden: () => settings.localPlayers < 4,
      value: () => padStatus(4), valueColor: () => (input.pads >= 4 ? COL.text : COL.red) },
    { kind: 'choice', label: 'BOTS EN LUGARES LIBRES', values: botValues, hidden: () => settings.localPlayers >= 4,
      get: () => (settings.localBots ? settings.difficulty : 'no'),
      set: (v) => { settings.localBots = v !== 'no'; if (v !== 'no') { settings.difficulty = v; game.difficulty = v; } saveSettings(); } },
    pointsChoice(() => settings.mg, () => pointsFor(settings.mg), setPoints),
    { kind: 'action', label: 'COMENZAR', action: () => startMatch(localSetup(settings.localPlayers, settings.localBots, pointsFor(settings.mg), settings.mg)) },
  ],
};

export const OPTIONS = {
  id: 'options', title: 'OPCIONES', width: 290,
  tabs: [
    { label: 'VIDEO', items: [
      { kind: 'choice', label: 'PANTALLA COMPLETA', values: yesNo, get: () => settings.fullscreen,
        set: set('fullscreen', (v) => (v ? enterFullscreen() : exitFullscreen())) },
      { kind: 'choice', label: 'ASPECTO', values: [{ v: 'wide', label: 'PANORÁMICO' }, { v: '4:3', label: '4:3' }],
        get: () => settings.aspect, set: set('aspect', applyDisplay) },
      { kind: 'choice', label: 'CALIDAD', values: [{ v: '240', label: '240P' }, { v: '480', label: '480P' }, { v: 'sharp', label: 'HD' }],
        get: () => settings.quality, set: set('quality', applyDisplay) },
      { kind: 'choice', label: 'ESCALADO ENTERO', values: [{ v: 'auto', label: 'AUTOMÁTICO' }].concat(yesNo),
        get: () => settings.integer, set: set('integer', applyDisplay) },
      { kind: 'choice', label: 'SCANLINES', values: yesNo, get: () => settings.scanlines, set: set('scanlines', applyDisplay) },
    ] },
    { label: 'AUDIO', items: [
      { kind: 'slider', label: 'EFECTOS', max: 10, get: () => settings.sfx, set: set('sfx', (v) => setVolume(v / 10)) },
      { kind: 'info', label: 'MÚSICA', value: 'PRÓXIMAMENTE' },
    ] },
    { label: 'CONTROLES', items: [
      { kind: 'info', label: 'MOVER', value: 'FLECHAS / WASD / STICK' },
      { kind: 'info', label: 'GOLPE FUERTE', value: 'ESPACIO / CTRL / A' },
      { kind: 'info', label: 'PAUSA', value: 'ESC / START' },
      { kind: 'info', label: 'LOCAL J1', value: 'FLECHAS · ESPACIO / CTRL' },
      { kind: 'info', label: 'LOCAL J2', value: 'WASD · E / Q' },
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
    { kind: 'action', label: 'REINICIAR', action: () => startMatch(game.setup) },
    { kind: 'action', label: 'OPCIONES', action: () => openMenu(OPTIONS) },
    { kind: 'action', label: 'SALIR AL MENÚ', danger: true, action: () => goMainMenu() },
  ],
  onBack: () => resume(),
};

// Título del cartel de fin: "¡GANASTE!" si ganaste vos, o el nombre de quien ganó
export function winnerTitle() {
  const w = game.winner, p = game.players[w];
  if (!p) return { title: 'FIN', color: COL.white };
  if (w === game.me && game.mode !== 'local') return { title: '¡GANASTE!', color: COL.gold };
  return { title: `GANA ${p.name || CHARS[w].name}`, color: CHARS[w].col };
}

function endMenu() {
  const t = winnerTitle();
  return {
    id: 'end', title: t.title, titleColor: t.color, offsetY: 16,
    items: [
      { kind: 'action', label: 'REVANCHA', action: () => startMatch(game.setup) },
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
export function startMatch(setup) {
  closeAllMenus();
  game.difficulty = settings.difficulty;
  resetMatch('count', setup || soloSetup());
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
  if (game.minigame !== 'bolas') resetMatch('menu', demoSetup('bolas'));   // las derrotas de la lista son de Bola Brava
  const cpus = game.players.filter((p) => p.alive);
  if (cpus.length <= 1) { resetMatch('menu'); return; }
  game.showcaseT = 0.4;
  eliminate(cpus[(Math.random() * cpus.length) | 0].i);
}

function maybeFullscreen() { if (settings.fullscreen && wantFullscreen && !isFullscreen()) { enterFullscreen(); wantFullscreen = false; } }

/* ---------- por frame ---------- */
export function updateFlow() {
  const online = game.online !== 'off';
  if (has('blur') && !online && (game.state === 'play' || game.state === 'count')) pause();

  // "ver derrota": el menú se esconde mientras dura la animación
  if (game.showcaseT > 0) {
    if (!deathsRunning()) { game.showcaseT -= 1 / 60; }
    return;
  }

  if (menuOpen()) {
    menuInput();
    // en red la partida no se frena: mientras el menú está abierto tu nave se queda quieta
    if (online) freezeControls();
    return;
  }

  switch (game.state) {
    case 'title':
      if (has('any')) { SFX.confirm(); maybeFullscreen(); goMainMenu(); }
      break;
    case 'count':
    case 'play': {
      if (has('pause')) { if (online) { SFX.back(); replaceMenus(ONLINE_PAUSE); } else pause(); break; }
      if (game.humanOut) { if (!online && (has('confirm') || has('start'))) startMatch(game.setup); break; }
      // golpe fuerte de cada nave de esta máquina (en el local, cada jugador con sus teclas)
      for (const p of game.players) {
        if (p.ctrl !== 'local' || !p.alive || p.cd > 0 || !localHit(p)) continue;
        if (game.online === 'guest') guestHit(); else mg().onLocalHit(p);
      }
      break;
    }
    case 'end':
      replaceMenus(online ? onlineEndMenu() : endMenu());
      break;
    default: break;
  }
}

export function onMatchEnd() { replaceMenus(game.online !== 'off' ? onlineEndMenu() : endMenu()); }
export function initFlow() { setVolume(settings.sfx / 10); game.difficulty = settings.difficulty; initMultiplayer(); }
export const inDemo = () => game.state === 'title' || game.state === 'menu';
export { input };
