// Minijuego 4: PETARDOS (estilo Bomberman). Mapa en grilla con paredes fijas y cajones de madera al azar;
// cada uno arranca en una esquina. Con el golpe ponés un petardo: explota en cruz, rompe cajones y
// hace explotar a otros petardos que alcanza. De los cajones salen poderes:
//   +fuego (alcance, arranca en 1) · +petardo (más raro) · +velocidad · botas (saltás un obstáculo empujándolo)
//   · escudo (aguanta una explosión) · patada (empujás un petardo y sale deslizando)
//   · calavera (una maldición por 10 s que se contagia tocando a otro: controles invertidos, lento,
//     petardos sin parar, sin petardos o atontado)
// Hay varias canchas (cambian las paredes fijas y el lugar) y sale una al azar en cada ronda. Cada una tiene algo propio:
//   patio: arbustos donde esconderte · fábrica: una cinta que te arrastra (a vos, a los petardos y a los cajones
//   que va largando una máquina)
//   · desierto: arenas movedizas que te frenan · nieve: hielo, si soltás seguís resbalando
// Gana la ronda el último que queda. Al minuto empieza la muerte súbita: las paredes se cierran en espiral.
import * as THREE from 'three';
import { register } from './registry.js';
import { CHARS, DIFFICULTIES, rnd, clamp } from '../config.js';
import { game } from '../state.js';
import { scene, mat, add, scaleUV } from '../render/psx.js';
import { TX } from '../render/textures.js';
import { input } from '../input.js';
import { FX } from '../game/fx.js';
import { resetPodVisual } from '../world/pods.js';
import { drawWalker } from '../world/walker.js';
import { camMove } from '../game/controls.js';
import { sendInput } from '../net/room.js';
import { txt, rect, COL } from '../ui/draw.js';

/* ---------- medidas y reglas ---------- */
const GW = 15, GH = 13;      // celdas (con el borde de paredes): 13 x 11 adentro, como el clásico
const N = GW * GH;
const TS = 1.6;              // tamaño de cada celda
const FUSE = 2.4;            // mecha del petardo (s)
const FLAME_T = 0.55;        // cuánto dura el fuego
const CRATE_FILL = 0.72;     // qué tan lleno de cajones sale el mapa
const DROP_CHANCE = 0.4;     // cajones que esconden un poder
// poderes: 0 +petardo · 1 +fuego · 2 +velocidad · 3 botas · 4 escudo · 5 patada · 6 calavera (qué tan seguido sale cada uno)
const PU_WEIGHTS = [14, 34, 15, 12, 12, 12, 9];
const KICK_V = 8;            // celdas por segundo del petardo pateado
const CURSE_T = 10;          // cuánto dura una maldición
const CURSES = [
  { id: 'invertido', label: '¡CONTROLES INVERTIDOS!' },
  { id: 'lento', label: '¡ESTÁS LENTÍSIMO!' },
  { id: 'diarrea', label: '¡PETARDOS SIN PARAR!' },
  { id: 'sinpetardos', label: '¡NO PODÉS PONER PETARDOS!' },
  { id: 'atontado', label: '¡ATONTADO!' },
];
// Atontado: cada vez que apretás una dirección, lo más probable es que vayas para otro lado
// (se sortea al apretar y se mantiene mientras la tenés apretada)
function confuse(p, ix, iz) {
  const ax = Math.abs(ix), az = Math.abs(iz);
  if (ax < 0.3 && az < 0.3) { p.confKey = -1; return [0, 0]; }
  const key = ax >= az ? (ix > 0 ? 0 : 1) : (iz > 0 ? 2 : 3);          // índice en DIRS
  if (key !== p.confKey) {
    p.confKey = key;
    p.confTo = Math.random() < 0.25 ? key : [0, 1, 2, 3].filter((d) => d !== key)[(Math.random() * 3) | 0];
  }
  return DIRS[p.confTo];
}
const RANGE0 = 1;            // alcance inicial del fuego (en celdas)
const VAULT_PUSH = 0.12, VAULT_T = 0.42;           // botas: cuánto empujar contra el obstáculo y cuánto dura el salto
const INVUL_T = 1.3;         // después de que el escudo aguanta una explosión
const SPEED0 = 3.3, SPEED_UP = 0.45, SPEED_MAX = 5.6;   // celdas por segundo
const MAX_BOMBS = 6, MAX_RANGE = 7;
const SD_AT = 60, SD_EVERY = 0.55, SD_FALL = 0.7;       // muerte súbita: cuándo empieza, cada cuánto cae una pared y cuánto tarda en caer
const CHAR_SCALE = 0.7;
const ROUND_PAUSE = 2.4;
const EMPTY = 0, WALL = 1, CRATE = 2;
function pickPower() {
  let r = Math.random() * PU_WEIGHTS.reduce((a, b) => a + b, 0);
  for (let i = 0; i < PU_WEIGHTS.length; i++) { r -= PU_WEIGHTS[i]; if (r < 0) return i; }
  return 1;
}

// Canchas: el mapa de adentro del borde (13 x 11, el tamaño clásico, sin simetría) y cómo se ve cada una.
// X = pared fija · . piso · b arbusto · q arena movediza · ~ hielo · > < ^ v cinta transportadora
// La fábrica tiene una máquina arriba de la cinta que larga cajones cada tanto (como la cinta de las valijas).
const CANCHAS = [
  { name: 'PATIO', floor: 'turf', wall: 'brick', wallCol: 0xffffff, out: 0x557755, deco: 'arboles', extra: 'ARBUSTOS PARA ESCONDERTE',
    map: [
      '...b.........',
      '.X.X..XX.X.X.',
      '.....b...X...',
      '.XX.X.X...Xb.',
      '..b..X..b.X..',
      '.X..XX.X.....',
      '...b....XX.X.',
      'bX.X.b.X...b.',
      '.X....X..XX..',
      '...XX.b.X..X.',
      '.........b...'
    ] },
  { name: 'FÁBRICA', floor: 'tile', wall: 'block', wallCol: 0xffffff, out: 0x5a6070, deco: 'cajas', extra: 'CINTA CON CAJONES',
    machine: [6, 2],        // la máquina que larga cajones (columna y fila del mapa)
    fill: 0.6,              // menos cajones sueltos: la máquina va trayendo más
    map: [
      '.............',
      '.XX..X..XX.X.',
      '>>>>>>>>>>>>v',
      '^X...X.X..X.v',
      '^..XX.....X.v',
      '^.X...XX.X..v',
      '^X..X....X..v',
      '^..X.XX..XX.v',
      '^<<<<<<<<<<<<',
      '.X..XX.X..X..',
      '.............'
    ] },
  { name: 'DESIERTO', floor: 'sand', wall: 'brick', wallCol: 0xe0b878, out: 0xc8a060, deco: 'cactus', extra: 'ARENAS MOVEDIZAS',
    map: [
      '....q........',
      '.X.qqX..X.X..',
      '..X..XX...qq.',
      '.qq.....X.qX.',
      '.X..X.qq..X..',
      '...XX.qqX....',
      '.q.....q..XX.',
      '.qX.X.X...q..',
      '..X..qq..X.X.',
      '.X..Xqq.X....',
      '.........q...'
    ] },
  { name: 'NIEVE', floor: 'snow', wall: 'brick', wallCol: 0xdfe8ff, out: 0xdde8f4, deco: 'pinos', extra: 'HIELO QUE RESBALA',
    map: [
      '.............',
      '.X.X~~~X..X..',
      '...~~X~~~.X..',
      '.X.~~~~X..~~.',
      '..X..X.~~~~X.',
      '.X~~~.X.X~~..',
      '..~~X~~~..X..',
      '.X..~~~X.X.X.',
      '...X.~~~~~...',
      '..X.X..~~.XX.',
      '.............'
    ] },
];
const cellCh = (ci, c, r) => (c > 0 && r > 0 && c < GW - 1 && r < GH - 1 ? CANCHAS[ci].map[r - 1][c - 1] : 'X');
// qué hay en el piso de la celda: '.' nada · b arbusto · q arena movediza · ~ hielo · > < ^ v cinta
const specialAt = (ci, c, r) => { const ch = cellCh(ci, c, r); return ch === 'X' ? '.' : ch; };
const CONV = { '>': [1, 0], '<': [-1, 0], '^': [0, -1], 'v': [0, 1] };
const CONV_V = 1.7;          // celdas por segundo de las cintas
const spAt = (k) => specialAt(S.cancha, k % GW, (k / GW) | 0);
const isWall = (ci, c, r) => cellCh(ci, c, r) === 'X';

const r2 = (v) => Math.round(v * 100) / 100;
const lerpAng = (a, b, f) => { let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return a + d * f; };
const idx = (c, r) => r * GW + c;
const cxOf = (c) => (c - (GW - 1) / 2) * TS;
const czOf = (r) => (r - (GH - 1) / 2) * TS;
const colOf = (x) => clamp(Math.round(x / TS + (GW - 1) / 2), 0, GW - 1);
const rowOf = (z) => clamp(Math.round(z / TS + (GH - 1) / 2), 0, GH - 1);
const cellOf = (p) => idx(colOf(p.x), rowOf(p.z));
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
// esquinas: lugar 0 abajo a la izquierda, 2 arriba a la izquierda, 1 arriba a la derecha, 3 abajo a la derecha
const CORNERS = [[1, GH - 2], [GW - 2, 1], [1, 1], [GW - 2, GH - 2]];

/* ---------- estado ---------- */
const G = new Array(N).fill(EMPTY);   // 0 vacío · 1 pared · 2 cajón
const hidden = new Array(N).fill(-1); // poder escondido en cada cajón (-1 = nada)
let bombs = [];                       // { id, k, t, range, owner, age }
let flames = new Map();               // celda -> tiempo que le queda
let pups = [];                        // { k, type, t } (t: tiempo hasta aparecer)
const prevG = new Array(N).fill(EMPTY);  // para animar los cajones que avanzan por la cinta
const crateAnim = new Map();          // celda -> { from, t } (de qué celda viene) o { spawn, t }
let nextId = 1;
// cada cuánto cae una pared: arranca lento y se va apurando
const sdEvery = () => Math.max(0.22, SD_EVERY - Math.max(0, game.elapsed - SD_AT) * 0.011);
const MACH_EVERY = 4, MACH_MAX = 9;                     // la máquina: cada cuánto larga un cajón y cuántos puede haber en la cinta
const machineK = (ci) => { const m = CANCHAS[ci].machine; return m ? idx(m[0] + 1, m[1] + 1) : -1; };
const S = { cancha: 0, beltT: 0, machT: 2, sdIdx: 0, sdT: 0, sdFall: [] };
// orden de la espiral: desde el borde de adentro hacia el centro, en el sentido de las agujas del reloj
const SPIRAL = [];
{
  let c0 = 1, r0 = 1, c1 = GW - 2, r1 = GH - 2;
  while (c0 <= c1 && r0 <= r1) {
    for (let c = c0; c <= c1; c++) SPIRAL.push(idx(c, r0));
    for (let r = r0 + 1; r <= r1; r++) SPIRAL.push(idx(c1, r));
    if (r0 < r1) for (let c = c1 - 1; c >= c0; c--) SPIRAL.push(idx(c, r1));
    if (c0 < c1) for (let r = r1 - 1; r > r0; r--) SPIRAL.push(idx(c0, r));
    c0++; r0++; c1--; r1--;
  }
}

function makeMap(ci) {
  G.fill(EMPTY); hidden.fill(-1);
  for (let r = 0; r < GH; r++) for (let c = 0; c < GW; c++) {
    const k = idx(c, r);
    if (isWall(ci, c, r)) { G[k] = WALL; continue; }
    // las esquinas quedan libres (la celda de salida y sus dos vecinas)
    const nearCorner = CORNERS.some(([cc, rr]) => Math.abs(cc - c) + Math.abs(rr - r) <= 1);
    const sp = specialAt(ci, c, r);
    if (!nearCorner && sp !== 'b' && !CONV[sp] && Math.random() < (CANCHAS[ci].fill || CRATE_FILL)) {
      G[k] = CRATE;
      if (Math.random() < DROP_CHANCE) hidden[k] = pickPower();
    }
  }
}

/* ---------- mundo ---------- */
const W = { grp: null, canchas: [], crates: [], bombs: [], flames: [], pups: [], puMats: [], shields: [], sdWalls: [], sdFall: [], skulls: [], bushes: [] };
const DECO_AT = [[-16, -7], [16, -8], [-17, 5], [17, 6], [-9, -14], [10, -14.5], [-14, 13], [14, 13]];

function buildCancha(ci) {
  const C = CANCHAS[ci], g = new THREE.Group(); g.visible = false; W.grp.add(g);
  const fl = scaleUV(new THREE.PlaneGeometry(GW * TS, GH * TS, GW, GH), GW, GH); fl.rotateX(-Math.PI / 2);
  add(fl, mat({ map: TX[C.floor] }), 0, 0, 0, g);
  add(scaleUV(new THREE.BoxGeometry(GW * TS + 1, 1.4, GH * TS + 1), 8, 1), mat({ map: TX[C.wall], color: new THREE.Color(C.wallCol).multiplyScalar(0.7) }), 0, -0.72, 0, g);
  const out = scaleUV(new THREE.PlaneGeometry(160, 160, 10, 10), 30); out.rotateX(-Math.PI / 2);
  add(out, mat({ map: TX[C.floor], color: C.out }), 0, -1.4, 0, g);
  const wg = scaleUV(new THREE.BoxGeometry(TS, TS * 0.9, TS), 1, 1), wm = mat({ map: TX[C.wall], color: C.wallCol });
  for (let r = 0; r < GH; r++) for (let c = 0; c < GW; c++) if (isWall(ci, c, r)) add(wg, wm, cxOf(c), TS * 0.45, czOf(r), g);
  // la máquina de cajones (un arco arriba de la cinta, con cortinas de goma a la salida)
  if (C.machine) {
    const [mc, mr] = C.machine, x = cxOf(mc + 1), z = czOf(mr + 1);
    const [dc] = CONV[C.map[mr][mc]] || [1, 0];
    const mg = new THREE.Group(); mg.position.set(x, 0, z); g.add(mg);
    const bodyM = mat({ map: TX.metal, color: 0xffc02a }), hz = mat({ map: TX.hazard, unlit: true }), rubber = mat({ color: 0x15151a });
    const darkM = mat({ color: 0x2a2d36 });
    [-1, 1].forEach((sz) => add(new THREE.BoxGeometry(TS * 1.1, TS * 1.35, 0.3), bodyM, 0, TS * 0.675, sz * TS * 0.58, mg));
    add(new THREE.BoxGeometry(TS * 1.15, TS * 0.5, TS * 1.46), bodyM, 0, TS * 1.55, 0, mg);
    add(new THREE.BoxGeometry(TS * 1.17, TS * 0.14, TS * 1.48), hz, 0, TS * 1.28, 0, mg);
    add(new THREE.BoxGeometry(TS * 0.9, TS * 0.08, TS * 1.0), darkM, 0, TS * 1.81, 0, mg);            // tapa oscura
    for (let i = 0; i < 5; i++) add(new THREE.BoxGeometry(0.05, TS * 0.8, TS * 0.2), rubber, dc * TS * 0.55, TS * 0.88, (i - 2) * TS * 0.21, mg);
    W.machineLamp = add(new THREE.BoxGeometry(0.34, 0.34, 0.34), mat({ color: 0xff3a1a, unlit: true }), 0, TS * 1.98, 0, mg);
  }
  // lo propio del piso: hielo, arena movediza, cintas y arbustos
  const pg = new THREE.PlaneGeometry(TS, TS); pg.rotateX(-Math.PI / 2);
  const bushM = mat({ color: 0x3f8a3a }), bush2M = mat({ color: 0x2f7430 });
  for (let r = 1; r < GH - 1; r++) for (let c = 1; c < GW - 1; c++) {
    const sp = specialAt(ci, c, r), x = cxOf(c), z = czOf(r);
    if (sp === '~') add(pg, W.iceM, x, 0.012, z, g);
    else if (sp === 'q') add(pg, W.sandM, x, 0.012, z, g);
    else if (CONV[sp]) { const [dc, dr] = CONV[sp]; add(pg, W.beltM, x, 0.012, z, g).rotation.y = Math.atan2(-dc, -dr); }
    else if (sp === 'b') {
      const bg = new THREE.Group(); bg.position.set(x, 0, z); g.add(bg);
      [[0, 0, 0.62], [-0.35, 0.25, 0.42], [0.36, -0.2, 0.46], [0.2, 0.35, 0.38], [-0.3, -0.3, 0.4]].forEach(([dx, dz, rr], i) => {
        add(new THREE.DodecahedronGeometry(rr * TS, 0), i % 2 ? bush2M : bushM, dx * TS * 0.6, rr * TS * 0.8, dz * TS * 0.6, bg);
      });
      W.bushes.push({ g: bg, k: idx(c, r), ci, shake: 0 });
    }
  }
  // decoración de afuera, según la cancha
  if (C.deco === 'arboles' || C.deco === 'pinos') {
    const trunkM = mat({ color: 0x6b4a2a }), leafM = mat({ color: C.deco === 'pinos' ? 0x2a5a4a : 0x2f7a3a }), snowM = mat({ color: 0xf4f8ff });
    DECO_AT.forEach(([x, z]) => {
      add(new THREE.CylinderGeometry(0.3, 0.4, 1.6, 6), trunkM, x, -0.6, z, g);
      add(new THREE.ConeGeometry(1.6, 3, 7), leafM, x, 1.6, z, g);
      if (C.deco === 'pinos') add(new THREE.ConeGeometry(0.8, 1.2, 7), snowM, x, 2.8, z, g);
    });
  } else if (C.deco === 'cactus') {
    const cm = mat({ color: 0x3f8a48 });
    DECO_AT.forEach(([x, z], k) => {
      add(new THREE.CylinderGeometry(0.35, 0.4, 3, 7), cm, x, 0.1, z, g);
      add(new THREE.CylinderGeometry(0.22, 0.22, 1.1, 6), cm, x + (k % 2 ? 0.55 : -0.55), 0.6, z, g);
    });
  } else {
    const bm = mat({ map: TX.block });
    DECO_AT.forEach(([x, z], k) => { for (let h = 0; h <= k % 3; h++) add(new THREE.BoxGeometry(2, 2, 2), bm, x, -0.4 + h * 2, z, g).rotation.y = k * 0.4; });
  }
  W.canchas.push(g);
}

function buildWorld() {
  const grp = new THREE.Group(); grp.visible = false; scene.add(grp); W.grp = grp;
  W.iceM = mat({ map: TX.ice }); W.sandM = mat({ map: TX.quicksand }); W.beltM = mat({ map: TX.belt, unlit: true });
  CANCHAS.forEach((_, ci) => buildCancha(ci));
  // cajones (uno por celda posible), petardos, fuego y poderes
  const cg = new THREE.BoxGeometry(TS * 0.92, TS * 0.8, TS * 0.92), cm = mat({ map: TX.crate });
  for (let k = 0; k < N; k++) { const m = add(cg, cm, cxOf(k % GW), TS * 0.4, czOf((k / GW) | 0), grp); m.visible = false; W.crates.push(m); }
  const bodyM = mat({ color: 0x22222c }), fuseM = mat({ color: 0xc8a060 }), shineM = mat({ color: 0xffffff, unlit: true });
  for (let n = 0; n < 40; n++) {
    const g = new THREE.Group(); grp.add(g); g.visible = false;
    add(new THREE.SphereGeometry(TS * 0.34, 10, 8), bodyM, 0, TS * 0.34, 0, g);
    add(new THREE.CylinderGeometry(TS * 0.12, TS * 0.14, TS * 0.12, 8), bodyM, 0, TS * 0.7, 0, g);
    add(new THREE.CylinderGeometry(0.04, 0.04, TS * 0.2, 4), fuseM, 0.05, TS * 0.84, 0, g).rotation.z = -0.4;
    add(new THREE.BoxGeometry(0.1, 0.1, 0.05), shineM, -TS * 0.14, TS * 0.48, TS * 0.28, g);
    const spark = add(new THREE.SphereGeometry(0.11, 5, 4), mat({ color: 0xffd23a, unlit: true }), 0.1, TS * 0.96, 0, g);
    g.userData.spark = spark;
    W.bombs.push(g);
  }
  const fg = new THREE.BoxGeometry(TS * 0.94, TS * 0.5, TS * 0.94), fm = mat({ map: TX.fire, unlit: true });
  W.flameM = fm;
  for (let k = 0; k < N; k++) { const m = add(fg, fm, cxOf(k % GW), TS * 0.25, czOf((k / GW) | 0), grp); m.visible = false; W.flames.push(m); }
  W.puMats = [TX.puBomb, TX.puFire, TX.puSpeed, TX.puBoots, TX.puShield, TX.puKick, TX.puSkull].map((t) => mat({ map: t, unlit: true }));
  // muerte súbita: una pared por celda de adentro, y unas que caen
  const sg = scaleUV(new THREE.BoxGeometry(TS, TS * 0.9, TS), 1, 1), sm = mat({ map: TX.block });
  for (let k = 0; k < N; k++) { const m = add(sg, sm, cxOf(k % GW), TS * 0.45, czOf((k / GW) | 0), grp); m.visible = false; W.sdWalls.push(m); }
  for (let n = 0; n < 6; n++) { const m = add(sg, sm, 0, -10, 0, grp); m.visible = false; W.sdFall.push(m); }
  // calavera flotando arriba de la cabeza del maldito
  const boneM = mat({ color: 0xf0ece0, unlit: true }), eyeM = mat({ color: 0x5a1a7a, unlit: true });
  for (let i = 0; i < 4; i++) {
    const g = new THREE.Group(); g.visible = false; grp.add(g);
    add(new THREE.BoxGeometry(0.6, 0.5, 0.5), boneM, 0, 0, 0, g);
    add(new THREE.BoxGeometry(0.4, 0.2, 0.4), boneM, 0, -0.3, 0, g);
    [-0.14, 0.14].forEach((ex) => add(new THREE.BoxGeometry(0.14, 0.14, 0.05), eyeM, ex, 0.02, 0.26, g));
    W.skulls.push(g);
  }
  const pg = new THREE.BoxGeometry(TS * 0.55, TS * 0.55, TS * 0.55);
  for (let n = 0; n < 40; n++) { const m = add(pg, W.puMats[0], 0, 0, 0, grp); m.visible = false; W.pups.push(m); }
  // escudo: dos anillos que giran alrededor del personaje
  const ringG = new THREE.TorusGeometry(TS * 0.5, 0.05, 4, 16), ringM = mat({ color: 0x6ff6ff, unlit: true });
  for (let i = 0; i < 4; i++) {
    const s = new THREE.Group(); s.visible = false; grp.add(s);
    add(ringG, ringM, 0, 0, 0, s).rotation.x = Math.PI / 2;
    add(ringG, ringM, 0, 0, 0, s).rotation.y = Math.PI / 2;
    W.shields.push(s);
  }
}

/* ---------- rondas ---------- */
const demo = () => game.state === 'title' || game.state === 'menu';

function placeAll() {
  // otra cancha al azar (distinta de la anterior)
  if (game.online !== 'guest') { let c = (Math.random() * CANCHAS.length) | 0; if (c === S.cancha) c = (c + 1) % CANCHAS.length; S.cancha = c; }
  makeMap(S.cancha);
  bombs = []; flames = new Map(); pups = []; S.beltT = 1 / CONV_V; S.machT = 1.5; prevG.fill(EMPTY); crateAnim.clear(); S.sdIdx = 0; S.sdT = 0; S.sdFall = []; S.sdWarned = false; S.hasBelt = machineK(S.cancha) >= 0;
  game.players.forEach((p) => {
    resetPodVisual(p);
    p.death = null;
    p.alive = !p.empty;
    const [c, r] = CORNERS[p.i];
    Object.assign(p, { x: cxOf(c), z: czOf(r), fy: 0, vx: 0, vz: 0, onGround: true, walk: 0, cd: 0,
      maxBombs: 1, range: RANGE0, speed: SPEED0, boots: false, shield: false, kick: false, curse: null, curseCD: 0, invul: 0, jump: null, pushT: 0,
      pass: [], wantBomb: false, thinkT: 0, path: [], aiGoal: -1 });
    p.ang = r > GH / 2 ? Math.PI : 0;
    if (p.empty) { p.mesh.root.visible = false; p.mesh.sh.visible = false; }
  });
  game.elapsed = 0;
}

function startRound() {
  game.round = { n: game.round.n + 1, over: false, winner: -1, t: 0 };
  game.timeScale = 1;
  game.elimOrder = [];
  placeAll();
  if (!demo()) { game.state = 'count'; game.countT = 3.999; FX.tick(); }
}

/* ---------- petardos ---------- */
const bombAt = (k) => bombs.find((b) => b.k === k);
const solidFor = (p, k) => G[k] !== EMPTY || (bombAt(k) && !p.pass.includes(bombAt(k).id));
const activeBombs = (p) => bombs.filter((b) => b.owner === p.i).length;

function placeBomb(p, force) {
  const k = cellOf(p);
  if (bombAt(k) || G[k] !== EMPTY) return;
  if (!force && activeBombs(p) >= p.maxBombs) return;
  const b = { id: nextId++, k, t: FUSE, range: p.range || RANGE0, owner: p.i, age: 0, bx: cxOf(k % GW), bz: czOf((k / GW) | 0), mv: null };
  bombs.push(b);
  // los que están parados arriba pueden salir caminando
  for (const q of game.players) if (q.alive && cellOf(q) === k) q.pass.push(b.id);
  FX.place();
}

// Cajones arriba de la cinta: avanzan una celda cada tanto si adelante hay lugar (los de adelante primero)
function beltCrates(dt) {
  const mk = machineK(S.cancha);
  if (mk < 0) return;
  const busyCell = (k) => G[k] !== EMPTY || bombAt(k) || flames.has(k) || game.players.some((q) => q.alive && !q.empty && cellOf(q) === k);
  S.beltT -= dt;
  if (S.beltT <= 0) {
    S.beltT += 1 / CONV_V;
    const moved = new Set();
    for (let pass = 0, any = true; pass < 40 && any; pass++) {
      any = false;
      for (let k = 0; k < N; k++) {
        if (G[k] !== CRATE || moved.has(k)) continue;
        const cv = CONV[spAt(k)]; if (!cv) continue;
        const nk = idx((k % GW) + cv[0], ((k / GW) | 0) + cv[1]);
        if (busyCell(nk)) continue;
        G[nk] = CRATE; hidden[nk] = hidden[k]; G[k] = EMPTY; hidden[k] = -1;
        moved.add(nk); any = true;
      }
    }
  }
  // la máquina larga un cajón (si hay lugar y no hay demasiados dando vueltas)
  S.machT -= dt;
  if (S.machT <= 0) {
    let onBelt = 0; for (let k = 0; k < N; k++) if (G[k] === CRATE && CONV[spAt(k)]) onBelt++;
    if (onBelt < MACH_MAX && !busyCell(mk)) {
      G[mk] = CRATE; hidden[mk] = Math.random() < DROP_CHANCE ? pickPower() : -1;
      FX.machine(cxOf(mk % GW), czOf((mk / GW) | 0));
      S.machT = MACH_EVERY;
    } else S.machT = 0.5;
  }
}

// Petardos pateados: se deslizan celda por celda hasta que algo los frena (pared, cajón, petardo o alguien)
function slideBombs(dt) {
  for (const b of bombs) {
    if (!b.mv) {
      const cv = CONV[spAt(b.k)];                 // arriba de una cinta: la cinta lo lleva
      if (!cv) continue;
      b.mv = { dc: cv[0], dr: cv[1], conv: true };
    }
    const c = b.k % GW, r = (b.k / GW) | 0, cx0 = cxOf(c), cz0 = czOf(r);
    let along = (b.bx - cx0) * b.mv.dc + (b.bz - cz0) * b.mv.dr;
    if (b.mv.conv && along >= -1e-3) {
      // en el centro de la celda: la cinta decide para dónde sigue (o se frena si no hay cinta)
      const cv = CONV[spAt(b.k)];
      if (!cv) { b.bx = cx0; b.bz = cz0; b.mv = null; continue; }
      if (cv[0] !== b.mv.dc || cv[1] !== b.mv.dr) { b.bx = cx0; b.bz = cz0; b.mv.dc = cv[0]; b.mv.dr = cv[1]; along = 0; }
    }
    const nc = c + b.mv.dc, nr = r + b.mv.dr, nk = idx(nc, nr);
    const blocked = !interior(nc, nr) || G[nk] !== EMPTY || bombs.some((o) => o !== b && o.k === nk)
      || game.players.some((q) => q.alive && !q.empty && cellOf(q) === nk);
    let step = (b.mv.conv ? CONV_V : KICK_V) * TS * dt;
    if (blocked) {
      if (along >= -1e-3) { b.bx = cx0; b.bz = cz0; b.mv = null; continue; }
      step = Math.min(step, -along);
    }
    b.bx += b.mv.dc * step; b.bz += b.mv.dr * step;
    b.k = idx(colOf(b.bx), rowOf(b.bz));
    for (const q of game.players) q.pass = q.pass.filter((id) => id !== b.id);
  }
}

// celdas que alcanza la explosión de un petardo en k con alcance range (sin romper nada)
function blastCells(k, range, grid) {
  const out = [k], c0 = k % GW, r0 = (k / GW) | 0;
  for (const [dc, dr] of DIRS) {
    for (let s = 1; s <= range; s++) {
      const c = c0 + dc * s, r = r0 + dr * s;
      if (c < 0 || r < 0 || c >= GW || r >= GH) break;
      const kk = idx(c, r), g = grid[kk];
      if (g === WALL) break;
      out.push(kk);
      if (g === CRATE) break;
    }
  }
  return out;
}

function explode(b) {
  bombs = bombs.filter((q) => q !== b);
  FX.boom(cxOf(b.k % GW), czOf((b.k / GW) | 0));
  const c0 = b.k % GW, r0 = (b.k / GW) | 0;
  const burn = (kk) => { flames.set(kk, FLAME_T); };
  burn(b.k);
  for (const [dc, dr] of DIRS) {
    for (let s = 1; s <= b.range; s++) {
      const c = c0 + dc * s, r = r0 + dr * s;
      if (c < 0 || r < 0 || c >= GW || r >= GH) break;
      const kk = idx(c, r);
      if (G[kk] === WALL) break;
      burn(kk);
      if (G[kk] === CRATE) {
        G[kk] = EMPTY; FX.crate(cxOf(c), czOf(r));
        if (hidden[kk] >= 0) { pups.push({ k: kk, type: hidden[kk], t: FLAME_T }); hidden[kk] = -1; }
        break;
      }
      const other = bombAt(kk);
      if (other) other.t = Math.min(other.t, 0.06);          // reacción en cadena
      const pu = pups.find((u) => u.k === kk && u.t <= 0);
      if (pu) { pups = pups.filter((u) => u !== pu); break; }  // el fuego quema el poder
    }
  }
}

/* ---------- movimiento por pasillos ---------- */
// Se camina por el centro de los pasillos: al doblar, el personaje se alinea solo (y si está
// medio metido en la esquina, se desliza hacia el pasillo libre).
function stepAxis(p, ax, s, dist) {
  const c = colOf(p.x), r = rowOf(p.z);
  const oth = ax === 'x' ? 'z' : 'x';
  const laneC = ax === 'x' ? czOf(r) : cxOf(c);
  const off = p[oth] - laneC;
  const ac = ax === 'x' ? c + s : c, ar = ax === 'z' ? r + s : r;
  const ahead = ac < 0 || ar < 0 || ac >= GW || ar >= GH || solidFor(p, idx(ac, ar));
  const curC = ax === 'x' ? cxOf(c) : czOf(r);
  const along = (p[ax] - curC) * s;
  if (ahead && along >= -1e-3) {
    // bloqueado adelante: si está corrido hacia un costado y por ese lado hay paso, se desliza
    if (Math.abs(off) > TS * 0.12) {
      const l2 = Math.sign(off);
      const sc = ax === 'x' ? c : c + l2, sr = ax === 'x' ? r + l2 : r;
      const nc = ax === 'x' ? c + s : c + l2, nr = ax === 'x' ? r + l2 : r + s;
      const inGrid = (a, b) => a >= 0 && b >= 0 && a < GW && b < GH;
      if (inGrid(sc, sr) && inGrid(nc, nr) && !solidFor(p, idx(sc, sr)) && !solidFor(p, idx(nc, nr))) {
        p[oth] += l2 * Math.min(dist, TS - Math.abs(off));
        return true;
      }
    }
    p[ax] = curC;
    return false;
  }
  let rem = dist;
  if (Math.abs(off) > 1e-3) { const d = Math.min(Math.abs(off), rem); p[oth] -= Math.sign(off) * d; rem -= d; }
  let nv = p[ax] + s * rem;
  if (ahead && (nv - curC) * s > 0) nv = curC;
  p[ax] = nv;
  return true;
}

// Botas: empujando un ratito contra una pared, un cajón o un petardo, lo saltás (si del otro lado hay lugar)
const interior = (c, r) => c > 0 && r > 0 && c < GW - 1 && r < GH - 1;
function tryVault(p, ax, s) {
  const c = colOf(p.x), r = rowOf(p.z);
  const oc = ax === 'x' ? c + s : c, or = ax === 'z' ? r + s : r;
  const lc = ax === 'x' ? c + 2 * s : c, lr = ax === 'z' ? r + 2 * s : r;
  if (!interior(oc, or) || !interior(lc, lr)) return false;
  const o = idx(oc, or), l = idx(lc, lr);
  if (!(G[o] !== EMPTY || bombAt(o)) || G[l] !== EMPTY || bombAt(l)) return false;
  p.jump = { fx: p.x, fz: p.z, tx: cxOf(lc), tz: czOf(lr), t: 0 };
  FX.jump(p.i);
  return true;
}

function move(p, ix, iz, dt) {
  const ox = p.x, oz = p.z;
  if (p.jump) {
    // en el aire: vuela hasta la celda de destino
    const j = p.jump; j.t += dt / VAULT_T; const u = Math.min(1, j.t);
    p.x = j.fx + (j.tx - j.fx) * u; p.z = j.fz + (j.tz - j.fz) * u;
    p.fy = Math.sin(Math.PI * u) * TS * 1.3; p.onGround = false;
    if (u >= 1) { p.jump = null; p.fy = 0; p.onGround = true; }
    p.vx = (p.x - ox) / Math.max(dt, 1e-4); p.vz = (p.z - oz) / Math.max(dt, 1e-4);
    p.pass = [];
    return;
  }
  const sp0 = spAt(cellOf(p));
  const dist = p.speed * (sp0 === 'q' ? 0.5 : 1) * TS * dt;       // arena movediza: la mitad de rápido
  const ax = Math.abs(ix), az = Math.abs(iz);
  if (ax > 0.3 || az > 0.3) {
    const primX = ax >= az;
    const moved = primX ? stepAxis(p, 'x', Math.sign(ix), dist) : stepAxis(p, 'z', Math.sign(iz), dist);
    p.slide = moved ? { ax: primX ? 'x' : 'z', s: Math.sign(primX ? ix : iz) } : null;
    if (!moved) {
      // patada: si lo que te frena es un petardo, sale deslizando
      const sgn = Math.sign(primX ? ix : iz), c = colOf(p.x), r = rowOf(p.z);
      const kb = p.kick && bombAt(idx(primX ? c + sgn : c, primX ? r : r + sgn));
      if (kb && !kb.mv) { kb.mv = { dc: primX ? sgn : 0, dr: primX ? 0 : sgn }; FX.kick(kb.bx, kb.bz); p.pushT = 0; }
      else if (p.boots) { p.pushT += dt; if (p.pushT > VAULT_PUSH && tryVault(p, primX ? 'x' : 'z', sgn)) p.pushT = 0; }
      if (primX && az > 0.3) stepAxis(p, 'z', Math.sign(iz), dist);
      else if (!primX && ax > 0.3) stepAxis(p, 'x', Math.sign(ix), dist);
    } else p.pushT = 0;
  } else {
    p.pushT = 0;
    // hielo: si soltás, seguís resbalando para el mismo lado hasta chocar o salir del hielo
    if (sp0 === '~' && p.slide) { if (!stepAxis(p, p.slide.ax, p.slide.s, dist * 1.1)) p.slide = null; }
    else p.slide = null;
  }
  // cintas: te arrastran para su lado
  const cv = CONV[spAt(cellOf(p))];
  if (cv) { if (cv[0]) stepAxis(p, 'x', cv[0], CONV_V * TS * dt); else stepAxis(p, 'z', cv[1], CONV_V * TS * dt); }
  p.vx = (p.x - ox) / Math.max(dt, 1e-4); p.vz = (p.z - oz) / Math.max(dt, 1e-4);
  if (Math.hypot(p.vx, p.vz) > 0.3) p.ang = lerpAng(p.ang, Math.atan2(p.vx, p.vz), Math.min(1, dt * 16));
  // los petardos que dejó atrás pasan a ser sólidos para él
  const k = cellOf(p);
  if (p.pass.length) p.pass = p.pass.filter((id) => { const b = bombs.find((q) => q.id === id); return b && b.k === k; });
}

/* ---------- IA ---------- */
// Mapa de peligro: en cuántos segundos le llega fuego a cada celda (teniendo en cuenta las cadenas).
// dónde va a explotar un petardo que se mueve (pateado o arriba de una cinta)
function predictK(b) { const t = predictTraj(b.k, b.t, b.mv); return t[t.length - 1]; }
// todas las celdas por las que va a pasar un petardo que se mueve (pateado o arriba de una cinta)
function predictTraj(k0, t, mv) {
  const out = [k0];
  if (!mv && !CONV[spAt(k0)]) return out;
  let k = k0, dc = mv ? mv.dc : 0, dr = mv ? mv.dr : 0;
  const conv = !mv || mv.conv, n = Math.floor(t * (conv ? CONV_V : KICK_V));
  for (let i = 0; i < n; i++) {
    if (conv) { const cv = CONV[spAt(k)]; if (!cv) break; [dc, dr] = cv; }
    const c = (k % GW) + dc, r = ((k / GW) | 0) + dr;
    if (!interior(c, r)) break;
    const nk = idx(c, r);
    // una pared o un cajón quieto lo frenan; un cajón arriba de la cinta se va corriendo
    if (G[nk] !== EMPTY && !(conv && G[nk] === CRATE && CONV[spAt(nk)])) break;
    k = nk; out.push(k);
  }
  return out;
}
function dangerMap(extra, react, p) {
  // los petardos propios los ve siempre; los de los demás, un ratito después de que aparecen
  const list = bombs.filter((b) => b.age >= react || (p && b.owner === p.i)).map((b) => ({ k: predictK(b), tr: predictTraj(b.k, b.t, b.mv), t: b.t, range: b.range }));
  if (extra) list.push(Object.assign({ tr: predictTraj(extra.k, extra.t, null) }, extra));
  // los cajones de la cinta se corren: no cuentan como reparo (el fuego puede pasar cuando se van)
  const Gd = S.hasBelt ? G.map((v, k) => (v === CRATE && CONV[spAt(k)] ? EMPTY : v)) : G;
  // si se mueve, no sabemos bien dónde va a explotar: todo su recorrido es peligroso
  const cells = list.map((b) => { const set = new Set(); for (const k of b.tr) for (const kk of blastCells(k, b.range, Gd)) set.add(kk); return [...set]; });
  for (let it = 0; it < 4; it++) {
    list.forEach((b, i) => { for (const kk of cells[i]) for (const o of list) if (o !== b && o.k === kk && o.t > b.t) o.t = b.t; });
  }
  const d = new Array(N).fill(Infinity);
  list.forEach((b, i) => { for (const kk of cells[i]) d[kk] = Math.min(d[kk], b.t); });
  for (const [kk] of flames) d[kk] = 0;
  // muerte súbita: las próximas celdas de la espiral son peligrosas (y después quedan tapadas)
  if (game.elapsed > SD_AT - 3) {
    for (const f of S.sdFall) d[f.k] = Math.min(d[f.k], Math.max(0.01, SD_FALL - f.t));
    let t = Math.max(0, S.sdT) + Math.max(0, SD_AT - game.elapsed);
    for (let j = S.sdIdx; j < SPIRAL.length && t < 3; j++) { if (G[SPIRAL[j]] !== WALL) { d[SPIRAL[j]] = Math.min(d[SPIRAL[j]], t + SD_FALL); t += sdEvery(); } }
  }
  return d;
}
// Camino (por celdas) hasta la celda más cercana que cumpla want(k), pasando solo por celdas seguras a tiempo
function findPath(p, danger, want, maxSteps, startBomb) {
  const start = cellOf(p), cellT = 1 / p.speed;
  const prev = new Array(N).fill(-2), dist = new Array(N).fill(-1), tim = new Array(N).fill(0);
  dist[start] = 0; prev[start] = -1; const q = [start];
  // cuánto tarda en pasar de k a kk: contra la cinta cuesta el doble, a favor menos; la arena movediza, el doble
  const stepT = (k, kk, dc, dr) => {
    let t = cellT; const cv = CONV[spAt(k)], sp = spAt(kk);
    if (cv) t *= cv[0] === dc && cv[1] === dr ? 0.7 : cv[0] === -dc && cv[1] === -dr ? 2.2 : 1.2;
    if (sp === 'q') t *= 2;
    return t;
  };
  while (q.length) {
    const k = q.shift();
    if (want(k, dist[k])) {
      const path = []; let x = k; while (x !== start && x >= 0) { path.unshift(x); x = prev[x]; }
      return path;
    }
    if (dist[k] >= maxSteps) continue;
    const c = k % GW, r = (k / GW) | 0;
    for (const [dc, dr] of DIRS) {
      const kk = idx(c + dc, r + dr);
      if (dist[kk] >= 0 || G[kk] !== EMPTY) continue;
      const b = bombAt(kk);
      if ((b && !(kk === start)) || (startBomb === kk && kk !== start)) continue;
      const arrive = tim[k] + stepT(k, kk, dc, dr);
      // no pasar por una celda que explota justo mientras la cruzo
      if (danger[kk] < arrive + cellT + 0.25 && danger[kk] > arrive - 0.6 - cellT) continue;
      if (danger[kk] <= 0.05) continue;
      dist[kk] = dist[k] + 1; tim[kk] = arrive; prev[kk] = k; q.push(kk);
    }
    // con botas: saltar un obstáculo pegado (pared, cajón o petardo) si del otro lado hay lugar
    if (p.boots) for (const [dc, dr] of DIRS) {
      const o = idx(c + dc, r + dr), lc = c + 2 * dc, lr = r + 2 * dr;
      if (!interior(c + dc, r + dr) || !interior(lc, lr)) continue;
      const l = idx(lc, lr);
      if (dist[l] >= 0 || !(G[o] !== EMPTY || bombAt(o)) || G[l] !== EMPTY || bombAt(l)) continue;
      const arrive = tim[k] + VAULT_PUSH + VAULT_T;
      if (danger[l] < arrive + cellT + 0.25 && danger[l] > arrive - 0.6 - cellT) continue;
      if (danger[l] <= 0.05) continue;
      dist[l] = dist[k] + 2; tim[l] = arrive; prev[l] = k; q.push(l);
    }
  }
  return null;
}
function lineHits(k, range, target) {
  return blastCells(k, range, G).includes(target);
}
function aiThink(p, D) {
  const react = D.think[1] * 1.5;
  const danger = dangerMap(null, react, p);
  const here = cellOf(p);
  const safe = (k) => danger[k] === Infinity;
  const belt = (k) => !!CONV[spAt(k)];
  // 1) en peligro: ir a una celda segura (mejor una fuera de la cinta: arriba de la cinta te arrastra)
  if (!safe(here)) {
    const path = findPath(p, danger, (k) => safe(k) && !belt(k), 8) || findPath(p, danger, (k) => safe(k), 8);
    p.path = path || [];
    return;
  }
  // 2) ¿poner un petardo? (al lado de un cajón o con un rival en la línea) solo si hay por dónde escapar
  const md = (a, b) => Math.abs((a % GW) - (b % GW)) + Math.abs(((a / GW) | 0) - ((b / GW) | 0));
  const rivals = game.players.filter((q) => q !== p && q.alive && !q.empty && (spAt(cellOf(q)) !== 'b' || md(cellOf(q), here) <= 2));
  const nearCrate = DIRS.some(([dc, dr]) => G[idx((here % GW) + dc, ((here / GW) | 0) + dr)] === CRATE);
  const hitsRival = rivals.some((q) => lineHits(here, p.range, cellOf(q)));
  const wantBomb = (nearCrate && Math.random() < 0.7) || (hitsRival && Math.random() < 0.3 + D.swing);
  const centered = Math.abs(p.x - cxOf(here % GW)) < TS * 0.3 && Math.abs(p.z - czOf((here / GW) | 0)) < TS * 0.3;
  if (wantBomb && centered && activeBombs(p) < p.maxBombs && !bombAt(here) && !belt(here)) {
    const d2 = dangerMap({ k: here, t: FUSE, range: p.range }, react, p);
    const esc = findPath(p, d2, (k) => d2[k] === Infinity && !belt(k), 7, here);
    const reckless = D.err > 3 && Math.random() < 0.01;          // en fácil, muy de vez en cuando, se manda igual
    if (esc || reckless) { p.wantBomb = true; p.path = esc || []; return; }
  }
  // 3) moverse: poder cerca, un lugar al lado de un cajón, o ir a buscar a alguien
  if (p.path.length && safe(p.path[p.path.length - 1]) && Math.random() < 0.7) return;   // sigue con lo que venía
  const puSet = new Set(pups.filter((u) => u.t <= 0 && u.type !== 6).map((u) => u.k));
  let path = findPath(p, danger, (k, d) => d > 0 && puSet.has(k), 6);
  if (!path) {
    path = findPath(p, danger, (k, d) => d > 0 && safe(k) && !belt(k) && DIRS.some(([dc, dr]) => G[idx((k % GW) + dc, ((k / GW) | 0) + dr)] === CRATE), 10);
  }
  if (!path || Math.random() < 0.4 + D.lead * 0.4) {
    const targets = new Set(rivals.map((q) => cellOf(q)));
    const hunt = findPath(p, danger, (k, d) => d > 0 && safe(k) && !belt(k) && [...targets].some((t) => lineHits(k, p.range, t)), 12);
    if (hunt) path = hunt;
  }
  p.path = path || [];
}
function aiInput(p, dt) {
  const D = DIFFICULTIES[game.difficulty] || DIFFICULTIES.intermedio;
  p.thinkT -= dt;
  if (p.thinkT <= 0) { p.thinkT = rnd(D.think[0], D.think[1]) * 2; aiThink(p, D); }
  // seguir el camino celda por celda
  while (p.path.length && cellOf(p) === p.path[0] && Math.hypot(cxOf(p.path[0] % GW) - p.x, czOf((p.path[0] / GW) | 0) - p.z) < TS * 0.12) p.path.shift();
  // quieto en el centro de su celda (arriba de una cinta, caminando en contra para no ser arrastrado)
  const hold = () => {
    const k = cellOf(p), dx = cxOf(k % GW) - p.x, dz = czOf((k / GW) | 0) - p.z;
    if (Math.abs(dx) > 0.05) return { x: Math.sign(dx), z: 0 };
    if (Math.abs(dz) > 0.05) return { x: 0, z: Math.sign(dz) };
    return { x: 0, z: 0 };
  };
  if (!p.path.length) return hold();
  const t = p.path[0];
  const dx = cxOf(t % GW) - p.x, dz = czOf((t / GW) | 0) - p.z;
  // si la próxima celda se volvió peligrosa justo ahora, esperar
  const danger = dangerMap(null, 0, p);
  if (danger[t] < 0.6 && danger[cellOf(p)] === Infinity) return hold();
  return Math.abs(dx) >= Math.abs(dz) ? { x: Math.sign(dx), z: 0 } : { x: 0, z: Math.sign(dz) };
}

/* ---------- simulación ---------- */
function step(dt) {
  const st = game.state;
  if (st === 'count') {
    const before = Math.ceil(game.countT); game.countT -= dt; const after = Math.ceil(game.countT);
    if (after !== before) { if (after > 0) FX.tick(); else { FX.go(); game.state = 'play'; } }
    return;
  }
  if (st !== 'play' && !demo()) return;
  const R = game.round;
  if (!R.over) game.elapsed += dt;

  const alive = game.players.filter((p) => p.alive && !p.empty);
  for (const p of alive) {
    let ix = 0, iz = 0, bomb = false;
    if (p.ctrl === 'local') {
      const c = input.ctl[p.pad || 'all'];
      [ix, iz] = camMove(c.x, c.y);
      bomb = p.wantBomb; p.wantBomb = false;
    } else if (p.ctrl === 'remote') {
      const n = p.net;
      if (n) { ix = n.x || 0; iz = -(n.y || 0); bomb = n.hit; n.hit = false; }
    } else if (p.ctrl === 'ai') {
      const a = aiInput(p, dt); ix = a.x; iz = a.z;
      bomb = p.wantBomb; p.wantBomb = false;
    }
    if (R.over) { ix = 0; iz = 0; bomb = false; }
    // maldición de la calavera
    const cu = p.curse && p.curse.id;
    if (cu === 'invertido') { ix = -ix; iz = -iz; }
    if (cu === 'atontado') [ix, iz] = confuse(p, ix, iz);
    if (cu === 'sinpetardos') bomb = false;
    if (cu === 'diarrea' && !R.over) bomb = true;
    if (bomb && !p.jump) placeBomb(p);  // el petardo queda donde estabas al apretar
    const sp0 = p.speed; if (cu === 'lento') p.speed = SPEED0 * 0.45;
    move(p, ix, iz, dt);
    p.speed = sp0;
    if (p.invul > 0) p.invul -= dt;
    if (p.curseCD > 0) p.curseCD -= dt;
    if (p.curse) { p.curse.t -= dt; if (p.curse.t <= 0) p.curse = null; }
    // agarrar poderes
    const k = cellOf(p);
    const pu = !p.jump && pups.find((u) => u.k === k && u.t <= 0);
    if (pu) {
      pups = pups.filter((u) => u !== pu);
      if (pu.type === 0) p.maxBombs = Math.min(MAX_BOMBS, p.maxBombs + 1);
      else if (pu.type === 1) p.range = Math.min(MAX_RANGE, p.range + 1);
      else if (pu.type === 2) p.speed = Math.min(SPEED_MAX, p.speed + SPEED_UP);
      else if (pu.type === 3) p.boots = true;
      else if (pu.type === 4) p.shield = true;
      else if (pu.type === 5) p.kick = true;
      else { p.curse = { id: CURSES[(Math.random() * CURSES.length) | 0].id, t: CURSE_T }; p.curseCD = 1; FX.curse(p.i); }
      if (pu.type !== 6) FX.powerup(p.x, p.z);
    }
  }
  // la calavera se contagia: si el maldito toca a otro, se la pasa
  for (const a of alive) {
    if (!a.curse || a.curseCD > 0 || !a.alive) continue;
    const b = alive.find((q) => q !== a && q.alive && !q.curse && Math.hypot(q.x - a.x, q.z - a.z) < TS * 0.7);
    if (b) { b.curse = a.curse; a.curse = null; b.curseCD = 1; a.curseCD = 1; FX.curse(b.i); }
  }

  // muerte súbita: las paredes se van cerrando en espiral desde el borde
  if (!R.over && game.elapsed >= SD_AT) {
    S.sdT -= dt;
    while (S.sdT <= 0 && S.sdIdx < SPIRAL.length) {
      const k = SPIRAL[S.sdIdx++];
      if (G[k] === WALL) continue;
      S.sdFall.push({ k, t: 0 });
      S.sdT += sdEvery();
    }
    for (const f of S.sdFall) {
      f.t += dt;
      if (f.t < SD_FALL) continue;
      f.done = true;
      const k = f.k, x = cxOf(k % GW), z = czOf((k / GW) | 0);
      G[k] = WALL; hidden[k] = -1;
      bombs = bombs.filter((b) => b.k !== k);
      pups = pups.filter((u) => u.k !== k);
      FX.wall(x, z);
      for (const p of alive) if (p.alive && cellOf(p) === k) { p.alive = false; game.elimOrder.push(p.i); p.fy = 0; FX.crush(p.i); if (p.i === game.me && game.mode === 'solo') game.timeScale = 1.5; }
    }
    S.sdFall = S.sdFall.filter((f) => !f.done);
    if (game.elapsed > SD_AT - 0.1 && !S.sdWarned) { S.sdWarned = true; FX.shrinkWarn(); }
  }

  // petardos pateados
  slideBombs(dt);
  if (!R.over) beltCrates(dt);

  // mechas, explosiones, fuego y poderes que aparecen (un petardo que pasa por el fuego explota)
  for (const b of bombs) { b.t -= dt; b.age += dt; if (flames.has(b.k)) b.t = Math.min(b.t, 0.05); }
  let guard = 0;
  while (guard++ < 50) { const b = bombs.find((q) => q.t <= 0); if (!b) break; explode(b); }
  for (const [k, t] of flames) { if (t - dt <= 0) flames.delete(k); else flames.set(k, t - dt); }
  for (const u of pups) if (u.t > 0) u.t -= dt;

  // el fuego alcanza a los que están en esa celda (en el aire, saltando con las botas, no)
  if (!R.over) for (const p of alive) {
    if (p.alive && flames.has(cellOf(p)) && !(p.jump && p.fy > 0.6) && !(p.invul > 0)) {
      if (p.shield) { p.shield = false; p.invul = INVUL_T; FX.powerup(p.x, p.z); continue; }   // el escudo aguanta una
      p.alive = false; game.elimOrder.push(p.i);
      FX.blast(p.i);
      if (p.i === game.me && game.mode === 'solo') game.timeScale = 1.5;
    }
  }

  // ¿terminó la ronda?
  const left = game.players.filter((p) => p.alive && !p.empty);
  if (!R.over && left.length <= 1) {
    R.over = true; R.winner = left.length ? left[0].i : -1; R.t = ROUND_PAUSE;
    if (R.winner >= 0) game.players[R.winner].score++;
    FX.round(R.winner);
  }
  if (R.over) {
    R.t -= dt;
    if (R.t <= 0 && !game.pendingEnd) {
      const champ = R.winner >= 0 && game.players[R.winner].score >= game.target;
      if (champ) { game.winner = R.winner; game.pendingEnd = true; }
      else startRound();
    }
  }
}

/* ---------- el minijuego ---------- */
let sendT = 0;
const petardos = {
  id: 'petardos',
  name: 'PETARDOS',
  desc: 'VOLÁ A LOS DEMÁS Y ROMPÉ CAJONES',
  howTo: 'PONER PETARDO',
  points: { label: 'RONDAS PARA GANAR', values: [1, 2, 3], key: 'rounds', demo: 2 },
  cam: { pos: new THREE.Vector3(0, 31.5, 15.4), look: new THREE.Vector3(0, 0, 0.4), rotate: false, orbit: true },
  humanOut: false,
  tense: () => game.elapsed >= SD_AT,           // música más rápida en la muerte súbita
  tagY: 2.2, markMe: true,
  thumbSteps: 1300,
  thumbCam: { pos: new THREE.Vector3(0, 20, 10.5), look: new THREE.Vector3(0, 0, -0.3) },

  build: buildWorld,
  show(on) { if (W.grp) W.grp.visible = on; },

  reset() {
    game.round = { n: 1, over: false, winner: -1, t: 0 };
    game.players.forEach((p) => { p.score = 0; });
    placeAll();
    sendT = 0;
  },
  step,

  visuals(dt) {
    const clock = game.clock;
    W.canchas.forEach((g, i) => (g.visible = i === S.cancha));
    W.beltM.uniforms.uOff.value.set(0, (-clock * CONV_V) % 1);          // las cintas corren
    W.sandM.uniforms.uOff.value.set((clock * 0.05) % 1, (clock * 0.03) % 1);
    // arbustos: se sacuden cuando alguien se mete o camina adentro
    for (const b of W.bushes) {
      if (b.ci !== S.cancha) continue;
      const inside = game.players.some((q) => q.alive && !q.empty && !q.death && cellOf(q) === b.k && Math.hypot(q.vx || 0, q.vz || 0) > 0.5);
      if (inside) b.shake = 1;
      b.shake = Math.max(0, b.shake - dt * 2.5);
      const w = Math.sin(clock * 30) * 0.06 * b.shake;
      b.g.scale.set(1 + w, 1 - w, 1 + w);
    }
    // cajones que avanzan por la cinta (o que acaban de salir de la máquina): se deslizan en vez de saltar
    const mk = machineK(S.cancha);
    for (let k = 0; k < N; k++) {
      if (G[k] === CRATE && prevG[k] !== CRATE) {
        let from = -1;
        for (const [dc, dr] of DIRS) {
          const n = idx((k % GW) - dc, ((k / GW) | 0) - dr), cv = n >= 0 && n < N ? CONV[spAt(n)] : null;
          if (cv && cv[0] === dc && cv[1] === dr && prevG[n] === CRATE && G[n] !== CRATE) { from = n; break; }
        }
        if (from >= 0) crateAnim.set(k, { from, t: 0 }); else if (k === mk) crateAnim.set(k, { spawn: true, t: 0 });
      }
      prevG[k] = G[k];
    }
    for (const [k, a] of crateAnim) { a.t += dt * (a.spawn ? 2.5 : CONV_V); if (a.t >= 1 || G[k] !== CRATE) crateAnim.delete(k); }
    if (W.machineLamp) W.machineLamp.visible = S.machT > 0.8 || ((clock * 10) | 0) % 2 === 0;
    for (let k = 0; k < N; k++) {
      W.crates[k].visible = G[k] === CRATE;
      const cm = W.crates[k], a = crateAnim.get(k);
      cm.position.set(cxOf(k % GW), TS * 0.4, czOf((k / GW) | 0)); cm.scale.setScalar(1);
      if (a && a.from !== undefined) { const u = a.t; cm.position.x += (cxOf(a.from % GW) - cxOf(k % GW)) * (1 - u); cm.position.z += (czOf((a.from / GW) | 0) - czOf((k / GW) | 0)) * (1 - u); }
      else if (a && a.spawn) cm.scale.setScalar(0.4 + 0.6 * a.t);
      W.sdWalls[k].visible = G[k] === WALL && !isWall(S.cancha, k % GW, (k / GW) | 0);   // paredes de la muerte súbita
    }
    W.sdFall.forEach((m, n) => {
      const f = S.sdFall[n];
      m.visible = !!f;
      if (f) { const u = Math.min(1, f.t / SD_FALL); m.position.set(cxOf(f.k % GW), TS * 0.45 + (1 - u * u) * 12, czOf((f.k / GW) | 0)); }
    });
    // petardos: se inflan cada vez más rápido y la chispa titila
    W.bombs.forEach((g) => (g.visible = false));
    bombs.forEach((b, n) => {
      const g = W.bombs[n]; if (!g) return;
      g.visible = true; g.position.set(b.bx !== undefined ? b.bx : cxOf(b.k % GW), 0, b.bz !== undefined ? b.bz : czOf((b.k / GW) | 0));
      const f = 1 - clamp(b.t / FUSE, 0, 1), s = 1 + Math.sin(clock * (8 + f * 22)) * (0.05 + f * 0.08);
      g.scale.set(s, 1 / s, s);
      g.userData.spark.visible = ((clock * 20) | 0) % 2 === 0;
    });
    // fuego
    for (let k = 0; k < N; k++) {
      const t = flames.get(k), m = W.flames[k];
      if (t === undefined) { m.visible = false; continue; }
      m.visible = true; const s = 0.7 + (t / FLAME_T) * 0.35 + Math.sin(clock * 40 + k) * 0.05; m.scale.set(s, 0.6 + t / FLAME_T, s);
    }
    W.flameM.uniforms.uOff.value.set((clock * 0.7) % 1, (clock * 0.9) % 1);
    // poderes flotando
    W.pups.forEach((m) => (m.visible = false));
    pups.filter((u) => u.t <= 0).forEach((u, n) => {
      const m = W.pups[n]; if (!m) return;
      m.visible = true; m.material = W.puMats[u.type];
      m.position.set(cxOf(u.k % GW), TS * 0.45 + Math.sin(clock * 4 + u.k) * 0.12, czOf((u.k / GW) | 0));
      m.rotation.set(0.3, clock * 2 + u.k, 0);
    });
    // personajes a pie (con escudo: dos anillos girando; recién golpeado: titila; maldito: calavera arriba)
    for (const p of game.players) {
      const sh = W.shields[p.i], sk = W.skulls[p.i];
      sh.visible = !!(p.shield && p.alive && !p.death && !p.empty);
      sk.visible = !!(p.curse && p.alive && !p.death && !p.empty);
      if (sk.visible) { sk.position.set(p.x, (p.fy || 0) + TS * 1.55 + Math.sin(clock * 5) * 0.1, p.z); sk.rotation.y = clock * 2; }
      if (p.death || p.empty) { if (p.empty) { p.mesh.root.visible = false; p.mesh.sh.visible = false; } continue; }
      p.onGround = !p.jump && !(p.fy > 0.05);
      drawWalker(p, dt, CHAR_SCALE, 0);
      // escondido en un arbusto: los demás no lo ven (en el local, con la pantalla compartida, se ve igual)
      const hide = game.mode !== 'local' && p.i !== game.me && spAt(cellOf(p)) === 'b' && !(p.fy > 0.3);
      p.hideTag = hide;
      if (hide) { p.mesh.root.visible = false; p.mesh.sh.visible = false; W.skulls[p.i].visible = false; W.shields[p.i].visible = false; }
      if (p.invul > 0 && ((clock * 16) | 0) % 2) p.mesh.root.visible = false;
      if (sh.visible) { sh.position.set(p.x, (p.fy || 0) + TS * 0.55, p.z); sh.rotation.set(clock * 2.3, clock * 3.1, 0); }
    }
  },

  onLocalHit(p) { p.wantBomb = true; },

  drawScore(p, x, y) {
    if (p.empty) { txt('--', x, y, 16, '#555b6e', 'center', COL.goldShadow); return; }
    const nn = game.target || 2, w = 7, gap = 3, tot = nn * w + (nn - 1) * gap;
    for (let k = 0; k < nn; k++) {
      const bx = Math.round(x - tot / 2 + k * (w + gap));
      rect(bx, y + 3, w, w, '#000');
      rect(bx + 1, y + 4, w - 2, w - 2, k < p.score ? COL.gold : '#2a3150');
    }
  },
  hud(hw, st) {
    const R = game.round; if (!R) return;
    if (st === 'count') {
      txt(`RONDA ${R.n}`, hw / 2, 80, 16, COL.teal, 'center');
      txt(`CANCHA: ${CANCHAS[S.cancha].name}`, hw / 2, 48, 8, COL.white, 'center');
      txt(CANCHAS[S.cancha].extra, hw / 2, 60, 8, '#ffb31a', 'center');
    }
    if (st === 'count' && R.n === 1 && game.mode !== 'demo') {
      txt('¡ROMPÉ CAJONES Y VOLÁ A LOS DEMÁS!', hw / 2, 170, 8, '#ffb31a', 'center');
      txt(input.device === 'gamepad' ? 'A = PONER PETARDO' : 'ESPACIO = PONER PETARDO', hw / 2, 184, 8, COL.dim, 'center');
    }
    if (st === 'play' && R.over) {
      const w = R.winner, p = game.players[w];
      const t = w < 0 ? '¡NADIE!' : w === game.me && game.mode !== 'local' ? '¡GANASTE LA RONDA!' : `RONDA PARA ${p.name || CHARS[w].name}`;
      rect(0, 96, hw, 34, 'rgba(4,6,14,.7)');
      txt(t, hw / 2, 104, 16, w < 0 ? COL.white : CHARS[w].col, 'center', COL.goldShadow);
    }
    if (st === 'play' && !R.over && game.elapsed > SD_AT - 1 && game.elapsed < SD_AT + 2.5 && ((game.clock * 3) | 0) % 2) txt('¡MUERTE SÚBITA!', hw / 2, 64, 16, COL.red, 'center', COL.goldShadow);
    // tus poderes (arriba al medio): petardos, fuego, velocidad, botas y escudo
    const me = game.players[game.me];
    if ((st === 'play' || st === 'count') && me && me.alive && !me.empty && game.mode !== 'local') {
      const lv = Math.round((me.speed - SPEED0) / SPEED_UP) + 1, x0 = Math.round(hw / 2 - 62), y0 = 5;

      const bc = me.boots ? '#ffd23a' : '#3a4050', sc = me.shield ? '#6ff6ff' : '#3a4050', kc = me.kick ? '#ff9a3a' : '#3a4050';
      rect(x0 - 4, y0 - 2, 146, 14, 'rgba(4,6,14,.65)');
      rect(x0 + 120, y0 + 1, 3, 5, kc); rect(x0 + 120, y0 + 6, 5, 3, kc); rect(x0 + 127, y0 + 4, 4, 4, kc);   // patada
      rect(x0 + 92, y0 + 1, 3, 5, bc); rect(x0 + 92, y0 + 6, 6, 3, bc);                      // bota
      rect(x0 + 106, y0 + 1, 7, 5, sc); rect(x0 + 107, y0 + 6, 5, 2, sc); rect(x0 + 108, y0 + 8, 3, 1, sc);   // escudo
      rect(x0 + 1, y0 + 2, 6, 6, '#15151c'); rect(x0 + 2, y0 + 1, 4, 8, '#15151c'); rect(x0 + 5, y0, 2, 2, '#ffd23a');
      txt(String(me.maxBombs), x0 + 10, y0 + 1, 8, COL.white);
      rect(x0 + 33, y0 + 3, 6, 6, '#ff7a14'); rect(x0 + 34, y0 + 1, 4, 3, '#ffd23a'); rect(x0 + 35, y0 + 5, 2, 3, '#fff27a');
      txt(String(me.range), x0 + 42, y0 + 1, 8, COL.white);
      rect(x0 + 64, y0 + 5, 7, 3, '#fff'); rect(x0 + 65, y0 + 2, 3, 4, '#fff'); rect(x0 + 61, y0 + 2, 2, 1, '#39d98a'); rect(x0 + 60, y0 + 5, 2, 1, '#39d98a');
      txt(String(lv), x0 + 75, y0 + 1, 8, COL.white);
    }
    if (st === 'play' && me && !me.alive && !me.empty && !R.over && game.mode !== 'local') txt('¡VOLASTE!', hw / 2, 196, 16, COL.red, 'center');
    // tu maldición
    if (st === 'play' && me && me.alive && me.curse && game.mode !== 'local') {
      const c = CURSES.find((q) => q.id === me.curse.id);
      if (c && ((game.clock * 4) | 0) % 2) txt(`${c.label} ${Math.ceil(me.curse.t)}`, hw / 2, 24, 8, '#d8a0ff', 'center');
    }
  },

  /* ---------- online (el anfitrión manda todo; el invitado manda para dónde va y cuándo pone un petardo) ---------- */
  snapshot() {
    const R = game.round;
    return {
      ro: [R.n, R.over ? 1 : 0, R.winner, Math.round(R.t * 10) / 10],
      g: G.join(''), cn: S.cancha, sf: S.sdFall.map((f) => [f.k, r2(f.t)]),
      p: game.players.map((p) => [r2(p.x), r2(p.z), r2(p.ang || 0), p.alive ? 1 : 0, p.score, p.maxBombs || 1, p.range || RANGE0, r2(p.speed || SPEED0),
        p.boots ? 1 : 0, p.shield ? 1 : 0, p.invul > 0 ? 1 : 0, r2(p.fy || 0), p.kick ? 1 : 0, p.curse ? CURSES.findIndex((c) => c.id === p.curse.id) : -1, p.curse ? Math.ceil(p.curse.t) : 0]),
      b: bombs.map((b) => [b.id, b.k, r2(b.t), r2(b.bx), r2(b.bz)]),
      f: [...flames].map(([k, t]) => [k, r2(t)]),
      u: pups.map((u) => [u.k, u.type, r2(u.t)]),
    };
  },
  applySnap(A, Bs, f) {
    const ro = A.ro;
    game.round = { n: ro[0], over: !!ro[1], winner: ro[2], t: ro[3] };
    for (let k = 0; k < N; k++) G[k] = +A.g[k] || 0;
    S.cancha = A.cn || 0;
    game.players.forEach((p, i) => {
      const pa = A.p[i], pb = Bs.p[i];
      if (pa[3] && p.death) { p.death = null; resetPodVisual(p); }
      p.alive = !!pa[3]; p.score = pa[4]; p.maxBombs = pa[5]; p.range = pa[6]; p.speed = pa[7];
      p.boots = !!pa[8]; p.shield = !!pa[9]; p.invul = pa[10] ? 0.5 : 0; p.fy = pa[11] + ((pb[11] || 0) - pa[11]) * f;
      p.kick = !!pa[12]; p.curse = pa[13] >= 0 ? { id: CURSES[pa[13]].id, t: pa[14] } : null;
      if (!p.alive && !p.death && !p.empty) FX.blast(i);
      if (p.death || p.empty) return;
      const nx = pa[0] + (pb[0] - pa[0]) * f, nz = pa[1] + (pb[1] - pa[1]) * f;
      p.vx = (pb[0] - pa[0]) * 20; p.vz = (pb[1] - pa[1]) * 20;
      p.x = nx; p.z = nz; p.ang = lerpAng(pa[2], pb[2], f);
    });
    bombs = A.b.map(([id, k, t, bx, bz]) => {
      const nb = Bs.b.find((q) => q[0] === id);
      return { id, k, t, range: RANGE0, owner: -1, age: 9, bx: nb ? bx + (nb[3] - bx) * f : bx, bz: nb ? bz + (nb[4] - bz) * f : bz };
    });
    S.sdFall = (A.sf || []).map(([k, t]) => ({ k, t }));
    flames = new Map(A.f.map(([k, t]) => [k, t]));
    pups = A.u.map(([k, type, t]) => ({ k, type, t }));
  },
  guestLocal(rdt, hits) {
    sendT -= rdt;
    if (sendT > 0) return;
    sendT = 1 / 30;
    // se manda la dirección ya girada según tu cámara (el anfitrión la usa tal cual)
    const c = input.ctl.all, [wx, wz] = camMove(c.x, c.y);
    sendInput({ x: Math.round(wx * 100) / 100, y: Math.round(-wz * 100) / 100, h: hits });
  },
  guestHitFx() {},
};

// para las pruebas (?debug): acceso al mapa
petardos._dbg = { G, clearCrates() { for (let k = 0; k < N; k++) if (G[k] === CRATE) G[k] = EMPTY; },
  danger(i) { const p = game.players[i]; return dangerMap(null, 0, p).map((v) => (v === Infinity ? -1 : Math.round(v * 100) / 100)); },
  bombs() { return bombs.map((b) => ({ k: b.k, t: b.t, owner: b.owner, mv: b.mv, range: b.range, age: b.age })); },
  crates() { return G.map((v, k) => (v === CRATE ? (CONV[spAt(k)] ? 'B' : 'c') : v === WALL ? '#' : '.')).join(''); } };

register(petardos);
export default petardos;
