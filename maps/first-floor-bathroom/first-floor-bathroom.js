// maps/first-floor-bathroom/first-floor-bathroom.js
// The shared bathroom & laundry on the first floor. You come in from the top
// (the hub door is in the corridor ABOVE this room), through a door in the
// top-right of the north wall; the washing machine stands against the top wall,
// in the middle.
import { makeRoom, setDoor } from '../../js/core/roomBuilder.js';

const grid = makeRoom(11, 8);
setDoor(grid, 8, 0); // north door, top-right -> first floor

export default {
  key: 'first-floor-bathroom',
  name: 'First Floor — Shared Bathroom & Laundry',
  theme: 'white',
  grid,
  spawns: {
    default: { tx: 8, ty: 1 },
    fromFirstFloor: { tx: 8, ty: 1 }, // just inside the top-right door
  },
  warps: [{ tx: 8, ty: 0, to: 'first-floor', toSpawn: 'fromBathroom' }],
  props: [
    // washing machine, top wall, centred on the room (interior x 1–10 → centre 5.5)
    { furniture: 'laundry', dir: 's', tx: 4.62, ty: 0.55 },
  ],
};
