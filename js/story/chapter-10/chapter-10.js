// js/story/chapter-10/chapter-10.js
// Chapter 10 — "La rivincita". Zio Nick puts it together (the scale at 03:12,
// the Alcatraz wristband in the fridge, Gabbo's slip about the chili on the
// stage) and faces Gabbo again in the base-floor corridor. This time it's a
// normal battle: he can win. Mari (knee brace) and Alessio (gloves) help with
// optional items. After the win Gabbo hands back the peppers (battle `won`).
export default {
  id: 'chapter-10',
  title: 'Capitolo 10 — La rivincita',
  time: '12:00',
  devStart: { mapKey: 'base-floor', spawnName: 'living' },
  phone: [
    { from: 'sara', text: 'Gabbo è giù nel corridoio principale del piano terra. Stavolta tocca a te.' },
    { from: 'mari', text: 'Ti ho preparato una fascia per il ginocchio, sono in cucina di su 🌸🩹' },
    { from: 'gabbo', text: 'O fra, ti aspetto, diahane' },
    // private chats (dm: true)
    { from: 'timo', text: 'O fra. Prima passa in cucina.', dm: true },
  ],
  quest: {
    id: 'rematch',
    title: 'Riprenditi i peperoni',
    objectives: [
      { defeat: 'gabbo', label: 'Batti Gabbo nel corridoio del piano terra' },
    ],
  },
};
