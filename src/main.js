// Punto de entrada: arma la escena, conecta pantalla/entrada/menús y corre el loop.
import { game } from './state.js';
import { CHARS, SIDES } from './config.js';
import { scene, camera, initRenderer } from './render/psx.js';
import './render/textures.js';
import { buildArena } from './world/arena.js';
import { buildPod } from './world/pods.js';
import { buildBalls } from './world/balls.js';
import { initParticles } from './fx/particles.js';
import { ensureAudio } from './audio.js';
import { resetMatch, deathsRunning, eliminate } from './game/match.js';
import { step } from './game/physics.js';
import { updateVisuals } from './visuals.js';
import { initHud, drawHud, showToast } from './hud.js';
import { initDisplay, toHud, toggleFullscreen } from './display.js';
import { input, initInput, pollInput, bindTouch, pushEvent } from './input.js';
import { initFlow, updateFlow, onMatchEnd, inDemo } from './flow.js';
import { hostTick, guestFrame } from './net/online.js';
import { room, browse } from './net/room.js';
import { settings, saveSettings } from './settings.js';

const stage = document.getElementById('stage');
const screen = document.getElementById('screen');
const glc = document.getElementById('gl');
const hud = document.getElementById('hud');
const renderer = initRenderer(glc);

// --- mundo ---
buildArena();
initParticles();
game.players = CHARS.map((ch, i) => ({
  i, ch, side: SIDES[i], s: 0, v: 0, x: 0, z: 0, vx: 0, vz: 0, score: 0, alive: true, ctrl: 'ai', empty: false, net: null,
  swing: 0, cd: 0, hitDone: false, target: 0, thinkT: 0, err: 0, errT: 0, flash: 0, spin: 0, death: null,
  mesh: buildPod(i),
}));
buildBalls();
initHud(hud);
initDisplay(stage, screen, glc, hud);

// --- entrada ---
initInput(stage, {
  toHud,
  onGesture: ensureAudio,
  onFullscreenKey: () => { toggleFullscreen(); },
  onPadConnect: (on) => showToast(on ? 'JOYSTICK CONECTADO' : 'JOYSTICK DESCONECTADO'),
});
bindTouch('tl', () => (input.touch.l = true), () => (input.touch.l = false));
bindTouch('tr', () => (input.touch.r = true), () => (input.touch.r = false));
bindTouch('th', () => (input.touch.hit = true));
bindTouch('tp', () => pushEvent('pause'));
document.addEventListener('fullscreenchange', () => {
  // si el jugador sale de pantalla completa con ESC, lo recordamos
  if (!document.fullscreenElement && settings.fullscreen && game.state !== 'title') { settings.fullscreen = false; saveSettings(); }
  else if (document.fullscreenElement && !settings.fullscreen) { settings.fullscreen = true; saveSettings(); }
});

initFlow();
resetMatch('title');

// --- loop: física a 120 Hz fijos, render a la tasa de la pantalla ---
const STEP = 1 / 120;
let last = performance.now(), acc = 0;
let touchState = '';

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
    while (acc >= STEP && n < 16) { step(STEP); acc -= STEP; n++; }
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
      if (game.demoResetT <= 0) { const st = game.state; resetMatch(st); }
    }
  }

  // tu nave terminó su animación de derrota: queda el cartel de ELIMINADO (y solo, se acelera el resto)
  const me = game.players[game.me];
  if (me && game.mode !== 'local' && game.state === 'play' && !game.humanOut && !me.alive && me.death && me.death.done && !game.pendingEnd) {
    game.humanOut = true; if (game.online === 'off') game.timeScale = 1.7;
  }

  updateVisuals(frozen ? 0 : dt, frozen ? 0 : rdt);
  renderer.render(scene, camera);
  drawHud();

  // botones táctiles solo durante la partida
  const ts2 = game.state === 'play' || game.state === 'count' ? 'playing' : 'menu';
  if (ts2 !== touchState) { touchState = ts2; document.body.dataset.mode = ts2; }

  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// ?debug en la URL deja el estado a mano en la consola (para pruebas)
try { if (new URLSearchParams(location.search).has('debug')) window.__bolonki = { game, room, browse, settings, eliminate }; } catch (e) { /* nada */ }
