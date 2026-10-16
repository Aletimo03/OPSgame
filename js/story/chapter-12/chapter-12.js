// js/story/chapter-12/chapter-12.js
// Chapter 12 — a night out (epilogue after the melons are back). Alessio is
// always with Gaia now, so Gabbo needs Zio Nick to go "pushare" at the
// Alcatraz (the Milan club). Flow (js/story/alcatraz.js):
//   1. find Gabbo in the base-floor living room ("hall principale");
//   2. walk out of the entrance's front door → video cutscene → the Alcatraz
//      (flag `alcatraz-arrived`, set by the trip);
//   3. get on the stage (flag zone in the Alcatraz map → `alcatraz-stage`).
// Objectives are unordered in the engine; the front door only lets you out
// after talking to Gabbo in this chapter, so the order holds.
export default {
  id: 'chapter-12',
  title: "Capitolo 12 — Notte all'Alcatraz",
  // In-game time when this chapter starts (js/story/clock.js); its messages fit it.
  time: '23:30',
  phone: [
    { from: 'gabbo', text: "O fra, stasera Alcatraz, chi viene? Diahane" },
    { from: 'timo', text: "O fra. Stasera no." },
    { from: 'gaia', text: "Alessio stasera sta con me 💕" },
    // private chats (dm: true)
    { from: 'gabbo', text: "O fra, Alessio non si fa più trovare, vieni tu. Ti aspetto giù nella hall, diahane", dm: true },
  ],
  quest: {
    id: 'alcatraz-night',
    title: "Si va a pushare all'Alcatraz",
    objectives: [
      { npc: 'gabbo', label: 'Trova Gabbo nella hall del piano terra' },
      { flag: 'alcatraz-arrived', place: 'entrance', label: "Esci dall'ingresso e vai all'Alcatraz" },
      { flag: 'alcatraz-stage', place: 'alcatraz', label: 'Sali sul palco con Gabbo' },
    ],
  },
};
