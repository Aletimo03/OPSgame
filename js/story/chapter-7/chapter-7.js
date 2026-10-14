// js/story/chapter-7/chapter-7.js
// Chapter 7 — Ana's aperitivo. A story beat, not an optional extra: the
// chapter completes when the aperitivo scene has played (flag
// `event:aperitivo`, set by WorldScene.playEvents, js/story/events.js), which
// happens the first time you enter the first-floor kitchen in this chapter.
// The invitation arrives in chapter 6's group chat.
export default {
  id: 'chapter-7',
  title: "Capitolo 7 — L'aperitivo",
  // In-game time when this chapter starts (js/story/clock.js); its messages fit it.
  time: '19:00',
  phone: [
    { from: 'ana', text: "Guacamole ready 🥑 cucina di su, come bros!" },
    { from: 'nima', text: "Buonaseras! Please, dopo piatti nel lavandino 🙏" },
    { from: 'ema', text: "O Ana, ma a che ora? Grszie" },
  ],
  quest: {
    id: 'aperitivo',
    title: "Vai all'aperitivo di Ana",
    objectives: [
      // `place` tells questGuide (tracker, phone, minimap) where it happens.
      { flag: 'event:aperitivo', place: 'first-floor-kitchen', label: "Raggiungi l'aperitivo in cucina di su" },
    ],
  },
};
