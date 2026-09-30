// Ítem de menú para poner o sacar la pantalla completa (va en las pausas). En un módulo aparte para evitar imports circulares.
import { settings, saveSettings } from '../settings.js';
import { isFullscreen, canFullscreen, enterFullscreen, exitFullscreen } from '../display.js';

export const FS_ACTION = {
  kind: 'action', label: () => (isFullscreen() ? 'SALIR DE PANTALLA COMPLETA' : 'PANTALLA COMPLETA'), hidden: () => !canFullscreen(),
  action: () => { const on = !isFullscreen(); settings.fullscreen = on; saveSettings(); if (on) enterFullscreen(); else exitFullscreen(); },
};
