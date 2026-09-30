// HUD (retratos y puntajes anclados a los bordes), pantalla de título, carteles y menús.
// Se dibuja en un canvas de hw x 240 (hw depende de la relación de aspecto).
import { DIFFICULTIES } from './config.js';
import { charOf } from './chars.js';
import { game } from './state.js';
import { view } from './display.js';
import { ui, txt, rect, tri, COL, PX, textWidth } from './ui/draw.js';
import { drawMenu, menuOpen, topMenu, FOOT_Y } from './ui/menu.js';
import { input, actKey, isTouch } from './input.js';
import { camera } from './render/psx.js';
import { room } from './net/room.js';
import * as THREE from 'three';
import { settings } from './settings.js';
import { mg } from './minigames/registry.js';
import { beginThumbs, flushThumbs, hiTxt, hiImage } from './render/thumbStore.js';
import { portraits, drawPortrait } from './render/portraits.js';

let hx = null;
const toast = { text: '', t: 0 };

export function initHud(canvas) {
  hx = canvas.getContext('2d');
  ui.ctx = hx;
  if (document.fonts && document.fonts.load) document.fonts.load(`16px ${PX}`).catch(() => {});
}
export function showToast(text) { toast.text = text; toast.t = 2.5; }

function pcircle(cx, cy, r, col) {
  hx.fillStyle = col;
  for (let y = -r; y <= r; y++) { const w = Math.floor(Math.sqrt(r * r - y * y + r * 0.8)); hx.fillRect(cx - w, cy + y, w * 2, 1); }
}
function face(i, x, y) {
  const ch = charOf(i), p = game.players[i];
  if (p.empty) { rect(x, y, 24, 24, '#000'); rect(x + 1, y + 1, 22, 22, '#20263a'); rect(x + 6, y + 11, 12, 2, '#3a4570'); return; }
  rect(x, y, 24, 24, '#000');
  rect(x + 1, y + 1, 22, 22, p.flash > 0 && ((game.clock * 16) | 0) % 2 ? '#fff' : ch.col);
  rect(x + 2, y + 2, 20, 20, ch.dark);
  const col = p.alive ? ch.col : '#555b6e';
  if (ch.model === 'clown' || ch.model === 'gnome') { personFace(ch.model, x, y, p.alive); crossOut(p, x, y); return; }
  if (ch.model) {                         // los personajes nuevos: su retrato 3D (nítido si está vivo; oscuro y tachado si no)
    const ci = p.mesh && p.mesh.ci >= 0 ? p.mesh.ci : i;
    if (p.alive && portraits[ci]) hiImage(portraits[ci], x + 2, y + 2, 20, 20); else drawPortrait(ci, x + 2, y + 2, 20, 20, true);
    crossOut(p, x, y); return;
  }
  if (ch.acc === 'ears') { rect(x + 6, y + 2, 3, 7, col); rect(x + 15, y + 2, 3, 7, col); }
  if (ch.acc === 'horns') { rect(x + 4, y + 4, 3, 4, '#f0e6c8'); rect(x + 17, y + 4, 3, 4, '#f0e6c8'); }
  if (ch.acc === 'antenna') { rect(x + 6, y + 3, 2, 2, '#fff27a'); rect(x + 16, y + 3, 2, 2, '#fff27a'); }
  pcircle(x + 12, y + 14, 7, col);
  rect(x + 8, y + 11, 3, 4, '#fff'); rect(x + 13, y + 11, 3, 4, '#fff');
  rect(x + 9, y + 12, 2, 2, '#000'); rect(x + 14, y + 12, 2, 2, '#000');
  if (ch.acc === 'beak') rect(x + 10, y + 16, 4, 2, '#ff7a00');
  crossOut(p, x, y);
}
function crossOut(p, x, y) {
  if (!p.alive) { hx.fillStyle = '#ff3040'; for (let k = 0; k < 20; k++) { hx.fillRect(x + 2 + k, y + 2 + k, 2, 2); hx.fillRect(x + 20 - k, y + 2 + k, 2, 2); } }
}
// Retratos de los personajes con ropa (payaso, gnomo)
function personFace(model, x, y, alive) {
  const g = (c) => (alive ? c : '#555b6e');
  if (model === 'clown') {
    rect(x + 4, y + 8, 4, 11, g('#c85a1e')); rect(x + 16, y + 8, 4, 11, g('#c85a1e'));
    pcircle(x + 12, y + 14, 6, g('#a8cbd2'));
    rect(x + 5, y + 3, 14, 3, g('#2f62d8')); rect(x + 4, y + 6, 16, 4, g('#2548b0'));
    for (const ex of [9, 15]) { rect(x + ex - 1, y + 12, 3, 1, '#3a2624'); rect(x + ex, y + 11, 1, 3, '#3a2624'); }
    rect(x + 11, y + 14, 2, 2, g('#ff3a1a'));
    rect(x + 9, y + 18, 6, 1, g('#d2645e')); rect(x + 8, y + 19, 2, 1, g('#d2645e')); rect(x + 14, y + 19, 2, 1, g('#d2645e'));
  } else {
    rect(x + 3, y + 12, 3, 2, g('#e2a47e')); rect(x + 18, y + 12, 3, 2, g('#e2a47e')); rect(x + 2, y + 11, 2, 1, g('#e2a47e')); rect(x + 20, y + 11, 2, 1, g('#e2a47e'));
    pcircle(x + 12, y + 15, 6, g('#e2a47e'));
    for (let k = 0; k < 9; k++) rect(Math.round(x + 12 - k * 0.8), y + 1 + k, Math.round(k * 1.6) + 1, 1, g('#b9cf82'));
    rect(x + 5, y + 9, 14, 2, g('#a6bd6c'));
    rect(x + 8, y + 13, 3, 2, '#f4f0ea'); rect(x + 10, y + 13, 1, 2, '#111'); rect(x + 13, y + 13, 3, 2, '#f4f0ea'); rect(x + 15, y + 13, 1, 2, '#111');
    rect(x + 11, y + 15, 2, 2, g('#c98462'));
    rect(x + 10, y + 18, 4, 1, '#9a2a22');
  }
}

function drawScores(hw, st) {
  // como el original: dos retratos a la izquierda y dos a la derecha, pegados a los bordes
  // abajo de cada uno, quién es: VOS, CPU o el nombre del jugador. Si hay nombres largos se separan más los retratos
  // y, si igual no entran, se escriben con letra más chica
  const m = mg();
  const tags = game.players.map((p, i) => {
    if (p.empty) return '';
    const bot = p.ctrl === 'ai' || (p.ctrl === 'net' && p.isBot);
    if (game.mode === 'local') return bot ? 'CPU' : p.name || `J${i + 1}`;
    return i === game.me ? 'VOS' : bot ? 'CPU' : (p.name || 'JUG').toUpperCase();
  });
  const maxW = Math.max(24, ...tags.map((t) => (t ? textWidth(t, 8) : 0)));
  const sp = Math.round(Math.max(38, Math.min(62, maxW + 6)));
  const pos = [[12, 0], [12 + sp, 2], [hw - 36 - sp, 1], [hw - 36, 3]];
  const ny = m.noScoreRow ? 31 : 48;
  for (const [x, i] of pos) {
    face(i, x, 3);
    const p = game.players[i];
    m.drawScore(p, x + 12, 29);
    const tag = tags[i]; if (!tag) continue;
    const bot = tag === 'CPU';
    const mine = game.mode === 'local' ? !bot && !p.empty : i === game.me;
    const col = mine ? charOf(i).col : COL.dim, w = textWidth(tag, 8), room = sp - 4;
    if (w <= room) { txt(tag, x + 12, ny, 8, col, 'center'); continue; }
    let size = Math.max(4, (8 * room) / w), t = tag;
    while (t.length > 3 && (textWidth(t, 8) * size) / 8 > room) t = t.slice(0, -1);
    if (t !== tag) t = t.slice(0, -1) + '.';
    hiTxt(t, x + 12.5, ny + 1.5, size, 'rgba(0,0,0,.8)', 'center');
    hiTxt(t, x + 12, ny + 1, size, col, 'center');
  }
}

export const pingColor = (ms) => (ms < 90 ? '#39d98a' : ms < 170 ? '#ffd23a' : COL.red);

// Nombre arriba de cada nave: J1..J4 en el local, apodos en el online (menos el tuyo)
const v3 = new THREE.Vector3();
function drawNameTags(hw, st) {
  if (game.mode === 'demo') return;
  if (st !== 'play' && st !== 'count' && st !== 'end' && st !== 'paused') return;
  if (st === 'count' && game.intro && game.countT > 3) return;          // durante las instrucciones no van los nombres
  // en Empujón las naves se mezclan: se marca también la tuya con "VOS"; en el tablero, todos con su nombre
  const board = game.minigame === 'fiesta';
  const m = mg(), tagY = m.tagY || 4.1;
  const markMe = (m.markMe || game.minigame === 'empujon' || board) && game.mode !== 'local';
  if (m.showTags && !m.showTags()) return;
  for (const p of game.players) {
    if (p.empty || p.death || p.hideTag || (board && !p.mesh.root.visible)) continue;
    const mine = p.i === game.me && game.mode !== 'local';
    if (settings.tags === false && !(mine && markMe)) continue;           // opción: sin nombres (salvo tu "VOS")
    const name = mine ? (markMe ? 'VOS' : null) : p.name;
    if (!name) continue;
    v3.set(p.x, tagY + (m.tagFeet ? p.fy || 0 : 0), p.z).project(camera);
    if (v3.z > 1) continue;
    const x = Math.round((v3.x + 1) / 2 * hw), y = Math.round((1 - v3.y) / 2 * 240) - 4, ty = Math.max(58, Math.min(214, y));
    txt(name, x, ty, 8, charOf(p.i).col, 'center');
    // al arrancar: una flecha que salta señalando tu personaje (en el local, la de cada jugador de esta pantalla)
    const start = st === 'count' || (st === 'play' && game.elapsed < 3.5);
    if (start && p.ctrl === 'local' && !board) {
      const by = ty + 9 + Math.round(Math.abs(Math.sin(game.clock * 7)) * 3), col = charOf(p.i).col;
      for (let k = 0; k < 6; k++) { rect(x - 6 + k + 1, by + k + 1, 12 - k * 2, 1, 'rgba(0,0,0,.7)'); rect(x - 6 + k, by + k, 12 - k * 2, 1, col); }
    }
  }
}

function drawTitle(hw) {
  const blink = ((game.clock * 2.2) | 0) % 2 === 0;
  rect(0, 78, hw, 104, COL.dark);
  rect(0, 78, hw, 1, '#1d6e68'); rect(0, 181, hw, 1, '#1d6e68');
  txt('BOLONKI', hw / 2, 94, 32, COL.gold, 'center', COL.goldShadow);
  if (blink) txt(input.device === 'gamepad' ? 'PULSA CUALQUIER BOTÓN' : 'PULSA CUALQUIER TECLA', hw / 2, 144, 8, COL.white, 'center');
  txt('PARTY GAME DE ARENA · 4 JUGADORES', hw / 2, 162, 8, COL.teal, 'center');
}

// Al entrar a un minijuego: las instrucciones en un recuadro, con la cuenta para empezar
function wrapLine(t, max) {
  const out = []; let cur = '';
  for (const w of t.split(' ')) { if ((cur + ' ' + w).trim().length > max && cur) { out.push(cur); cur = w; } else cur = (cur + ' ' + w).trim(); }
  if (cur) out.push(cur);
  return out;
}
function drawIntro(hw, n) {
  const m = mg(), K = actKey();
  const w = Math.min(hw - 24, 380), x = Math.round(hw / 2 - w / 2), max = Math.floor((w - 16) / 8);
  const lines = [];
  (m.rules ? m.rules(K) : [m.desc]).forEach((r, i) => wrapLine(r, max).forEach((l) => lines.push([l, i === 0 ? '#ffb31a' : COL.white])));
  const meta = [];
  if (game.setup && game.setup.fiesta) meta.push([game.setup.duel ? '¡DUELO!' : 'MINIJUEGO DE LA FIESTA', game.setup.duel ? '#d8a0ff' : COL.teal]);
  if (game.players.some((p) => p.ctrl === 'ai' || p.isBot)) meta.push([`CPU: ${DIFFICULTIES[game.difficulty].label}${game.online !== 'off' ? ' · PARTIDA ONLINE' : ''}`, COL.teal]);
  else if (game.online !== 'off') meta.push(['PARTIDA ONLINE', COL.teal]);
  if (m.cam.orbit) wrapLine(input.device === 'gamepad' ? 'STICK DERECHO: GIRAR LA CÁMARA' : isTouch() ? 'ARRASTRÁ EL DEDO: GIRAR LA CÁMARA' : 'ARRASTRÁ EL MOUSE: GIRAR LA CÁMARA', max).forEach((l) => meta.push([l, COL.dim]));
  const h = 42 + lines.length * 12 + (meta.length ? 8 + meta.length * 11 : 0) + 20, y = Math.max(54, Math.round(132 - h / 2));
  rect(x, y, w, h, 'rgba(6,10,22,.92)');
  rect(x, y, w, 1, '#1d6e68'); rect(x, y + h - 1, w, 1, '#1d6e68'); rect(x, y, 1, h, '#1d6e68'); rect(x + w - 1, y, 1, h, '#1d6e68');
  rect(x, y, w, 14, '#1d6e68');
  txt('INSTRUCCIONES', x + w / 2, y + 3, 8, COL.white, 'center');
  txt(m.name, x + w / 2, y + 20, 16, COL.gold, 'center', COL.goldShadow);
  lines.forEach(([l, c], i) => txt(l, x + w / 2, y + 42 + i * 12, 8, c, 'center'));
  if (meta.length) {
    const my = y + 42 + lines.length * 12 + 4;
    rect(x + 10, my, w - 20, 1, '#2a3150');
    meta.forEach(([l, c], i) => txt(l, x + w / 2, my + 5 + i * 11, 8, c, 'center'));
  }
  rect(x, y + h - 16, w, 15, 'rgba(29,110,104,.35)');
  txt(`EMPIEZA EN ${n}`, x + w / 2, y + h - 12, 8, COL.white, 'center');
}

export function drawHud() {
  beginThumbs();
  const hw = view.hw, st = game.state;
  ui.clock = game.clock;
  hx.clearRect(0, 0, hw, 240);

  const demo = st === 'title' || st === 'menu';
  if (!demo) drawScores(hw, st);
  const blink = ((game.clock * 2.2) | 0) % 2 === 0;

  if (st === 'title') drawTitle(hw);
  else if (st === 'count' && game.intro && game.countT > 3 && game.mode !== 'demo') drawIntro(hw, Math.ceil(game.countT));
  else if (st === 'count') {
    game.intro = false;
    const n = Math.ceil(game.countT);
    txt(n > 0 ? String(n) : '¡YA!', hw / 2, 100, 32, COL.gold, 'center', COL.goldShadow);
    const bots = game.players.some((p) => p.ctrl === 'ai' || p.isBot);
    if (bots) txt(`CPU: ${DIFFICULTIES[game.difficulty].label}`, hw / 2, 142, 8, COL.teal, 'center');
    if (game.online !== 'off') txt('PARTIDA ONLINE', hw / 2, 156, 8, COL.dim, 'center');
    // minijuego que salió en la Fiesta
    if (game.setup && game.setup.fiesta) {
      const duel = !!game.setup.duel;
      txt(duel ? '¡DUELO!' : 'MINIJUEGO DE LA FIESTA', hw / 2, 64, 8, duel ? '#d8a0ff' : COL.teal, 'center');
    }
    if (mg().cam.orbit && game.mode !== 'demo') txt(input.device === 'gamepad' ? 'STICK DERECHO: GIRAR LA CÁMARA' : isTouch() ? 'ARRASTRÁ EL DEDO: GIRAR LA CÁMARA' : 'ARRASTRÁ EL MOUSE: GIRAR CÁMARA · C', hw / 2, 204, 8, COL.dim, 'center');
    // local en Bola Brava: los de los costados se mueven con arriba/abajo
    if (game.mode === 'local' && game.minigame === 'bolas' && game.players.some((p) => p.ctrl === 'local' && p.i % 2 === 1)) {
      txt('LOS DE LOS COSTADOS: ARRIBA / ABAJO', hw / 2, 170, 8, '#ffb31a', 'center');
    }
  }
  const fiestaMg = !!(game.setup && game.setup.fiesta);
  const meP = game.players[game.me];
  if (st === 'play' && game.humanOut) {
    txt('ELIMINADO', hw / 2, 190, 16, COL.red, 'center');
    if (game.online !== 'off' || fiestaMg) txt('MIRANDO LA PARTIDA', hw / 2, 212, 8, COL.dim, 'center');
    else if (blink) txt(input.device === 'gamepad' ? 'A: REINTENTAR   START: PAUSA' : 'ENTER: REINTENTAR   ESC: PAUSA', hw / 2, 212, 8, COL.white, 'center');
  }
  if (!demo && !(st === 'count' && game.intro && game.countT > 3)) mg().hud(hw, st);   // durante las instrucciones, solo el recuadro
  // Fiesta: en un duelo en el que no jugás, mirás
  if (fiestaMg && meP && meP.empty && game.mode !== 'local' && (st === 'play' || st === 'count')) txt('MIRANDO EL DUELO', hw / 2, 212, 8, COL.dim, 'center');
  // Fiesta: terminó el minijuego, se ve quién ganó antes de volver al tablero
  if (fiestaMg && st === 'end') {
    const w = game.players[game.winner];
    if (w) {
      const me = game.winner === game.me && game.mode !== 'local';
      rect(0, 90, hw, 40, 'rgba(4,6,14,.72)');
      txt(me ? '¡GANASTE!' : `GANA ${w.name || charOf(w.i).name}`, hw / 2, 96, 16, me ? COL.gold : charOf(w.i).col, 'center', COL.goldShadow);
      txt('VOLVIENDO AL TABLERO...', hw / 2, 117, 8, COL.dim, 'center');
    }
  }
  if (game.minigame === 'bolas' && st === 'play' && game.elapsed < 3 && !game.humanOut && game.mode !== 'local' && meP && !meP.empty) {
    txt('TU ARCO', hw / 2, 170, 8, '#ffb31a', 'center');
    tri(hw / 2 - 4, 182, 'd', '#ffb31a');
  }
  if (!demo) drawNameTags(hw, st);
  if (game.online === 'guest' && room.status === 'reconnecting' && blink) txt('RECONECTANDO...', hw / 2, 120, 16, COL.red, 'center');
  // tu ping con el anfitrión (online, como invitado)
  if (game.online === 'guest' && (st === 'play' || st === 'count')) {
    const ms = room.myPing || 0;
    txt(`${ms} MS`, hw - 8, 228, 8, pingColor(ms), 'right');
  }

  if (menuOpen() && !(game.showcaseT > 0)) {
    rect(0, 0, hw, 240, topMenu().def.dim || (st === 'menu' ? 'rgba(4,6,14,.4)' : COL.dark));
    drawMenu(hw);
  }

  if (toast.t > 0) {
    toast.t -= 1 / 60;
    const w = toast.text.length * 8 + 20, ty = menuOpen() ? FOOT_Y - 22 : 58;   // con un menú abierto, abajo (no tapa el título)
    rect(hw / 2 - w / 2, ty, w, 16, COL.panel);
    txt(toast.text, hw / 2, ty + 4, 8, COL.teal, 'center');
  }
  // opción: cuadros por segundo (arriba a la derecha, chiquito)
  if (settings.fps) {
    const now = performance.now(); fpsN++;
    if (now - fpsT >= 500) { fpsV = Math.round((fpsN * 1000) / (now - fpsT)); fpsN = 0; fpsT = now; }
    hiTxt(`${fpsV} FPS`, 4, 233, 5, fpsV >= 50 ? '#39d98a' : fpsV >= 30 ? '#ffd23a' : COL.red, 'left');
  }
  flushThumbs();                                  // las fotos de los minijuegos, nítidas, en su capa
}
let fpsT = 0, fpsN = 0, fpsV = 0;
