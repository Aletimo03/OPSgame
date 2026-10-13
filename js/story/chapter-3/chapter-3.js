// js/story/chapter-3/chapter-3.js
// Chapter 3 — after dealing with Gabbo, head to the first-floor kitchen to
// pick up two items from Alessio and Sara.
export default {
  id: 'chapter-3',
  title: 'Chapter 3 — Supplies',
  // Hint sent to the house group chat (phone, key P) when this chapter starts.
  phone: [{ from: 'timo', text: "Sono nella cucina del primo piano, ho qualcosa per te. C'è anche Sara." }],
  quest: {
    id: 'collect-items',
    title: 'Go to the 1F kitchen and collect items',
    // item-based objectives: done once questState.hasItem(name) is true.
    objectives: [
      { item: 'Trenbolone',    label: 'Get something from Alessio' },
      { item: 'Palle a terra', label: 'Get something from Sara'  },
    ],
  },
};
