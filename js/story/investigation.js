// js/story/investigation.js
// The melon investigation. From chapter `opensAt` the "Indagine" is open (an
// explanation pops up once, flag `investigation-intro`); examining the map
// props that carry `clue: '<id>'` finds the CLUES (flags `clue:<id>`). They're
// listed in the bag. In the final, before fighting the accused (Caue, chapter
// 11), you can present one clue: a KEY clue makes him falter, so the fight
// starts with his HP down by `bonusFrac`; a wrong one costs `penaltyHp`.
// Nobody but Zio Nick knows about the melons, so the clues speak for
// themselves. Node-importable.
import { questState } from './questState.js';
import { ORDER } from './chapters.js';

export const INVESTIGATION = {
  opensAt: 'chapter-3',
  accused: 'caue',
  finalChapter: 'chapter-11',
  bonusFrac: 0.3,
  penaltyHp: 6,
  intro: [
    'Zio Nick fa il punto della situazione: due meloni non spariscono da soli.',
    'Esamina i mobili di casa con Spazio: qualcuno avrà lasciato delle tracce.',
    'Gli indizi trovati finiscono nello zaino (I). Nel momento giusto potrai usarli.',
  ],
  premise: [
    'Zio Nick si sveglia nella sua camera, pronto per le sue due uova e i suoi due meloni.',
    'Ma in frigo i due meloni non ci sono più.',
    'Il caso è aperto. Prima di tutto: chiedere in cucina, al piano terra.',
  ],
};

export const CLUES = [
  { id: 'buccia', name: 'Buccia di melone', text: 'Nei bidoni del piano terra: una buccia di melone, ancora fresca.', key: false },
  { id: 'sacchetto', name: 'Sacchetto della frutta', text: 'Sotto l\'isola di su: un sacchetto vuoto, con scritto a penna "C."', key: true },
  { id: 'santino', name: 'Santino', text: 'Sul comodino della camera 13: un santino con scritto "Luca 3:11".', key: true },
  { id: 'coltello', name: 'Coltello appiccicoso', text: 'Nei pensili di su: un coltello appiccicoso di succo di melone.', key: false },
];

export const investigationOpen = () =>
  ORDER.indexOf(questState.activeChapter) >= ORDER.indexOf(INVESTIGATION.opensAt);
export const clueFound = (id) => questState.hasFlag(`clue:${id}`);
export const cluesFound = () => CLUES.filter((c) => clueFound(c.id));

// Examining a prop with `clue: id`: the clue if this finds it now, else null.
export function findClue(id) {
  if (!investigationOpen() || clueFound(id)) return null;
  questState.setFlag(`clue:${id}`);
  return CLUES.find((c) => c.id === id) || null;
}
