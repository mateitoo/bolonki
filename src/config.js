// Medidas y datos del juego. Calibrado con el video de referencia.

export const W = 320, HH = 240;       // resolución interna (PS1)

export const H = 10;                  // medio lado de la arena
export const R = 3.0;                 // radio de las torres de esquina (arco un 5% más angosto que con 2.6)
export const G = H - R;               // medio ancho del arco (todo el lado entre torres)
export const PL = 0.8;                // medio largo del pod (cápsula)
export const PRc = 1.25;              // radio de la cápsula del pod (nave redonda)
export const BR = 0.5;                // radio de la pelota
export const PD = H - 0.6;            // el pod va apoyado sobre la línea del arco
export const SMAX = G - 2.0;          // recorrido máximo del pod sin chocar las torres
export const START_PTS = 15;
export const HUMAN_SPEED = 15;

export const BALL = {
  launchMin: 11, launchMax: 13,       // velocidad al salir de la torre
  floorStart: 10, floorGain: 4,       // velocidad mínima: sube con el tiempo
  maxNormal: 22, maxPower: 30,        // tope normal y con golpe fuerte
  startCount: 3, maxCount: 6, addEvery: 15, // pelotas en juego
};

// Lados: n = normal hacia afuera, t = tangente (dirección de movimiento del pod)
export const SIDES = [
  { nx: 0, nz: 1, tx: 1, tz: 0 },     // sur (jugador 1)
  { nx: 1, nz: 0, tx: 0, tz: -1 },    // este
  { nx: 0, nz: -1, tx: -1, tz: 0 },   // norte
  { nx: -1, nz: 0, tx: 0, tz: 1 },    // oeste
];
export const CORN = [[H, H], [H, -H], [-H, -H], [-H, H]];

// Personajes originales. errMul / spdMul le dan a cada CPU un estilo propio
// dentro de la dificultad elegida.
export const CHARS = [
  { name: 'KIRO',  col: '#ffb31a', dark: '#6b3a00', acc: 'beak',    errMul: 0.90, spdMul: 1.03 },
  { name: 'MOSH',  col: '#39d98a', dark: '#0d4a2c', acc: 'antenna', errMul: 0.95, spdMul: 1.00 },
  { name: 'BRUNA', col: '#ff5fa2', dark: '#5a1233', acc: 'ears',    errMul: 1.05, spdMul: 0.97 },
  { name: 'TANK',  col: '#ff4a3d', dark: '#5a120d', acc: 'horns',   errMul: 1.12, spdMul: 1.02 },
  // con ropa (cabeza, torso, brazos y piernas): se arman en world/people.js
  { name: 'COCO',  col: '#3f7df2', dark: '#16295c', acc: 'clown', model: 'clown', errMul: 1.0, spdMul: 1.0 },
  { name: 'PINO',  col: '#a9c96c', dark: '#34401a', acc: 'gnome', model: 'gnome', errMul: 0.98, spdMul: 1.01 },
  { name: 'HUESO', col: '#e8e2cc', dark: '#3a3428', acc: 'skeleton', model: 'skeleton', errMul: 1.02, spdMul: 1.02 },
  { name: 'RANULFO', col: '#5ac83a', dark: '#1a4a12', acc: 'frog', model: 'frog', errMul: 0.97, spdMul: 0.99 },
  { name: 'TRISTÁN', col: '#8a9ad8', dark: '#262a4a', acc: 'sadclown', model: 'sadclown', errMul: 1.06, spdMul: 0.98 },
  { name: 'TORNADO', col: '#c040e0', dark: '#3a0a4a', acc: 'wrestler', model: 'wrestler', errMul: 1.0, spdMul: 1.04 },
  { name: 'BERTO', col: '#4a6aff', dark: '#141c5a', acc: 'wizard', model: 'wizard', errMul: 0.96, spdMul: 0.98 },
  { name: 'TITA', col: '#ff8ac0', dark: '#5a1a3a', acc: 'granny', model: 'granny', errMul: 1.03, spdMul: 0.97 },
  { name: 'LATITA', col: '#a8b8c8', dark: '#2a3440', acc: 'robot', model: 'robot', errMul: 0.94, spdMul: 1.0 },
  { name: 'COSMO', col: '#ff8a2a', dark: '#5a2a0a', acc: 'astronaut', model: 'astronaut', errMul: 1.0, spdMul: 1.03 },
];

// Dificultad de la CPU.
//  spd:   velocidad máxima del pod
//  err:   error de puntería (unidades de arena, se recalcula cada tanto)
//  think: cada cuánto recalcula (segundos) = tiempo de reacción
//  lead:  cuánto anticipa la trayectoria (0 = mira dónde está la pelota, 1 = predice perfecto)
//  swing: probabilidad de usar el golpe fuerte cuando puede
export const DIFFICULTIES = {
  facil:      { label: 'FÁCIL',      spd: 8.5,  err: 3.4, think: [0.18, 0.30], lead: 0.5, swing: 0.10 },
  intermedio: { label: 'INTERMEDIO', spd: 10.2, err: 2.1, think: [0.11, 0.20], lead: 0.8, swing: 0.25 },
  dificil:    { label: 'DIFÍCIL',    spd: 11.8, err: 1.0, think: [0.06, 0.12], lead: 1.0, swing: 0.42 },
  extremo:    { label: 'EXTREMO',    spd: 13.6, err: 0.3, think: [0.03, 0.06], lead: 1.0, swing: 0.65 },
};
export const DIFF_ORDER = ['facil', 'intermedio', 'dificil', 'extremo'];

export const rnd = (a, b) => a + Math.random() * (b - a);
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
