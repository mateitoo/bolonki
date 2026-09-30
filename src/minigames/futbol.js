// Minijuego 5: FUTBOLONKI. Fútbol de naves, 2 contra 2 (o 2 contra 1, o 1 contra 1 en un duelo),
// en un estadio con tribunas. Las naves manejan igual que en Empujón (patinan un poco) y con el botón
// de golpe hacen una EMBESTIDA: si pegás la pelota embistiendo sale como un cañonazo.
// Gana el primer equipo que llega a N goles, o el que va ganando cuando se termina el tiempo.
// Si empatan al final: gol de oro (y los arcos se van agrandando de a poco hasta que alguien meta).
import * as THREE from 'three';
import { register, fixedMap } from './registry.js';
import { DIFFICULTIES, rnd, clamp } from '../config.js';
import { charOf } from '../chars.js';
import { game } from '../state.js';
import { scene, mat, add, scaleUV } from '../render/psx.js';
import { TX } from '../render/textures.js';
import { decorFutbol } from '../world/decor.js';
import { decorPotrero, decorHielo } from '../world/decorFutbol.js';
import { burst, P } from '../fx/particles.js';
import { input } from '../input.js';
import { FX } from '../game/fx.js';
import { resetPodVisual } from '../world/pods.js';
import { sendInput } from '../net/room.js';
import { txt, rect, COL } from '../ui/draw.js';
import { camMove } from '../game/controls.js';

/* ---------- medidas ---------- */
const HX = 12.5, HZ = 8;       // media cancha (largo y ancho)
const CR = 3.2;                // esquinas redondeadas (así la pelota no se traba)
const GW0 = 2.7, GD = 2.0;     // medio ancho del arco y profundidad
const POST = 0.2;              // radio de los palos
const PR = 0.95;               // radio de la nave para los choques
const POD_SCALE = 0.575;         // un 15% más chicas que antes
const ACC = 22, MAXV = 7.4, FRICTION = 2.2;
const DASH_V = 15, DASH_T = 0.22, DASH_CD = 1.0;
const BOUNCE = 0.85, DASH_PUSH = 3.2, DASH_MASS = 2.2;
const BR = 0.58, BMASS = 0.42;               // pelota
const BFRIC = 0.75, BMAX = 21, WALL_B = 0.78, KICK = 4.5;
const MATCH_T = 120, GOAL_PAUSE = 2.8, END_PAUSE = 2.2, FREEZE = 0.8;
const TEAM_COL = ['#35a0ff', '#ff5a4a'], TEAM_HEX = [0x35a0ff, 0xff5a4a], TEAM_NAME = ['AZUL', 'ROJO'];

const r2 = (v) => Math.round(v * 100) / 100;
const lerpAng = (a, b, f) => { let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return a + d * f; };
const demo = () => game.state === 'title' || game.state === 'menu';
const matchT = () => (game.setup && game.setup.fiesta ? 90 : MATCH_T);   // en la Fiesta los partidos son más cortos

/* ---------- mapas ----------
   La cancha mide lo mismo en todos. ESTADIO: el de siempre · POTRERO: canchita de tierra del barrio con cuatro
   charcos de barro (la pelota se frena y las naves van más lento adentro) · LAGO HELADO: pista de hielo, las naves
   patinan y la pelota corre más. */
const MUD = [[-7.2, 4.6], [7.2, -4.6], [0, 5.3], [0, -5.3]], MUD_R = 1.5;       // simétricos respecto del medio (parejo para los dos equipos)
const MAPS = [
  { name: 'ESTADIO', decor: (g) => decorFutbol(g, HX, HZ), fog: { col: 0x070a1c, near: 55, far: 130 },
    pitch: [TX.pitch, 0xffffff], lines: 0xf4f6f0, wall: TX.ads, cap: 0x2a2f3c, post: 0xf2f4f8, net: 0xdfe6ee, phys: { acc: 1, fric: 1, bfric: 1 } },
  { name: 'POTRERO', decor: (g) => decorPotrero(g, HX, HZ), fog: { col: 0x4a2a3a, near: 50, far: 125 }, extra: 'CHARCOS DE BARRO: FRENAN LA PELOTA',
    pitch: [TX.potrero, 0xffffff], lines: 0xf0e8d0, wall: TX.graffiti, cap: 0x6a5a4a, post: 0xb8bcc4, net: 0xe8e8e0, phys: { acc: 1, fric: 1, bfric: 1 }, mud: true },
  { name: 'LAGO HELADO', decor: (g) => decorHielo(g, HX, HZ), fog: { col: 0x0a1428, near: 50, far: 125 }, extra: 'HIELO: LAS NAVES PATINAN',
    pitch: [TX.icePitch, 0xa8d0f0], lines: 0xe8303a, wall: TX.boards, cap: 0x2a5aff, post: 0xe8303a, net: 0xf4f6fa, phys: { acc: 0.62, fric: 0.28, bfric: 0.35 } },
];
const inMud = (x, z) => MAPS[S.map].mud && MUD.some(([mx, mz]) => Math.hypot(x - mx, z - mz) < MUD_R);

/* ---------- estado del partido ---------- */
const S = {
  ball: { x: 0, z: 0, vx: 0, vz: 0, h: 0, vh: 0, last: -1 },
  goals: [0, 0], t: MATCH_T, golden: false, goldT: 0, gw: GW0,
  goalT: 0, goalTeam: -1, scorer: -1, ending: false, freeze: 0,
  team: [-1, -1, -1, -1], pg: [0, 0, 0, 0], touchAt: [-9, -9, -9, -9],   // equipo de cada lugar y goles de cada jugador
  map: 0,
};

/* ---------- mundo ---------- */
const W = { side: [], grp: null, ball: null, ballSh: null, goals: [], rings: [], ringM: [], lastB: null, M: {}, maps: [], mud: null };

function buildGoal(grp, side) {
  const g = new THREE.Group(); g.position.set(side * HX, 0, 0); grp.add(g);
  W.M.post = W.M.post || mat({ color: 0xf2f4f8 });
  const white = W.M.post, H = 2.3;
  // palos y travesaño
  [-1, 1].forEach((sz) => add(new THREE.CylinderGeometry(POST, POST, H, 6), white, 0, H / 2, sz * GW0, g));
  const bar = add(new THREE.CylinderGeometry(POST, POST, GW0 * 2 + POST * 2, 6), white, 0, H, 0, g); bar.rotation.x = Math.PI / 2;
  // red: una grilla de palitos finos (así se ve bien en PS1 sin transparencias)
  W.M.net = W.M.net || mat({ color: 0xdfe6ee, unlit: true });
  const netM = W.M.net, thin = 0.035;
  const D = side * GD;
  // fondo
  for (let k = 0; k <= 10; k++) { const z = -GW0 + (k / 10) * GW0 * 2; add(new THREE.BoxGeometry(thin, H * 0.8, thin), netM, D, H * 0.4, z, g); }
  for (let k = 0; k <= 4; k++) add(new THREE.BoxGeometry(thin, thin, GW0 * 2), netM, D, (k / 4) * H * 0.8, 0, g);
  // techo inclinado (del travesaño al fondo)
  const topLen = Math.hypot(GD, H * 0.2);
  for (let k = 0; k <= 10; k++) {
    const z = -GW0 + (k / 10) * GW0 * 2;
    const m = add(new THREE.BoxGeometry(topLen, thin, thin), netM, D / 2, H * 0.9, z, g); m.rotation.z = -Math.atan2(H * 0.2, GD) * side;
  }
  for (let k = 0; k <= 3; k++) add(new THREE.BoxGeometry(thin, thin, GW0 * 2), netM, (k / 3) * D, H - (k / 3) * H * 0.2, 0, g);
  // costados
  [-1, 1].forEach((sz) => {
    for (let k = 0; k <= 4; k++) { const x = (k / 4) * D; add(new THREE.BoxGeometry(thin, H - (k / 4) * H * 0.2, thin), netM, x, (H - (k / 4) * H * 0.2) / 2, sz * GW0, g); }
    for (let k = 0; k <= 4; k++) add(new THREE.BoxGeometry(GD, thin, thin), netM, D / 2, (k / 4) * H * 0.8, sz * GW0, g);
  });
  // piso del arco (un poco más oscuro) y marco de atrás
  const fl = new THREE.PlaneGeometry(GD, GW0 * 2); fl.rotateX(-Math.PI / 2);
  W.M.goalFloor = W.M.goalFloor || mat({ map: TX.pitch, color: 0x9ab0a0 });
  add(fl, W.M.goalFloor, D / 2, 0.01, 0, g);
  [-1, 1].forEach((sz) => add(new THREE.BoxGeometry(0.12, 0.12, 0.12), white, D, 0.06, sz * GW0, g));
  return g;
}

function buildWorld() {
  const grp = new THREE.Group(); grp.visible = false; scene.add(grp); W.grp = grp;
  // pasto con franjas
  const L = HX * 2 + 10, Wd = HZ * 2 + 8;
  const pitch = scaleUV(new THREE.PlaneGeometry(L, Wd, 16, 12), L / 3.2, Wd / 3.2); pitch.rotateX(-Math.PI / 2);
  W.M.pitch = mat({ map: TX.pitch });
  add(pitch, W.M.pitch, 0, 0, 0, grp);
  // líneas blancas
  const lm = mat({ color: 0xf4f6f0, unlit: true }), Y = 0.04, lw = 0.14; W.M.lines = lm;
  const line = (x, z, w, d) => { const g = new THREE.PlaneGeometry(w, d); g.rotateX(-Math.PI / 2); add(g, lm, x, Y, z, grp); };
  const arc = (x, z, r, a0, len, seg = 10) => { const g = new THREE.RingGeometry(r - lw / 2, r + lw / 2, seg, 1, a0, len); g.rotateX(-Math.PI / 2); add(g, lm, x, Y, z, grp); };
  const I = 0.5;                                     // las líneas van un poco adentro de las paredes
  const lx = HX - I, lz = HZ - I, lc = CR - I;
  line(0, -lz, (lx - lc) * 2, lw); line(0, lz, (lx - lc) * 2, lw);
  line(-lx, 0, lw, (lz - lc) * 2); line(lx, 0, lw, (lz - lc) * 2);
  [[1, 1], [-1, 1], [-1, -1], [1, -1]].forEach(([sx, sz]) => arc(sx * (lx - lc), sz * (lz - lc), lc, Math.atan2(-sz, sx) - Math.PI / 4, Math.PI / 2, 6));
  line(0, 0, lw, lz * 2);                            // mitad de cancha
  arc(0, 0, 2.6, 0, Math.PI * 2, 28);
  const dot = new THREE.CircleGeometry(0.22, 8); dot.rotateX(-Math.PI / 2); add(dot, lm, 0, Y, 0, grp);
  // áreas
  [-1, 1].forEach((s) => {
    const ax = s * (lx - 2.6);
    line(ax, 0, lw, 9); line(s * (lx - 1.3), -4.5, 2.6, lw); line(s * (lx - 1.3), 4.5, 2.6, lw);
    arc(ax, 0, 1.6, s > 0 ? Math.PI / 2 : -Math.PI / 2, Math.PI, 10);
    const pd = new THREE.CircleGeometry(0.14, 6); pd.rotateX(-Math.PI / 2); add(pd, lm, s * (lx - 3.9), Y, 0, grp);
  });
  // paredes bajas con carteles de publicidad (siguen las esquinas redondeadas; los arcos quedan abiertos)
  const adM = mat({ map: TX.ads, unlit: true }), capM = mat({ color: 0x2a2f3c }), WH = 0.8, T = 0.3; W.M.ad = [adM]; W.M.cap = capM;
  const wall = (x, z, w, d, uvw) => {
    const g = new THREE.Group(); g.position.set(x, 0, z); grp.add(g);
    add(scaleUV(new THREE.BoxGeometry(w, WH, d), uvw, 1), adM, 0, WH / 2, 0, g);
    add(new THREE.BoxGeometry(w + 0.02, 0.08, d + 0.02), capM, 0, WH + 0.04, 0, g);
    return g;
  };
  const sx0 = HX - CR;
  wall(0, -HZ - T / 2, sx0 * 2, T, 5); wall(0, HZ + T / 2, sx0 * 2, T, 5);
  // tramos de pared al costado de cada arco (se achican si los arcos se agrandan en el gol de oro)
  W.side = [];
  [-1, 1].forEach((s) => [-1, 1].forEach((sz) => W.side.push({ g: wall(s * (HX + T / 2), 0, T, 1, 1), sz })));
  [[1, 1], [-1, 1], [-1, -1], [1, -1]].forEach(([sx, sz]) => {
    const a0 = Math.atan2(sx, sz) - Math.PI / 4;      // cilindro: ángulo 0 = +z, crece hacia +x
    const cyl = scaleUV(new THREE.CylinderGeometry(CR + T / 2, CR + T / 2, WH, 6, 1, true, a0, Math.PI / 2), 1, 1);
    const cm = mat({ map: TX.ads, unlit: true, side: THREE.DoubleSide }); W.M.ad.push(cm);
    add(cyl, cm, sx * (HX - CR), WH / 2, sz * (HZ - CR), grp);
  });
  W.goals = [buildGoal(grp, -1), buildGoal(grp, 1)];
  // pelota y su sombra
  W.ball = add(new THREE.SphereGeometry(BR, 10, 8), mat({ map: TX.football }), 0, BR, 0, grp);
  const sh = new THREE.CircleGeometry(BR * 0.95, 10); sh.rotateX(-Math.PI / 2);
  W.ballSh = add(sh, mat({ color: 0x1c3a1a, unlit: true }), 0, 0.02, 0, grp);
  // aro del color del equipo debajo de cada nave
  for (let i = 0; i < 4; i++) {
    const m = mat({ color: 0xffffff, unlit: true }); W.ringM.push(m);
    const rg = new THREE.RingGeometry(1.02, 1.24, 18); rg.rotateX(-Math.PI / 2);
    W.rings.push(add(rg, m, 0, 0.03, 0, grp));
  }
  // decorado de cada mapa (se muestra el que toca)
  W.maps = MAPS.map((m) => { const g = new THREE.Group(); g.visible = false; grp.add(g); m.decor(g); return g; });
  // charcos de barro del potrero
  const mg = new THREE.Group(); grp.add(mg); W.mud = mg;
  const mm = mat({ map: TX.dirt, color: 0x8a5a38 });
  MUD.forEach(([x, z], k) => {
    const sh = new THREE.Shape();
    for (let i = 0; i <= 14; i++) { const a = (i / 14) * Math.PI * 2, r = MUD_R * (0.92 + Math.sin(a * 3 + k) * 0.08 + Math.cos(a * 5 + k * 2) * 0.05); if (i === 0) sh.moveTo(Math.cos(a) * r, Math.sin(a) * r); else sh.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
    const g = new THREE.ShapeGeometry(sh); g.rotateX(-Math.PI / 2);
    add(g, mm, x, 0.025, z, mg);
    const hl = new THREE.RingGeometry(MUD_R * 0.35, MUD_R * 0.45, 8, 1, 0.5 + k, 1.4); hl.rotateX(-Math.PI / 2);
    add(hl, mat({ color: 0xc8a882, unlit: true }), x - 0.3, 0.03, z - 0.2, mg);
  });
  applyMap(0);
}
function applyMap(i) {
  S.map = i;
  const m = MAPS[i];
  W.maps.forEach((g, k) => { g.visible = k === i; });
  W.mud.visible = !!m.mud;
  W.M.pitch.uniforms.uMap.value = m.pitch[0]; W.M.pitch.uniforms.uColor.value.set(m.pitch[1]);
  W.M.goalFloor.uniforms.uMap.value = m.pitch[0];
  W.M.lines.uniforms.uColor.value.set(m.lines);
  W.M.ad.forEach((a) => { a.uniforms.uMap.value = m.wall; });
  W.M.cap.uniforms.uColor.value.set(m.cap);
  W.M.post.uniforms.uColor.value.set(m.post); W.M.net.uniforms.uColor.value.set(m.net);
}
function pickMap() {
  if (game.online === 'guest') { applyMap(S.map); return; }
  const f = fixedMap(MAPS.length);
  applyMap(f >= 0 ? f : (Math.random() * MAPS.length) | 0);
}

/* ---------- equipos y saques ---------- */
// Los de la izquierda del marcador (lugares 0 y 2) son AZUL y atacan hacia +x; los de la derecha (1 y 3), ROJO.
// Si faltan jugadores se reparte parejo en el orden del podio: 3 jugadores = 2 contra 1, duelo = 1 contra 1.
function assignTeams() {
  const act = [0, 2, 1, 3].filter((i) => game.players[i] && !game.players[i].empty);
  const nA = Math.ceil(act.length / 2);
  S.team = [-1, -1, -1, -1];
  act.forEach((i, k) => { S.team[i] = k < nA ? 0 : 1; });
}
const members = (t) => game.players.filter((p) => !p.empty && S.team[p.i] === t);
const dirOf = (t) => (t === 0 ? 1 : -1);             // hacia dónde ataca cada equipo

function kickoff(conceded) {
  for (const t of [0, 1]) {
    const ms = members(t), d = dirOf(t);
    ms.forEach((p, k) => {
      let x = -d * 5.5, z = ms.length === 1 ? 0 : (k === 0 ? -3 : 3);
      resetPodVisual(p);
      Object.assign(p, { x, z, vx: 0, vz: 0, dashT: 0, cd: 0, wantDash: false, aiDash: false, thinkT: 0, alive: true, death: null });
      p.ang = d > 0 ? Math.PI / 2 : -Math.PI / 2;
    });
  }
  game.players.forEach((p) => { if (p.empty) { p.mesh.root.visible = false; p.mesh.sh.visible = false; } });
  Object.assign(S.ball, { x: 0, z: 0, vx: 0, vz: 0, h: 0, vh: 0, last: -1 });
  S.freeze = FREEZE; S.goalT = 0; S.goalTeam = -1; S.scorer = -1;
}

function newMatch() {
  assignTeams();
  S.goals = [0, 0]; S.pg = [0, 0, 0, 0]; S.touchAt = [-9, -9, -9, -9]; S.t = matchT(); S.golden = false; S.goldT = 0; S.gw = GW0; S.ending = false;
  game.players.forEach((p) => { p.score = 0; });
  game.elapsed = 0; game.elimOrder = [];
  game.round = { n: 1, over: false, winner: -1, t: 0 };
  kickoff(-1);
}

function syncScores() { game.players.forEach((p) => { p.score = S.team[p.i] >= 0 ? S.goals[S.team[p.i]] : 0; }); }

function finish(team) {
  // gana el equipo; en el podio va primero el que más goles metió de ese equipo
  const ms = members(team).sort((a, b) => S.pg[b.i] - S.pg[a.i] || a.i - b.i);
  game.winner = ms.length ? ms[0].i : -1;
  game.pendingEnd = true;
}

/* ---------- IA ---------- */
function aiInput(p, dt) {
  const D = DIFFICULTIES[game.difficulty] || DIFFICULTIES.intermedio;
  const b = S.ball, t = S.team[p.i], d = dirOf(t);
  p.thinkT -= dt;
  if (p.thinkT <= 0) {
    p.thinkT = rnd(D.think[0], D.think[1]);
    const lead = 0.22 * D.lead;
    const bx = clamp(b.x + b.vx * lead, -HX + 1, HX - 1), bz = clamp(b.z + b.vz * lead, -HZ + 1, HZ - 1);
    // ¿quién va a buscar la pelota? el del equipo que está más cerca (y mejor si está detrás de la pelota)
    const ms = members(t);
    let best = p, bs = 1e9;
    for (const q of ms) { const s = Math.hypot(q.x - bx, q.z - bz) + ((q.x - bx) * d > 0 ? 3 : 0); if (s < bs) { bs = s; best = q; } }
    let tx, tz; p.aiDash = false;
    if (best === p || ms.length === 1) {
      // hacia dónde patear: al arco de enfrente (a un palo o al otro, según de qué lado venga)
      const gx = d * (HX + 1), gz = clamp(bz * 0.25, -S.gw * 0.55, S.gw * 0.55);
      let kx = gx - bx, kz = gz - bz;
      // si la pelota está cerca de mi arco, primero la saco para afuera (lejos de mi arco), no hacia el otro arco
      const ox = -d * (HX + 3);
      if (Math.abs(bx - ox) < 9) { kx = bx - ox; kz = bz * 1.3; }
      const kl = Math.hypot(kx, kz) || 1; kx /= kl; kz /= kl;
      // el lugar desde donde le pego tiene que quedar adentro de la cancha (si la pelota está contra
      // la pared o en la boca del arco, giro la dirección del tiro hasta que se pueda)
      const AD = BR + PR + 0.5, lim = (x, z) => Math.abs(x) <= HX - PR - 0.1 && Math.abs(z) <= HZ - PR - 0.1;
      if (!lim(bx - kx * AD, bz - kz * AD)) {
        let found = false;
        for (let st = 1; st <= 8 && !found; st++) {
          const cands = [st, -st].map((sg) => { const a = sg * 0.2, c = Math.cos(a), sn = Math.sin(a); return [kx * c - kz * sn, kx * sn + kz * c]; })
            .sort((u, v) => v[0] * d - u[0] * d);                   // mejor si sigue yendo para el lado del rival
          for (const [ux, uz] of cands) if (lim(bx - ux * AD, bz - uz * AD)) { kx = ux; kz = uz; found = true; break; }
        }
      }
      const behind = (p.x - bx) * kx + (p.z - bz) * kz;          // negativo = estoy detrás de la pelota
      if (behind > -0.5) {
        // estoy del lado equivocado: la rodeo por el costado (sin empujarla hacia mi arco)
        const px = -kz, pz = kx, s = Math.sign((p.x - bx) * px + (p.z - bz) * pz) || 1;
        p.avoid = 3.4;
        const back = behind > 1.2 ? 0 : AD;                       // primero me abro, después me pongo detrás
        tx = bx - kx * back + px * s * 3.1; tz = bz - kz * back + pz * s * 3.1;
        // si ese costado queda afuera de la cancha, rodeo por el otro
        if (Math.abs(tz) > HZ - PR || Math.abs(tx) > HX - PR) { tx = bx - kx * back - px * s * 3.1; tz = bz - kz * back - pz * s * 3.1; }
      } else {
        const ax = bx - p.x, az = bz - p.z, al = Math.hypot(ax, az) || 1;
        const align = (ax * kx + az * kz) / al;
        if (align > 0.82) {
          p.avoid = 0;
          tx = bx + kx * 1.5; tz = bz + kz * 1.5;
          p.aiDash = al < 4.8 && align > 0.9 && Math.random() < D.swing * 2.2;
        } else { p.avoid = 2.3; tx = bx - kx * AD; tz = bz - kz * AD; }
      }
    } else {
      // el otro ataja: se para delante de su arco, en la línea entre la pelota y el arco
      const ox = -d * HX, kx = ox + d * (Math.abs(bx - ox) > 14 ? 4.2 : 2.3);
      tx = kx;
      if (b.vx * d < -2) { const tc = (kx - b.x) / b.vx; tz = b.z + b.vz * Math.max(0, tc); }    // viene al arco: la intercepta
      else tz = bz * 0.4;
      tz = clamp(tz, -S.gw - 0.6, S.gw + 0.6);
      p.avoid = 2.6;
      const db = Math.hypot(b.x - p.x, b.z - p.z);
      if (db < 3.6 && (b.x - p.x) * d > 0.3) { tx = b.x + d; tz = b.z; p.avoid = 0; p.aiDash = Math.random() < D.swing * 1.5; }   // despejar para adelante
      else if ((b.x - p.x) * d < 0 && Math.abs(b.x - ox) < 4) { tx = b.x - d * 1.6; tz = b.z + Math.sign(b.z || 1) * 0.6; }   // se le metió atrás: sacarla de costado
    }
    const e = D.err * 0.22;
    p.aiTx = clamp(tx + rnd(-e, e), -HX + PR, HX - PR); p.aiTz = clamp(tz + rnd(-e, e), -HZ + PR, HZ - PR);
  }
  let dx = (p.aiTx || 0) - p.x, dz = (p.aiTz || 0) - p.z;
  const l = Math.hypot(dx, dz);
  if (l > 0.001) { dx /= l; dz /= l; }
  // esquivar la pelota cuando no le quiero pegar (para no empujarla hacia mi arco sin querer)
  if (p.avoid) {
    const ex = p.x - b.x, ez = p.z - b.z, el = Math.hypot(ex, ez) || 1;
    if (el < p.avoid) {
      const f = (p.avoid - el) / p.avoid * 2.2;
      dx += (ex / el) * f; dz += (ez / el) * f;
      const nl = Math.hypot(dx, dz) || 1; dx /= nl; dz /= nl;
    }
  }
  const k = Math.min(1, l / 0.9) * Math.min(1, D.spd / 11.5);
  return { x: dx * k, z: dz * k, dash: p.aiDash };
}

/* ---------- física ---------- */
function drive(p, wx, wz, dash, dt) {
  const l = Math.hypot(wx, wz);
  if (l > 1) { wx /= l; wz /= l; }
  if (p.dashT > 0) p.dashT -= dt;
  if (dash && p.cd <= 0) {
    let dx = wx, dz = wz;
    if (Math.hypot(dx, dz) < 0.3) { dx = Math.sin(p.ang); dz = Math.cos(p.ang); }
    const dl = Math.hypot(dx, dz) || 1;
    p.vx = (dx / dl) * DASH_V; p.vz = (dz / dl) * DASH_V;
    p.dashT = DASH_T; p.cd = DASH_CD; p.aiDash = false; p.kicked = false;
    FX.dash(p.i, p.x, p.z);
  }
  const ph = MAPS[S.map].phys, mud = inMud(p.x, p.z);
  p.vx += wx * ACC * ph.acc * dt; p.vz += wz * ACC * ph.acc * dt;
  const fr = Math.exp(-FRICTION * ph.fric * (mud ? 3 : 1) * dt); p.vx *= fr; p.vz *= fr;
  const sp = Math.hypot(p.vx, p.vz), max = p.dashT > 0 ? DASH_V : MAXV * (mud ? 0.6 : 1);
  if (sp > max) { const ns = max + (sp - max) * Math.exp(-4 * dt); p.vx *= ns / sp; p.vz *= ns / sp; }
  p.x += p.vx * dt; p.z += p.vz * dt;
  if (sp > 0.6) p.ang = lerpAng(p.ang, Math.atan2(p.vx, p.vz), Math.min(1, dt * 10));
}

function collide(a, b) {
  const dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz), min = PR * 2;
  if (d >= min || d < 1e-4) return;
  const nx = dx / d, nz = dz / d;
  const ma = a.dashT > 0 ? DASH_MASS : 1, mb = b.dashT > 0 ? DASH_MASS : 1;
  const ov = min - d;
  a.x -= nx * ov * (mb / (ma + mb)); a.z -= nz * ov * (mb / (ma + mb));
  b.x += nx * ov * (ma / (ma + mb)); b.z += nz * ov * (ma / (ma + mb));
  const rv = (b.vx - a.vx) * nx + (b.vz - a.vz) * nz;
  if (rv >= 0) return;
  const j = (-(1 + BOUNCE) * rv) / (1 / ma + 1 / mb);
  a.vx -= (j / ma) * nx; a.vz -= (j / ma) * nz;
  b.vx += (j / mb) * nx; b.vz += (j / mb) * nz;
  const hard = a.dashT > 0 || b.dashT > 0;
  if (a.dashT > 0) { b.vx += nx * DASH_PUSH; b.vz += nz * DASH_PUSH; a.dashT = 0; }
  if (b.dashT > 0) { a.vx -= nx * DASH_PUSH; a.vz -= nz * DASH_PUSH; b.dashT = 0; }
  if (-rv > 2) FX.bump((a.x + b.x) / 2, (a.z + b.z) / 2, hard);
}

// Mantiene un círculo (radio r) adentro de la cancha: rectángulo con las esquinas redondeadas.
// Devuelve la velocidad con la que pegó contra la pared (0 si no tocó).
function walls(o, r, bounce) {
  const cx = HX - CR, cz = HZ - CR, ax = Math.abs(o.x), az = Math.abs(o.z);
  let hit = 0;
  if (ax > cx && az > cz) {
    const sx = Math.sign(o.x), sz = Math.sign(o.z), dx = ax - cx, dz = az - cz, d = Math.hypot(dx, dz), lim = CR - r;
    if (d > lim) {
      const nx = (dx / d) * sx, nz = (dz / d) * sz;
      o.x = sx * (cx + (dx / d) * lim); o.z = sz * (cz + (dz / d) * lim);
      const vn = o.vx * nx + o.vz * nz;
      if (vn > 0) { o.vx -= (1 + bounce) * vn * nx; o.vz -= (1 + bounce) * vn * nz; hit = vn; }
    }
    return hit;
  }
  if (ax > HX - r) { const s = Math.sign(o.x); o.x = s * (HX - r); if (o.vx * s > 0) { hit = Math.abs(o.vx); o.vx = -o.vx * bounce; } }
  if (az > HZ - r) { const s = Math.sign(o.z); o.z = s * (HZ - r); if (o.vz * s > 0) { hit = Math.max(hit, Math.abs(o.vz)); o.vz = -o.vz * bounce; } }
  return hit;
}

// Pelota contra paredes, palos y red
function ballWalls(b) {
  const ax = Math.abs(b.x), gw = S.gw;
  let hit = 0;
  if (ax > HX || (ax > HX - BR && Math.abs(b.z) < gw)) {
    // en la boca del arco o adentro
    if (ax > HX) {
      const s = Math.sign(b.x);
      if (Math.abs(b.z) > gw - BR) { const sz = Math.sign(b.z); b.z = sz * (gw - BR); if (b.vz * sz > 0) { hit = Math.abs(b.vz); b.vz = -b.vz * 0.4; } }
      if (ax > HX + GD - BR) { b.x = s * (HX + GD - BR); if (b.vx * s > 0) { hit = Math.max(hit, Math.abs(b.vx) * 0.5); b.vx = -b.vx * 0.25; b.vz *= 0.6; } }
    }
  } else hit = walls(b, BR, WALL_B);
  // palos
  for (const px of [-HX, HX]) for (const pz of [-gw, gw]) {
    const dx = b.x - px, dz = b.z - pz, d = Math.hypot(dx, dz), min = BR + POST;
    if (d < min && d > 1e-4) {
      const nx = dx / d, nz = dz / d;
      b.x = px + nx * min; b.z = pz + nz * min;
      const vn = b.vx * nx + b.vz * nz;
      if (vn < 0) { b.vx -= 1.75 * vn * nx; b.vz -= 1.75 * vn * nz; hit = Math.max(hit, -vn); }
    }
  }
  return hit;
}

// Nave contra pelota: la pelota pesa poco. Si la nave viene embistiendo, le da un pelotazo
// hacia donde iba la nave (mezclado con el lado donde la tocó).
function hitBall(p) {
  const b = S.ball, dx = b.x - p.x, dz = b.z - p.z, d = Math.hypot(dx, dz), min = PR + BR;
  if (d >= min || d < 1e-4) return;
  const nx = dx / d, nz = dz / d;
  const mp = p.dashT > 0 ? DASH_MASS : 1, mb = BMASS, ov = min - d;
  p.x -= nx * ov * (mb / (mp + mb)); p.z -= nz * ov * (mb / (mp + mb));
  b.x += nx * ov * (mp / (mp + mb)); b.z += nz * ov * (mp / (mp + mb));
  const rv = (b.vx - p.vx) * nx + (b.vz - p.vz) * nz;
  if (rv < 0) {
    const j = (-(1 + 0.55) * rv) / (1 / mp + 1 / mb);
    p.vx -= (j / mp) * nx; p.vz -= (j / mp) * nz;
    b.vx += (j / mb) * nx; b.vz += (j / mb) * nz;
    if (-rv > 3) FX.snd('thump');
  }
  if (p.dashT > 0 && !p.kicked) {
    p.kicked = true;
    const sp = Math.hypot(p.vx, p.vz) || 1;
    let kx = nx * 0.45 + (p.vx / sp) * 0.55, kz = nz * 0.45 + (p.vz / sp) * 0.55; const kl = Math.hypot(kx, kz) || 1; kx /= kl; kz /= kl;
    b.vx += kx * KICK; b.vz += kz * KICK; b.vh = 5.5;
    FX.shot(b.x, b.z);
  }
  S.touchAt[p.i] = game.elapsed;
  b.last = p.i;
}

function step(dt) {
  const st = game.state;
  if (st === 'count') {
    const before = Math.ceil(game.countT); game.countT -= dt; const after = Math.ceil(game.countT);
    if (after !== before) { if (after > 0) { if (after <= 3) FX.tick(); } else { FX.go(); FX.snd('whistle'); game.state = 'play'; } }
    return;
  }
  if (st !== 'play' && !demo()) return;
  game.elapsed += dt;
  const b = S.ball;

  // reloj del partido (se frena durante el festejo de un gol)
  if (S.goalT > 0) {
    S.goalT -= dt;
    if (S.goalT <= 0) {
      if (S.ending) { if (demo()) newMatch(); else if (!game.pendingEnd) finish(S.goalTeam >= 0 ? S.goalTeam : (S.goals[0] > S.goals[1] ? 0 : 1)); }
      else { kickoff(S.goalTeam >= 0 ? 1 - S.goalTeam : -1); FX.snd('whistle'); }
    }
  } else if (!S.golden) {
    S.t -= dt;
    if (S.t <= 0) {
      S.t = 0;
      if (S.goals[0] !== S.goals[1]) { S.ending = true; S.goalT = END_PAUSE; S.goalTeam = S.goals[0] > S.goals[1] ? 0 : 1; FX.snd('whistle'); FX.round(-1); }
      else { S.golden = true; S.goldT = 0; FX.snd('whistle'); FX.shrinkWarn(); }
    }
  } else {
    S.goldT += dt;
    S.gw = GW0 + Math.min(HZ - CR - GW0 - 0.2, Math.max(0, S.goldT - 8) * 0.05);   // en el gol de oro los arcos se agrandan de a poco
  }
  if (S.freeze > 0) S.freeze -= dt;

  // naves
  const act = game.players.filter((p) => !p.empty);
  for (const p of act) {
    p.cd -= dt;
    let wx = 0, wz = 0, dash = false;
    if (p.ctrl === 'local') {
      const c = input.ctl[p.pad || 'all'];
      [wx, wz] = camMove(c.x, c.y);
      dash = p.wantDash; p.wantDash = false;
    } else if (p.ctrl === 'remote') {
      const n = p.net;
      if (n) { wx = n.x || 0; wz = -(n.y || 0); dash = n.hit; n.hit = false; }
    } else if (p.ctrl === 'ai') {
      const a = aiInput(p, dt); wx = a.x; wz = a.z; dash = a.dash;
    }
    if (S.freeze > 0) { wx = 0; wz = 0; dash = false; }
    drive(p, wx, wz, dash, dt);
  }
  for (let i = 0; i < act.length; i++) for (let j = i + 1; j < act.length; j++) collide(act[i], act[j]);

  // pelota (en pasos chicos, así no atraviesa nada cuando va rapidísimo)
  const n = 3, h = dt / n;
  for (let k = 0; k < n; k++) {
    const bm = inMud(b.x, b.z);
    const fr = Math.exp(-BFRIC * MAPS[S.map].phys.bfric * (bm ? 7 : 1) * h); b.vx *= fr; b.vz *= fr;
    if (bm && k === 0 && Math.hypot(b.vx, b.vz) > 4 && Math.random() < 0.3) burst(b.x, 0.2, b.z, { mat: P.DEBRIS, n: 1, sp: 2, up: [1, 3], life: [0.2, 0.4] });
    const sp = Math.hypot(b.vx, b.vz); if (sp > BMAX) { b.vx *= BMAX / sp; b.vz *= BMAX / sp; }
    b.x += b.vx * h; b.z += b.vz * h;
    for (const p of act) hitBall(p);
    const hit = ballWalls(b);
    if (hit > 4) FX.bounce();
  }
  // salto (solo se ve: la pelota pica cuando le pegás fuerte)
  b.vh -= 24 * dt; b.h += b.vh * dt;
  if (b.h < 0) { b.h = 0; b.vh = b.vh < -3 ? -b.vh * 0.4 : 0; }

  for (const p of act) walls(p, PR, 0.5);

  // ¿gol?
  if (S.goalT <= 0 && !S.ending && Math.abs(b.x) > HX + BR * 0.9 && Math.abs(b.z) < S.gw) {
    const team = b.x > 0 ? 0 : 1;               // la pelota entró en el arco de la derecha: gol de AZUL
    S.goals[team]++;
    // el gol es de quien la tocó último; si la desvió uno del otro equipo, cuenta para el último
    // de este equipo que le pegó hace poco (un tiro desviado no es gol en contra)
    let sc = b.last >= 0 && S.team[b.last] === team ? b.last : -1;
    if (sc < 0) { let bt = game.elapsed - 2.2; game.players.forEach((q) => { if (S.team[q.i] === team && S.touchAt[q.i] > bt) { bt = S.touchAt[q.i]; sc = q.i; } }); }
    const own = sc < 0 && b.last >= 0;
    S.scorer = own ? -2 : sc;
    if (own) S.own = (S.own || 0) + 1;
    if (S.scorer >= 0) S.pg[S.scorer]++;
    S.goalTeam = team; S.goalT = GOAL_PAUSE;
    if (!demo() && (S.goals[team] >= (game.target || 3) || S.golden)) S.ending = true;
    if (demo() && S.goals[team] >= 5) S.ending = true;
    syncScores();
    FX.gol(team, b.x, b.z);
  }
}

/* ---------- el minijuego ---------- */
let sendT = 0;
const futbol = {
  id: 'futbol',
  name: 'FUTBOLONKI',
  maps: MAPS.map((m) => m.name),
  desc: 'FÚTBOL DE NAVES, 2 CONTRA 2',
  howTo: 'EMBESTIDA / PELOTAZO',
  points: { label: 'GOLES PARA GANAR', values: [3, 5, 7], key: 'goles', demo: 3 },
  fiestaPoints: 3,
  cam: { pos: new THREE.Vector3(0, 25, 19.5), look: new THREE.Vector3(0, 0, 0.9), rotate: false, orbit: true },
  fog: () => MAPS[S.map].fog,
  humanOut: false,
  markMe: true, tagY: 2.8,
  tense: () => S.golden || (S.t < 20 && !S.ending),
  thumbSteps: 160,
  thumbCam: { pos: new THREE.Vector3(0, 19, 15), look: new THREE.Vector3(0, -1, 0.5) },

  rules(K) {
    const r = [], myT = S.team[game.me];
    if (game.mode !== 'local' && myT >= 0) r.push(`JUGÁS EN EL EQUIPO ${TEAM_NAME[myT]}`);
    r.push(`¡EL PRIMERO EN METER ${game.target || 3} GOLES GANA!`, `${K} = EMBESTIDA (CONTRA LA PELOTA, PELOTAZO)`, 'SI EMPATAN AL FINAL: GOL DE ORO');
    if (MAPS[S.map].extra) r.push(`MAPA ${MAPS[S.map].name}: ${MAPS[S.map].extra}`);
    return r;
  },
  build: buildWorld,
  show(on) { if (W.grp) W.grp.visible = on; },

  reset() { pickMap(); newMatch(); sendT = 0; W.lastB = null; },
  step,

  visuals(dt) {
    const clock = game.clock, b = S.ball;
    // pelota: rueda según cuánto se movió (sirve igual en el anfitrión y en los invitados)
    if (W.lastB) {
      const mx = b.x - W.lastB[0], mz = b.z - W.lastB[1], ml = Math.hypot(mx, mz);
      if (ml > 1e-4 && ml < 3) { W.q = W.q || new THREE.Quaternion(); W.ax = W.ax || new THREE.Vector3(); W.ax.set(mz / ml, 0, -mx / ml); W.q.setFromAxisAngle(W.ax, ml / BR); W.ball.quaternion.premultiply(W.q); }
    }
    W.lastB = [b.x, b.z];
    W.ball.position.set(b.x, BR + b.h, b.z);
    W.ballSh.position.set(b.x, 0.02, b.z); W.ballSh.scale.setScalar(Math.max(0.5, 1 - b.h * 0.25));
    // arcos: se estiran en el gol de oro
    W.goals.forEach((g) => { g.scale.z = S.gw / GW0; });
    const z0 = S.gw + POST, z1 = HZ - CR;
    W.side.forEach(({ g, sz }) => { g.position.z = sz * (z0 + z1) / 2; g.scale.z = Math.max(0.01, z1 - z0); });
    for (const p of game.players) {
      const m = p.mesh, ring = W.rings[p.i], t = S.team[p.i];
      if (p.empty || t < 0) { ring.visible = false; if (p.empty) { m.root.visible = false; m.sh.visible = false; } continue; }
      m.root.visible = true;
      m.root.position.set(p.x, Math.sin(clock * 6 + p.i) * 0.05, p.z);
      m.root.scale.setScalar(POD_SCALE);
      m.root.rotation.set(0, p.ang || 0, 0);
      const e = p.dashT > 0 ? 0.9 : 0; m.hullM.uniforms.uEmissive.value.setRGB(e, e * 0.9, e * 0.6);
      m.veh.rotation.x = p.dashT > 0 ? -0.18 : 0;
      m.sh.position.set(p.x, 0.03, p.z); m.sh.rotation.y = p.ang || 0; m.sh.scale.set(1.95 * POD_SCALE, 1, 1.6 * POD_SCALE); m.sh.visible = true;
      ring.visible = true; ring.position.set(p.x, 0.035, p.z);
      W.ringM[p.i].uniforms.uColor.value.setHex(TEAM_HEX[t]);
    }
  },

  onLocalHit(p) { p.wantDash = true; },

  // debajo de cada retrato: solo el color del equipo (los goles ya están en el marcador grande)
  drawScore(p, x, y) {
    const t = S.team[p.i];
    if (p.empty || t < 0) return;
    rect(x - 12, y + 4, 24, 5, '#000');
    rect(x - 11, y + 5, 22, 3, TEAM_COL[t]);
  },
  hud(hw, st) {
    // marcador y reloj arriba al medio
    const cx = hw / 2;
    rect(cx - 50, 4, 100, 34, 'rgba(4,6,14,.72)');
    rect(cx - 50, 4, 4, 34, TEAM_COL[0]); rect(cx + 46, 4, 4, 34, TEAM_COL[1]);
    txt(String(S.goals[0]), cx - 22, 8, 16, TEAM_COL[0], 'center', '#000');
    txt('-', cx, 8, 16, COL.white, 'center', '#000');
    txt(String(S.goals[1]), cx + 22, 8, 16, TEAM_COL[1], 'center', '#000');
    const tt = Math.ceil(S.t), clockTxt = S.golden ? 'GOL DE ORO' : `${(tt / 60) | 0}:${String(tt % 60).padStart(2, '0')}`;
    const hurry = !S.golden && S.t < 20 && ((game.clock * 3) | 0) % 2;
    txt(clockTxt, cx, 27, 8, S.golden ? COL.gold : hurry ? COL.red : COL.text, 'center');

    if (st === 'count' && game.mode !== 'demo') {
      const myT = S.team[game.me];
      if (game.mode !== 'local' && myT >= 0) txt(`JUGÁS EN EL EQUIPO ${TEAM_NAME[myT]}`, cx, 156, 8, TEAM_COL[myT], 'center');
      txt(`¡EL PRIMERO EN METER ${game.target || 3} GANA!`, cx, 170, 8, '#ffb31a', 'center');
      txt('GOLPE = EMBESTIDA (PELOTAZO)', cx, 184, 8, COL.dim, 'center');
    }
    if (st !== 'play') return;
    if (S.goalT > 0 && !S.ending || (S.ending && S.goalT > 0 && S.goalTeam >= 0)) {
      const t = S.goalTeam;
      if (t >= 0) {
        rect(0, 92, hw, 44, 'rgba(4,6,14,.7)');
        const fin = S.ending && S.t <= 0 && !S.golden;
        txt(fin ? '¡FINAL!' : S.golden && S.ending ? '¡GOL DE ORO!' : '¡GOOOL!', cx, 97, 16, TEAM_COL[t], 'center', '#000');
        const sc = S.scorer;
        const who = fin ? `GANA ${TEAM_NAME[t]}` : sc >= 0 ? (sc === game.me && game.mode !== 'local' ? '¡GOL TUYO!' : `GOL DE ${game.players[sc].name || charOf(sc).name}`) : sc === -2 ? 'GOL EN CONTRA' : '';
        txt(who, cx, 119, 8, fin ? TEAM_COL[t] : sc >= 0 ? charOf(sc).col : COL.dim, 'center');
      }
    }
    if (S.golden && S.goldT < 3 && ((game.clock * 3) | 0) % 2) txt('¡EMPATE! GOL DE ORO', cx, 64, 16, COL.gold, 'center', COL.goldShadow);
    else if (S.golden && S.goldT > 8 && S.goldT < 11 && ((game.clock * 3) | 0) % 2) txt('¡LOS ARCOS SE AGRANDAN!', cx, 64, 8, COL.red, 'center');
  },

  /* ---------- online ---------- */
  snapshot() {
    const b = S.ball;
    return {
      b: [r2(b.x), r2(b.z), r2(b.h)],
      s: [S.goals[0], S.goals[1], Math.round(S.t * 10) / 10, S.golden ? 1 : 0, Math.round(S.goalT * 10) / 10, S.goalTeam, S.scorer, S.ending ? 1 : 0, r2(S.gw), Math.round(S.goldT * 10) / 10],
      tm: S.team, m: S.map,
      p: game.players.map((p) => [r2(p.x), r2(p.z), r2(p.ang || 0), p.dashT > 0 ? 1 : 0, p.score]),
    };
  },
  applySnap(A, B, f) {
    const b = S.ball;
    b.x = A.b[0] + (B.b[0] - A.b[0]) * f; b.z = A.b[1] + (B.b[1] - A.b[1]) * f; b.h = A.b[2] + (B.b[2] - A.b[2]) * f;
    const s = B.s;
    S.goals = [s[0], s[1]]; S.t = s[2]; S.golden = !!s[3]; S.goalT = s[4]; S.goalTeam = s[5]; S.scorer = s[6]; S.ending = !!s[7]; S.gw = s[8]; S.goldT = s[9];
    S.team = B.tm.slice();
    if (B.m !== undefined && B.m !== S.map) applyMap(B.m);
    game.players.forEach((p, i) => {
      const pa = A.p[i], pb = B.p[i];
      p.score = pb[4]; p.dashT = pb[3] ? 0.1 : 0;
      if (p.empty) return;
      if (Math.hypot(pb[0] - pa[0], pb[1] - pa[1]) > 4) { p.x = pb[0]; p.z = pb[1]; }   // saque del medio: sin deslizarse
      else { p.x = pa[0] + (pb[0] - pa[0]) * f; p.z = pa[1] + (pb[1] - pa[1]) * f; }
      p.ang = lerpAng(pa[2], pb[2], f);
    });
    if (Math.hypot(B.b[0] - A.b[0], B.b[1] - A.b[1]) > 4) { b.x = B.b[0]; b.z = B.b[1]; W.lastB = null; }
  },
  guestLocal(rdt, hits) {
    sendT -= rdt;
    if (sendT > 0) return;
    sendT = 1 / 30;
    const c = input.ctl.all, [wx, wz] = camMove(c.x, c.y);
    sendInput({ x: Math.round(wx * 100) / 100, y: Math.round(-wz * 100) / 100, h: hits });
  },
  guestHitFx() {},
  _S: S,                                        // para las pruebas
};

register(futbol);
export default futbol;
