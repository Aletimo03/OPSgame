// js/story/rewind.js
// "Scegli capitolo" (title screen): restart the story from a chapter you have
// already reached. Everything the STORY gave you from that chapter on is
// reset, so you play those chapters again:
//   • the chapter-scoped log (talks, wins, quizzes, visits) of that chapter
//     and later, and the global sets rebuilt from what's left;
//   • items and consumables given in those chapters (`itemChapter` maps an
//     item name → the chapter that gives it; built from the character JSONs);
//   • chapter cards, events and the ending of those chapters; the premise
//     if you go back to the first chapter;
//   • HP full, the clock back to the chapter's start, phone messages marked read.
// Kept: odd socks, favours + punti casa, affinity, stats, and the furthest
// chapter reached. devPrime() instead builds a fresh run that starts at any
// chapter (the title screen's DEV chapter select). Node-importable.
import { questState } from './questState.js';
import { ORDER, CHAPTERS } from './chapters.js';
import { EVENTS } from './events.js';
import { FINDS } from './finds.js';
import { phoneChats } from './phoneChats.js';
import { parseTime } from './clock.js';

// Chapters you may restart from: 1 … the furthest reached.
export function rewindChoices() {
  const last = Math.max(ORDER.indexOf(questState.reached), ORDER.indexOf(questState.activeChapter), 0);
  return ORDER.slice(0, last + 1).filter((id) => CHAPTERS[id]?.quest);
}

export function rewindTo(id, itemChapter = {}) {
  const idx = ORDER.indexOf(id);
  if (idx < 0) return false;
  const later = new Set(ORDER.slice(idx));
  const snap = questState.toJSON();

  snap.activeChapter = id;
  snap.log = snap.log.filter((e) => !later.has(e.split('|')[0]));
  for (const k of ['greeted', 'defeated', 'solved', 'visited']) {
    snap[k] = [...new Set(snap.log.filter((e) => e.split('|')[1] === k).map((e) => e.split('|')[2]))];
  }
  const fromLater = (name) => later.has(itemChapter[name]);
  snap.items = snap.items.filter((it) => !fromLater(it.name));
  snap.supplies = snap.supplies.filter((s) => !fromLater(s.name));

  const laterEvents = new Set(EVENTS.filter((e) => later.has(e.chapter)).map((e) => `event:${e.id}`));
  // Flags that ARE later chapters' objectives (or listed in their resetFlags).
  const laterFlags = new Set([...later].flatMap((ch) => [
    ...(CHAPTERS[ch]?.quest?.objectives || []).filter((o) => o.flag).map((o) => o.flag),
    ...(CHAPTERS[ch]?.resetFlags || []),
  ]));
  snap.flags = snap.flags.filter((f) => {
    if (f === 'ending-seen') return false;
    if (f.startsWith('card:') && later.has(f.slice(5))) return false;
    if (laterEvents.has(f)) return false;
    if (laterFlags.has(f)) return false;
    if (f === 'premise-seen' && idx === 0) return false;
    return true;
  });

  snap.heroHp = null;
  snap.clock = null;
  snap.currentMap = null;
  questState.restore(snap); // re-derives buffs from the items left
  // Messages of the chapters up to here count as already read.
  questState.phoneSeen = Object.fromEntries(phoneChats().map((c) => [c.id, c.messages.length]));
  return true;
}

// { item name → chapter that gives it }, from the character JSONs (`dataById`:
// { folder: parsed character.json }) plus the events' gifts.
export function itemChaptersFrom(dataById) {
  const out = {};
  for (const data of Object.values(dataById)) {
    for (const [ch, entry] of Object.entries(data?.chapters || {})) {
      // the entry's own item, its `when` variants' items, a battle's reward
      for (const it of [entry?.item, entry?.battle?.reward, ...(entry?.when || []).flatMap((w) => [w.item, w.battle?.reward])]) {
        if (it?.name) out[it.name] = ch;
      }
    }
  }
  for (const e of EVENTS) if (e.gift?.name) out[e.gift.name] = e.chapter;
  for (const f of FINDS) if (f.gives?.name) out[f.gives.name] = f.chapter;
  return out;
}

// DEV chapter select: a FRESH run that starts at chapter `id`, as if every
// earlier chapter had been played: their objectives done (log + flags), the
// items they give in the bag (character JSONs + event gifts), their cards and
// events seen. `dataById` as in itemChaptersFrom.
// `point` (a chapter's `devPoints` entry: { upTo, clock?, itemText? }) also
// plays chapter `id` itself up to the objective whose flag is `upTo`: those
// objectives done, its finds' and its NPCs' items (an entry or `when` variant
// whose `setFlag` is now set) in the bag, the clock at `clock`, and the
// descriptions in `itemText` ({ item name: text }) applied.
export function devPrime(id, dataById = {}, point = null) {
  const idx = ORDER.indexOf(id);
  if (idx < 0) return false;
  questState.reset();
  const done = ORDER.slice(0, idx);
  for (const ch of done) {
    questState.activeChapter = ch;
    for (const o of CHAPTERS[ch]?.quest?.objectives || []) {
      if (o.npc) questState.greet(o.npc, ch);
      if (o.defeat) questState.defeat(o.defeat, ch);
      if (o.quiz) questState.solve(o.quiz, ch);
      if (o.visit) questState.visit(o.visit, ch);
      if (o.flag) questState.setFlag(o.flag);
      if (o.after) questState.setFlag(o.after);
    }
    questState.setFlag(`card:${ch}`);
  }
  const gifts = [];
  for (const data of Object.values(dataById)) {
    for (const [ch, entry] of Object.entries(data?.chapters || {})) {
      if (!done.includes(ch)) continue;
      for (const it of [entry?.item, entry?.battle?.reward, ...(entry?.when || []).flatMap((w) => [w.item, w.battle?.reward])]) if (it?.name) gifts.push(it);
    }
  }
  for (const e of EVENTS) {
    if (!done.includes(e.chapter)) continue;
    questState.setFlag(`event:${e.id}`);
    if (e.gift) gifts.push(e.gift);
  }
  for (const f of FINDS) if (f.gives && done.includes(f.chapter)) gifts.push(f.gives);
  for (const it of gifts) {
    if (it.consumable) questState.addSupply(it, null);
    else questState.addItem(it);
  }
  if (idx > 0) questState.setFlag('premise-seen');
  questState.activeChapter = id;
  // `devItemText` ({ item name: text }): descriptions as they are by then.
  for (const it of questState.items) if (CHAPTERS[id]?.devItemText?.[it.name]) it.description = CHAPTERS[id].devItemText[it.name];
  if (point) primeUpTo(id, dataById, point);
  questState.reached = id;
  questState.currentMap = null;
  questState.phoneSeen = Object.fromEntries(phoneChats().map((c) => [c.id, c.messages.length]));
  return true;
}

function primeUpTo(id, dataById, point) {
  const objs = CHAPTERS[id]?.quest?.objectives || [];
  const last = objs.findIndex((o) => o.flag === point.upTo);
  for (const o of objs.slice(0, last + 1)) {
    if (o.npc) questState.greet(o.npc, id);
    if (o.defeat) questState.defeat(o.defeat, id);
    if (o.quiz) questState.solve(o.quiz, id);
    if (o.visit) questState.visit(o.visit, id);
    if (o.flag) questState.setFlag(o.flag);
  }
  questState.setFlag(`card:${id}`);
  questState.setFlag('premise-seen');
  for (const f of FINDS) {
    if (f.chapter !== id || !questState.hasFlag(`find:${f.id}`) || !f.gives) continue;
    if (f.gives.consumable) questState.addSupply(f.gives, null); else questState.addItem(f.gives);
  }
  for (const data of Object.values(dataById)) {
    const entry = data?.chapters?.[id];
    for (const v of [entry, ...(entry?.when || [])]) {
      if (v?.item && v.setFlag && questState.hasFlag(v.setFlag)) {
        if (v.item.consumable) questState.addSupply(v.item, null); else questState.addItem(v.item);
      }
    }
  }
  for (const it of questState.items) if (point.itemText?.[it.name]) it.description = point.itemText[it.name];
  if (point.clock) questState.clock = { chapter: id, min: parseTime(point.clock) };
}
