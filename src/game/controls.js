// Controles de cada nave local según lo que se ve en pantalla.
// Cada lado de la arena se mueve en una dirección distinta de la pantalla:
//   abajo y arriba -> izquierda/derecha      costados -> arriba/abajo
// Así nadie tiene los controles invertidos, esté donde esté (y con la cámara rotada del online).
import { clamp } from '../config.js';
import { game } from '../state.js';
import { input } from '../input.js';

// dirección en pantalla (derecha, arriba) de la tangente de cada lado, con la cámara desde el lado 0
const SCREEN_T = [[1, 0], [0, 1], [-1, 0], [0, -1]];

export function localAxis(p) {
  const c = input.ctl[p.pad || 'all'];
  const cam = game.me > 0 ? game.me : 0;
  const [sx, sy] = SCREEN_T[(p.i - cam + 4) % 4];
  return clamp(c.x * sx + c.y * sy, -1, 1);
}
export const localHit = (p) => input.ctl[p.pad || 'all'].hit;
// true si este lado se mueve con arriba/abajo en la pantalla
export const isVerticalSide = (i) => ((i - (game.me > 0 ? game.me : 0) + 4) % 2) === 1;

// Minijuegos con cámara que se gira: "arriba" en la pantalla es para donde mira la cámara.
// Devuelve la dirección en el mundo [wx, wz] para un stick (x, y) de la pantalla.
export function camMove(x, y) {
  const a = game.camYaw || 0;
  if (!a) return [x, -y];
  const c = Math.cos(a), s = Math.sin(a);
  return [x * c - y * s, -x * s - y * c];
}
