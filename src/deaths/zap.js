// Cortocircuito: chispas y electrocución, después la nave se hunde humeando.
import { rnd } from '../config.js';
import { setEmissive, charTint, riderWorld } from '../world/pods.js';
import { burst, P } from '../fx/particles.js';
import { SFX } from '../audio.js';

export default {
  id: 'zap',
  name: 'CORTOCIRCUITO',
  dur: 2.8,
  start(p, st) { st.z = 0; st.puff = 0; SFX.zap(); },
  update(p, st, t, dt) {
    const m = p.mesh;
    if (t < 1.8) {
      const on = ((t * 24) | 0) % 2;
      setEmissive(p, on ? 0.55 : 0, on ? 0.95 : 0, on ? 1 : 0);
      m.rider.position.set(m.riderBase.x + rnd(-0.07, 0.07), m.riderBase.y + rnd(-0.05, 0.09), m.riderBase.z + rnd(-0.05, 0.05));
      m.rider.scale.set(1 + rnd(-0.05, 0.05), 1 + rnd(-0.05, 0.08), 1);
      m.lightM.uniforms.uColor.value.set(on ? 0xffd23a : 0x222222);
      m.veh.rotation.z = rnd(-0.03, 0.03);
      st.z -= dt; if (st.z <= 0) { st.z = rnd(0.18, 0.35); SFX.zap(); }
      if (Math.random() < 0.5) {
        const a = Math.random() * Math.PI * 2;
        burst(p.x + Math.cos(a) * 1.6, rnd(0.4, 2.2), p.z + Math.sin(a) * 1.0,
          { mat: Math.random() < 0.5 ? P.CYAN : P.YELLOW, n: 2, sp: 5, up: [1, 6], life: [0.1, 0.25], size: 0.6 });
      }
    } else {
      const k = Math.min(1, (t - 1.8) / 1.0);
      setEmissive(p, 0, 0, 0); charTint(p, 0.35); m.rider.scale.set(1, 1, 1);
      m.rider.position.set(m.riderBase.x, m.riderBase.y - 0.25 * k, m.riderBase.z);
      m.rider.rotation.x = 0.55 * k; m.rider.rotation.z = 0.2 * k;
      m.veh.rotation.z = 0.3 * k; m.root.position.y = -2.4 * k * k;
      st.puff -= dt;
      if (st.puff <= 0) {
        st.puff = 0.08; const w = riderWorld(p);
        burst(w.x, w.y + 0.5, w.z, { mat: P.SMOKE, n: 1, sp: 0.4, up: [1, 2], life: [0.5, 0.9], g: -1, grow: 2.2 });
      }
    }
  },
};
