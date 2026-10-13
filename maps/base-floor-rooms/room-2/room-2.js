// maps/base-floor-rooms/room-2/room-2.js
import { makeRoom, setDoor } from '../../../js/core/roomBuilder.js';

const grid = makeRoom(14, 16);
setDoor(grid, 4, 15); // south door -> back to the base floor

export default {
  key: 'room-2',
  name: 'Room 2',
  theme: 'white',
  grid,
  spawns: {
    default: { tx: 4, ty: 13 },
    fromBaseFloor: { tx: 4, ty: 13 },
  },
  warps: [{ tx: 4, ty: 15, to: 'base-floor', toSpawn: 'fromRoom2' }],
  props: [
    { furniture: 'bed', dir: 's', tx: -2.40, ty: -3.00 },
    { furniture: 'fruit_table', dir: 's', tx: 6.41, ty: 0.67 },
    { furniture: 'phone_little_table', dir: 's', tx: -0.80, ty: 5.17 },
  ],
};
