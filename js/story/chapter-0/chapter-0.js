// js/story/chapter-0/chapter-0.js
// Prologo — the start of the real game. Zio Nick has just arrived at OPS: he
// looks round his room (he can't leave until he's taken his phone, which has
// no wi-fi), goes to the kitchen upstairs to meet the others (scene
// `benvenuto`), is too hungry to leave, opens the fridge (js/story/finds.js) and
// his two peppers are gone (scene `peperoni`). Investigating, he meets the rest
// of the house in the two common areas: Gaia has a hint, Gabbo and Alessio
// explain that TP-Link repeaters are blocking the wi-fi. With Sara's badge he
// finds the last four, and the phone works. Then he takes a nap: the party
// is the next chapter (chapter-festa). The rules are in js/story/prologue.js.
export default {
  id: 'chapter-0',
  title: "Prologo — L'arrivo a OPS",
  card: 'PROLOGO',
  time: '13:00',
  devStart: { mapKey: 'room-20', spawnName: 'default' },
  // Readable once the wi-fi is back.
  phone: [
    { from: 'sara', text: 'Il wi-fi è tornato. Accendete la cappa.' },
    { from: 'ema', text: 'O ragazzi, ma il wi-fi come si chiama? Grszie' },
    { from: 'nima', text: 'Finally... الحمد لله' },
    { from: 'gabbo', text: 'O fra, il wi-fi va, diahane' },
    { from: 'mari', sticker: '🌸' },
  ],
  resetFlags: ['ripetitore:corridoio', 'ripetitore:camera-2', 'ripetitore:camera-15', 'ripetitore:camera-19'],
  quest: {
    id: 'arrival',
    title: 'Ambientati a OPS',
    objectives: [
      { flag: 'find:telefono', place: 'room-20', label: 'Esplora la tua camera' },
      { flag: 'event:benvenuto', place: 'first-floor-kitchen', after: 'find:telefono', label: 'Vai in cucina a conoscere gli altri' },
      { flag: 'find:peperoni', place: 'first-floor-kitchen', after: 'event:benvenuto', label: 'Cucina qualcosa: apri il frigo' },
      { flag: 'event:peperoni', place: 'first-floor-kitchen', after: 'find:peperoni', label: 'Chi ha preso i tuoi peperoni?' },
      { flag: 'gaia-hint', at: 'gaia', after: 'event:peperoni', label: 'Indaga: parla con Gaia' },
      { flag: 'ripetitori-start', at: 'gabbo', after: 'event:peperoni', label: 'Indaga: parla con Gabbo' },
      { flag: 'badge-got', at: 'sara', after: 'ripetitori-start', label: 'Vai da Sara in cucina di su: ha il badge master' },
      { flag: 'wifi-back', after: 'ripetitori-start', label: 'Trova i ripetitori sui muri: corridoio del piano terra e camere 2, 15, 19' },
      { flag: 'nap-done', place: 'room-20', after: 'wifi-back', label: 'Vai a fare un pisolino nel tuo letto' },
    ],
  },
};
