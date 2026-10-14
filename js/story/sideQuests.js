// js/story/sideQuests.js
// Side quests ("favori") and house points ("punti casa"). DATA + pure logic,
// Node-importable; WorldScene does the talking (afterTalk).
//
// A favour: a housemate (`giver`) asks you to find something. From chapter
// `from` on, talking to them (when their chapter line is a plain one) offers
// it; once accepted, the thing can be found by examining the map prop that
// carries `side: '<id>'`. Bring it back → `points` punti casa. Spend the points
// at Alessio's shop (SHOP). Texts follow each giver's persona.md.
//
// State: questState.side[id] = 'active' | 'done'; found = flag `side-found:<id>`;
// questState.points = punti casa.
import { questState } from './questState.js';
import { ORDER } from './chapters.js';

export const SIDE_QUESTS = [
  {
    id: 'moka', giver: 'ema', from: 'chapter-2', points: 10,
    title: 'La moka di Emanuele', thing: 'Moka di Emanuele',
    ask: ['O Szio Nick, ho perso la moka...', "Forse l'ho lasciata nei pensili della cucina di su? Grszie"],
    remind: 'O Szio Nick, trovata la moka? Grszie',
    thanks: ['O Szio Nick, la moka! Grszie grszie!', 'Ma il caffè come si fa? Grszie'],
  },
  {
    id: 'noodles', giver: 'gaia', from: 'chapter-3', points: 10,
    title: 'I noodles di Gaia', thing: 'Noodles istantanei',
    ask: ['Ho finito i noodles.', 'Ne avevo nascosti un pacco nei pensili della cucina di sotto...'],
    remind: 'I miei noodles? Ho fame.',
    thanks: ['I MIEI NOODLES! Senza rispetto, ti voglio bene.', 'Quasi quanto Alessio. Quasi.'],
  },
  {
    id: 'avocado', giver: 'ana', from: 'chapter-4', points: 15,
    title: "L'avocado di Ana", thing: 'Avocado maturo',
    ask: ['Bro, I need an avocado for the guacamole 🥑', 'I think someone left one in the fruit bowl in room 4?'],
    remind: 'Bro, the avocado? Guacamole is waiting 🥑',
    thanks: ["Yesss bro! Perfect avocado 🥑", "Aperitivo at mine, you're invited!"],
  },
  {
    id: 'coperchio', giver: 'nima', from: 'chapter-5', points: 10,
    title: 'Il coperchio di Nima', thing: 'Coperchio della pentola',
    ask: ['Buongiorns! Where is il coperchio della mia pentola?? 😤', 'Somebody usa tutto e non rimette a posto... forse sullo stendino di su?'],
    remind: 'Coperchio? Still missing 😤 بس',
    thanks: ['Finally! الحمد لله', 'Every thing al suo posto, thank you 🙏'],
  },
  {
    id: 'detersivo', giver: 'sara', from: 'chapter-6', points: 15,
    title: 'Il detersivo di Sara', thing: 'Detersivo',
    ask: ['Il mio detersivo è sparito.', "L'ultima volta era sulla lavatrice del bagno di su."],
    remind: 'Allora, il detersivo?',
    thanks: ['Eccolo! Finalmente posso lavare qualcosa.', 'Grazie, sbirro.'],
  },
];

// Alessio's shop: buy with punti casa. A permanent item (buff) once ever;
// a consumable as many times as you can afford.
export const SHOP = [
  { name: 'Proteine', description: 'Shaker di Alessio. Cura 20 HP.', consumable: true, heal: 20, qty: 1, price: 10 },
  { name: 'Pre-workout', description: 'Carica. +2 ATK.', buff: { attack: 2 }, price: 20 },
  { name: 'Cintura da palestra', description: 'Regge tutto. +2 DEF.', buff: { defense: 2 }, price: 20 },
];

export const SHOP_KEEPER = 'timo';

const chapterIndex = (id) => ORDER.indexOf(id);
export const sideState = (id) => questState.side?.[id] || null;           // null | 'active' | 'done'
export const sideFound = (id) => questState.hasFlag(`side-found:${id}`);

// What talking to `npcId` should do about favours right now, or null:
// { quest, step: 'offer' | 'remind' | 'turnin' }.
export function sideStepFor(npcId) {
  for (const q of SIDE_QUESTS) {
    if (q.giver !== npcId) continue;
    const st = sideState(q.id);
    if (st === 'done') continue;
    if (st === 'active') return { quest: q, step: sideFound(q.id) ? 'turnin' : 'remind' };
    if (chapterIndex(questState.activeChapter) >= chapterIndex(q.from)) return { quest: q, step: 'offer' };
  }
  return null;
}

export function startSide(q) {
  questState.side = { ...(questState.side || {}), [q.id]: 'active' };
}

export function completeSide(q) {
  questState.side = { ...(questState.side || {}), [q.id]: 'done' };
  questState.points = (questState.points || 0) + q.points;
}

// Examining a prop with `side: id` while that favour is active finds the thing.
export function findSideThing(id) {
  if (sideState(id) !== 'active' || sideFound(id)) return null;
  questState.setFlag(`side-found:${id}`);
  return SIDE_QUESTS.find((q) => q.id === id) || null;
}

export const activeSides = () => SIDE_QUESTS.filter((q) => sideState(q.id) === 'active');

// Shop entries still on sale (permanent ones disappear once owned).
export const shopStock = () => SHOP.filter((it) => it.consumable || !questState.hasItem(it.name));

// Buy: false if you can't afford it.
export function buy(it) {
  if ((questState.points || 0) < it.price) return false;
  questState.points -= it.price;
  if (it.consumable) questState.addSupply(it, null);
  else questState.addItem({ name: it.name, description: it.description, buff: it.buff });
  return true;
}
