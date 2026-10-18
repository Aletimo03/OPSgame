// maps/spawn-points/spawn-points.js
// Named spawn points. A character's `locations[chapter].map` may be either:
//   • a real map key (e.g. "base-kitchen", "room-13")  -> spawn at that map's
//     floor centroid (computed at spawn time in createNpcs), or
//   • a named spawn point below -> spawn at a specific tile of a real map.
//
// This lets you write `"map": "base-floor-main"` in a character's JSON and have
// them appear at the centre of the base floor's horizontal corridor, without
// ever looking up tile coordinates.
//
// The U-shaped base/first floors share the same corridor layout (plan coords),
// so we derive each corridor's centre tile via the same 180° rotation the map
// builder uses (rotRect).
import { rotRect } from '../../js/core/floorPlan.js';

const COLS = 72;
const ROWS = 48;

// Centre tile (grid coords) of a corridor given in PLAN coords.
const centerTile = (x, y, w, h) => {
  const r = rotRect(COLS, ROWS, x, y, w, h);
  return { tx: Math.floor(r.tx + r.w / 2), ty: Math.floor(r.ty + r.h / 2) };
};

// Corridor rects (plan coords) — identical on both floors. See base-floor.js /
// first-floor.js `corridors`.
const HALL          = [8, 14, 57, 7];  // bottom horizontal hall
const VERTICAL_ONE  = [12, 14, 7, 25]; // screen-right vertical
const VERTICAL_TWO  = [58, 14, 7, 25]; // screen-left vertical

export const SPAWN_POINTS = {
  // base floor (U-shape): main hall + the two vertical corridors
  'base-floor-main':       { map: 'base-floor', ...centerTile(...HALL) },
  'base-floor-vertical-1': { map: 'base-floor', ...centerTile(...VERTICAL_ONE) },
  'base-floor-vertical-2': { map: 'base-floor', ...centerTile(...VERTICAL_TWO) },
  // the Alcatraz (chapter 12): the second room (left) and the main hall's right side
  'alcatraz-sala2':   { map: 'alcatraz', tx: 7, ty: 13 },
  'alcatraz-sala2-b': { map: 'alcatraz', tx: 11, ty: 13 },
  'alcatraz-right':   { map: 'alcatraz', tx: 40, ty: 13 },
  // the living room ("hall principale"), beside the sofa (base-floor spawn `living` is on its seat side)
  'base-floor-living':     { map: 'base-floor', tx: 26, ty: 23 },
  // first floor (same shape)
  'first-floor-main':       { map: 'first-floor', ...centerTile(...HALL) },
  'first-floor-vertical-1': { map: 'first-floor', ...centerTile(...VERTICAL_ONE) },
  'first-floor-vertical-2': { map: 'first-floor', ...centerTile(...VERTICAL_TWO) },
};

// Resolve a `locations.map` value to { map, tx?, ty? }. A named spawn point
// returns its real map + tile; anything else is treated as a raw map key
// (no tile -> centroid).
export function resolveSpawn(name) {
  return SPAWN_POINTS[name] || { map: name };
}
