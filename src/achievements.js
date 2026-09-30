// Logros: se guardan en el navegador y, en la versión de Steam, también se desbloquean en Steam
// (con el mismo id; hay que crearlos iguales en Steamworks > Estadísticas y logros).
import { game } from './state.js';
import { MINIGAMES } from './minigames/registry.js';

export const ACHIEVEMENTS = [
  { id: 'ACH_FIRST_WIN', name: 'PRIMERA VICTORIA', desc: 'GANÁ UNA PARTIDA' },
  { id: 'ACH_WIN_BOLAS', name: 'ARQUERO', desc: 'BOLA BRAVA', mg: 'bolas' },
  { id: 'ACH_WIN_EMPUJON', name: 'TOPADORA', desc: 'EMPUJÓN', mg: 'empujon' },
  { id: 'ACH_WIN_BOMBARDEO', name: 'A CUBIERTO', desc: 'BOMBARDEO', mg: 'bombardeo' },
  { id: 'ACH_WIN_PETARDOS', name: 'PIROTÉCNICO', desc: 'PETARDOS', mg: 'petardos' },
  { id: 'ACH_WIN_FUTBOL', name: 'GOLEADOR', desc: 'FUTBOLONKI', mg: 'futbol' },
  { id: 'ACH_WIN_COLINA', name: 'REY DE LA COLINA', desc: 'LA COLINA', mg: 'colina' },
  { id: 'ACH_WIN_HEXAGONOS', name: 'EQUILIBRISTA', desc: 'HEXÁGONOS', mg: 'hexagonos' },
  { id: 'ACH_ALL_GAMES', name: 'TODOTERRENO', desc: 'TODOS LOS JUEGOS' },
  { id: 'ACH_FIESTA', name: 'REY DE LA FIESTA', desc: 'GANÁ UNA FIESTA' },
  { id: 'ACH_EXTREME', name: 'SIN PIEDAD', desc: 'CPU EN EXTREMO' },
  { id: 'ACH_ONLINE', name: 'CON AMIGOS', desc: 'GANÁ ONLINE' },
  { id: 'ACH_COUCH', name: 'EN EL SILLÓN', desc: '2 O MÁS EN 1 COMPU' },
];

const KEY = 'bolonki:logros';
let got = {};
try { got = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { got = {}; }
export const hasAch = (id) => !!got[id];
export const achCount = () => ACHIEVEMENTS.filter((a) => got[a.id]).length;

let notify = () => {};
export function setAchNotify(fn) { notify = fn; }

export function unlock(id) {
  // aunque ya lo tengas acá, se le vuelve a avisar a Steam (por si lo sacaste antes de tener la versión de Steam)
  try { if (window.bolonkiDesktop && window.bolonkiDesktop.achievement) window.bolonkiDesktop.achievement(id); } catch (e) { /* nada */ }
  if (got[id]) return;
  got[id] = Date.now();
  try { localStorage.setItem(KEY, JSON.stringify(got)); } catch (e) { /* nada */ }
  const a = ACHIEVEMENTS.find((q) => q.id === id);
  if (a) notify(a);
}

// Terminó una partida: ¿qué se ganó?
export function checkMatchEnd() {
  if (game.mode === 'demo') return;
  const humans = game.players.filter((p) => !p.empty && p.ctrl === 'local');
  if (game.mode === 'local' && humans.length >= 2) unlock('ACH_COUCH');
  const w = game.players[game.winner];
  if (!w || w.ctrl !== 'local') return;                          // ganó alguien de esta compu
  const mg = game.minigame;
  unlock('ACH_FIRST_WIN');
  if (mg === 'fiesta') unlock('ACH_FIESTA');
  const a = ACHIEVEMENTS.find((q) => q.mg === mg);
  if (a) unlock(a.id);
  if (MINIGAMES.every((m) => { const q = ACHIEVEMENTS.find((x) => x.mg === m.id); return !q || got[q.id]; })) unlock('ACH_ALL_GAMES');
  if (game.online !== 'off') unlock('ACH_ONLINE');
  const bots = game.players.some((p) => !p.empty && (p.ctrl === 'ai' || p.isBot));
  if (bots && game.difficulty === 'extremo') unlock('ACH_EXTREME');
}
