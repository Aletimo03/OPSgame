// js/story/events.js
// One-off scenes: entering `map` during `chapter` the first time plays a short
// scene with the housemates who are there (each line only if that character
// is in the room; `who: 'zionick'` = Zio Nick himself, always there), then
// optional rewards. Flag `event:<id>` = seen. Texts follow each persona.md.
// Node-importable.
export const EVENTS = [
  {
    // Chapter 2: waking up in the kitchen after losing to Gabbo.
    id: 'piselli',
    chapter: 'chapter-2',
    map: 'first-floor-kitchen',
    title: '🧊 I piselli surgelati',
    lines: [
      { who: 'mari', text: 'Zio Nick! Finalmente ti sei svegliato 🥺🌸' },
      { who: 'mari', text: 'Stai fermo: ti ho messo i piselli surgelati sul ginocchio 🧊🌼' },
      { who: 'zionick', text: 'Aia, il ginocchio...' },
      { who: 'sara', text: 'Gabbo ti ha steso in due secondi. Te l\'avevo detto.' },
      { who: 'zionick', text: 'Per riprendermi serve una cosa sola: il mio chili.' },
      { who: 'zionick', text: '...un momento. I miei due peperoni! Erano in frigo!' },
      { who: 'ema', text: 'O Szio Nick, i peperoni? Io non li ho visti. Grszie' },
    ],
    gift: { name: 'Piselli surgelati', description: 'Quelli di Mari, ancora freddi. Cura 10 HP.', consumable: true, heal: 10, qty: 1 },
  },
  {
    // Chapter 3: Antonella's International Rice, the whole kitchen laughing.
    id: 'rice',
    chapter: 'chapter-3',
    map: 'first-floor-kitchen',
    title: '🍚 International Rice',
    lines: [
      { who: 'antonella', text: 'Oh, porco d*o, sei ancora col ginocchio a pezzi?' },
      { who: 'antonella', text: 'Siediti, va\'. Oggi cucino io, porco d*o.' },
      { who: 'ana', text: 'Bro... what is that? 👀' },
      { who: 'antonella', text: 'Che dice questa? Non capisco una parola, porco d*o!' },
      { who: 'ema', text: 'O Antonella, ma è riso o colla? Grszie' },
      { who: 'nima', text: 'Buonanots... this riso is crying 😭' },
      { who: 'ernesto', text: 'Io ho portato un po\' di salame. Non si sa mai.' },
      { who: 'timo', text: 'O fra. Colla.' },
      { who: 'antonella', text: 'E tu ridi, Alessio? Ti rispedisco in Moldavia, porco d*o!' },
      { who: 'antonella', text: 'Ridete, ridete, porco d*o! È l\'International Rice!' },
    ],
  },
  {
    // Chapter 6: Ana's aperitivo (flavour, not an objective), same kitchen as the scale.
    id: 'aperitivo',
    chapter: 'chapter-6',
    map: 'first-floor-kitchen',
    title: '🥑 Aperitivo da Ana',
    lines: [
      { who: 'ana', text: 'Yo bros! Aperitivo time 🥑 guacamole for everyone!' },
      { who: 'antonella', text: 'Che è sta roba verde, porco d*o?' },
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
  {
    // Chapter 11: the chili for the whole house. The game's last scene.
    id: 'chili',
    chapter: 'chapter-11',
    map: 'first-floor-kitchen',
    title: '🌶️ Il chili di Zio Nick',
    lines: [
      { who: 'zionick', text: 'Due peperoni, fagioli, carne e un pizzico di ingegneria aerospaziale.' },
      { who: 'ema', text: 'O Szio Nick, ma il chili è piccante? Grszie' },
      { who: 'zionick', text: 'SCIMMIA. Certo che è piccante.' },
      { who: 'antonella', text: 'Meglio del mio riso, porco d*o. Di poco.' },
      { who: 'mari', text: 'Buonissimo! 🌸🌶️✨' },
      { who: 'nima', text: 'Buonaseras! Very good... but please, dopo piatti nel lavandino 🙏' },
      { who: 'timo', text: 'O fra. Buono.' },
      { who: 'gaia', text: 'Senza rispetto: è buonissimo.' },
      { who: 'zionick', text: 'Visto? Con gestionale questo non lo impari.' },
      { who: 'ana', text: 'Bro, next aperitivo: chili and guacamole 🥑🌶️' },
      { who: 'ernesto', text: 'Ci vuole un bel rosso piemontese. L\'ho portato io.' },
      { who: 'gatta', text: 'Pota, a Brescia il chili... no, questo è buono.' },
      { who: 'sara', text: 'Non male, sbirro.' },
      { who: 'gabbo', text: 'O fra, me ne dai un piatto? Diahane' },
      { who: 'zionick', text: 'Solo se tieni le mani a posto.' },
    ],
    hearts: 1,
  },
];
