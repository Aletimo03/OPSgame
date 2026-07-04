// js/story/chapter-11/chapter-11.js
// Chapter 11 — INTERACT. A new resident, Elena, has just moved in upstairs.
// Go and introduce yourself. Pure greet quest: completes on talking to her.
//   • npc elena (first-floor-main)
// `greet` is a fresh Set for the id 'elena', so chapter-12's `{ defeat: 'elena' }`
// (a different Set) is never pre-completed by this greeting.
export default {
  id: 'chapter-11',
  title: 'Chapter 11 — La Nuova Inquilina',
  quest: {
    id: 'new-tenant',
    title: 'Conosci la nuova arrivata',
    objectives: [
      { npc: 'elena', label: 'Presentati a Elena al primo piano' },
    ],
  },
};
