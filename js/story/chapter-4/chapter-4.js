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
// Chapter 4 also has the fridge task: Nima asks in the group chat; flags
// fridge-clean / cheese-thrown (and cheese-held, reset with the chapter).
export default {
  id: 'chapter-4',
  title: "Capitolo 4 — La Banda",
  // In-game time when this chapter starts (js/story/clock.js); its messages fit it.
  time: '23:00',
  // Hint sent to the house group chat (phone, key P) when this chapter starts.
  phone: [
    { from: 'mari', text: "Fede sta facendo casino nel corridoio principale del piano terra 😱🌸✨" },
    { from: 'mari', sticker: "🌸" },
    { from: 'gatta', text: "Pota, chi mi ferma? Io intanto vado a Brescia" },
    { from: 'gabbo', text: "O fra, Fede è dei nostri, diahane" },
    { from: 'nima', text: "Goodnights?? Chi ha lasciato il formaggio ammuffito nel frigo di su?? Pieno di mosche 🤢 somebody pulisca please! من فضلك" },
    // private chats (dm: true)
    { from: 'mari', text: "Hai visto Fede? 🥺🌸", dm: true },
    { from: 'mari', sticker: "🥺", dm: true },
  ],
  resetFlags: ['cheese-held'], // chapter select: also cleared when restarting from here
  quest: {
    id: 'beat-gatta',
    title: "Ferma Gatta e pulisci il frigo di su",
    objectives: [
      { defeat: 'gatta', label: 'Batti Gatta in combattimento' },
      // Fridge task (js/story/fridge.js, js/scenes/FridgeScene.js).
      { flag: 'fridge-clean', place: 'first-floor-kitchen', label: 'Pulisci il frigo di su dalle mosche' },
      { flag: 'cheese-thrown', place: 'first-floor-kitchen', label: 'Butta il formaggio ammuffito nei bidoni' },
    ],
  },
};
