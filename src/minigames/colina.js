// Minijuego 6: REY DE LA COLINA (a pie). Una isla con tres colinas distintas y el mar alrededor (el mapa está en world/isla.js).
// La corona flota sobre la cima de una de las colinas: el que está SOLO arriba de esa cima suma un punto por segundo;
// si hay dos o más, la cima se pone roja y nadie suma. Cada 20 s la corona se muda a otra colina (con aviso).
// El golpe es un EMPUJÓN corto (de atrás empuja más); si agarrás un PALO, empujás el doble de lejos y barrés
// a todos los que tengas adelante (dura 3 golpes). El que se cae al agua vuelve a la orilla a los 2 s.
// De vez en cuando viene una OLA que barre la parte baja de la isla: arriba de las colinas estás a salvo.
// Gana el primero que llega a N puntos o el que tiene más cuando se termina el tiempo (si empatan, desempate).
import * as THREE from 'three';
import { register } from './registry.js';
import { DIFFICULTIES, rnd, clamp } from '../config.js';
import { charOf } from '../chars.js';
import { game } from '../state.js';
import { scene, mat, add, scaleUV } from '../render/psx.js';
import { TX } from '../render/textures.js';
import { decorColina } from '../world/decor.js';
import { HILLS, groundAt, onIsland, rim, pushOut, freeSpot, pierTip, OBST, WATER_Y, RMAX, buildIsla } from '../world/isla.js';
import { input } from '../input.js';
import { FX } from '../game/fx.js';
import { burst, P } from '../fx/particles.js';
import { resetPodVisual, setEmissive } from '../world/pods.js';
import { drawWalker } from '../world/walker.js';
import { camMove } from '../game/controls.js';
import { sendInput } from '../net/room.js';
import { txt, rect, COL } from '../ui/draw.js';

/* ---------- medidas ---------- */
const PR = 0.5, CHAR_SCALE = 0.8;
const ACC = 55, MAXV = 5.8, FRICTION = 12, GRAV = 26, CLIMB_V = 7;
const HIT_CD = 0.42, STICK_CD = 0.55, SWING_T = 0.24;
const KB = 7.5, KB_STICK = 14, KB_BACK = 1.5, HOP = 4.2, HOP_STICK = 6, STUN = 0.32;
const RANGE = 1.25, RANGE_STICK = 2.3;
const STICK_HITS = 3, STICK_EVERY = 9;
const OUT_T = 2.0, INV_T = 1.2;
const ZONE_T = 20, ZONE_WARN = 3.5;
const MATCH_T = 120, END_PAUSE = 2.0;
const WAVE_FIRST = 28, WAVE_EVERY = [20, 28], WAVE_WARN = 2.4, WAVE_V = 10, WAVE_KB = 11;

const r2 = (v) => Math.round(v * 100) / 100;
const lerpAng = (a, b, f) => { let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return a + d * f; };
const demo = () => game.state === 'title' || game.state === 'menu';
const matchT = () => (game.setup && game.setup.fiesta ? 90 : MATCH_T);   // en la Fiesta los partidos son más cortos

/* ---------- estado ---------- */
const S = {
  hill: 0, next: -1, zoneT: ZONE_T, t: MATCH_T, over: false, overT: 0, extra: false,
  holders: [], contested: false,
  stick: { on: false, x: 0, z: 0, t: 6 },
  wave: { st: 'off', t: WAVE_FIRST, a: 0, f: 0, id: 0 },
  pts: [0, 0, 0, 0],
};

/* ---------- mundo ---------- */
const W = { grp: null, rings: [], ringM: [], crown: null, stickG: null, hand: [], water: null, waterM: null, wave: null, foam: null, lastPts: [0, 0, 0, 0] };

function buildWorld() {
  const grp = new THREE.Group(); grp.visible = false; scene.add(grp); W.grp = grp;
  // la isla (costa, colinas, puente, muelle, playa)
  const I = buildIsla(grp); W.rings = I.rings; W.ringM = I.ringM; W.foam = I.foam;
  // mar
  W.waterM = mat({ map: TX.water, color: 0xd0e8ff });
  const wg = scaleUV(new THREE.PlaneGeometry(220, 220, 22, 22), 40); wg.rotateX(-Math.PI / 2);
  W.water = add(wg, W.waterM, 0, WATER_Y, 0, grp);
  // corona que flota sobre la colina que vale
  const crown = new THREE.Group(); grp.add(crown); W.crown = crown;
  const gold = mat({ color: 0xffc83a, emissive: 0x3a2400 }), gem = mat({ color: 0xff3a5a, unlit: true });
  add(new THREE.CylinderGeometry(0.62, 0.55, 0.42, 10, 1, true), mat({ color: 0xffc83a, emissive: 0x3a2400, side: THREE.DoubleSide }), 0, 0, 0, crown);
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * Math.PI * 2;
    add(new THREE.ConeGeometry(0.15, 0.4, 4), gold, Math.sin(a) * 0.58, 0.38, Math.cos(a) * 0.58, crown);
    add(new THREE.SphereGeometry(0.08, 5, 4), gem, Math.sin(a) * 0.6, 0.05, Math.cos(a) * 0.6, crown);
  }
  // palo tirado en el piso (para agarrar)
  const wood = mat({ map: TX.wood, color: 0xd8a060 });
  const sg = new THREE.Group(); grp.add(sg); W.stickG = sg;
  const st = add(new THREE.CylinderGeometry(0.09, 0.12, 1.7, 6), wood, 0, 0.35, 0, sg); st.rotation.z = Math.PI / 2 - 0.25;
  const sr2 = new THREE.RingGeometry(0.75, 0.95, 16); sr2.rotateX(-Math.PI / 2);
  W.stickRing = add(sr2, mat({ color: 0xffe14a, unlit: true }), 0, 0.04, 0, sg);
  // palo en la mano de cada uno (se cuelga del personaje cuando lo tiene)
  for (let i = 0; i < 4; i++) {
    const h = new THREE.Group(); h.visible = false;
    const piv = new THREE.Group(); h.add(piv);
    add(new THREE.CylinderGeometry(0.09, 0.12, 1.9, 6), wood, 0, 0.8, 0, piv);
    W.hand.push({ g: h, piv });
  }
  // la ola: una pared de agua con espuma arriba
  const wv = new THREE.Group(); wv.visible = false; grp.add(wv); W.wave = wv;
  add(scaleUV(new THREE.BoxGeometry(34, 1.0, 1.6), 12, 1), mat({ map: TX.water, color: 0xb0d8ff }), 0, 0.5, 0, wv);
  add(new THREE.BoxGeometry(34, 0.22, 1.0), mat({ color: 0xf4fbff, unlit: true }), 0, 1.08, 0.25, wv);
  decorColina(grp, rim);
}

/* ---------- partido ---------- */
function spawnPos(p) {
  // en la playa, del lado contrario a la colina que vale (sin caer arriba de un escalón ni de una palmera)
  const a = Math.atan2(HILLS[S.hill].x, HILLS[S.hill].z) + Math.PI + rnd(-0.8, 0.8);
  for (let tries = 0; tries < 24; tries++) {
    const aa = a + (tries % 2 ? 1 : -1) * Math.ceil(tries / 2) * 0.3, r = rim(aa) - 2.1;
    const x = Math.sin(aa) * r, z = Math.cos(aa) * r;
    if (freeSpot(x, z, 0.7)) return [x, z, aa];
  }
  return [0, 0, 0];
}

function placeAll() {
  const act = game.players.filter((p) => !p.empty);
  game.players.forEach((p) => {
    resetPodVisual(p);
    p.death = null; p.alive = !p.empty;
    const k = act.indexOf(p);
    // arrancan en el centro de la isla, mirando para afuera, uno en cada punto cardinal
    const a = [0, Math.PI / 2, Math.PI, -Math.PI / 2][p.i];
    Object.assign(p, {
      x: Math.sin(a) * 1.6, z: Math.cos(a) * 1.6, fy: 0, vy: 0, vx: 0, vz: 0, kx: 0, kz: 0, onGround: true,
      cd: 0, swingT: 0, stunT: 0, out: 0, inv: 0, stick: 0, wantHit: false, thinkT: 0, aiHit: false, waveId: -1,
      aiStick: Math.random(), hitN: 0,
    });
    p.ang = a;
    if (p.empty) { p.mesh.root.visible = false; p.mesh.sh.visible = false; }
    void k;
  });
}

function newMatch() {
  S.hill = (Math.random() * 3) | 0; S.next = -1; S.zoneT = ZONE_T; S.t = matchT(); S.over = false; S.overT = 0; S.extra = false;
  S.holders = []; S.contested = false;
  S.stick = { on: false, x: 0, z: 0, t: 5 };
  S.wave = { st: 'off', t: WAVE_FIRST, a: 0, f: 0, id: 0 };
  S.pts = [0, 0, 0, 0];
  game.players.forEach((p) => { p.score = 0; });
  game.elapsed = 0; game.elimOrder = [];
  game.round = { n: 1, over: false, winner: -1, t: 0 };
  placeAll();
}

function leader() {
  let best = -1, bp = -1, tie = false;
  for (const p of game.players) {
    if (p.empty) continue;
    const v = Math.floor(S.pts[p.i]);
    if (v > bp) { bp = v; best = p.i; tie = false; } else if (v === bp) tie = true;
  }
  return tie ? -1 : best;
}

function win(i) {
  S.over = true; S.overT = END_PAUSE; game.round.over = true; game.round.winner = i;
  FX.round(i);
}

/* ---------- IA ---------- */
function aiInput(p, dt) {
  const D = DIFFICULTIES[game.difficulty] || DIFFICULTIES.intermedio;
  p.thinkT -= dt;
  if (p.thinkT <= 0) {
    p.thinkT = rnd(D.think[0], D.think[1]) * 1.3;
    const hc = HILLS[S.hill];
    let tx = hc.x, tz = hc.z;
    const g0 = groundAt(p.x, p.z, p.fy);
    const dHill = Math.hypot(p.x - hc.x, p.z - hc.z);
    const onTop = dHill < hc.r - 0.2 && p.fy > hc.h - 0.1;
    // se viene la ola y estoy abajo: subo a la colina más cercana
    if ((S.wave.st === 'warn' || S.wave.st === 'go') && g0 < 0.3 && D.lead > 0.6) {
      let bd = 1e9; for (const c of HILLS) { const b0 = c.tiers[0], d = Math.hypot(p.x - b0.x, p.z - b0.z) - b0.r; if (d < bd) { bd = d; tx = b0.x + (c.x - b0.x) * 0.3; tz = b0.z + (c.z - b0.z) * 0.3; } }
    } else if (S.stick.on && !p.stick && Math.hypot(S.stick.x - p.x, S.stick.z - p.z) < 5 + p.aiStick * 6 && p.aiStick < 0.35 + D.swing) {
      tx = S.stick.x; tz = S.stick.z;                                         // voy a buscar el palo
    } else {
      // la corona se está por mudar: los más vivos ya van para la próxima
      if (S.next >= 0 && S.zoneT < ZONE_WARN * (0.3 + D.lead * 0.6)) { tx = HILLS[S.next].x; tz = HILLS[S.next].z; }
      else {
        // hay otros arriba: voy a tirarlos, entrando desde el lado del centro de la cima
        let vic = null, vd = 1e9;
        for (const q of game.players) {
          if (q === p || q.empty || q.out > 0) continue;
          const dq = Math.hypot(q.x - hc.x, q.z - hc.z);
          if (dq > hc.r + 0.6 || q.fy < hc.h - 0.8) continue;
          const d = Math.hypot(q.x - p.x, q.z - p.z); if (d < vd) { vd = d; vic = q; }
        }
        if (vic && dHill < hc.tiers[0].r + 2.5) {
          const ox = vic.x - hc.x, oz = vic.z - hc.z, ol = Math.hypot(ox, oz) || 1;
          if (onTop) { tx = vic.x - (ox / ol) * 0.5; tz = vic.z - (oz / ol) * 0.5; } else { tx = vic.x; tz = vic.z; }
        } else if (onTop) { tx = hc.x + rnd(-0.5, 0.5); tz = hc.z + rnd(-0.5, 0.5); }
      }
    }
    const e = D.err * 0.12;
    tx += rnd(-e, e); tz += rnd(-e, e);
    for (let k = 0; k < 12 && !onIsland(tx, tz, 1.6); k++) { tx *= 0.9; tz *= 0.9; }      // nunca apuntar al agua
    p.aiTx = tx; p.aiTz = tz;
    // golpe: si tengo a alguien adelante, cerca y a mi altura
    p.aiHit = false;
    const range = (p.stick ? RANGE_STICK : RANGE) + PR;
    for (const q of game.players) {
      if (q === p || q.empty || q.out > 0 || q.inv > 0) continue;
      const dx = q.x - p.x, dz = q.z - p.z, d = Math.hypot(dx, dz);
      if (d > range * 0.95 || Math.abs((q.fy || 0) - (p.fy || 0)) > 0.9) continue;
      const f = (dx * Math.sin(p.ang) + dz * Math.cos(p.ang)) / (d || 1);
      if (f > (p.stick ? 0.1 : 0.55) && Math.random() < D.swing * 2.6) p.aiHit = true;
    }
  }
  let dx = (p.aiTx || 0) - p.x, dz = (p.aiTz || 0) - p.z;
  const l = Math.hypot(dx, dz);
  if (l > 0.001) { dx /= l; dz /= l; }
  // esquivar palmeras, rocas y demás (se abre hacia el costado)
  for (const o of OBST) {
    if (o.y0 !== undefined && (p.fy || 0) < o.y0) continue;
    const ex = p.x - o.x, ez = p.z - o.z, el = Math.hypot(ex, ez) || 1, R = o.r + PR + 0.7;
    if (el > R || (ex * dx + ez * dz) > 0) continue;                    // solo si lo tengo adelante
    const tx0 = -dz, tz0 = dx, side = Math.sign(tx0 * ex + tz0 * ez) || 1, f = ((R - el) / R) * 1.6;
    const ndx = dx + tx0 * side * f + (ex / el) * f * 0.5, ndz = dz + tz0 * side * f + (ez / el) * f * 0.5;
    dx = ndx; dz = ndz;
    const nl = Math.hypot(dx, dz) || 1; dx /= nl; dz /= nl;
  }
  const k = Math.min(1, l / 0.5) * Math.min(1, D.spd / 11);
  const hit = p.aiHit; p.aiHit = false;
  return { x: dx * k, z: dz * k, hit };
}

/* ---------- física ---------- */
function move(p, wx, wz, dt) {
  if (p.stunT > 0) { p.stunT -= dt; wx = 0; wz = 0; }
  const l = Math.hypot(wx, wz);
  if (l > 1) { wx /= l; wz /= l; }
  const grip = p.onGround ? 1 : 0.35;
  const kk = Math.min(1, (ACC * grip * dt) / MAXV);
  p.vx += (wx * MAXV - p.vx) * kk; p.vz += (wz * MAXV - p.vz) * kk;
  if (l < 0.1 && p.onGround) { const fr = Math.exp(-FRICTION * dt); p.vx *= fr; p.vz *= fr; }
  if (Math.hypot(p.vx, p.vz) > 0.5 && p.stunT <= 0) p.ang = lerpAng(p.ang, Math.atan2(p.vx, p.vz), Math.min(1, dt * 14));
  // empujón recibido: se va frenando (poco en el aire)
  const kf = Math.exp(-(p.onGround ? 3.2 : 0.6) * dt); p.kx *= kf; p.kz *= kf;
  // subir un escalón cuesta: mientras trepa camina más lento
  const climbing = p.fy < groundAt(p.x, p.z, p.fy) - 0.05;
  const sl = climbing ? 0.45 : 1;
  const nx = p.x + (p.vx * sl + p.kx) * dt, nz = p.z + (p.vz * sl + p.kz) * dt;
  p.x = nx; p.z = nz;
  pushOut(p, PR);                            // palmeras, rocas, bote, barriles, columnas
  // vertical
  const g = groundAt(p.x, p.z, p.fy);
  if (g === -99) {                           // afuera de la isla: se cae al agua
    p.vy -= GRAV * dt; p.fy += p.vy * dt; p.onGround = false;
    return;
  }
  if (p.fy < g - 0.01) {
    if (g - p.fy > 0.9 && p.onGround) {      // escalón demasiado alto (no pasa con estas colinas, pero por las dudas)
      p.x -= (p.vx * sl + p.kx) * dt; p.z -= (p.vz * sl + p.kz) * dt;
    } else { p.fy = Math.min(g, p.fy + CLIMB_V * dt); p.vy = 0; p.onGround = true; }
  } else if (p.fy > g + 0.01 || p.vy > 0) {
    p.vy -= GRAV * dt; p.fy += p.vy * dt; p.onGround = false;
    if (p.fy <= g) { p.fy = g; p.vy = 0; p.onGround = true; }
  } else { p.fy = g; p.vy = 0; p.onGround = true; }
}

function separate(a, b) {
  if (Math.abs((a.fy || 0) - (b.fy || 0)) > 1.2) return;
  const dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz), min = PR * 2;
  if (d >= min || d < 1e-4) return;
  const nx = dx / d, nz = dz / d, ov = (min - d) / 2;
  a.x -= nx * ov; a.z -= nz * ov; b.x += nx * ov; b.z += nz * ov;
}

function doHit(p) {
  const stick = p.stick > 0;
  p.cd = stick ? STICK_CD : HIT_CD; p.swingT = SWING_T; p.hitN = (p.hitN || 0) + 1;
  FX.snd('swing');
  const fx = Math.sin(p.ang), fz = Math.cos(p.ang);
  const range = (stick ? RANGE_STICK : RANGE) + PR, arc = stick ? -0.15 : 0.35;
  const cands = [];
  for (const q of game.players) {
    if (q === p || q.empty || q.out > 0 || q.inv > 0) continue;
    const dx = q.x - p.x, dz = q.z - p.z, d = Math.hypot(dx, dz);
    if (d > range || Math.abs((q.fy || 0) - (p.fy || 0)) > 1.0) continue;
    if (d > 0.5 && (dx * fx + dz * fz) / d < arc) continue;
    cands.push({ q, d, dx, dz });
  }
  if (!cands.length) return;
  cands.sort((a, b) => a.d - b.d);
  const hits = stick ? cands : [cands[0]];            // con el palo barre a todos los de adelante
  for (const { q, d, dx, dz } of hits) {
    let ux = d > 1e-3 ? dx / d : fx, uz = d > 1e-3 ? dz / d : fz;
    ux = ux * 0.55 + fx * 0.45; uz = uz * 0.55 + fz * 0.45; const ul = Math.hypot(ux, uz) || 1; ux /= ul; uz /= ul;
    const back = Math.sin(q.ang) * ux + Math.cos(q.ang) * uz > 0.45;   // lo agarraste de espaldas
    const k = (stick ? KB_STICK : KB) * (back ? KB_BACK : 1);
    q.kx = ux * k; q.kz = uz * k; q.vx *= 0.2; q.vz *= 0.2;
    q.vy = stick ? HOP_STICK : HOP; q.onGround = false; q.stunT = STUN;
    FX.bump(q.x, q.z, stick || back);
    FX.sparkle(q.x, (q.fy || 0) + 1.3, q.z, P.YELLOW, back || stick ? 6 : 3);
  }
  if (stick) { p.stick--; if (p.stick <= 0) FX.crate(p.x, p.z); }   // el palo se rompe al tercer golpe
}

function step(dt) {
  const st = game.state;
  if (st === 'count') {
    const before = Math.ceil(game.countT); game.countT -= dt; const after = Math.ceil(game.countT);
    if (after !== before) { if (after > 0) { if (after <= 3) FX.tick(); } else { FX.go(); game.state = 'play'; } }
    return;
  }
  if (st !== 'play' && !demo()) return;
  game.elapsed += dt;

  if (S.over) {
    S.overT -= dt;
    if (S.overT <= 0) { if (demo()) newMatch(); else if (!game.pendingEnd) { game.winner = game.round.winner; game.pendingEnd = true; } }
  }

  // reloj y mudanza de la corona
  if (!S.over) {
    if (!S.extra) {
      S.t -= dt;
      if (S.t <= 0) { S.t = 0; const l = leader(); if (l >= 0) win(l); else { S.extra = true; FX.shrinkWarn(); } }
    } else { const l = leader(); if (l >= 0) win(l); }
    S.zoneT -= dt;
    if (S.zoneT < ZONE_WARN && S.next < 0) {
      const opts = [0, 1, 2].filter((k) => k !== S.hill); S.next = opts[(Math.random() * 2) | 0];
      FX.alert();
    }
    if (S.zoneT <= 0) { S.hill = S.next >= 0 ? S.next : S.hill; S.next = -1; S.zoneT = ZONE_T; FX.snd('powerup'); }
  }

  // palo
  const sk = S.stick;
  if (!sk.on && !game.players.some((p) => p.stick > 0)) {
    sk.t -= dt;
    if (sk.t <= 0) {
      for (let tries = 0; tries < 20; tries++) {
        // a veces aparece en la punta del muelle (tentador, pero cerca del agua)
        const a = rnd(0, Math.PI * 2), r = rnd(2, 10);
        let x = Math.sin(a) * r, z = Math.cos(a) * r;
        if (tries === 0 && Math.random() < 0.25) [x, z] = pierTip();
        else if (!freeSpot(x, z)) continue;
        { sk.on = true; sk.x = x; sk.z = z; FX.sparkle(x, 0.6, z, P.YELLOW, 6); break; }
      }
      sk.t = STICK_EVERY;
    }
  }

  // ola
  const wv = S.wave;
  if (!S.over) {
    wv.t -= dt;
    if (wv.st === 'off' && wv.t <= 0) { wv.st = 'warn'; wv.t = WAVE_WARN; wv.a = rnd(0, Math.PI * 2); wv.f = -RMAX - 3; wv.id++; FX.shrinkWarn(); }
    else if (wv.st === 'warn' && wv.t <= 0) { wv.st = 'go'; FX.snd('splash'); }
    else if (wv.st === 'go') {
      wv.f += WAVE_V * dt;
      if (wv.f > RMAX + 3) { wv.st = 'off'; wv.t = rnd(WAVE_EVERY[0], WAVE_EVERY[1]); }
    }
  }

  // jugadores
  const act = game.players.filter((p) => !p.empty);
  for (const p of act) {
    p.cd -= dt; if (p.swingT > 0) p.swingT -= dt; if (p.inv > 0) p.inv -= dt;
    let wx = 0, wz = 0, hit = false;
    if (p.ctrl === 'local') {
      const c = input.ctl[p.pad || 'all'];
      [wx, wz] = camMove(c.x, c.y);
      hit = p.wantHit; p.wantHit = false;
    } else if (p.ctrl === 'remote') {
      const n = p.net;
      if (n) { wx = n.x || 0; wz = -(n.y || 0); hit = n.hit; n.hit = false; }
    } else if (p.ctrl === 'ai') {
      const a = aiInput(p, dt); wx = a.x; wz = a.z; hit = a.hit;
    }
    if (p.out > 0) {
      // en el agua: sigue cayendo y después vuelve a la orilla
      p.out -= dt;
      if (p.fy > WATER_Y - 2) { p.vy -= GRAV * dt; p.fy += p.vy * dt; p.x += p.kx * dt * 0.5; p.z += p.kz * dt * 0.5; }
      if (!p.splashed && p.fy < WATER_Y) { p.splashed = true; FX.splash(p.x, p.z); }
      if (p.out <= 0) {
        const [x, z, a] = spawnPos(p);
        Object.assign(p, { x, z, fy: 0.9, vy: 0, vx: 0, vz: 0, kx: 0, kz: 0, stunT: 0, inv: INV_T, onGround: false, splashed: false, stick: 0 });
        p.ang = a + Math.PI;
        resetPodVisual(p);
      }
      continue;
    }
    if (S.over) { wx *= 0.3; wz *= 0.3; hit = false; }
    move(p, wx, wz, dt);
    if (hit && p.cd <= 0 && p.stunT <= 0) doHit(p);
    // se cayó de la isla
    if (groundAt(p.x, p.z, p.fy) === -99 && p.fy < -0.3) {
      p.out = OUT_T; p.splashed = false; p.stunT = 0; S.falls = (S.falls || 0) + 1;
      if (p.stick > 0) p.stick = 0;
    }
    // agarró el palo
    if (sk.on && !p.stick && Math.hypot(p.x - sk.x, p.z - sk.z) < 0.95 && p.fy < 0.5) { sk.on = false; p.stick = STICK_HITS; FX.powerup(sk.x, sk.z); }
    // la ola
    if (wv.st === 'go' && p.waveId !== wv.id && p.fy < 0.4) {
      const ux = Math.sin(wv.a), uz = Math.cos(wv.a), s = p.x * ux + p.z * uz;
      if (s < wv.f + 0.5 && s > wv.f - 1.4 && groundAt(p.x, p.z, p.fy) < 0.3) {
        p.waveId = wv.id; p.kx = ux * WAVE_KB; p.kz = uz * WAVE_KB; p.vy = 4.5; p.onGround = false; p.stunT = 0.45;
        FX.snd('splash'); FX.sparkle(p.x, 0.8, p.z, P.CYAN, 6);
      }
    }
  }
  for (let i = 0; i < act.length; i++) for (let j = i + 1; j < act.length; j++) if (act[i].out <= 0 && act[j].out <= 0) separate(act[i], act[j]);

  // la cima: suma el que está solo
  const hc = HILLS[S.hill];
  S.holders = act.filter((p) => p.out <= 0 && Math.hypot(p.x - hc.x, p.z - hc.z) < hc.r - 0.1 && p.fy > hc.h - 0.15).map((p) => p.i);
  S.contested = S.holders.length > 1;
  if (!S.over && S.holders.length === 1) {
    const i = S.holders[0], before = Math.floor(S.pts[i]);
    S.pts[i] += dt;
    const after = Math.floor(S.pts[i]);
    if (after > before) { game.players[i].score = after; if (after % 5 === 0) FX.snd('coin'); }
    if (after >= (game.target || 30) && !demo()) win(i);
    if (demo() && after >= 20) win(i);
  }
}

/* ---------- el minijuego ---------- */
let sendT = 0;
const colina = {
  id: 'colina',
  name: 'REY DE LA COLINA',
  mapName: 'ISLA',
  desc: 'QUEDATE SOLO ARRIBA DE LA COLINA',
  howTo: 'EMPUJAR',
  points: { label: 'PUNTOS PARA GANAR', values: [20, 30, 45], key: 'coronas', demo: 30 },
  fiestaPoints: 20,
  cam: { pos: new THREE.Vector3(0, 26.5, 20.5), look: new THREE.Vector3(0, 0, 0.8), rotate: false, orbit: true },
  fog: { col: 0x9ad0f0, near: 55, far: 140 },
  humanOut: false,
  tense: () => S.extra || (S.t < 20 && !S.over),
  tagY: 2.5, tagFeet: true, markMe: true,
  thumbSteps: 700,
  thumbCam: { pos: new THREE.Vector3(0, 20, 16), look: new THREE.Vector3(0, 0, 0.5) },

  rules(K) { return [`¡QUEDATE SOLO EN LA CIMA! (A ${game.target || 30} PUNTOS)`, `${K} = EMPUJAR · DE ESPALDAS EMPUJA MÁS`, 'AGARRÁ EL PALO: EMPUJA EL DOBLE', 'LA CORONA SE MUDA CADA 20 S · CUIDADO CON LAS OLAS']; },
  build: buildWorld,
  show(on) {
    if (W.grp) W.grp.visible = on;
    if (!on) W.hand.forEach((h) => { h.g.visible = false; });
  },

  reset() { newMatch(); sendT = 0; },
  step,

  visuals(dt) {
    const clock = game.clock;
    W.waterM.uniforms.uOff.value.set((clock * 0.012) % 1, (clock * 0.008) % 1);
    W.foam.scale.setScalar(1 + Math.sin(clock * 1.6) * 0.02);
    // aros de las cimas: el que vale es blanco (o del color del que suma; rojo y blanco si hay pelea); el próximo titila dorado
    const blink = ((clock * 5) | 0) % 2;
    HILLS.forEach((c, k) => {
      let col = 0x6a6258;
      if (k === S.hill) col = S.contested ? (blink ? 0xff2a1a : 0xffffff) : S.holders.length === 1 ? new THREE.Color(charOf(S.holders[0]).col).getHex() : (((clock * 2) | 0) % 2 ? 0xffffff : 0xbfe4ff);
      else if (k === S.next) col = blink ? 0xffd23a : 0x6a6258;
      W.ringM[k].uniforms.uColor.value.setHex(col);
    });
    // la corona: flota y gira; cuando se muda, vuela a la próxima colina
    const a = HILLS[S.hill];
    let cx = a.x, cz = a.z, cy = a.h + 2.0 + Math.sin(clock * 2) * 0.15;
    if (S.next >= 0) {
      const b = HILLS[S.next], f = clamp(1 - S.zoneT / ZONE_WARN, 0, 1), e = f * f * (3 - 2 * f);
      if (f > 0.55) { const u = (f - 0.55) / 0.45; cx = a.x + (b.x - a.x) * u; cz = a.z + (b.z - a.z) * u; cy += (b.h - a.h) * u + Math.sin(u * Math.PI) * 2.5; }
      void e;
    }
    W.crown.position.set(cx, cy, cz); W.crown.rotation.y = clock * 1.4;
    // palo en el piso
    const sk = S.stick;
    W.stickG.visible = sk.on;
    if (sk.on) { W.stickG.position.set(sk.x, Math.max(0, groundAt(sk.x, sk.z)) + Math.sin(clock * 3) * 0.08, sk.z); W.stickG.rotation.y = clock * 0.8; W.stickRing.scale.setScalar(1 + Math.sin(clock * 6) * 0.12); }
    // la ola
    const wv = S.wave;
    W.wave.visible = wv.st !== 'off';
    if (W.wave.visible) {
      const ux = Math.sin(wv.a), uz = Math.cos(wv.a);
      const f = wv.st === 'warn' ? -RMAX - 3 : wv.f;
      const rise = wv.st === 'warn' ? clamp(1 - wv.t / WAVE_WARN, 0.05, 1) : 1;
      W.wave.position.set(ux * f, WATER_Y * (1 - rise), uz * f);
      W.wave.rotation.y = wv.a; W.wave.scale.y = rise;
      W.wave.scale.x = clamp((2 * Math.sqrt(Math.max(0, RMAX * RMAX - f * f)) + 4) / 34, 0.12, 1);   // solo lo ancho de la isla (y un poco más)
    }
    // personajes
    for (const p of game.players) {
      const h = W.hand[p.i];
      if (p.empty) { p.mesh.root.visible = false; p.mesh.sh.visible = false; h.g.visible = false; continue; }
      const gy = groundAt(p.x, p.z, p.fy);
      drawWalker(p, dt, CHAR_SCALE, gy === -99 ? WATER_Y : gy);
      const me = p.mesh;
      p.hideTag = p.out > 0;
      if (p.out > 0 && p.fy < WATER_Y - 1) { me.root.visible = false; me.sh.visible = false; }
      if (gy === -99) me.sh.visible = false;
      // golpe: se tira para adelante (y estira el brazo si tiene)
      if (p.swingT > 0) {
        const u = p.swingT / SWING_T;
        me.rider.rotation.x = 0.35 * Math.sin(u * Math.PI);
        if (me.armR) me.armR.rotation.set(-1.7 * Math.sin(u * Math.PI), 0, 0.1);
      }
      // mareado: se tambalea
      if (p.stunT > 0 && p.out <= 0) me.root.rotation.z = Math.sin(clock * 20) * 0.18;
      // recién vuelto a la orilla: titila
      me.root.visible = me.root.visible && !(p.inv > 0 && ((clock * 12) | 0) % 2);
      // el palo en la mano
      h.g.visible = p.stick > 0 && p.out <= 0 && me.root.visible;
      if (h.g.visible) {
        if (h.g.parent !== me.root) me.root.add(h.g);
        h.g.position.set(0.72, 1.25, 0.15);
        if (p.swingT > 0) { const u = 1 - p.swingT / SWING_T; h.piv.rotation.set(Math.PI / 2 - 0.1, 0, 0); h.g.rotation.set(0, 1.3 - u * 2.6, 0); }
        else { h.piv.rotation.set(-0.5, 0, -0.25); h.g.rotation.set(0, 0, 0); }
      }
      // brillo del que tiene la corona
      const holder = S.holders.length === 1 && S.holders[0] === p.i;
      setEmissive(p, holder ? 0.18 + Math.sin(clock * 8) * 0.08 : 0, holder ? 0.14 : 0, 0);
    }
  },

  onLocalHit(p) { p.wantHit = true; },

  drawScore(p, x, y) {
    if (p.empty) { txt('--', x, y, 16, '#555b6e', 'center', COL.goldShadow); return; }
    const v = Math.floor(S.pts[p.i]), tg = game.target || 30;
    txt(String(v), x, y + 1, 8, S.holders.length === 1 && S.holders[0] === p.i ? COL.gold : COL.white, 'center');
    rect(x - 12, y + 11, 24, 4, '#000');
    rect(x - 11, y + 12, Math.round(22 * clamp(S.pts[p.i] / tg, 0, 1)), 2, charOf(p.i).col);
  },
  hud(hw, st) {
    const cx = hw / 2;
    // reloj
    const tt = Math.ceil(S.t), clockTxt = S.extra ? 'DESEMPATE' : `${(tt / 60) | 0}:${String(tt % 60).padStart(2, '0')}`;
    rect(cx - 36, 4, 72, 16, 'rgba(4,6,14,.72)');
    txt(clockTxt, cx, 8, 8, S.extra ? COL.gold : !S.extra && S.t < 20 && ((game.clock * 3) | 0) % 2 ? COL.red : COL.text, 'center');
    if (st === 'count' && game.mode !== 'demo') {
      txt(`¡QUEDATE SOLO EN LA CIMA! (A ${game.target || 30} PUNTOS)`, cx, 164, 8, '#ffb31a', 'center');
      txt(input.device === 'gamepad' ? 'A = EMPUJAR · DE ESPALDAS EMPUJA MÁS' : 'ESPACIO / CLICK = EMPUJAR · DE ESPALDAS EMPUJA MÁS', cx, 178, 8, COL.dim, 'center');
      txt('AGARRÁ EL PALO: EMPUJA EL DOBLE', cx, 190, 8, COL.dim, 'center');
    }
    if (st !== 'play') return;
    if (S.over) {
      const w = game.round.winner;
      rect(0, 96, hw, 34, 'rgba(4,6,14,.7)');
      const t = w === game.me && game.mode !== 'local' ? '¡SOS EL REY!' : `¡${game.players[w].name || charOf(w).name} ES EL REY!`;
      txt(t, cx, 104, 16, charOf(w).col, 'center', COL.goldShadow);
      return;
    }
    const blink = ((game.clock * 3) | 0) % 2;
    if (S.contested) txt('¡EN DISPUTA!', cx, 26, 8, blink ? COL.red : '#ff9a8a', 'center');
    else if (S.holders.length === 1) {
      const i = S.holders[0];
      txt(i === game.me && game.mode !== 'local' ? '¡SUMANDO!' : `SUMA ${game.players[i].name || charOf(i).name}`, cx, 26, 8, charOf(i).col, 'center');
    }
    if (S.next >= 0 && blink) txt('¡LA CORONA SE MUDA!', cx, 64, 8, COL.gold, 'center');
    if (S.wave.st === 'warn' && blink) txt('¡VIENE UNA OLA! ¡SUBÍ!', cx, 76, 16, '#6ff6ff', 'center', '#002a3a');
    if (S.extra && game.elapsed % 4 < 2) txt('¡EMPATE! EL PRÓXIMO PUNTO GANA', cx, 64, 8, COL.gold, 'center');
    const me = game.players[game.me];
    if (me && !me.empty && me.out > 0 && game.mode !== 'local') txt('¡AL AGUA!', cx, 196, 16, '#6ff6ff', 'center', '#002a3a');
    if (me && !me.empty && me.stick > 0 && game.mode !== 'local') txt(`PALO: ${me.stick} ${me.stick === 1 ? 'GOLPE' : 'GOLPES'}`, cx, 212, 8, '#d8a060', 'center');
  },

  /* ---------- online (el anfitrión manda todo; el invitado solo manda para dónde va y si pegó) ---------- */
  snapshot() {
    return {
      s: [S.hill, S.next, Math.round(S.zoneT * 10) / 10, Math.round(S.t * 10) / 10, S.extra ? 1 : 0, S.over ? 1 : 0, game.round.winner, S.holders.join('')],
      k: [S.stick.on ? 1 : 0, r2(S.stick.x), r2(S.stick.z)],
      w: [S.wave.st === 'off' ? 0 : S.wave.st === 'warn' ? 1 : 2, r2(S.wave.a), r2(S.wave.f), Math.round(S.wave.t * 10) / 10],
      pt: S.pts.map((v) => Math.round(v * 10) / 10),
      p: game.players.map((p) => [r2(p.x), r2(p.z), r2(p.fy || 0), r2(p.ang || 0), p.out > 0 ? 1 : 0, p.stick || 0, p.hitN || 0, p.stunT > 0 ? 1 : 0, p.inv > 0 ? 1 : 0, r2(p.vx || 0), r2(p.vz || 0), p.onGround ? 1 : 0]),
    };
  },
  applySnap(A, B, f) {
    const s = B.s;
    S.hill = s[0]; S.next = s[1]; S.zoneT = s[2]; S.t = s[3]; S.extra = !!s[4]; S.over = !!s[5]; game.round.winner = s[6];
    S.holders = String(s[7] || '').split('').filter((c) => c !== '').map(Number); S.contested = S.holders.length > 1;
    S.stick.on = !!B.k[0]; S.stick.x = B.k[1]; S.stick.z = B.k[2];
    S.wave.st = ['off', 'warn', 'go'][B.w[0]]; S.wave.a = B.w[1]; S.wave.f = A.w[2] + (B.w[2] - A.w[2]) * f; S.wave.t = B.w[3];
    S.pts = B.pt.slice();
    game.players.forEach((p, i) => {
      const pa = A.p[i], pb = B.p[i];
      p.score = Math.floor(S.pts[i] || 0);
      if (p.empty) return;
      const wasOut = p.out > 0;
      p.out = pb[4] ? 1 : 0; p.stick = pb[5]; p.stunT = pb[7] ? 0.1 : 0; p.inv = pb[8] ? 0.1 : 0; p.vx = pb[9]; p.vz = pb[10]; p.onGround = !!pb[11];
      if ((pb[6] || 0) < (p.hitSeen || 0)) p.hitSeen = pb[6];               // empezó otro partido
      if ((pb[6] || 0) > (p.hitSeen || 0)) { p.hitSeen = pb[6]; p.swingT = SWING_T; }
      if (wasOut && !p.out) resetPodVisual(p);
      if (Math.hypot(pb[0] - pa[0], pb[1] - pa[1]) > 5) { p.x = pb[0]; p.z = pb[1]; p.fy = pb[2]; }
      else { p.x = pa[0] + (pb[0] - pa[0]) * f; p.z = pa[1] + (pb[1] - pa[1]) * f; p.fy = pa[2] + (pb[2] - pa[2]) * f; }
      p.ang = lerpAng(pa[3], pb[3], f);
    });
  },
  guestLocal(rdt, hits) {
    game.players.forEach((p) => { if (p.swingT > 0) p.swingT -= rdt; });
    sendT -= rdt;
    if (sendT > 0) return;
    sendT = 1 / 30;
    const c = input.ctl.all, [wx, wz] = camMove(c.x, c.y);
    sendInput({ x: Math.round(wx * 100) / 100, y: Math.round(-wz * 100) / 100, h: hits });
  },
  guestHitFx() {},
  _S: S,
};

register(colina);
export default colina;
