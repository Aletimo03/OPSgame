// js/story/chapter-4/chapter-4.js
// Chapter 4 — "La pasta al salmone". Emanuele wants cherry tomatoes for his
// pasta al salmone (Zio Nick: «SCIMMIA!»). Talking to him sets `ema-asked`;
// the tomatoes are under the base kitchen's island (js/story/finds.js →
// `find:pomodorini`); bringing them back (Emanuele's `when` entry) sets
// `pomodorini-given` and he tells what he saw: Gaia with a bag.
export default {
  id: 'chapter-4',
  title: 'Capitolo 4 — La pasta al salmone',
  time: '19:30',
  devStart: { mapKey: 'first-floor-kitchen', spawnName: 'default' },
  phone: [
    { from: 'ema', text: 'O ragazzi, stasera pasta al salmone in cucina di su! Chi ha dei pomodorini? Grszie' },
    { from: 'gatta', text: 'Pota, a Brescia la pasta al salmone la fanno meglio' },
    { from: 'nima', text: 'Goodnights... please pulite after 🙏' },
    // private chats (dm: true)
    { from: 'sara', text: 'Mi presti il detersivo? Il mio è finito', dm: true },
  ],
  quest: {
    id: 'salmon-pasta',
    title: 'I pomodorini di Emanuele',
    objectives: [
      { flag: 'ema-asked', at: 'ema', label: 'Parla con Emanuele in cucina di su' },
      { flag: 'find:pomodorini', place: 'base-kitchen', after: 'ema-asked', label: 'Trova i pomodorini nella cucina di sotto' },
      { flag: 'pomodorini-given', at: 'ema', after: 'find:pomodorini', label: 'Porta i pomodorini a Emanuele' },
    ],
  },
};
