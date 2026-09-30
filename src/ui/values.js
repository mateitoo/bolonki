// Listas de valores que usan varios menús (en un módulo aparte para evitar imports circulares).
import { DIFFICULTIES, DIFF_ORDER } from '../config.js';
import { MINIGAMES, mgById } from '../minigames/registry.js';
import { COL, ui, txt, tri, rect, textWidth } from './draw.js';
import { SFX } from '../audio.js';
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

// Mapa del minijuego (solo los que tienen más de uno): ALEATORIO primero y después cada mapa
export const mapOf = (maps, id) => { const v = maps && maps[id]; return Number.isInteger(v) ? v : -1; };
export const mapChoice = (getMg, getV, setV) => {
  const maps = () => mgById(getMg()).maps || [];
  const multi = () => maps().length > 1;
  let midX = 0;
  const it = {
    kind: 'choice', label: 'MAPA', h: 55,
    get values() {
      if (!multi()) return [{ v: getV(), label: mgById(getMg()).mapName || 'ÚNICO' }];     // tiene un solo mapa
      return [{ v: -1, label: 'ALEATORIO' }].concat(maps().map((n, i) => ({ v: i, label: n })));
    },
    get: getV, set: (v) => { if (multi()) setV(v); },
    // fila con la foto del mapa en el medio; en ALEATORIO van rotando las fotos de todos los mapas
    drawRow(x, y, w, hw, sel) {
      const id = getMg(), n = maps().length, v = getV();
      const shown = !multi() ? -1 : v >= 0 ? v : Math.floor((ui.clock || 0) / 1.3) % n;
      const tw = 88, th = 50, tx = Math.round(hw / 2 - tw / 2), ty = y + 1, my = y + 23;
      midX = hw / 2;
      if (sel) rect(x + 4, y, w - 8, 53, 'rgba(45,224,200,.16)');
      if (sel && ((ui.clock * 3) | 0) % 2 === 0) tri(x + 9, my, 'r', COL.teal);
      txt('MAPA', x + 20, my, 8, sel ? COL.white : COL.text);
      drawThumb(shown >= 0 ? `${id}:${shown}` : id, tx, ty, tw, th);
      if (multi() && v < 0) {                     // puntitos: cuál de los mapas se está mostrando
        for (let k = 0; k < n; k++) rect(hw / 2 - (n * 6) / 2 + k * 6 + 1, ty + th + 1, 4, 2, k === shown ? COL.gold : '#2a3150');
      }
      const cur = it.values.find((q) => q.v === v) || it.values[0];
      const vx = x + w - 14, label = cur.label, lw = textWidth(label, 8);
      if (!multi()) txt(label, vx - 8, my, 8, COL.dim, 'right');
      else if (sel) { tri(vx - 3, my, 'r', COL.gold); tri(vx - lw - 16, my, 'l', COL.gold); txt(label, vx - 8, my, 8, COL.gold, 'right'); }
      else txt(label, vx - 8, my, 8, COL.text, 'right');
    },
    clickAt(px) {                                  // clic: a la izquierda de la foto va para atrás, a la derecha para adelante
      if (!multi()) return;
      const vals = it.values, d = px < midX ? -1 : 1; SFX.select();
      let i = vals.findIndex((q) => q.v === getV()); i = (i + d + vals.length) % vals.length; setV(vals[i].v);
    },
  };
  return it;
};

// Vista previa chiquita del minijuego elegido (va abajo de la fila MINIJUEGO)
export const mgArt = (get, h = 54) => ({
  kind: 'art', h,
  draw(x, y, w, hw) { const dh = h - 6, dw = Math.round((dh * 16) / 9); drawThumb(get(), Math.round(hw / 2 - dw / 2), y + 2, dw, dh); },
});
export const mgDescCentered = (get) => ({ kind: 'info', center: true, label: () => mgById(get()).desc, labelColor: () => COL.teal });

// Modo: partida libre (elegís el minijuego) o Fiesta (tablero que va sorteando minijuegos)
export const modeValues = [{ v: 'libre', label: 'PARTIDA LIBRE' }, { v: 'fiesta', label: 'FIESTA' }];
export const modeChoice = (get, setFn) => ({ kind: 'choice', label: 'MODO', values: modeValues, get, set: setFn });

// Bots y su dificultad en una sola fila: NO / FÁCIL / INTERMEDIO / DIFÍCIL / EXTREMO
export const botValues = [{ v: 'no', label: 'NO' }].concat(DIFF_ORDER.map((d) => ({ v: d, label: DIFFICULTIES[d].label })));
