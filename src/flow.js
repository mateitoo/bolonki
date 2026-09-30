// Flujo del juego: título, menús, partida, pausa y fin. Conecta la entrada con los menús y la partida.
//
// Menú principal: FIESTA / MINIJUEGOS (las dos "puertas") -> la sala (unirse y elegir personaje)
// -> opciones -> partida. ONLINE: crear sala (la misma pantalla de sala) o unirse a una.
import { charOf } from './chars.js';
import { game } from './state.js';
import { settings, saveSettings, IS_DESKTOP, DEFAULTS, RESETTABLE } from './settings.js';
import { DIFFICULTIES, DIFF_ORDER } from './config.js';
import { input, has, freezeControls, isTouch } from './input.js';
import { applyDisplay, enterFullscreen, exitFullscreen, isFullscreen, canFullscreen, fullscreenPending } from './display.js';
import { SFX, setVolume, setMuted, setBackgroundSound } from './audio.js';
const applySfxVolume = () => setVolume((settings.sfx / 10) * ((settings.master === undefined ? 10 : settings.master) / 10));
import { resetMatch, eliminate, deathsRunning, soloSetup, demoSetup, pointsFor, placement } from './game/match.js';
import { localHit } from './game/controls.js';
import { mg, MINIGAMES } from './minigames/registry.js';
import { DEATH_ANIMS } from './deaths/index.js';
import { openMenu, closeMenu, replaceMenus, closeAllMenus, menuOpen, menuInput, topMenu } from './ui/menu.js';
import { COL, ui, txt, rect } from './ui/draw.js';
import { yesNo } from './ui/values.js';
import { doorsMenu } from './ui/mainMenu.js';
import { ONLINE, ONLINE_PAUSE, onlineEndMenu, initMultiplayer, editName } from './multiplayer.js';
import { guestHit } from './net/online.js';
import { startFiesta, fiestaMinigameDone, fiestaRankArt } from './fiesta/board.js';
import { openSala, setSalaHooks, salaKind } from './sala/sala.js';
import { showToast } from './hud.js';
import { FS_ACTION, CAM_ACTION } from './ui/fsAction.js';
import { ACHIEVEMENTS, hasAch, achCount, checkMatchEnd, setAchNotify } from './achievements.js';

const set = (key, after) => (v) => { settings[key] = v; saveSettings(); if (after) after(v); };

/* ---------- pantallas ---------- */
// dibujito para LOGROS: fichas doradas (los que tenés) y apagadas
function logrosArt(x, y, w, h) {
  rect(x, y, w, h, '#0b1020');
  const cols = 5, rows = Math.ceil(ACHIEVEMENTS.length / cols), s = Math.min(Math.floor((w - 20) / cols) - 4, Math.floor((h - 16) / rows) - 4);
  const x0 = x + Math.round((w - cols * (s + 4)) / 2), y0 = y + Math.round((h - rows * (s + 4)) / 2);
  ACHIEVEMENTS.forEach((a, k) => {
    const bx = x0 + (k % cols) * (s + 4), by = y0 + Math.floor(k / cols) * (s + 4), on = hasAch(a.id);
    rect(bx, by, s, s, on ? '#6a3a00' : '#161c34'); rect(bx + 2, by + 2, s - 4, s - 4, on ? COL.gold : '#20284a');
    if (on) { rect(bx + s / 2 - 1, by + 4, 2, s - 10, '#fff2b0'); rect(bx + 4, by + s / 2 - 1, s - 8, 2, '#fff2b0'); }
  });
}
// dibujito para OPCIONES en el menú principal: las solapas como fichas y unas barritas
function optionsArt(x, y, w, h) {
  rect(x, y, w, h, '#0b1020');
  const tabs = ['VIDEO', 'SONIDO', 'CONTROL', 'JUEGO', 'FIESTA'];
  tabs.forEach((t, k) => {
    const on = k === (Math.floor((ui.clock || 0) / 1.2) % tabs.length);
    const ty = y + 8 + k * Math.floor((h - 12) / tabs.length), bw = w - 20;
    rect(x + 10, ty, bw, 12, on ? 'rgba(45,224,200,.25)' : 'rgba(45,224,200,.06)');
    txt(t, x + 16, ty + 2, 8, on ? COL.white : COL.dim);
    for (let b = 0; b < 8; b++) rect(x + 10 + bw - 64 + b * 7, ty + 3, 5, 6, b < 3 + ((k * 3) % 5) ? (on ? COL.gold : COL.teal) : '#2a3150');
  });
}
export const MAIN = doorsMenu({
  doors: [
    { label: 'FIESTA', sub: 'TABLERO, DADOS Y COPAS', thumb: () => 'fiesta', action: () => openSala('fiesta'),
      desc: ['TABLERO, DADOS Y COPAS', 'TIRÁ EL DADO, JUGÁ MINIJUEGOS', 'Y JUNTÁ MÁS COPAS QUE LOS DEMÁS'] },
    { label: 'MINIJUEGOS', sub: 'ELEGÍ UNO Y A JUGAR', thumb: () => { const n = MINIGAMES.length, k = Math.floor((ui.clock || 0) / 2.2) || 0; return MINIGAMES[((k % n) + n) % n].id; }, action: () => openSala('libre'),
      desc: () => [`${MINIGAMES.length} MINIJUEGOS · ELEGÍ UNO Y A JUGAR`, 'DE 1 A 4 JUGADORES EN LA MISMA COMPU', 'LOS LUGARES LIBRES LOS JUEGA LA CPU'] },
  ],
  row: [
    { label: 'ONLINE', action: () => openMenu(ONLINE), thumb: () => { const n = MINIGAMES.length, k = Math.floor((ui.clock || 0) / 1.6) || 0; return MINIGAMES[((k % n) + n) % n].id; },
      desc: ['JUGÁ CON AMIGOS POR INTERNET', 'CREÁ UNA SALA Y PASALES EL CÓDIGO', 'O ENTRÁ A UNA SALA PÚBLICA'] },
    { label: 'LOGROS', action: () => openMenu(LOGROS), art: logrosArt,
      desc: () => [`${achCount()} DE ${ACHIEVEMENTS.length} LOGRADOS`, 'GANÁ EN CADA MINIJUEGO, EN LA FIESTA', 'Y CONTRA LA CPU EN EXTREMO'] },
    { label: 'OPCIONES', action: () => openMenu(OPTIONS), art: optionsArt,
      desc: ['VIDEO, SONIDO Y CONTROLES', 'AYUDA PARA APUNTAR, VIBRACIÓN', 'Y QUÉ MINIJUEGOS SALEN EN LA FIESTA'] },
  ],
  corner: { label: 'SALIR', action: () => quit() },
  sound: { on: () => !settings.muted, toggle: () => { settings.muted = !settings.muted; saveSettings(); setMuted(settings.muted); } },
  onBack: () => goTitle(),
});

// ¿estamos en la Fiesta? (en el tablero o en un minijuego que salió en el tablero)
export const inFiesta = () => game.minigame === 'fiesta' || !!(game.setup && game.setup.fiesta);

// La sala arranca la partida (solitario o local) con quiénes juegan y sus personajes
function startFromSala(kind, setup) {
  if (kind === 'fiesta') {
    closeAllMenus();
    game.difficulty = settings.difficulty;
    startFiesta(setup, settings.turns);
  } else startMatch(Object.assign({}, setup, { mg: settings.mg, points: pointsFor(settings.mg) }));
}

let fiestaTab = null;
const onOff = [{ v: true, label: 'SÍ' }, { v: false, label: 'NO' }];
const touchOnly = () => !isTouch();
const infoRow = (label, value) => ({ kind: 'info', label, value, valueColor: () => COL.text, hidden: () => isTouch() });   // teclas: en el celular no van
export const OPTIONS = {
  id: 'options', title: 'OPCIONES', width: 300, tabGap: 3, tabPad: 8,
  tabs: [
    { label: 'VIDEO', items: [
      { kind: 'choice', label: 'PANTALLA COMPLETA', values: yesNo, hidden: () => !canFullscreen(), get: () => isFullscreen() || fullscreenPending(),
        set: set('fullscreen', (v) => (v ? enterFullscreen() : exitFullscreen())) },
      { kind: 'info', label: 'PANTALLA COMPLETA', value: 'AGREGALO AL INICIO', hidden: () => canFullscreen() },
      { kind: 'choice', label: 'ASPECTO', values: [{ v: 'wide', label: 'PANORÁMICO' }, { v: '4:3', label: '4:3' }],
        get: () => settings.aspect, set: set('aspect', applyDisplay) },
      { kind: 'choice', label: 'CALIDAD', values: [{ v: '240', label: '240P' }, { v: '480', label: '480P' }, { v: 'sharp', label: 'HD' }],
        get: () => settings.quality, set: set('quality', applyDisplay) },
      { kind: 'choice', label: 'ESCALADO ENTERO', values: [{ v: 'auto', label: 'AUTOMÁTICO' }].concat(yesNo),
        get: () => settings.integer, set: set('integer', applyDisplay) },
      { kind: 'choice', label: 'LÍNEAS DE TV', values: yesNo, get: () => settings.scanlines, set: set('scanlines', applyDisplay) },
      { kind: 'choice', label: 'VÉRTICES QUE TIEMBLAN', values: onOff, get: () => settings.psx !== false, set: set('psx', applyDisplay), hidden: () => settings.quality === 'sharp' },
      { kind: 'choice', label: 'TRAMADO DE COLOR', values: onOff, get: () => settings.dither !== false, set: set('dither', applyDisplay), hidden: () => settings.quality === 'sharp' },
      { kind: 'choice', label: 'TEMBLOR DE PANTALLA', values: onOff, get: () => settings.shake !== false, set: set('shake') },
      { kind: 'choice', label: 'MOSTRAR FPS', values: onOff, get: () => !!settings.fps, set: set('fps') },
    ] },
    { label: 'SONIDO', items: [
      { kind: 'slider', label: 'VOLUMEN GENERAL', max: 10, get: () => (settings.master === undefined ? 10 : settings.master), set: set('master', applySfxVolume) },
      { kind: 'slider', label: 'EFECTOS', max: 10, get: () => settings.sfx, set: set('sfx', applySfxVolume) },
      { kind: 'slider', label: 'MÚSICA', max: 10, get: () => settings.music, set: set('music') },
      { kind: 'choice', label: 'SILENCIAR TODO', values: onOff, get: () => !!settings.muted, set: set('muted', (v) => setMuted(v)) },
      { kind: 'choice', label: 'SONIDO EN SEGUNDO PLANO', values: onOff, get: () => !!settings.bgSound, set: set('bgSound', (v) => setBackgroundSound(v)) },
    ] },
    { label: 'CONTROL', items: [
      { kind: 'choice', label: 'AYUDA PARA APUNTAR', values: onOff, get: () => settings.aim !== false, set: set('aim') },
      { kind: 'choice', label: 'VIBRACIÓN', values: onOff, get: () => settings.vibrate !== false, set: set('vibrate') },
      { kind: 'slider', label: 'SENSIB. DE CÁMARA', max: 10, get: () => settings.camSens || 5, set: (v) => { settings.camSens = Math.max(1, v); saveSettings(); } },
      { kind: 'choice', label: 'INVERTIR CÁMARA', values: onOff, get: () => !!settings.camInvert, set: set('camInvert') },
      { kind: 'choice', label: 'BOTONES TÁCTILES', hidden: touchOnly, values: [{ v: 'chico', label: 'CHICOS' }, { v: 'normal', label: 'NORMALES' }, { v: 'grande', label: 'GRANDES' }],
        get: () => settings.touchSize || 'normal', set: set('touchSize', applyDisplay) },
      { kind: 'choice', label: 'MOVERSE CON', hidden: touchOnly, values: [{ v: 'joystick', label: 'JOYSTICK' }, { v: 'flechas', label: 'FLECHAS' }],
        get: () => settings.pad || 'joystick', set: set('pad', applyDisplay) },
      { kind: 'choice', label: 'GIRAR CÁMARA CON EL DEDO', hidden: touchOnly, values: onOff, get: () => !!settings.touchCam, set: set('touchCam') },
      { kind: 'choice', label: 'CONTROLES A LA', hidden: touchOnly, values: [{ v: 'left', label: 'IZQUIERDA' }, { v: 'right', label: 'DERECHA' }],
        get: () => settings.stickSide || 'left', set: set('stickSide', applyDisplay) },
      { kind: 'info', label: 'TECLADO Y JOYSTICK', labelColor: () => COL.teal, hidden: () => isTouch() },
      infoRow('MOVER', 'FLECHAS / WASD / STICK'),
      infoRow('ACCIÓN', 'ESPACIO / CTRL / A'),
      infoRow('PAUSA', 'ESC / START'),
      infoRow('LOCAL J1', 'FLECHAS · ESPACIO'),
      infoRow('LOCAL J2', 'WASD · E / Q'),
      infoRow('CAMBIAR SOLAPA', 'Q E / LB RB'),
      infoRow('GIRAR CÁMARA', 'ARRASTRAR · C CENTRA'),
      infoRow('PANTALLA COMPLETA', 'F'),
    ] },
    { label: 'JUEGO', items: [
      { kind: 'action', label: 'APODO ONLINE', left: true, value: () => settings.name || 'SIN APODO', action: () => editName() },
      { kind: 'choice', label: 'CPU', values: DIFF_ORDER.map((d) => ({ v: d, label: DIFFICULTIES[d].label })), get: () => settings.difficulty, set: set('difficulty', (v) => { game.difficulty = v; }) },
      { kind: 'choice', label: 'INSTRUCCIONES', values: [{ v: 'normal', label: 'NORMALES' }, { v: 'corta', label: 'CORTAS' }], get: () => settings.intro || 'normal', set: set('intro') },
      { kind: 'choice', label: 'NOMBRES EN PANTALLA', values: onOff, get: () => settings.tags !== false, set: set('tags') },
      { kind: 'choice', label: 'DERROTA', values: [{ v: 'random', label: 'ALEATORIA' }].concat(DEATH_ANIMS.map((a) => ({ v: a.id, label: a.name }))),
        get: () => settings.deathId, set: set('deathId') },
      { kind: 'action', label: 'VER DERROTA EN CPU', left: true, hidden: () => game.state !== 'menu', action: () => showcaseDeath() },
      { kind: 'action', label: 'RESTABLECER OPCIONES', left: true, danger: true, action: () => openMenu(RESET) },
    ] },
    // FIESTA: cuántos turnos y qué minijuegos salen en el tablero
    { label: 'FIESTA', get items() { return fiestaTab || (fiestaTab = [
      { kind: 'choice', label: 'TURNOS', values: [5, 10, 15, 20].map((v) => ({ v, label: String(v) })), get: () => settings.turns, set: set('turns') },
      { kind: 'info', label: 'MINIJUEGOS QUE SALEN', labelColor: () => COL.teal },
      ...mgToggleItems(),
    ]); } },
  ],
};

// Logros: la lista, con los que ya tenés en dorado
export const LOGROS = {
  id: 'logros', title: 'LOGROS', width: 340,
  get items() {
    return [{ kind: 'info', center: true, label: () => `${achCount()} DE ${ACHIEVEMENTS.length}`, labelColor: () => COL.teal }]
      .concat(ACHIEVEMENTS.map((a) => ({ kind: 'action', left: true, label: a.name, value: a.desc, labelColor: () => (hasAch(a.id) ? COL.gold : COL.dim),
        valueColor: () => (hasAch(a.id) ? COL.text : '#4a5270'), action: () => {} })));
  },
};

// confirmación para volver las opciones a como vienen
const RESET = {
  id: 'reset', title: '¿RESTABLECER?', width: 250,
  items: [
    { kind: 'info', label: 'VIDEO, SONIDO Y CONTROLES', center: true },
    { kind: 'info', label: 'VUELVEN A COMO VENÍAN', center: true },
    { kind: 'action', label: 'SÍ, RESTABLECER', danger: true, action: () => {
      RESETTABLE.forEach((k) => { settings[k] = DEFAULTS[k]; });
      saveSettings(); applyDisplay(); applySfxVolume(); setMuted(settings.muted); setBackgroundSound(settings.bgSound);
      closeMenu(); showToast('OPCIONES RESTABLECIDAS');
    } },
    { kind: 'action', label: 'NO', action: () => closeMenu() },
  ],
};

const PAUSE = {
  id: 'pause', title: 'PAUSA',
  items: [
    { kind: 'action', label: 'CONTINUAR', action: () => resume() },
    { kind: 'action', label: 'REINICIAR', hidden: () => inFiesta(), action: () => startMatch(game.setup) },
    { kind: 'action', label: 'OPCIONES', action: () => openMenu(OPTIONS) },
    FS_ACTION,
    CAM_ACTION,
    { kind: 'action', label: 'SALIR AL MENÚ', danger: true, action: () => goMainMenu() },
  ],
  onBack: () => resume(),
};

// Título del cartel de fin: "¡GANASTE!" si ganaste vos, o el nombre de quien ganó
export function winnerTitle() {
  const w = game.winner, p = game.players[w];
  if (!p) return { title: 'FIN', color: COL.white };
  if (w === game.me && game.mode !== 'local') return { title: '¡GANASTE!', color: COL.gold };
  return { title: `GANA ${p.name || charOf(w).name}`, color: charOf(w).col };
}

function endMenu() {
  const t = winnerTitle();
  const board = game.minigame === 'fiesta';
  return {
    id: 'end', title: t.title, titleColor: t.color, offsetY: board ? 0 : 16, width: board ? 250 : undefined,
    items: (board ? [fiestaRankArt()] : []).concat([
      { kind: 'action', label: board ? 'OTRA FIESTA' : 'REVANCHA', action: () => startMatch(game.setup) },
      { kind: 'action', label: 'VOLVER A LA SALA', action: () => openSala(salaKind(), true) },
      { kind: 'action', label: 'MENÚ PRINCIPAL', action: () => goMainMenu() },
    ]),
    onBack: () => goMainMenu(),
  };
}

/* ---------- transiciones ---------- */
let wantFullscreen = true;
export function goTitle() { closeAllMenus(); if (game.state !== 'title' && game.state !== 'menu') resetMatch('title'); game.state = 'title'; }
export function goMainMenu() {
  if ((game.state !== 'title' && game.state !== 'menu') || game.minigame === 'sala') resetMatch('menu');
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
let endSeen = false;
export function updateFlow() {
  const online = game.online !== 'off';
  // logros: una vez por partida terminada
  if (game.state === 'end') { if (!endSeen) { endSeen = true; checkMatchEnd(); } } else if (game.state === 'play' || game.state === 'count') endSeen = false;
  if (has('blur') && !online && (game.state === 'play' || game.state === 'count')) pause();

  // "ver derrota": el menú se esconde mientras dura la animación
  if (game.showcaseT > 0) {
    if (!deathsRunning()) { game.showcaseT -= 1 / 60; }
    return;
  }

  // Fiesta: terminó un minijuego; se ve un ratito quién ganó y se vuelve al tablero
  if (fiestaBack && performance.now() >= fiestaBack.at) {
    const r = fiestaBack.ranking; fiestaBack = null;
    if (game.state === 'end' && inFiesta()) fiestaMinigameDone(r);
  }

  input.typing = !!(menuOpen() && topMenu().def.typing);    // escribiendo: la F es una letra, no pantalla completa
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
      if (game.humanOut) { if (!online && !inFiesta() && (has('confirm') || has('start'))) startMatch(game.setup); break; }
      // golpe fuerte de cada nave de esta máquina (en el local, cada jugador con sus teclas)
      // en el tablero de la Fiesta, ENTER también sirve para tirar el dado y elegir
      const board = game.minigame === 'fiesta';
      for (const p of game.players) {
        if (p.ctrl !== 'local' || !p.alive || p.cd > 0) continue;
        if (!localHit(p) && !(board && (p.pad === 'all' || p.pad === 'p1' || !p.pad) && has('confirm'))) continue;
        if (game.online === 'guest') guestHit(); else mg().onLocalHit(p);
      }
      break;
    }
    case 'end':
      if (inFiesta() && game.minigame !== 'fiesta') break;     // minijuego de la Fiesta: vuelve solo al tablero
      replaceMenus(online ? onlineEndMenu() : endMenu());
      break;
    default: break;
  }
}

let fiestaBack = null;
export function onMatchEnd() {
  if (inFiesta() && game.minigame !== 'fiesta') { fiestaBack = { at: performance.now() + 2200, ranking: placement() }; return; }
  replaceMenus(game.online !== 'off' ? onlineEndMenu() : endMenu());
}

// Opciones > Minijuegos: cuáles salen en la Fiesta (siempre tiene que quedar al menos uno)
function mgToggleItems() {
  return MINIGAMES.map((m) => ({
    kind: 'choice', label: m.name, values: yesNo,
    get: () => !settings.mgOff.includes(m.id),
    set: (v) => {
      const off = settings.mgOff.filter((id) => id !== m.id);
      if (!v) {
        if (MINIGAMES.every((q) => q.id === m.id || off.includes(q.id))) { showToast('TIENE QUE QUEDAR AL MENOS UNO'); return; }
        off.push(m.id);
      }
      settings.mgOff = off; saveSettings();
    },
  }));
}
export function initFlow() {
  setAchNotify((a) => { SFX.win ? SFX.win() : SFX.confirm(); showToast(`LOGRO: ${a.name}`); });
  applySfxVolume(); setMuted(settings.muted); setBackgroundSound(settings.bgSound); game.difficulty = settings.difficulty;
  setSalaHooks({ startLocal: startFromSala, toMain: () => goMainMenu() });
  initMultiplayer();
}
export const inDemo = () => game.state === 'title' || game.state === 'menu';
export { input };

// para las pruebas (?debug): abrir pantallas directamente
try { if (new URLSearchParams(location.search).has('debug')) window.__ui = { openMenu, replaceMenus, closeAllMenus, goMainMenu, OPTIONS, MAIN, ONLINE, openSala, startMatch }; } catch (e) { /* nada */ }
