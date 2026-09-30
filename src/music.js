// Música: un secuenciador chiptune con WebAudio que toca los temas de songs.js.
// Voces: melodía (pulso 25%), arpegio (pulso 12,5%), bajo (triángulo) y batería (ruido y senoidal).
// Se llama updateMusic(rdt) en cada cuadro: elige el tema según dónde estás (menú, minijuego, tablero, fin),
// agenda las notas un poquito por adelantado y baja el volumen en pausa.
import { game } from './state.js';
import { settings } from './settings.js';
import { getAudio } from './audio.js';
import { mg } from './minigames/registry.js';
import { menuOpen } from './ui/menu.js';
import { SONGS } from './songs.js';

/* ---------- teoría ---------- */
const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
function midi(n) {
  const m = /^([A-G])([#b]?)(-?\d)$/.exec(n);
  if (!m) return null;
  return 12 * (+m[3] + 1) + NOTE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
}
const QUAL = { '': [0, 4, 7], m: [0, 3, 7], 7: [0, 4, 7, 10], m7: [0, 3, 7, 10], maj7: [0, 4, 7, 11], dim: [0, 3, 6], sus4: [0, 5, 7] };
function chord(name) {
  const m = /^([A-G])([#b]?)(.*)$/.exec(name);
  const root = NOTE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  return { root, tones: QUAL[m[3]] || QUAL[''] };
}
const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);

/* ---------- armado de cada tema (una lista de eventos por paso) ---------- */
function compile(song) {
  const bars = song.chords.length, steps = bars * 16;
  const ev = Array.from({ length: steps }, () => []);
  // melodía
  song.lead.forEach((bar, b) => {
    let s = 0;
    for (const tok of bar.trim().split(/\s+/)) {
      const [n, len] = tok.split(':'); const L = +len;
      if (n !== 'r') ev[b * 16 + s].push({ v: 'lead', m: midi(n), len: L });
      s += L;
    }
  });
  // bajo y arpegio a partir de los acordes
  song.chords.forEach((name, b) => {
    const c = chord(name), r = 36 + c.root, fifth = r + 7;       // bajo en la octava 2-3
    const at = (s, m, len) => ev[b * 16 + s].push({ v: 'bass', m, len });
    switch (song.bass) {
      case 'quarters': [0, 4, 8, 12].forEach((s) => at(s, r, 3)); break;
      case 'octave8': for (let s = 0; s < 16; s += 2) at(s, s % 4 ? r + 12 : r, 2); break;
      case 'pump': for (let s = 0; s < 16; s += 2) at(s, s % 8 === 6 ? r + 12 : r, 2); break;
      case 'bounce': [0, 4, 8, 12].forEach((s, k) => at(s, k % 2 ? fifth : r, 3)); break;
      default: at(0, r, 16);
    }
    if (song.arp && song.arp !== 'none') {
      const oct = 60 + 12 * (song.arpOct || 0) + c.root;
      const tones = c.tones.map((t) => oct + t).concat([oct + 12]);
      const seq = song.arp === 'updown16' ? tones.concat(tones.slice(1, -1).reverse()) : tones;
      const every = song.arp === 'up8' ? 2 : 1;
      for (let s = 0, k = 0; s < 16; s += every, k++) ev[b * 16 + s].push({ v: 'arp', m: seq[k % seq.length], len: every });
    }
  });
  // batería: patrón A en los compases 1-8, B en 9-16, "fill" en el último compás de cada tanda de 8
  for (let b = 0; b < bars; b++) {
    const sec = b < 8 ? 'A' : 'B';
    const last = b % 8 === 7 || b === bars - 1;
    const pat = (last && song.drums.fill) || song.drums[sec] || song.drums.A;
    for (let s = 0; s < 16; s++) {
      const ch = pat[s] || '.';
      if (ch === 'k' || ch === 'x') ev[b * 16 + s].push({ v: 'kick' });
      if (ch === 's' || ch === 'o') ev[b * 16 + s].push({ v: 'snare' });
      if (ch === 'h' || ch === 'x' || ch === 'o') ev[b * 16 + s].push({ v: 'hat' });
      if (ch === 'c') ev[b * 16 + s].push({ v: 'crash' });
    }
  }
  return { steps, ev };
}
const COMPILED = {};
const compiled = (key) => COMPILED[key] || (COMPILED[key] = compile(SONGS[key]));

/* ---------- voces ---------- */
let waves = null;
function pulseWave(ac, duty) {
  const n = 40, re = new Float32Array(n), im = new Float32Array(n);
  for (let i = 1; i < n; i++) re[i] = (2 / (i * Math.PI)) * Math.sin(i * Math.PI * duty);
  return ac.createPeriodicWave(re, im);
}
function oscOf(ac, wave) {
  const o = ac.createOscillator();
  if (wave === 'pulse25') o.setPeriodicWave(waves.p25);
  else if (wave === 'pulse125') o.setPeriodicWave(waves.p125);
  else o.type = wave || 'square';
  return o;
}
// nota con envolvente de "chip": ataque corto, cae a un sostenido y se corta
function tone(A, dest, wave, m, t, dur, vol, sus, vib) {
  const { ac } = A;
  const o = oscOf(ac, wave), g = ac.createGain();
  o.frequency.setValueAtTime(hz(m), t);
  if (vib && dur > 0.3) {                       // un vibrato suave en las notas largas
    const l = ac.createOscillator(), lg = ac.createGain();
    l.frequency.value = 5.5; lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(hz(m) * 0.012, t + 0.25);
    l.connect(lg); lg.connect(o.frequency); l.start(t); l.stop(t + dur + 0.05);
  }
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.006);
  g.gain.setTargetAtTime(vol * sus, t + 0.006, 0.08);
  const end = t + Math.max(0.03, dur - 0.012);
  g.gain.setTargetAtTime(0, end, 0.012);
  o.connect(g); g.connect(dest); o.start(t); o.stop(end + 0.08);
}
function noiseHit(A, dest, t, dur, vol, type, freq) {
  const { ac, noiseBuf } = A; if (!noiseBuf) return;
  const s = ac.createBufferSource(); s.buffer = noiseBuf;
  const f = ac.createBiquadFilter(); f.type = type; f.frequency.value = freq;
  const g = ac.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0005, t + dur);
  s.connect(f); f.connect(g); g.connect(dest); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
}
function kick(A, dest, t) {
  const { ac } = A, o = ac.createOscillator(), g = ac.createGain();
  o.type = 'sine'; o.frequency.setValueAtTime(160, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.11);
  g.gain.setValueAtTime(0.55, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
  o.connect(g); g.connect(dest); o.start(t); o.stop(t + 0.2);
}
function snare(A, dest, t) {
  noiseHit(A, dest, t, 0.12, 0.2, 'highpass', 1400);
  const { ac } = A, o = ac.createOscillator(), g = ac.createGain();
  o.type = 'triangle'; o.frequency.setValueAtTime(200, t); o.frequency.exponentialRampToValueAtTime(120, t + 0.06);
  g.gain.setValueAtTime(0.18, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
  o.connect(g); g.connect(dest); o.start(t); o.stop(t + 0.1);
}

function playStep(A, dest, song, list, t, stepDur) {
  const lv = song.leadVol || 0.85;
  for (const e of list) {
    const dur = (e.len || 1) * stepDur;
    switch (e.v) {
      case 'lead': tone(A, dest, song.leadWave, e.m, t, dur, 0.085 * lv, 0.7, true); break;
      case 'arp': tone(A, dest, song.arpWave, e.m, t, dur * 0.9, 0.028, 0.5, false); break;
      case 'bass': tone(A, dest, 'triangle', e.m, t, dur * 0.92, 0.2, 0.85, false); break;
      case 'kick': kick(A, dest, t); break;
      case 'snare': snare(A, dest, t); break;
      case 'hat': noiseHit(A, dest, t, 0.035, 0.05, 'highpass', 7000); break;
      case 'crash': noiseHit(A, dest, t, 0.8, 0.12, 'highpass', 3500); break;
      default: break;
    }
  }
}

/* ---------- reproductor ---------- */
let bus = null, duckGain = null;
let cur = null;             // { key, song, c, step, nextT, gain, done, tempo }
let lastVol = -1;

function setupBus(A) {
  if (bus) return;
  waves = { p25: pulseWave(A.ac, 0.25), p125: pulseWave(A.ac, 0.125) };
  duckGain = A.ac.createGain(); duckGain.gain.value = 1; duckGain.connect(A.ac.destination);
  bus = A.ac.createGain(); bus.gain.value = 0; bus.connect(duckGain);
}

function stopSong(A) {
  if (!cur) return;
  const g = cur.gain, t = A.ac.currentTime;
  g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(g.gain.value, t); g.gain.linearRampToValueAtTime(0, t + 0.3);
  setTimeout(() => { try { g.disconnect(); } catch (e) { /* nada */ } }, 800);
  cur = null;
}
function startSong(A, key) {
  const song = SONGS[key]; if (!song) return;
  const gain = A.ac.createGain(); gain.gain.value = 1; gain.connect(bus);
  cur = { key, song, c: compiled(key), step: 0, nextT: A.ac.currentTime + 0.08, gain, done: false, tempo: 1 };
}

// qué tema corresponde ahora
function wanted() {
  const st = game.state;
  if (st === 'title' || st === 'menu') return 'menu';
  if (st === 'end') {
    if (game.setup && game.setup.fiesta && game.minigame !== 'fiesta') return cur ? cur.key : null;   // vuelve solo al tablero
    return 'victory';
  }
  const m = mg();
  return SONGS[m.music || m.id] ? m.music || m.id : 'bolas';
}

export function updateMusic() {
  const A = getAudio();
  if (!A.ac || A.ac.state !== 'running') return;
  setupBus(A);
  const t = A.ac.currentTime;
  // volumen (Opciones) y "agachada" en pausa o con un menú abierto durante la partida
  const vol = settings.muted ? 0 : ((settings.music === undefined ? 6 : settings.music) / 10) * 0.45;
  if (vol !== lastVol) { bus.gain.setTargetAtTime(vol, t, 0.05); lastVol = vol; }
  const playing = game.state === 'play' || game.state === 'count';
  const duck = game.state === 'paused' || (playing && menuOpen()) ? 0.3 : 1;
  if (Math.abs(duckGain.gain.value - duck) > 0.01) duckGain.gain.setTargetAtTime(duck, t, 0.12);

  const key = wanted();
  if (!key) return;
  if (!cur || cur.key !== key) { stopSong(A); startSong(A, key); }
  if (!cur || cur.done) return;

  // tensión (lava, muerte súbita, plataforma chica…): un poco más rápido, se cambia al empezar el compás
  const m = mg();
  const tense = playing && m.tense && m.tense();
  const stepDur = () => 60 / (cur.song.bpm * cur.tempo) / 4;
  if (cur.nextT < t - 0.25) cur.nextT = t + 0.05;          // la pestaña estuvo congelada: se retoma desde ahora
  while (cur.nextT < t + 0.14) {
    if (cur.step % 16 === 0) cur.tempo = tense ? 1.14 : 1;
    playStep(A, cur.gain, cur.song, cur.c.ev[cur.step], cur.nextT, stepDur());
    cur.nextT += stepDur();
    cur.step++;
    if (cur.step >= cur.c.steps) {
      if (cur.song.loop) cur.step = 0;
      else { cur.done = true; break; }
    }
  }
}

// Para las pruebas: qué está sonando
export const musicState = () => (cur ? { key: cur.key, step: cur.step, tempo: cur.tempo, done: cur.done, duck: duckGain && +duckGain.gain.value.toFixed(2) } : null);

// Para las pruebas: arma los temas y avisa si algún compás no suma 16 pasos
export function checkSongs() {
  const errs = [];
  for (const [k, s] of Object.entries(SONGS)) {
    if (s.lead.length !== s.chords.length) errs.push(`${k}: ${s.lead.length} compases de melodía y ${s.chords.length} acordes`);
    s.lead.forEach((bar, b) => {
      const sum = bar.trim().split(/\s+/).reduce((a, tok) => a + +tok.split(':')[1], 0);
      if (sum !== 16) errs.push(`${k} compás ${b + 1}: ${sum} pasos`);
      bar.trim().split(/\s+/).forEach((tok) => { const n = tok.split(':')[0]; if (n !== 'r' && midi(n) === null) errs.push(`${k} compás ${b + 1}: nota rara ${n}`); });
    });
    Object.entries(s.drums).forEach(([sec, p]) => { if (p.length !== 16) errs.push(`${k} batería ${sec}: ${p.length} pasos`); });
  }
  return errs;
}

// Para las pruebas: renderiza un tema sin tiempo real y devuelve el pico y el promedio del volumen
export async function renderSong(key, seconds) {
  const sr = 22050, ac = new OfflineAudioContext(1, sr * seconds, sr);
  const noiseBuf = ac.createBuffer(1, sr, sr); const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const A = { ac, noiseBuf };
  const savedWaves = waves;
  waves = { p25: pulseWave(ac, 0.25), p125: pulseWave(ac, 0.125) };
  const g = ac.createGain(); g.gain.value = 0.55 * 0.6; g.connect(ac.destination);
  const song = SONGS[key], c = compiled(key), sd = 60 / song.bpm / 4;
  let t = 0.05, step = 0;
  while (t < seconds - 0.2) { playStep(A, g, song, c.ev[step], t, sd); t += sd; step = (step + 1) % c.steps; if (!song.loop && step === 0) break; }
  const buf = await ac.startRendering();
  waves = savedWaves;
  const x = buf.getChannelData(0); let peak = 0, sum = 0;
  for (let i = 0; i < x.length; i++) { const v = Math.abs(x[i]); if (v > peak) peak = v; sum += x[i] * x[i]; }
  return { peak: +peak.toFixed(3), rms: +Math.sqrt(sum / x.length).toFixed(3) };
}
