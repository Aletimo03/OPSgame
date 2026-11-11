// js/story/chapter-festa/chapter-festa.js
// Capitolo 1 — La festa di Gabbo. Zio Nick wakes up from his nap at 23:00
// (scene `risveglio`) with a party in the base kitchen (js/story/prologue.js
// `party`: lights, the Alcatraz track louder the closer you get; the
// housemates' locations for this chapter). Gabbo plays the fool, hurts his
// knee, and they fight (party backdrop); a win gives the Statuetta di Zio
// Nick, and Zio Nick goes back to bed. The prologue's door rules still apply.
export default {
  id: 'chapter-festa',
  title: 'Capitolo 1 — La festa di Gabbo',
  card: 'CAPITOLO 1',
  time: '23:00',
  devStart: { mapKey: 'room-20', spawnName: 'bedside' },
  devItemText: { Telefono: 'Con il wi-fi funziona.' },
  quest: {
    id: 'festa',
    title: 'La festa di Gabbo',
    objectives: [
      { flag: 'event:festa', place: 'base-kitchen', label: 'Vai a controllare il casino nella cucina di sotto' },
      { defeat: 'gabbo', after: 'event:festa', label: 'Parla con Gabbo' },
    ],
  },
};
