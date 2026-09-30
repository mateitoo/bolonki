// Minijuego 1: BOLA BRAVA. Cada uno defiende su arco; las pelotas salen de las torres.
import * as THREE from 'three';
import { register, fixedMap } from './registry.js';
import { BR, HUMAN_SPEED } from '../config.js';
import { game, world } from '../state.js';
import { buildArena, arenaGroup, arenaMats } from '../world/arena.js';
import { R, CORN } from '../config.js';
import { P as PART } from '../fx/particles.js';
import { decorEspacio, decorCirco, decorPlaya, decorTerraza, carousel, column, rubble, crab } from '../world/decorBolas.js';
import { TX } from '../render/textures.js';
import { mat } from '../render/psx.js';
import { buildBalls, removeBall } from '../world/balls.js';
import { dropDot } from '../fx/particles.js';
import { step as ballStep, movePod, arenaMods } from '../game/physics.js';
import { FX } from '../game/fx.js';
import { podPos, startSwing } from '../game/match.js';
import { localAxis } from '../game/controls.js';
import { txt, COL } from '../ui/draw.js';
import { sendInput } from '../net/room.js';

const r2 = (v) => Math.round(v * 100) / 100;
const r1 = (v) => Math.round(v * 10) / 10;
let sendT = 0;

/* ---------- mapas ----------
   La arena es siempre la misma (mismo tamaño, torres y arcos); cada mapa cambia el aspecto y le suma una vuelta:
   CIRCO: tambor giratorio en el medio (con una foca) que rebota las pelotas y las tira de costado · PLAYA: ráfagas de viento que
   curvan las pelotas (las flechas del piso avisan para dónde) y un cangrejo que cada tanto sale de una torre y cruza
   (las pelotas le rebotan) · TERRAZA: una columna en el medio que se va rajando a pelotazos; cuando se rompe deja
   montoncitos de escombros que rebotan las pelotas hasta el final de la partida. */
const CAR_R = 1.5, CAR_SPIN = 6, WIND = 5;
const COL_R = 1.15, COL_HP = 12, MOUND_R = 0.7, CRAB_R = 0.85, CRAB_SP = 3.2;
const MAPS = [
  { name: 'ESPACIO', build: (g) => decorEspacio(g), fog: { col: 0x04060b, near: 40, far: 80 },
    floor: [TX.floor, 0xe8eef0], outer: [TX.outer, 0xffffff, 0], rim: TX.rim, tower: [TX.tower, 0xffffff], ring: 0x35f0ff, cap: [TX.bronze, 0xffffff], ball: 'chrome', strip: [TX.lights, 22, 0], pit: [TX.pit, 0xffffff] },
  { name: 'CIRCO', build: (g) => decorCirco(g), fog: { col: 0x2a0a14, near: 45, far: 110 }, rule: 'EL TAMBOR DEL MEDIO GIRA Y DESVÍA LAS PELOTAS',
    floor: [TX.carnival, 0xffffff], outer: [TX.sand, 0xc88a58, 1], rim: TX.fairFence, tower: [TX.circus, 0xffffff], ring: 0xffd24a, cap: [TX.circus, 0xffffff], ball: 'circus', carousel: true, strip: [TX.marquee, 22, 3], pit: [TX.velvet, 0xffffff] },
  { name: 'PLAYA', build: (g) => decorPlaya(g), fog: { col: 0xd8807a, near: 55, far: 150 }, rule: 'VIENTO (MIRÁ LAS FLECHAS) Y UN CANGREJO QUE CRUZA',
    floor: [TX.beachFloor, 0xffffff], outer: [TX.sand, 0xffffff, 0.58], rim: TX.beachRim, tower: [TX.lifeguard, 0xffffff], ring: 0xffffff, cap: [TX.cloth, 0xe83a3a], ball: 'beach', wind: true, crab: true, strip: [TX.rope, 5, 0.12], pit: [TX.water, 0x9ad0e8] },
  { name: 'TERRAZA', build: (g) => decorTerraza(g), fog: { col: 0x0c1030, near: 45, far: 110 }, rule: 'LA COLUMNA SE ROMPE A PELOTAZOS Y DEJA ESCOMBROS',
    floor: [TX.roofTiles, 0xffffff], outer: [TX.roofTiles, 0x8a8a8a, 0.5], rim: TX.parapet, tower: [TX.tank, 0xffffff], ring: 0xff5fa2, cap: [TX.metal, 0xa8b0b8], ball: 'chrome', column: true, strip: [TX.tape, 18, 0], pit: [TX.gutter, 0xffffff] },
];
const S = {
  map: 0, wa: 0, wst: 0, wT: 8,                   // viento — wst: 0 calma · 1 aviso · 2 sopla
  hp: COL_HP, mounds: [], colHitT: 0,             // columna de la terraza y sus escombros [[x, z], …]
  crab: { on: false, x: 0, z: 0, ang: 0, path: null, seg: 0, hitT: 0 }, crabT: 10,
};
const MG = {};                                     // grupos de cada mapa, calesita, flechas del viento…
const chevGeo = () => {
  const cs = new THREE.Shape();
  cs.moveTo(-0.85, 0); cs.lineTo(0, 0.75); cs.lineTo(0.85, 0); cs.lineTo(0.85, -0.4); cs.lineTo(0, 0.33); cs.lineTo(-0.85, -0.4); cs.closePath();
  const g = new THREE.ShapeGeometry(cs); g.rotateX(-Math.PI / 2); return g;
};
function buildMaps() {
  MG.groups = MAPS.map((m) => { const g = new THREE.Group(); g.visible = false; arenaGroup.add(g); m.build(g); return g; });
  // tambor giratorio (CIRCO)
  MG.car = carousel(MG.groups[1], CAR_R);
  // columna y escombros (TERRAZA)
  MG.col = column(MG.groups[3], COL_R);
  MG.mounds = Array.from({ length: 4 }, () => { const m = rubble(MG.groups[3], MOUND_R); m.visible = false; return m; });
  MG.moundT = [];
  // cangrejo (PLAYA)
  MG.crab = crab(MG.groups[2]);
  // viento (PLAYA): flechas en el piso y arena volando
  const wg = new THREE.Group(); MG.groups[2].add(wg); MG.wind = wg;
  MG.windM = mat({ color: 0xffe14a, unlit: true });
  const cg = chevGeo();
  for (let k = 0; k < 3; k++) { const c = new THREE.Mesh(cg, MG.windM); c.position.set(0, 0.03, -1.4 + k * 1.5); c.scale.setScalar(1.9); wg.add(c); }
  const n = 40, im = new THREE.InstancedMesh(new THREE.BoxGeometry(0.08, 0.08, 1.2), mat({ color: 0xfff0c8, unlit: true }), n);
  MG.sand = { im, ps: Array.from({ length: n }, () => ({ u: Math.random() * 30 - 15, v: Math.random() * 22 - 11, y: 0.2 + Math.random() * 1.6, sp: 0.7 + Math.random() * 0.6 })) };
  im.visible = false; MG.groups[2].add(im);
  // pelotas de playa
  MG.beachMats = [];
}
// materiales de la arena y pelotas según el mapa
function applyMap(i) {
  S.map = i;
  const m = MAPS[i];
  MG.groups.forEach((g, k) => { g.visible = k === i; });
  const setM = (mt, map, col) => { mt.uniforms.uMap.value = map; mt.uniforms.uColor.value.set(col); };
  setM(arenaMats.floor, m.floor[0], m.floor[1]);
  setM(arenaMats.outerMesh.material, m.outer[0], m.outer[1]); arenaMats.outerMesh.scale.set(m.outer[2] || 1, 1, m.outer[2] || 1); arenaMats.outerMesh.visible = m.outer[2] > 0;   // en el espacio no hay piso: flota
  setM(arenaMats.rim, m.rim, 0xffffff);
  setM(arenaMats.tower, m.tower[0], m.tower[1]);
  arenaMats.towerRing.uniforms.uColor.value.set(m.ring);
  // línea del arco y foso de atrás, según el mapa
  setM(arenaMats.strip, m.strip[0], 0xffffff); arenaMats.strip.uniforms.uOff.value.set(0, 0);
  arenaMats.strips.forEach((g) => {                   // cuántas veces se repite la textura a lo largo de la línea
    const uv = g.attributes.uv; if (!g.userData.base) g.userData.base = Float32Array.from(uv.array);
    const b = g.userData.base, k = m.strip[1] / 22;
    for (let i = 0; i < uv.count; i++) uv.setX(i, b[i * 2] * k);
    uv.needsUpdate = true;
  });
  setM(arenaMats.pit, m.pit[0], m.pit[1]);
  setM(arenaMats.cap, m.cap[0], m.cap[1]); setM(arenaMats.capRim, m.cap[0], new THREE.Color(m.cap[1]).multiplyScalar(0.7).getHex());
  game.balls.forEach((b) => {
    if (!b.chromeM) { b.chromeM = b.m; b.beachM = mat({ map: TX.beachBall }); b.circusM = mat({ map: TX.circusBall }); }
    b.m = m.ball === 'beach' ? b.beachM : m.ball === 'circus' ? b.circusM : b.chromeM; b.mesh.material = b.m;
  });
  arenaMods.wind = null; S.wst = 0; S.wT = 7;
  S.hp = COL_HP; S.mounds = []; S.colHitT = 0; MG.moundT = [];
  S.crab.on = false; S.crab.hitT = 0; S.crabT = 8 + Math.random() * 6;
  updBumpers();
}
// lo que rebota en el medio según el mapa (lo usa la física: game/physics.js)
const carB = { x: 0, z: 0, r: CAR_R, spin: CAR_SPIN };
const colB = { x: 0, z: 0, r: COL_R, snd: 'crack', onHit: (b) => hitColumn(b) };
const crabB = { x: 0, z: 0, r: CRAB_R, onHit: () => { S.crab.hitT = 0.45; } };
function updBumpers() {
  const m = MAPS[S.map];
  if (m.carousel) arenaMods.bumpers = [carB];
  else if (m.column) arenaMods.bumpers = S.hp > 0 ? [colB] : S.mounds.map(([x, z]) => ({ x, z, r: MOUND_R }));
  else if (m.crab && S.crab.on && CORN.every((c) => Math.hypot(S.crab.x - c[0], S.crab.z - c[1]) > R + 0.3)) { crabB.x = S.crab.x; crabB.z = S.crab.z; arenaMods.bumpers = [crabB]; }
  else arenaMods.bumpers = [];
}
// cada pelotazo raja la columna; al romperse caen los escombros (cuatro montoncitos alrededor del medio)
function hitColumn(b) {
  if (S.hp <= 0) return;
  S.hp--; S.colHitT = 0.25;
  FX.sparkle(b.x * 0.6, 1.2, b.z * 0.6, PART.ORANGE, 4);
  if (S.hp > 0) return;
  const a0 = Math.random() * Math.PI * 2;
  S.mounds = [0, 1, 2, 3].map((k) => { const a = a0 + (k * Math.PI) / 2 + (Math.random() - 0.5) * 0.7, d = 2.3 + Math.random() * 1.4; return [r2(Math.sin(a) * d), r2(Math.cos(a) * d)]; });
  FX.sparkle(0, 1.6, 0, PART.ORANGE, 16); FX.sparkle(0, 1.2, 0, PART.SMOKE, 10); FX.snd('collapse');
  game.shake = Math.max(game.shake, 0.45);
  updBumpers();
}
// cangrejo de la playa: cada tanto sale de una torre, va hasta cerca del medio y se mete en otra torre
function stepCrab(dt) {
  const c = S.crab, live = game.state === 'play' || game.state === 'menu' || game.state === 'title';
  if (!MAPS[S.map].crab || !live) return;
  if (c.hitT > 0) c.hitT -= dt;
  if (!c.on) {
    if (game.pendingEnd) return;
    S.crabT -= dt;
    if (S.crabT > 0) return;
    const ci = (Math.random() * 4) | 0; let cj = (ci + 1 + ((Math.random() * 3) | 0)) % 4;
    const at = (k) => { const q = CORN[k], l = Math.hypot(q[0], q[1]); return [q[0] - (q[0] / l) * R * 0.45, q[1] - (q[1] / l) * R * 0.45]; };
    const mid = [(Math.random() - 0.5) * 4, (Math.random() - 0.5) * 4];
    c.path = [at(ci), mid, at(cj)]; c.seg = 0; c.x = c.path[0][0]; c.z = c.path[0][1]; c.on = true;
    FX.snd('crab');
  }
  const [tx, tz] = c.path[c.seg + 1], dx = tx - c.x, dz = tz - c.z, d = Math.hypot(dx, dz), st = CRAB_SP * dt * (c.hitT > 0 ? 0.3 : 1);
  if (d > 1e-3) c.ang = Math.atan2(dx, dz);
  if (d <= st) { c.x = tx; c.z = tz; c.seg++; if (c.seg >= c.path.length - 1) { c.on = false; S.crabT = 13 + Math.random() * 9; } }
  else { c.x += (dx / d) * st; c.z += (dz / d) * st; }
}
// viento de la playa: calma un rato, avisa (flechas titilando) y sopla unos segundos para un lado al azar
function stepWind(dt) {
  const live = game.state === 'play' || game.state === 'menu' || game.state === 'title';
  if (!MAPS[S.map].wind || !live || game.pendingEnd) { arenaMods.wind = null; return; }
  S.wT -= dt;
  if (S.wT <= 0) {
    if (S.wst === 0) { S.wst = 1; S.wT = 1.6; S.wa = Math.random() * Math.PI * 2; FX.snd('wind'); }
    else if (S.wst === 1) { S.wst = 2; S.wT = 3.5; }
    else { S.wst = 0; S.wT = 6 + Math.random() * 4; }
  }
  arenaMods.wind = S.wst === 2 ? { x: Math.sin(S.wa) * WIND, z: Math.cos(S.wa) * WIND } : null;
}

const bolas = {
  id: 'bolas',
  name: 'BOLA BRAVA',
  desc: 'DEFENDÉ TU ARCO DE LAS PELOTAS',
  howTo: 'GOLPE FUERTE',
  points: { label: 'PUNTOS', values: [5, 10, 15], key: 'points', demo: 15 },
  cam: { pos: new THREE.Vector3(0, 24, 26), look: new THREE.Vector3(0, 0, -1.6), rotate: true },
  humanOut: true,
  tense: () => game.players.filter((p) => p.alive && !p.empty).length <= 2,   // mano a mano: música más rápida
  thumbSteps: 460,

  rules(K) {
    const r = ['¡DEFENDÉ TU ARCO: QUE NO TE ENTREN PELOTAS!', `CADA GOL EN CONTRA TE SACA UNA VIDA (TENÉS ${game.target || 5})`, `MOVETE POR TU LADO · ${K} = GOLPE FUERTE`, 'EL ÚLTIMO QUE QUEDA GANA'];
    if (MAPS[S.map].rule) r.push(`MAPA ${MAPS[S.map].name}: ${MAPS[S.map].rule}`);
    if (game.mode === 'local' && game.players.some((p) => p.ctrl === 'local' && p.i % 2 === 1)) r.push('LOS DE LOS COSTADOS SE MUEVEN CON ARRIBA / ABAJO');
    return r;
  },
  maps: MAPS.map((m) => m.name),
  fog: () => MAPS[S.map].fog,
  _S: S,
  build() { buildArena(); buildBalls(); buildMaps(); applyMap(0); },
  show(on) {
    arenaGroup.visible = on;
    if (!on) { game.balls.forEach(removeBall); arenaMods.bumpers = []; arenaMods.wind = null; }
    else applyMap(S.map);
  },

  reset() {
    if (game.online !== 'guest') { const f = fixedMap(MAPS.length); applyMap(f >= 0 ? f : (Math.random() * MAPS.length) | 0); }
    else applyMap(S.map);
    world.barriers.forEach((b) => (b.y = -3));
    game.players.forEach((p) => {
      p.mesh.root.rotation.set(0, p.mesh.baseRot, 0);
      if (p.empty) { p.mesh.root.visible = false; world.barriers[p.i].y = 0.55; }
      podPos(p);
    });
    world.chevSets.forEach((c) => (c.warn = 0));
    game.balls.forEach(removeBall);
    sendT = 0;
  },

  step(dt) { stepWind(dt); stepCrab(dt); updBumpers(); ballStep(dt); },

  visuals(dt) {
    const clock = game.clock;
    for (const p of game.players) {
      const m = p.mesh;
      if (p.death) continue;
      if (p.empty) { m.root.visible = false; m.sh.visible = false; continue; }
      if (p.spin > 0) p.spin = Math.max(0, p.spin - dt * 4.5);
      m.root.position.set(p.x, Math.sin(clock * 6 + p.i) * 0.05, p.z);
      m.root.scale.set(1, 1, 0.86);          // un poco menos profunda: queda justa con la línea del arco
      m.root.rotation.y = m.baseRot + (p.spin > 0 ? (1 - p.spin) * Math.PI * 2 : 0);
      m.veh.rotation.z = -p.v * 0.012;
      m.rider.rotation.z = -p.v * 0.02;
      const e = p.swing > 0 ? 0.8 : 0; m.hullM.uniforms.uEmissive.value.setRGB(e, e, e);
      m.sh.position.set(p.x, 0.03, p.z); m.sh.rotation.y = m.baseRot; m.sh.scale.set(1.95, 1, 1.4); m.sh.visible = true;
    }
    for (const b of game.balls) {
      if (!b.on) continue;
      b.mesh.position.set(b.x, BR, b.z); b.sh.position.set(b.x + 0.12, 0.035, b.z + 0.12);
      const e = b.power > 0 ? 0.55 + 0.45 * Math.sin(clock * 40) : 0;
      b.m.uniforms.uEmissive.value.setRGB(e, e * 0.6, e * 0.15);
    }
    for (const t of world.towers) {
      t.flash = Math.max(0, t.flash - dt); const k = t.flash / 0.3;
      t.holeM.uniforms.uColor.value.setRGB(0.02 + k, 0.03 + k * 0.2, 0.04 + k * 0.1);
    }
    world.chevSets.forEach((c) => {
      if (c.warn > 0) { c.warn -= dt; c.m.uniforms.uColor.value.set(((clock * 14) | 0) % 2 ? 0x3cff5a : 0x1d6b28); }
      else c.m.uniforms.uColor.value.set(0x16191e);
    });
    world.goalLasers.forEach((g) => {
      if (g.t > 0) { g.t -= dt; g.m.visible = ((clock * 30) | 0) % 2 === 0; } else g.m.visible = false;
    });
    world.barriers.forEach((b) => {
      b.g.position.y += (b.y - b.g.position.y) * Math.min(1, dt * 7);
      b.m.uniforms.uOff.value.y = (clock * 1.5) % 1;
    });
    mapVisuals(dt, clock);
  },

  onLocalHit(p) { if (p.cd <= 0) startSwing(p); },

  drawScore(p, x, y) {
    txt(p.empty ? '--' : String(p.score).padStart(2, '0'), x, y, 16, p.alive ? COL.gold : '#555b6e', 'center', COL.goldShadow);
  },
  hud() {},

  /* ---------- online ---------- */
  snapshot() {
    return {
      m: S.map, w: [Math.round(S.wa * 100) / 100, S.wst],
      c: MAPS[S.map].column ? [S.hp, S.mounds.flat()] : 0,
      k: MAPS[S.map].crab && S.crab.on ? [r2(S.crab.x), r2(S.crab.z), r2(S.crab.ang), S.crab.hitT > 0 ? 1 : 0] : 0,
      p: game.players.map((p) => [r2(p.s), r1(p.v), p.alive ? 1 : 0, p.score, p.swing > 0 ? 1 : 0]),
      b: game.balls.map((b) => (b.on ? [r2(b.x), r2(b.z), b.power > 0 ? 1 : 0] : 0)),
    };
  },
  applySnap(A, B, f, rdt, resumed) {
    if (A.m !== undefined && A.m !== S.map) applyMap(A.m);
    if (A.w) { S.wa = A.w[0]; S.wst = A.w[1]; }
    if (A.c) {
      if (A.c[0] < S.hp) S.colHitT = 0.25;
      S.hp = A.c[0]; S.mounds = []; for (let k = 0; k + 1 < A.c[1].length; k += 2) S.mounds.push([A.c[1][k], A.c[1][k + 1]]);
    }
    if (A.k) {
      const kb = B.k || A.k, c = S.crab;
      c.on = true; c.x = A.k[0] + (kb[0] - A.k[0]) * f; c.z = A.k[1] + (kb[1] - A.k[1]) * f; c.ang = A.k[2]; if (A.k[3]) c.hitT = 0.3;
    } else S.crab.on = false;
    if (S.crab.hitT > 0) S.crab.hitT -= rdt;
    if (S.colHitT > 0) S.colHitT -= rdt;
    game.players.forEach((p, i) => {
      const pa = A.p[i], pb = B.p[i];
      p.alive = !!pa[2]; p.score = pa[3];
      // eliminado antes de que volvieras (al reconectarte): arco cerrado sin animación
      if (resumed && !p.alive && !p.death && !p.empty) { p.death = { anim: { dur: 0, update() {} }, t: 0, st: {}, done: true }; p.mesh.root.visible = false; world.barriers[i].y = 0.55; }
      if (p.ctrl !== 'net') return;
      p.s = pa[0] + (pb[0] - pa[0]) * f; p.v = pa[1];
      if (pa[4] && !(p.swing > 0)) p.spin = 1;
      p.swing = pa[4] ? 0.1 : 0;
      podPos(p);
    });
    game.balls.forEach((ball, k) => {
      const ba = A.b[k], bb = B.b[k];
      if (!ba) { if (ball.on) removeBall(ball); return; }
      const nx = bb ? ba[0] + (bb[0] - ba[0]) * f : ba[0];
      const nz = bb ? ba[1] + (bb[1] - ba[1]) * f : ba[1];
      if (!ball.on) { ball.on = true; ball.mesh.visible = true; ball.sh.visible = true; ball.trailT = 0; }
      const dx = nx - ball.x, dz = nz - ball.z;
      ball.x = nx; ball.z = nz; ball.power = ba[2] ? 1 : 0;
      ball.trailT -= rdt;
      if (ball.trailT <= 0 && dx * dx + dz * dz < 4) { ball.trailT = 0.04; dropDot(nx - dx * 0.5, nz - dz * 0.5); }
    });
  },
  // la nave propia del invitado se mueve acá mismo (respuesta inmediata) y se le avisa al anfitrión
  guestLocal(rdt, hits) {
    const me = game.players[game.me]; if (!me) return;
    me.cd -= rdt; if (me.swing > 0) me.swing -= rdt;
    const canMove = me.alive && (game.state === 'play' || game.state === 'count');
    movePod(me, canMove ? localAxis(me) * HUMAN_SPEED : 0, rdt);
    sendT -= rdt;
    if (sendT <= 0) { sendT = 1 / 60; sendInput({ s: Math.round(me.s * 100) / 100, v: Math.round(me.v * 10) / 10, h: hits }); }
  },
  guestHitFx(me) { startSwing(me); },
};

// calesita girando, flechas y arena del viento
const sandM4 = new THREE.Matrix4(), sandQ = new THREE.Quaternion(), sandV = new THREE.Vector3(), sandS = new THREE.Vector3(1, 1, 1), UP = new THREE.Vector3(0, 1, 0);
function mapVisuals(dt, clock) {
  const m = MAPS[S.map];
  if (m.strip[2]) arenaMats.strip.uniforms.uOff.value.x = (clock * m.strip[2] / m.strip[1]) % 1;     // foquitos / boyas que se mueven
  if (m.pit[0] === TX.water) arenaMats.pit.uniforms.uOff.value.set((clock * 0.05) % 1, (clock * 0.08) % 1);
  if (m.column && MG.col) {
    if (game.online !== 'guest' && S.colHitT > 0) S.colHitT -= dt;
    const C = MG.col, k = S.hp / COL_HP;
    C.g.visible = S.hp > 0;
    const nc = Math.round((1 - k) * C.cracks.length * 1.15);
    C.cracks.forEach((q, i) => { q.visible = i < nc; });
    C.top.rotation.z = k < 0.5 ? 0.14 : 0; C.top.position.y = k < 0.34 ? 2.35 : 2.6;
    C.body.scale.y = k < 0.34 ? 0.9 : 1; C.body.position.y = 1.3 * C.body.scale.y;
    C.body.material.uniforms.uColor.value.set(0xc07a5a).multiplyScalar(1 - (1 - k) * 0.4);
    const sh = S.colHitT > 0 ? Math.sin(clock * 90) * 0.07 : 0; C.g.position.set(sh, 0, -sh * 0.6);
    MG.mounds.forEach((g, i) => {
      const q = S.mounds[i];
      if (!q) { g.visible = false; MG.moundT[i] = undefined; return; }
      if (MG.moundT[i] === undefined) MG.moundT[i] = clock;
      const t = clock - MG.moundT[i], fall = Math.max(0, 1 - t / 0.45);
      g.visible = true; g.position.set(q[0], fall * fall * 4 + (t > 0.45 && t < 0.7 ? Math.sin(((t - 0.45) / 0.25) * Math.PI) * 0.25 : 0), q[1]);
    });
  }
  if (m.crab && MG.crab) {
    const c = S.crab, K = MG.crab;
    K.g.visible = c.on;
    if (c.on) {
      K.g.position.set(c.x, 0, c.z); K.g.rotation.y = c.ang + Math.PI / 2;        // camina de costado
      const w = clock * 14;
      K.legs.forEach((l) => { l.l.rotation.x = Math.sin(w + l.k * 2 + (l.sd > 0 ? 0 : Math.PI)) * 0.45; });
      K.body.position.y = Math.abs(Math.sin(w)) * 0.05;
      const up = c.hitT > 0 ? 1 : 0.5 + 0.5 * Math.sin(clock * 3);
      K.claws.forEach((q) => { q.c.rotation.x = -up * 0.8; q.jaw.rotation.x = Math.abs(Math.sin(clock * (c.hitT > 0 ? 25 : 6))) * 0.5; });
    }
  }
  if (m.carousel && MG.car) {
    MG.car.rot.rotation.y = -clock * (CAR_SPIN / CAR_R) * 0.35;
    MG.car.seal.rotation.z = Math.sin(clock * 2.2) * 0.08;                       // la foca hace equilibrio
    MG.car.ball.rotation.y = clock * 5; MG.car.ball.position.x = Math.sin(clock * 2.2) * 0.06;
  }
  if (m.wind && MG.wind) {
    const show = S.wst === 1 ? ((clock * 8) | 0) % 2 === 0 : S.wst === 2;
    MG.wind.visible = show; MG.wind.rotation.y = S.wa + Math.PI;     // las flechas apuntan para donde sopla
    if (S.wst === 2) { const k = 0.4 + 0.3 * Math.sin(clock * 20); MG.windM.uniforms.uColor.value.setRGB(1, 0.85 + k * 0.15, 0.3); }
    else MG.windM.uniforms.uColor.value.set(0xffe14a);
    const sd = MG.sand; sd.im.visible = S.wst === 2;
    if (S.wst === 2) {
      sandQ.setFromAxisAngle(UP, S.wa);
      const sx = Math.sin(S.wa), sz = Math.cos(S.wa);
      sd.ps.forEach((q, i) => {
        q.v += dt * 16 * q.sp; if (q.v > 13) { q.v = -13; q.u = Math.random() * 30 - 15; }
        sandV.set(sx * q.v + sz * q.u, q.y, sz * q.v - sx * q.u);
        sandM4.compose(sandV, sandQ, sandS); sd.im.setMatrixAt(i, sandM4);
      });
      sd.im.instanceMatrix.needsUpdate = true;
    }
  }
}

register(bolas);
export default bolas;
