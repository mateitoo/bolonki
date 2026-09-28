// Pantalla para escribir texto corto estilo arcade: código de sala, apodo…
// Teclado: se escribe directo. Joystick: ←→ elige la casilla, ↑↓ cambia la letra. Enter / A acepta.
import { ui, txt, rect, tri, textWidth, COL } from './draw.js';
import { customRects } from './menu.js';
import { SFX } from '../audio.js';

export function textEntry(o) {
  const st = { letters: [], pos: 0 };
  const val = () => st.letters.join('').trim();
  const def = {
    id: o.id, title: o.title, width: Math.max(250, o.len * 28 + 40), bodyH: 70, items: [],
    reset(initial) { st.letters = Array.from({ length: o.len }, (_, i) => (initial && initial[i] ? initial[i] : '')); st.pos = Math.min(o.len - 1, (initial || '').length); },
    value: val,
    onEvent(e) {
      const cycle = (d) => {
        const cur = st.letters[st.pos] || '';
        const A = o.alphabet, i = cur ? A.indexOf(cur) : d > 0 ? -1 : 0;
        st.letters[st.pos] = A[(i + d + A.length) % A.length]; SFX.move();
      };
      switch (e.a) {
        case 'char':
          if (!o.alphabet.includes(e.c)) return true;
          st.letters[st.pos] = e.c; st.pos = Math.min(o.len - 1, st.pos + 1); SFX.move(); return true;
        case 'up': if (!e.fromChar) cycle(1); return true;
        case 'down': if (!e.fromChar) cycle(-1); return true;
        case 'left': if (!e.fromChar) { st.pos = Math.max(0, st.pos - 1); SFX.move(); } return true;
        case 'right': if (!e.fromChar) { st.pos = Math.min(o.len - 1, st.pos + 1); SFX.move(); } return true;
        case 'tabPrev': case 'tabNext': case 'hit': case 'pause': return true;
        case 'confirm': case 'start': if (!e.fromChar) submit(); return true;
        case 'back':
          if (e.key === 'Backspace') {
            if (!st.letters[st.pos] && st.pos > 0) st.pos--;
            st.letters[st.pos] = ''; SFX.back(); return true;
          }
          return false;
        case 'click': {
          const r = customRects.find((r) => e.x >= r.x && e.x <= r.x + r.w && e.y >= r.y && e.y <= r.y + r.h);
          if (r) { if (r.i === 'ok') submit(); else { st.pos = r.i; SFX.move(); } return true; }
          return false;
        }
        default: return false;
      }
    },
    body(x, y, w, hw) {
      txt(o.hint, hw / 2, y + 2, 8, COL.dim, 'center');
      const bw = o.len > 4 ? 20 : 26, gap = o.len > 4 ? 4 : 8, total = o.len * bw + (o.len - 1) * gap, bx = hw / 2 - total / 2, by = y + 16;
      for (let i = 0; i < o.len; i++) {
        const cx = bx + i * (bw + gap), on = i === st.pos;
        rect(cx, by, bw, 28, on ? 'rgba(255,154,31,.16)' : 'rgba(45,224,200,.08)');
        rect(cx, by + 26, bw, 2, on ? COL.gold : COL.teal);
        if (on && ((ui.clock * 3) | 0) % 2 === 0) tri(cx + bw / 2 - 4, by - 6, 'd', COL.gold);
        txt(st.letters[i] || '', cx + bw / 2, by + 6, 16, COL.white, 'center');
        customRects.push({ i, x: cx, y: by, w: bw, h: 28 });
      }
      const s = (o.status && o.status()) || { text: 'ENTER PARA ACEPTAR', color: COL.dim };
      txt(s.text, hw / 2, y + 54, 8, s.color, 'center');
      const mw = textWidth(s.text, 8);
      customRects.push({ i: 'ok', x: hw / 2 - mw / 2, y: y + 50, w: mw, h: 14 });
    },
    onBack: o.onCancel,
  };
  function submit() {
    const v = val();
    if (v.length < (o.minLen || 1)) { SFX.back(); if (o.onShort) o.onShort(); return; }
    o.onSubmit(v);
  }
  return def;
}
