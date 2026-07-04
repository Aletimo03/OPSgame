// maps/first-floor-rooms/room-25/room-25.js
import { makeRoom, setDoor } from '../../../js/core/roomBuilder.js';

const grid = makeRoom(14, 16);
setDoor(grid, 4, 15); // south door -> back to the first floor

export default {
  key: 'room-25',
  name: 'Room 25',
  theme: 'white',
  grid,
  spawns: {
    default: { tx: 4, ty: 13 },
    fromFirstFloor: { tx: 4, ty: 13 },
  },
  warps: [{ tx: 4, ty: 15, to: 'first-floor', toSpawn: 'fromRoom25' }],
  props: [
    { key: 'bed',               path: 'assets/rooms/bed.png',               tx: -2.40, ty: -3.00, w: 12,  h: 12,  solid: true, collider: { tx: 0.95, ty: 0.57, w: 4.80, h: 3.32 } },
    { key: 'fruit_table',       path: 'assets/rooms/fruit_table.png',       tx:  6.41, ty:  0.67, w:  8.5,h:  8.5, solid: true, collider: { tx: 9.30, ty: 3.50, w: 2.70, h: 3.08 } },
    { key: 'phone_little_table',path: 'assets/rooms/phone_little_table.png',tx: -0.80, ty:  5.17, w:  6,  h:  6,  solid: true, collider: { tx: 1.00, ty: 7.00, w: 2.38, h: 2.28 } },
  ],
};
