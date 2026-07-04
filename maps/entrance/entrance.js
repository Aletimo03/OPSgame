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
    default: { tx: 5, ty: 7 },
    fromBaseFloor: { tx: 5, ty: 7 },
  },
  warps: [{ tx: 5, ty: 0, to: 'base-floor', toSpawn: 'fromEntrance' }],
};
