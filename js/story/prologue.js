// js/story/prologue.js
// The rules of the prologue (chapter-0): which doors Zio Nick can't go through
// yet, the phone without wi-fi, and the hunt for the last TP-Link repeaters
// that block it (stars on the floor, drawn by WorldScene). Node-importable.
import { questState } from './questState.js';

export const PROLOGUE = {
  chapter: 'chapter-0',
  partyChapter: 'chapter-festa', // the night after the nap (its own chapter)
  chapters: ['chapter-0', 'chapter-festa'],
  room: 'room-20',
  kitchen: 'first-floor-kitchen', // his fridge is here
  otherKitchen: 'base-kitchen',
  phoneFlag: 'find:telefono',
  metFlag: 'event:benvenuto',
  fridgeFlag: 'find:peperoni',
  doneFlag: 'event:peperoni',
  phoneItem: 'Telefono',
  // Zio Nick's lines at a closed door.
  notYet: 'Prima finisco di esplorare la stanza.',
  noKey: 'Non ho la chiave.',
  needBadge: 'Mi serve il badge master: ce l\'ha Sara, in cucina di su.',
  badgeOnly: 'Il badge di Sara vale solo per le camere 2, 15 e 19. Qui non posso entrare.',
  tooHungry: 'Ho troppa fame, meglio che mi cucini qualcosa.',
  wrongKitchen: 'La spesa l\'ho sistemata nella cucina di su.',
  noWifi: '📵 Il telefono non funziona: niente wi-fi',
  end: '🚧 Per ora la storia si ferma qui',
  // The repeaters: found by walking onto their star. Gabbo and Alessio start
  // the hunt, Sara's badge opens only these rooms.
  startFlag: 'ripetitori-start',
  badgeFlag: 'badge-got',
  wifiFlag: 'wifi-back',
  rooms: ['room-2', 'room-15', 'room-19'],
  // On the wall: each spot is a wall tile with floor right below it.
  spots: [
    { id: 'corridoio', map: 'base-floor', tx: 15, ty: 26 },
    { id: 'camera-2', map: 'room-2', tx: 12, ty: 0 },
    { id: 'camera-15', map: 'room-15', tx: 12, ty: 0 },
    { id: 'camera-19', map: 'room-19', tx: 12, ty: 0 },
  ],
  touchTiles: 1.4, // how close his feet must be to the star
  foundLine: 'Un ripetitore TP-Link. Lo stacco.',
  lastLines: ["Ed ecco l'ultimo. Lo stacco.", 'Il wi-fi è tornato: il telefono funziona!', 'Sono stanco morto. Vado a farmi un pisolino nel mio letto.'],
  wifiBanner: '📶 Wi-fi tornato: [P] telefono',
  phoneWorks: 'Con il wi-fi funziona.',
  // The nap wakes him up at night, with a party downstairs: Alcatraz lights
  // (smaller, more of them) and its music, louder the closer you get.
  napFlag: 'nap-done',
  nightTime: '23:00',
  party: {
    kitchen: 'base-kitchen',
    track: 'alcatraz-theme',
    disco: { area: { x0: 1, y0: 3, x1: 28, y1: 15 }, lights: 40, radius: 1.1 },
    volume: { 'room-20': 0.08, 'first-floor': 0.2, 'base-floor': 0.4, 'base-kitchen': 1 },
    otherVolume: 0.12,
  },
  star: { key: 'star', path: 'assets/ui/star.png', frame: 64, frames: 8, fps: 4.5, size: 30 },
  // The opening video (the user's clip, silent): Zio Nick walks in and stops
  // (7.5–11.5 s, measured on the clip): the picture holds, he speaks, and the
  // clip goes on from where he starts walking again (CutsceneScene).
  arrival: {
    video: 'assets/cutscenes/arrivo_ops.mp4',
    noAudio: true,
    holdAt: 7.6,    // seconds
    resumeAt: 11.4,
    speaker: 'Zio Nick',
    lines: [
      'Ah, questo deve essere OPS, il posto di cui parlano tutti.',
      'Da fuori sembra bello.',
      'Sono sicuro che sarà pieno di persone normali, con cui potrò fare amicizia.',
    ],
  },
};

// What a new game starts with: the video, then Zio Nick's room.
export const arrivalCutscene = () => ({
  ...PROLOGUE.arrival,
  next: { scene: 'WorldScene', data: { mapKey: PROLOGUE.room, spawnName: 'default' } },
});

// The prologue's rules (doors, the shop closed) also hold at the party.
export const inPrologue = () => PROLOGUE.chapters.includes(questState.activeChapter);

// The phone can't be opened in the prologue: no icon, and P only reminds you.
export const phoneLocked = () => inPrologue() && !questState.hasFlag(PROLOGUE.wifiFlag);

export const napReady = () => questState.activeChapter === PROLOGUE.chapter && questState.hasFlag(PROLOGUE.wifiFlag) && !questState.hasFlag(PROLOGUE.napFlag);
export const partyOn = () => questState.activeChapter === PROLOGUE.partyChapter;
export const partyVolume = (mapKey) => PROLOGUE.party.volume[mapKey] ?? PROLOGUE.party.otherVolume;

export const repeaterFlag = (id) => `ripetitore:${id}`;
export const repeatersFound = () => PROLOGUE.spots.filter((s) => questState.hasFlag(repeaterFlag(s.id))).length;
// The hunt is on: the stars show and the counter counts.
export const repeatersOn = () => inPrologue() && questState.hasFlag(PROLOGUE.startFlag) && !questState.hasFlag(PROLOGUE.wifiFlag);
export const repeaterCounter = () => (repeatersOn() ? `📡 Ripetitori ${repeatersFound()}/${PROLOGUE.spots.length}` : '');

// The chapters after the prologue that keep its house rules on bedroom doors
// (no key = no entry; Sara's badge = rooms 2, 15, 19), with extra keys:
// { 'room-N': item that opens it }.
const KEPT_RULES = {
  'chapter-formaggio': {},
  'chapter-bigliettino': { 'room-18': 'Chiave della camera 18' },
};

// What Zio Nick says at a door he can't use right now, or null if it's open.
export function warpGate(mapKey, warp) {
  const has = (f) => questState.hasFlag(f);
  const keys = KEPT_RULES[questState.activeChapter];
  if (keys) {
    if (!/^room-\d+$/.test(warp.to) || warp.to === PROLOGUE.room) return null;
    if (keys[warp.to] && questState.hasItem(keys[warp.to])) return null;
    if (has(PROLOGUE.badgeFlag) && PROLOGUE.rooms.includes(warp.to)) return null;
    return PROLOGUE.noKey;
  }
  if (!inPrologue()) return null;
  if (mapKey === PROLOGUE.room && !has(PROLOGUE.phoneFlag)) return PROLOGUE.notYet;
  if (mapKey === PROLOGUE.kitchen && has(PROLOGUE.metFlag) && !has(PROLOGUE.fridgeFlag)) return PROLOGUE.tooHungry;
  if (warp.to === PROLOGUE.otherKitchen && !has(PROLOGUE.metFlag)) return PROLOGUE.wrongKitchen;
  if (/^room-\d+$/.test(warp.to) && warp.to !== PROLOGUE.room) {
    if (!has(PROLOGUE.badgeFlag)) return has(PROLOGUE.startFlag) && PROLOGUE.rooms.includes(warp.to) ? PROLOGUE.needBadge : PROLOGUE.noKey;
    if (!PROLOGUE.rooms.includes(warp.to)) return PROLOGUE.badgeOnly;
  }
  return null;
}
