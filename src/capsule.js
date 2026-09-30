// Modo "cápsula" (?capsule=...): para sacar las imágenes de la tienda de Steam desde el juego mismo.
//   ?capsule=art&mg=bolas&map=2&ls=48&ly=0.45  -> escena del minijuego con el logo encima (cápsulas)
//   ?capsule=hero&mg=futbol                      -> solo la escena, sin logo (fondo de la biblioteca)
//   ?capsule=logo&ls=56                          -> solo el logo, con fondo transparente (logo de la biblioteca)
// La relación de aspecto no se limita (sirve para cápsulas verticales o el fondo de 3840x1240).
export const capsule = (() => {
  try {
    const q = new URLSearchParams(location.search), mode = q.get('capsule');
    if (!mode) return null;
    return { mode, mg: q.get('mg') || 'bolas', map: Number(q.get('map') || 0), size: Number(q.get('ls') || 48), y: Number(q.get('ly') || 0.45), tag: q.get('tag') || '', text: q.get('lt') || 'BOLONKI' };
  } catch (e) { return null; }
})();

export function initCapsule() {
  if (!capsule || capsule.mode !== 'logo') return;
  const css = document.createElement('style');
  css.textContent = 'html,body,.stage,.screen{background:transparent!important} #gl{visibility:hidden} .screen.scanlines::after{display:none}';
  document.head.appendChild(css);
}
