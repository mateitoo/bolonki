// Catálogo de animaciones de derrota.
//
// Para agregar una nueva:
//   1. Crear src/deaths/mi-animacion.js exportando { id, name, dur, start(p, st), update(p, st, t, dt) }
//      - p: el jugador (p.mesh.root / veh / rider son los grupos 3D)
//      - st: objeto libre para guardar el estado de la animación
//      - t: segundos desde que empezó, dt: delta del frame (ya incluye la cámara lenta)
//   2. Importarla acá y sumarla a DEATH_ANIMS. El selector de la página se llena solo.
import explosion from './explosion.js';
import zap from './zap.js';
import eject from './eject.js';

export const DEATH_ANIMS = [explosion, zap, eject];

export function pickDeath(id) {
  return DEATH_ANIMS.find((a) => a.id === id) || DEATH_ANIMS[(Math.random() * DEATH_ANIMS.length) | 0];
}
