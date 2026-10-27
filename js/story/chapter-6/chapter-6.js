// js/story/chapter-6/chapter-6.js
// Chapter 6 — "La bilancia". The kitchen scale upstairs (for weighing food)
// has dead batteries. Ernesto has new ones (item `Pile AAA`); changing them at
// the scale (an invisible zone on the counter, js/story/finds.js) shows its
// last weighing: 480 g at 03:12 at night. Ana's aperitivo plays in the same
// kitchen this evening (event `aperitivo`, not an objective).
export default {
  id: 'chapter-6',
  title: 'Capitolo 6 — La bilancia',
  time: '18:00',
  devStart: { mapKey: 'first-floor-kitchen', spawnName: 'default' },
  phone: [
    { from: 'nima', text: 'Chi ha rotto la bilancia della cucina di su?? Display spento 😤' },
    { from: 'ana', text: 'Aperitivo tonight in cucina di su bros 🥑 everybody invited!' },
    { from: 'ernesto', text: 'Porto vino e salame dal Piemonte 🍷' },
    // private chats (dm: true)
    { from: 'gatta', text: 'Pota, sabato vieni a Brescia?', dm: true },
  ],
  quest: {
    id: 'the-scale',
    title: 'Cambia le pile alla bilancia',
    objectives: [
      { item: 'Pile AAA', label: 'Trova delle pile nuove' },
      { flag: 'find:bilancia', place: 'first-floor-kitchen', label: 'Cambia le pile alla bilancia della cucina di su' },
    ],
  },
};
