// js/story/chapter-7/chapter-7.js
// Chapter 7 — SEARCH / FETCH QUEST. Gather supplies scattered across the house.
// `{ item: 'Name' }` completes when questState.hasItem('Name') is true. The
// items are handed over by NPCs whose character.json defines an `item` in their
// `chapters.chapter-7` entry (Sara → Caffè in the base kitchen, Mari → Birra in
// a first-floor corridor). Multiple item objectives = a multi-stop fetch run.
export default {
  id: 'chapter-7',
  title: 'Chapter 7 — La Spesa',
  quest: {
    id: 'gather-supplies',
    title: 'Raccogli le provviste per la casa',
    objectives: [
      { item: 'Caffè', label: 'Prendi il Caffè da Sara' },
      { item: 'Birra', label: 'Prendi la Birra da Mari' },
    ],
  },
};
