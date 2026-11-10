// js/story/stealth.js
// The cigarette on the balcony (chapter `chapter-sigaretta`): Antonella hands
// Zio Nick a cigarette and he has to carry it across the first floor to the
// balcony off the drying-racks hall without Nima, Alessio or Sara seeing him.
//
// This file is the data + the pure rules (Node-importable, story-check proves
// the route can be done); js/scenes/world/stealth.js is the game side.
//
// Coordinates are in tiles (floats) and refer to a character's FEET: a tile
// row is walkable when the feet are on it, whatever the sprite overlaps above.
import { TILES } from '../config.js';
import { propColliders } from '../core/props.js';
import { questState } from './questState.js';

const DEG = Math.PI / 180;

export const STEALTH = {
  chapter: 'chapter-sigaretta',
  map: 'first-floor',
  balcony: 'balcony',
  flags: { held: 'sigaretta-held', smoked: 'sigaretta-fumata', caught: 'sigaretta-beccato' },
  sneakSpeed: 300, // px/s while carrying it (the normal 600 would cross any cone in a blink)
  vision: {
    range: 7,            // tiles
    halfAngle: 32 * DEG, // half of the cone's opening
    near: 1.1,           // this close they notice you whatever way they look
    noticeMs: 300,       // seen for this long = caught (the cone turns red meanwhile)
    graceMs: 1500,       // nobody notices you for this long after you enter the floor
  },
  // A guard's script: walk to `to`, or stand still `wait` seconds looking `look`.
  // It loops, so the last step must come back to `start`. Speeds in tiles/s.
  guards: [
    { // the corridor outside the kitchen: leaves first, you follow; at the pause, eyes on the wall,
      // you slip past on the other side
      id: 'nima', speed: 3.4, start: [56.5, 12.5],
      route: [
        { to: [56.5, 25] }, { wait: 1.4, look: 'left' },
        { to: [56.5, 12.5] }, { wait: 1.2, look: 'down' },
      ],
    },
    { // the hall west of the stairs: once you're out from under them the
      // guard is walking away, unless you took too long
      id: 'sara', speed: 3.2, start: [30.5, 30.5],
      route: [
        { to: [40.5, 30.5] }, { wait: 1, look: 'right' },
        { to: [30.5, 30.5] }, { wait: 1, look: 'right' },
        { to: [15.5, 30.5] }, { wait: 1, look: 'up' },
        { to: [30.5, 30.5] },
      ],
    },
    { // in the racks hall, on the spot, looking down the way to the balcony door
      id: 'timo', speed: 0, start: [23.5, 22.5],
      route: [
        { wait: 2.6, look: 'right' }, { wait: 1.6, look: 'down' }, { wait: 1.4, look: 'up' },
      ],
    },
  ],
  caught: { // what whoever sees you says (one of the two, at random)
    nima: [
      ['Buonanots?! Zio Nick, smoking in corridoio?? 😤', 'Give me la sigaretta. من فضلك'],
      ['Goodnights, my friend. What is this in mano?', 'No no no. Give me. الحمد لله I saw you.'],
    ],
    timo: [
      ['O fra. Corri 15 km e fumi?', 'Dammela.'],
      ['O fra.', 'Sigaretta. Qua.'],
    ],
    sara: [
      ['Zio Nick. Con la sigaretta in mano.', 'Dammela, prima che lo dico a tutta la cucina.'],
      ['Ti ho visto.', 'Quella la tengo io. Fila in cucina.'],
    ],
  },
  confiscated: (name) => `🚬 ${name} ti ha sequestrato la sigaretta`,
  smokeLines: [
    'Finalmente.',
    'Nessuno mi ha visto. Ovvio: traiettorie calcolate. Ingegneria spaziale.',
    '...Domani 15 km, però.',
  ],
};

// He's carrying it right now.
export const carryingCigarette = () => questState.activeChapter === STEALTH.chapter
  && questState.hasFlag(STEALTH.flags.held) && !questState.hasFlag(STEALTH.flags.smoked);

export function confiscateCigarette() {
  questState.flags.delete(STEALTH.flags.held);
  questState.setFlag(STEALTH.flags.caught);
}

const VEC = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const faceOf = (dx, dy) => (Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));

// A guard's script as timed segments (computed once per guard).
const compiled = new Map();
function segments(guard) {
  if (compiled.has(guard)) return compiled.get(guard);
  const segs = [];
  let [x, y] = guard.start, t = 0, facing = 'down';
  for (const step of guard.route) {
    if (step.to) {
      const [nx, ny] = step.to;
      const dur = Math.hypot(nx - x, ny - y) / guard.speed;
      facing = faceOf(nx - x, ny - y);
      segs.push({ t0: t, dur, x0: x, y0: y, x1: nx, y1: ny, facing, moving: true });
      [x, y] = step.to;
      t += dur;
    } else {
      facing = step.look;
      segs.push({ t0: t, dur: step.wait, x0: x, y0: y, x1: x, y1: y, facing, moving: false });
      t += step.wait;
    }
  }
  const out = { segs, total: t };
  compiled.set(guard, out);
  return out;
}

// Where a guard is `t` seconds into the loop: { x, y, facing, moving } (feet).
export function guardAt(guard, t) {
  const { segs, total } = segments(guard);
  const at = ((t % total) + total) % total;
  const s = segs.find((g) => at < g.t0 + g.dur) || segs[segs.length - 1];
  const k = s.dur ? (at - s.t0) / s.dur : 0;
  return { x: s.x0 + (s.x1 - s.x0) * k, y: s.y0 + (s.y1 - s.y0) * k, facing: s.facing, moving: s.moving };
}
export const routeLength = (guard) => segments(guard).total;

// What stops sight (and feet) on a map besides walls: solid furniture (the
// racks are cover) and the invisible walls round the stairs (WorldScene.setupStairsAccess).
export function sightBoxes(map) {
  const out = (map.props || []).filter((p) => p.solid).flatMap((p) => propColliders(p));
  const st = map.stairs;
  if (st?.enter) {
    out.push({ tx: st.tx, ty: st.ty + st.h, w: st.w, h: 1 });
    out.push(st.enter === 'left' ? { tx: st.tx + st.w, ty: st.ty, w: 1, h: st.h } : { tx: st.tx - 1, ty: st.ty, w: 1, h: st.h });
  }
  return out;
}

// Can sight pass through this point? Walls and doors stop it, and `boxes` (sightBoxes).
const open = (grid, boxes, x, y) => grid[Math.floor(y)]?.[Math.floor(x)] === TILES.FLOOR
  && !boxes.some((b) => x >= b.tx && x <= b.tx + b.w && y >= b.ty && y <= b.ty + b.h);

// How far a ray from (x, y) at `angle` goes, up to `max` tiles.
export function rayLength(grid, boxes, x, y, angle, max) {
  const step = 0.15, ca = Math.cos(angle), sa = Math.sin(angle);
  for (let d = step; d <= max; d += step) {
    if (!open(grid, boxes, x + ca * d, y + sa * d)) return d - step;
  }
  return max;
}

export const facingAngle = (facing) => Math.atan2(VEC[facing][1], VEC[facing][0]);

// Does a guard (state from guardAt) notice feet at (px, py)?
// 'near' = too close, 'cone' = in the cone with a clear line, false = no.
export function sees(state, px, py, grid, boxes, vision = STEALTH.vision) {
  const dx = px - state.x, dy = py - state.y, dist = Math.hypot(dx, dy);
  if (dist <= vision.near) return 'near';
  if (dist > vision.range) return false;
  const [fx, fy] = VEC[state.facing];
  if ((dx * fx + dy * fy) / dist < Math.cos(vision.halfAngle)) return false;
  return rayLength(grid, boxes, state.x, state.y, Math.atan2(dy, dx), dist) >= dist - 0.2 ? 'cone' : false;
}
