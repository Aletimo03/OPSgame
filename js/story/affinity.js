// js/story/affinity.js
// Affinity with each housemate: 0..MAX_HEARTS hearts (questState.affinity).
// You gain it by being around them, not by grinding:
//   +1 the first time you talk to someone in a chapter;
//   +2 when you finish a favour for them (sideQuests);
//   +1 for Gabbo when you win a rematch, +1 for Alessio when you buy at his shop.
// Reaching 2 and 4 hearts unlocks a private message from them (AFFINITY_DMS),
// stored in questState.extraMessages so it stays in the phone. Texts follow
// each persona.md (normal house chat: nobody knows about the melons).
// Node-importable.
import { questState } from './questState.js';
import { clockNow } from './clock.js';

export const MAX_HEARTS = 5;

export const AFFINITY_DMS = {
  ema: [
    { at: 2, text: 'O Szio Nick, grszie che mi fai sempre compagnia in cucina' },
    { at: 4, text: "O Szio Nick, se scendi a Lameszia Terme ti porto io. Ma il treno da dove parte? Grszie" },
  ],
  sara: [
    { at: 2, text: 'Ti lascio la moka sul fornello, non dire che non ti penso' },
    { at: 4, text: 'Sei uno dei pochi che ascolta le mie lamentele. Grazie davvero' },
  ],
  nima: [
    { at: 2, text: 'Buongiorns! You are the only one che rimette le cose a posto 🙏' },
    { at: 4, text: 'Hey my friend! Elisa dice che sei simpatico 😄 الحمد لله' },
  ],
  ana: [
    { at: 2, text: "Bro, you're officially on the aperitivo list 🥑" },
    { at: 4, text: 'Gumba bro forever 🤝 next guacamole is for you' },
  ],
  gaia: [
    { at: 2, text: 'Senza rispetto, sei simpatico. Quasi quanto Alessio' },
    { at: 4, text: 'Mi laureo tra poco, vieni alla festa? 🎓' },
  ],
  timo: [
    { at: 2, text: 'O fra. Palestra domani.' },
    { at: 4, text: 'O fra. Rispetto.' },
  ],
  mari: [
    { at: 2, text: 'Grazie per la compagnia mentre aspetto Fede 🌸🥰' },
    { sticker: '🌼', at: 4 },
  ],
  gatta: [
    { at: 2, text: 'Pota, sei a posto bro' },
    { at: 4, text: 'Pota, la prossima volta ti porto a Brescia, giuro' },
  ],
  gabbo: [
    { at: 2, text: 'O fra, mi stai simpatico anche se sei uno sbirro, diahane' },
    { at: 4, text: 'O fra, stasera Plein, offro io, diahane' },
  ],
  caue: [
    { at: 4, text: 'Il Signore benedica questa casa. (Numeri 6:24) 🙏' },
  ],
};

export const hearts = (id) => questState.affinity?.[id] || 0;

// Add n hearts (capped); returns the messages this unlocked.
export function addAffinity(id, n = 1) {
  const before = hearts(id);
  const after = Math.min(MAX_HEARTS, before + n);
  if (after === before) return [];
  questState.affinity = { ...(questState.affinity || {}), [id]: after };
  const unlocked = (AFFINITY_DMS[id] || []).filter((m) => m.at > before && m.at <= after);
  for (const m of unlocked) {
    const msg = { from: id, dm: true, chapter: questState.activeChapter, min: Math.floor(clockNow()) };
    if (m.sticker) msg.sticker = m.sticker; else msg.text = m.text;
    questState.extraMessages.push(msg);
  }
  return unlocked;
}

export const heartsLabel = (id) => '❤'.repeat(hearts(id)) + '♡'.repeat(MAX_HEARTS - hearts(id));
