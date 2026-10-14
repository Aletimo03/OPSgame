// js/story/chapter-3/chapter-3.js
// Chapter 3 — after dealing with Gabbo, head to the first-floor kitchen to
// pick up two items from Alessio and Sara.
export default {
  id: 'chapter-3',
  title: "Capitolo 3 — Rinforzi",
  // In-game time when this chapter starts (js/story/clock.js); its messages fit it.
  time: '11:00',
  // Hint sent to the house group chat (phone, key P) when this chapter starts.
  phone: [
    { from: 'timo', text: "O fra, cucina primo piano. Roba per te." },
    { from: 'gaia', text: "Sono con Alessio in cucina di su 💕" },
    { from: 'sara', text: "Anch'io sono di sopra, ho una cosa per Zio Nick" },
    { from: 'ana', text: "Bro, Zio Nick ran 15 km this morning?? Insane 🏃" },
    // private chats (dm: true)
    { from: 'gaia', text: "Hai visto Alessio? Non risponde 😤", dm: true },
    { from: 'ana', text: "Bro aperitivo friday at mine, you in? 🥑", dm: true },
  ],
  quest: {
    id: 'collect-items',
    title: "Fatti dare rinforzi in cucina di su",
    // item-based objectives: done once questState.hasItem(name) is true.
    objectives: [
      { item: 'Trenbolone',    label: "Fatti dare qualcosa da Alessio" },
      { item: 'Palle a terra', label: "Fatti dare qualcosa da Sara"  },
    ],
  },
};
