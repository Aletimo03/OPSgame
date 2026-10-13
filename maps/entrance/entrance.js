// maps/entrance/entrance.js
// The front entrance / lobby. The game starts here.
import { makeRoom, setDoor } from '../../js/core/roomBuilder.js';

const grid = makeRoom(11, 9);
setDoor(grid, 5, 0); // north door -> base floor main hall

export default {
  key: 'entrance',
  name: 'Entrance',
  theme: 'entrance',
  grid,
  spawns: {
    // row 6, not 7: the feet sit ~1.4 tiles below the sprite centre, so on
    // row 7 they would overlap the bottom wall (row 8).
    default: { tx: 5, ty: 6 },
    fromBaseFloor: { tx: 5, ty: 6 },
  },
  warps: [{ tx: 5, ty: 0, to: 'base-floor', toSpawn: 'fromEntrance' }],
};
