// js/story/fridge.js
// The fridge task (chapter 4). In the first-floor kitchen, Space facing the
// right end of the wall cabinets (ZONE, where the fridge is) starts a
// first-person minigame (js/scenes/FridgeScene.js): shoot the flies with
// white detergent, then the fridge is clean and you hold the mouldy cheese,
// which you throw away by pressing Space at the kitchen bins.
// Flags: fridge-clean (minigame won), cheese-held, cheese-thrown — the first and
// last are chapter-4 objectives. Node-importable.
import { questState } from './questState.js';

export const FRIDGE = {
  chapter: 'chapter-4',
  map: 'first-floor-kitchen',
  // Right end of the cabinets' bottom edge (tiles); you stand below, facing up.
  zone: { tx: 18, ty: 2.6, w: 5, h: 0.7 },
  flies: 10,          // flies to swat in total
  onScreen: 4,        // at most this many at once
  ammo: 3,            // shots before reloading
  reloadMs: 3000,
  flags: { clean: 'fridge-clean', held: 'cheese-held', thrown: 'cheese-thrown' },
  intro: ['Che puzza... in fondo al frigo c\'è un formaggio ammuffito, pieno di mosche!', 'Zio Nick impugna lo spruzzino del detersivo.'],
  done: 'Frigo pulito! Hai preso il formaggio ammuffito 🧀\nOra buttalo nei bidoni.',
  throwLines: ['Zio Nick butta il formaggio ammuffito nei bidoni.', 'Addio formaggio, addio mosche.'],
};

const F = FRIDGE.flags;
export const fridgeOpen = () => questState.activeChapter === FRIDGE.chapter && !questState.hasFlag(F.clean);
export const holdingCheese = () => questState.hasFlag(F.held) && !questState.hasFlag(F.thrown);

export function fridgeCleaned() {
  questState.setFlag(F.clean);
  questState.setFlag(F.held);
}

export function throwCheese() {
  questState.setFlag(F.thrown);
  questState.flags.delete(F.held);
}
