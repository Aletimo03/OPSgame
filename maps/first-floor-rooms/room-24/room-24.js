// maps/first-floor-rooms/room-24/room-24.js
import { makeRoomSuite } from '../../../js/core/roomBuilder.js';

// Bedroom (top) + anteroom (bottom-left, you enter from below) + bathroom
// (bottom-right, open doorway from the anteroom). See makeRoomSuite.
const suite = makeRoomSuite(17, 16);
const { grid } = suite;

export default {
  key: 'room-24',
  name: 'Room 24',
  theme: 'white',
  grid,
  areas: suite.areas, // bedroom / anteroom / bathroom… (story-check: each reachable)
  spawns: {
    default: { ...suite.spawn },
    fromFirstFloor: { ...suite.spawn },
  },
  warps: [{ ...suite.door, to: 'first-floor', toSpawn: 'fromRoom24' }],
  props: [
    { furniture: 'armadio', dir: 'e', tx: 0.99, ty: 15.5 }, // anteroom, against its left wall
    { furniture: 'bed', dir: 's', tx: -2.40, ty: -3.00 },
    { furniture: 'fruit_table', dir: 's', tx: 6.41, ty: 0.67 },
    { furniture: 'phone_little_table', dir: 's', tx: -0.80, ty: 5.17 },
  ],
};
