// js/story/events.js
// One-off scenes: entering `map` during `chapter` the first time plays a short
// scene with the housemates who are there (each line only if that character
// is in the room), then optional rewards. Flag `event:<id>` = seen. Texts
// follow each persona.md; nobody knows about the melons. Node-importable.
export const EVENTS = [
  {
    id: 'aperitivo',
    chapter: 'chapter-7',
    map: 'first-floor-kitchen',
    title: '🥑 Aperitivo da Ana',
    lines: [
      { who: 'ana', text: 'Yo bros! Aperitivo time 🥑 guacamole for everyone!' },
      { who: 'ema', text: "O Ana, ma il guacamole con cosa si mangia? Grszie" },
      { who: 'nima', text: 'Buonaseras! Please, dopo tutti i piatti nel lavandino 🙏' },
      { who: 'gaia', text: 'Arrivo con Alessio 🍜' },
      { who: 'timo', text: 'O fra. Buono.' },
      { who: 'gatta', text: "Pota, a Brescia l'aperitivo è meglio. Però buono." },
      { who: 'sara', text: 'Finalmente una cosa bella in questa casa, porco d*o' },
      { who: 'mari', text: 'Fede arriva? 🥺🌸' },
      { who: 'ernesto', text: 'Io ho portato vino e salame dal Piemonte. Sempre down per un aperitivo!' },
      { who: 'lilia', text: 'Compa, guacamole e IQOS. Amunì!' },
      { who: 'ana', text: 'Zio Nick, take some guacamole for later bro! 🥑' },
    ],
    // given at the end, plus +hearts with everyone who was there
    gift: { name: 'Guacamole di Ana', description: 'Il guacamole dell\'aperitivo. Cura 25 HP.', consumable: true, heal: 25, qty: 2 },
    hearts: 1,
  },
];
