// js/story/rewind.js
// "Scegli capitolo" (title screen): restart the story from a chapter you have
// already reached. Everything the STORY gave you from that chapter on is
// reset, so you play those chapters again:
//   • the chapter-scoped log (talks, wins, quizzes, visits) of that chapter
//     and later, and the global sets rebuilt from what's left;
//   • items and consumables given in those chapters (`itemChapter` maps an
//     item name → the chapter that gives it; built from the character JSONs);
//   • chapter cards, events and the ending of those chapters; the premise /
//     investigation intro if you go back before them;
//   • HP full, the clock back to the chapter's start, phone messages marked read.
// Kept: odd socks, favours + punti casa, affinity, investigation clues, stats,
// and the furthest chapter reached. Node-importable.
import { questState } from './questState.js';
import { ORDER, CHAPTERS } from './chapters.js';
import { EVENTS } from './events.js';
import { INVESTIGATION } from './investigation.js';
import { phoneChats } from './phoneChats.js';

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
    if (f === 'investigation-intro' && idx <= ORDER.indexOf(INVESTIGATION.opensAt)) return false;
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
      if (entry?.item?.name) out[entry.item.name] = ch;
    }
  }
  for (const e of EVENTS) if (e.gift?.name) out[e.gift.name] = e.chapter;
  return out;
}
