// maps/first-floor-rooms/room-13/room-13.js
import { makeRoomSuite, bathroomFixtures } from '../../../js/core/roomBuilder.js';

// Bedroom (top) + anteroom (bottom-left, you enter from below) + bathroom
// (bottom-right, open doorway from the anteroom). See makeRoomSuite.
const suite = makeRoomSuite(17, 16);
const { grid } = suite;

export default {
  key: 'room-13',
  name: 'Room 13',
  theme: 'white',
  grid,
  areas: suite.areas, // bedroom / anteroom / bathroom… (story-check: each reachable)
  spawns: {
    default: { ...suite.spawn },
    fromFirstFloor: { ...suite.spawn },
  },
  warps: [{ ...suite.door, to: 'first-floor', toSpawn: 'fromRoom13' }],
  props: [
    ...bathroomFixtures(suite.areas.bathroom), // shower, sink, toilet
    { furniture: 'armadio', dir: 'e', tx: 0.99, ty: suite.areas.anteroom.y0 - 0.5 }, // anteroom, against its left wall
    { furniture: 'bed', dir: 's', tx: -2.40, ty: -3.00 },
    { furniture: 'fruit_table', dir: 's', tx: 6.41, ty: 0.67 },
    { furniture: 'phone_little_table', dir: 's', tx: -0.80, ty: 5.17 },
  ],
  // Caue is placed here by his JSON `locations.chapter-3` (assets/characters/caue).
};
