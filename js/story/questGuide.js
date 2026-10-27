// js/story/questGuide.js
// Where each objective of the active quest can be done — read straight from the
// data (character `locations`, item givers, visit targets), so it never goes
// stale. Used by the phone (P: "where to go") and the minimap (M: markers).
import { questState } from './questState.js';
import { activeQuest } from './chapters.js';
import { CHARACTERS, getCharData, locationFor } from '../core/characters.js';
import { SPAWN_POINTS, resolveSpawn } from '../../maps/spawn-points/spawn-points.js';
import { MAPS } from '../../maps/index.js';

// The two floors every other map hangs off (via a door warp).
export const HUBS = ['base-floor', 'first-floor'];

const PLACE = {
  'base-floor': 'Piano terra',
  'first-floor': 'Primo piano',
  'base-kitchen': 'Cucina del piano terra',
  'first-floor-kitchen': 'Cucina del primo piano',
  'first-floor-bathroom': 'Shared Bathroom & Laundry',
  'laundry-room': 'Lavanderia',
  alcatraz: 'Alcatraz (Milano)',
  'trashbin-room': 'Stanza dei bidoni',
  entrance: 'Ingresso',
};
const AREA = {
  main: 'corridoio principale',
  'vertical-1': 'corridoio verticale 1',
  'vertical-2': 'corridoio verticale 2',
};

// Readable Italian name for a map key or a named spawn point.
export function placeName(name) {
  if (!name) return '—';
  const sp = SPAWN_POINTS[name];
  if (sp) {
    const area = AREA[name.slice(sp.map.length + 1)];
    return area ? `${PLACE[sp.map]} · ${area}` : PLACE[sp.map];
  }
  if (PLACE[name]) return PLACE[name];
  const room = /^room-(\d+)$/.exec(name);
  if (room) return `Camera ${room[1]}`;
  return MAPS[name]?.name || name;
}

// Average floor tile of a grid (fallback position on a hub).
function centroid(grid) {
  let sx = 0, sy = 0, n = 0;
  grid.forEach((row, y) => row.forEach((v, x) => { if (v === 0) { sx += x; sy += y; n++; } }));
  return n ? { tx: Math.round(sx / n), ty: Math.round(sy / n) } : { tx: 0, ty: 0 };
}

// A position on one of the two floors for any map: on a hub, the tile itself
// (or its centre); in any other map, the hub door that leads into it.
export function hubPosition(mapKey, tx, ty) {
  if (HUBS.includes(mapKey)) {
    return tx != null ? { hub: mapKey, tx, ty } : { hub: mapKey, ...centroid(MAPS[mapKey].grid) };
  }
  for (const hub of HUBS) {
    const w = (MAPS[hub].warps || []).find((x) => x.to === mapKey);
    if (w) return { hub, tx: w.tx + ((w.w || 2) - 1) / 2, ty: w.ty + ((w.h || 1) - 1) / 2 };
  }
  return null;
}

// [{ label, done, who, place, where, mapKey, tx, ty }] for the active quest.
// `scene` is any scene with the character JSONs cached (WorldScene).
export function objectiveTargets(scene) {
  const q = activeQuest();
  if (!q) return [];
  const ch = questState.activeChapter;
  return q.objectives.map((o) => {
    const t = { label: o.label, done: o.done, hidden: o.hidden, who: null, place: null, mapKey: null, tx: null, ty: null };
    if (o.visit || o.place) {
      t.place = o.visit || o.place;
      t.mapKey = t.place;
    } else if (!o.flag || o.at) {
      const id = o.item
        ? CHARACTERS.find((c) => getCharData(scene, c).chapters?.[ch]?.item?.name === o.item)
        : o.npc || o.defeat || o.quiz || o.at;
      const data = id ? getCharData(scene, id) : null;
      const loc = data ? locationFor(data, ch) : null;
      if (loc) {
        const sp = resolveSpawn(loc.map);
        Object.assign(t, { who: data.name || id, place: loc.map, mapKey: sp.map, tx: sp.tx ?? null, ty: sp.ty ?? null });
      }
    }
    t.where = placeName(t.place);
    return t;
  });
}

// Ids of the characters the active quest still needs (talk / beat / quiz /
// item giver / a flag objective's `at`), for the "!" over their heads in
// WorldScene. Hidden objectives (`after`) don't count yet.
export function questNpcIds(scene) {
  const q = activeQuest();
  const ids = new Set();
  if (!q) return ids;
  const ch = questState.activeChapter;
  for (const o of q.objectives) {
    if (o.done || o.hidden) continue;
    const id = o.item
      ? CHARACTERS.find((c) => getCharData(scene, c).chapters?.[ch]?.item?.name === o.item)
      : o.npc || o.defeat || o.quiz || o.at;
    if (id) ids.add(id);
  }
  return ids;
}
