// js/story/chapter-2/chapter-2.js
// Chapter 2 — track down Gabbo (base-floor main corridor) and BEAT him. Talking
// to him only starts the fight: the chapter completes on the win (`defeat`),
// not on the greeting. A win in chapter 1 (the optional room-7 fight) doesn't
// count here: objectives are chapter-scoped (questState.didIn).
export default {
  id: 'chapter-2',
  title: "Capitolo 2 — Alcatraz",
  // In-game time when this chapter starts (js/story/clock.js); its messages fit it.
  time: '22:30',
  // Hint sent to the house group chat (phone, key P) when this chapter starts.
  phone: [
    { from: 'ana', text: "Bro, Gabbo is in the main corridor on the ground floor with a HUGE backpack 👀 going to Alcatraz..." },
    { from: 'gabbo', text: "O fra, stasera Alcatraz, chi viene? diahane" },
    { from: 'sara', text: "Qualcuno lo fermi prima che svegli tutto il palazzo, porco d*o" },
    // private chats (dm: true)
    { from: 'timo', text: "O fra. Palestra domani?", dm: true },
  ],
  quest: {
    id: 'find-gabbo',
    title: "Ferma Gabbo prima che esca con lo zaino pieno",
    objectives: [{ defeat: 'gabbo', label: "Batti Gabbo in combattimento" }],
  },
};
