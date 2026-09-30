// Opciones del jugador, guardadas en el navegador (en la versión de escritorio también persisten).
import { DIFF_ORDER } from './config.js';

const KEY = 'bolonki:settings';

export const DEFAULTS = {
  fullscreen: true,      // pedir pantalla completa al empezar
  aspect: 'wide',        // 'wide' (se adapta a la pantalla) | '4:3'
  quality: 'sharp',      // '240' (auténtico) | '480' | 'sharp' (HD, resolución completa; la de fábrica)
  integer: 'auto',       // escalado entero: 'auto' (solo si entra justo) | true | false
  scanlines: false,
  sfx: 8,                // volumen de efectos 0..10
  muted: false,          // botón de sonido del menú principal
  music: 6,              // volumen de la música 0..10
  difficulty: 'intermedio',
  points: 15,
  deathId: 'random',
  name: '',              // apodo para el online (vacío = se pide la primera vez)
  localBots: true,       // multijugador local: bots en los lugares libres
  mg: 'bolas',           // último minijuego elegido
  maps: {},              // mapa elegido por minijuego (índice; -1 o nada = aleatorio)
  rounds: 2,             // Empujón: rondas para ganar
  mode: 'libre',         // 'libre' (elegís el minijuego) | 'fiesta' (tablero)
  turns: 10,             // Fiesta: cantidad de turnos
  mgOff: [],             // minijuegos desactivados (no salen en la Fiesta)
  char: 0,               // último personaje que elegiste (J1)
  // opciones de v0.34
  master: 10,            // volumen general 0..10
  bgSound: false,        // sonido con la pestaña / ventana en segundo plano
  psx: true,             // vértices que tiemblan (PS1)
  dither: true,          // tramado de color (PS1)
  shake: true,           // temblor de pantalla en los golpes fuertes
  fps: false,            // mostrar cuadros por segundo
  aim: true,             // ayuda para apuntar (Rey de la colina, Hexágonos)
  vibrate: true,         // vibración (joystick y celular)
  camSens: 5,            // sensibilidad de la cámara 1..10
  camInvert: false,      // invertir el eje vertical de la cámara
  touchSize: 'normal',   // botones táctiles: 'chico' | 'normal' | 'grande'
  stickSide: 'left',     // joystick táctil a la izquierda o a la derecha
  intro: 'normal',       // instrucciones antes de cada minijuego: 'normal' | 'corta'
  tags: true,            // nombres arriba de los personajes
  pad: 'joystick',       // celular: 'joystick' o 'flechas'
  touchCam: false,       // celular: girar la cámara arrastrando el dedo
};
// las opciones que vuelven a su valor de fábrica con "RESTABLECER" (no se tocan apodo, personaje, mapas…)
export const RESETTABLE = ['fullscreen', 'aspect', 'quality', 'integer', 'scanlines', 'sfx', 'muted', 'music', 'master', 'bgSound',
  'psx', 'dither', 'shake', 'fps', 'aim', 'vibrate', 'camSens', 'camInvert', 'touchSize', 'stickSide', 'intro', 'tags', 'deathId', 'pad', 'touchCam'];

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
// v0.6: 480p pasa a ser la calidad por defecto
if (settings.v < 6) { if (settings.quality === '240') settings.quality = '480'; settings.v = 6; }
// v0.35.3: el juego arranca en HD y sin líneas de TV (una sola vez; después cada uno elige en Opciones)
if (settings.v < 7) { settings.quality = 'sharp'; settings.scanlines = false; settings.v = 7; try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch (e) { /* sin storage */ } }
if (!DIFF_ORDER.includes(settings.difficulty)) settings.difficulty = DEFAULTS.difficulty;
if (!Array.isArray(settings.mgOff)) settings.mgOff = [];
if (settings.mode !== 'fiesta') settings.mode = 'libre';

export function saveSettings() {
  try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch (e) { /* sin storage */ }
}

// true cuando corre empaquetado como app de escritorio (Electron, más adelante)
export const IS_DESKTOP = typeof window !== 'undefined' && !!window.bolonkiDesktop;
