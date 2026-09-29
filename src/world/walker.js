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
  if (onGround) p.walk = (p.walk || 0) + dt * sp * (2.2 / Math.max(0.5, scale / 0.86));
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
