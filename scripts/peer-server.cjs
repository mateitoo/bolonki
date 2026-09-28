// Servidor PeerJS local para probar el multijugador sin internet:
//   npm run peer   y abrir el juego con   ?peer=127.0.0.1:9000
const http = require('http');
const express = require('express');
const { ExpressPeerServer } = require('peer');
const app = express();
const server = http.createServer(app);
app.use('/', ExpressPeerServer(server, { path: '/' }));
server.listen(9000, '127.0.0.1', () => console.log('Servidor PeerJS en 127.0.0.1:9000'));
