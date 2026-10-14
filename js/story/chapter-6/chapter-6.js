// js/story/chapter-6/chapter-6.js
// Chapter 6 — EXPLORE QUEST. As the house "sbirro", inspect the two service
// rooms. `{ visit: 'map-key' }` completes when questState.hasVisited(key) is
// true, which WorldScene.create records the moment you enter a map. No NPC is
// required for this kind of quest — just walking into the room ticks it off.
export default {
  id: 'chapter-6',
  title: "Capitolo 6 — Ispezione",
  // In-game time when this chapter starts (js/story/clock.js); its messages fit it.
  time: '09:00',
  // Hint sent to the house group chat (phone, key P) when this chapter starts.
  phone: [
    { from: 'nima', text: "Guys, somebody controlla lavanderia e cucina piano terra please!! Sempre disordine 😤 من فضلك" },
    { from: 'nima', text: "Buongiorns... lavatrice piena di calzini spaiati again 🧦" },
    { from: 'ema', text: "O Nima, ma la lavanderia dov'è? Grszie" },
    { from: 'mari', text: "Io ho steso tutto 🌸👕✨" },
    { from: 'ana', text: "Aperitivo tonight in cucina di su bros 🥑 everybody invited!" },
    // private chats (dm: true)
    { from: 'sara', text: "Mi presti il detersivo? Il mio è finito", dm: true },
  ],
  quest: {
    id: 'inspect-rooms',
    title: "Cerca i meloni in lavanderia e nella cucina di giù",
    objectives: [
      { visit: 'laundry-room',  label: 'Controlla la lavanderia' },
      { visit: 'base-kitchen', label: "Controlla la cucina di giù" },
    ],
  },
};
