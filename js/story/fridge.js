// js/story/fridge.js
// The fridge with the flies (Capitolo 2 — Il formaggio ammuffito). In the
// first-floor kitchen, Space facing the right end of the wall cabinets (ZONE,
// where the fridge is) starts a first-person minigame (js/scenes/FridgeScene.js):
// shoot the flies with white detergent, then the fridge is clean and the
// mouldy cheese goes in the bins. Needs the group message read first
// (`requires`). Flag `clean` = the chapter's objective. Node-importable.
// (Until 2026-11-11 the old story's chapter 7 was a second fridge chapter:
// merged into this one, user's request.)
import { questState } from './questState.js';

export const FRIDGE = {
  chapter: 'chapter-formaggio',
  map: 'first-floor-kitchen',
  // Right end of the cabinets' bottom edge (tiles); you stand below, facing up.
  zone: { tx: 18, ty: 2.6, w: 5, h: 0.7 },
  flies: 5,           // flies to swat in total
  onScreen: 4,        // at most this many at once
  ammo: 3,            // shots before reloading
  reloadMs: 3000,
  clean: 'frigo-pulito',
  requires: 'formaggio-letto',
  intro: ['Che puzza... eccolo: il formaggio ammuffito, pieno di mosche.', 'Prendo lo spruzzino del detersivo.'],
  found: ['Frigo pulito. Il formaggio va dritto nei bidoni.', 'La mia spesa è salva. Quella che è rimasta.'],
};

export const fridgeOpen = () => questState.activeChapter === FRIDGE.chapter
  && (!FRIDGE.requires || questState.hasFlag(FRIDGE.requires)) && !questState.hasFlag(FRIDGE.clean);

export function fridgeCleaned() {
  questState.setFlag(FRIDGE.clean);
}
