// js/core/characters.js
// Per-character data lives in assets/characters/<folder>/character.json and is
// the SINGLE SOURCE OF TRUTH for a character's name, stats, and what they say
// or do in each chapter. Maps only place a character (id, character folder,
// position) — they hold no dialogue or battle data.
//
// character.json shape:
//   {
//     "name": "Gabbo",
//     "stats": { "maxHp": 30, "attack": 7, "defense": 2 },
//     "moves": [ ... ],          // protagonist only; enemy attack uses stats
//     "default": "ambient line", // shown when the active chapter has no entry
//     "chapters": {
//       "chapter-2": {
//         "dialogue": ["line a", "line b"],
//         "dialogueAfter": "repeat-visit line",   // optional
//         "battle": { "prompt": "...", "options": ["..."] },  // optional -> fight
//         "quiz":   { "prompt": "...", "options": ["..."], "answer": 0,
//                     "correct": "...", "wrong": "..." },     // optional -> quiz
//         "item":   { "name": "...", "description": "...", "buff": { "attack": 5 } }
//       }
//     }
//   }
//
// Because `battle`/`quiz`/`item` only ever live inside a chapter entry, a fight,
// quiz, or item-give can ONLY be triggered during the chapter that defines it —
// you can never start one in a chapter where it wasn't meant to happen.

import { questState } from '../story/questState.js';
import { resolveSpawn } from '../../maps/spawn-points/spawn-points.js';

export const DEFAULT_STATS = { maxHp: 30, attack: 5, defense: 2 };

// Every spawnable character (folder name under assets/characters/). The
// protagonist (zionick) is the player and is NOT spawned as an NPC, so they're
// excluded here. Add a folder name here when you add a new character.
export const CHARACTERS = [
  'ana', 'caue', 'ema', 'ernesto', 'gabbo', 'gaia', 'gatta', 'lilia', 'mari', 'nima', 'sara', 'timo',
];

// Phaser cache key for a character's parsed JSON.
export const dataKey = (folder) => `${folder}-data`;

// Read a character's parsed JSON from the scene cache ({} if missing).
export function getCharData(scene, folder) {
  return (folder && scene.cache.json.get(dataKey(folder))) || {};
}

// Resolve what a character should say / do RIGHT NOW, based on the active
// chapter. Falls back to the `default` line when the chapter has no entry.
// Battle and item are only ever returned from a chapter entry.
export function resolveInteraction(data) {
  const ch = questState.activeChapter;
  const entry = data && data.chapters && data.chapters[ch];
  if (entry) {
    return {
      dialogue: entry.dialogue ?? data.default ?? '...',
      dialogueAfter: entry.dialogueAfter ?? null,
      battle: entry.battle ?? null,
      quiz: entry.quiz ?? null,
      item: entry.item ?? null,
    };
  }
  return {
    dialogue: (data && data.default) ?? '...',
    dialogueAfter: null,
    battle: null,
    quiz: null,
    item: null,
  };
}

// A character's base stats, with sane defaults.
export function baseStats(data) {
  return { ...DEFAULT_STATS, ...((data && data.stats) || {}) };
}

// Where a character is during a given chapter (explicit per chapter): returns
// { map, tx, ty, facing? } or null if they don't appear that chapter.
export function locationFor(data, chapter) {
  return (data && data.locations && data.locations[chapter]) || null;
}

// Build the list of characters that should be spawned in `mapKey` for the
// active chapter: [{ character, data, at }] where `at` = { tx?, ty?, facing? }.
// A character's `locations[chapter].map` is resolved through the spawn-point
// registry: a named spawn point yields a specific tile, a raw map key yields no
// tile (createNpcs then uses the map's centroid). This is the single source of
// NPC placement — maps no longer carry an `npcs` array.
export function placementsForMap(scene, mapKey) {
  const ch = questState.activeChapter;
  const out = [];
  for (const folder of CHARACTERS) {
    const data = getCharData(scene, folder);
    const loc = locationFor(data, ch);
    if (!loc) continue;
    const sp = resolveSpawn(loc.map);
    if (sp.map !== mapKey) continue;
    out.push({
      character: folder,
      data,
      at: { tx: sp.tx, ty: sp.ty, facing: loc.facing, wander: loc.wander, wanderRadius: loc.wanderRadius },
    });
  }
  return out;
}
