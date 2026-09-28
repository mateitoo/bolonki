// Efectos de la partida como eventos: se ejecutan acá (partículas, sonido, animaciones)
// y, si esta máquina es la anfitriona de una sala, se guardan para mandarlos a los invitados.
// Los invitados reciben la lista y la reproducen con playEvent(), así todos ven lo mismo.
import { game, world } from '../state.js';
import { burst, P } from '../fx/particles.js';
import { SFX } from '../audio.js';
import { DEATH_ANIMS } from '../deaths/index.js';
import FALL from '../deaths/fall.js';

export const outbox = [];
let recording = false;
export function setRecording(on) { recording = on; outbox.length = 0; }
const emit = (ev) => { if (recording) outbox.push(ev); };

export const FX = {
  goal(i, x, z) {
    const p = game.players[i];
    p.flash = 0.6; world.goalLasers[i].t = 0.4;
    burst(x, 0.5, z, { mat: i, n: 12, sp: 6 }); game.shake = Math.max(game.shake, 0.3);
    SFX.goal(); emit(['g', i, r2(x), r2(z)]);
  },
  warn(ci) { world.chevSets[ci].warn = 0.7; SFX.warn(); emit(['w', ci]); },
  fire(ci, x, z) {
    world.towers[ci].flash = 0.3; SFX.fire();
    burst(x, 0.8, z, { mat: P.RED, n: 5, sp: 3, up: [1, 3], life: [0.15, 0.3] });
    emit(['f', ci, r2(x), r2(z)]);
  },
  power(x, z) {
    SFX.power(); burst(x, 0.6, z, { mat: P.WHITE, n: 6, sp: 5, life: [0.2, 0.4] });
    game.shake = Math.max(game.shake, 0.15); emit(['p', r2(x), r2(z)]);
  },
  bounce() { SFX.bounce(); emit(['b']); },
  pod() { SFX.pod(); emit(['h']); },
  tick() { SFX.tick(); emit(['k']); },
  go() { SFX.go(); emit(['o']); },
  // eliminación: barrera láser, animación de derrota y foco de cámara si es el jugador de esta máquina
  elim(i, animId) {
    const p = game.players[i];
    const anim = DEATH_ANIMS.find((a) => a.id === animId) || DEATH_ANIMS[0];
    world.barriers[i].y = 0.55; game.shake = Math.max(game.shake, 0.5);
    p.death = { anim, t: 0, st: {}, done: false };
    anim.start(p, p.death.st);
    // la cámara se acerca a tu nave (no en el local: los demás siguen jugando en la misma pantalla)
    if (i === game.me && game.mode !== 'local') { game.camFocusTarget = 0.55; game.focus.x = p.x; game.focus.z = p.z; }
    emit(['e', i, anim.id]);
  },

  /* ---------- Empujón ---------- */
  dash(i, x, z) {
    SFX.dash(); burst(x, 0.4, z, { mat: P.WHITE, n: 5, sp: 3, up: [0.5, 2], life: [0.15, 0.3] });
    emit(['D', i, r2(x), r2(z)]);
  },
  bump(x, z, hard) {
    SFX.bump(); burst(x, 0.9, z, { mat: P.YELLOW, n: hard ? 9 : 5, sp: hard ? 6 : 4, up: [1, 4], life: [0.1, 0.25] });
    game.shake = Math.max(game.shake, hard ? 0.28 : 0.12);
    emit(['u', r2(x), r2(z), hard ? 1 : 0]);
  },
  // se cayó de la plataforma: animación de caída (vx, vz: con qué velocidad salió)
  fall(i, vx, vz) {
    const p = game.players[i];
    if (p.death && p.death.anim === FALL) return;       // ya se está cayendo
    p.vx = vx; p.vz = vz;
    p.death = { anim: FALL, t: 0, st: {}, done: false };
    FALL.start(p, p.death.st);
    game.shake = Math.max(game.shake, 0.2);
    emit(['F', i, r2(vx), r2(vz)]);
  },
  round(w) { SFX.roundWin(); emit(['R', w]); },
  shrinkWarn() { SFX.warnShrink(); emit(['W']); },
};

const r2 = (v) => Math.round(v * 100) / 100;

export function playEvent(ev) {
  switch (ev[0]) {
    case 'g': FX.goal(ev[1], ev[2], ev[3]); break;
    case 'w': FX.warn(ev[1]); break;
    case 'f': FX.fire(ev[1], ev[2], ev[3]); break;
    case 'p': FX.power(ev[1], ev[2]); break;
    case 'b': FX.bounce(); break;
    case 'h': FX.pod(); break;
    case 'k': FX.tick(); break;
    case 'o': FX.go(); break;
    case 'e': FX.elim(ev[1], ev[2]); break;
    case 'D': FX.dash(ev[1], ev[2], ev[3]); break;
    case 'u': FX.bump(ev[1], ev[2], !!ev[3]); break;
    case 'F': FX.fall(ev[1], ev[2], ev[3]); break;
    case 'R': FX.round(ev[1]); break;
    case 'W': FX.shrinkWarn(); break;
    default: break;
  }
}
