import '@fontsource/press-start-2p/latin.css';          // la fuente pixel va incluida (no depende de Google Fonts)
// Punto de entrada: arma la escena, conecta pantalla/entrada/menús y corre el loop.
import { closeAllMenus, menuOpen, topMenu } from './ui/menu.js';
import { game } from './state.js';
import { CHARS, SIDES } from './config.js';
import { scene, camera, initRenderer } from './render/psx.js';
import './render/textures.js';
import { buildPod } from './world/pods.js';
import { initParticles } from './fx/particles.js';
import { ensureAudio } from './audio.js';
import { updateMusic, checkSongs, renderSong, musicState } from './music.js';
import { resetMatch, deathsRunning, eliminate, nextDemo, demoSetup } from './game/match.js';
import { MINIGAMES, mg, mgById } from './minigames/registry.js';
import './minigames/bolas.js';
import './minigames/empujon.js';
import './minigames/bombardeo.js';
import './minigames/petardos.js';
import './minigames/futbol.js';
import './minigames/colina.js';
import './minigames/hexagonos.js';
import fiesta, { S as fiestaState, startFiesta } from './fiesta/board.js';
import salaStage from './sala/stage.js';
import { updateVisuals } from './visuals.js';
import { initHud, drawHud, showToast } from './hud.js';
import { initDisplay, toHud, toggleFullscreen, fullscreenGesture, isFullscreen, canFullscreen } from './display.js';
import { input, initInput, pollInput, bindTouch, bindStick, pushEvent } from './input.js';
import { syncNativeText } from './ui/textEntry.js';
import { initFlow, updateFlow, onMatchEnd, inDemo } from './flow.js';
import { initUpdateCheck } from './net/update.js';
import { capsule, initCapsule } from './capsule.js';
import { hostTick, guestFrame, netStats } from './net/online.js';
import { makeThumbs } from './render/thumbs.js';
import { makePortraits } from './render/portraits.js';
import { room, browse } from './net/room.js';
import { settings, saveSettings } from './settings.js';

const stage = document.getElementById('stage');
const screen = document.getElementById('screen');
const glc = document.getElementById('gl');
const hud = document.getElementById('hud');
const renderer = initRenderer(glc);

// --- mundo ---
initParticles();
game.players = [0, 1, 2, 3].map((i) => ({
  i, ch: CHARS[i], side: SIDES[i], s: 0, v: 0, x: 0, z: 0, vx: 0, vz: 0, score: 0, alive: true, ctrl: 'ai', empty: false, net: null,
  swing: 0, cd: 0, hitDone: false, target: 0, thinkT: 0, err: 0, errT: 0, flash: 0, spin: 0, death: null,
  mesh: buildPod(i),
}));
MINIGAMES.forEach((m) => m.build());
fiesta.build();                    // el tablero de la Fiesta (no es un minijuego elegible)
salaStage.build();                 // el escenario de la sala (elegir personajes)
initHud(hud);
initDisplay(stage, screen, glc, hud);

// --- entrada ---
initInput(stage, {
  toHud,
  onGesture: () => { ensureAudio(); fullscreenGesture(); },
  onFullscreenKey: () => { toggleFullscreen(); },
  onPadConnect: (on) => showToast(on ? 'JOYSTICK CONECTADO' : 'JOYSTICK DESCONECTADO'),
});
bindStick('stick', 'knob');
const TOUCH_LABEL = { bolas: 'GOLPE', empujon: 'EMBESTIR', bombardeo: 'SALTAR', petardos: 'PETARDO', futbol: 'EMBESTIR', colina: 'EMPUJAR', hexagonos: 'AGARRAR', fiesta: 'DADO' };
let touchMg = null;
bindTouch('th', () => { input.touch.hit = true; if (game.minigame === 'fiesta') pushEvent('confirm'); });
bindTouch('tp', () => pushEvent('pause'));
document.addEventListener('fullscreenchange', () => {
  // si el jugador sale de pantalla completa con ESC, lo recordamos
  if (!document.fullscreenElement && settings.fullscreen && game.state !== 'title') { settings.fullscreen = false; saveSettings(); }
  else if (document.fullscreenElement && !settings.fullscreen) { settings.fullscreen = true; saveSettings(); }
});

{
  const b = document.getElementById('fsbtn');
  if (b) b.addEventListener('click', (e) => {
    e.stopPropagation(); ensureAudio();
    if (!canFullscreen()) { showToast('IPHONE: COMPARTIR Y AGREGAR A INICIO'); return; }
    toggleFullscreen(); settings.fullscreen = !isFullscreen(); saveSettings(); b.blur();
  });
}
initFlow();
initUpdateCheck();
makeThumbs();
makePortraits();
resetMatch('title');
// imágenes para Steam: la escena del minijuego pedido, jugando sola
if (capsule) {
  initCapsule();
  const s = demoSetup(capsule.mg); s.forceMap = capsule.map;
  resetMatch('count', s); game.countT = 0.05; game.intro = false;
}

// --- loop: física a 120 Hz fijos, render a la tasa de la pantalla ---
const STEP = 1 / 120;
let last = performance.now(), acc = 0;
let touchState = '', fsState = '', fsFull = null;

function frame(now) {
  const rdt = Math.min(0.05, (now - last) / 1000); last = now;

  pollInput(rdt);
  updateFlow();

  let ts = game.timeScale;
  if (game.slowT > 0) { game.slowT -= rdt; ts *= game.slowK; if (game.slowT <= 0) game.slowK = 1; }
  const dt = rdt * ts;
  const frozen = game.state === 'paused';

  if (game.online === 'guest') {
    // invitado: la partida la corre el anfitrión; acá se interpola y se mueve la nave propia
    guestFrame(rdt);
  } else if (!frozen) {
    acc += dt;
    let n = 0;
    // mg() en cada paso: un paso puede cambiar de escena (la Fiesta lanza un minijuego)
    while (acc >= STEP && n < 16) { mg().step(STEP); acc -= STEP; n++; }
    if (n >= 16) acc = 0;
    if (game.online === 'host') hostTick(rdt);

    // la partida termina (o sale "ELIMINADO") recién cuando terminan las animaciones de derrota
    if (game.pendingEnd && !deathsRunning()) {
      game.pendingEnd = false;
      if (inDemo()) game.demoResetT = 2.2;
      else if (game.state === 'play') { game.state = 'end'; game.timeScale = 1; onMatchEnd(); }
    }
    if (inDemo() && game.demoResetT > 0) {
      game.demoResetT -= rdt;
      if (game.demoResetT <= 0) { const st = game.state; nextDemo(); resetMatch(st); }
    }
  }

  // tu nave terminó su animación de derrota: queda el cartel de ELIMINADO (y solo, se acelera el resto)
  const me = game.players[game.me];
  if (me && mg().humanOut && game.mode !== 'local' && game.state === 'play' && !game.humanOut && !me.alive && me.death && me.death.done && !game.pendingEnd) {
    game.humanOut = true; if (game.online === 'off') game.timeScale = 1.7;
  }

  updateVisuals(frozen ? 0 : dt, frozen ? 0 : rdt);
  updateMusic();
  renderer.render(scene, camera);
  drawHud();

  syncNativeText();                              // celular: el campo de texto real para el apodo / código
  // el botón táctil dice qué hace en este minijuego
  if (game.minigame !== touchMg) { touchMg = game.minigame; const th = document.getElementById('th'); if (th) th.textContent = TOUCH_LABEL[touchMg] || 'GOLPE'; }
  // botones táctiles solo durante la partida
  // botón de pantalla completa: en el título y en el menú principal
  const fsOn = !capsule && (game.state === 'title' || (menuOpen() && topMenu().def.id === 'main')) ? 'on' : 'off';
  if (fsOn !== fsState) { fsState = fsOn; document.body.dataset.fsbtn = fsOn; }
  const full = isFullscreen(); if (full !== fsFull) { fsFull = full; document.body.classList.toggle('fs', full); }
  const ts2 = game.state === 'play' || game.state === 'count' ? 'playing' : 'menu';
  if (ts2 !== touchState) { touchState = ts2; document.body.dataset.mode = ts2; }

  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// ?debug en la URL deja el estado a mano en la consola (para pruebas)
try { if (new URLSearchParams(location.search).has('debug')) window.__bolonki = { netStats, closeAllMenus, game, room, browse, settings, eliminate, resetMatch, demoSetup, fiesta: fiestaState, startFiesta, mgById, checkSongs, renderSong, musicState }; } catch (e) { /* nada */ }
