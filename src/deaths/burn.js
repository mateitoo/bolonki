// Quemado en la lava (Bombardeo): se hunde echando humo, saltando un poquito, y desaparece.
import { burst, P } from '../fx/particles.js';
import { SFX } from '../audio.js';
import { charTint } from '../world/pods.js';

export default {
  id: 'burn',
  name: 'QUEMADO',
  dur: 1.6,
  start(p, st) {
    st.y = p.fy || 0; st.lava = p.lavaY || st.y; st.vy = 5;
    SFX.burn();
    burst(p.x, st.lava + 0.2, p.z, { mat: P.ORANGE, n: 10, sp: 3, up: [3, 7], life: [0.3, 0.6] });
  },
  update(p, st, t, dt) {
    const m = p.mesh;
    // un saltito de "¡quema!" y después se hunde
    st.vy -= 20 * dt; st.y += st.vy * dt;
    if (st.y < st.lava - 1.6) st.y = st.lava - 1.6;
    m.root.position.set(p.x, st.y, p.z);
    m.root.rotation.y += dt * 10;
    charTint(p, Math.max(0.25, 1 - t * 0.9));
    if (Math.random() < 0.5) burst(p.x, st.lava + 0.1, p.z, { mat: Math.random() < 0.5 ? P.SMOKE : P.ORANGE, n: 1, sp: 0.8, up: [1, 3], life: [0.3, 0.7], g: -1, grow: 1.5 });
    if (t > 1.4) m.root.visible = false;
  },
};
