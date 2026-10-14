// js/story/chapter-8/chapter-8.js
// Chapter 8 — SEARCH / FETCH QUEST. Gather supplies scattered across the house.
// `{ item: 'Name' }` completes when questState.hasItem('Name') is true. The
// items are handed over by NPCs whose character.json defines an `item` in their
// `chapters.chapter-7` entry (Sara → Caffè in the base kitchen, Mari → Birra in
// a first-floor corridor). Multiple item objectives = a multi-stop fetch run.
export default {
  id: 'chapter-8',
  title: "Capitolo 8 — La Spesa",
  // In-game time when this chapter starts (js/story/clock.js); its messages fit it.
  time: '17:30',
  // Hint sent to the house group chat (phone, key P) when this chapter starts.
  phone: [
    { from: 'sara', text: "Servono provviste: io ho il caffè nella cucina di sotto, Mari ha la birra al primo piano." },
    { from: 'mari', text: "Birra fresca al primo piano 🌼🍺 mentre aspetto Fede 🥺" },
    { from: 'mari', sticker: "🍺" },
    { from: 'gatta', text: "Pota, la birra di Brescia è meglio" },
    { from: 'ema', text: "O Sara, ma il supermercato più vicino qual è? Grszie" },
    // private chats (dm: true)
    { from: 'gatta', text: "Pota, sabato vieni a Brescia?", dm: true },
  ],
  quest: {
    id: 'gather-supplies',
    title: "Senza meloni servono provviste",
    objectives: [
      { item: 'Caffè', label: 'Prendi il Caffè da Sara' },
      { item: 'Birra', label: 'Prendi la Birra da Mari' },
    ],
  },
};
