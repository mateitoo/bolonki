// Bolonki para escritorio (Steam): una ventana de Electron que carga el juego ya compilado (carpeta app/).
// Pantalla completa por defecto, sin menús del navegador, y conexión opcional con Steam (logros y nombre)
// usando steamworks.js: si no está instalado o Steam no está abierto, el juego anda igual.
const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');

// id de la app en Steam: steam_appid.txt al lado del ejecutable (para probar) o la variable STEAM_APPID.
// 480 es "Spacewar", la app de prueba de Valve (sirve para probar logros antes de tener la propia).
function appId() {
  if (process.env.STEAM_APPID) return Number(process.env.STEAM_APPID);
  for (const p of [path.join(path.dirname(process.execPath), 'steam_appid.txt'), path.join(__dirname, 'steam_appid.txt')]) {
    try { return Number(fs.readFileSync(p, 'utf8').trim()); } catch (e) { /* sigue */ }
  }
  return 0;
}

let steam = null;
try {
  const sw = require('steamworks.js');
  const id = appId();
  steam = id ? sw.init(id) : sw.init();
  sw.electronEnableSteamOverlay();          // el overlay de Steam (Shift+Tab) sobre el juego
} catch (e) { steam = null; }

let win = null;
function createWindow() {
  win = new BrowserWindow({
    width: 1280, height: 720, minWidth: 640, minHeight: 360,
    fullscreen: true, backgroundColor: '#000000', autoHideMenuBar: true, show: false,
    title: 'Bolonki',
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false, backgroundThrottling: false },
  });
  win.setMenu(null);
  win.once('ready-to-show', () => win.show());
  win.loadFile(path.join(__dirname, 'app', 'index.html'));
  // prueba automática (BOLONKI_SMOKE=archivo.png): saca una foto a los 7 s y cierra
  if (process.env.BOLONKI_SMOKE) setTimeout(async () => { try { const img = await win.webContents.capturePage(); fs.writeFileSync(process.env.BOLONKI_SMOKE, img.toPNG()); } catch (e) { console.error(e); } app.quit(); }, 7000);
  // los links externos se abren en el navegador, no adentro del juego
  win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });
  // F11 también cambia la pantalla completa
  win.webContents.on('before-input-event', (e, input) => {
    if (input.type === 'keyDown' && input.key === 'F11') { win.setFullScreen(!win.isFullScreen()); e.preventDefault(); }
  });
}

ipcMain.on('quit', () => app.quit());
ipcMain.on('fullscreen', (e, on) => { if (win) win.setFullScreen(!!on); });
ipcMain.on('isFullscreen', (e) => { e.returnValue = !!(win && win.isFullScreen()); });
ipcMain.on('steamName', (e) => { try { e.returnValue = steam ? steam.localplayer.getName() : ''; } catch (er) { e.returnValue = ''; } });
ipcMain.on('achievement', (e, id) => { try { if (steam && !steam.achievement.isActivated(id)) steam.achievement.activate(id); } catch (er) { /* sin Steam */ } });

app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
