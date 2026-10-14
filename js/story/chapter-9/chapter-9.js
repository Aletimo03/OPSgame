// js/story/chapter-9/chapter-9.js
// Chapter 9 — INTERACT QUEST. After all the chaos, do the rounds and make peace.
// `{ npc: 'id' }` completes when questState.isGreeted(id) is true — set in
// WorldScene.tryInteract the moment you talk to that NPC.
//
// NOTE: like all of these Sets, `greeted` is permanent, so an interact objective
// is satisfied by ANY past conversation with that id. These two (Ana, Gaia) are
// chosen because they aren't *required* talks in earlier chapters; if you'd
// rather force a fresh greeting, pick ids the player can't have met yet.
export default {
  id: 'chapter-9',
  title: "Capitolo 9 — Gli indizi",
  // In-game time when this chapter starts (js/story/clock.js); its messages fit it.
  time: '18:30',
  // Hint sent to the house group chat (phone, key P) when this chapter starts.
  phone: [
    { from: 'ema', text: "O Szio Nick, passa a salutare Ana e Gaia nei corridoi del piano terra. Grszie. Ma dov'è la farmacia?" },
    { from: 'ana', text: "Aperitivo tonight at mine bros, guacamole ready 🥑" },
    { from: 'gaia', text: "Arrivo dopo, sono con Alessio 🍜" },
    // private chats (dm: true)
    { from: 'gabbo', text: "O fra, stasera Plein? diahane", dm: true },
  ],
  quest: {
    id: 'make-peace',
    title: "Chiedi in giro: qualcuno ha visto i meloni?",
    objectives: [
      { npc: 'ana',  label: 'Parla con Ana' },
      { npc: 'gaia', label: 'Parla con Gaia' },
    ],
  },
};
