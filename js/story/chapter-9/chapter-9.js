// js/story/chapter-9/chapter-9.js
// Chapter 9 — MIXED QUEST. One chapter, three different objective TYPES at once:
// a fight, a quiz and a fetch. They can be completed in any order; the chapter
// rolls forward only when all three are done. This shows that objective types
// compose freely inside a single quest.
//   • defeat mari   (fight, first-floor-main — fresh fighter, genuine battle)
//   • quiz   gaia   (quiz,  first-floor-vertical-1)
//   • item   Verbale (fetch, from Timo in the first-floor kitchen)
export default {
  id: 'chapter-9',
  title: 'Chapter 9 — Caccia Grossa',
  // Hint sent to the house group chat (phone, key P) when this chapter starts.
  phone: [{ from: 'timo', text: 'Ultimo giro al primo piano: Mari, il quiz di Gaia e il Verbale che ti tengo in cucina.' }],
  quest: {
    id: 'big-hunt',
    title: 'Chiudi il caso al primo piano',
    objectives: [
      { defeat: 'mari',  label: 'Ferma Mari, l’ultima complice' },
      { quiz: 'gaia',    label: 'Convinci Gaia con la risposta giusta' },
      { item: 'Verbale', label: 'Ritira il Verbale da Alessio' },
    ],
  },
};
