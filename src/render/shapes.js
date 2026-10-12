// Formas "menos de computadora": cajas con cantos redondeados, cilindros con panza, toldos con
// bordes ondulados y un ruido suave para que nada quede perfecto (ni círculos perfectos ni ángulos rectos).
import * as THREE from 'three';

// Caja con los cantos y las esquinas redondeadas (radio r). seg: subdivisiones por lado (2 = chaflán, 3 = más redonda).
// Las cajas muy finitas (sogas, cables, tablitas) quedan como cajas comunes: no vale la pena gastar triángulos.
export function roundBox(w, h, d, r, seg = 2) {
  const m = Math.min(w, h, d);
  if (r === undefined) r = Math.min(0.2, m * 0.2);
  if (m < 0.14 || r < 0.012) return new THREE.BoxGeometry(w, h, d);
  const g = new THREE.BoxGeometry(w, h, d, seg, seg, seg), p = g.attributes.position, v = new THREE.Vector3(), c = new THREE.Vector3();
  const hx = w / 2 - r, hy = h / 2 - r, hz = d / 2 - r;
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    c.set(Math.max(-hx, Math.min(hx, v.x)), Math.max(-hy, Math.min(hy, v.y)), Math.max(-hz, Math.min(hz, v.z)));
    v.sub(c); if (v.lengthSq() > 1e-9) v.normalize().multiplyScalar(r);
    p.setXYZ(i, c.x + v.x, c.y + v.y, c.z + v.z);
  }
  g.computeVertexNormals();
  return g;
}

// Ruido suave (valor por posición): vértices que están en el mismo lugar se mueven igual, así no se abren grietas
function hash(x, y, z) { const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return s - Math.floor(s); }
function vnoise(x, y, z) {
  const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z), fx = x - ix, fy = y - iy, fz = z - iz;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy), sz = fz * fz * (3 - 2 * fz);
  const l = (a, b, t) => a + (b - a) * t;
  return l(l(l(hash(ix, iy, iz), hash(ix + 1, iy, iz), sx), l(hash(ix, iy + 1, iz), hash(ix + 1, iy + 1, iz), sx), sy),
    l(l(hash(ix, iy, iz + 1), hash(ix + 1, iy, iz + 1), sx), l(hash(ix, iy + 1, iz + 1), hash(ix + 1, iy + 1, iz + 1), sx), sy), sz) * 2 - 1;
}
// Corre cada vértice un poquito (amt) según un ruido de la posición (freq). seed cambia el dibujo.
export function organic(g, amt, freq = 1.3, seed = 0, keepBottom = false) {
  const p = g.attributes.position;
  let minY = Infinity; if (keepBottom) for (let i = 0; i < p.count; i++) minY = Math.min(minY, p.getY(i));
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), f = freq;
    const k = keepBottom && y - minY < 0.02 ? 0 : 1;              // la base queda apoyada en el piso
    p.setXYZ(i, x + vnoise(x * f + seed, y * f, z * f) * amt * k, y + vnoise(x * f, y * f + 17.3 + seed, z * f) * amt * 0.6 * k, z + vnoise(x * f, y * f, z * f + 31.7 + seed) * amt * k);
  }
  g.computeVertexNormals();
  return g;
}

// Cilindro con panza (como un barril o una torre de barro): el medio sale "bulge" veces el radio
export function bellyCylinder(rTop, rBot, h, rad = 14, hSeg = 6, bulge = 0.06) {
  const g = new THREE.CylinderGeometry(rTop, rBot, h, rad, hSeg, false), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i) / h + 0.5, k = 1 + Math.sin(y * Math.PI) * bulge, x = p.getX(i), z = p.getZ(i);
    if (Math.hypot(x, z) > 1e-4) { p.setX(i, x * k); p.setZ(i, z * k); }
  }
  g.computeVertexNormals();
  return g;
}

// Toldo de sombrilla: gajos que se curvan hacia abajo y un borde ondulado (festoneado) entre varilla y varilla
// gajo: si se pasa, arma solo ese gajo (para pintar los gajos de dos colores con dos materiales)
export function canopy(r, h, n = 8, sub = 3, gajo = -1) {
  const g = new THREE.BufferGeometry(), pos = [], uv = [], idx = [];
  const segA = gajo >= 0 ? 4 : n * 4, rings = sub + 1, a0 = gajo >= 0 ? (gajo / n) * Math.PI * 2 : 0, span = gajo >= 0 ? (Math.PI * 2) / n : Math.PI * 2;
  for (let j = 0; j <= rings; j++) {
    const t = j / rings;                                             // 0 = punta, 1 = borde
    for (let i = 0; i <= segA; i++) {
      const a = a0 + (i / segA) * span, between = Math.abs(Math.sin(((a / (Math.PI * 2)) * n) * Math.PI));   // 0 en las varillas, 1 al medio del gajo
      const rr = r * t * (1 - between * 0.06 * t);                   // el gajo se mete un poco entre varilla y varilla
      const y = h * (1 - Math.pow(t, 1.6)) - between * 0.18 * t * t - (t > 0.85 ? (t - 0.85) * 1.2 : 0);   // panza que cae y borde que se cuelga
      pos.push(Math.cos(a) * rr, y, Math.sin(a) * rr); uv.push(i / segA, t);
    }
  }
  for (let j = 0; j < rings; j++) for (let i = 0; i < segA; i++) {
    const a = j * (segA + 1) + i, b = a + segA + 1;
    idx.push(a, a + 1, b, a + 1, b + 1, b);
  }
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}
