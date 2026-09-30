# Bolonki en Steam — qué hay listo y qué falta

## Qué ya está hecho en el código

- **Versión de escritorio** (`desktop/`): una ventana de Electron que carga el juego compilado.
  - Arranca en pantalla completa (F11 la cambia), sin menús del navegador, y SALIR cierra el juego.
  - Guarda las opciones igual que la web.
  - Si Steam está abierto, se conecta con **steamworks.js**: logros, overlay (Shift+Tab) y el nombre de Steam como apodo.
  - Si no hay Steam, el juego anda igual.
- **Logros** (13): se guardan en el juego y, en la versión de Steam, también se desbloquean en Steam.
  - Hay que crearlos en Steamworks con estos mismos ids:

| ID | Nombre | Cómo se consigue |
|---|---|---|
| ACH_FIRST_WIN | Primera victoria | Ganar una partida |
| ACH_WIN_BOLAS | Arquero | Ganar en Bola Brava |
| ACH_WIN_EMPUJON | Topadora | Ganar en Empujón |
| ACH_WIN_BOMBARDEO | A cubierto | Ganar en Bombardeo |
| ACH_WIN_PETARDOS | Pirotécnico | Ganar en Petardos |
| ACH_WIN_FUTBOL | Goleador | Ganar en Futbolonki |
| ACH_WIN_COLINA | Rey de la colina | Ganar en Rey de la colina |
| ACH_WIN_HEXAGONOS | Equilibrista | Ganar en Hexágonos |
| ACH_ALL_GAMES | Todoterreno | Ganar en todos los minijuegos |
| ACH_FIESTA | Rey de la fiesta | Ganar una Fiesta |
| ACH_EXTREME | Sin piedad | Ganarle a la CPU en Extremo |
| ACH_ONLINE | Con amigos | Ganar una partida online |
| ACH_COUCH | En el sillón | Jugar de a 2 o más en la misma compu |

- **Imágenes de la tienda** (`steam/assets/`): se sacan del juego mismo con `node tools/store-assets.mjs` (desde `desktop/`, con el juego corriendo en `npm run preview`). Todas tienen los tamaños que pide Steam:

| Archivo | Para qué | Tamaño |
|---|---|---|
| header_capsule.jpg | Cápsula de encabezado | 920×430 |
| small_capsule.jpg | Cápsula chica | 462×174 |
| main_capsule.jpg | Cápsula principal | 1232×706 |
| vertical_capsule.jpg | Cápsula vertical | 748×896 |
| library_capsule.jpg | Biblioteca (portada) | 600×900 |
| library_hero.jpg | Biblioteca (fondo, sin logo) | 3840×1240 |
| library_logo.png | Biblioteca (logo transparente) | 1280×720 |
| community_icon.jpg | Ícono de la comunidad | 184×184 |
| client_icon.png | Ícono del programa | 256×256 |
| screenshot_*.jpg | Capturas (mínimo 5) | 1920×1080 |

- **Controles**: teclado, mouse y joysticks (Xbox / PlayStation / Steam Deck), con los textos de ayuda según con qué jugás. El menú principal está pensado para pantalla ancha (16:9, como en Steam Deck y monitores).

## Cómo armar la versión de escritorio

```bash
# 1) compilar el juego
npm install
npm run build

# 2) la app de escritorio
cd desktop
npm install
npm start               # la prueba en tu compu
npm run build:win       # deja la carpeta lista en desktop/release/win-unpacked
```

Para probar logros antes de tener tu propio número de app, creá `desktop/steam_appid.txt` con `480`. Es la app de prueba de Valve y hay que tener Steam abierto. Cuando tengas tu App ID, poné ese número.

## Pasos en Steam (en orden)

1. **Cuenta de Steamworks**: registrate en partner.steamgames.com. Pide datos bancarios y de impuestos; desde Argentina se completa el formulario W-8BEN.
2. **Pagar el Steam Direct** (USD 100 por juego). Se recupera cuando el juego vende USD 1.000.
3. **Esperar 21 días** desde el pago para poder publicar: Valve revisa los datos en ese tiempo.
4. **Armar la página de la tienda** con las imágenes de `steam/assets`, la descripción, las etiquetas (Party, Multijugador local, PvP en línea, Casual, Retro, Minijuegos) y un tráiler. Conviene que esté un tiempo como "Próximamente" para juntar deseados; Steam pide al menos 2 semanas.
5. **Crear los logros** con los ids de la tabla.
6. **Subir el juego** con SteamPipe: en Steamworks, creá un depot para Windows y subí la carpeta `desktop/release/win-unpacked` (con la herramienta `steamcmd` o el ContentBuilder del SDK). Opción de lanzamiento: `Bolonki.exe`.
7. **Revisión de Valve**: la página y el juego se revisan por separado; tarda de 1 a 5 días hábiles cada una.
8. **Publicar**, e idealmente anotarse en un **Steam Next Fest** con una demo antes del lanzamiento.

## Cosas que recomiendo antes de lanzar

- **Remote Play Together**: activarlo en Steamworks. Como Bolonki tiene multijugador local, cualquiera puede invitar amigos por Steam aunque no tengan el juego.
- **Steam Deck**: probar con el joystick (el menú ya se maneja entero sin mouse) y pedir la verificación.
- **Online**: hoy usa PeerJS con un servidor público gratis. Para Steam conviene pasarlo a las salas de Steam (Steam Networking / Lobbies) con steamworks.js. Es más estable, no depende de terceros y deja invitar amigos desde la lista de Steam.
- **Idiomas**: el juego está en español. Traducir al inglés multiplica mucho el alcance en Steam; los textos están todos en el código y se pueden pasar a un archivo de idiomas.
- **Precio**: para un party game chico, entre USD 3 y 7 suele funcionar. Steam sugiere precios regionales (Argentina, Brasil, etc.) automáticamente.
