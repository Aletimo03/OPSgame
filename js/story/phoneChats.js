// js/story/phoneChats.js
// The phone's chats, built from the chapters' `phone` arrays:
//   • { from, text }            → the group "Cucina di su" (id 'group');
//   • { from, text, dm: true }  → a private chat with `from` (id = character id).
// (A `sticker` instead of `text` works in both.) Zio Nick never writes back:
// the chats are one-way, like everything he "says". Unread counts compare each
// chat's length with questState.phoneSeen[id]. Node-importable.
import { CHAPTERS, ORDER, phoneMessages } from './chapters.js';
import { questState } from './questState.js';
import { chapterStart } from './clock.js';

export const GROUP = 'group';
export const chatIdOf = (m) => (m.dm ? m.from : GROUP);

// Chapter messages, with the affinity-unlocked ones (questState.extraMessages)
// slotted in after the messages of the chapter they arrived in.
export function allMessages() {
  // (after a rewind, messages unlocked in chapters not reached again stay hidden)
  const upTo = ORDER.indexOf(questState.activeChapter);
  const extra = (questState.extraMessages || []).filter((m) => ORDER.indexOf(m.chapter) <= upTo);
  const out = [];
  let chapter = null;
  const flush = (ch) => extra.filter((m) => m.chapter === ch)
    .forEach((m) => out.push({ ...m, chapterTitle: CHAPTERS[m.chapter]?.title || '' }));
  for (const m of phoneMessages()) {
    if (chapter !== null && m.chapter !== chapter) flush(chapter);
    chapter = m.chapter;
    out.push(m);
  }
  if (chapter !== null) flush(chapter);
  // extras from a chapter with no messages of its own
  const seen = new Set(out.map((m) => m.chapter));
  extra.filter((m) => !seen.has(m.chapter)).forEach((m) => out.push({ ...m, chapterTitle: CHAPTERS[m.chapter]?.title || '' }));
  // Times: a chapter's own messages arrive 4 min apart, the last one 2 min
  // before the chapter's start time; affinity ones keep their own minute.
  const per = {};
  out.forEach((m) => { if (m.min == null) per[m.chapter] = (per[m.chapter] || 0) + 1; });
  const seenIn = {};
  for (const m of out) {
    if (m.min != null) continue;
    const k = (seenIn[m.chapter] = (seenIn[m.chapter] || 0) + 1);
    m.min = chapterStart(m.chapter) - 2 - 4 * (per[m.chapter] - k);
  }
  return out;
}

// [{ id, messages, lastIndex }] for every chat with at least one message so
// far, most recent first (like WhatsApp). `messages` keep their global index
// `i` (for stable fake times) and chapter info.
export function phoneChats() {
  const byId = new Map();
  allMessages().forEach((m, i) => {
    const id = chatIdOf(m);
    if (!byId.has(id)) byId.set(id, { id, messages: [], lastIndex: -1 });
    const c = byId.get(id);
    c.messages.push({ ...m, i });
    c.lastIndex = i;
  });
  if (!byId.has(GROUP)) byId.set(GROUP, { id: GROUP, messages: [], lastIndex: -1 });
  return [...byId.values()].sort((a, b) => b.lastIndex - a.lastIndex);
}

export function unreadIn(chat) {
  return Math.max(0, chat.messages.length - (questState.phoneSeen?.[chat.id] || 0));
}

export function totalUnread() {
  return phoneChats().reduce((n, c) => n + unreadIn(c), 0);
}

export function markRead(chat) {
  questState.phoneSeen = { ...(questState.phoneSeen || {}), [chat.id]: chat.messages.length };
}
