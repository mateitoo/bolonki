// ¿Hay una versión más nueva publicada? (GitHub Pages / itch.io)
// El celular suele tener la pestaña abierta días enteros con el juego viejo, y con versiones distintas
// no se puede jugar online. Se consulta version.json y, si cambió y no estás en una sala ni jugando,
// se recarga solo (con ?v=… para saltear la copia guardada de la página).
import { room } from './room.js';
import { inDemo } from '../flow.js';

const CURRENT = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '';
export const update = { newer: '' };

async function check() {
  if (!CURRENT || !/^https?:$/.test(location.protocol) || /localhost|127\.0\.0\.1/.test(location.hostname)) return;
  try {
    const r = await fetch(`version.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!r.ok) return;
    const j = await r.json();
    if (j && j.v && j.v !== CURRENT) update.newer = j.v;
  } catch (e) { /* sin conexión o sin version.json: nada */ }
}

function maybeReload() {
  if (!update.newer || room.role !== 'off' || !inDemo()) return;
  const u = new URL(location.href);
  if (u.searchParams.get('v') === update.newer) return;        // ya se intentó con esta versión
  u.searchParams.set('v', update.newer);
  location.replace(u.toString());
}

export function initUpdateCheck() {
  check().then(maybeReload);
  setInterval(() => { check().then(maybeReload); }, 4 * 60 * 1000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) check().then(maybeReload); });
}
