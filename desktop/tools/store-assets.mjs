// Genera las imágenes de la tienda de Steam sacando fotos del juego (modo ?capsule=...).
// Uso (con el juego andando en http://localhost:4173, por ejemplo "npm run preview" en la carpeta del juego):
//   cd desktop && npm install && node tools/store-assets.mjs [url-base]
// Deja todo en ../steam/assets. Tamaños según la guía de Steam (cápsulas, biblioteca, capturas e íconos).
import puppeteer from 'puppeteer';
import { mkdirSync } from 'fs';

const BASE = process.argv[2] || 'http://localhost:4173/';
const OUT = new URL('../../steam/assets/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

// [archivo, ancho, alto, parámetros, escala, formato]
export const ASSETS = [
  ['header_capsule.jpg', 920, 430, 'capsule=art&mg=bolas&map=2&ls=48&ly=0.47', 1],
  ['small_capsule.jpg', 462, 174, 'capsule=art&mg=bolas&map=2&ls=56&ly=0.5', 1],
  ['main_capsule.jpg', 1232, 706, 'capsule=art&mg=futbol&map=0&ls=48&ly=0.42&tag=PARTY%20GAME%20%C2%B7%20DE%201%20A%204%20JUGADORES', 1],
  ['vertical_capsule.jpg', 748, 896, 'capsule=art&mg=hexagonos&map=1&ls=24&ly=0.3', 1],
  ['library_capsule.jpg', 600, 900, 'capsule=art&mg=empujon&map=1&ls=20&ly=0.26', 1],
  ['library_hero.jpg', 1920, 620, 'capsule=hero&mg=colina', 2],
  ['library_logo.png', 1280, 720, 'capsule=logo&ls=56&ly=0.5', 1, 'png'],
  ['community_icon.jpg', 184, 184, 'capsule=art&mg=petardos&lt=B&ls=120&ly=0.5', 1],
  ['client_icon.png', 256, 256, 'capsule=art&mg=petardos&lt=B&ls=120&ly=0.5', 1, 'png'],
];
// capturas de partidas (con la interfaz normal): 1920x1080
const SHOTS = [['bolas', 2], ['futbol', 3], ['hexagonos', 3], ['bombardeo', 3], ['colina', 0], ['petardos', 1], ['empujon', 1]];

const browser = await puppeteer.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage();
await page.goto(BASE, { waitUntil: 'load' });
await page.evaluate(() => localStorage.setItem('bolonki:settings', JSON.stringify({ fullscreen: false, quality: '480', scanlines: false, v: 6 })));
for (const [file, w, h, q, scale, fmt] of ASSETS) {
  await page.setViewport({ width: w, height: h, deviceScaleFactor: scale });
  await page.goto(`${BASE}?${q}`, { waitUntil: 'load' });
  await new Promise((r) => setTimeout(r, 4500));
  await page.screenshot({ path: OUT + file, type: fmt === 'png' ? 'png' : 'jpeg', quality: fmt === 'png' ? undefined : 92, omitBackground: q.includes('capsule=logo') });
  console.log('ok', file);
}
await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
for (const [k, [mg, map]] of SHOTS.entries()) {
  await page.goto(`${BASE}?debug`, { waitUntil: 'load' });
  await new Promise((r) => setTimeout(r, 1500));
  await page.keyboard.press('Space'); await new Promise((r) => setTimeout(r, 600));
  await page.evaluate((mg, map) => { const B = window.__bolonki; const s = B.demoSetup(mg); Object.assign(s, { mode: 'solo', ctrl: ['ai', 'ai', 'ai', 'ai'], me: 0, map }); B.closeAllMenus(); B.resetMatch('count', s); B.game.countT = 0.05; B.game.intro = false; }, mg, map);
  await new Promise((r) => setTimeout(r, 6000));
  await page.screenshot({ path: `${OUT}screenshot_${k + 1}_${mg}.jpg`, type: 'jpeg', quality: 92 });
  console.log('ok captura', mg);
}
await browser.close();
