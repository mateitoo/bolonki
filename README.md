# Bolonki

Party game de arena para 4 jugadores con estética PS1 (320×240, vértices que tiemblan, texturas afines, dithering).
Cada jugador defiende su arco con 15 puntos. Cada pelota que entra resta uno, y al llegar a 0 quedás eliminado.

## Jugar

Abre en la pantalla de título; al pulsar Enter/Start pasa a pantalla completa (se puede desactivar en Opciones → Video).

| Acción | Teclado | Joystick |
|---|---|---|
| Mover / navegar menús | Flechas o WASD | Stick izquierdo o cruceta |
| Aceptar / golpe fuerte | Enter / Espacio | A (golpe también con X) |
| Volver | Esc / Backspace | B |
| Pausa | Esc / P | Start |
| Pantalla completa | F | |

También se puede usar el mouse en los menús, y en el celular aparecen botones táctiles.

## Opciones

- **Video:** pantalla completa, aspecto (panorámico o 4:3), calidad (240p, 480p o nítida), escalado entero, scanlines.
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
  deaths/            animaciones de derrota (una por archivo)
  fx/particles.js    chispas, humo, escombros, estela de las pelotas
  visuals.js         animación por frame y cámara
  hud.js             retratos, puntajes, título y carteles
  input.js           entrada unificada: teclado, joystick, mouse y táctil
  display.js         resolución, relación de aspecto y pantalla completa
  settings.js        opciones guardadas
  flow.js            título, menús, partida, pausa y fin
  ui/menu.js         motor de menús (navegable con teclado, joystick y mouse)
  ui/draw.js         dibujo pixel del HUD y menús
  audio.js           sonidos sintetizados
```

## Cómo ajustar cosas comunes

- **Dificultad de la CPU:** `DIFFICULTIES` en `src/config.js` (velocidad, error, reacción, anticipación y uso del golpe fuerte).
- **Pelotas (velocidad, cantidad):** `BALL` en `src/config.js`.
- **Nueva animación de derrota:** crear un archivo en `src/deaths/` con `{ id, name, dur, start, update }` y sumarlo a `src/deaths/index.js`. El selector se llena solo.

Personajes, nombres y arte son originales.
