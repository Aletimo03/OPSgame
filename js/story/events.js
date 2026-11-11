// js/story/events.js
// One-off scenes: entering `map` during `chapter` the first time plays a short
// scene with the housemates who are there (each line only if that character
// is in the room; `who: 'zionick'` = Zio Nick himself, always there), then
// optional rewards. Flag `event:<id>` = seen. `requires`: only once that flag
// is set. Texts follow each persona.md. Node-importable.
export const EVENTS = [
  {
    // Prologue: the nap is over, it's night and there's a racket.
    id: 'risveglio',
    chapter: 'chapter-0',
    map: 'room-20',
    requires: 'nap-done',
    lines: [
      { who: 'zionick', text: 'Ho dormito troppo... saranno le undici di sera.' },
      { who: 'zionick', text: "Ma cos'è questo casino?!" },
      { who: 'zionick', text: 'Viene dalla cucina di sotto. Vado a controllare.' },
    ],
  },
  {
    // Chapter-formaggio: back to bed after the party, he wakes up in the morning.
    id: 'sveglia',
    chapter: 'chapter-formaggio',
    map: 'room-20',
    requires: 'mattina',
    lines: [
      { who: 'zionick', text: 'Che nottata... Gabbo e le sue pacche.' },
      { who: 'zionick', text: 'Il ginocchio fa ancora male.' },
      { who: 'zionick', text: 'Il telefono vibra. Vediamo cosa scrivono nel gruppo.' },
    ],
  },
  {
    // Prologue: the party in the base kitchen.
    id: 'festa',
    chapter: 'chapter-0',
    map: 'base-kitchen',
    requires: 'nap-done',
    lines: [
      { who: 'zionick', text: '(Una festa. E i miei peperoni ancora non si trovano.)' },
      { who: 'zionick', text: '(E Gabbo che fa più casino di tutti. Adesso ci parlo.)' },
    ],
  },
  {
    // Prologue: the first people Zio Nick meets, in the kitchen upstairs. He does
    // space engineering: everyone wrongly says aerospace, and he gets angry.
    id: 'benvenuto',
    chapter: 'chapter-0',
    map: 'first-floor-kitchen',
    lines: [
      { who: 'sara', text: 'Ehi, sei tu quello nuovo? Benvenuto! Io sono Sara.' },
      { who: 'mari', text: 'E io sono Marilena, piacere 🌸✨' },
      { who: 'zionick', text: 'Zio Nick. Faccio ingegneria spaziale: la migliore di tutte.' },
      { who: 'nima', text: 'Buongiorns! I am Nima. Ah, aerospaziale? Nice!' },
      { who: 'zionick', text: 'SPAZIALE! Non aerospaziale! SPAZIALE!' },
      { who: 'nima', text: 'Okay okay, sorry my friend 😅 Same thing, no?' },
      { who: 'zionick', text: 'NO!' },
      { who: 'zionick', text: 'Comunque. Ho una fame tremenda.' },
      { who: 'sara', text: 'Allora ricordati: accendi la cappa ogni volta che cucini, o ti accoppo.' },
    ],
  },
  {
    // Prologue: the fridge (js/story/finds.js) is short of two peppers.
    id: 'peperoni',
    chapter: 'chapter-0',
    map: 'first-floor-kitchen',
    requires: 'find:peperoni',
    lines: [
      { who: 'zionick', text: 'CHI HA PRESO I MIEI PEPERONI?!' },
      { who: 'mari', text: 'Io non ho visto nulla 🥺🌸' },
      { who: 'nima', text: 'Always somebody che ruba le cose in questa casa 😤' },
      { who: 'nima', text: 'E Antonella che mette le pentole sopra le altre nella lavastoviglie! من فضلك' },
      { who: 'sara', text: 'Prima ho visto qualcuno salire qui in cucina.' },
      { who: 'sara', text: 'Spero tanto che non sia Sean, quell\'idiota.' },
    ],
  },
  {
    // Chapter 2: waking up in the kitchen after losing to Gabbo.
    id: 'piselli',
    chapter: 'chapter-2',
    map: 'first-floor-kitchen',
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
    lines: [
      { who: 'antonella', text: 'Oh, figlio mio, sei ancora col ginocchio a pezzi?' },
      { who: 'antonella', text: 'Siediti, va\'. Oggi cucino io, come una volta.' },
      { who: 'ana', text: 'Bro... what is that? 👀' },
      { who: 'antonella', text: 'Che dice questa? Non capisco una parola, Gesù mio!' },
      { who: 'ema', text: 'O Antonella, ma è riso o colla? Grszie' },
      { who: 'nima', text: 'Buonanots... this riso is crying 😭' },
      { who: 'ernesto', text: 'Io ho portato un po\' di salame. Non si sa mai.' },
      { who: 'timo', text: 'O fra. Colla.' },
      { who: 'antonella', text: 'E tu ridi, Alessio? Ti rispedisco in Moldavia, ti rispedisco!' },
      { who: 'antonella', text: 'Ridete, ridete, disgraziati! È l\'International Rice!' },
    ],
  },
  {
    // Chapter 6: Ana's aperitivo (flavour, not an objective), same kitchen as the scale.
    id: 'aperitivo',
    chapter: 'chapter-6',
    map: 'first-floor-kitchen',
    lines: [
      { who: 'ana', text: 'Yo bros! Aperitivo time 🥑 guacamole for everyone!' },
      { who: 'antonella', text: 'E che è sta roba verde, Madonna mia?' },
      { who: 'ema', text: "O Ana, ma il guacamole con cosa si mangia? Grszie" },
      { who: 'nima', text: 'Buonaseras! Please, dopo tutti i piatti nel lavandino 🙏' },
      { who: 'gaia', text: 'Io e Alessio ci siamo 🍜' },
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
    lines: [
      { who: 'zionick', text: 'Due peperoni, fagioli, carne e un pizzico di ingegneria spaziale.' },
      { who: 'ema', text: 'O Szio Nick, ma il chili è piccante? Grszie' },
      { who: 'zionick', text: 'SCIMMIA. Certo che è piccante.' },
      { who: 'antonella', text: 'Meglio del mio riso, figlio mio. Di poco.' },
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
