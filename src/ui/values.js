// Listas de valores que usan varios menús (en un módulo aparte para evitar imports circulares).
import { DIFFICULTIES, DIFF_ORDER } from '../config.js';
import { MINIGAMES, mgById } from '../minigames/registry.js';
import { COL } from './draw.js';
import { drawThumb } from '../render/thumbStore.js';

export const yesNo = [{ v: true, label: 'SÍ' }, { v: false, label: 'NO' }];
export const diffValues = DIFF_ORDER.map((d) => ({ v: d, label: DIFFICULTIES[d].label }));
export const pointValues = [5, 10, 15].map((n) => ({ v: n, label: String(n) }));

// Elegir minijuego y sus "puntos" (vidas en Bola Brava, rondas en Empujón): se usan en varias pantallas
export const mgValues = () => MINIGAMES.map((m) => ({ v: m.id, label: m.name }));
export const mgChoice = (get, setFn) => ({ kind: 'choice', label: 'MINIJUEGO', get values() { return mgValues(); }, get, set: setFn });
export const mgDesc = (get) => ({ kind: 'info', label: () => mgById(get()).desc, labelColor: () => COL.teal });
export const pointsChoice = (getMg, getV, setV) => ({
  kind: 'choice', label: () => mgById(getMg()).points.label,
  get values() { return mgById(getMg()).points.values.map((n) => ({ v: n, label: String(n) })); },
  get: getV, set: setV,
});

// Vista previa chiquita del minijuego elegido (va abajo de la fila MINIJUEGO)
export const mgArt = (get, h = 54) => ({
  kind: 'art', h,
  draw(x, y, w, hw) { const dh = h - 6, dw = Math.round((dh * 16) / 9); drawThumb(get(), Math.round(hw / 2 - dw / 2), y + 2, dw, dh); },
});
export const mgDescCentered = (get) => ({ kind: 'info', center: true, label: () => mgById(get()).desc, labelColor: () => COL.teal });

// Bots y su dificultad en una sola fila: NO / FÁCIL / INTERMEDIO / DIFÍCIL / EXTREMO
export const botValues = [{ v: 'no', label: 'NO' }].concat(DIFF_ORDER.map((d) => ({ v: d, label: DIFFICULTIES[d].label })));
