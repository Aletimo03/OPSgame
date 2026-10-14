// js/core/furniture.js
// Orientable furniture: turns a compact map entry
//     { furniture: 'divano', dir: 's', tx: 12, ty: 4 }
// into an ordinary prop (key, path, w, h, colliders, seats, baseY — all in
// ABSOLUTE map tiles), using the per-direction data in furniture-catalog.js.
// maps/index.js expands every map once at load, so WorldScene, NPC blocking
// (propBlockedTiles), the minimap and story-check only ever see normal props.
// Plain props (no `furniture` field) pass through untouched. No Phaser needed.
//
// Map entry fields:
//   furniture, dir   catalogue type + 'n' | 'e' | 's' | 'w'
//   tx, ty           where the image's TOP-LEFT goes (tiles), as for any prop
//   scale            optional size multiplier (default 1): scales the image AND
//                    every relative collider / seat / baseY with it
//   key, solid, ysort  optional overrides of the catalogue values
//   hidden           optional collectible found by examining it: { kind, id }
//   label, examine   optional texts overriding the catalogue's for this piece
//   sleep            true = examining it is a nap that restores full HP

import { FURNITURE } from './furniture-catalog.js';

export const DIRS = ['n', 'e', 's', 'w'];
export const FURNITURE_ROOT = 'assets/furniture';
const FACINGS = ['up', 'down', 'left', 'right'];

// Problems found while expanding (unknown type/dir, bad data). The game skips
// the broken entry and warns; story-check fails on any of these.
export const FURNITURE_ERRORS = [];

export const furnitureKey = (type, dir) => FURNITURE[type]?.dirs?.[dir]?.key || `${type}_${dir}`;
// assets/furniture/<group>/<type>/<type>_<dir>.png (no group → assets/furniture/<type>/…).
export const FURNITURE_GROUPS = ['kitchen', 'rooms', 'others'];
export const furniturePath = (type, dir) => {
  const group = FURNITURE[type]?.group;
  return FURNITURE[type]?.dirs?.[dir]?.path
    || `${FURNITURE_ROOT}/${group ? `${group}/` : ''}${type}/${type}_${dir}.png`;
};

const r4 = (v) => Math.round(v * 1e4) / 1e4; // no float dust in the absolute numbers

// Catalogue entry → list of problems ('' when fine). Used here and by story-check.
export function checkFurnitureEntry(type, dir) {
  const d = FURNITURE[type]?.dirs?.[dir];
  if (!FURNITURE[type]) return [`unknown furniture type '${type}'`];
  if (!DIRS.includes(dir)) return [`${type}: direction '${dir}' is not one of ${DIRS.join('/')}`];
  if (!d) return [`${type}: no '${dir}' view in the catalogue`];
  const out = [];
  const g = FURNITURE[type].group;
  if (g != null && !FURNITURE_GROUPS.includes(g)) out.push(`${type}: group '${g}' is not one of ${FURNITURE_GROUPS.join('/')}`);
  const num = (v) => typeof v === 'number' && Number.isFinite(v);
  if (!(num(d.w) && d.w > 0 && num(d.h) && d.h > 0)) out.push(`${type}_${dir}: w/h must be positive numbers`);
  const inside = (b) => b.x >= -0.01 && b.y >= -0.01 && b.x + b.w <= d.w + 0.01 && b.y + b.h <= d.h + 0.01;
  (d.colliders || []).forEach((c, i) => {
    if (![c.x, c.y, c.w, c.h].every(num)) out.push(`${type}_${dir}: collider ${i + 1} needs numeric x/y/w/h`);
    else if (!inside(c)) out.push(`${type}_${dir}: collider ${i + 1} sticks out of the image box`);
  });
  (d.seats || []).forEach((s, i) => {
    if (![s.x, s.y, s.w, s.h].every(num)) out.push(`${type}_${dir}: seat ${i + 1} needs numeric x/y/w/h`);
    else if (!inside(s)) out.push(`${type}_${dir}: seat ${i + 1} sticks out of the image box`);
    if (!FACINGS.includes(s.facing)) out.push(`${type}_${dir}: seat ${i + 1} facing must be ${FACINGS.join('/')}`);
  });
  if (d.baseY != null && !num(d.baseY)) out.push(`${type}_${dir}: baseY must be a number`);
  const ex = FURNITURE[type].examine;
  if (ex != null && !(Array.isArray(ex) && ex.length && ex.every((l) => typeof l === 'string' && l))) {
    out.push(`${type}: examine must be a non-empty list of lines`);
  }
  return out;
}

// One map entry → a normal prop, or null (logged in FURNITURE_ERRORS) if broken.
export function expandProp(p, mapKey = '?') {
  if (!p || p.furniture == null) return p;
  const problems = checkFurnitureEntry(p.furniture, p.dir);
  if (problems.length) {
    problems.forEach((m) => FURNITURE_ERRORS.push(`${mapKey}: ${m}`));
    if (typeof console !== 'undefined') console.warn(`[furniture] ${mapKey}: ${problems.join('; ')}`);
    return null;
  }
  const d = FURNITURE[p.furniture].dirs[p.dir];
  const k = p.scale ?? 1;
  const box = (b) => ({ tx: r4(p.tx + b.x * k), ty: r4(p.ty + b.y * k), w: r4(b.w * k), h: r4(b.h * k) });
  const prop = {
    key: p.key || furnitureKey(p.furniture, p.dir),
    path: furniturePath(p.furniture, p.dir),
    tx: p.tx,
    ty: p.ty,
    w: r4(d.w * k),
    h: r4(d.h * k),
    solid: p.solid ?? d.solid ?? true,
    furniture: p.furniture,
    dir: p.dir,
  };
  if (p.hidden) prop.hidden = { ...p.hidden }; // collectible (js/story/collectibles.js)
  const def = FURNITURE[p.furniture];
  // Texts: the map entry can override the catalogue's (e.g. Zio Nick's own bed).
  const examine = p.examine || def.examine;
  if (examine?.length) {
    prop.label = p.label || def.label || p.furniture;
    prop.examine = examine.slice();
  }
  if (p.onlyIn) prop.onlyIn = [...p.onlyIn]; // shown only in these chapters (WorldScene)
  if (p.clue) prop.clue = p.clue; // melon-investigation clue (js/story/investigation.js)
  if (p.side) prop.side = p.side; // side-quest thing hidden here (js/story/sideQuests.js)
  if (p.sleep) prop.sleep = true; // examining it = a nap, full HP (WorldScene.sleepInBed)
  const ysort = p.ysort ?? d.ysort;
  if (ysort === false) prop.ysort = false;
  if (d.baseY != null) prop.baseY = r4(p.ty + d.baseY * k);
  if (d.colliders?.length) prop.colliders = d.colliders.map(box);
  if (d.seats?.length) prop.seats = d.seats.map((s) => ({ ...box(s), facing: s.facing }));
  return prop;
}

// Expand a map's props in place (idempotent: expanded props have no `furniture`
// lookup left to do because they already carry key/path/colliders).
export function expandMapProps(map, mapKey) {
  if (!Array.isArray(map?.props)) return map;
  map.props = map.props
    .map((p) => (p && p.furniture != null && p.path == null ? expandProp(p, mapKey) : p))
    .filter(Boolean);
  return map;
}
