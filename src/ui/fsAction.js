// Ítem de menú para poner o sacar la pantalla completa (va en las pausas). En un módulo aparte para evitar imports circulares.
import { settings, saveSettings } from '../settings.js';
import { isFullscreen, canFullscreen, enterFullscreen, exitFullscreen } from '../display.js';
import { game } from '../state.js';
import { resetZoom } from '../input.js';

export const FS_ACTION = {
  kind: 'action', label: () => (isFullscreen() ? 'SALIR DE PANTALLA COMPLETA' : 'PANTALLA COMPLETA'), hidden: () => !canFullscreen(),
  action: () => { const on = !isFullscreen(); settings.fullscreen = on; saveSettings(); if (on) enterFullscreen(); else exitFullscreen(); },
};

// Volver la cámara a como viene (si la giraste arrastrando) y sacar el zoom del navegador en el celular
export const CAM_ACTION = {
  kind: 'action', label: 'CENTRAR LA CÁMARA', hidden: () => !(game.camYaw || game.camPitch),
  action: () => { game.camYaw = 0; game.camPitch = 0; resetZoom(); },
};
