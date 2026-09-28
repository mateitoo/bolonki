// Estado compartido del juego (mutable). Todos los módulos leen y escriben acá.
export const game = {
  state: 'title',          // title | menu | count | play | paused | end  (title y menu corren la demo)
  difficulty: 'intermedio',
  mode: 'demo',            // demo | solo | local | online
  online: 'off',           // off | host | guest
  me: -1,                  // lugar (0-3) del jugador de esta máquina; -1 en la demo
  setup: null,             // configuración de la partida actual (control de cada lugar, puntos)
  countT: 0,
  elapsed: 0,
  spawnT: 0,
  pending: null,           // próximo disparo de torre {ci, t}
  shake: 0,
  winner: -1,
  timeScale: 1,
  slowT: 0, slowK: 1,      // cámara lenta
  demoResetT: 0,
  humanOut: false,
  pendingEnd: false,       // la partida termina cuando acaben las animaciones de derrota
  camFocus: 0, camFocusTarget: 0, focus: { x: 0, z: 0 },
  clock: 0,
  showcaseT: 0,            // "ver derrota" desde Extras
  players: [],
  balls: [],
};

// Referencias a objetos 3D de la arena que la lógica necesita animar.
export const world = {
  goalLasers: [],
  barriers: [],
  chevSets: [],
  towers: [],
};
