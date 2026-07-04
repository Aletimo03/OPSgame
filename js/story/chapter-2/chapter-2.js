// js/story/chapter-2/chapter-2.js
// Chapter 2 — track down Gabbo (he's in the base-floor living). Talking to him
// branches into a battle. The objective completes the moment you reach/greet
// him. (Becomes the active chapter once Chapter 1 is finished.)
export default {
  id: 'chapter-2',
  title: 'Chapter 2 — Alcatraz',
  quest: {
    id: 'find-gabbo',
    title: 'Find Gabbo in the living',
    objectives: [{ npc: 'gabbo', label: 'Confront Gabbo' }],
  },
};
