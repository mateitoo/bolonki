// Estado compartido del juego (mutable). Todos los módulos leen y escriben acá.
export const game = {
  state: 'title',          // title | count | play | paused | end
  difficulty: 'intermedio',
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
  input: { l: false, r: false },
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
