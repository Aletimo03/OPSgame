// js/story/chapter-11/chapter-11.js
// Chapter 11 — FINALE (ordered fetch → boss). Collect the golden badge from
// Alessio upstairs, then face the secret mastermind — Caue — in the base hall.
// Objectives aren't hard-gated on order (the engine just needs all of them
// done), but the labels guide the player through the intended sequence.
//
// Caue is the final boss because his earlier chapter-5 role was a QUIZ (which
// sets `solved`, not `defeated`) — so `{ defeat: 'caue' }` is a genuinely fresh
// fight here, never pre-completed.
export default {
  id: 'chapter-11',
  title: "Capitolo 11 — I due meloni",
  // In-game time when this chapter starts (js/story/clock.js); its messages fit it.
  time: '21:00',
  // Hint sent to the house group chat (phone, key P) when this chapter starts.
  phone: [
    { from: 'timo', text: "O fra, Distintivo d'Oro in cucina primo piano. Poi Caue." },
    { from: 'caue', text: "Sopportandovi a vicenda e perdonandovi vicendevolmente. (Colossesi 3:13) 🙏" },
    { from: 'gabbo', text: "O fra, stasera tutti al Plein, diahane" },
    // private chats (dm: true)
    { from: 'timo', text: "O fra. Grande.", dm: true },
  ],
  quest: {
    id: 'grand-finale',
    title: "Prendi il distintivo e riprenditi i meloni",
    objectives: [
      { item: "Distintivo d'Oro", label: 'Ricevi il Distintivo d’Oro da Alessio' },
      { defeat: 'caue',           label: "Sconfiggi Caue e riprenditi i meloni" },
    ],
  },
};
