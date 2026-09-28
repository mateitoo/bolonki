// Caída al abismo (Empujón): la nave se va de la plataforma dando vueltas y cae al magma.
import { riderWorld } from '../world/pods.js';
import { burst, P } from '../fx/particles.js';
import { SFX } from '../audio.js';

export default {
  id: 'fall',
  name: 'CAÍDA',
  dur: 1.9,
  start(p, st) {
    st.vx = (p.vx || 0) * 0.55; st.vz = (p.vz || 0) * 0.55; st.vy = 2.5; st.y = 0; st.splash = false;
    st.spinX = (Math.random() < 0.5 ? -1 : 1) * (2 + Math.random() * 2); st.spinZ = (Math.random() - 0.5) * 4;
    SFX.fall();
  },
  update(p, st, t, dt) {
    const m = p.mesh;
    st.vy -= 24 * dt; st.y += st.vy * dt;
    p.x += st.vx * dt; p.z += st.vz * dt;
    m.root.position.set(p.x, st.y, p.z);
    m.root.rotation.x += st.spinX * dt; m.root.rotation.z += st.spinZ * dt;
    // el piloto se agita (brazos y altura) mientras cae
    m.rider.position.y = m.riderBase.y + Math.min(0.9, t * 1.4) + Math.sin(t * 30) * 0.08;
    m.rider.rotation.y += dt * 9;
    if (t < 0.8 && Math.random() < 0.3) { const w = riderWorld(p); burst(w.x, w.y + 0.6, w.z, { mat: P.WHITE, n: 1, sp: 1, up: [1, 2], life: [0.2, 0.4], size: 0.5 }); }
    if (st.y < -12 && !st.splash) {
      st.splash = true; m.root.visible = false; SFX.splash();
      burst(p.x, -12, p.z, { mat: P.ORANGE, n: 14, sp: 5, up: [5, 10], life: [0.4, 0.8], size: 1.3 });
      burst(p.x, -12, p.z, { mat: P.YELLOW, n: 6, sp: 3, up: [3, 7], life: [0.3, 0.6] });
      burst(p.x, -12, p.z, { mat: P.SMOKE, n: 6, sp: 1.5, up: [1, 3], life: [0.6, 1], g: -2, grow: 2.5 });
    }
  },
};
