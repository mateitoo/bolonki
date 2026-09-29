// Qué personaje usa cada lugar. Los lugares (0..3) son fijos (dónde arranca cada uno en la arena);
// el personaje de cada lugar se elige en la sala y viaja con la partida (setup.chars).
import { CHARS } from './config.js';
import { game } from './state.js';
import { dressPod } from './world/pods.js';
import { tintSlotParticles } from './fx/particles.js';

export const DEFAULT_CHARS = [0, 1, 2, 3];
export const charIdx = (i) => (game.chars ? game.chars[i] : i);
export const charOf = (i) => CHARS[charIdx(i)] || CHARS[i];

// Pone los personajes (y viste las naves) — solo rehace lo que cambió
export function applyChars(chars) {
  const list = (chars || DEFAULT_CHARS).map((c, i) => (c >= 0 && c < CHARS.length ? c : i));
  game.chars = list;
  for (const p of game.players || []) {
    p.ch = CHARS[list[p.i]];
    if (p.mesh) dressPod(p.mesh, list[p.i]);
    tintSlotParticles(p.i, p.ch.col);
  }
}

// Personajes para los lugares sin elegir (bots): los que quedan libres, en orden
export function fillChars(chosen) {
  const used = new Set(chosen.filter((c) => c >= 0));
  const free = CHARS.map((_, k) => k).filter((k) => !used.has(k));
  return chosen.map((c) => (c >= 0 ? c : free.shift() ?? 0));
}
