// Multijugador: crear sala, unirse con código, sala de espera, pausa y fin de partida online.
import { CHARS, DIFFICULTIES, DIFF_ORDER } from './config.js';
import { game } from './state.js';
import { room, ALPHA, MAX_PLAYERS, createRoom, joinRoom, leaveRoom, setRoomOpt, canStart, humanCount, setRoomHandlers } from './net/room.js';
import { hostStart, hostGuestLeft, hostBackToLobby, endOnline, guestStart, guestSnap, setGuestEndHandler } from './net/online.js';
import { resetMatch } from './game/match.js';
import { openMenu, replaceMenus, closeMenu, closeAllMenus, topMenu, customRects } from './ui/menu.js';
import { ui, txt, rect, tri, textWidth, COL } from './ui/draw.js';
import { SFX } from './audio.js';
import { showToast } from './hud.js';
import { MAIN, JUGAR, OPTIONS, goMainMenu } from './flow.js';

const yesNo = [{ v: true, label: 'SÍ' }, { v: false, label: 'NO' }];
const diffValues = DIFF_ORDER.map((d) => ({ v: d, label: DIFFICULTIES[d].label }));
const pointValues = [5, 10, 15].map((n) => ({ v: n, label: String(n) }));

export const MULTI = {
  id: 'multi', title: 'MULTIJUGADOR', width: 240,
  items: [
    { kind: 'action', label: 'CREAR SALA', action: () => { createRoom(); openMenu(HOST_LOBBY); } },
    { kind: 'action', label: 'UNIRSE A SALA', action: () => { code.letters = ['', '', '', '']; code.pos = 0; openMenu(JOIN); } },
  ],
};

/* ---------- encabezado con el código de sala ---------- */
function roomHeader(x, y, w, hw) {
  const st = room.status;
  txt('CÓDIGO', hw / 2, y, 8, COL.dim, 'center');
  const c = room.code || '····';
  const cw = 4 * 22 - 4, cx = hw / 2 - cw / 2;
  for (let i = 0; i < 4; i++) {
    rect(cx + i * 22, y + 10, 18, 20, 'rgba(45,224,200,.10)');
    rect(cx + i * 22, y + 28, 18, 2, COL.teal);
    txt(c[i] || '', cx + i * 22 + 9, y + 12, 16, COL.gold, 'center', COL.goldShadow);
  }
  const msg = st === 'error' ? room.error
    : room.role === 'host' ? (st === 'ready' ? `COMPARTÍ EL CÓDIGO · ${humanCount()}/${MAX_PLAYERS}` : 'CREANDO SALA...')
    : 'CONECTADO · ESPERANDO AL ANFITRIÓN';
  txt(msg, hw / 2, y + 35, 8, st === 'error' ? COL.red : COL.teal, 'center');
  rect(x + 6, y + 46, w - 12, 1, '#1d6e68');
}

function slotLabel(i) {
  const s = room.slots[i];
  if (!s) return '...';
  if (s.kind === 'host') return room.role === 'host' ? 'VOS · ANFITRIÓN' : 'ANFITRIÓN';
  if (s.kind === 'guest') return room.role === 'guest' && i === room.mySlot ? 'VOS' : 'JUGADOR';
  return room.opts.bots ? 'BOT' : 'VACÍO · ARCO CERRADO';
}
const slotRows = () => [0, 1, 2, 3].map((i) => ({
  kind: 'info', label: CHARS[i].name, value: () => slotLabel(i),
  valueColor: () => { const s = room.slots[i]; return s && s.kind !== 'empty' ? COL.white : COL.dim; },
}));

export const HOST_LOBBY = {
  id: 'hostLobby', title: 'CREAR SALA', width: 300, headerH: 50, rowH: 13,
  header: roomHeader,
  items: [
    ...slotRows(),
    { kind: 'choice', label: 'BOTS', values: yesNo, get: () => room.opts.bots, set: (v) => setRoomOpt('bots', v) },
    { kind: 'choice', label: 'DIFICULTAD BOTS', values: diffValues, hidden: () => !room.opts.bots,
      get: () => room.opts.difficulty, set: (v) => setRoomOpt('difficulty', v) },
    { kind: 'choice', label: 'PUNTOS', values: pointValues, get: () => room.opts.points, set: (v) => setRoomOpt('points', v) },
    { kind: 'action', label: 'COMENZAR', action: () => {
      if (canStart()) { closeAllMenus(); hostStart(); return; }
      showToast(room.status !== 'ready' ? 'LA SALA TODAVÍA SE ESTÁ CREANDO' : 'FALTAN JUGADORES (O ACTIVÁ LOS BOTS)');
    } },
  ],
  onBack: () => { leaveRoom(); closeMenu(); },
};

export const GUEST_LOBBY = {
  id: 'guestLobby', title: 'SALA', width: 300, headerH: 50, rowH: 13,
  header: roomHeader,
  items: [
    ...slotRows(),
    { kind: 'info', label: 'BOTS', value: () => (room.opts.bots ? 'SÍ' : 'NO') },
    { kind: 'info', label: 'DIFICULTAD BOTS', hidden: () => !room.opts.bots, value: () => (DIFFICULTIES[room.opts.difficulty] || {}).label || '' },
    { kind: 'info', label: 'PUNTOS', value: () => String(room.opts.points) },
  ],
  onBack: () => { leaveRoom(); closeMenu(); },
};

/* ---------- ingreso de código estilo arcade ---------- */
const code = { letters: ['', '', '', ''], pos: 0 };
const codeStr = () => code.letters.join('');

function tryJoin() {
  if (codeStr().length < 4) { SFX.back(); showToast('FALTAN LETRAS'); return; }
  if (room.role === 'guest' && room.status === 'connecting') return;
  SFX.confirm();
  joinRoom(codeStr());
}
function cycle(d) {
  const cur = code.letters[code.pos];
  const i = cur ? ALPHA.indexOf(cur) : d > 0 ? -1 : 0;
  code.letters[code.pos] = ALPHA[(i + d + ALPHA.length) % ALPHA.length];
  SFX.move();
}

export const JOIN = {
  id: 'join', title: 'UNIRSE A SALA', width: 260, bodyH: 70, items: [],
  onEvent(e) {
    switch (e.a) {
      case 'char': {
        if (!ALPHA.includes(e.c)) return true;
        code.letters[code.pos] = e.c; code.pos = Math.min(3, code.pos + 1); SFX.move(); return true;
      }
      case 'up': if (e.fromChar) return true; cycle(1); return true;
      case 'down': if (e.fromChar) return true; cycle(-1); return true;
      case 'left': if (e.fromChar) return true; code.pos = Math.max(0, code.pos - 1); SFX.move(); return true;
      case 'right': if (e.fromChar) return true; code.pos = Math.min(3, code.pos + 1); SFX.move(); return true;
      case 'tabPrev': case 'tabNext': case 'hit': case 'pause': return true;
      case 'confirm': case 'start': if (e.fromChar) return true; tryJoin(); return true;
      case 'back':
        if (e.key === 'Backspace') {
          if (!code.letters[code.pos] && code.pos > 0) code.pos--;
          code.letters[code.pos] = ''; SFX.back(); return true;
        }
        if (room.role === 'guest') leaveRoom();
        return false;
      case 'click': {
        const r = customRects.find((r) => e.x >= r.x && e.x <= r.x + r.w && e.y >= r.y && e.y <= r.y + r.h);
        if (r) { if (r.i === 'join') tryJoin(); else { code.pos = r.i; SFX.move(); } return true; }
        return false;
      }
      default: return false;
    }
  },
  body(x, y, w, hw) {
    txt('ESCRIBÍ EL CÓDIGO DE LA SALA', hw / 2, y + 2, 8, COL.dim, 'center');
    const bw = 26, gap = 8, total = 4 * bw + 3 * gap, bx = hw / 2 - total / 2, by = y + 16;
    for (let i = 0; i < 4; i++) {
      const cx = bx + i * (bw + gap), on = i === code.pos;
      rect(cx, by, bw, 28, on ? 'rgba(255,154,31,.16)' : 'rgba(45,224,200,.08)');
      rect(cx, by + 26, bw, 2, on ? COL.gold : COL.teal);
      if (on && ((ui.clock * 3) | 0) % 2 === 0) { tri(cx + bw / 2 - 4, by - 6, 'd', COL.gold); }
      txt(code.letters[i] || '', cx + bw / 2, by + 6, 16, COL.white, 'center');
      customRects.push({ i, x: cx, y: by, w: bw, h: 28 });
    }
    const st = room.role === 'guest' ? room.status : 'idle';
    const msg = st === 'connecting' ? 'CONECTANDO...' : st === 'error' ? room.error : 'ENTER PARA ENTRAR';
    txt(msg, hw / 2, y + 54, 8, st === 'error' ? COL.red : st === 'connecting' ? COL.teal : COL.dim, 'center');
    const mw = textWidth(msg, 8);
    customRects.push({ i: 'join', x: hw / 2 - mw / 2, y: y + 50, w: mw, h: 14 });
  },
  onBack: () => { if (room.role === 'guest') leaveRoom(); closeMenu(); },
};

/* ---------- dentro de la partida ---------- */
export const ONLINE_PAUSE = {
  id: 'onlinePause', title: 'MENÚ', width: 220,
  items: [
    { kind: 'info', label: 'LA PARTIDA SIGUE' },
    { kind: 'action', label: 'CONTINUAR', action: () => closeAllMenus() },
    { kind: 'action', label: 'OPCIONES', action: () => openMenu(OPTIONS) },
    { kind: 'action', label: 'SALIR DE LA SALA', danger: true, action: () => exitRoom() },
  ],
  onBack: () => closeAllMenus(),
};

function winnerTitle() {
  const w = game.winner;
  if (w === game.me) return { title: '¡GANASTE!', color: COL.gold };
  return { title: `GANA ${CHARS[w] ? CHARS[w].name : '?'}`, color: CHARS[w] ? CHARS[w].col : COL.white };
}

export function onlineEndMenu() {
  const t = winnerTitle();
  if (game.online === 'host') {
    return {
      id: 'endHost', title: t.title, titleColor: t.color, offsetY: 16,
      items: [
        { kind: 'action', label: 'REVANCHA', action: () => { if (canStart()) { closeAllMenus(); hostStart(); } else showToast('FALTAN JUGADORES'); } },
        { kind: 'action', label: 'VOLVER A LA SALA', action: () => { hostBackToLobby(); toLobbyScreen(HOST_LOBBY); } },
        { kind: 'action', label: 'SALIR DE LA SALA', danger: true, action: () => exitRoom() },
      ],
      onBack: () => {},
    };
  }
  return {
    id: 'endGuest', title: t.title, titleColor: t.color, offsetY: 16,
    items: [
      { kind: 'info', label: 'ESPERANDO AL ANFITRIÓN' },
      { kind: 'action', label: 'SALIR DE LA SALA', danger: true, action: () => exitRoom() },
    ],
    onBack: () => {},
  };
}

// Vuelve a la sala de espera (con el menú armado para poder retroceder)
function toLobbyScreen(lobby) {
  resetMatch('menu'); game.state = 'menu';
  replaceMenus(MAIN); openMenu(JUGAR); openMenu(MULTI); openMenu(lobby);
}
export function exitRoom() {
  leaveRoom(); endOnline();
  resetMatch('menu'); game.state = 'menu';
  replaceMenus(MAIN); openMenu(JUGAR); openMenu(MULTI);
}

/* ---------- mensajes de la red ---------- */
export function initMultiplayer() {
  setGuestEndHandler(() => replaceMenus(onlineEndMenu()));
  setRoomHandlers({
    onChange() {
      // al conectarse, la pantalla del código pasa a la sala de espera
      const top = topMenu();
      if (top && top.def === JOIN && room.role === 'guest' && room.status === 'joined') { closeMenu(); openMenu(GUEST_LOBBY); SFX.confirm(); }
    },
    onStart(m) { closeAllMenus(); guestStart(m); },
    onSnap(m) { if (game.online === 'guest') guestSnap(m); },
    onToLobby() { endOnline(); toLobbyScreen(GUEST_LOBBY); },
    onClosed() {
      showToast('LA SALA SE CERRÓ');
      endOnline(); resetMatch('menu'); game.state = 'menu';
      replaceMenus(MAIN); openMenu(JUGAR); openMenu(MULTI);
    },
    onGuestLeft(slot) { showToast(`${CHARS[slot].name} SE DESCONECTÓ`); hostGuestLeft(slot); },
  });
}

export { goMainMenu };
