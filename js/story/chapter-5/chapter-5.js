// js/story/chapter-5/chapter-5.js
// Chapter 5 — "La camera 18". Gaia has vanished: she's in room 18 with
// Alessio (his room, `room` in his character.json). There Zio Nick suspects
// Alessio's secret fridge: a FALSE lead (the wardrobe, js/story/finds.js).
// Alessio then mentions the dead kitchen scale, and Zio Nick has an idea.
export default {
  id: 'chapter-5',
  title: 'Capitolo 5 — La camera 18',
  time: '11:00',
  devStart: { mapKey: 'first-floor', spawnName: 'fromRoom18' },
  phone: [
    { from: 'sara', text: 'Gaia? Sarà chiusa in camera 18 con Alessio, come sempre.' },
    { from: 'ema', text: 'O ragazzi, qualcuno ha visto Gaia? Grszie' },
    { from: 'nima', text: 'Gaia sparita, Alessio sparito... coincidence? 👀' },
    // private chats (dm: true)
    { from: 'ana', text: 'Bro, aperitivo soon at mine 🥑', dm: true },
  ],
  quest: {
    id: 'room-18',
    title: 'Dov\'è finita Gaia?',
    objectives: [
      { flag: 'gaia-found', at: 'gaia', label: 'Trova Gaia' },
      { flag: 'find:frigo', place: 'room-18', after: 'gaia-found', label: 'Cerca il frigo segreto di Alessio' },
      { flag: 'alessio-bilancia', at: 'timo', after: 'find:frigo', label: 'Parla con Alessio' },
    ],
  },
};
