// Alcanzado por una explosión (Petardos): sale volando chamuscado, dando vueltas, y desaparece en humo.
import { burst, P } from '../fx/particles.js';
import { SFX } from '../audio.js';
import { charTint } from '../world/pods.js';

export default {
  id: 'blast',
  name: 'CHAMUSCADO',
  dur: 1.5,
  start(p, st) {
    st.y = p.fy || 0; st.vy = 9;
    SFX.zap();
    charTint(p, 0.3);
    burst(p.x, st.y + 1, p.z, { mat: P.SMOKE, n: 6, sp: 2, up: [2, 4], life: [0.4, 0.8], g: -1, grow: 2 });
  },
  update(p, st, t, dt) {
    const m = p.mesh;
    st.vy -= 26 * dt; st.y += st.vy * dt;
    m.root.position.set(p.x, Math.max(st.y, -0.5), p.z);
    m.root.rotation.y += dt * 14;
    m.root.rotation.z = Math.sin(t * 20) * 0.3;
    if (Math.random() < 0.4) burst(p.x, m.root.position.y + 0.8, p.z, { mat: P.SMOKE, n: 1, sp: 0.6, up: [0.5, 1.5], life: [0.3, 0.6], g: -1, grow: 1.5 });
    if (t > 1.2 && m.root.visible) { m.root.visible = false; burst(p.x, 0.6, p.z, { mat: P.SMOKE, n: 6, sp: 1.5, up: [0.5, 2], life: [0.4, 0.7], g: -1, grow: 2 }); }
  },
};
