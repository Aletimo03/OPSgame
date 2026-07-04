// js/story/chapter-10/chapter-10.js
// Chapter 10 — FINALE (ordered fetch → boss). Collect the golden badge from
// Alessio upstairs, then face the secret mastermind — Caue — in the base hall.
// Objectives aren't hard-gated on order (the engine just needs all of them
// done), but the labels guide the player through the intended sequence.
//
// Caue is the final boss because his earlier chapter-5 role was a QUIZ (which
// sets `solved`, not `defeated`) — so `{ defeat: 'caue' }` is a genuinely fresh
// fight here, never pre-completed.
export default {
  id: 'chapter-10',
  title: 'Chapter 10 — Il Plein Finale',
  quest: {
    id: 'grand-finale',
    title: 'Prendi il distintivo e smaschera il boss finale',
    objectives: [
      { item: "Distintivo d'Oro", label: 'Ricevi il Distintivo d’Oro da Alessio' },
      { defeat: 'caue',           label: 'Sconfiggi Caue, la mente dietro tutto' },
    ],
  },
};
