// js/story/chapter-2/chapter-2.js
// Chapter 2 — "I piselli surgelati". Zio Nick wakes up in the first-floor
// kitchen after the loss: Mari is holding frozen peas on his knee (event
// `piselli`, js/story/events.js). To get back on his feet he wants his chili,
// but his two peppers are gone. Then he asks around (objectives hidden until
// the scene has played: `after`).
export default {
  id: 'chapter-2',
  title: 'Capitolo 2 — I piselli surgelati',
  time: '09:00',
  devStart: { mapKey: 'first-floor-kitchen', spawnName: 'sofa' },
  phone: [
    { from: 'mari', text: 'Zio Nick è in cucina di su con i piselli sul ginocchio 🧊🌸' },
    { from: 'gabbo', text: "O fra, chi cerca guai li trova, diahane" },
    { from: 'ana', text: 'Bro, are you ok?? 😂' },
    // private chats (dm: true)
    { from: 'mari', text: 'Come va il ginocchio? 🥺🌷', dm: true },
  ],
  quest: {
    id: 'frozen-peas',
    title: 'Riprenditi e cucina il tuo chili',
    objectives: [
      { flag: 'event:piselli', place: 'first-floor-kitchen', label: 'Riprenditi in cucina di su' },
      { npc: 'sara', after: 'event:piselli', label: 'Chiedi a Sara dei peperoni' },
      { npc: 'nima', after: 'event:piselli', label: 'Chiedi a Nima dei peperoni' },
    ],
  },
};
