// js/story/fridge.js
// The fridge task (chapter 7). In the first-floor kitchen, Space facing the
// right end of the wall cabinets (ZONE, where the fridge is) starts a
// first-person minigame (js/scenes/FridgeScene.js): shoot the flies with
// white detergent, then the fridge is clean and you hold the mouldy cheese,
// which you throw away by pressing Space at the kitchen bins. Behind it: an
// Alcatraz wristband (`found`), the lead to chapter 8.
// Flags: fridge-clean (minigame won), cheese-held, cheese-thrown — the first and
// last are chapter-7 objectives. Node-importable.
import { questState } from './questState.js';

export const FRIDGE = {
  chapter: 'chapter-7',
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
  // What was behind the cheese: the lead to the Alcatraz (chapter 8). WorldScene.say.
  found: [
    "Dietro il formaggio c'è qualcos'altro: un braccialetto dell'Alcatraz.",
    { who: 'zionick', text: "Un braccialetto dell'Alcatraz in frigo. Chi va all'Alcatraz in questa casa?" },
  ],
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
