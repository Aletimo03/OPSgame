// js/story/chapter-5/chapter-5.js
// Chapter 5 — QUIZ QUEST. Caue won't let you pass until you answer his question
// correctly. `{ quiz: 'caue' }` completes when questState.isSolved('caue') is
// true, which WorldScene.tryInteract sets only on the right answer. The actual
// question/options/answer live in caue's character.json `chapters.chapter-5.quiz`.
export default {
  id: 'chapter-5',
  title: 'Chapter 5 — L’Esame di Caue',
  quest: {
    id: 'caue-quiz',
    title: 'Rispondi correttamente alla domanda di Caue',
    objectives: [
      { quiz: 'caue', label: 'Supera la prova di Caue' },
    ],
  },
};
