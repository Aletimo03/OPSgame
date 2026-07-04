// js/story/chapter-1/chapter-1.js
// Chapter 1 — the player has just moved into the co-housing and goes to the
// kitchen to greet the housemates. Each objective completes when you talk to
// (greet) the matching NPC. The quest is done once every objective is checked.
export default {
  id: 'chapter-1',
  title: 'Chapter 1 — Moving In',
  quest: {
    id: 'greet-kitchen',
    title: 'Go to the kitchen and greet everyone',
    // objective.npc must match the `id` of an NPC placed in the kitchen map.
    objectives: [
      { npc: 'ema', label: 'Greet Ema' },
      { npc: 'sara', label: 'Greet Sara' },
      { npc: 'nima', label: 'Greet Nima' },
    ],
  },
};
