// js/story/chapter-bigliettino/chapter-bigliettino.js
// Capitolo 3 — Il bigliettino. Right after the fridge: «mrjackson», with no
// profile picture, writes to Zio Nick about his peppers; a note on the laundry
// floor upstairs says «Stai cercando nel frigo sbagliato. 356.» (he reasons it
// out in a scene); 356 opens the key safe in the ripostiglio: the key of
// room 18, Alessio's (a scene, the camera zooms in on the realisation). Rules
// in js/story/formaggio.js. `stop`: the story written so far ends here.
export default {
  id: 'chapter-bigliettino',
  title: 'Capitolo 3 — Il bigliettino',
  card: 'CAPITOLO 3',
  stop: true,
  time: '09:00',
  devStart: { mapKey: 'first-floor-kitchen', spawnName: 'default' },
  devItemText: { Telefono: 'Con il wi-fi funziona.' },
  devPoints: [
    {
      label: 'Il ripostiglio: la cassaforte',
      upTo: 'biglietto',
      start: { mapKey: 'first-floor', spawnName: 'fromRipostiglio' },
    },
  ],
  // `at`: the time it arrives; `readFlag`: set when its chat is opened.
  phone: [
    { from: 'mrjackson', dm: true, at: '09:02', readFlag: 'mrjackson-letto', text: 'Se vuoi rivedere i tuoi peperoni vai nel locale lavatrice al piano di su.' },
  ],
  resetFlags: ['stop-seen', 'mrjackson-letto'],
  quest: {
    id: 'bigliettino',
    title: 'Il bigliettino',
    objectives: [
      { flag: 'biglietto', place: 'first-floor-bathroom', label: 'Vai nel locale lavatrice al piano di su' },
      { flag: 'cassaforte-aperta', place: 'ripostiglio', after: 'biglietto', label: '356: cosa si apre con questo codice?' },
    ],
  },
};
