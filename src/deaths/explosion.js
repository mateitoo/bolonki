// Explosión: la nave tiembla y parpadea, explota, y el piloto sale volando chamuscado.
import { rnd } from '../config.js';
import { game } from '../state.js';
import { setEmissive, charTint, riderWorld } from '../world/pods.js';
import { burst, P } from '../fx/particles.js';
import { SFX } from '../audio.js';

export default {
  id: 'explosion',
  name: 'EXPLOSIÓN',
  dur: 2.6,
  start(p, st) { SFX.alarm(); st.boom = false; st.vy = 0; st.vz = 0; st.vx = 0; st.puff = 0; },
  update(p, st, t, dt) {
    const m = p.mesh;
    if (t < 0.75) {
      const j = 0.06 + t * 0.3;
      m.veh.position.set(rnd(-j, j), rnd(0, j * 0.5), rnd(-j, j));
      m.rider.position.x = m.riderBase.x + rnd(-j, j);
      const on = ((t * 18) | 0) % 2;
      setEmissive(p, on ? 0.9 : 0.25, on ? 0.1 : 0, 0);
      if (Math.random() < 0.35) { const w = riderWorld(p); burst(w.x, w.y - 0.6, w.z, { mat: P.YELLOW, n: 2, sp: 4, up: [2, 5], life: [0.15, 0.3] }); }
    } else if (!st.boom) {
      st.boom = true;
      m.veh.visible = false; setEmissive(p, 0, 0, 0); charTint(p, 0.28);
      m.scorch.position.set(p.x, 0.03, p.z); m.scorch.visible = true;
      burst(p.x, 0.8, p.z, { mat: P.DEBRIS, n: 18, sp: 9, up: [5, 12], life: [0.8, 1.4], size: 1.4 });
      burst(p.x, 0.8, p.z, { mat: P.ORANGE, n: 16, sp: 6, up: [2, 7], life: [0.3, 0.6], g: -2, grow: 3, size: 1.6 });
      burst(p.x, 0.8, p.z, { mat: P.YELLOW, n: 10, sp: 4, up: [1, 5], life: [0.2, 0.4], g: -2, grow: 3, size: 1.4 });
      burst(p.x, 0.8, p.z, { mat: p.i, n: 10, sp: 8, up: [4, 10], life: [0.6, 1.1] });
      game.shake = Math.max(game.shake, 1.2); SFX.boom();
      st.vy = 15; st.vz = -3.5; st.vx = rnd(-2, 2);
    } else {
      st.vy -= 26 * dt;
      m.rider.position.y += st.vy * dt; m.rider.position.z += st.vz * dt; m.rider.position.x += st.vx * dt;
      m.rider.rotation.x += dt * 10; m.rider.rotation.z += dt * 5;
      st.puff -= dt;
      if (st.puff <= 0 && m.rider.position.y > -3) {
        st.puff = 0.05; const w = riderWorld(p);
        burst(w.x, w.y, w.z, { mat: P.SMOKE, n: 1, sp: 0.5, up: [0.5, 1.5], life: [0.4, 0.7], g: -1, grow: 2 });
      }
      if (m.rider.position.y < -6) m.rider.visible = false;
    }
  },
};
