// js/story/chapter-1/chapter-1.js
// Chapter 1 — "La sconfitta". Zio Nick, who never minds his own business,
// goes to "fare giustizia" with Gabbo l'allungamani (allusive only) and LOSES:
// Gabbo's chapter-1 battle has `mustLose` (BattleScene: he can't be brought
// down), «Aia, il ginocchio!», then Zio Nick wakes up in the first-floor
// kitchen (WorldScene.onScriptedLoss) and chapter 2 begins. The loss sets the
// flag `gabbo-ko`. `at: 'gabbo'` only tells the guide (tracker, "!", map) who.
export default {
  id: 'chapter-1',
  title: 'Capitolo 1 — La sconfitta',
  // In-game time when this chapter starts (js/story/clock.js); its messages fit it.
  time: '07:30',
  // Where the DEV chapter select drops you (TitleScene).
  devStart: { mapKey: 'room-20', spawnName: 'default' },
  phone: [
    { from: 'sara', text: 'Gabbo ieri sera di nuovo con le mani lunghe. Ora è nel corridoio principale del primo piano.' },
    { from: 'mari', text: 'Ragazze, occhio alle mani di Gabbo 🙄🌸' },
    { from: 'gabbo', text: 'O fra, era solo una pacca amichevole, diahane' },
    { from: 'nima', text: 'Buongiorns! Please, niente casino today 🙏' },
    // private chats (dm: true)
    { from: 'ema', text: 'O Szio Nick, ma Gabbo è sempre così? Grszie', dm: true },
  ],
  quest: {
    id: 'justice',
    title: 'Vai a fare giustizia con Gabbo',
    objectives: [
      { flag: 'gabbo-ko', at: 'gabbo', label: 'Affronta Gabbo nel corridoio del primo piano' },
    ],
  },
};
