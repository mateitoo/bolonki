import { game } from '../state.js';
import { burst, stepPrint } from '../fx/particles.js';

// Personajes a pie (minijuegos sin nave): esconde la nave, muestra las piernas y anima la caminata.
// p.vx / p.vz: velocidad (para el paso), p.onGround: si está en el piso, p.fy: altura de los pies.
export function drawWalker(p, dt, scale, groundY) {
  const me = p.mesh;
  me.root.visible = true; me.veh.visible = false; me.legs.visible = true;
  me.root.position.set(p.x, p.fy || 0, p.z);
  me.root.scale.setScalar(scale);
  me.root.rotation.set(0, p.ang || 0, 0);
  // caminata: piernas que van y vienen y un rebotecito; en el aire, piernas encogidas
  const onGround = p.onGround !== false;
  const sp = Math.hypot(p.vx || 0, p.vz || 0);
  const w0 = p.walk || 0;
  if (onGround) p.walk = (p.walk || 0) + dt * sp * (2.2 / Math.max(0.5, scale / 0.86));
  // polvito en cada pisada (del color del piso: arena, pasto, nieve, tierra…), si el minijuego lo pide
  // huella (nieve, arena) en cada pisada: un pie y el otro, a cada lado
  if (game.stepPrint && onGround && sp > 0.8 && Math.floor(w0 / Math.PI) !== Math.floor(p.walk / Math.PI)) {
    const a = p.ang || 0, side = Math.floor(p.walk / Math.PI) % 2 ? 1 : -1, s = 0.17 * scale / 0.86;
    stepPrint(p.x + Math.cos(a) * s * side, p.fy || 0, p.z - Math.sin(a) * s * side, a, game.stepPrint);
  }
  if (game.stepPuff !== undefined && game.stepPuff !== null && onGround && sp > 2.2 && Math.floor(w0 / Math.PI) !== Math.floor(p.walk / Math.PI)) {
    const back = (p.ang || 0) + Math.PI;
    burst(p.x + Math.sin(back) * 0.3, (p.fy || 0) + 0.12, p.z + Math.cos(back) * 0.3, { mat: game.stepPuff, n: 2, sp: 0.9, up: [0.6, 1.6], life: [0.25, 0.45], g: 2, grow: 1.2, size: 0.55, floor: (p.fy || 0) + 0.05 });
  }
  const sw = onGround ? Math.sin(p.walk || 0) * Math.min(1, sp / 3) * 0.7 : -0.5;
  me.legL.rotation.x = sw; me.legR.rotation.x = onGround ? -sw : -0.3;
  // brazos (personajes con ropa): al revés que las piernas; en el aire, para arriba
  if (me.armL) {
    me.armL.rotation.set(onGround ? -sw * 0.9 : -2.2, 0, onGround ? -0.12 : -0.35);
    me.armR.rotation.set(onGround ? sw * 0.9 : -2.2, 0, onGround ? 0.12 : 0.35);
  }
  me.rider.position.set(0, 1.3 + (onGround ? Math.abs(Math.sin(p.walk || 0)) * 0.12 * Math.min(1, sp / 3) : 0.1), 0);
  me.rider.rotation.x = onGround ? 0 : -0.15;
  me.sh.position.set(p.x, (groundY || 0) + 0.04, p.z); me.sh.rotation.y = 0; me.sh.scale.set(0.87 * scale, 1, 0.87 * scale); me.sh.visible = true;
}
