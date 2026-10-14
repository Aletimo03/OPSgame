// js/story/chapter-5/chapter-5.js
// Chapter 5 — QUIZ QUEST. Caue won't let you pass until you answer his question
// correctly. `{ quiz: 'caue' }` completes when questState.isSolved('caue') is
// true, which WorldScene.tryInteract sets only on the right answer. The actual
// question/options/answer live in caue's character.json `chapters.chapter-5.quiz`.
export default {
  id: 'chapter-5',
  title: "Capitolo 5 — L'Esame di Caue",
  // In-game time when this chapter starts (js/story/clock.js); its messages fit it.
  time: '16:00',
  // Hint sent to the house group chat (phone, key P) when this chapter starts.
  phone: [
    { from: 'gaia', text: "Caue ti aspetta nel corridoio principale del primo piano con una domanda... senza rispetto" },
    { from: 'ana', text: "Wait, Caue is real? Never seen him bro 👀" },
    // private chats (dm: true)
    { from: 'nima', text: "Zio Nick, please stasera svuota lavastoviglie 🙏 من فضلك", dm: true },
  ],
  quest: {
    id: 'caue-quiz',
    title: "Rispondi alla domanda di Caue",
    objectives: [
      { quiz: 'caue', label: 'Supera la prova di Caue' },
    ],
  },
};
