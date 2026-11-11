// js/story/formaggio.js
// Chapter 1 of the rewrite, "Il formaggio ammuffito" (chapter-formaggio),
// right after the prologue's fight with Gabbo:
//   1. it's still night: Zio Nick goes back to bed (room-20) → morning
//      (flag `mattina`, clock 08:30, scene `sveglia`);
//   2. the phone: a group message about a mouldy cheese in the upstairs
//      fridge (reading that chat sets `formaggio-letto`);
//   3. the fridge minigame in the upstairs kitchen (js/story/fridge.js,
//      FridgeScene) → `frigo-pulito`; Fede Gatta, Antonella and Emanuele are
//      in the kitchen;
//   4. a private message from «mrjackson» (no profile picture): go to the
//      laundry upstairs; there, a star on the floor like the repeaters' is a
//      note: «Stai cercando nel frigo sbagliato. 356.» (`biglietto`);
//   5. the key safe in the ripostiglio (first floor, left of the racks hall):
//      code 356 (js/scenes/SafeScene.js) → the key of room 18, Alessio's
//      (`cassaforte-aperta`). The story stops there for now.
// Lines are Zio Nick talking to himself (no narrator). Node-importable.
import { questState } from './questState.js';

export const FORMAGGIO = {
  chapter: 'chapter-formaggio',
  room: 'room-20',
  // 1. back to bed
  sleepFlag: 'mattina',
  morningTime: '08:30',
  // 2. the phone
  readFlag: 'formaggio-letto',
  // 3. the fridge (FRIDGE_TASKS in fridge.js)
  cleanFlag: 'frigo-pulito',
  // 4. mrjackson and the note
  strangerFlag: 'mrjackson-letto',
  noteFlag: 'biglietto',
  note: { map: 'first-floor-bathroom', tx: 5, ty: 4 }, // on the floor, in front of the washing machine
  touchTiles: 1.2,
  newMessage: '📱 Nuovo messaggio da mrjackson\n[P] telefono',
  noteLines: [
    'Cos\'è questa? Non è un ripetitore...',
    'È un bigliettino.',
    '«Stai cercando nel frigo sbagliato. 356.»',
    'Il frigo sbagliato? E 356 cosa vuol dire?',
  ],
  noteBanner: '📝 «Stai cercando nel frigo sbagliato. 356.»',
  // What Zio Nick says when he closes the phone after reading a chat (by the
  // flag that chat sets).
  phoneLines: {
    'formaggio-letto': [
      'Un formaggio ammuffito nel frigo della cucina di su?',
      'Il frigo dove tengo la mia spesa. Vado subito a pulirlo.',
    ],
    'mrjackson-letto': [
      'mrjackson? Senza foto profilo...',
      'E come fa a sapere dei miei peperoni?',
      'Il locale lavatrice al piano di su: vado a vedere.',
    ],
  },
};

// 5. The key safe.
export const SAFE = {
  map: 'ripostiglio',
  code: '356',
  openFlag: 'cassaforte-aperta',
  image: { key: 'cassaforte', path: 'assets/ui/cassaforte.jpg', w: 1448, h: 1086 },
  // The three dials, measured on the picture (px): centres and size.
  dials: [{ x: 520, y: 513 }, { x: 557, y: 513 }, { x: 595, y: 513 }],
  dialW: 30,
  dialH: 44,
  prompt: 'Inserisci il codice',
  wrong: 'Codice sbagliato.',
  look: ['Una cassetta per le chiavi, con un lucchetto a tre cifre.'],
  empty: ['La cassetta delle chiavi è vuota: la chiave della camera 18 ce l\'ho io.'],
  key: { name: 'Chiave della camera 18', description: 'Dalla cassetta del ripostiglio. La camera di Alessio.' },
  openLines: [
    'Si è aperta!',
    'Dentro c\'è una chiave... «18».',
    'La camera 18. È quella di Alessio.',
    'Sono sicuro che quel bastardo ha un frigo in camera, ma ancora non l\'ho colto con le mani nel sacco.',
    '«Il frigo sbagliato»... I miei peperoni sono nel suo frigo segreto!',
  ],
  banner: '🔑 Chiave della camera 18',
};

const has = (f) => questState.hasFlag(f);
export const inFormaggio = () => questState.activeChapter === FORMAGGIO.chapter;
// Going to bed sends him to the morning (once).
export const sleepReady = () => inFormaggio() && !has(FORMAGGIO.sleepFlag);
// The note's star shows once mrjackson has written, until it's picked up.
export const noteOn = () => inFormaggio() && has(FORMAGGIO.cleanFlag) && !has(FORMAGGIO.noteFlag);
// The safe works in this chapter (any time: the code is the puzzle), once.
export const safeOpen = () => inFormaggio() && !has(SAFE.openFlag);
export const checkCode = (digits) => digits.join('') === SAFE.code;
