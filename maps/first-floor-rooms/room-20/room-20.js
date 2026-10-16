// maps/first-floor-rooms/room-20/room-20.js
// Zio Nick's own room. Examining his bed = a nap that fully restores HP
// (`sleep: true`, WorldScene.sleepInBed). The other pieces get his own texts.
import { makeRoomSuite, bathroomFixtures } from '../../../js/core/roomBuilder.js';

// Bedroom (top) + anteroom (bottom-left, you enter from below) + bathroom
// (bottom-right, open doorway from the anteroom). See makeRoomSuite.
const suite = makeRoomSuite(17, 16);
const { grid } = suite;

export default {
  key: 'room-20',
  name: 'Room 20 — Zio Nick',
  theme: 'white',
  grid,
  areas: suite.areas, // bedroom / anteroom / bathroom… (story-check: each reachable)
  spawns: {
    default: { ...suite.spawn },
    fromFirstFloor: { ...suite.spawn },
  },
  warps: [{ ...suite.door, to: 'first-floor', toSpawn: 'fromRoom20' }],
  props: [
    ...bathroomFixtures(suite.areas.bathroom), // shower, sink, toilet
    { furniture: 'armadio', dir: 'e', tx: 0.99, ty: suite.areas.anteroom.y0 - 0.5 }, // anteroom, against its left wall
    { furniture: 'bed', dir: 's', tx: -2.40, ty: -3.00, sleep: true,
      label: 'Letto di Zio Nick', examine: ['Il letto di Zio Nick. Stamattina, appena sveglio, i due meloni non c\'erano più.', 'Un pisolino qui e torni come nuovo.'] },
    { furniture: 'fruit_table', dir: 's', tx: 6.41, ty: 0.67,
      label: 'Tavolino', examine: ['Un portauova vuoto: due uova a colazione, ogni giorno. Nemmeno una di più.'] },
    { furniture: 'phone_little_table', dir: 's', tx: -0.80, ty: 5.17,
      label: 'Comodino', examine: ['Il badge del museo, le cuffie e l\'orologio da corsa: 15 km stamattina.'] },
  ],
};
