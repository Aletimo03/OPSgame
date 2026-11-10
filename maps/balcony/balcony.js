// maps/balcony/balcony.js
// The little balcony off the first-floor drying-racks hall (the cigarette
// chapter, js/story/stealth.js). Plain for now, until there's art for it.
import { makeRoom, setDoor } from '../../js/core/roomBuilder.js';

const grid = makeRoom(10, 7);
setDoor(grid, 0, 2, 2, true); // west door -> the racks hall

export default {
  key: 'balcony',
  name: 'Balconcino',
  theme: 'white',
  grid,
  spawns: {
    default: { tx: 2, ty: 2 },
  },
  warps: [{ tx: 0, ty: 2, w: 1, h: 2, to: 'first-floor', toSpawn: 'fromBalcony' }],
};
