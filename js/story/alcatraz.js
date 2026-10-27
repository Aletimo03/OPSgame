// js/story/alcatraz.js
// The night out of chapter 8. Leaving the house through the entrance's front
// door (map `exits`, id 'alcatraz') plays a video cutscene (CutsceneScene) and
// lands you inside the Alcatraz. The door only opens in chapter 8, after
// you've talked to Gabbo; otherwise it just says it's not the moment.
// Node-importable.
import { questState } from './questState.js';

export const ALCATRAZ = {
  chapter: 'chapter-8',
  partner: 'gabbo',                       // talk to him first (this chapter)
  arrivedFlag: 'alcatraz-arrived',
  video: 'assets/cutscenes/alcatraz.mp4', // the user's clip; without it a title card plays
  title: "Verso l'Alcatraz...",
  to: { mapKey: 'alcatraz', spawnName: 'default' },
  locked: ['Non è il momento di uscire.'],
  needPartner: ["Gabbo ti aspetta giù nella hall.", 'Prima passa da lui.'],
};

// What the front door does right now: 'go' | 'locked' | 'needPartner'.
export function exitState(id) {
  if (id !== 'alcatraz') return 'locked';
  if (questState.activeChapter !== ALCATRAZ.chapter) return 'locked';
  if (!questState.didIn('greeted', ALCATRAZ.partner)) return 'needPartner';
  return 'go';
}
