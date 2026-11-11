// js/story/chapter-formaggio/chapter-formaggio.js
// Capitolo 1 of the rewrite — "Il formaggio ammuffito". Right after the
// prologue's fight: it's still night, Zio Nick goes back to bed and wakes up
// in the morning; the group chat says there's a mouldy cheese in the upstairs
// fridge (minigame); then «mrjackson», with no profile picture, writes to him
// about his peppers; a note on the laundry floor says «Stai cercando nel frigo
// sbagliato. 356.»; 356 opens the key safe in the ripostiglio: the key of
// room 18, Alessio's. The rules are in js/story/formaggio.js. `stop`: the
// story written so far ends here.
export default {
  id: 'chapter-formaggio',
  title: 'Capitolo 1 — Il formaggio ammuffito',
  card: 'CAPITOLO 1',
  stop: true,
  time: '23:30',
  devStart: { mapKey: 'room-20', spawnName: 'bedside' },
  devPoints: [
    {
      label: 'La mattina: il telefono e il frigo',
      upTo: 'mattina',
      clock: '08:30',
      itemText: { Telefono: 'Con il wi-fi funziona.' },
      start: { mapKey: 'room-20', spawnName: 'bedside' },
    },
    {
      label: 'Il bigliettino: la cassaforte',
      upTo: 'biglietto',
      clock: '09:15',
      itemText: { Telefono: 'Con il wi-fi funziona.' },
      start: { mapKey: 'first-floor', spawnName: 'fromRipostiglio' },
    },
  ],
  // `after`: shown only once that flag is set; `at`: the time it arrives;
  // `readFlag`: set when its chat is opened (an objective).
  phone: [
    { from: 'nima', at: '08:05', after: 'mattina', readFlag: 'formaggio-letto', text: 'Buongiorns guys... nel frigo della cucina di su c\'è un formaggio ammuffito 🤢 Please qualcuno lo pulisce? من فضلك' },
    { from: 'gatta', at: '08:09', after: 'mattina', text: 'Pota, la puzza arriva fino a Brescia' },
    { from: 'ema', at: '08:12', after: 'mattina', text: 'O ragazzi, ma il formaggio ammuffito si può ancora mangiare? Grszie' },
    { from: 'mrjackson', dm: true, at: '09:02', after: 'frigo-pulito', readFlag: 'mrjackson-letto', text: 'Se vuoi rivedere i tuoi peperoni vai nel locale lavatrice al piano di su.' },
  ],
  resetFlags: ['stop-seen', 'mrjackson-letto'],
  quest: {
    id: 'formaggio',
    title: 'Il formaggio ammuffito',
    objectives: [
      { flag: 'mattina', place: 'room-20', label: 'Torna a dormire nel tuo letto' },
      { flag: 'formaggio-letto', after: 'mattina', label: 'Guarda il telefono [P]' },
      { flag: 'frigo-pulito', place: 'first-floor-kitchen', after: 'formaggio-letto', label: 'Pulisci il frigo della cucina di su' },
      { flag: 'biglietto', place: 'first-floor-bathroom', after: 'frigo-pulito', label: 'Vai nel locale lavatrice al piano di su' },
      { flag: 'cassaforte-aperta', place: 'ripostiglio', after: 'biglietto', label: '356: cosa si apre con questo codice?' },
    ],
  },
};
