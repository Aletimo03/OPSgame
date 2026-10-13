// js/story/chapter-4/chapter-4.js
// Chapter 4 — FIGHT QUEST. Gabbo's accomplice Gatta is causing trouble. This
// objective only completes when you actually WIN the battle (not merely greet
// her): `{ defeat: 'gatta' }` ticks off in BattleScene.endBattle when
// pendingEnd === 'win'.
//
// NOTE on fight quests: questState.defeated is a permanent Set keyed by NPC id,
// so a `{ defeat: 'id' }` objective is satisfied by ANY past win against that
// id. Use a FRESH id (one not fought in an earlier chapter) for each fight
// quest, or it will already be ticked. That's why this is Gatta, not Gabbo —
// Gabbo's chapter-2 battle would have pre-completed a `{ defeat: 'gabbo' }`.
export default {
  id: 'chapter-4',
  title: 'Chapter 4 — La Banda',
  // Hint sent to the house group chat (phone, key P) when this chapter starts.
  phone: [{ from: 'mari', text: 'Gatta sta facendo casino nel corridoio principale del piano terra. Pota.' }],
  quest: {
    id: 'beat-gatta',
    title: 'Ferma Gatta, la complice di Gabbo',
    objectives: [
      { defeat: 'gatta', label: 'Batti Gatta in combattimento' },
    ],
  },
};
