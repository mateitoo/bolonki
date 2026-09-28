// HUD dibujado en un canvas de 320x240 con fuente pixel (como el original: 2 retratos a cada lado).
import { W, HH, CHARS, DIFFICULTIES } from './config.js';
import { game } from './state.js';

const PX = "'Press Start 2P', monospace";
let hx = null;

export function initHud(canvas) {
  hx = canvas.getContext('2d');
  hx.imageSmoothingEnabled = false;
  if (document.fonts && document.fonts.load) document.fonts.load(`16px ${PX}`).catch(() => {});
}

function txt(s, x, y, size, col, align, shadow) {
  hx.font = `${size}px ${PX}`; hx.textAlign = align || 'left'; hx.textBaseline = 'top';
  const o = size >= 16 ? 2 : 1;
  hx.fillStyle = shadow || '#000'; hx.fillText(s, x + o, y + o); hx.fillText(s, x - 1, y);
  hx.fillStyle = col; hx.fillText(s, x, y);
}
function pcircle(cx, cy, r, col) {
  hx.fillStyle = col;
  for (let y = -r; y <= r; y++) { const w = Math.floor(Math.sqrt(r * r - y * y + r * 0.8)); hx.fillRect(cx - w, cy + y, w * 2, 1); }
}
function face(i, x, y) {
  const ch = CHARS[i], p = game.players[i];
  hx.fillStyle = '#000'; hx.fillRect(x, y, 24, 24);
  hx.fillStyle = p.flash > 0 && ((game.clock * 16) | 0) % 2 ? '#fff' : ch.col; hx.fillRect(x + 1, y + 1, 22, 22);
  hx.fillStyle = ch.dark; hx.fillRect(x + 2, y + 2, 20, 20);
  const col = p.alive ? ch.col : '#555b6e';
  if (ch.acc === 'ears') { hx.fillStyle = col; hx.fillRect(x + 6, y + 2, 3, 7); hx.fillRect(x + 15, y + 2, 3, 7); }
  if (ch.acc === 'horns') { hx.fillStyle = '#f0e6c8'; hx.fillRect(x + 4, y + 4, 3, 4); hx.fillRect(x + 17, y + 4, 3, 4); }
  if (ch.acc === 'antenna') { hx.fillStyle = '#fff27a'; hx.fillRect(x + 6, y + 3, 2, 2); hx.fillRect(x + 16, y + 3, 2, 2); }
  pcircle(x + 12, y + 14, 7, col);
  hx.fillStyle = '#fff'; hx.fillRect(x + 8, y + 11, 3, 4); hx.fillRect(x + 13, y + 11, 3, 4);
  hx.fillStyle = '#000'; hx.fillRect(x + 9, y + 12, 2, 2); hx.fillRect(x + 14, y + 12, 2, 2);
  if (ch.acc === 'beak') { hx.fillStyle = '#ff7a00'; hx.fillRect(x + 10, y + 16, 4, 2); }
  if (!p.alive) { hx.fillStyle = '#ff3040'; for (let k = 0; k < 20; k++) { hx.fillRect(x + 2 + k, y + 2 + k, 2, 2); hx.fillRect(x + 20 - k, y + 2 + k, 2, 2); } }
}

const HUDPOS = [[12, 0], [50, 2], [W - 74, 1], [W - 36, 3]];

export function drawHud() {
  hx.clearRect(0, 0, W, HH);
  const st = game.state;
  for (const [x, i] of HUDPOS) {
    face(i, x, 3);
    const p = game.players[i];
    txt(String(p.score).padStart(2, '0'), x + 12, 29, 16, p.alive ? '#ff9a1f' : '#555b6e', 'center', '#3a1200');
    if (i === 0 && st !== 'title') txt('1P', x + 12, 48, 8, CHARS[0].col, 'center');
  }
  const blink = ((game.clock * 2.2) | 0) % 2 === 0;
  const diff = DIFFICULTIES[game.difficulty].label;
  if (st === 'title') {
    hx.fillStyle = 'rgba(4,6,14,.72)'; hx.fillRect(0, 86, W, 96);
    txt('BOLA BRAVA', W / 2, 96, 24, '#ff9a1f', 'center', '#3a1200');
    txt(`◀ CPU: ${diff} ▶`, W / 2, 132, 8, '#2de0c8', 'center');
    if (blink) txt('PULSA ESPACIO', W / 2, 152, 8, '#ffffff', 'center');
    txt('DEFENDÉ TU ARCO: 15 PUNTOS', W / 2, 168, 8, '#7a84a8', 'center');
  } else if (st === 'count') {
    const n = Math.ceil(game.countT);
    txt(n > 0 ? String(n) : '¡YA!', W / 2, 104, 32, '#ff9a1f', 'center', '#3a1200');
    txt(`CPU: ${diff}`, W / 2, 146, 8, '#2de0c8', 'center');
  } else if (st === 'paused') {
    hx.fillStyle = 'rgba(4,6,14,.6)'; hx.fillRect(0, 0, W, HH);
    txt('PAUSA', W / 2, 104, 16, '#ffffff', 'center'); txt('P PARA SEGUIR', W / 2, 128, 8, '#2de0c8', 'center');
  } else if (st === 'end') {
    hx.fillStyle = 'rgba(4,6,14,.72)'; hx.fillRect(0, 90, W, 76);
    if (game.winner === 0) txt('¡GANASTE!', W / 2, 104, 24, '#ff9a1f', 'center', '#3a1200');
    else txt('GANA ' + CHARS[game.winner].name, W / 2, 106, 16, CHARS[game.winner].col, 'center');
    if (blink) txt('ESPACIO: REVANCHA', W / 2, 140, 8, '#ffffff', 'center');
  }
  if (st === 'play' && game.humanOut) {
    txt('ELIMINADO', W / 2, 196, 16, '#ff5a5a', 'center');
    if (blink) txt('ESPACIO: REINTENTAR', W / 2, 218, 8, '#ffffff', 'center');
  }
  if (st === 'play' && game.elapsed < 3 && !game.humanOut) txt('TU ARCO ▼', W / 2, 200, 8, '#ffb31a', 'center');
}
