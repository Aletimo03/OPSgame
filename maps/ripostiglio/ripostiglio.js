// maps/ripostiglio/ripostiglio.js
// A small, long and narrow room off the first-floor corridor: its door is on
// the corridor's upper wall, left of the drying-racks hall (first-floor
// (17,26)). You come in from below; on the left wall, just inside, the key
// safe (`safe`, drawn in code by WorldScene.drawSafe; its code panel is
// js/scenes/SafeScene.js, the rules js/story/safe.js).
import { makeRoom, setDoor } from '../../js/core/roomBuilder.js';

const COLS = 6;
const ROWS = 12;
const grid = makeRoom(COLS, ROWS);
setDoor(grid, 2, ROWS - 1, 2); // bottom door -> the first-floor corridor

export default {
  key: 'ripostiglio',
  name: 'Ripostiglio',
  theme: 'white',
  grid,
  spawns: {
    default: { tx: 2, ty: ROWS - 2 },
  },
  warps: [{ tx: 2, ty: ROWS - 1, w: 2, h: 1, to: 'first-floor', toSpawn: 'fromRipostiglio' }],
  // The key safe, hung on the left wall just inside (tile x 0 = the wall).
  safe: { tx: 0.25, ty: ROWS - 4.2, w: 0.75, h: 1 },
};
