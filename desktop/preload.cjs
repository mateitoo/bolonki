// Lo que el juego puede pedirle a la versión de escritorio (window.bolonkiDesktop)
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('bolonkiDesktop', {
  quit: () => ipcRenderer.send('quit'),
  setFullscreen: (on) => ipcRenderer.send('fullscreen', on),
  isFullscreen: () => ipcRenderer.sendSync('isFullscreen'),
  steamName: () => ipcRenderer.sendSync('steamName'),
  achievement: (id) => ipcRenderer.send('achievement', id),
});
