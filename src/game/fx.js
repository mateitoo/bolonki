// Efectos de la partida como eventos: se ejecutan acá (partículas, sonido, animaciones)
// y, si esta máquina es la anfitriona de una sala, se guardan para mandarlos a los invitados.
// Los invitados reciben la lista y la reproducen con playEvent(), así todos ven lo mismo.
import { game, world } from '../state.js';
import { burst, P } from '../fx/particles.js';
import { SFX } from '../audio.js';
import { DEATH_ANIMS } from '../deaths/index.js';
import FALL from '../deaths/fall.js';
import CRUSH from '../deaths/crush.js';
import BURN from '../deaths/burn.js';
import BLAST from '../deaths/blast.js';

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

  /* ---------- Bombardeo ---------- */
  alert() { SFX.alert(); emit(['A']); },
  // un bloque tocó el piso en (x, z)
  slam(x, z, y = 0) {
    SFX.slam(); game.shake = Math.max(game.shake, 0.22);
    for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) burst(x + dx * 0.9, y + 0.2, z + dz * 0.9, { mat: P.SMOKE, n: 2, sp: 2.5, up: [0.5, 1.5], life: [0.3, 0.6], g: -1, grow: 1.5 });
    burst(x, y + 0.3, z, { mat: P.DEBRIS, n: 4, sp: 4, up: [2, 5], life: [0.3, 0.6] });
    emit(['L', r2(x), r2(z), r2(y)]);
  },
  jump(i) { SFX.jump(); emit(['J', i]); },
  spring(i) { const p = game.players[i]; SFX.boing(); burst(p.x, (p.fy || 0) + 0.2, p.z, { mat: P.YELLOW, n: 5, sp: 2.5, up: [1, 3], life: [0.2, 0.4] }); emit(['Sp', i]); },
  tnt(x, y, z) {
    SFX.bomb(); game.shake = Math.max(game.shake, 0.5);
    burst(x, y + 0.5, z, { mat: P.ORANGE, n: 16, sp: 7, up: [2, 7], life: [0.3, 0.6], size: 1.3 });
    burst(x, y + 0.5, z, { mat: P.SMOKE, n: 8, sp: 3, up: [1, 3], life: [0.6, 1], g: -1, grow: 2.5 });
    burst(x, y + 0.5, z, { mat: P.DEBRIS, n: 8, sp: 6, up: [3, 8], life: [0.4, 0.8] });
    emit(['Tn', r2(x), r2(y), r2(z)]);
  },
  // pisotón: el de abajo queda mareado un segundo
  stun(i) {
    const p = game.players[i]; p.stunT = 1.0;
    SFX.bump(); burst(p.x, (p.fy || 0) + 1.9, p.z, { mat: P.YELLOW, n: 8, sp: 3, up: [1, 3], life: [0.3, 0.5] });
    emit(['St', i]);
  },
  /* ---------- Petardos ---------- */
  place() { SFX.place(); emit(['Pl']); },
  boom(x, z) { SFX.bomb(); game.shake = Math.max(game.shake, 0.35); burst(x, 0.8, z, { mat: P.ORANGE, n: 10, sp: 5, up: [2, 6], life: [0.25, 0.5] }); burst(x, 0.8, z, { mat: P.SMOKE, n: 5, sp: 2, up: [1, 3], life: [0.5, 0.9], g: -1, grow: 2 }); emit(['Bm', r2(x), r2(z)]); },
  crate(x, z) { burst(x, 0.6, z, { mat: P.DEBRIS, n: 6, sp: 4, up: [2, 6], life: [0.3, 0.6] }); emit(['Cr', r2(x), r2(z)]); },
  powerup(x, z) { SFX.powerup(); burst(x, 0.8, z, { mat: P.YELLOW, n: 8, sp: 3, up: [2, 5], life: [0.2, 0.5] }); emit(['Pu', r2(x), r2(z)]); },
  kick(x, z) { SFX.kick(); burst(x, 0.3, z, { mat: P.WHITE, n: 4, sp: 3, up: [0.5, 2], life: [0.15, 0.3] }); emit(['Kk', r2(x), r2(z)]); },
  curse(i) { const p = game.players[i]; SFX.curse(); burst(p.x, 1.4, p.z, { mat: P.SMOKE, n: 8, sp: 2, up: [1, 3], life: [0.4, 0.8], g: -1, grow: 1.5 }); emit(['Cu', i]); },
  wall(x, z) { SFX.wall(); game.shake = Math.max(game.shake, 0.15); burst(x, 0.3, z, { mat: P.SMOKE, n: 4, sp: 2.5, up: [0.5, 1.5], life: [0.3, 0.6], g: -1, grow: 1.5 }); emit(['Wl', r2(x), r2(z)]); },
  blast(i) {
    const p = game.players[i];
    if (p.death && p.death.anim === BLAST) return;
    p.death = { anim: BLAST, t: 0, st: {}, done: false };
    BLAST.start(p, p.death.st);
    emit(['Bl', i]);
  },
  // se cayó (o quedó) en la lava
  burn(i, lavaY) {
    const p = game.players[i];
    if (p.death && p.death.anim === BURN) return;
    p.burned = true; p.lavaY = lavaY;
    p.death = { anim: BURN, t: 0, st: {}, done: false };
    BURN.start(p, p.death.st);
    emit(['B', i, r2(lavaY)]);
  },
  // aplastado por un bloque
  crush(i) {
    const p = game.players[i];
    if (p.death && p.death.anim === CRUSH) return;
    p.death = { anim: CRUSH, t: 0, st: {}, done: false };
    CRUSH.start(p, p.death.st);
    game.shake = Math.max(game.shake, 0.4);
    emit(['C', i]);
  },

  /* ---------- Fiesta ---------- */
  snd(name) { if (SFX[name]) SFX[name](); emit(['S', name]); },
  sparkle(x, y, z, m, n) { burst(x, y, z, { mat: m, n, sp: 3, up: [2, 6], life: [0.4, 0.8] }); emit(['X', r2(x), r2(y), r2(z), m, n]); },
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
    case 'A': FX.alert(); break;
    case 'L': FX.slam(ev[1], ev[2], ev[3] || 0); break;
    case 'C': FX.crush(ev[1]); break;
    case 'J': FX.jump(ev[1]); break;
    case 'Sp': FX.spring(ev[1]); break;
    case 'Tn': FX.tnt(ev[1], ev[2], ev[3]); break;
    case 'St': FX.stun(ev[1]); break;
    case 'B': FX.burn(ev[1], ev[2]); break;
    case 'Pl': FX.place(); break;
    case 'Bm': FX.boom(ev[1], ev[2]); break;
    case 'Cr': FX.crate(ev[1], ev[2]); break;
    case 'Pu': FX.powerup(ev[1], ev[2]); break;
    case 'Bl': FX.blast(ev[1]); break;
    case 'Kk': FX.kick(ev[1], ev[2]); break;
    case 'Cu': FX.curse(ev[1]); break;
    case 'Wl': FX.wall(ev[1], ev[2]); break;
    case 'S': FX.snd(ev[1]); break;
    case 'X': FX.sparkle(ev[1], ev[2], ev[3], ev[4], ev[5]); break;
    default: break;
  }
}
