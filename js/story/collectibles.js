// js/story/collectibles.js
// Collectibles hidden in furniture: a map prop can carry
//     hidden: { kind: 'sock', id: 'room-2-bed' }
// and examining it (Space, WorldScene.tryExamine) finds it once. Found ones are
// questState flags `found:<id>`, so they're saved with everything else. The
// totals are read from the maps, so adding one is a data-only change.
// Node-importable (story-check validates ids).
import { MAPS } from '../../maps/index.js';
import { questState } from './questState.js';

export const KINDS = {
  sock: { name: 'Calzino spaiato', plural: 'Calzini spaiati', icon: '🧦' },
};

// [{ kind, id, mapKey, prop }] for every hidden collectible in the game.
export const HIDDEN = Object.entries(MAPS).flatMap(([mapKey, m]) =>
  (m.props || []).filter((p) => p.hidden).map((p) => ({ ...p.hidden, mapKey, prop: p.key })));

export const foundFlag = (id) => `found:${id}`;
export const isFound = (id) => questState.hasFlag(foundFlag(id));

// { sock: { found, total, name, plural, icon } } — kinds present in the maps only.
export function collectionStatus() {
  const out = {};
  for (const h of HIDDEN) {
    const k = KINDS[h.kind];
    if (!k) continue;
    out[h.kind] ||= { ...k, found: 0, total: 0 };
    out[h.kind].total += 1;
    if (isFound(h.id)) out[h.kind].found += 1;
  }
  return out;
}
