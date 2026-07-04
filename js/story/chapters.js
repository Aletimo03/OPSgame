// js/story/chapters.js
// Registry of every story chapter + helpers to read the currently-active quest.
import { questState } from './questState.js';
import chapter1 from './chapter-1/chapter-1.js';
import chapter2 from './chapter-2/chapter-2.js';
import chapter3 from './chapter-3/chapter-3.js';
import chapter4 from './chapter-4/chapter-4.js';
import chapter5 from './chapter-5/chapter-5.js';
import chapter6 from './chapter-6/chapter-6.js';
import chapter7 from './chapter-7/chapter-7.js';
import chapter8 from './chapter-8/chapter-8.js';
import chapter9 from './chapter-9/chapter-9.js';
import chapter10 from './chapter-10/chapter-10.js';
import chapter11 from './chapter-11/chapter-11.js';
import chapter12 from './chapter-12/chapter-12.js';

export const CHAPTERS = {
  'chapter-1': chapter1,
  'chapter-2': chapter2,
  'chapter-3': chapter3,
  'chapter-4': chapter4,
  'chapter-5': chapter5,
  'chapter-6': chapter6,
  'chapter-7': chapter7,
  'chapter-8': chapter8,
  'chapter-9': chapter9,
  'chapter-10': chapter10,
  'chapter-11': chapter11,
  'chapter-12': chapter12,
};

// Play order. When the active chapter's quest is complete, the story advances
// to the next chapter that actually has a quest defined.
const ORDER = [
  'chapter-1', 'chapter-2', 'chapter-3', 'chapter-4', 'chapter-5',
  'chapter-6', 'chapter-7', 'chapter-8', 'chapter-9', 'chapter-10',
  'chapter-11', 'chapter-12',
];

export function activeChapter() {
  return CHAPTERS[questState.activeChapter] || null;
}

// Call after progress changes (e.g. greeting an NPC) to roll forward chapters.
export function advanceChapterIfDone() {
  const q = activeQuest();
  if (!q || !q.complete) return;
  const i = ORDER.indexOf(questState.activeChapter);
  for (let j = i + 1; j < ORDER.length; j++) {
    if (CHAPTERS[ORDER[j]] && CHAPTERS[ORDER[j]].quest) {
      questState.activeChapter = ORDER[j];
      return;
    }
  }
}

// Whether a single objective is satisfied, by its TYPE. Each objective key maps
// to one questState predicate — this is the single switchboard that turns the
// declarative quest definitions into done/todo state. Add a new quest type by
// adding a key here (and a matching recorder somewhere in the game that calls
// the questState setter).
//
//   { npc:    'id' }      → talk to / greet that NPC          (interact quest)
//   { item:   'Name' }    → have that item in the bag         (search / fetch quest)
//   { defeat: 'id' }      → win a battle against that NPC      (fight quest)
//   { quiz:   'id' }      → answer that NPC's quiz correctly   (quiz quest)
//   { visit:  'map-key' } → enter that map at least once       (explore quest)
//   { flag:   'name' }    → an arbitrary flag was set          (custom quest)
function objectiveDone(o) {
  if (o.npc)    return questState.isGreeted(o.npc);
  if (o.item)   return questState.hasItem(o.item);
  if (o.defeat) return questState.isDefeated(o.defeat);
  if (o.quiz)   return questState.isSolved(o.quiz);
  if (o.visit)  return questState.hasVisited(o.visit);
  if (o.flag)   return questState.hasFlag(o.flag);
  return false;
}

// The active quest plus its objectives resolved with done-state, or null if the
// active chapter has no quest defined yet.
export function activeQuest() {
  const ch = activeChapter();
  if (!ch || !ch.quest) return null;
  const objectives = ch.quest.objectives.map((o) => ({
    ...o,
    done: objectiveDone(o),
  }));
  return {
    chapterTitle: ch.title,
    title: ch.quest.title,
    objectives,
    complete: objectives.every((o) => o.done),
  };
}
