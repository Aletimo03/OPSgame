// js/story/chapter-6/chapter-6.js
// Chapter 6 — EXPLORE QUEST. As the house "sbirro", inspect the two service
// rooms. `{ visit: 'map-key' }` completes when questState.hasVisited(key) is
// true, which WorldScene.create records the moment you enter a map. No NPC is
// required for this kind of quest — just walking into the room ticks it off.
export default {
  id: 'chapter-6',
  title: 'Chapter 6 — Ispezione',
  quest: {
    id: 'inspect-rooms',
    title: 'Ispeziona i locali di servizio',
    objectives: [
      { visit: 'laundry-room',  label: 'Controlla la lavanderia' },
      { visit: 'first-floor-kitchen', label: 'Controlla cucina di su' },
    ],
  },
};
