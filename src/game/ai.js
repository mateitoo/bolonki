// IA de la CPU. La dificultad (config.DIFFICULTIES) define velocidad, error, reacción,
// anticipación y uso del golpe fuerte; cada personaje la modula con errMul / spdMul.
import { G, PL, PRc, BR, PD, SMAX, DIFFICULTIES, rnd, clamp } from '../config.js';
import { game } from '../state.js';
import { startSwing } from './match.js';

export function aiMove(p, dt) {
  const s = p.side, D = DIFFICULTIES[game.difficulty] || DIFFICULTIES.intermedio;

  // el error de puntería cambia cada tanto (así no es un temblor, sino "se equivocó de lado")
  p.errT -= dt;
  if (p.errT <= 0) { p.errT = rnd(0.45, 0.85); p.err = rnd(-1, 1) * D.err * p.ch.errMul; }

  p.thinkT -= dt;
  if (p.thinkT <= 0) {
    p.thinkT = rnd(D.think[0], D.think[1]);
    let best = 1e9, pred = null, near = null, nearD = 1e9;
    for (const b of game.balls) {
      if (!b.on) continue;
      const d = b.x * s.nx + b.z * s.nz, vn = b.vx * s.nx + b.vz * s.nz;
      const tn = b.x * s.tx + b.z * s.tz, vt = b.vx * s.tx + b.vz * s.tz;
      const dist = PD - d;
      if (dist > -0.5 && dist < nearD) { nearD = dist; near = tn; }
      if (vn > 0.4) {
        const t = Math.max(0, (dist - 0.6) / vn);
        if (t < best) {
          best = t;
          let pv = tn + vt * t * D.lead;              // anticipación según dificultad
          if (pv > G) pv = 2 * G - pv; if (pv < -G) pv = -2 * G - pv;
          pred = pv;
        }
      }
    }
    if (pred !== null) p.target = pred + p.err * (best > 0.5 ? 1 : 0.4);
    else if (near !== null) p.target = near * 0.4;
    else p.target = 0;
    p.target = clamp(p.target, -SMAX, SMAX);

    // golpe fuerte si una pelota se acerca y está a tiro
    if (p.cd <= 0) {
      for (const b of game.balls) {
        if (!b.on) continue;
        const u = clamp((b.x - p.x) * s.tx + (b.z - p.z) * s.tz, -PL, PL);
        const dx = b.x - (p.x + s.tx * u), dz = b.z - (p.z + s.tz * u);
        if (Math.hypot(dx, dz) < PRc + BR + 1.3 && (b.vx * dx + b.vz * dz) < 0 && Math.random() < D.swing) { startSwing(p); break; }
      }
    }
  }
  return clamp((p.target - p.s) * 1.1, -1, 1) * D.spd * p.ch.spdMul;
}
