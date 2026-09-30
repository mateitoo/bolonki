// Simulación a paso fijo (120 Hz): pods, lanzamientos, pelotas y colisiones.
import { H, R, G, PL, PRc, BR, SMAX, SIDES, CORN, BALL, HUMAN_SPEED, rnd, clamp } from '../config.js';
import { game, world } from '../state.js';
import { removeBall } from '../world/balls.js';
import { dropDot } from '../fx/particles.js';
import { FX } from './fx.js';
import { aiMove } from './ai.js';
import { localAxis } from './controls.js';
import { podPos, fireFrom, scoreGoal, startSwing } from './match.js';

// Mueve un pod hacia la velocidad pedida (tv). Lo usan el jugador local, los bots y los invitados.
export function movePod(p, tv, dt) {
  p.v += (tv - p.v) * Math.min(1, dt * (p.ctrl === 'local' ? 24 : 15));
  p.s += p.v * dt;
  if (p.s > SMAX) { p.s = SMAX; p.v = 0; }
  if (p.s < -SMAX) { p.s = -SMAX; p.v = 0; }
  podPos(p);
}

const playing = () => game.state === 'play' || game.state === 'title' || game.state === 'menu';

export function step(dt) {
  if (playing()) game.elapsed += dt;

  // --- pods ---
  for (const p of game.players) {
    p.cd -= dt; if (p.swing > 0) p.swing -= dt;
    if (!p.alive) { p.v = 0; continue; }
    if (p.ctrl === 'remote') {
      // lo maneja un invitado: usamos la última posición que mandó
      if (p.net) { p.s = clamp(p.net.s, -SMAX, SMAX); p.v = p.net.v; if (p.net.hit) { p.net.hit = false; if (p.cd <= 0) startSwing(p); } }
      podPos(p); continue;
    }
    const tv = p.ctrl === 'local' ? localAxis(p) * HUMAN_SPEED : p.ctrl === 'ai' && game.state !== 'end' ? aiMove(p, dt) : 0;
    movePod(p, tv, dt);
  }

  if (game.state === 'count') {
    const before = Math.ceil(game.countT); game.countT -= dt; const after = Math.ceil(game.countT);
    if (after !== before) { if (after > 0) { if (after <= 3) FX.tick(); } else { FX.go(); game.state = 'play'; } }
    return;
  }

  // --- lanzamientos desde las torres, con aviso en los chevrones ---
  if (playing() && !game.pendingEnd) {
    const target = Math.min(BALL.maxCount, BALL.startCount + Math.floor(game.elapsed / BALL.addEvery));
    const active = game.balls.filter((b) => b.on).length;
    if (game.pending) {
      game.pending.t -= dt;
      if (game.pending.t <= 0) {
        fireFrom(game.pending.ci); world.chevSets[game.pending.ci].warn = 0;
        game.pending = null; game.spawnT = rnd(0.5, 1.2);
      }
    } else if (active < target) {
      game.spawnT -= dt;
      if (game.spawnT <= 0) {
        const ci = (Math.random() * 4) | 0;
        game.pending = { ci, t: 0.7 }; FX.warn(ci);
      }
    }
  }

  const floorSp = BALL.floorStart + Math.min(game.elapsed / 20, BALL.floorGain);
  for (const b of game.balls) {
    if (!b.on) continue;
    if (b.power > 0) b.power -= dt;
    b.x += b.vx * dt; b.z += b.vz * dt;
    b.trailT -= dt;
    if (b.trailT <= 0) { b.trailT = 0.04; dropDot(b.x - b.vx * 0.02, b.z - b.vz * 0.02); }

    // torres
    let inside = false;
    for (const c of CORN) {
      const dx = b.x - c[0], dz = b.z - c[1], d2 = dx * dx + dz * dz, rr = R + BR;
      if (d2 < rr * rr) {
        inside = true; if (b.fresh) continue;
        const d = Math.sqrt(d2) || 1e-3, mx = dx / d, mz = dz / d;
        b.x = c[0] + mx * rr; b.z = c[1] + mz * rr;
        const vn = b.vx * mx + b.vz * mz;
        if (vn < 0) {
          b.vx -= 2 * vn * mx; b.vz -= 2 * vn * mz;
          const a = rnd(-0.08, 0.08), ca = Math.cos(a), sa = Math.sin(a), vx = b.vx;
          b.vx = vx * ca - b.vz * sa; b.vz = vx * sa + b.vz * ca;
          FX.bounce();
        }
      }
    }
    if (b.fresh && !inside) b.fresh = false;

    // lados: arco abierto, o pared/barrera si el dueño está eliminado
    let gone = false;
    for (let i = 0; i < 4; i++) {
      const s = SIDES[i], d = b.x * s.nx + b.z * s.nz, tn = b.x * s.tx + b.z * s.tz;
      const owner = game.players[i];
      if (!owner.alive || Math.abs(tn) > G) {
        const lim = (owner.alive ? H : H - 0.3) - BR;
        if (d > lim) {
          b.x -= s.nx * (d - lim); b.z -= s.nz * (d - lim);
          const vn = b.vx * s.nx + b.vz * s.nz;
          if (vn > 0) { b.vx -= 2 * vn * s.nx; b.vz -= 2 * vn * s.nz; FX.bounce(); }
        }
      } else if (d > H + 0.6 && !b.fresh) {
        if (playing()) scoreGoal(i, b); else removeBall(b);
        gone = true; break;
      }
    }
    if (gone) continue;

    // pods (colisión con cápsula)
    for (const p of game.players) {
      if (!p.alive) continue;
      const s = p.side;
      const u = clamp((b.x - p.x) * s.tx + (b.z - p.z) * s.tz, -PL, PL);
      const cx = p.x + s.tx * u, cz = p.z + s.tz * u;
      const reach = PRc + BR + (p.swing > 0 ? 0.55 : 0);
      const dx = b.x - cx, dz = b.z - cz, d2 = dx * dx + dz * dz;
      if (d2 >= reach * reach) continue;
      const d = Math.sqrt(d2) || 1e-3, mx = dx / d, mz = dz / d;
      const ix = -s.nx, iz = -s.nz;
      const front = mx * ix + mz * iz > -0.25;       // si ya pasó por detrás, se va al arco
      const rn = (b.vx - p.vx) * mx + (b.vz - p.vz) * mz;
      if (p.swing > 0 && !p.hitDone && front) {
        // golpe fuerte: acelera y apunta según hacia dónde se mueve el pod
        p.hitDone = true;
        const sp = Math.min(Math.max(Math.hypot(b.vx, b.vz), 12) * 1.35 + 3, BALL.maxPower);
        const aim = (p.v / HUMAN_SPEED) * 0.6;
        const ox = mx + ix * 0.9 + s.tx * aim, oz = mz + iz * 0.9 + s.tz * aim, l = Math.hypot(ox, oz);
        b.vx = (ox / l) * sp; b.vz = (oz / l) * sp; b.power = 1.4;
        FX.power(b.x, b.z);
      } else if (rn < 0) {
        b.vx -= 2 * rn * mx; b.vz -= 2 * rn * mz; b.vx += p.vx * 0.35; b.vz += p.vz * 0.35;
        if (front) { const inn = b.vx * ix + b.vz * iz; if (inn < 5) { b.vx += ix * (5 - inn); b.vz += iz * (5 - inn); } }
        const sp = Math.hypot(b.vx, b.vz), ns = Math.min(sp * 1.03 + 0.2, BALL.maxNormal);
        b.vx *= ns / sp; b.vz *= ns / sp;
        FX.pod();
      }
      const pr = PRc + BR;
      if (d < pr) { b.x = cx + mx * pr; b.z = cz + mz * pr; }
    }

    // velocidad mínima y máxima
    const sp = Math.hypot(b.vx, b.vz);
    const max = b.power > 0 ? BALL.maxPower : BALL.maxNormal;
    if (sp < floorSp) {
      if (sp < 0.1) { b.vx = rnd(-1, 1); b.vz = rnd(-1, 1); }
      const k = floorSp / Math.hypot(b.vx, b.vz); b.vx *= k; b.vz *= k;
    } else if (sp > max) {
      const k = Math.max(max / sp, 0.985); b.vx *= k; b.vz *= k;
    }
    if (Math.abs(b.x) > H + 4 || Math.abs(b.z) > H + 4) removeBall(b);
  }

  // choques entre pelotas
  const B = game.balls;
  for (let i = 0; i < B.length; i++) {
    const a = B[i]; if (!a.on) continue;
    for (let j = i + 1; j < B.length; j++) {
      const b = B[j]; if (!b.on) continue;
      const dx = a.x - b.x, dz = a.z - b.z, d2 = dx * dx + dz * dz, rr = 2 * BR;
      if (d2 < rr * rr && d2 > 1e-6) {
        const d = Math.sqrt(d2), nx = dx / d, nz = dz / d, o = (rr - d) / 2;
        a.x += nx * o; a.z += nz * o; b.x -= nx * o; b.z -= nz * o;
        const rel = (a.vx - b.vx) * nx + (a.vz - b.vz) * nz;
        if (rel < 0) { a.vx -= rel * nx; a.vz -= rel * nz; b.vx += rel * nx; b.vz += rel * nz; FX.bounce(); }
      }
    }
  }
}
