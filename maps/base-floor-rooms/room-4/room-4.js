// maps/base-floor-rooms/room-4/room-4.js
import { makeRoomSuite, bathroomFixtures } from '../../../js/core/roomBuilder.js';

// Bedroom (top) + anteroom (bottom-left, you enter from below) + bathroom
// (bottom-right, open doorway from the anteroom). See makeRoomSuite.
const suite = makeRoomSuite(17, 16);
const { grid } = suite;

export default {
  key: 'room-4',
  name: 'Room 4',
  theme: 'white',
  grid,
  areas: suite.areas, // bedroom / anteroom / bathroom… (story-check: each reachable)
  spawns: {
    default: { ...suite.spawn },
    fromBaseFloor: { ...suite.spawn },
  },
  warps: [{ ...suite.door, to: 'base-floor', toSpawn: 'fromRoom4' }],
  props: [
    ...bathroomFixtures(suite.areas.bathroom), // shower, sink, toilet
    { furniture: 'armadio', dir: 'e', tx: 0.99, ty: suite.areas.anteroom.y0 - 0.5 }, // anteroom, against its left wall
    { furniture: 'bed', dir: 's', tx: -2.40, ty: -3.00 },
    { furniture: 'fruit_table', dir: 's', tx: 6.41, ty: 0.67, side: 'avocado' },
    { furniture: 'phone_little_table', dir: 's', tx: -0.80, ty: 5.17 },
  ],
};
