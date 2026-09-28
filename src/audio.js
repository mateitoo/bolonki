// Sonidos sintetizados con WebAudio (arrancan después de la primera interacción).
import { rnd } from './config.js';

let ac = null, soundOn = true, lastBounce = 0, noiseBuf = null;

export function ensureAudio() {
  if (!ac) {
    try {
      ac = new (window.AudioContext || window.webkitAudioContext)();
      noiseBuf = ac.createBuffer(1, ac.sampleRate * 1.2, ac.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    } catch (e) { /* sin audio */ }
  }
  if (ac && ac.state === 'suspended') ac.resume();
}
export function setSound(on) { soundOn = on; }

function beep(f1, f2, dur, type, vol, delay) {
  if (!ac || !soundOn) return;
  const t = ac.currentTime + (delay || 0);
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = type || 'square';
  o.frequency.setValueAtTime(f1, t); o.frequency.exponentialRampToValueAtTime(Math.max(f2, 20), t + dur);
  g.gain.setValueAtTime(vol || 0.06, t); g.gain.exponentialRampToValueAtTime(0.0005, t + dur);
  o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + dur + 0.02);
}
function noise(dur, vol, freq, delay) {
  if (!ac || !soundOn || !noiseBuf) return;
  const t = ac.currentTime + (delay || 0);
  const s = ac.createBufferSource(); s.buffer = noiseBuf;
  const f = ac.createBiquadFilter(); f.type = 'lowpass';
  f.frequency.setValueAtTime(freq, t); f.frequency.exponentialRampToValueAtTime(80, t + dur);
  const g = ac.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0005, t + dur);
  s.connect(f); f.connect(g); g.connect(ac.destination); s.start(t); s.stop(t + dur + 0.05);
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
  alarm() { for (let k = 0; k < 4; k++) beep(1200, 1200, 0.08, 'square', 0.04, k * 0.15); },
  boom() { noise(1.1, 0.35, 2500); beep(120, 30, 0.8, 'sawtooth', 0.12); },
  zap() { beep(rnd(600, 1400), rnd(80, 200), 0.12, 'sawtooth', 0.05); noise(0.08, 0.08, 6000); },
  launch() { beep(200, 1600, 0.6, 'sawtooth', 0.07); noise(0.6, 0.12, 3000); },
  thud() { beep(90, 40, 0.3, 'square', 0.08); },
};
