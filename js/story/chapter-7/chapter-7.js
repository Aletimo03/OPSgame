// js/story/chapter-7/chapter-7.js
// Chapter 7 — "Il frigo con le mosche". Nima asks in the group chat. In the
// first-floor kitchen, Space facing the right end of the cabinets starts the
// fridge minigame (js/story/fridge.js, js/scenes/FridgeScene.js). Behind the
// mouldy cheese there's an Alcatraz wristband: the next lead. Flags
// fridge-clean / cheese-thrown (and cheese-held, reset with the chapter).
export default {
  id: 'chapter-7',
  title: 'Capitolo 7 — Il frigo con le mosche',
  time: '10:00',
  devStart: { mapKey: 'first-floor-kitchen', spawnName: 'default' },
  phone: [
    { from: 'nima', text: 'Buongiorns?? Chi ha lasciato il formaggio ammuffito nel frigo di su?? Pieno di mosche 🤢 somebody pulisca please! من فضلك' },
    { from: 'mari', sticker: '🤢' },
    { from: 'ernesto', text: 'Il formaggio ammuffito non è mio, giuro. I miei sono piemontesi e finiscono subito.' },
    // private chats (dm: true)
    { from: 'mari', text: 'Hai visto Fede? 🥺🌸', dm: true },
  ],
  resetFlags: ['cheese-held'], // chapter select: also cleared when restarting from here
  quest: {
    id: 'fridge-flies',
    title: 'Pulisci il frigo di su',
    objectives: [
      { flag: 'fridge-clean', place: 'first-floor-kitchen', label: 'Pulisci il frigo di su dalle mosche' },
      { flag: 'cheese-thrown', place: 'first-floor-kitchen', label: 'Butta il formaggio ammuffito nei bidoni' },
    ],
  },
};
