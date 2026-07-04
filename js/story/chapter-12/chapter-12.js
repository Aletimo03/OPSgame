// js/story/chapter-12/chapter-12.js
// Chapter 12 — FIGHT. Elena makes good on her promise and challenges Zio Nick
// to a one-on-one duel down in the base hall. Completes only on a battle WIN.
//   • defeat elena (base-floor-main)
// Fresh `defeat` id — Elena was only ever GREETED before (chapter-11), so this
// is a genuine fight, never pre-completed.
export default {
  id: 'chapter-12',
  title: 'Chapter 12 — Il Duello della Rete',
  quest: {
    id: 'net-duel',
    title: 'Affronta Elena nel duello finale',
    objectives: [
      { defeat: 'elena', label: 'Sconfiggi Elena in battaglia' },
    ],
  },
};
