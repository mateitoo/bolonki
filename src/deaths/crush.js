// Aplastado (Bombardeo): la nave queda chata como una calcomanía, con estrellitas, y después desaparece.
import { burst, P } from '../fx/particles.js';
import { SFX } from '../audio.js';

export default {
  id: 'crush',
  name: 'APLASTADO',
  dur: 2.4,
  start(p, st) {
    st.s = p.mesh.root.scale.x || 0.7;
    SFX.crush();
    const y = p.fy || 0;
    burst(p.x, y + 0.6, p.z, { mat: p.i, n: 10, sp: 6, up: [1, 4], life: [0.3, 0.6] });
    burst(p.x, y + 0.4, p.z, { mat: P.YELLOW, n: 6, sp: 5, up: [2, 5], life: [0.2, 0.5] });
  },
  update(p, st, t) {
    const m = p.mesh, s = st.s;
    const k = Math.min(1, t / 0.07);                        // se aplasta en un instante
    m.root.scale.set(s * (1 + 0.45 * k), s * (1 - 0.88 * k), s * (1 + 0.45 * k));
    m.root.position.set(p.x, (p.fy || 0) + 0.02, p.z);        // fy: altura de los pies (arriba de una pila de cajas)
    // estrellitas dando vueltas cuando se ve la calcomanía
    if (t > 1.6 && t < 2.2 && Math.random() < 0.35) {
      const a = t * 9; burst(p.x + Math.cos(a) * 0.9, (p.fy || 0) + 0.5, p.z + Math.sin(a) * 0.9, { mat: P.YELLOW, n: 1, sp: 0.2, up: [0.2, 0.6], life: [0.2, 0.3], g: 0, size: 0.7 });
    }
    if (t > 2.2 && !st.gone) { st.gone = true; burst(p.x, (p.fy || 0) + 0.3, p.z, { mat: P.SMOKE, n: 5, sp: 1.5, up: [0.5, 1.5], life: [0.4, 0.7], g: -1, grow: 2 }); m.root.visible = false; }
  },
};
