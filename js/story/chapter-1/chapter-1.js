// js/story/chapter-1/chapter-1.js
// Chapter 1 — Zio Nick wakes up and his two melons are gone: he goes down to
// the base kitchen to ask the housemates. Each objective completes when you talk to
// (greet) the matching NPC. The quest is done once every objective is checked.
export default {
  id: 'chapter-1',
  title: "Capitolo 1 — Il risveglio",
  // In-game time when this chapter starts (js/story/clock.js); its messages fit it.
  time: '07:30',
  // Hint sent to the house group chat (phone, key P) when this chapter starts.
  phone: [
    { from: 'ema', text: "O Szio Nick, buongiorno! Siamo tutti nella cucina del piano terra, passa. Grszie" },
    { from: 'nima', text: "Buongiorns! Chi ha lasciato la padella nel lavandino? 😤 Kitchen piano terra, please" },
    { from: 'sara', text: "Ho appena fatto il caffè, chi lo vuole scenda" },
    { from: 'ema', text: "O Sara, ma la moka dove si compra? Grszie" },
    // private chats (dm: true)
    { from: 'ema', text: "O Szio Nick, scusa, sai dov'è la farmacia? Grszie", dm: true },
  ],
  quest: {
    id: 'greet-kitchen',
    title: "Chiedi in cucina dei tuoi due meloni",
    // objective.npc must match the `id` of an NPC placed in the kitchen map.
    objectives: [
      { npc: 'ema', label: "Chiedi a Emanuele" },
      { npc: 'sara', label: "Chiedi a Sara" },
      { npc: 'nima', label: "Chiedi a Nima" },
    ],
  },
};
