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
  Cuatro mapas (misma arena, distinto aspecto y una vuelta de juego; `bolas.js` + `world/decorBolas.js`):
  **Espacio** (la arena flotando en la oscuridad, como siempre), **Feria** (parque de diversiones de noche: una
  **calesita** en el medio rebota las pelotas y, como gira, las tira de costado), **Playa** (al atardecer, con pelotas
  de playa: cada tanto sopla **viento** para un lado al azar y curva las pelotas; unas flechas en el piso avisan antes
  y mientras sopla; además cada tanto un **cangrejo** sale de una torre, cruza de costado y se mete en otra, y las
  pelotas le rebotan) y **Terraza** (azotea del barrio con la ciudad abajo: una **columna** en el medio que se va
  rajando a pelotazos; a los 12 golpes se rompe y deja cuatro montoncitos de **escombros** que rebotan las pelotas
  hasta el final). Los rebotes y el viento están en `arenaMods` de `game/physics.js`.
- **Empujón:** todos arriba de una plataforma redonda sobre un abismo. Las naves se mueven libres; el botón de golpe es
  una **embestida**. Gana la ronda el último que queda arriba; gana la partida el primero que llega a 1, 2 o 3 rondas.
  A los 14 segundos la plataforma empieza a achicarse. Hay dos mapas que se turnan por ronda: **Glaciar** (un iceberg de
  hielo liso que patina, flotando arriba de un valle nevado con bosque; del cielo caen **carámbanos**: un círculo avisa
  dónde caen y al que agarran queda **mareado** un rato, sin poder manejar; empiezan a los 10 s de la ronda) y **Volcán** (tierra que agarra bien, con charcos de **barro**
  que resbalan más que el hielo, sobre la lava; el volcán de atrás tira **bolas de fuego**: una marca roja avisa dónde
  caen, al caer empujan a los que estén cerca y después siguen rodando, chocando naves, hasta caerse de la plataforma;
  empiezan a los 10 s de la ronda).
- **Bombardeo** (a pie): caen cajas de metal sobre una grilla y quedan apiladas; hay que ir saltando de pila en pila
  (el golpe es **saltar**) sin quedar abajo de una caja ni encerrado en un pozo. Cayendo sobre la cabeza de otro lo
  dejás mareado (**pisotón**). Antes de caer se ve la sombra de la caja en el piso y la caja bajando desde arriba.
  A los 25 s el piso es lava y sube cada vez más rápido. Cajas especiales: **resorte**
  (verde, te lanza unas tres cajas de alto) y **explosiva** (roja, al caer vuela la caja de arriba de las pilas de al lado).
- **Petardos** (a pie, estilo Bomberman): mapas de 13 x 11 sin simetría, con paredes fijas y cajones al azar, uno en cada esquina. El golpe pone
  un petardo que explota en cruz y hace explotar a otros. Poderes en los cajones: +fuego (arranca en 1), +petardo
  (más raro), +velocidad, botas (empujando un obstáculo lo saltás), escudo (aguanta una explosión), patada (el petardo
  sale deslizando) y **calavera** (una maldición de 10 s que se contagia tocando a otro: controles invertidos, lento,
  petardos sin parar, sin petardos o **atontado**, que cada vez que apretás una dirección seguramente te manda para otro lado). Hay 4 canchas, cada una con
  algo propio: patio (arbustos para esconderte), fábrica (una cinta en circuito que te arrastra a vos y a los petardos, con una máquina que va largando cajones como la cinta de valijas del aeropuerto), desierto
  (arenas movedizas) y nieve (hielo: si soltás seguís resbalando). Al minuto empieza la muerte súbita: las paredes
  se cierran en espiral. Cada cancha tiene sus paredes y sus cajones: cercos de ligustro en macetas y cajones de madera
  en el patio, paneles de máquina y cajas de cartón en la fábrica, arenisca con columnas viejas y vasijas de barro en el
  desierto, bloques de hielo con nieve y carámbanos y cajones escarchados en la nieve.
- **Futbolonki:** fútbol de naves en un estadio de noche con tribunas. Los de la izquierda del marcador (AZUL) contra
  los de la derecha (ROJO): 2 contra 2, 2 contra 1 con 3 jugadores o 1 contra 1 en un duelo de la Fiesta. Las naves manejan
  como en Empujón y la **embestida** contra la pelota es un pelotazo que sale para donde ibas. Gana el primer equipo en llegar
  a 3, 5 o 7 goles, o el que va ganando a los 2 minutos; si empatan hay **gol de oro** y los arcos se agrandan de a poco
  hasta que alguien la meta. Los CPU se reparten: uno va a buscar la pelota y el otro ataja. Un tiro que el rival desvía
  adentro cuenta como gol del que pateó.
- **Rey de la colina** (a pie): una isla de costa irregular con tres colinas distintas (el Morro, con ruinas arriba; la Mesa,
  ancha y con bandera; y el Peñón, chico y pegado al agua), un puente colgante entre el Morro y la Mesa, un muelle que sale
  al mar (a veces el palo aparece en la punta) y palmeras, rocas, un bote y barriles que estorban. La corona flota sobre la cima
  de una de las colinas: el que está **solo** arriba suma un punto por segundo; si hay dos o más, la cima titila en rojo y
  nadie suma. Cada 20 s la corona se muda a otra colina (la próxima titila en dorado antes). El golpe es un **empujón**
  (de espaldas empuja más) y cada tanto aparece un **palo** en el piso: empuja el doble y barre a todos los que tengas
  adelante (dura 3 golpes). Si te caés al agua volvés a la orilla a los 2 s. De vez en cuando viene una **ola** que barre
  la parte baja de la isla: arriba de las colinas no te toca. Gana el primero en llegar a 20, 30 o 45 puntos o el que
  tiene más al terminar el tiempo (si empatan, desempate: el próximo punto gana).

En la Fiesta, Futbolonki y Rey de la colina duran 90 segundos en lugar de 2 minutos.

## Música

Cada minijuego, el menú y el tablero tienen su tema chiptune (composiciones originales, `src/songs.js`), tocado en vivo
por un secuenciador con WebAudio (`src/music.js`): melodía y arpegio en onda de pulso, bajo triangular y batería de ruido.
Se agacha en pausa y se acelera cuando la cosa se pone fea (lava, muerte súbita, plataforma chica, mano a mano).
El volumen está en Opciones → Audio.

Para sumar un tema: agregarlo a `SONGS` (un acorde y un compás de melodía por compás, 16 pasos cada uno) y ponerle
`music: '<nombre>'` al minijuego, o usar su mismo id.

En Bombardeo, Petardos, Empujón, Futbolonki y Rey de la colina la cámara se gira **arrastrando el mouse** (o con el stick derecho); los controles
siguen a la cámara y la tecla C la vuelve a centrar.

Al elegir el minijuego se ve una vista previa chiquita (una foto que el juego saca de cada minijuego al arrancar, `src/render/thumbs.js`) y su descripción.

Para sumar un minijuego: crear `src/minigames/<nombre>.js` con la forma que describe `src/minigames/registry.js`,
registrarlo con `register()` e importarlo en `src/main.js`. Los menús, el local, el online, la pausa y el HUD lo toman solos.

## Fiesta (modo tablero)

Se entra desde la puerta **FIESTA** del menú principal (sola, local u online).

La Fiesta es un tablero estilo party game (`src/fiesta/board.js`):

- 2 a 4 jugadores, 5, 10, 15 o 20 turnos. Todos arrancan con 10 monedas.
- En tu turno tirás el dado (golpe / Enter) y avanzás por un camino de 24 casilleros:
  **azul** +3 monedas · **rojo** −3 · **evento** (lluvia de monedas, ladrón, turbo, cambio de lugar, la copa se muda, mala suerte) ·
  **duelo** (elegís un rival y juegan un minijuego 1 contra 1; el que gana le saca hasta 10 monedas).
- Al pasar por la **copa** la podés comprar por 20 monedas; después se muda a otro casillero.
- Al pasar por una **tienda** (casillero naranja con puestito) comprás objetos, hasta 2 por jugador. Se usan al empezar el turno:
  **dado doble** (6, dos dados que se suman), **dado dorado** (10, elegís el número), **trampa** (6, la dejás en tu casillero
  y el que caiga te paga 10), **campana** (15, te lleva derecho a la copa) y **escudo** (5, se usa solo: te cuida una vez
  de perder monedas por casillero rojo, ladrón, mala suerte o trampa). Los objetos de cada uno se ven abajo de su retrato.
- Cuando juegan todos, sale sorteado un **minijuego para todos**: 10, 5, 3 y 1 monedas según el puesto.
- **Últimos 3 turnos:** aparece un aviso, los casilleros azules y rojos valen el doble y el que va último gira una
  **ruleta de ayuda** (+10 o +20 monedas, la copa se le acerca, o le saca 10 monedas al primero).
- **Premios extra** al final, una copa cada uno: *Rey de los minijuegos* (más minijuegos ganados), *Bolsillo lleno*
  (más monedas juntadas en total) y *Aventurero* (más veces en eventos). Si empatan, se la llevan todos los empatados.
- Al final gana el que tiene más copas (si empatan, más monedas). La tabla final muestra copas, monedas y minijuegos ganados.
- Las monedas y copas que se ganan o pierden aparecen flotando arriba de cada pieza.
- **Acelerar:** en los turnos de los demás (y en los carteles de resultados), mantener apretado el botón hace que todo vaya 3 veces más rápido.
- Se juega a 5, 10, 15 o 20 turnos.

En **Opciones → Juego** se elige qué minijuegos salen en la Fiesta (siempre queda al menos uno).
En online, la Fiesta corre en la máquina del anfitrión y los invitados eligen y tiran el dado desde la suya; si alguien se va, su lugar pasa a un bot.

## Menú, sala y personajes

El menú principal tiene dos puertas grandes: **FIESTA** (el tablero) y **MINIJUEGOS** (elegís uno y se juega ese).
Abajo, **ONLINE** y **OPCIONES**.

Las dos puertas llevan a la **sala** (`src/sala/`), que es la misma pantalla para jugar solo, en la misma compu u online:

- **Orden:** primero se elige **qué se juega** (el minijuego o la Fiesta, CPU y puntos; Enter o espacio en cualquier fila
  sigue), después **los personajes** y, cuando están todos listos, la presentación y a jugar. Online, el anfitrión elige
  qué se juega y los invitados ya van eligiendo personaje; cuando están todos listos arranca solo.
- **Mapa:** abajo de la descripción del minijuego está la fila **MAPA** (ALEATORIO primero). Los minijuegos con varios
  mapas los declaran en `maps` (Empujón: GLACIAR/VOLCÁN; Petardos: PATIO/FÁBRICA/DESIERTO/NIEVE); con uno fijo se juega
  ese en todas las rondas (`fixedMap()` del registro). En la Fiesta siempre es aleatorio. Los de un solo mapa muestran
  su nombre (`mapName`). Se guarda por minijuego en `settings.maps` / `room.opts.maps`. La fila muestra la foto del
  mapa (`thumbs.js` saca una por mapa, `id:0`, `id:1`…); en ALEATORIO las fotos van rotando.
- **ELEGIR PERSONAJES** es un botón dorado sin brillo (`button: true` en el menú) y el pie dice "ENTER ELEGIR PERSONAJES".
- En el menú principal, **SALIR** va chiquito abajo a la izquierda y el **botón de sonido** abajo a la derecha
  (silencia efectos y música; `settings.muted`).
- Al entrar a cada minijuego hay **10 segundos de instrucciones** en un recuadro (cómo se gana y qué botón hace qué,
  `rules()` de cada minijuego) y después la cuenta 3, 2, 1.
- Las **fotos de los minijuegos** en los menús se ven nítidas (van en una capa aparte en alta resolución, `thumbStore.js`).
- **Elegí tu personaje:** una grilla de retratos (5 por fila, con lugar para 10 o más) donde cada jugador mueve su
  **marco de color** (J1 azul, J2 rojo, J3 verde, J4 amarillo) con las flechas (o haciendo clic en un retrato) y confirma con la
  barra espaciadora (o A en el joystick). Abajo, una tarjeta finita por jugador (quién es, qué personaje y si ya
  está listo). Los retratos son del modelo 3D de cada personaje: se sacan al arrancar (`src/render/portraits.js`).
  Cada personaje lo usa uno solo, y no cambia nada del juego (es solo estética). Hay seis: Kiro, Mosh, Bruna y Tank
  (bichos redondos) y Coco (payaso) y Pino (gnomo), con cabeza, torso, brazos y piernas (`src/world/people.js`).
- **Local:** J1 usa flechas + espacio/enter (o joystick 1). Los demás se suman apretando su botón:
  J2 con **E** (WASD para elegir, **Q** para salir) o joystick 2, J3 y J4 con **A** en los joysticks 3 y 4. Los podios libres son CPU.
- Cuando todos confirmaron aparecen las **opciones**: en Minijuegos, una grilla con las fotos de cada uno; CPU (o sin CPU si son 2 o más),
  puntos/rondas/turnos, **JUGAR ONLINE** (convierte la sala en online e invita amigos) y COMENZAR.
- Antes de arrancar hay una **presentación**: todos parados en sus podios (se pueden girar arrastrando), con el nombre de
  cada uno abajo (VOS, J2, el apodo o CPU), su personaje y con qué juega, y arriba qué se juega. Dura 3 segundos y no se
  puede saltear. Online la ven todos: la manda el anfitrión.
- Al terminar una partida, **VOLVER A LA SALA** mantiene a los mismos jugadores y personajes.

Los controles en la partida son relativos a la pantalla: en Bola Brava, los de arriba y abajo se mueven con izquierda/derecha y los de los costados con arriba/abajo.

### Online

- **Online → Crear sala de Fiesta / de Minijuegos:** te da un código de 4 letras. Es la misma sala: cada invitado elige su personaje en su compu
  (confirmarlo es estar listo) y el anfitrión elige minijuego, bots, puntos y sala privada o pública.
- **Online → Unirse con código:** escribís el código (con teclado, o letra por letra con la cruceta).
- **Online → Salas públicas:** lista de salas abiertas para entrar sin código.
- **Apodo:** se pide la primera vez que entrás al online y se ve en la sala y arriba de tu personaje.

En la sala se ve el **ping** de cada uno. Al terminar, la **revancha se vota**: cuando votan todos, arranca sola.
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
- **Controles:** resumen de teclas y botones.
- **Juego:** qué minijuegos salen en la Fiesta, animación de derrota y "ver derrota en CPU".

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
  world/pods.js      naves y pilotos (dressPod viste la nave con el personaje elegido)
  world/people.js    personajes con ropa (payaso y gnomo): mismo esqueleto, brazos que se mueven al caminar
  world/balls.js     pelotas
  game/physics.js    movimiento, rebotes, goles y colisiones
  game/ai.js         IA de la CPU
  game/match.js      reglas: reinicio, disparos de torre, goles, eliminación
  deaths/            animaciones de derrota (una por archivo; fall.js caída, crush.js aplastado, burn.js lava, blast.js petardo)
  world/walker.js    personajes a pie (sin nave), para Bombardeo, Petardos y Rey de la colina
  world/isla.js      la isla del Rey de la colina: forma de la costa, colinas, puente, muelle y obstáculos
  world/decor.js     decorado de cada escenario (cielo, volcán, espacio, jardín, fábrica, desierto, nieve, isla)
  world/props.js     utilería low poly para el decorado (árboles, faroles, pantallas gigantes, géiseres, drones…)
  fx/particles.js    chispas, humo, escombros, estela de las pelotas
  visuals.js         animación por frame y cámara
  hud.js             retratos, puntajes, título y carteles
  input.js           entrada unificada: teclado, joystick, mouse y táctil
  display.js         resolución, relación de aspecto y pantalla completa
  settings.js        opciones guardadas
  flow.js            título, menús, partida, pausa y fin
  minigames/         cada minijuego (registry.js explica la forma; bolas, empujon, bombardeo, petardos, futbol y colina)
  fiesta/board.js    modo Fiesta: tablero, dado, casilleros, copa, duelos y minijuegos sorteados
  multiplayer.js     menú ONLINE (crear sala, unirse, salas públicas, apodo), pausa y fin online
  sala/sala.js       la sala: unirse, elegir personaje, opciones y arrancar (solo, local y online)
  sala/stage.js      escenario 3D de la sala (cuatro podios; se usa en la presentación)
  render/portraits.js retratos 3D de cada personaje para la grilla
  chars.js           qué personaje usa cada lugar (se elige en la sala)
  ui/mainMenu.js     menú principal con las dos puertas
  net/room.js        conexión PeerJS: código, lugares, listo, ping, votos, reconexión y salas públicas
  net/online.js      sincronización: snapshots del anfitrión e interpolación del invitado
  game/fx.js         efectos como eventos (se reproducen igual en todas las máquinas)
  game/controls.js   controles de cada nave local relativos a la pantalla
  ui/textEntry.js    pantalla para escribir (código de sala, apodo)
  ui/menu.js         motor de menús: lista grande, ventana y solapas; barra de botones al pie
  ui/draw.js         dibujo pixel del HUD y menús
  audio.js           sonidos sintetizados
  music.js, songs.js música: secuenciador y temas
```

## Cómo ajustar cosas comunes

- **Dificultad de la CPU:** `DIFFICULTIES` en `src/config.js` (velocidad, error, reacción, anticipación y uso del golpe fuerte).
- **Pelotas (velocidad, cantidad):** `BALL` en `src/config.js`.
- **Nuevo personaje:** sumarlo a `CHARS` en `src/config.js` (nombre, colores y accesorio). Si es un bicho redondo con un accesorio nuevo, se arma en `buildBlob` (`src/world/pods.js`); si es con ropa, se agrega un armador en `src/world/people.js` (`model` en `CHARS`) y su retrato en `personFace` (`src/hud.js`). Aparece solo en la sala (la grilla tiene lugar para 10; con más, suma filas).
- **Nueva animación de derrota:** crear un archivo en `src/deaths/` con `{ id, name, dur, start, update }` y sumarlo a `src/deaths/index.js`. El selector se llena solo.

Personajes, nombres y arte son originales.
