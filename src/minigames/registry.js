// Registro de minijuegos. Cada minijuego es un objeto con esta forma:
//
//   id, name, desc                         nombre y descripción corta para los menús
//   points: { label, values, key, demo }   "puntos" o "rondas" (key = campo de settings / opciones de sala)
//   cam: { pos, look, rotate }             cámara de la partida (rotate: cada jugador ve su lado abajo)
//   build()                                crea sus objetos 3D (una vez, al arrancar)
//   show(on)                               muestra u oculta su mundo
//   reset(cfg)                             prepara una partida nueva
//   step(dt)                               simulación (solitario, local y anfitrión online)
//   visuals(dt, rdt)                       animación por frame (naves que no están cayendo/explotando, etc.)
//   onLocalHit(p)                          el jugador de esta máquina apretó golpe
//   drawScore(p, x, y), hud(hw, st)        HUD propio
//   snapshot(), applySnap(A, B, f, rdt)    online: lo que manda el anfitrión y cómo lo aplica el invitado
//   guestLocal(rdt), guestHitFx(p)         online: lo que hace el invitado con su propia nave
//   humanOut                               true si al perder se ve "ELIMINADO" hasta que termine la partida
//   howTo                                  qué hace el botón de golpe (se muestra antes de jugarlo en la Fiesta)
//   maps                                   opcional: nombres de sus mapas (se pueden elegir en el menú)
//   tense()                                opcional: true cuando la música tiene que acelerar
//
// Importante: los métodos usan los imports solo adentro de funciones (hay imports circulares).
import { game } from '../state.js';

const REG = {};
export const MINIGAMES = [];          // los que se pueden elegir y sortear
export const SCENES = [];             // todo lo que tiene mundo propio (minijuegos + el tablero de la Fiesta)
// hidden: escenas que no son minijuegos (el tablero): no aparecen en las listas
export function register(mg, opts = {}) { REG[mg.id] = mg; SCENES.push(mg); if (!opts.hidden) MINIGAMES.push(mg); }
export const mgById = (id) => REG[id] || MINIGAMES[0];
export const mg = () => mgById(game.minigame);
// Mapa fijo que eligieron en el menú (índice), o -1 si es aleatorio (y siempre en la Fiesta)
export function fixedMap(n) {
  const cfg = game.setup;
  if (!cfg || cfg.fiesta || cfg.mode === 'demo') return -1;
  const v = cfg.map;
  return Number.isInteger(v) && v >= 0 && v < n ? v : -1;
}

let shown = null;
// Muestra el mundo pedido y esconde los demás
export function activate(id) {
  const next = mgById(id);
  if (shown !== next) { SCENES.forEach((m) => m.show(m === next)); shown = next; }
  game.minigame = next.id;
  return next;
}
