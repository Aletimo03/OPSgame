// js/story/finds.js
// Story finds: things Zio Nick has to look for himself by examining (Space)
// a piece of furniture or an invisible zone, in one chapter only. Finding one
// sets the flag `find:<id>`, which a chapter objective waits for.
//   furniture: '<catalogue type>' in `map` (e.g. Alessio's wardrobe), or
//   zone: { tx, ty, w, h } in tiles (e.g. the scale on the kitchen counter);
//   requires: a flag that must be set first (else the furniture is just furniture);
//   needsItem: an item you must hold (else the `locked` lines play);
//   gives: an item for the bag.
// Lines are Zio Nick thinking aloud: there's no narrator (WorldScene.say).
// Texts follow each persona.md. Node-importable.
import { questState } from './questState.js';

export const FINDS = [
  {
    id: 'telefono',
    chapter: 'chapter-0',
    map: 'room-20',
    furniture: 'phone_little_table',
    lines: [
      'Ecco il mio telefono.',
      'Non funziona: qui non ho il wi-fi. Lo prendo lo stesso.',
    ],
    gives: { name: 'Telefono', description: 'Non funziona: niente wi-fi.' },
    banner: '📱 Hai preso il telefono\nOra puoi uscire dalla camera',
  },
  {
    id: 'peperoni',
    chapter: 'chapter-0',
    map: 'first-floor-kitchen',
    zone: { tx: 18, ty: 2.6, w: 5, h: 0.7 }, // the fridge: the right end of the cabinets
    requires: 'event:benvenuto',
    lines: [
      'Vediamo il frigo. La spesa di stamattina è al suo posto.',
      '...quasi tutta.',
      'I miei due peperoni. Li ho messi qui stamattina.',
      'Almeno i piselli surgelati ci sono. Li tengo, non si sa mai.',
    ],
    gives: { name: 'Piselli surgelati', description: 'Ancora freddi. Cura 10 HP.', consumable: true, heal: 10, qty: 2 },
    banner: '🧊 Piselli surgelati x2\nIn battaglia: ZAINO, +10 HP',
  },
  {
    id: 'pomodorini',
    chapter: 'chapter-4',
    map: 'base-kitchen',
    furniture: 'island',
    requires: 'ema-asked',
    lines: ["Sotto l'isola della cucina di sotto... una vaschetta di pomodorini!"],
    banner: '🍅 Trovati i pomodorini!\nPortali a Emanuele, in cucina di su',
  },
  {
    id: 'frigo',
    chapter: 'chapter-5',
    map: 'room-18',
    furniture: 'armadio',
    requires: 'gaia-found',
    lines: [
      "Apro piano l'armadio di Alessio...",
      'Niente frigo. Solo magliette da palestra e un paio di pesi.',
      'Per ora. Prima o poi lo becco.',
    ],
    banner: '🔍 Niente frigo segreto... per ora',
  },
  {
    id: 'bilancia',
    chapter: 'chapter-6',
    map: 'first-floor-kitchen',
    zone: { tx: 10, ty: 2.6, w: 3, h: 0.7 }, // on the counter, left of the fridge
    needsItem: 'Pile AAA',
    locked: ['La bilancia per pesare il cibo. Display spento: pile scariche.', 'Servono pile nuove.'],
    lines: [
      'Pile nuove... ecco, la bilancia si riaccende.',
      "In memoria c'è l'ultima pesata: 480 g, alle 03:12 di notte.",
      '480 grammi. Due peperoni, a occhio. Alle tre di notte.',
      'Chi torna a casa alle tre di notte? Ingegneria applicata alla giustizia.',
    ],
    banner: '⚖️ La bilancia ricorda: 480 g alle 03:12',
  },
];

export const findFlag = (id) => `find:${id}`;

// Can this find happen right now (its chapter, not found yet, prerequisite met)?
export const findOpen = (f) => questState.activeChapter === f.chapter
  && !questState.hasFlag(findFlag(f.id))
  && (!f.requires || questState.hasFlag(f.requires));
