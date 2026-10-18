// js/story/flirt.js
// Chapter 12 at the Alcatraz: help Gabbo get a girl's number. Node-importable.
//
// Each girl shows a MOOD icon that changes every few seconds (MOOD_MS):
// 💃 wants to dance · 🍹 wants a drink · 😂 wants to laugh · 😒 not now.
// Talk to her → Gabbo asks what to say → pick an approach. Matching her mood
// = +1 ❤️ (never more: user's rule); a wrong one = −1 ❤️; talking
// to her on 😒 just costs a try. `need` hearts = her number (flag
// `alcatraz-number`, chapter 12's objective); out of tries, she walks off for
// a while (COOLDOWN_MS) and you start over with her.
// 🍹 = an ORDER: go to the bar (map `bar`), pick a drink (DRINKS: stronger =
// more ❤️, more alcohol for Gabbo too, more punti casa) and bring it back within
// ORDER_MS; she drinks, and so does Gabbo: the drunker he is, the
// more often he garbles what you tell him to say. 💃 = a DANCE CHALLENGE
// (DanceScene, arrows on the beat): dance well = +1 ❤️.
// Gabbo follows Zio Nick around the club (WorldScene.followTick) and can't be
// talked to while the flirting is on (he'd always be the one in front).
// Chiara is the trap: she wants GABBO and slowly follows him; when she reaches
// him she asks him to go home with her. Zio Nick must talk him out of it, but
// a drunk Gabbo may go anyway (goChance) — and the night is lost.
// Texts follow persona.md (the user only gave each girl's difficulty).
import { questState } from './questState.js';

export const CHAPTER = 'chapter-12';
export const MAP = 'alcatraz';
export const NUMBER_FLAG = 'alcatraz-number';
export const MOOD_MS = [8000, 15000];
export const NO_MOOD_MS = [2500, 4500]; // 😒 doesn't last long
export const COOLDOWN_MS = 25000;
export const ORDER_MS = 45000;       // time to bring a drink back from the bar
export const CHIARA_SPEED = 95;      // px/s (Zio Nick walks at 600)
export const CHIARA_WAIT_MS = 15000; // after a try, she waits before following again

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
  garbled: 'O fra... hic... ho detto la cosa sbagliata? Diahane.',
  toBar: 'O fra, vai al bar a prenderle da bere. Uno anche per me, diahane.',
  cheers: 'O fra, cin cin, diahane!',
  expired: "O fra, ci hai messo troppo, se n'è andata. Il drink lo bevo io, diahane.",
};

export const GIRLS = {
  // easier (user: "un po' meno" difficult)
  martina: {
    need: 3, tries: 5, noChance: 0.15, likes: 'dance',
    hello: 'Ciao! Bella serata, eh?',
    no: 'Ora no, sto aspettando le mie amiche.',
    right: 'Ahah, mi piaci!',
    wrong: 'Mmh... non proprio.',
    win: 'Va bene, ecco il mio numero!',
    leave: 'Vado a ballare con le mie amiche, magari dopo.',
    busy: 'Dopo, dai!',
    order: 'Sì! Prendimi qualcosa di fresco.',
    thanks: 'Grazie! Salute!',
    dance: 'Balliamo! Ma voglio vedere come ti muovi tu, amico di Gabbo.',
    danceWin: 'Wow, che ritmo! Mi state simpatici.',
    danceLose: 'Mmh, magari la prossima canzone...',
    danceNeed: 0.6,
  },
  // high self-esteem, harder
  ludovica: {
    need: 4, tries: 6, noChance: 0.35, likes: 'drink',
    hello: 'Sì? Avete dieci secondi.',
    no: 'Non ho tempo per voi.',
    right: 'Ok... questa non era male.',
    wrong: 'Seriamente? Ritenta. O forse no.',
    win: 'Va bene, te lo sei guadagnato. Segnati il numero.',
    leave: 'Basta così, torno dalle mie amiche.',
    busy: 'Ti ho già detto di no.',
    order: 'Un drink? Va bene, ma che sia buono.',
    thanks: 'Mh. Accettabile.',
    dance: 'Volete ballare con me? Prima fatemi vedere che sapete farlo.',
    danceWin: 'Ok, lo ammetto: non male.',
    danceLose: 'Come pensavo. Niente da fare.',
    danceNeed: 0.75,
  },
  vanessa: {
    need: 4, tries: 6, noChance: 0.35, likes: 'laugh',
    hello: "Mi state fissando da mezz'ora.",
    no: "Non sono dell'umore.",
    right: 'Ahah, ok, questa mi ha fatto ridere.',
    wrong: 'Ci provano tutti così. Bocciato.',
    win: 'Mi hai convinta. Ecco il numero, non farmi pentire.',
    leave: 'Vi ho dato fin troppa attenzione.',
    busy: 'Più tardi. Forse.',
    order: 'Se proprio insistete... prendetemi qualcosa.',
    thanks: 'Grazie. Non pensare che basti.',
    dance: 'Ballare? Fammi vedere. Se sbagli, sparisci.',
    danceWin: 'Ok, questa volta mi hai convinta.',
    danceLose: 'Bocciato. Lo sapevo.',
    danceNeed: 0.75,
  },
  // the trap: she wants GABBO and asks to take him home. If Zio Nick lets him
  // go, Gabbo leaves the club with her and the mission is lost; Zio Nick has
  // to talk him out of it.
  chiara: {
    trap: true,
    hello: 'Ciao Gabbo... sei proprio carino.',
    ask: 'Gabbo, ti va se ce ne andiamo a casa insieme?',
    gabbo: 'O fra, che faccio? Vado con lei? Diahane.',
    // The refusal is first, so it's the one pre-selected; accepting asks again.
    options: ['No Gabbo, stasera restiamo qui a pushare', 'Vai pure con lei'],
    confirm: 'Sicuro? Se Gabbo va via con lei, la serata è persa.',
    confirmOptions: ['No, ci ripenso', 'Sì, vai pure'],
    stay: 'O fra, hai ragione. Stasera si pusha, diahane.',
    drunkGo: 'O fra... hic... non ti sento... vado con lei, diahane.',
    refused: 'Peccato! Se ci ripensi, Gabbo, sono qui.',
    lose: "Gabbo è tornato a casa con Chiara... e tu sei rimasto da solo all'Alcatraz.\nMissione fallita! Torna da Gabbo nella hall e riprova.",
  },
};

// The maranza: like Chiara he follows you around, but he's after Zio Nick's
// PHONE. Sober you never let it go; with every drink of the night (gabbo.drunk:
// you've been drinking together) the chance he gets it grows (stealChance).
// Stolen: −MARANZA.fine punti casa and no phone (P) until you leave the club.
// There are several (character `copies`), each confined to its own 8x8 area:
// he only chases you when he SEES you (range + line of sight, a "!" pops over
// his head) and never leaves his area.
export const MARANZA = {
  id: 'maranza',
  speed: 115,       // px/s
  waitMs: 15000,    // after a try he backs off this long
  headStart: 9000,
  fine: 5,
  sight: 6,         // tiles: he notices you within this range, if nothing blocks the view
  area: 8,          // each one stays inside an 8x8 square around his starting tile
  hello: 'Fra, che ore sono? Fammi vedere il telefono un attimo...',
  kept: 'Eh vabbè fra, rilassati. Ci vediamo dopo.',
  stole: 'Grazie fra! Ciaooo!',
  keptBanner: '📱 Il maranza ci prova, ma tieni stretto il telefono!',
  stoleBanner: '📱 Il maranza ti ha rubato il telefono!',
};
export const stealChance = () => Math.min(0.8, 0.15 * gabbo.drunk);
export const phone = { stolen: false };
export function tryToSteal() {
  if (phone.stolen) return false;
  if (Math.random() < stealChance()) {
    phone.stolen = true;
    questState.points = Math.max(0, (questState.points || 0) - MARANZA.fine);
    return true;
  }
  return false;
}

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
    const [a, b] = s.mood === 'no' ? NO_MOOD_MS : MOOD_MS;
    s.next = now + a + Math.random() * (b - a);
  }
  return s;
}
export function resetGirls() {
  for (const k of Object.keys(state)) delete state[k];
  gabbo.drunk = 0;
  bar.order = null;
  bar.carrying = null;
  phone.stolen = false;
}

// ── Gabbo: drinks and garbling ──────────────────────────────────────────────
export const gabbo = { drunk: 0 };
// The drunker he is, the likelier he says something other than what you chose.
export const garbleChance = () => Math.min(0.6, 0.1 * gabbo.drunk);
// …and the likelier he gives in to Chiara.
export const goChance = () => Math.min(0.85, 0.15 * gabbo.drunk);
// Gabbo's line, slurred a bit more with every drink.
export function slur(line) {
  if (gabbo.drunk <= 0) return line;
  let out = line.replace(/,? ?[Dd]iahane/, ` hic... diahane`);
  if (gabbo.drunk >= 3) out = out.replace(/a/g, 'aa').replace(/O fra/, 'O fraaa');
  return out;
}
export const gabboTag = () => '🍺'.repeat(gabbo.drunk);

// ── The bar ──────────────────────────────────────────────────────────────────
// The bar menu: a stronger drink wins her over faster, but it's more alcohol
// for Gabbo too (he drinks the same) and costs more punti casa.
export const DRINKS = [
  { id: 'birra', label: '🍺 Birra', cost: 0, booze: 1 },
  { id: 'spritz', label: '🍹 Spritz', cost: 4, booze: 2 },
  { id: 'jager', label: '🥃 Jäger bomb', cost: 8, booze: 3 },
];
// Every drink = +1 ❤️ (user's rule: a positive interaction is never worth more).
export const drinkLabel = (d) => `${d.label} · ${d.cost ? `${d.cost} punti casa` : 'gratis'} · Gabbo +${'🍺'.repeat(d.booze)}`;
// order = { girl, until } while a drink is wanted; carrying = the drink bought.
export const bar = { order: null, carrying: null };
export function orderDrink(id, now) {
  bar.order = { girl: id, until: now + ORDER_MS };
  bar.carrying = null;
}
// Buy drink `i` for the current order: 'ok' | 'poor' (not enough punti casa) | 'none'.
export function buyDrink(i) {
  if (!bar.order || bar.carrying) return 'none';
  const d = DRINKS[i];
  if ((questState.points || 0) < d.cost) return 'poor';
  questState.points = (questState.points || 0) - d.cost;
  bar.carrying = d;
  return 'ok';
}
// Too slow: she gives up; a drink already in hand goes to Gabbo.
export function expireOrder(now) {
  if (!bar.order || now < bar.order.until) return null;
  const girl = bar.order.girl;
  if (bar.carrying) gabbo.drunk += bar.carrying.booze;
  bar.order = null; bar.carrying = null;
  return girl;
}
// Hand the drink to her: +1 ❤️; Gabbo drinks the same (stronger = drunker).
export function deliverDrink(id, now) {
  const g = GIRLS[id];
  const s = girlState(id, now);
  const d = bar.carrying;
  bar.order = null; bar.carrying = null;
  gabbo.drunk += d.booze;
  s.hearts = Math.min(g.need, s.hearts + 1); // +1 ❤️, whatever the drink
  return s.hearts >= g.need ? 'win' : 'ok';
}

// The icon line over her head: mood + hearts (or ⏳ while she's away, or the
// countdown while she waits for her drink).
export function girlTag(id, now) {
  const g = GIRLS[id];
  if (g.trap) return '😏';
  const s = girlState(id, now);
  if (now < s.cooldownUntil) return '⏳';
  const hearts = `${'❤️'.repeat(s.hearts)}${'🤍'.repeat(g.need - s.hearts)}`;
  if (bar.order?.girl === id) return `🍹⏳${Math.max(0, Math.ceil((bar.order.until - now) / 1000))}s ${hearts}`;
  return `${MOODS[s.mood]} ${hearts}`;
}

// Apply approach `i` to girl `id`: returns { result, delta } with result
//   'order' (go to the bar) | 'dance' (start the challenge) | 'win' | 'leave' | 'ok' | 'bad'.
export function approach(id, i, now) {
  const g = GIRLS[id];
  const s = girlState(id, now);
  const a = APPROACHES[i];
  const right = s.mood !== 'no' && a.mood === s.mood;
  s.tries -= 1;
  if (right && a.mood === 'drink') { orderDrink(id, now); return { result: 'order', delta: 0 }; }
  if (right && a.mood === 'dance') return { result: 'dance', delta: 0 };
  const delta = right ? 1 : -1; // a positive interaction is always exactly +1 ❤️
  s.hearts = Math.max(0, Math.min(g.need, s.hearts + delta));
  if (s.hearts >= g.need) return { result: 'win', delta };
  if (s.tries <= 0) { leave(id, now); return { result: 'leave', delta }; }
  return { result: right ? 'ok' : 'bad', delta };
}
// The dance challenge ended: won → +1 ❤️ ('win' if that's enough for her
// number, else 'ok'); lost → −1 ❤️ (she may leave).
export function danceResult(id, won, now) {
  const s = girlState(id, now);
  if (won) {
    s.hearts = Math.min(GIRLS[id].need, s.hearts + 1);
    return s.hearts >= GIRLS[id].need ? 'win' : 'ok';
  }
  s.hearts = Math.max(0, s.hearts - 1);
  if (s.tries <= 0) { leave(id, now); return 'leave'; }
  return 'bad';
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
