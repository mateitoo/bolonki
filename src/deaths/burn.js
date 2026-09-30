// Quemado en la lava (Bombardeo): se hunde echando humo, saltando un poquito, y desaparece.
import { burst, P } from '../fx/particles.js';
import { SFX } from '../audio.js';
import { charTint } from '../world/pods.js';
import { game } from '../state.js';

export default {
  id: 'burn',
  name: 'QUEMADO',
  dur: 1.6,
  start(p, st) {
    st.y = p.fy || 0; st.lava = p.lavaY || st.y; st.vy = 5;
    st.style = game.burnStyle || 'lava';                     // lava (se quema), water (se lo lleva la marea), snow (lo tapa la nieve)
    st.m1 = st.style === 'water' ? P.CYAN : st.style === 'snow' ? P.WHITE : P.ORANGE;
    st.m2 = st.style === 'lava' ? P.SMOKE : P.WHITE;
    if (st.style === 'water') SFX.splash(); else if (st.style === 'snow') SFX.crumble(); else SFX.burn();
    burst(p.x, st.lava + 0.2, p.z, { mat: st.m1, n: 10, sp: 3, up: [3, 7], life: [0.3, 0.6] });
  },
  update(p, st, t, dt) {
    const m = p.mesh;
    // un saltito de "¡quema!" y después se hunde
    st.vy -= 20 * dt; st.y += st.vy * dt;
    if (st.y < st.lava - 1.6) st.y = st.lava - 1.6;
    m.root.position.set(p.x, st.y, p.z);
    m.root.rotation.y += dt * 10;
    if (st.style === 'lava') charTint(p, Math.max(0.25, 1 - t * 0.9));
    if (Math.random() < 0.5) burst(p.x, st.lava + 0.1, p.z, { mat: Math.random() < 0.5 ? st.m2 : st.m1, n: 1, sp: 0.8, up: [1, 3], life: [0.3, 0.7], g: st.style === 'lava' ? -1 : 6, grow: st.style === 'lava' ? 1.5 : 1 });
    if (t > 1.4) m.root.visible = false;
  },
};
