# Bolonki

Party game de arena para 4 jugadores con estética PS1 (320×240, vértices que tiemblan, texturas afines, dithering).
Cada jugador defiende su arco con 15 puntos. Cada pelota que entra resta uno, y al llegar a 0 quedás eliminado.

## Jugar

Abre en la pantalla de título; al pulsar Enter/Start pasa a pantalla completa (se puede desactivar en Opciones → Video).

| Acción | Teclado | Joystick |
|---|---|---|
| Mover / navegar menús | Flechas o WASD | Stick izquierdo o cruceta |
| Aceptar / golpe fuerte | Enter / Espacio / Ctrl | A (golpe también con X) |
| Volver | Esc / Backspace | B |
| Pausa | Esc / P | Start |
| Cambiar solapa (Opciones) | Q / E | LB / RB |
| Pantalla completa | F | |

También se puede usar el mouse en los menús, y en el celular aparecen botones táctiles.

## Minijuegos

Bolonki es un juego grande con varios minijuegos adentro. Se elige el minijuego al armar la partida (solitario, local u online).

- **Bola Brava:** cada uno defiende su arco; las pelotas salen de las torres. Se juega a 5, 10 o 15 puntos (vidas).
- **Empujón:** todos arriba de una plataforma de hielo sobre un abismo con magma. Las naves se mueven libres y patinan;
  el botón de golpe es una **embestida**. Gana la ronda el último que queda arriba; gana la partida el primero que llega a 1, 2 o 3 rondas.
  A los 14 segundos la plataforma empieza a achicarse.

Al elegir el minijuego se ve una vista previa chiquita (una foto que el juego saca de cada minijuego al arrancar, `src/render/thumbs.js`) y su descripción.

Para sumar un minijuego: crear `src/minigames/<nombre>.js` con la forma que describe `src/minigames/registry.js`,
registrarlo con `register()` e importarlo en `src/main.js`. Los menús, el local, el online, la pausa y el HUD lo toman solos.

## Modos

- **Solitario:** vos contra 3 bots (dificultad y puntos a elección).
- **Multijugador → Local:** 2 a 4 jugadores en la misma compu. J1 usa flechas + espacio/ctrl (o joystick 1), J2 usa WASD + E/Q (o joystick 2), J3 y J4 usan los joysticks 3 y 4. Los lugares libres pueden tener bots o quedar con el arco cerrado. Los controles son relativos a la pantalla: los de arriba y abajo se mueven con izquierda/derecha, los de los costados con arriba/abajo.
- **Multijugador → Crear sala:** te da un código de 4 letras. Hasta 4 jugadores; bots sí/no (y su dificultad), puntos y sala privada o pública. Sin bots, los lugares vacíos quedan con el arco cerrado.
- **Multijugador → Unirse a sala:** escribís el código (con teclado, o letra por letra con la cruceta).
- **Multijugador → Salas públicas:** lista de salas abiertas para entrar sin código.
- **Apodo:** se pide la primera vez que entrás al online y se ve en la sala y arriba de tu nave.

En la sala cada invitado marca **LISTO** y se ve el **ping** de cada uno. Al terminar, la **revancha se vota**: cuando votan todos, arranca sola.
Si a alguien se le corta la conexión, se le guarda el lugar 12 segundos y el juego intenta **reconectarlo** solo.

Cada jugador ve su propio arco abajo (la cámara se rota según su lugar).

### Cómo funciona la red

Es de navegador a navegador (WebRTC con [PeerJS](https://peerjs.com)). Quien crea la sala es el anfitrión: su máquina corre la partida
(pelotas, goles, bots) y manda el estado 20 veces por segundo; cada invitado manda la posición de su nave 30 veces por segundo y
dibuja 100 ms "en el pasado" para que todo se vea suave. Para encontrarse usa el servidor público gratuito de PeerJS.

Las **salas públicas** no necesitan servidor propio: cada sala pública ocupa uno de 12 "carteles" (ids fijos en el servidor de PeerJS)
y quien busca les pregunta a los 12. Es una solución provisoria (máximo 12 salas públicas a la vez) hasta pasar a los lobbies de Steam.

Para probar sin internet: `npm run peer` y abrir el juego con `?peer=127.0.0.1:9000` en dos pestañas (`&debug` deja el estado en `window.__bolonki`).

## Opciones

Menú principal a pantalla completa (Jugar, Opciones y Salir en la esquina). Las opciones van en solapas y en ningún menú hay fila "Volver": se vuelve con B / Esc o tocando VOLVER en la barra de abajo.

- **Video:** pantalla completa, aspecto (panorámico o 4:3), calidad (240p, 480p por defecto, o HD), escalado entero (automático, sí o no), scanlines.
- **Audio:** volumen de efectos.
- **Partida:** dificultad de la CPU (fácil, intermedio, difícil, extremo) y puntos (5, 10 o 15).
- **Extras:** animación de derrota y "ver derrota en CPU".

Todo se guarda en el navegador.

## Pantalla y resolución

La altura interna es siempre de 240 líneas, como la PS1. El ancho depende de la pantalla:
320×240 en 4:3, 384×240 en 16:10, 426×240 en 16:9 y hasta 560×240 en 21:9.
En panorámico se ve más a los costados de la arena con la misma altura (Hor+), y el HUD se ancla a los bordes.

## Desarrollo

```bash
npm install
npm run dev          # servidor local con recarga en vivo
npm run build        # versión para publicar en dist/
npm run build:single # un solo HTML (dist-single/) para la preview de claude.ai
```

## Publicación

Cada push a `main` compila y publica en GitHub Pages (`.github/workflows/deploy.yml`).
Hay que activarlo una vez en el repo: **Settings → Pages → Source: GitHub Actions**.

Para itch.io: `npm run build`, comprimir el contenido de `dist/` en un .zip y subirlo como proyecto HTML.

## Estructura

```
src/
  main.js            punto de entrada y loop (física a 120 Hz fijos)
  config.js          medidas de la arena, personajes, pelotas y DIFICULTADES
  state.js           estado compartido de la partida
  render/psx.js      shaders y materiales estilo PS1, modo PS1 on/off
  render/textures.js texturas procedurales
  world/arena.js     piso, torres, arcos, láseres y chevrones
  world/pods.js      naves y pilotos
  world/balls.js     pelotas
  game/physics.js    movimiento, rebotes, goles y colisiones
  game/ai.js         IA de la CPU
  game/match.js      reglas: reinicio, disparos de torre, goles, eliminación
  deaths/            animaciones de derrota (una por archivo; fall.js es la caída de Empujón)
  fx/particles.js    chispas, humo, escombros, estela de las pelotas
  visuals.js         animación por frame y cámara
  hud.js             retratos, puntajes, título y carteles
  input.js           entrada unificada: teclado, joystick, mouse y táctil
  display.js         resolución, relación de aspecto y pantalla completa
  settings.js        opciones guardadas
  flow.js            título, menús, partida, pausa y fin
  minigames/         cada minijuego (registry.js explica la forma; bolas.js y empujon.js)
  multiplayer.js     menús de multijugador: local, crear sala, unirse, salas públicas, apodo, sala de espera, fin online
  net/room.js        conexión PeerJS: código, lugares, listo, ping, votos, reconexión y salas públicas
  net/online.js      sincronización: snapshots del anfitrión e interpolación del invitado
  game/fx.js         efectos como eventos (se reproducen igual en todas las máquinas)
  game/controls.js   controles de cada nave local relativos a la pantalla
  ui/textEntry.js    pantalla para escribir (código de sala, apodo)
  ui/menu.js         motor de menús: lista grande, ventana y solapas; barra de botones al pie
  ui/draw.js         dibujo pixel del HUD y menús
  audio.js           sonidos sintetizados
```

## Cómo ajustar cosas comunes

- **Dificultad de la CPU:** `DIFFICULTIES` en `src/config.js` (velocidad, error, reacción, anticipación y uso del golpe fuerte).
- **Pelotas (velocidad, cantidad):** `BALL` en `src/config.js`.
- **Nueva animación de derrota:** crear un archivo en `src/deaths/` con `{ id, name, dur, start, update }` y sumarlo a `src/deaths/index.js`. El selector se llena solo.

Personajes, nombres y arte son originales.
