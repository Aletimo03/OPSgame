// js/story/heets.js
// Antonella's heets. After her lines she offers you one (WorldScene.offerHeets):
// outside a kitchen Zio Nick smokes it in peace; in a kitchen it's too calm...
// the music stops, the room goes dark, giant footsteps shake the screen and
// Nima bursts in through the door. Get round him and out of that door = safe;
// caught = black screen, you wake up in your room (WorldScene.heetsTick). It can be replayed as often as you like, nothing
// is saved. Texts follow each persona.md. Node-importable.
export const HEETS = {
  npc: 'antonella',
  chaser: 'nima',
  kitchens: ['first-floor-kitchen', 'base-kitchen'],
  offer: 'Figlio mio, te la vuoi fumare una heets?',
  options: ['Sì, dammene una', 'No, grazie'],
  declined: 'E fai bene, bello di zia. Io però me la fumo.',
  // In a kitchen: one box each. The music stops with `quiet`, the room goes
  // dark (`dark`, over `darkMs`) with `dots`.
  smoke: 'Mi fumo una heets.',
  quiet: ['È tutto così calmo.', 'Troppo calmo.'],
  dots: '...',
  dark: 0.55,
  darkMs: 900,
  // Footsteps of a giant: ms from the last box, shake length and strength.
  steps: [
    { at: 250, ms: 240, power: 0.008 },
    { at: 1050, ms: 260, power: 0.014 },
    { at: 1850, ms: 300, power: 0.022 },
  ],
  runAt: 2500,            // ms: Nima bursts in
  // His entrance is a little cutscene (the kitchen door is top-right, under the
  // HUD): the camera goes to the door, he walks out of it, the camera comes back.
  panMs: 500,
  enterMs: 800,           // walking out of the doorway
  holdMs: 800,            // standing there, staring, before the chase
  // He comes in by the only way out, so you have to lure him round the
  // furniture and get past him: he must be a touch slower than you (600 px/s).
  nimaSpeed: 570,         // px/s (a normal NPC strolls at 200)
  catchTiles: 0.9,
  // The nightmare's sounds: its maze track for the chase, the shadow's sound
  // over and over when he's this close, its scream when he catches you.
  music: 'dream-theme',
  nearTiles: 6,
  shout: '😤 Nima: «NO SMOKING IN CUCINA!!»\nScappa dalla porta!',
  escaped: 'Ma cosa era quello?',
  blackMs: 5000,          // black screen when he catches you
  // Waking up in his room, dazed: the view sways, he walks slowly.
  dazed: ['...', 'Aia, la testa...', 'Mi gira tutto. Cosa è successo?'],
  dazedMs: 5000,          // after his lines
  dazedSpeed: 220,        // px/s (awake: 600)
  dazedFadeMs: 1500,      // the slow fade in from black
  dazedSway: 0.035,       // radians, each way
  // Anywhere else: `relaxed`, then Zio Nick says one of `relaxedLines`.
  relaxed: 'Mi fumo una heets in pace.',
  relaxedLines: [
    'Ahh... si sta bene.',
    'Nessuno che rompe. Pace dei sensi.',
    'Flusso laminare, zero turbolenze. Questa è vita.',
    'Altro che gestionale: questo è saper vivere.',
  ],
};

export const inKitchen = (mapKey) => HEETS.kitchens.includes(mapKey);

// Where Nima comes in: the kitchen's door.
export const nimaStart = (map) => ({ tx: map.warps[0].tx, ty: map.warps[0].ty });
