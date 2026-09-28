// Punto de entrada: arma la escena, conecta la página y corre el loop.
import { game } from './state.js';
import { CHARS, SIDES } from './config.js';
import { scene, initRenderer, applyMode } from './render/psx.js';
import './render/textures.js';
import { buildArena } from './world/arena.js';
import { buildPod } from './world/pods.js';
import { buildBalls } from './world/balls.js';
import { initParticles } from './fx/particles.js';
import { ensureAudio, setSound } from './audio.js';
import { DEATH_ANIMS } from './deaths/index.js';
import { resetMatch, eliminate, deathsRunning, settings } from './game/match.js';
import { step } from './game/physics.js';
import { updateVisuals } from './visuals.js';
import { initHud, drawHud } from './hud.js';
import { initInput, setDifficulty, savedDifficulty } from './input.js';
import { camera } from './render/psx.js';

const stage = document.getElementById('stage');
const glc = document.getElementById('gl');
const renderer = initRenderer(glc);

// --- mundo ---
buildArena();
initParticles();
game.players = CHARS.map((ch, i) => ({
  i, ch, side: SIDES[i], s: 0, v: 0, x: 0, z: 0, vx: 0, vz: 0, score: 0, alive: true, human: false,
  swing: 0, cd: 0, hitDone: false, target: 0, thinkT: 0, err: 0, errT: 0, flash: 0, spin: 0, death: null,
  mesh: buildPod(i),
}));
buildBalls();
initHud(document.getElementById('hud'));

// --- controles de la página ---
const sDiff = document.getElementById('sDiff');
const sDeath = document.getElementById('sDeath');
DEATH_ANIMS.forEach((a) => { const o = document.createElement('option'); o.value = a.id; o.textContent = a.name; sDeath.appendChild(o); });

initInput({ stage, onDifficultyChange: (id) => { sDiff.value = id; } });
setDifficulty(savedDifficulty() || 'intermedio');
sDiff.addEventListener('change', () => { setDifficulty(sDiff.value, false); stage.focus(); });
sDeath.addEventListener('change', () => { settings.deathId = sDeath.value; stage.focus(); });

document.getElementById('bTest').addEventListener('click', () => {
  ensureAudio();
  stage.focus();
  if (game.state === 'end' || game.state === 'paused' || game.state === 'count') return;
  const alive = game.players.filter((p) => p.alive);
  const cpus = alive.filter((p) => !p.human);
  if (alive.length <= 2 || !cpus.length) { resetMatch(game.state === 'title' ? 'title' : 'count'); return; }
  eliminate(cpus[(Math.random() * cpus.length) | 0].i);
});

let psx = true;
const bPsx = document.getElementById('bPsx'), bSnd = document.getElementById('bSnd');
bPsx.addEventListener('click', () => { psx = !psx; bPsx.setAttribute('aria-pressed', psx); applyMode(psx, stage, glc); stage.focus(); });
let snd = true;
bSnd.addEventListener('click', () => { snd = !snd; setSound(snd); bSnd.setAttribute('aria-pressed', snd); ensureAudio(); stage.focus(); });
window.addEventListener('resize', () => { if (!psx) applyMode(psx, stage, glc); });
applyMode(psx, stage, glc);

// --- loop: física a 120 Hz fijos, render a la tasa de la pantalla ---
resetMatch('title');
const STEP = 1 / 120;
let last = performance.now(), acc = 0;

function frame(now) {
  const rdt = Math.min(0.05, (now - last) / 1000); last = now;
  let ts = game.timeScale;
  if (game.slowT > 0) { game.slowT -= rdt; ts *= game.slowK; if (game.slowT <= 0) game.slowK = 1; }
  const dt = rdt * ts;
  const paused = game.state === 'paused';

  if (!paused) {
    acc += dt;
    let n = 0;
    while (acc >= STEP && n < 16) { step(STEP); acc -= STEP; n++; }
    if (n >= 16) acc = 0;

    // la partida termina (o sale "ELIMINADO") recién cuando terminan las animaciones de derrota
    if (game.pendingEnd && !deathsRunning()) {
      game.pendingEnd = false;
      if (game.state === 'title') game.demoResetT = 2.2;
      else if (game.state === 'play') { game.state = 'end'; game.timeScale = 1; }
    }
    const me = game.players[0];
    if (game.state === 'play' && !game.humanOut && !me.alive && me.death && me.death.done && !game.pendingEnd) {
      game.humanOut = true; game.timeScale = 1.7;
    }
    if (game.state === 'title' && game.demoResetT > 0) { game.demoResetT -= rdt; if (game.demoResetT <= 0) resetMatch('title'); }
  }

  updateVisuals(paused ? 0 : dt, paused ? 0 : rdt);
  renderer.render(scene, camera);
  drawHud();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
