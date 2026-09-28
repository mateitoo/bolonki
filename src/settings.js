// Opciones del jugador, guardadas en el navegador (en la versión de escritorio también persisten).
import { DIFF_ORDER } from './config.js';

const KEY = 'bolonki:settings';

export const DEFAULTS = {
  fullscreen: true,      // pedir pantalla completa al empezar
  aspect: 'wide',        // 'wide' (se adapta a la pantalla) | '4:3'
  quality: '240',        // '240' (auténtico) | '480' | 'sharp' (nítida, resolución completa)
  integer: 'auto',       // escalado entero: 'auto' (solo si entra justo) | true | false
  scanlines: true,
  sfx: 8,                // volumen de efectos 0..10
  difficulty: 'intermedio',
  points: 15,
  deathId: 'random',
};

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    const s = raw ? JSON.parse(raw) : {};
    // compatibilidad con la versión anterior (solo guardaba la dificultad)
    const oldDiff = localStorage.getItem('bolonki:difficulty');
    if (!s.difficulty && oldDiff) s.difficulty = oldDiff;
    return s;
  } catch (e) { return {}; }
}

export const settings = Object.assign({}, DEFAULTS, load());
// v0.5: el escalado entero pasa a ser automático por defecto
if (!settings.v) { settings.integer = 'auto'; settings.v = 5; }
if (!DIFF_ORDER.includes(settings.difficulty)) settings.difficulty = DEFAULTS.difficulty;

export function saveSettings() {
  try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch (e) { /* sin storage */ }
}

// true cuando corre empaquetado como app de escritorio (Electron, más adelante)
export const IS_DESKTOP = typeof window !== 'undefined' && !!window.bolonkiDesktop;
