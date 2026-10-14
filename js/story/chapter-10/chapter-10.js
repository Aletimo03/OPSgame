// js/story/chapter-10/chapter-10.js
// Chapter 10 — MIXED QUEST. One chapter, three different objective TYPES at once:
// a fight, a quiz and a fetch. They can be completed in any order; the chapter
// rolls forward only when all three are done. This shows that objective types
// compose freely inside a single quest.
//   • defeat mari   (fight, first-floor-main — fresh fighter, genuine battle)
//   • quiz   gaia   (quiz,  first-floor-vertical-1)
//   • item   Verbale (fetch, from Alessio (id timo) in the first-floor kitchen)
export default {
  id: 'chapter-10',
  title: "Capitolo 10 — Caccia Grossa",
  // In-game time when this chapter starts (js/story/clock.js); its messages fit it.
  time: '10:30',
  // Hint sent to the house group chat (phone, key P) when this chapter starts.
  phone: [
    { from: 'timo', text: "O fra, verbale in cucina primo piano." },
    { from: 'mari', text: "Fede non risponde da 3 ore 😤🌸 chi è stato??" },
    { from: 'gaia', text: "Ho una domanda per Zio Nick. Primo piano" },
    { from: 'nima', text: "Buongiorns! Zio Nick si fa gli affari di tutti as usual 😂🙏" },
    // private chats (dm: true)
    { from: 'ema', text: "O Szio Nick, ma per andare in stazione che bus prendo? Grszie", dm: true },
  ],
  quest: {
    id: 'big-hunt',
    title: "Chiudi le ultime piste al primo piano",
    objectives: [
      { defeat: 'mari',  label: 'Ferma Mari, l’ultima complice' },
      { quiz: 'gaia',    label: 'Convinci Gaia con la risposta giusta' },
      { item: 'Verbale', label: 'Ritira il Verbale da Alessio' },
    ],
  },
};
