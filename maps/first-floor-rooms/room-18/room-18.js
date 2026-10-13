// maps/first-floor-rooms/room-18/room-18.js
import { makeRoom, setDoor } from '../../../js/core/roomBuilder.js';

const grid = makeRoom(14, 16);
setDoor(grid, 4, 15); // south door -> back to the first floor

export default {
  key: 'room-18',
  name: 'Room 18',
  theme: 'white',
  grid,
  spawns: {
    default: { tx: 4, ty: 13 },
    fromFirstFloor: { tx: 4, ty: 13 },
  },
  warps: [{ tx: 4, ty: 15, to: 'first-floor', toSpawn: 'fromRoom18' }],
  props: [
    { furniture: 'bed', dir: 's', tx: -2.40, ty: -3.00 },
    { furniture: 'fruit_table', dir: 's', tx: 6.41, ty: 0.67 },
    { furniture: 'phone_little_table', dir: 's', tx: -0.80, ty: 5.17 },
  ],
};
