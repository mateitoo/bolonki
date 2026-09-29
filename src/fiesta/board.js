// FIESTA: modo tablero estilo party game.
//
// Cada uno tira el dado y avanza por un camino de 24 casilleros:
//   azul +3 monedas · rojo −3 · evento (algo al azar) · duelo (minijuego 1 contra 1, el ganador le saca 10)
// Al pasar por la copa se puede comprar por 20 monedas (después la copa se muda).
// Al final de cada vuelta, un minijuego entre todos (sorteado entre los activos) reparte monedas por puesto.
// Después de N turnos gana el que tiene más copas (y si empatan, más monedas).
//
// La lógica corre en una sola máquina (la del jugador, o la del anfitrión en el online) y el estado
// del tablero (S) es un objeto simple que se manda entero a los invitados.
import * as THREE from 'three';
import { register, MINIGAMES, mgById } from '../minigames/registry.js';
import { CHARS, rnd } from '../config.js';
import { game } from '../state.js';
import { settings } from '../settings.js';
import { scene, mat, add, scaleUV, camera } from '../render/psx.js';
import { TX } from '../render/textures.js';
import { input } from '../input.js';
import { P } from '../fx/particles.js';
import { FX } from '../game/fx.js';
import { resetPodVisual } from '../world/pods.js';
import { resetMatch } from '../game/match.js';
import { hostLaunch, setFiestaStarter } from '../net/online.js';
import { sendInput, room } from '../net/room.js';
import { txt, rect, panel, tri, textWidth, COL, ui } from '../ui/draw.js';
import { drawThumb } from '../render/thumbStore.js';

/* ---------- reglas ---------- */
const N = 24;
const TYPES = 'SBBEBRBDBEBRBBEBRDBEBRBE';     // S inicio · B azul · R rojo · E evento · D duelo
const COPA_COST = 20, START_COINS = 10, BLUE = 3, RED = 3, DUEL_STEAL = 10;
const HOP = 0.28;
const PRIZES = { 4: [10, 5, 3, 1], 3: [10, 5, 2], 2: [10, 3] };
const EVENTS = [
  { id: 'lluvia', title: '¡LLUVIA DE MONEDAS!', sub: 'TODOS +5' },
  { id: 'ladron', title: '¡LADRÓN!', sub: '' },
  { id: 'turbo', title: '¡TURBO!', sub: 'AVANZÁS 3 MÁS' },
  { id: 'cambio', title: '¡CAMBIO DE LUGAR!', sub: '' },
  { id: 'mudanza', title: '¡LA COPA SE MUDA!', sub: '' },
  { id: 'mala', title: '¡MALA SUERTE!', sub: '−5 MONEDAS' },
];

/* ---------- camino ---------- */
const SPACES = [];
for (let i = 0; i < N; i++) {
  const t = (i / N) * Math.PI * 2;
  SPACES.push({ x: 12 * Math.sin(t) + 1.2 * Math.sin(3 * t), z: 7.2 * Math.cos(t) + 1.6 * Math.sin(2 * t), type: TYPES[i] });
}
const dirAt = (i) => { const a = SPACES[i], b = SPACES[(i + 1) % N]; return Math.atan2(b.x - a.x, b.z - a.z); };
const outward = (i) => { const s = SPACES[i], l = Math.hypot(s.x, s.z) || 1; return [s.x / l, s.z / l]; };

/* ---------- estado ---------- */
export const S = {
  ph: 'idle', t: 0, cur: 0, turn: 1, maxT: 10, order: [], dice: 1, steps: 0, spin: 0, botT: 1,
  pos: [0, 0, 0, 0], coins: [0, 0, 0, 0], cups: [0, 0, 0, 0], copa: 12,
  msg: '', sub: '', col: '', flash: '', flashT: 0, ch: null, pick: 'bolas', duel: null, res: null, fin: null, noEvent: false,
};
let base = null;           // quiénes juegan y cómo (control, nombres, joysticks) para toda la Fiesta

export const activeMinigames = () => {
  const off = settings.mgOff || [];
  const list = MINIGAMES.filter((m) => !off.includes(m.id));
  return list.length ? list : MINIGAMES;
};
const fiestaPoints = (id) => mgById(id).fiestaPoints || mgById(id).points.values[0];

function pname(i) {
  if (i === game.me && game.mode !== 'local') return 'VOS';
  const p = game.players[i];
  return (p && p.name) || CHARS[i].name;
}
const isHuman = (i) => { const c = game.players[i].ctrl; return c === 'local' || c === 'remote'; };
const who = () => S.order[S.cur];

/* ---------- mundo ---------- */
const W = { grp: null, tiles: [], copa: null, ring: null, dice: null, props: [], spin: [] };

function buildWorld() {
  const grp = new THREE.Group(); grp.visible = false; scene.add(grp); W.grp = grp;
  // isla flotante
  add(scaleUV(new THREE.CylinderGeometry(16.5, 15, 1.6, 26, 1), 7, 1), mat({ map: TX.grass }), 0, -0.8, 0, grp);
  const under = scaleUV(new THREE.ConeGeometry(15, 9, 16, 2, true), 6, 2); under.rotateX(Math.PI);
  add(under, mat({ map: TX.rock, color: 0x9a8f9e }), 0, -6.1, 0, grp);
  add(scaleUV(new THREE.CylinderGeometry(16.55, 16.55, 0.3, 26, 1, true), 40, 1), mat({ map: TX.lights, unlit: true }), 0, -0.1, 0, grp);
  // fondo: agua oscura muy abajo y rocas flotando
  const sea = scaleUV(new THREE.PlaneGeometry(240, 240, 12, 12), 40); sea.rotateX(-Math.PI / 2);
  W.seaM = mat({ map: TX.pit, color: 0x2a4a8a, unlit: true });
  add(sea, W.seaM, 0, -30, 0, grp);
  const rockM = mat({ map: TX.rock, color: 0xb0a4b6 });
  for (let k = 0; k < 9; k++) {
    const a = (k / 9) * Math.PI * 2 + 0.3, r = rnd(22, 30);
    const m = add(new THREE.DodecahedronGeometry(rnd(1, 2.4), 0), rockM, Math.sin(a) * r, rnd(-8, -2), Math.cos(a) * r, grp);
    W.props.push({ m, y: m.position.y, ph: rnd(0, 6) });
  }
  // árboles y torres de decoración
  const trunkM = mat({ color: 0x6b4a2a }), leafM = mat({ color: 0x2f7a3a }), leaf2M = mat({ color: 0x3f9a44 });
  const treeAt = [[-6, 0.5], [6.5, -0.5], [-2.5, -3.5], [3, 3.3], [-14, 3], [14.5, -3], [-9, -9.5], [9.5, 9], [0, -12.5], [-12, -6], [12, 6.5]];
  treeAt.forEach(([x, z], k) => {
    add(new THREE.CylinderGeometry(0.25, 0.35, 1.4, 6), trunkM, x, 0.7, z, grp);
    add(new THREE.ConeGeometry(1.3, 2.4, 7), k % 2 ? leafM : leaf2M, x, 2.3, z, grp);
    add(new THREE.ConeGeometry(0.9, 1.6, 7), k % 2 ? leaf2M : leafM, x, 3.3, z, grp);
  });
  // estatua de la copa en el centro
  add(new THREE.CylinderGeometry(1.8, 2.2, 0.8, 10), mat({ map: TX.tower }), 0, 0.4, 0, grp);
  const big = buildCup(2.2); big.position.set(0, 0.8, 0); grp.add(big); W.spin.push(big);
  // casilleros
  const tileG = new THREE.CylinderGeometry(0.95, 1.05, 0.3, 10);
  const ringG = new THREE.RingGeometry(0.6, 0.85, 10); ringG.rotateX(-Math.PI / 2);
  const COLS = { S: 0xf4f4f4, B: 0x3a7bff, R: 0xff3a3a, E: 0x39d98a, D: 0xb06aff };
  SPACES.forEach((s, i) => {
    const m = mat({ color: COLS[s.type] });
    add(tileG, m, s.x, 0.15, s.z, grp);
    add(ringG, mat({ color: new THREE.Color(COLS[s.type]).multiplyScalar(0.55), unlit: true }), s.x, 0.31, s.z, grp);
    if (s.type === 'E') { const o = add(new THREE.OctahedronGeometry(0.35, 0), mat({ color: 0xa8ffc0, unlit: true }), s.x, 1.1, s.z, grp); W.spin.push(o); }
    if (s.type === 'D') { const o = add(new THREE.ConeGeometry(0.3, 0.7, 4), mat({ color: 0xe0b0ff, unlit: true }), s.x, 1.1, s.z, grp); W.spin.push(o); }
    if (s.type === 'S') {
      add(new THREE.CylinderGeometry(0.05, 0.05, 1.6, 4), mat({ color: 0xdddddd }), s.x + 0.7, 0.9, s.z, grp);
      add(new THREE.BoxGeometry(0.05, 0.4, 0.6), mat({ color: 0xff9a1f, unlit: true }), s.x + 0.7, 1.5, s.z + 0.3, grp);
    }
    W.tiles.push(m);
    // puntitos del camino hasta el siguiente
    const nx = SPACES[(i + 1) % N];
    for (let k = 1; k <= 2; k++) {
      const f = k / 3, d = new THREE.CircleGeometry(0.16, 6); d.rotateX(-Math.PI / 2);
      add(d, mat({ color: 0xe8e0b0, unlit: true }), s.x + (nx.x - s.x) * f, 0.02, s.z + (nx.z - s.z) * f, grp);
    }
  });
  // la copa que se compra (con pedestal)
  const cg = new THREE.Group(); grp.add(cg); W.copa = cg;
  add(new THREE.CylinderGeometry(0.45, 0.55, 0.5, 8), mat({ map: TX.bronze }), 0, 0.25, 0, cg);
  const cup = buildCup(0.75); cup.position.y = 0.5; cg.add(cup); W.cupSmall = cup;
  // anillo que marca a quién le toca, y el bloque del dado
  const ring = new THREE.TorusGeometry(0.75, 0.08, 4, 16); ring.rotateX(Math.PI / 2);
  W.ring = add(ring, mat({ color: 0xffd23a, unlit: true }), 0, 0.4, 0, grp);
  W.dice = add(new THREE.BoxGeometry(0.9, 0.9, 0.9), mat({ map: TX.dice, unlit: true }), 0, 3, 0, grp);
}

function buildCup(k) {
  const g = new THREE.Group();
  const gold = mat({ color: 0xffc83a, emissive: 0x3a2400 });
  add(new THREE.CylinderGeometry(0.35 * k, 0.42 * k, 0.12 * k, 8), gold, 0, 0.06 * k, 0, g);
  add(new THREE.CylinderGeometry(0.08 * k, 0.12 * k, 0.45 * k, 6), gold, 0, 0.34 * k, 0, g);
  const bowl = new THREE.SphereGeometry(0.42 * k, 10, 6, 0, Math.PI * 2, Math.PI * 0.45, Math.PI * 0.55); bowl.rotateX(Math.PI);
  add(bowl, gold, 0, 0.95 * k, 0, g).scale.set(1, 1.2, 1);
  add(new THREE.CylinderGeometry(0.44 * k, 0.4 * k, 0.1 * k, 10, 1, true), gold, 0, 0.98 * k, 0, g);
  [-1, 1].forEach((sx) => { const h = new THREE.TorusGeometry(0.16 * k, 0.04 * k, 4, 8); add(h, gold, sx * 0.46 * k, 0.78 * k, 0, g).rotation.y = Math.PI / 2; });
  return g;
}

/* ---------- inicio ---------- */
function newFiesta(cfg) {
  base = { mode: cfg.mode, ctrl: cfg.ctrl.slice(), pads: cfg.pads || null, names: cfg.names || null, me: cfg.me, kinds: cfg.kinds || null };
  Object.assign(S, {
    ph: 'intro', t: 0, cur: 0, turn: 1, maxT: cfg.points || 10, dice: 1, steps: 0, spin: 0, botT: 1,
    order: cfg.ctrl.map((c, i) => (c !== 'none' ? i : -1)).filter((i) => i >= 0),
    pos: [0, 0, 0, 0], coins: [START_COINS, START_COINS, START_COINS, START_COINS], cups: [0, 0, 0, 0],
    copa: 8 + ((Math.random() * 8) | 0), msg: '', sub: '', col: '', flash: '', flashT: 0, ch: null,
    pick: activeMinigames()[0].id, duel: null, res: null, fin: null, noEvent: false,
  });
  FX.snd('fanfare');
}

// La Fiesta arranca acá (solitario, local u online)
export function startFiesta(b, turns) {
  const setup = Object.assign({}, b, { mg: 'fiesta', points: turns, fiestaNew: true });
  if (b.mode === 'online') hostLaunch(setup, { mg: 'fiesta', kinds: b.kinds, names: b.names, points: turns, difficulty: game.difficulty });
  else resetMatch('count', setup);
}
setFiestaStarter(startFiesta);

// Online: si alguien se fue de la sala, su lugar pasa a ser un bot por el resto de la Fiesta
function syncLeft() {
  if (!base || base.mode !== 'online') return;
  base.ctrl.forEach((c, i) => {
    if (c !== 'remote' || room.guests.has(i)) return;
    base.ctrl[i] = 'ai'; base.kinds[i] = 'bot';
    const p = game.players[i];
    if (p && p.ctrl === 'remote') { p.ctrl = 'ai'; p.isBot = true; p.net = null; }
  });
}

function backToBoard() {
  syncLeft();
  const setup = Object.assign({}, base, { mg: 'fiesta', points: S.maxT, resume: true });
  if (base.mode === 'online') hostLaunch(setup, { mg: 'fiesta', kinds: base.kinds, names: base.names, points: S.maxT, difficulty: game.difficulty });
  else resetMatch('count', setup);
}

// Juega un minijuego con algunos jugadores (todos, o 2 en un duelo)
function launchMinigame(id, players) {
  syncLeft();
  const duel = !!S.duel;
  const ctrl = base.ctrl.map((c, i) => (players.includes(i) ? c : 'none'));
  const setup = Object.assign({}, base, { mg: id, ctrl, points: fiestaPoints(id), fiesta: true, duel });
  if (base.mode === 'online') {
    const kinds = base.kinds.map((k, i) => (players.includes(i) ? k : 'none'));
    hostLaunch(setup, { mg: id, kinds, names: base.names, points: setup.points, difficulty: game.difficulty, fiesta: true, duel });
  } else resetMatch('count', setup);
}

// Volvió de un minijuego: ranking = [1°, 2°, ...]
export function fiestaMinigameDone(ranking) {
  const kind = S.duel ? 'duel' : 'all';
  const gains = [0, 0, 0, 0];
  if (kind === 'duel') {
    const [w, l] = ranking;
    const steal = Math.min(DUEL_STEAL, S.coins[l]);
    S.coins[l] -= steal; S.coins[w] += steal; gains[w] = steal; gains[l] = -steal;
  } else {
    const prizes = PRIZES[ranking.length] || PRIZES[4];
    ranking.forEach((i, k) => { S.coins[i] += prizes[k] || 0; gains[i] = prizes[k] || 0; });
  }
  S.res = { kind, ranking, gains };
  backToBoard();
  enter(kind === 'duel' ? 'duelRes' : 'mgRes');
  FX.snd('coin');
}

/* ---------- fases ---------- */
// Los textos guardan a los jugadores como {n} y se arman al dibujar: así cada máquina ve "VOS" para sí misma
const fmt = (t) => String(t || '').replace(/\{(\d)\}/g, (_, d) => pname(+d));
function say(msg, sub, col) { S.msg = msg; S.sub = sub || ''; S.col = col || ''; }
function flash(text) { S.flash = text; S.flashT = 1.6; }
function addCoins(i, n) { S.coins[i] = Math.max(0, S.coins[i] + n); }

function enter(ph) {
  S.ph = ph; S.t = 0; S.botT = rnd(0.7, 1.3);
  const i = who();
  switch (ph) {
    case 'turn': say('', '', CHARS[i].col); break;
    case 'roll': S.dice = 1 + ((Math.random() * 6) | 0); S.spin = 0; break;
    case 'land': land(i); break;
    case 'mgIntro': S.pick = null; FX.snd('event'); break;
    default: break;
  }
}

function land(i) {
  const s = SPACES[S.pos[i]];
  let type = s.type;
  if (type === 'E' && S.noEvent) type = 'B';
  S.noEvent = false;
  if (type === 'D' && S.order.length < 2) type = 'B';
  const pt = SPACES[S.pos[i]];
  if (type === 'B' || type === 'S') { addCoins(i, BLUE); say(`+${BLUE} MONEDAS`, '', '#6ea8ff'); FX.snd('coin'); FX.sparkle(pt.x, 1, pt.z, P.YELLOW, 8); }
  else if (type === 'R') { addCoins(i, -RED); say(`−${RED} MONEDAS`, '', '#ff5a5a'); FX.snd('lose'); }
  else if (type === 'E') { S.ph = 'event'; S.t = 0; doEvent(i); }
  else if (type === 'D') { S.ph = 'duelPick'; S.t = 0; say('¡DUELO!', '', '#d8a0ff'); FX.snd('duel'); askDuel(i); }
}

function doEvent(i) {
  const ev = EVENTS[(Math.random() * EVENTS.length) | 0];
  const others = S.order.filter((k) => k !== i);
  const other = others[(Math.random() * others.length) | 0];
  let sub = ev.sub;
  switch (ev.id) {
    case 'lluvia': S.order.forEach((k) => addCoins(k, 5)); FX.snd('coin'); break;
    case 'ladron': if (other !== undefined) { const n = Math.min(5, S.coins[other]); addCoins(other, -n); addCoins(i, n); sub = `${n} MONEDAS DE {${other}} PARA {${i}}`; } FX.snd('coin'); break;
    case 'turbo': S.steps = 3; S.noEvent = true; break;
    case 'cambio': if (other !== undefined) { const a = S.pos[i]; S.pos[i] = S.pos[other]; S.pos[other] = a; sub = `{${i}} Y {${other}} CAMBIAN DE LUGAR`; } break;
    case 'mudanza': moveCopa(); break;
    case 'mala': addCoins(i, -5); FX.snd('lose'); break;
    default: break;
  }
  S.evId = ev.id;
  say(ev.title, sub, '#39d98a');
  FX.snd('event');
}

function moveCopa() {
  let k = S.copa, guard = 0;
  while (guard++ < 50) {
    k = 1 + ((Math.random() * (N - 1)) | 0);
    const d = Math.min(Math.abs(k - S.copa), N - Math.abs(k - S.copa));
    if (d >= 6 && !S.order.some((p) => S.pos[p] === k)) break;
  }
  S.copa = k;
}

function askBuy(i) {
  S.ch = { type: 'buy', who: i, title: `¿COMPRÁS LA COPA? (${COPA_COST} MONEDAS)`, opts: ['SÍ', 'NO'], vals: [true, false], sel: 0 };
  S.ph = 'buy'; S.t = 0; S.botT = rnd(0.8, 1.3);
}
function askDuel(i) {
  const others = S.order.filter((k) => k !== i);
  S.ch = { type: 'duel', who: i, title: 'ELEGÍ RIVAL', opts: others.map((k) => `{${k}}`), vals: others, sel: 0 };
  S.botT = rnd(0.9, 1.4);
}

function nextPlayer() {
  S.cur++;
  if (S.cur >= S.order.length) { S.cur = 0; enter('mgIntro'); }
  else enter('turn');
}

// entrada del jugador de turno: botón de golpe y flechas (con flanco)
function readIn(i) {
  const p = game.players[i];
  let x = 0, y = 0, hit = false;
  if (p.ctrl === 'local') { const c = input.ctl[p.pad || 'all']; x = c.x; y = c.y; hit = !!p.bHit; }
  else if (p.ctrl === 'remote' && p.net) { x = p.net.x || 0; y = p.net.y || 0; hit = !!p.net.hit; p.net.hit = false; }
  p.bHit = false;
  const q = Math.abs(x) > 0.5 ? Math.sign(x) : Math.abs(y) > 0.5 ? -Math.sign(y) : 0;
  const edge = q !== 0 && q !== p.bQ ? q : 0;
  p.bQ = q;
  return { edge, hit };
}

function handleChoice(dt) {
  const c = S.ch; if (!c) return null;
  if (isHuman(c.who)) {
    const inp = readIn(c.who);
    if (inp.edge) { c.sel = (c.sel + inp.edge + c.opts.length) % c.opts.length; FX.snd('dice'); }
    if (inp.hit && S.t > 0.25) return c.vals[c.sel];
    return null;
  }
  if (S.t < S.botT) return null;
  if (c.type === 'buy') return true;
  // bot: desafía al que más monedas tiene
  return c.vals.reduce((a, b) => (S.coins[b] > S.coins[a] ? b : a), c.vals[0]);
}

/* ---------- simulación ---------- */
function step(dt) {
  if (game.minigame !== 'fiesta') return;          // ya se lanzó un minijuego en este mismo cuadro
  if (game.state === 'count') game.state = 'play';
  if (game.state !== 'play') return;
  syncLeft();
  S.t += dt;
  if (S.flashT > 0) S.flashT -= dt;
  const i = who();
  // los que no están de turno no acumulan golpes
  game.players.forEach((p) => { if (p.i !== i || !['roll', 'buy', 'duelPick'].includes(S.ph)) { p.bHit = false; if (p.net && S.ph !== 'roll' && S.ph !== 'buy' && S.ph !== 'duelPick') p.net.hit = false; } });

  switch (S.ph) {
    case 'intro': if (S.t > 3) enter('turn'); break;
    case 'turn': if (S.t > 1.3) enter('roll'); break;
    case 'roll': {
      S.spin += dt;
      if (S.spin > 0.07) { S.spin = 0; S.dice = (S.dice % 6) + 1; if (isHuman(i)) FX.snd('dice'); }
      const inp = isHuman(i) ? readIn(i) : null;
      if ((inp && inp.hit && S.t > 0.3) || (!isHuman(i) && S.t > S.botT)) {
        if (!isHuman(i)) S.dice = 1 + ((Math.random() * 6) | 0);
        S.steps = S.dice; FX.snd('confirm');
        const s = SPACES[S.pos[i]]; FX.sparkle(s.x, 2.8, s.z, P.YELLOW, 10);
        enter('move');
      }
      break;
    }
    case 'move':
      if (S.t > HOP) {
        S.t = 0;
        S.pos[i] = (S.pos[i] + 1) % N; S.steps--; FX.snd('hop');
        if (S.pos[i] === S.copa) {
          if (S.coins[i] >= COPA_COST) { askBuy(i); break; }
          flash('NO ALCANZAN LAS MONEDAS PARA LA COPA');
        }
        if (S.steps <= 0) enter('land');
      }
      break;
    case 'buy': {
      const v = handleChoice(dt);
      if (v === null) break;
      S.ch = null;
      if (v) {
        addCoins(i, -COPA_COST); S.cups[i]++; FX.snd('cup');
        const s = SPACES[S.pos[i]]; FX.sparkle(s.x, 1.5, s.z, P.YELLOW, 16);
        flash(`¡COPA PARA {${i}}!`);
        moveCopa();
      }
      S.ph = S.steps > 0 ? 'move' : 'land'; S.t = 0;
      if (S.ph === 'land') enter('land');
      break;
    }
    case 'land':
      if (S.t > 1.5) nextPlayer();
      break;
    case 'event':
      if (S.t > 2.0) {
        if (S.evId === 'turbo') { S.evId = ''; S.ph = 'move'; S.t = 0; break; }
        nextPlayer();
      }
      break;
    case 'duelPick': {
      if (S.t < 1.0) break;
      const v = handleChoice(dt);
      if (v === null) break;
      S.ch = null;
      const acts = activeMinigames();
      S.duel = [i, v]; S.pick = acts[(Math.random() * acts.length) | 0].id;
      say(`{${i}} VS {${v}}`, mgById(S.pick).name, '#d8a0ff');
      S.ph = 'duelIntro'; S.t = 0; FX.snd('duel');
      break;
    }
    case 'duelIntro': if (S.t > 3.6) launchMinigame(S.pick, S.duel); break;
    case 'duelRes': if (S.t > 2.8) { S.duel = null; S.res = null; nextPlayer(); } break;
    case 'mgIntro': {
      const acts = activeMinigames();
      if (S.t < 2.0) { const k = ((S.t * 8) | 0) % acts.length; if (acts[k].id !== S.pick) { S.pick = acts[k].id; FX.snd('dice'); } }
      else if (!S.picked) { S.pick = acts[(Math.random() * acts.length) | 0].id; S.picked = true; FX.snd('confirm'); }
      if (S.t > 4.6) { S.picked = false; S.duel = null; launchMinigame(S.pick, S.order.slice()); }
      break;
    }
    case 'mgRes':
      if (S.t > 3.4) {
        S.res = null; S.turn++;
        if (S.turn > S.maxT) finish(); else { S.cur = 0; enter('turn'); }
      }
      break;
    case 'final':
      if (S.t > 5.5 && !game.pendingEnd) { game.winner = S.fin[0]; game.pendingEnd = true; }
      break;
    default: break;
  }
}

function finish() {
  S.fin = S.order.slice().sort((a, b) => S.cups[b] - S.cups[a] || S.coins[b] - S.coins[a]);
  S.ph = 'final'; S.t = 0;
  FX.snd('fanfare');
}

/* ---------- visual ---------- */
const vis = [0, 1, 2, 3].map(() => ({ x: 0, z: 0, fx: 0, fz: 0, tx: 0, tz: 0, t: 1, dur: HOP, idx: -1, arc: 1 }));
const camPos = new THREE.Vector3(0, 26, 22), camLook = new THREE.Vector3(0, 0, 0);
let copaIdx = -1;
// lugares dentro del casillero según cuántos estén ahí (para que no se encimen)
const OFFS = {
  1: [[0, 0]],
  2: [[-0.6, 0], [0.6, 0]],
  3: [[-0.62, 0.35], [0.62, 0.35], [0, -0.6]],
  4: [[-0.62, 0.5], [0.62, 0.5], [-0.62, -0.5], [0.62, -0.5]],
};
const PIECE = 0.44;          // tamaño de las naves en el tablero

function spot(i) {
  const same = S.order.filter((k) => S.pos[k] === S.pos[i]);
  const o = OFFS[Math.min(4, same.length)][Math.max(0, same.indexOf(i))];
  const sp = SPACES[S.pos[i]];
  return [sp.x + o[0], sp.z + o[1]];
}

function visuals(dt) {
  const clock = game.clock;
  W.spin.forEach((o) => (o.rotation.y += dt * 1.2));
  W.props.forEach((r) => { r.m.position.y = r.y + Math.sin(clock * 0.6 + r.ph) * 0.4; });
  W.seaM.uniforms.uOff.value.set((clock * 0.01) % 1, (clock * 0.004) % 1);

  // piezas (las mismas naves, en chiquito)
  const active = who();
  for (const p of game.players) {
    const m = p.mesh;
    if (p.empty || !S.order.includes(p.i)) { m.root.visible = false; m.sh.visible = false; continue; }
    if (p.death) { p.death = null; resetPodVisual(p); }
    m.root.visible = true;
    const v = vis[p.i];
    if (v.idx < 0) { const [tx, tz] = spot(p.i); Object.assign(v, { x: tx, z: tz, fx: tx, fz: tz, tx, tz, t: 1, idx: S.pos[p.i] }); }
    else if (v.idx !== S.pos[p.i]) {
      const [tx, tz] = spot(p.i);
      const next = v.idx >= 0 && (v.idx + 1) % N === S.pos[p.i];
      Object.assign(v, { fx: v.x, fz: v.z, tx, tz, t: 0, dur: v.idx < 0 ? 0.001 : next ? HOP * 0.9 : 0.7, arc: next ? 0.9 : 3, idx: S.pos[p.i] });
    } else { const [tx, tz] = spot(p.i); v.tx = tx; v.tz = tz; }
    v.t = Math.min(1, v.t + dt / v.dur);
    const e = v.t < 1 ? v.t : 1;
    v.x = v.fx + (v.tx - v.fx) * e; v.z = v.fz + (v.tz - v.fz) * e;
    if (v.t >= 1) { v.x += (v.tx - v.x) * Math.min(1, dt * 8); v.z += (v.tz - v.z) * Math.min(1, dt * 8); }
    const y = 0.3 + Math.sin(Math.PI * e) * v.arc * (v.t < 1 ? 1 : 0) + Math.sin(clock * 5 + p.i) * 0.04;
    p.x = v.x; p.z = v.z;
    m.root.position.set(v.x, y, v.z);
    m.root.scale.setScalar(PIECE);
    m.root.rotation.set(0, dirAt(S.pos[p.i]), 0);
    m.hullM.uniforms.uEmissive.value.setRGB(0, 0, 0);
    m.sh.position.set(v.x, 0.32, v.z); m.sh.scale.set(1.95 * PIECE, 1, 1.6 * PIECE); m.sh.visible = true;
  }
  // anillo y dado sobre el jugador de turno
  const av = vis[active] || vis[0];
  const showRing = ['turn', 'roll', 'move', 'buy', 'land', 'event', 'duelPick'].includes(S.ph);
  W.ring.visible = showRing && active !== undefined;
  W.ring.position.set(av.x, 0.36, av.z);
  W.ring.scale.setScalar(1 + Math.sin(clock * 6) * 0.08);
  W.dice.visible = S.ph === 'roll';
  W.dice.position.set(av.x, 2.9 + Math.sin(clock * 4) * 0.1, av.z);
  W.dice.rotation.set(clock * 3, clock * 4, 0);
  // copa: se desliza a su casillero nuevo
  const cs = SPACES[S.copa], [ox, oz] = outward(S.copa);
  const cx = cs.x + ox * 1.5, cz = cs.z + oz * 1.5;
  if (copaIdx < 0) { copaIdx = S.copa; W.copa.userData.t = 1; W.copa.position.set(cx, 0, cz); }
  else if (copaIdx !== S.copa) { copaIdx = S.copa; W.copa.userData.t = 0; }
  W.copa.userData.t = Math.min(1, (W.copa.userData.t || 0) + dt * 1.2);
  W.copa.position.x += (cx - W.copa.position.x) * Math.min(1, dt * 3);
  W.copa.position.z += (cz - W.copa.position.z) * Math.min(1, dt * 3);
  W.copa.position.y = Math.sin(Math.PI * W.copa.userData.t) * 3;
  W.cupSmall.rotation.y += dt * 1.5;

  // cámara: sigue al de turno; vista general en la intro, el sorteo y el final
  const wide = ['intro', 'mgIntro', 'mgRes', 'final', 'idle'].includes(S.ph);
  const tp = wide ? new THREE.Vector3(0, 27, 21) : new THREE.Vector3(av.x * 0.6, 17.5, av.z + 14.5);
  const tl = wide ? new THREE.Vector3(0, 0, 0.5) : new THREE.Vector3(av.x * 0.9, 0, av.z - 0.8);
  camPos.lerp(tp, Math.min(1, dt * 2.5)); camLook.lerp(tl, Math.min(1, dt * 3));
  fiesta.cam.pos.copy(camPos); fiesta.cam.look.copy(camLook);
}

/* ---------- HUD ---------- */
function coinIcon(x, y) { rect(x + 1, y, 4, 6, '#ffc83a'); rect(x, y + 1, 6, 4, '#ffc83a'); rect(x + 2, y + 1, 2, 4, '#b8801a'); }
function cupIcon(x, y) { rect(x, y, 7, 3, '#ffc83a'); rect(x + 1, y + 3, 5, 1, '#ffc83a'); rect(x + 3, y + 4, 1, 2, '#ffc83a'); rect(x + 1, y + 6, 5, 1, '#ffc83a'); }

function drawScore(p, x, y) {
  if (p.empty || !S.order.includes(p.i)) { txt('--', x, y, 16, '#555b6e', 'center', COL.goldShadow); return; }
  rect(x - 17, y - 2, 34, 31, 'rgba(4,6,14,.55)');
  cupIcon(x - 14, y + 1); txt(String(S.cups[p.i]), x + 2, y, 8, COL.gold, 'left');
  coinIcon(x - 14, y + 11); txt(String(S.coins[p.i]), x + 2, y + 10, 8, '#ffe070', 'left');
  if (who() === p.i && ((game.clock * 4) | 0) % 2) { rect(x - 13, 2, 26, 1, COL.gold); rect(x - 13, 27, 26, 1, COL.gold); }
}

const V3 = new THREE.Vector3();
function project(x, y, z, hw) { V3.set(x, y, z).project(camera); return [Math.round(((V3.x + 1) / 2) * hw), Math.round(((1 - V3.y) / 2) * 240)]; }
function banner(hw, y, big, small, col) {
  rect(0, y - 6, hw, small ? 40 : 30, 'rgba(4,6,14,.72)');
  txt(fmt(big), hw / 2, y, 16, col || COL.gold, 'center', COL.goldShadow);
  if (small) txt(fmt(small), hw / 2, y + 21, 8, COL.white, 'center');
}
function keyFor(i) {
  const p = game.players[i];
  if (input.device === 'gamepad' || p.pad === 'p3' || p.pad === 'p4') return 'A';
  return p.pad === 'p2' ? 'E' : 'ESPACIO';
}
const mine = (i) => game.players[i] && game.players[i].ctrl === 'local';

function hud(hw) {
  const i = who();
  const tt = `TURNO ${Math.min(S.turn, S.maxT)}/${S.maxT}`, tw = textWidth(tt, 8) + 12;
  rect(hw / 2 - tw / 2, 4, tw, 15, 'rgba(4,6,14,.6)');
  txt(tt, hw / 2, 8, 8, COL.teal, 'center');
  const av = vis[i] || vis[0];
  switch (S.ph) {
    case 'intro':
      banner(hw, 86, '¡FIESTA!', `${S.maxT} TURNOS · GANA EL QUE JUNTE MÁS COPAS`);
      txt(`LA COPA CUESTA ${COPA_COST} MONEDAS`, hw / 2, 140, 8, '#ffe070', 'center');
      break;
    case 'turn': banner(hw, 156, i === game.me && game.mode !== 'local' ? '¡TU TURNO!' : `TURNO DE {${i}}`, '', S.col); break;
    case 'roll': {
      const [x, y] = project(av.x, 3.6, av.z, hw);
      panel(x - 12, y - 12, 24, 22); txt(String(S.dice), x, y - 7, 16, COL.white, 'center');
      if (mine(i)) txt(`${keyFor(i)}: TIRAR EL DADO`, hw / 2, 208, 8, COL.white, 'center');
      else txt(`TIRA ${pname(i)}...`, hw / 2, 208, 8, COL.dim, 'center');
      break;
    }
    case 'move': {
      const [x, y] = project(av.x, 3.2, av.z, hw);
      if (S.steps > 0) txt(String(S.steps), x, y - 8, 16, COL.gold, 'center', COL.goldShadow);
      break;
    }
    case 'land': case 'event': banner(hw, 150, S.msg, S.sub, S.col); break;
    case 'buy': case 'duelPick':
      if (S.ph === 'duelPick' && S.t < 1.0) { banner(hw, 150, S.msg, mine(i) ? 'ELEGÍ A QUIÉN DESAFIAR' : `{${i}} ELIGE RIVAL`, S.col); break; }
      drawChoice(hw);
      break;
    case 'duelIntro': {
      banner(hw, 62, '¡DUELO!', S.msg, '#d8a0ff');
      drawThumb(S.pick, Math.round(hw / 2 - 48), 112, 96, 54);
      txt(mgById(S.pick).name, hw / 2, 172, 8, COL.teal, 'center');
      howTo(hw, S.pick);
      break;
    }
    case 'mgIntro': {
      banner(hw, 62, '¡MINIJUEGO!', 'PARA TODOS');
      if (S.pick) { drawThumb(S.pick, Math.round(hw / 2 - 48), 112, 96, 54); txt(mgById(S.pick).name, hw / 2, 172, 8, COL.teal, 'center'); }
      if (S.pick && S.t >= 2.0) howTo(hw, S.pick);
      break;
    }
    case 'mgRes': case 'duelRes': drawResults(hw); break;
    case 'final': if (game.state !== 'end') drawFinal(hw); break;     // con el menú de fin, la tabla va adentro del menú
    default: break;
  }
  if (S.flashT > 0) { const f = fmt(S.flash), w = textWidth(f, 8) + 16; rect(hw / 2 - w / 2, 58, w, 16, COL.panel); txt(f, hw / 2, 62, 8, '#ffe070', 'center'); }
}

// cómo se juega: el objetivo y qué hace el botón
function howTo(hw, id) {
  const m = mgById(id);
  rect(0, 184, hw, 30, 'rgba(4,6,14,.72)');
  txt(m.desc, hw / 2, 188, 8, COL.white, 'center');
  txt(`${input.device === 'gamepad' ? 'A' : 'ESPACIO'}: ${m.howTo || 'GOLPE'}`, hw / 2, 201, 8, '#ffb31a', 'center');
}

function drawChoice(hw) {
  const c = S.ch; if (!c) return;
  const w = Math.min(hw - 30, Math.max(textWidth(c.title, 8) + 30, c.opts.length * 70 + 20)), h = 58, x = Math.round(hw / 2 - w / 2), y = 150;
  panel(x, y, w, h);
  const title = mine(c.who) ? c.title : c.type === 'duel' ? 'DUELO: ELIGIENDO RIVAL' : `¿{${c.who}} COMPRA LA COPA?`;
  txt(fmt(title), hw / 2, y + 8, 8, COL.gold, 'center');
  const bw = Math.floor((w - 20) / c.opts.length);
  c.opts.forEach((o, k) => {
    const bx = x + 10 + k * bw, on = k === c.sel;
    rect(bx + 2, y + 22, bw - 4, 16, on ? 'rgba(255,154,31,.25)' : 'rgba(45,224,200,.08)');
    txt(fmt(o), bx + bw / 2, y + 26, 8, on ? COL.white : COL.text, 'center');
  });
  const tip = mine(c.who) ? `←→ ELEGIR · ${keyFor(c.who)}: ACEPTAR` : `ELIGE ${pname(c.who)}...`;
  txt(tip, hw / 2, y + 44, 8, COL.dim, 'center');
}

function drawResults(hw) {
  const r = S.res; if (!r) return;
  const rows = r.ranking.length, w = 220, h = 34 + rows * 14, x = Math.round(hw / 2 - w / 2), y = 80;
  panel(x, y, w, h);
  txt(r.kind === 'duel' ? 'RESULTADO DEL DUELO' : 'RESULTADOS', hw / 2, y + 8, 8, COL.gold, 'center');
  r.ranking.forEach((i, k) => {
    const yy = y + 24 + k * 14;
    txt(`${k + 1}°`, x + 14, yy, 8, COL.dim);
    txt(pname(i), x + 40, yy, 8, CHARS[i].col);
    const g = r.gains[i];
    txt(g > 0 ? `+${g}` : String(g), x + w - 34, yy, 8, g > 0 ? '#ffe070' : g < 0 ? COL.red : COL.dim, 'right');
    coinIcon(x + w - 28, yy + 1);
  });
}

function drawFinal(hw) {
  const f = S.fin; if (!f) return;
  const w = 240, h = 38 + f.length * 16, x = Math.round(hw / 2 - w / 2), y = 60;
  panel(x, y, w, h);
  txt('RESULTADO FINAL', hw / 2, y + 9, 16, COL.gold, 'center', COL.goldShadow);
  f.forEach((i, k) => {
    const yy = y + 32 + k * 16;
    txt(`${k + 1}°`, x + 14, yy, 8, k === 0 ? COL.gold : COL.dim);
    txt(pname(i), x + 40, yy, 8, CHARS[i].col);
    cupIcon(x + w - 86, yy); txt(String(S.cups[i]), x + w - 74, yy, 8, COL.gold);
    coinIcon(x + w - 46, yy + 1); txt(String(S.coins[i]), x + w - 36, yy, 8, '#ffe070');
  });
}

// Tabla final para el menú de fin (copas y monedas de cada uno)
export function fiestaRankArt() {
  const f = S.fin || [];
  return {
    kind: 'art', h: 6 + f.length * 14,
    draw(x, y, w, hw) {
      const cw = 210, cx = Math.round(hw / 2 - cw / 2);
      f.forEach((i, k) => {
        const yy = y + 3 + k * 14;
        txt(`${k + 1}°`, cx, yy, 8, k === 0 ? COL.gold : COL.dim);
        txt(pname(i), cx + 28, yy, 8, CHARS[i].col);
        cupIcon(cx + cw - 76, yy); txt(String(S.cups[i]), cx + cw - 64, yy, 8, COL.gold);
        coinIcon(cx + cw - 36, yy + 1); txt(String(S.coins[i]), cx + cw - 26, yy, 8, '#ffe070');
      });
    },
  };
}

/* ---------- la escena ---------- */
let sendT = 0;
const fiesta = {
  id: 'fiesta',
  name: 'FIESTA',
  desc: 'TIRÁ EL DADO Y JUNTÁ COPAS',
  points: { label: 'TURNOS', values: [10, 15, 20], key: 'turns', demo: 10 },
  cam: { pos: new THREE.Vector3(0, 26, 22), look: new THREE.Vector3(0, 0, 0), rotate: false },
  humanOut: false,
  tagY: 2.3,
  showTags: () => ['turn', 'move'].includes(S.ph),

  build: buildWorld,
  show(on) { if (W.grp) W.grp.visible = on; },
  reset(cfg) {
    if (game.online !== 'guest') {
      if (cfg.resume && base && S.ph !== 'final') { /* vuelve de un minijuego: sigue la Fiesta */ }
      else newFiesta(cfg);
    } else if (S.ph === 'final') S.ph = 'idle';     // invitado: hasta que llegue el estado nuevo no se muestra el final viejo
    vis.forEach((v) => (v.idx = -1));
    copaIdx = -1;
    game.players.forEach((p) => { p.alive = !p.empty; p.bHit = false; p.bQ = 0; });
    if (game.state === 'count') game.state = 'play';     // el tablero no tiene cuenta regresiva
  },
  // foto para los menús: las piezas repartidas por el camino
  thumbSteps: 1,
  thumbCam: { pos: new THREE.Vector3(0, 21, 17), look: new THREE.Vector3(0, -1, 0.3) },
  thumbPrep() { S.pos = [2, 6, 6, 15]; S.ph = 'turn'; S.copa = 10; S.cur = 0; },
  step,
  visuals,
  onLocalHit(p) { p.bHit = true; },
  drawScore,
  hud,

  snapshot() {
    const o = {};
    ['ph', 't', 'cur', 'turn', 'maxT', 'order', 'dice', 'steps', 'pos', 'coins', 'cups', 'copa', 'msg', 'sub', 'col', 'flash', 'flashT', 'ch', 'pick', 'duel', 'res', 'fin']
      .forEach((k) => { o[k] = S[k]; });
    o.t = Math.round(S.t * 100) / 100;
    return o;
  },
  applySnap(A) { Object.assign(S, A); },
  guestLocal(rdt, hits) {
    sendT -= rdt;
    if (sendT > 0) return;
    sendT = 1 / 30;
    const c = input.ctl.all;
    sendInput({ x: Math.round(c.x * 100) / 100, y: Math.round(c.y * 100) / 100, h: hits });
  },
  guestHitFx() {},
};

register(fiesta, { hidden: true });
export default fiesta;
