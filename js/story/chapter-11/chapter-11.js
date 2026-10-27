// js/story/chapter-11/chapter-11.js
// Chapter 11 — "Il chili" (the last chapter; the ending follows it). With the
// two peppers back, Zio Nick cooks his chili for the whole house in the
// first-floor kitchen (event `chili`, js/story/events.js).
export default {
  id: 'chapter-11',
  title: 'Capitolo 11 — Il chili',
  time: '20:00',
  devStart: { mapKey: 'first-floor-kitchen', spawnName: 'default' },
  phone: [
    { from: 'ema', text: 'O Szio Nick, stasera chili in cucina di su? Grszie' },
    { from: 'gabbo', text: 'O fra, scusa per i peperoni, diahane' },
    { from: 'caue', text: 'Chi ha due tuniche ne dia una a chi non ne ha. (Luca 3:11) 🙏' },
    { from: 'antonella', text: 'Porto il riso, porco d*o' },
  ],
  quest: {
    id: 'the-chili',
    title: 'Il chili di Zio Nick',
    objectives: [
      { flag: 'event:chili', place: 'first-floor-kitchen', label: 'Cucina il chili per tutta la casa (cucina di su)' },
    ],
  },
};
