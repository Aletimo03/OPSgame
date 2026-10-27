// js/story/chapter-9/chapter-9.js
// Chapter 9 — "Il sogno di Zio Nick" (after the night at the Alcatraz; the
// nightmare before the showdown with Gabbo). Flow (js/story/dream.js):
//   1. go to bed in room-20 (flag `dream-entered`, WorldScene.enterDream): you
//      "wake up" in your room, but it's the dream house: dark and strange;
//      Zio Nick remembers the rubbish and a new objective appears;
//   2. go down to the trash room (flag `dream-trash`): the floor opens…
//   3. cross the dark maze to the light without the shadow catching you
//      (flag zone in the dream map → `dream-escaped`), then you really wake up.
// Objectives 2–3 stay hidden until the previous step (`after`).
export default {
  id: 'chapter-9',
  title: 'Capitolo 9 — Il sogno di Zio Nick',
  // In-game time when this chapter starts (js/story/clock.js); its messages fit it.
  time: '04:00',
  devStart: { mapKey: 'room-20', spawnName: 'bedside' },
  // Cleared by chapter select (with the objectives' own flags).
  resetFlags: ['dream-woke', 'dream-line:light', 'dream-line:corridor', 'dream-line:maze', 'dream-line:scared'],
  phone: [
    { from: 'gabbo', text: "O fra, che serata ieri all'Alcatraz, diahane." },
    { from: 'nima', text: 'Goodnights everyone 🙏 domani cucina pulita please' },
    { from: 'ema', text: 'O ragazzi, ma è normale fare sogni strani dopo la discoteca? Grszie' },
  ],
  quest: {
    id: 'the-dream',
    title: 'Un sonno agitato',
    objectives: [
      { flag: 'dream-entered', place: 'room-20', label: 'Vai a dormire nel tuo letto (camera 20)' },
      { flag: 'dream-trash', place: 'trashbin-room', after: 'dream-woke', label: 'Vai nel locale spazzatura' },
      { flag: 'dream-escaped', place: 'dream-maze', after: 'dream-trash', label: 'Attraversa il labirinto' },
    ],
  },
};
