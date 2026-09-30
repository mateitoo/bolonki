// Sonidos sintetizados con WebAudio (arrancan después de la primera interacción).
import { rnd } from './config.js';

let lastBump = 0, lastCrumble = 0, lastAlert = 0, lastSlam = 0;
let ac = null, soundOn = true, lastBounce = 0, noiseBuf = null, master = null, volume = 0.8;

export function ensureAudio() {
  if (!ac) {
    try {
      ac = new (window.AudioContext || window.webkitAudioContext)();
      master = ac.createGain(); master.gain.value = muted ? 0 : volume; master.connect(ac.destination);
      noiseBuf = ac.createBuffer(1, ac.sampleRate * 1.2, ac.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    } catch (e) { /* sin audio */ }
  }
  if (ac && ac.state === 'suspended') ac.resume();
}
export function setSound(on) { soundOn = on; }
// para la música (music.js): el contexto de audio y el ruido blanco compartido
export const getAudio = () => ({ ac, noiseBuf });
let muted = false;
export function setVolume(v) { volume = v; if (master) master.gain.value = muted ? 0 : v; }
// botón de sonido del menú: silencia todo (efectos acá; la música mira settings.muted)
export function setMuted(m) { muted = !!m; if (master) master.gain.value = muted ? 0 : volume; }

function beep(f1, f2, dur, type, vol, delay) {
  if (!ac || !soundOn) return;
  const t = ac.currentTime + (delay || 0);
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = type || 'square';
  o.frequency.setValueAtTime(f1, t); o.frequency.exponentialRampToValueAtTime(Math.max(f2, 20), t + dur);
  g.gain.setValueAtTime(vol || 0.06, t); g.gain.exponentialRampToValueAtTime(0.0005, t + dur);
  o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.02);
}
function noise(dur, vol, freq, delay) {
  if (!ac || !soundOn || !noiseBuf) return;
  const t = ac.currentTime + (delay || 0);
  const s = ac.createBufferSource(); s.buffer = noiseBuf;
  const f = ac.createBiquadFilter(); f.type = 'lowpass';
  f.frequency.setValueAtTime(freq, t); f.frequency.exponentialRampToValueAtTime(80, t + dur);
  const g = ac.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0005, t + dur);
  s.connect(f); f.connect(g); g.connect(master); s.start(t); s.stop(t + dur + 0.05);
}

export const SFX = {
  bounce() { const n = performance.now(); if (n - lastBounce < 45) return; lastBounce = n; beep(340, 170, 0.05, 'square', 0.03); },
  pod() { beep(520, 300, 0.07, 'square', 0.05); },
  power() { beep(180, 900, 0.16, 'sawtooth', 0.06); beep(900, 1400, 0.1, 'square', 0.03); },
  goal() { beep(700, 90, 0.35, 'sawtooth', 0.07); },
  fire() { noise(0.18, 0.12, 1800); beep(160, 60, 0.15, 'square', 0.05); },
  warn() { beep(880, 880, 0.05, 'square', 0.025); },
  tick() { beep(660, 660, 0.12, 'square', 0.05); },
  go() { beep(990, 990, 0.3, 'square', 0.06); },
  select() { beep(520, 780, 0.06, 'square', 0.04); },
  move() { beep(440, 440, 0.04, 'square', 0.03); },
  confirm() { beep(660, 990, 0.08, 'square', 0.05); },
  back() { beep(500, 300, 0.07, 'square', 0.04); },
  alarm() { for (let k = 0; k < 4; k++) beep(1200, 1200, 0.08, 'square', 0.04, k * 0.15); },
  boom() { noise(1.1, 0.35, 2500); beep(120, 30, 0.8, 'sawtooth', 0.12); },
  zap() { beep(rnd(600, 1400), rnd(80, 200), 0.12, 'sawtooth', 0.05); noise(0.08, 0.08, 6000); },
  launch() { beep(200, 1600, 0.6, 'sawtooth', 0.07); noise(0.6, 0.12, 3000); },
  thud() { beep(90, 40, 0.3, 'square', 0.08); },
  // Empujón
  dash() { beep(220, 660, 0.12, 'sawtooth', 0.05); noise(0.12, 0.05, 3000); },
  bump() { const n = performance.now(); if (n - lastBump < 70) return; lastBump = n; beep(160, 70, 0.12, 'square', 0.09); noise(0.08, 0.1, 1200); },
  fall() { beep(900, 120, 0.9, 'triangle', 0.08); },
  splash() { noise(0.7, 0.25, 1800); beep(90, 30, 0.5, 'sawtooth', 0.08); },
  crumble() { const n = performance.now(); if (n - lastCrumble < 180) return; lastCrumble = n; noise(0.15, 0.05, 700); },
  roundWin() { [523, 659, 784, 1046].forEach((f, k) => beep(f, f, 0.12, 'square', 0.05, k * 0.09)); },
  // Bombardeo
  alert() { const n = performance.now(); if (n - lastAlert < 120) return; lastAlert = n; beep(1040, 1040, 0.05, 'square', 0.03); beep(780, 780, 0.05, 'square', 0.03, 0.07); },
  slam() { const n = performance.now(); if (n - lastSlam < 60) return; lastSlam = n; noise(0.25, 0.22, 900); beep(110, 45, 0.22, 'square', 0.1); },
  burn() { noise(0.6, 0.12, 4000); beep(700, 1300, 0.15, 'square', 0.04); beep(1300, 500, 0.3, 'sawtooth', 0.04, 0.15); },
  kick() { beep(300, 900, 0.1, 'square', 0.05); noise(0.08, 0.06, 2000); },
  curse() { [392, 370, 349, 330].forEach((f, k) => beep(f, f * 0.98, 0.12, 'sawtooth', 0.045, k * 0.1)); },
  wall() { beep(90, 50, 0.18, 'square', 0.08); noise(0.12, 0.12, 700); },
  clunk() { beep(120, 70, 0.14, 'square', 0.07); noise(0.1, 0.08, 900, 0.05); beep(420, 420, 0.05, 'square', 0.03, 0.12); },
  place() { beep(200, 140, 0.08, 'square', 0.05); },
  bomb() { noise(0.55, 0.3, 1400); beep(140, 40, 0.45, 'sawtooth', 0.1); },
  powerup() { [660, 880, 1320].forEach((f, k) => beep(f, f, 0.07, 'square', 0.04, k * 0.06)); },
  crack() { noise(0.12, 0.12, 1800); beep(180, 90, 0.08, 'square', 0.05); },
  collapse() { noise(0.9, 0.2, 900); beep(120, 40, 0.6, 'sawtooth', 0.07); noise(0.4, 0.12, 2400, 0.25); },
  crab() { [0, 0.07, 0.14, 0.21].forEach((d) => beep(1500, 1300, 0.03, 'square', 0.025, d)); },
  boing() { beep(180, 900, 0.22, 'triangle', 0.08); beep(360, 1400, 0.16, 'square', 0.025, 0.02); },
  jump() { beep(260, 720, 0.12, 'square', 0.035); },
  land() { const n = performance.now(); if (n - lastSlam < 40) return; beep(140, 90, 0.05, 'square', 0.03); },
  crush() { beep(300, 60, 0.35, 'sawtooth', 0.09); noise(0.2, 0.15, 2500, 0.02); beep(1400, 1900, 0.08, 'square', 0.03, 0.3); },
  // Fiesta
  dice() { beep(900, 900, 0.025, 'square', 0.02); },
  hop() { beep(380, 620, 0.07, 'square', 0.035); },
  coin() { beep(990, 990, 0.05, 'square', 0.04); beep(1320, 1320, 0.09, 'square', 0.04, 0.05); },
  lose() { beep(400, 150, 0.25, 'sawtooth', 0.05); },
  cup() { [659, 784, 988, 1318, 1568].forEach((f, k) => beep(f, f, 0.14, 'square', 0.05, k * 0.08)); },
  event() { [523, 392, 659, 523].forEach((f, k) => beep(f, f, 0.08, 'triangle', 0.05, k * 0.07)); },
  duel() { beep(220, 220, 0.18, 'sawtooth', 0.06); beep(165, 165, 0.3, 'sawtooth', 0.06, 0.2); },
  fanfare() { [523, 659, 784, 1046, 784, 1046].forEach((f, k) => beep(f, f, 0.16, 'square', 0.05, k * 0.12)); },
  drumroll() { for (let k = 0; k < 22; k++) noise(0.05, 0.05 + k * 0.004, 1400, k * 0.055); noise(0.5, 0.14, 5000, 1.22); beep(196, 196, 0.35, 'square', 0.05, 1.22); beep(392, 392, 0.4, 'square', 0.04, 1.22); },
  spin() { beep(1200, 1200, 0.02, 'square', 0.025); },
  bonus() { [784, 988, 1175, 1568].forEach((f, k) => beep(f, f, 0.12, 'square', 0.05, k * 0.07)); beep(2093, 2093, 0.3, 'triangle', 0.04, 0.3); },
  swing() { noise(0.09, 0.07, 2600); beep(420, 180, 0.08, 'triangle', 0.035); },
  fireball() { noise(0.6, 0.12, 700); beep(140, 60, 0.5, 'sawtooth', 0.05); },
  whistle() { [0, 0.09, 0.18].forEach((d) => beep(2350, 2250, 0.08, 'square', 0.03, d)); beep(2400, 2300, 0.28, 'square', 0.035, 0.28); },
  cheer() { noise(1.6, 0.14, 1500); noise(1.1, 0.08, 3400, 0.25); [523, 659, 784, 1046, 1318].forEach((f, k) => beep(f, f, 0.12, 'square', 0.045, k * 0.08)); },
  boing() { beep(520, 880, 0.09, 'square', 0.04); beep(880, 660, 0.06, 'triangle', 0.03, 0.05); },
  wind() { noise(1.6, 0.09, 900); noise(1.2, 0.05, 2600, 0.3); },
  thump() { beep(260, 120, 0.07, 'square', 0.05); noise(0.05, 0.06, 1500); },
  warnShrink() { beep(300, 300, 0.1, 'square', 0.05); beep(300, 300, 0.1, 'square', 0.05, 0.2); },
};
