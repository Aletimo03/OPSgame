// js/story/chapter-3/chapter-3.js
// Chapter 3 — "International Rice". Lunch in the first-floor kitchen:
// Antonella (new in the house) cooks her International Rice, overcooked rice
// the whole kitchen mocks her for (event `rice`). She gives Zio Nick a plate
// (a joke consumable) and the first lead: Emanuele, rummaging in the fridge.
export default {
  id: 'chapter-3',
  title: 'Capitolo 3 — International Rice',
  time: '12:30',
  devStart: { mapKey: 'first-floor-kitchen', spawnName: 'default' },
  phone: [
    { from: 'antonella', text: 'Pranzo in cucina di su, cucino io, porco d*o' },
    { from: 'ema', text: 'O Antonella, cosa cucini? Grszie' },
    { from: 'nima', text: 'Please, dopo pulite la pentola 🙏 من فضلك' },
    // private chats (dm: true)
    { from: 'gaia', text: 'Hai visto Alessio? Non risponde 😤', dm: true },
  ],
  quest: {
    id: 'international-rice',
    title: 'Pranzo da Antonella',
    objectives: [
      { flag: 'event:rice', place: 'first-floor-kitchen', label: 'Vai a pranzo in cucina di su' },
      { item: 'International Rice', label: "Assaggia l'International Rice di Antonella" },
    ],
  },
};
