// maps/base-floor-rooms/room-10/room-10.js
// DOUBLE room: corridor on the left (you enter from below), bedroom A on its
// right, then the bathroom, then bedroom B across the top. See makeDoubleSuite.
import { makeDoubleSuite, bathroomFixtures } from '../../../js/core/roomBuilder.js';

const suite = makeDoubleSuite();
const { grid, origins } = suite;
// Same furniture as a single room, shifted to each bedroom's corner.
const at = (o, p) => ({ ...p, tx: p.tx + o.ox, ty: p.ty + o.oy });
const bedroom = (o) => [
  at(o, { furniture: 'bed', dir: 's', tx: -2.40, ty: -3.00 }),
  at(o, { furniture: 'fruit_table', dir: 's', tx: 6.41, ty: 0.67 }),
  at(o, { furniture: 'phone_little_table', dir: 's', tx: -0.80, ty: 5.17 }),
];

export default {
  key: 'room-10',
  name: 'Room 10 — doppia',
  theme: 'white',
  grid,
  areas: suite.areas, // bedroom / anteroom / bathroom… (story-check: each reachable)
  spawns: {
    default: { ...suite.spawn },
    fromBaseFloor: { ...suite.spawn },
  },
  warps: [{ ...suite.door, to: 'base-floor', toSpawn: 'fromRoom10' }],
  props: [...bedroom(origins.b), ...bedroom(origins.a), ...bathroomFixtures(suite.areas.bathroom)],
};
