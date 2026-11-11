// js/story/formaggio.js
// Chapter 1 of the rewrite, "Il formaggio ammuffito" (chapter-formaggio),
// right after the prologue's fight with Gabbo:
//   1. right after the fight he goes to bed by himself → morning
//      (flag `mattina`, clock 08:30, scene `sveglia`);
//   2. the phone: a group message about a mouldy cheese in the upstairs
//      fridge (reading that chat sets `formaggio-letto`);
//   3. the fridge minigame in the upstairs kitchen (js/story/fridge.js,
//      FridgeScene) → `frigo-pulito`; Fede Gatta, Antonella and Caue are
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
  noteChapter: 'chapter-bigliettino', // the note and the safe
  room: 'room-20',
  // 1. back to bed
  sleepFlag: 'mattina',
  morningTime: '08:30',
  // 2. the phone
  readFlag: 'formaggio-letto',
  // 3. the fridge (FRIDGE in fridge.js)
  cleanFlag: 'frigo-pulito',
  // 4. mrjackson and the note
  strangerFlag: 'mrjackson-letto',
  noteFlag: 'biglietto',
  note: { map: 'first-floor-bathroom', tx: 5, ty: 4 }, // on the floor, in front of the washing machine
  touchTiles: 1.2,
  newMessage: '📱 Hai un nuovo messaggio\n[P] telefono',
  // A scene (WorldScene.monologue): he reasons it out.
  noteLines: [
    'Cos\'è questa? Non è un ripetitore...',
    'È un bigliettino, piegato in due.',
    '«Stai cercando nel frigo sbagliato. 356.»',
    'Il frigo sbagliato... Quindi i miei peperoni sono davvero in un frigo.',
    'Ma non in quello della cucina di su. Quello l\'ho appena pulito da cima a fondo.',
    'E 356? Tre cifre.',
    'Non è un\'ora. Non è una data.',
    'Una camera? No: in questa casa le camere arrivano a 27.',
    'Ragiona. Un ingegnere spaziale non si ferma davanti a tre numeri.',
    'Tre cifre e basta, senza niente intorno... è un codice. Un lucchetto a combinazione.',
    'Dove c\'è un lucchetto in questa casa?',
    'Quella porticina nel corridoio di su, di fronte alle camere. Il ripostiglio. Non ci sono mai entrato.',
  ],
  noteBanner: '📝 «Stai cercando nel frigo sbagliato. 356.»\nIl ripostiglio, al primo piano',
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
  // A scene (WorldScene.monologue); `zoom` = the camera slams in on him.
  openLines: [
    'Si è aperta!',
    'Dentro c\'è una chiave sola. Sul portachiavi c\'è scritto «18».',
    'Camera 18...',
    'Di chi è la camera 18?',
    { text: 'È LA CAMERA DI ALESSIO!', zoom: 2.4 },
    'Sono sicuro che quel bastardo ha un frigo in camera, ma ancora non l\'ho colto con le mani nel sacco.',
    '«Stai cercando nel frigo sbagliato»: non il frigo della cucina. Il suo frigo segreto!',
    'I miei peperoni sono lì dentro.',
  ],
  banner: '🔑 Chiave della camera 18',
};

const has = (f) => questState.hasFlag(f);
export const inFormaggio = () => questState.activeChapter === FORMAGGIO.chapter;
// Going to bed sends him to the morning (once).
export const sleepReady = () => inFormaggio() && !has(FORMAGGIO.sleepFlag);
// The note's star shows once mrjackson has written, until it's picked up.
export const inBigliettino = () => questState.activeChapter === FORMAGGIO.noteChapter;
export const noteOn = () => inBigliettino() && !has(FORMAGGIO.noteFlag);
// The safe works in this chapter (any time: the code is the puzzle), once.
export const safeOpen = () => inBigliettino() && !has(SAFE.openFlag);
export const checkCode = (digits) => digits.join('') === SAFE.code;
