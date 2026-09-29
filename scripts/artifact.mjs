// Convierte dist-single/index.html en dist-single/artifact.html (sin <html>/<head>/<body>),
// que es el formato que usa la preview publicada en claude.ai.
import { readFileSync, writeFileSync } from 'node:fs';

const html = readFileSync('dist-single/index.html', 'utf8');
const head = (html.match(/<head>([\s\S]*?)<\/head>/) || [])[1] || '';
const body = (html.match(/<body[^>]*>([\s\S]*?)<\/body>/) || [])[1] || '';   // <body> puede tener atributos
if (!body.includes('id="stage"')) throw new Error('artifact.html quedaría sin el contenido del <body>');
const clean = head
  .replace(/<meta charset[^>]*>\s*/i, '')
  .replace(/<meta name="viewport"[^>]*>\s*/i, '')
  .trim();
// el <title> tiene que quedar al principio
const title = (clean.match(/<title>[\s\S]*?<\/title>/) || [''])[0];
const rest = clean.replace(title, '').trim();
writeFileSync('dist-single/artifact.html', `${title}\n${rest}\n${body.trim()}\n`);
console.log('dist-single/artifact.html listo');
