// Copia el juego compilado (../dist, de "npm run build" en la carpeta del juego) a desktop/app
const fs = require('fs');
const path = require('path');
const src = path.join(__dirname, '..', '..', 'dist'), dst = path.join(__dirname, '..', 'app');
if (!fs.existsSync(path.join(src, 'index.html'))) { console.error('Falta el juego compilado: corré "npm run build" en la carpeta del juego primero.'); process.exit(1); }
fs.rmSync(dst, { recursive: true, force: true });
fs.cpSync(src, dst, { recursive: true });
console.log('juego copiado a desktop/app');
