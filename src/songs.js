// Temas musicales de Bolonki (composiciones originales, estilo chiptune).
//
// Cada tema tiene:
//   bpm, chords: un acorde por compás, lead: la melodía (un string por compás; "NOTA:pasos", r = silencio,
//   16 pasos de semicorchea por compás), drums: patrones de batería por sección (A = compases 1-8, B = 9-16),
//   bass / arp: estilo del bajo y del arpegio (se arman solos a partir de los acordes), lead / arpWave: timbres.
// Batería: k bombo · s redoblante · h hi-hat · x bombo+hat · o redoblante+hat · c platillo · . nada
export const SONGS = {
  // Menú: tranquilo, en La menor
  menu: {
    bpm: 112, loop: true, leadWave: 'pulse25', arpWave: 'pulse125', bass: 'quarters', arp: 'up8', leadVol: 0.9,
    chords: ['Am', 'F', 'C', 'G', 'Am', 'F', 'C', 'E7', 'Dm', 'Am', 'F', 'E', 'Dm', 'Am', 'E7', 'Am'],
    lead: [
      'A4:4 C5:2 E5:2 D5:4 C5:4', 'A4:2 C5:2 F5:4 A5:2 G5:2 F5:4', 'E5:4 G5:4 C6:2 B5:2 G5:4', 'D5:6 B4:2 G4:8',
      'A4:4 C5:2 E5:2 A5:4 G5:4', 'F5:4 E5:2 D5:2 C5:4 A4:4', 'G4:2 C5:2 E5:2 G5:2 E5:4 D5:4', 'B4:4 D5:4 E5:8',
      'F5:4 E5:2 D5:2 A4:4 D5:4', 'C5:4 B4:2 A4:2 E5:8', 'F5:2 E5:2 F5:2 A5:2 G5:4 F5:4', 'E5:8 G#5:4 B5:4',
      'A5:4 F5:2 D5:2 A5:4 F5:4', 'E5:4 C5:2 A4:2 E5:4 C5:4', 'D5:4 B4:2 G#4:2 B4:4 D5:4', 'E5:4 C5:4 A4:8',
    ],
    drums: { A: 'k...s...k.k.s...', B: 'k.h.s.h.k.h.s.h.', fill: 'k.h.s.h.k.s.s.ss' },
  },

  // Bola Brava: arena con energía, en Mi menor
  bolas: {
    bpm: 150, loop: true, leadWave: 'pulse25', arpWave: 'pulse125', bass: 'octave8', arp: 'up16',
    chords: ['Em', 'C', 'D', 'B7', 'Em', 'C', 'D', 'B7', 'C', 'D', 'Em', 'Em', 'C', 'D', 'B7', 'B7'],
    lead: [
      'E5:2 E5:2 G5:2 E5:2 B5:4 A5:2 G5:2', 'G5:2 E5:2 C5:2 E5:2 G5:4 E5:4', 'F#5:2 A5:2 D6:4 C6:2 A5:2 F#5:4', 'D#5:4 F#5:4 A5:4 B5:4',
      'B5:2 A5:2 G5:2 F#5:2 E5:4 G5:4', 'E5:2 G5:2 C6:4 G5:2 E5:2 C5:4', 'D5:2 F#5:2 A5:2 D6:2 C6:2 A5:2 F#5:4', 'B4:4 D#5:4 F#5:2 A5:2 B5:4',
      'G5:6 E5:2 C5:4 E5:4', 'F#5:6 D5:2 A4:4 D5:4', 'E5:2 F#5:2 G5:2 A5:2 B5:4 E6:4', 'D6:2 B5:2 G5:2 B5:2 E5:8',
      'E6:4 D6:2 C6:2 G5:4 E5:4', 'F#5:4 A5:2 D6:2 C6:4 A5:4', 'B5:4 A5:2 F#5:2 D#5:4 F#5:4', 'B5:8 r:8',
    ],
    drums: { A: 'x.h.o.hhx.h.o.h.', B: 'x.hko.h.x.hko.h.', fill: 'x.h.o.hhx.o.o.oo' },
  },

  // Empujón: frío, sobre hielo, en Re menor
  empujon: {
    bpm: 124, loop: true, leadWave: 'square', arpWave: 'pulse125', bass: 'octave8', arp: 'updown16', arpOct: 1, leadVol: 0.75,
    chords: ['Dm', 'Bb', 'C', 'A', 'Dm', 'Bb', 'C', 'A', 'Gm', 'Dm', 'Bb', 'A', 'Gm', 'Dm', 'A', 'A'],
    lead: [
      'D5:4 F5:4 A5:6 G5:2', 'F5:4 D5:4 Bb4:6 C5:2', 'E5:4 G5:4 C6:4 Bb5:4', 'A5:8 C#5:4 E5:4',
      'D6:4 A5:4 F5:4 D5:4', 'D5:2 F5:2 Bb5:4 F5:4 D5:4', 'G5:2 E5:2 C5:4 E5:2 G5:2 C6:4', 'C#6:4 A5:4 E5:4 C#5:4',
      'G5:6 Bb5:2 D6:8', 'C6:2 A5:2 F5:4 D5:8', 'F5:4 D5:4 Bb4:4 D5:4', 'E5:6 C#5:2 A4:8',
      'D6:4 Bb5:4 G5:4 D5:4', 'F5:4 A5:4 D5:4 A4:4', 'C#5:4 E5:4 A5:4 G5:4', 'E5:8 r:8',
    ],
    drums: { A: 'k...h.s.k.k.h.s.', B: 'k.h.o.h.k.hko.h.', fill: 'k.h.o.h.k.o.o.oo' },
  },

  // Bombardeo: industrial, empuja, en Sol menor
  bombardeo: {
    bpm: 156, loop: true, leadWave: 'pulse25', arpWave: 'pulse125', bass: 'pump', arp: 'none', leadVol: 0.9,
    chords: ['Gm', 'Gm', 'Eb', 'F', 'Gm', 'Gm', 'Eb', 'F', 'Cm', 'Gm', 'Eb', 'D', 'Cm', 'Gm', 'D', 'D'],
    lead: [
      'G4:2 G4:2 Bb4:2 G4:2 D5:4 C5:2 Bb4:2', 'G4:2 G4:2 Bb4:2 C5:2 D5:2 F5:2 D5:4', 'Eb5:2 D5:2 Bb4:2 G4:2 Bb4:4 Eb5:4', 'F5:4 D5:2 C5:2 A4:4 C5:4',
      'G5:2 G5:2 F5:2 D5:2 Bb4:4 G4:4', 'D5:2 F5:2 G5:2 Bb5:2 D6:2 Bb5:2 G5:4', 'G5:4 Eb5:4 Bb4:4 Eb5:4', 'F5:2 A5:2 C6:4 A5:4 F5:4',
      'C5:4 Eb5:4 G5:4 Eb5:4', 'D5:4 Bb4:4 G4:8', 'Bb4:2 Eb5:2 G5:2 Bb5:2 G5:4 Eb5:4', 'F#5:4 A5:4 D6:8',
      'Eb6:4 D6:2 C6:2 G5:4 Eb5:4', 'D6:4 Bb5:2 G5:2 D5:4 Bb4:4', 'A4:2 D5:2 F#5:2 A5:2 C6:4 A5:4', 'F#5:4 D5:4 A4:8',
    ],
    drums: { A: 'x.hko.h.x.hko.hh', B: 'x.hko.hkx.hko.hh', fill: 'x.hko.hko.o.o.oo' },
  },

  // Petardos: saltarín y divertido, en Fa mayor
  petardos: {
    bpm: 136, loop: true, leadWave: 'pulse25', arpWave: 'pulse125', bass: 'bounce', arp: 'up8', leadVol: 0.9,
    chords: ['F', 'Dm', 'Bb', 'C', 'F', 'Dm', 'Bb', 'C', 'Bb', 'C', 'Am', 'Dm', 'Bb', 'C7', 'F', 'F'],
    lead: [
      'C5:2 F5:2 A5:2 F5:2 C6:4 A5:4', 'A5:2 F5:2 D5:2 F5:2 A5:4 G5:4', 'F5:2 D5:2 Bb4:2 D5:2 F5:2 D5:2 Bb5:4', 'G5:4 E5:2 C5:2 G4:4 C5:4',
      'F5:2 G5:2 A5:2 C6:2 A5:4 F5:4', 'D5:2 E5:2 F5:2 A5:2 D6:4 A5:4', 'Bb5:4 A5:2 G5:2 F5:4 D5:4', 'E5:2 G5:2 C6:2 E6:2 C6:8',
      'D6:4 Bb5:4 F5:4 D5:4', 'E5:4 G5:4 C6:4 E6:4', 'C6:4 A5:2 E5:2 A5:4 C6:4', 'A5:2 F5:2 D5:2 F5:2 A5:8',
      'Bb5:2 A5:2 G5:2 F5:2 D5:4 F5:4', 'E5:2 F5:2 G5:2 A5:2 Bb5:4 G5:4', 'A5:4 F5:4 C5:4 F5:4', 'F5:8 r:8',
    ],
    drums: { A: 'k.h.s.hkk.h.s.h.', B: 'x.h.o.hkx.h.o.h.', fill: 'k.h.s.hkk.s.s.ss' },
  },

  // Futbolonki: canto de hinchada, en Re mayor
  futbol: {
    bpm: 140, loop: true, leadWave: 'pulse25', arpWave: 'pulse125', bass: 'octave8', arp: 'up8', leadVol: 0.9,
    chords: ['D', 'A', 'Bm', 'G', 'D', 'A', 'G', 'A', 'Bm', 'G', 'D', 'A', 'G', 'A', 'D', 'D'],
    lead: [
      'D5:2 D5:2 F#5:2 A5:2 D6:4 A5:4', 'C#5:2 E5:2 A5:4 G5:2 F#5:2 E5:4', 'F#5:2 D5:2 B4:2 D5:2 F#5:4 B5:4', 'G5:4 B5:2 A5:2 G5:4 D5:4',
      'D5:2 F#5:2 A5:2 D6:2 C#6:2 A5:2 F#5:4', 'E5:2 A5:2 C#6:4 B5:2 A5:2 E5:4', 'G5:2 F#5:2 E5:2 D5:2 B4:4 D5:4', 'E5:4 A5:4 C#6:4 E6:4',
      'F#6:4 D6:2 B5:2 F#5:4 D6:4', 'D6:4 B5:2 G5:2 D5:4 G5:4', 'A5:2 F#5:2 D5:2 F#5:2 A5:4 D6:4', 'C#6:4 A5:4 E5:2 C#5:2 A4:4',
      'B4:2 D5:2 G5:2 B5:2 D6:4 B5:4', 'C#6:2 B5:2 A5:2 G5:2 E5:4 C#5:4', 'D5:2 F#5:2 A5:2 D6:2 A5:2 F#5:2 D5:4', 'D5:8 r:8',
    ],
    drums: { A: 'x.h.o.h.x.h.o.h.', B: 'x.hko.hkx.hko.h.', fill: 'x.h.o.hhx.o.o.oo' },
  },

  // Rey de la colina: calipso de isla, en Do mayor
  colina: {
    bpm: 128, loop: true, leadWave: 'pulse25', arpWave: 'pulse125', bass: 'bounce', arp: 'up8', leadVol: 0.85,
    chords: ['C', 'F', 'G', 'C', 'C', 'F', 'G', 'C', 'F', 'G', 'Em', 'Am', 'F', 'G', 'C', 'C'],
    lead: [
      'E5:2 G5:2 C6:2 G5:2 E5:4 G5:4', 'A5:2 C6:2 A5:2 F5:2 A5:4 C6:4', 'B5:2 D6:2 B5:2 G5:2 D5:4 G5:4', 'C6:4 G5:2 E5:2 C5:8',
      'E5:2 E5:2 G5:2 E5:2 C6:4 B5:2 A5:2', 'F5:2 A5:2 C6:4 A5:2 F5:2 A5:4', 'G5:2 B5:2 D6:2 B5:2 G5:4 F5:4', 'E5:4 D5:2 E5:2 C5:8',
      'A5:2 C6:2 F6:4 C6:2 A5:2 F5:4', 'G5:2 B5:2 D6:4 B5:2 G5:2 D5:4', 'E5:2 G5:2 B5:4 G5:2 E5:2 B4:4', 'A4:2 C5:2 E5:4 A5:4 E5:4',
      'F5:4 A5:4 C6:2 A5:2 F5:4', 'G5:4 B5:4 D6:2 B5:2 G5:4', 'C6:2 G5:2 E5:2 G5:2 C6:4 E6:4', 'C6:8 r:8',
    ],
    drums: { A: 'k..hs.h.k.hks.h.', B: 'x..ho.hkx.hko.h.', fill: 'k..hs.hkk.s.s.ss' },
  },

  // Hexágonos: saltarín y apurado, en Fa mayor (el piso se cae)
  hexagonos: {
    bpm: 144, loop: true, leadWave: 'pulse25', arpWave: 'pulse125', bass: 'octave8', arp: 'up16', leadVol: 0.85,
    chords: ['F', 'Dm', 'Bb', 'C', 'F', 'Dm', 'Gm', 'C', 'Bb', 'C', 'Am', 'Dm', 'Gm', 'C', 'F', 'C'],
    lead: [
      'F5:2 A5:2 C6:2 A5:2 F5:2 C5:2 F5:4', 'D5:2 F5:2 A5:2 D6:2 C6:4 A5:4', 'Bb5:2 D6:2 Bb5:2 F5:2 D5:4 F5:4', 'C6:2 Bb5:2 A5:2 G5:2 E5:4 C5:4',
      'F5:2 F5:2 A5:2 C6:2 F6:4 C6:4', 'D6:2 C6:2 A5:2 F5:2 D5:4 A5:4', 'G5:2 Bb5:2 D6:2 Bb5:2 G5:4 D5:4', 'E5:4 G5:4 C6:4 E6:4',
      'D6:2 C6:2 Bb5:4 F5:2 G5:2 Bb5:4', 'C6:2 Bb5:2 A5:4 E5:2 F5:2 G5:4', 'A5:2 C6:2 E6:4 C6:2 A5:2 E5:4', 'D5:2 F5:2 A5:4 D6:8',
      'G5:2 A5:2 Bb5:2 D6:2 G6:4 D6:4', 'C6:2 E6:2 G6:4 E6:2 C6:2 G5:4', 'F5:2 A5:2 C6:2 F6:2 C6:2 A5:2 F5:4', 'C6:4 E5:4 G5:4 C6:4',
    ],
    drums: { A: 'x.hkohhkx.hko.hh', B: 'x.hko.hkx.hko.h.', fill: 'x.o.o.hhx.o.oooo' },
  },

  // Fiesta (el tablero): alegre, en Sol mayor
  fiesta: {
    bpm: 118, loop: true, leadWave: 'pulse25', arpWave: 'pulse125', bass: 'bounce', arp: 'up8', leadVol: 0.85,
    chords: ['G', 'Em', 'C', 'D', 'G', 'Em', 'C', 'D', 'C', 'D7', 'Bm', 'Em', 'C', 'D', 'G', 'G'],
    lead: [
      'D5:4 G5:4 B5:4 A5:2 G5:2', 'E5:4 G5:4 B5:6 A5:2', 'G5:4 E5:4 C5:4 E5:4', 'F#5:4 A5:4 D6:4 C6:4',
      'B5:4 D6:4 B5:2 A5:2 G5:4', 'G5:2 A5:2 B5:4 E5:8', 'E5:2 G5:2 C6:2 B5:2 A5:2 G5:2 E5:4', 'A5:4 F#5:4 D5:8',
      'E5:4 G5:4 C6:8', 'D6:4 C6:2 B5:2 A5:8', 'B5:4 F#5:4 D5:4 F#5:4', 'G5:4 E5:4 B4:8',
      'C5:2 E5:2 G5:2 C6:2 E6:4 C6:4', 'A5:2 D6:2 C6:2 A5:2 F#5:4 A5:4', 'G5:4 B5:4 D6:4 B5:4', 'G5:8 r:8',
    ],
    drums: { A: 'k...s.h.k.k.s.h.', B: 'k.h.s.h.k.h.s.h.', fill: 'k.h.s.h.k.s.s.ss' },
  },

  // Fanfarria de victoria (no se repite)
  victory: {
    bpm: 150, loop: false, leadWave: 'pulse25', arpWave: 'pulse125', bass: 'quarters', arp: 'up16', leadVol: 1,
    chords: ['C', 'F', 'G', 'C'],
    lead: ['C5:2 E5:2 G5:2 C6:4 G5:2 C6:4', 'A5:2 C6:2 F6:4 C6:2 A5:2 F5:4', 'B5:2 D6:2 G6:4 F6:2 D6:2 B5:4', 'C6:16'],
    drums: { A: 'k.k.s...k.k.s.s.', fill: 'c...............' },
  },
};
