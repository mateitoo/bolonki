// HUD (retratos y puntajes anclados a los bordes), pantalla de título, carteles y menús.
// Se dibuja en un canvas de hw x 240 (hw depende de la relación de aspecto).
import { CHARS, DIFFICULTIES } from './config.js';
import { game } from './state.js';
import { view } from './display.js';
import { ui, txt, rect, tri, COL, PX } from './ui/draw.js';
import { drawMenu, menuOpen } from './ui/menu.js';
import { input } from './input.js';

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
  const ch = CHARS[i], p = game.players[i];
  rect(x, y, 24, 24, '#000');
  rect(x + 1, y + 1, 22, 22, p.flash > 0 && ((game.clock * 16) | 0) % 2 ? '#fff' : ch.col);
  rect(x + 2, y + 2, 20, 20, ch.dark);
  const col = p.alive ? ch.col : '#555b6e';
  if (ch.acc === 'ears') { rect(x + 6, y + 2, 3, 7, col); rect(x + 15, y + 2, 3, 7, col); }
  if (ch.acc === 'horns') { rect(x + 4, y + 4, 3, 4, '#f0e6c8'); rect(x + 17, y + 4, 3, 4, '#f0e6c8'); }
  if (ch.acc === 'antenna') { rect(x + 6, y + 3, 2, 2, '#fff27a'); rect(x + 16, y + 3, 2, 2, '#fff27a'); }
  pcircle(x + 12, y + 14, 7, col);
  rect(x + 8, y + 11, 3, 4, '#fff'); rect(x + 13, y + 11, 3, 4, '#fff');
  rect(x + 9, y + 12, 2, 2, '#000'); rect(x + 14, y + 12, 2, 2, '#000');
  if (ch.acc === 'beak') rect(x + 10, y + 16, 4, 2, '#ff7a00');
  if (!p.alive) { hx.fillStyle = '#ff3040'; for (let k = 0; k < 20; k++) { hx.fillRect(x + 2 + k, y + 2 + k, 2, 2); hx.fillRect(x + 20 - k, y + 2 + k, 2, 2); } }
}

function drawScores(hw, st) {
  // como el original: dos retratos a la izquierda y dos a la derecha, pegados a los bordes
  const pos = [[12, 0], [50, 2], [hw - 74, 1], [hw - 36, 3]];
  for (const [x, i] of pos) {
    face(i, x, 3);
    const p = game.players[i];
    txt(String(p.score).padStart(2, '0'), x + 12, 29, 16, p.alive ? COL.gold : '#555b6e', 'center', COL.goldShadow);
    if (i === 0 && st !== 'title' && st !== 'menu') txt('1P', x + 12, 48, 8, CHARS[0].col, 'center');
  }
}

function drawTitle(hw) {
  const blink = ((game.clock * 2.2) | 0) % 2 === 0;
  rect(0, 78, hw, 104, COL.dark);
  rect(0, 78, hw, 1, '#1d6e68'); rect(0, 181, hw, 1, '#1d6e68');
  txt('BOLONKI', hw / 2, 94, 32, COL.gold, 'center', COL.goldShadow);
  if (blink) txt(input.device === 'gamepad' ? 'PULSA START' : 'PULSA ENTER', hw / 2, 144, 8, COL.white, 'center');
  txt('PARTY GAME DE ARENA · 4 JUGADORES', hw / 2, 162, 8, COL.teal, 'center');
}

export function drawHud() {
  const hw = view.hw, st = game.state;
  ui.clock = game.clock;
  hx.clearRect(0, 0, hw, 240);

  drawScores(hw, st);
  const blink = ((game.clock * 2.2) | 0) % 2 === 0;

  if (st === 'title') drawTitle(hw);
  else if (st === 'count') {
    const n = Math.ceil(game.countT);
    txt(n > 0 ? String(n) : '¡YA!', hw / 2, 100, 32, COL.gold, 'center', COL.goldShadow);
    txt(`CPU: ${DIFFICULTIES[game.difficulty].label}`, hw / 2, 142, 8, COL.teal, 'center');
  }
  if (st === 'play' && game.humanOut) {
    txt('ELIMINADO', hw / 2, 190, 16, COL.red, 'center');
    if (blink) txt(input.device === 'gamepad' ? 'A: REINTENTAR   START: PAUSA' : 'ENTER: REINTENTAR   ESC: PAUSA', hw / 2, 212, 8, COL.white, 'center');
  }
  if (st === 'play' && game.elapsed < 3 && !game.humanOut) {
    txt('TU ARCO', hw / 2, 170, 8, '#ffb31a', 'center');
    tri(hw / 2 - 4, 182, 'd', '#ffb31a');
  }

  if (menuOpen() && !(game.showcaseT > 0)) {
    rect(0, 0, hw, 240, st === 'menu' ? 'rgba(4,6,14,.45)' : COL.dark);
    drawMenu(hw);
  }

  if (toast.t > 0) {
    toast.t -= 1 / 60;
    const w = toast.text.length * 8 + 20;
    rect(hw / 2 - w / 2, 58, w, 16, COL.panel);
    txt(toast.text, hw / 2, 62, 8, COL.teal, 'center');
  }
}
