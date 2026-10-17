// js/story/flirt.js
// Chapter 12 at the Alcatraz: help Gabbo get a girl's number. Node-importable.
//
// Each girl shows a MOOD icon that changes every few seconds (MOOD_MS):
// 💃 wants to dance · 🍹 wants a drink · 😂 wants to laugh · 😒 not now.
// Talk to her → Gabbo asks what to say → pick an approach. Matching her mood
// = +1 ❤️ (+1 more if it's what she likes most); a wrong one = −1 ❤️; talking
// to her on 😒 just costs a try. `need` hearts = her number (flag
// `alcatraz-number`, chapter 12's objective); out of tries, she walks off for
// a while (COOLDOWN_MS) and you start over with her.
// Chiara is the trap: she wants GABBO; letting him go home with her loses the
// night, so Zio Nick has to talk him out of it.
// Texts follow persona.md (the user only gave each girl's difficulty).
import { questState } from './questState.js';

export const CHAPTER = 'chapter-12';
export const MAP = 'alcatraz';
export const NUMBER_FLAG = 'alcatraz-number';
export const MOOD_MS = [8000, 15000];
export const COOLDOWN_MS = 25000;

export const MOODS = {
  dance: '💃', drink: '🍹', laugh: '😂', no: '😒',
};

// What you can tell Gabbo to do, and what he then says (persona: "O fra" at the
// start of every sentence, "diahane" at the end).
export const APPROACHES = [
  { mood: 'dance', label: '💃 Invitala a ballare', gabbo: 'O fra, balliamo? Diahane.' },
  { mood: 'drink', label: '🍹 Offrile da bere', gabbo: 'O fra, ti offro da bere, diahane.' },
  { mood: 'laugh', label: '😂 Falla ridere', gabbo: 'O fra, sai perché i pinguini non volano? Perché sono già fighi così, diahane.' },
];

export const GABBO = {
  ask: 'O fra, cosa le dico? Diahane.',
  win: 'O fra, ho il numero! Sei un fenomeno, diahane!',
  gone: "O fra, va be', ce ne sono altre, diahane.",
};

export const GIRLS = {
  // easier (user: "un po' meno" difficult)
  martina: {
    need: 2, tries: 4, noChance: 0.15, likes: 'dance',
    hello: 'Ciao! Bella serata, eh?',
    no: 'Ora no, sto aspettando le mie amiche.',
    right: 'Ahah, mi piaci!',
    wrong: 'Mmh... non proprio.',
    win: 'Va bene, ecco il mio numero!',
    leave: 'Vado a ballare con le mie amiche, magari dopo.',
    busy: 'Dopo, dai!',
  },
  // high self-esteem, harder
  ludovica: {
    need: 3, tries: 4, noChance: 0.35, likes: 'drink',
    hello: 'Sì? Avete dieci secondi.',
    no: 'Non ho tempo per voi.',
    right: 'Ok... questa non era male.',
    wrong: 'Seriamente? Ritenta. O forse no.',
    win: 'Va bene, te lo sei guadagnato. Segnati il numero.',
    leave: 'Basta così, torno dalle mie amiche.',
    busy: 'Ti ho già detto di no.',
  },
  vanessa: {
    need: 3, tries: 4, noChance: 0.35, likes: 'laugh',
    hello: "Mi state fissando da mezz'ora.",
    no: "Non sono dell'umore.",
    right: 'Ahah, ok, questa mi ha fatto ridere.',
    wrong: 'Ci provano tutti così. Bocciato.',
    win: 'Mi hai convinta. Ecco il numero, non farmi pentire.',
    leave: 'Vi ho dato fin troppa attenzione.',
    busy: 'Più tardi. Forse.',
  },
  // the trap: she wants GABBO and asks to take him home. If Zio Nick lets him
  // go, Gabbo leaves the club with her and the mission is lost; Zio Nick has
  // to talk him out of it.
  chiara: {
    trap: true,
    hello: 'Ciao Gabbo... sei proprio carino.',
    ask: 'Gabbo, ti va se ce ne andiamo a casa insieme?',
    gabbo: 'O fra, che faccio? Vado con lei? Diahane.',
    options: ['Vai pure con lei', 'No Gabbo, stasera restiamo qui a pushare'],
    stay: 'O fra, hai ragione. Stasera si pusha, diahane.',
    refused: 'Peccato! Se ci ripensi, Gabbo, sono qui.',
    lose: "Gabbo è tornato a casa con Chiara... e tu sei rimasto da solo all'Alcatraz.\nMissione fallita! Torna da Gabbo nella hall e riprova.",
  },
};

export const isGirl = (id) => !!GIRLS[id];
// The flirting game is on: chapter 12, at the Alcatraz, number not got yet.
export const flirtActive = (mapKey) =>
  questState.activeChapter === CHAPTER && mapKey === MAP && !questState.hasFlag(NUMBER_FLAG);

// Runtime state (not saved: leaving the club resets the girls).
const state = {};
export function girlState(id, now) {
  if (!state[id]) state[id] = { hearts: 0, tries: GIRLS[id].tries || 0, cooldownUntil: 0, mood: 'dance', next: 0 };
  const s = state[id];
  if (now >= s.next) { // new mood
    const g = GIRLS[id];
    const moods = ['dance', 'drink', 'laugh'];
    s.mood = Math.random() < (g.noChance ?? 0) ? 'no' : moods[Math.floor(Math.random() * moods.length)];
    s.next = now + MOOD_MS[0] + Math.random() * (MOOD_MS[1] - MOOD_MS[0]);
  }
  return s;
}
export function resetGirls() {
  for (const k of Object.keys(state)) delete state[k];
}

// The icon line over her head: mood + hearts (or ⏳ while she's away).
export function girlTag(id, now) {
  const g = GIRLS[id];
  if (g.trap) return '😏';
  const s = girlState(id, now);
  if (now < s.cooldownUntil) return '⏳';
  return `${MOODS[s.mood]} ${'❤️'.repeat(s.hearts)}${'🤍'.repeat(g.need - s.hearts)}`;
}

// Apply approach `i` to girl `id`: returns { result: 'win'|'leave'|'ok'|'bad', delta }.
export function approach(id, i, now) {
  const g = GIRLS[id];
  const s = girlState(id, now);
  const a = APPROACHES[i];
  const right = s.mood !== 'no' && a.mood === s.mood;
  const delta = right ? 1 + (a.mood === g.likes ? 1 : 0) : -1;
  s.hearts = Math.max(0, Math.min(g.need, s.hearts + delta));
  s.tries -= 1;
  if (s.hearts >= g.need) return { result: 'win', delta };
  if (s.tries <= 0) { leave(id, now); return { result: 'leave', delta }; }
  return { result: right ? 'ok' : 'bad', delta };
}
// Talking to her on 😒: a wasted try.
export function snub(id, now) {
  const s = girlState(id, now);
  s.tries -= 1;
  if (s.tries <= 0) { leave(id, now); return 'leave'; }
  return 'no';
}
function leave(id, now) {
  const s = state[id];
  Object.assign(s, { hearts: 0, tries: GIRLS[id].tries, cooldownUntil: now + COOLDOWN_MS, next: now + COOLDOWN_MS });
}

export function winNumber(id) {
  questState.setFlag(NUMBER_FLAG);
  questState.setFlag(`number:${id}`);
}

// Gabbo went home with Chiara: the night is lost; you must go back to the club.
export const LOSE_CLEARS = ['alcatraz-arrived', NUMBER_FLAG];
export function loseNight() {
  for (const f of LOSE_CLEARS) questState.flags.delete(f);
  resetGirls();
}
