// Eyección: la nave se aplasta y el piloto sale disparado como un cohete.
import { riderWorld } from '../world/pods.js';
import { burst, P } from '../fx/particles.js';
import { SFX } from '../audio.js';

export default {
  id: 'eject',
  name: 'EYECCIÓN',
  dur: 2.6,
  start(p, st) { SFX.alarm(); st.go = false; st.vy = 0; st.puff = 0; st.thud = false; },
  update(p, st, t, dt) {
    const m = p.mesh;
    if (t < 0.6) {
      const k = Math.sin((t / 0.6) * Math.PI);
      m.veh.scale.set(1 + 0.12 * k, 1 - 0.35 * k, 1 + 0.12 * k);
      m.rider.position.y = m.riderBase.y - 0.45 * k;
      m.lightM.uniforms.uColor.value.set(((t * 16) | 0) % 2 ? 0xff2030 : 0xffd23a);
    } else if (!st.go) {
      st.go = true; st.vy = 22; SFX.launch(); m.veh.scale.set(1, 1, 1);
      burst(p.x, 0.5, p.z, { mat: P.SMOKE, n: 14, sp: 5, up: [0.5, 2], life: [0.5, 0.9], g: -0.5, grow: 2.5 });
      burst(p.x, 1, p.z, { mat: P.ORANGE, n: 8, sp: 2, up: [-4, -1], life: [0.2, 0.4], g: 0, grow: 2 });
    } else {
      st.vy -= 4 * dt;
      m.rider.position.y += st.vy * dt; m.rider.rotation.y += dt * 16;
      st.puff -= dt;
      if (st.puff <= 0 && m.rider.position.y < 30) {
        st.puff = 0.035; const w = riderWorld(p);
        burst(w.x, w.y - 0.7, w.z, { mat: Math.random() < 0.35 ? P.ORANGE : P.SMOKE, n: 1, sp: 0.4, up: [-2, 0], life: [0.3, 0.6], g: 0, grow: 2 });
      }
      const k = Math.min(1, (t - 0.6) / 1.4);
      m.lightM.uniforms.uColor.value.set(0x222222);
      m.veh.scale.set(1 + 0.1 * k, 1 - 0.55 * k, 1 + 0.1 * k);
      m.veh.position.z = -1.6 * k; m.veh.rotation.y = 0.6 * k;
      if (t > 1.0 && !st.thud) { st.thud = true; SFX.thud(); }
      if (t > 1.9) m.root.position.y = -(t - 1.9) * 2.5;
    }
  },
};
