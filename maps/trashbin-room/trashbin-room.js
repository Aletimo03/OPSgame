// maps/trashbin-room/trashbin-room.js
import { makeRoom, setDoor } from '../../js/core/roomBuilder.js';

const grid = makeRoom(10, 8);
setDoor(grid, 5, 7); // south door -> base floor

export default {
  key: 'trashbin-room',
  name: 'Trash-bin Room',
  theme: 'white',
  grid,
  spawns: {
    default: { tx: 5, ty: 5 },
    fromBaseFloor: { tx: 5, ty: 5 },
  },
  warps: [{ tx: 5, ty: 7, to: 'base-floor', toSpawn: 'fromTrash' }],
};
