// js/story/chapter-8/chapter-8.js
// Chapter 8 — INTERACT QUEST. After all the chaos, do the rounds and make peace.
// `{ npc: 'id' }` completes when questState.isGreeted(id) is true — set in
// WorldScene.tryInteract the moment you talk to that NPC.
//
// NOTE: like all of these Sets, `greeted` is permanent, so an interact objective
// is satisfied by ANY past conversation with that id. These two (Ana, Gaia) are
// chosen because they aren't *required* talks in earlier chapters; if you'd
// rather force a fresh greeting, pick ids the player can't have met yet.
export default {
  id: 'chapter-8',
  title: 'Chapter 8 — Pace Fatta',
  // Hint sent to the house group chat (phone, key P) when this chapter starts.
  phone: [{ from: 'ema', text: 'È tornata la pace! Passa a fare un saluto ad Ana e Gaia nei corridoi del piano terra.' }],
  quest: {
    id: 'make-peace',
    title: 'Fai il giro e saluta tutti',
    objectives: [
      { npc: 'ana',  label: 'Parla con Ana' },
      { npc: 'gaia', label: 'Parla con Gaia' },
    ],
  },
};
