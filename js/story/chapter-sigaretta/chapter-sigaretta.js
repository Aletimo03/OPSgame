// js/story/chapter-sigaretta/chapter-sigaretta.js
// Intermezzo between chapters 6 and 7: the night after Ana's aperitivo.
// Antonella gives Zio Nick a cigarette; he has to reach the balcony (first
// floor, off the racks hall) without Nima, Alessio or Sara seeing him. The
// rules are in js/story/stealth.js. The id has no number on purpose: chapters
// 7–11 keep theirs.
import { STEALTH } from '../stealth.js';

const { held, smoked, caught } = STEALTH.flags;

export default {
  id: STEALTH.chapter,
  title: 'Intermezzo — La sigaretta sul balconcino',
  card: 'INTERMEZZO',
  time: '22:30',
  devStart: { mapKey: 'first-floor-kitchen', spawnName: 'default' },
  phone: [
    { from: 'antonella', text: 'Chi è sciupato stasera passi in cucina, figli miei' },
    { from: 'nima', text: 'Goodnights. Tonight controllo i corridoi, troppo disordine 😤 من فضلك' },
    { from: 'sara', text: 'Se stasera qualcuno cucina senza cappa, lo accoppo.' },
  ],
  resetFlags: [caught], // chapter select: also cleared when restarting from here
  quest: {
    id: 'cigarette',
    title: 'La sigaretta sul balconcino',
    objectives: [
      { flag: held, at: 'antonella', label: 'Fatti dare una sigaretta da Antonella' },
      { flag: smoked, place: STEALTH.balcony, after: held, label: 'Arriva al balconcino senza farti beccare (primo piano, dagli stendini)' },
    ],
  },
};
