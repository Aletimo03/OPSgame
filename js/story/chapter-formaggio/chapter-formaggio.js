// js/story/chapter-formaggio/chapter-formaggio.js
// Capitolo 2 — Il formaggio ammuffito (the fridge with the flies; the old
// story's chapter 7 was merged into it). After the fight with Gabbo, Zio
// Nick goes straight to bed (afterFight → morningSleep) and the chapter
// starts when he wakes up in the morning (flag `mattina`, scene `sveglia`);
// the group chat says there's a mouldy cheese in the upstairs fridge; Fede
// Gatta, Antonella and Caue are in that kitchen; the fridge minigame (5
// flies). Then chapter-bigliettino.
// The rules are in js/story/formaggio.js.
export default {
  id: 'chapter-formaggio',
  title: 'Capitolo 2 — Il formaggio ammuffito',
  card: 'CAPITOLO 2',
  time: '23:30',
  devStart: { mapKey: 'room-20', spawnName: 'bedside' },
  devItemText: { Telefono: 'Con il wi-fi funziona.' },
  // `after`: shown only once that flag is set; `at`: the time it arrives;
  // `readFlag`: set when its chat is opened (an objective).
  phone: [
    { from: 'nima', at: '08:05', after: 'mattina', readFlag: 'formaggio-letto', text: 'Buongiorns guys... nel frigo della cucina di su c\'è un formaggio ammuffito 🤢 Please qualcuno lo pulisce? من فضلك' },
    { from: 'gatta', at: '08:09', after: 'mattina', text: 'Pota, la puzza arriva fino a Brescia' },
    { from: 'ema', at: '08:12', after: 'mattina', text: 'O ragazzi, ma il formaggio ammuffito si può ancora mangiare? Grszie' },
  ],
  quest: {
    id: 'formaggio',
    title: 'Il formaggio ammuffito',
    objectives: [
      { flag: 'formaggio-letto', label: 'Guarda il telefono [P]' },
      { flag: 'frigo-pulito', place: 'first-floor-kitchen', after: 'formaggio-letto', label: 'Pulisci il frigo della cucina di su' },
    ],
  },
};
