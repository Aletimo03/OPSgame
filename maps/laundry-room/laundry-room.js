// maps/laundry-room/laundry-room.js
import { makeRoom, setDoor } from '../../js/core/roomBuilder.js';

const grid = makeRoom(11, 8);
setDoor(grid, 5, 7); // south door -> base floor

export default {
  key: 'laundry-room',
  name: 'Laundry Room',
  theme: 'white',
  grid,
  spawns: {
    default: { tx: 5, ty: 5 },
    fromBaseFloor: { tx: 5, ty: 5 },
  },
  warps: [{ tx: 5, ty: 7, to: 'base-floor', toSpawn: 'fromLaundry' }],
};
