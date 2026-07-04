// maps/first-floor-bathroom/first-floor-bathroom.js
// The shared bathroom on the first floor. Empty for now (like the other rooms).
import { makeRoom, setDoor } from '../../js/core/roomBuilder.js';

const grid = makeRoom(11, 8);
setDoor(grid, 5, 7); // south door -> first floor

export default {
  key: 'first-floor-bathroom',
  name: 'First Floor — Shared Bathroom',
  theme: 'white',
  grid,
  spawns: {
    default: { tx: 5, ty: 5 },
    fromFirstFloor: { tx: 5, ty: 5 },
  },
  warps: [{ tx: 5, ty: 7, to: 'first-floor', toSpawn: 'fromBathroom' }],
};
