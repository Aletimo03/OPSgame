// maps/base-kitchen/base-kitchen.js
import { makeRoom, setDoor } from '../../js/core/roomBuilder.js';

const grid = makeRoom(30, 17);
setDoor(grid, 2, 16); // south door -> base floor

export default {
  key: 'base-kitchen',
  name: 'Base Floor — Kitchen',
  theme: 'white',
  grid,
  spawns: {
    default: { tx: 2, ty: 14 },
    fromBaseFloor: { tx: 2, ty: 14 },
  },
  warps: [{ tx: 2, ty: 16, to: 'base-floor', toSpawn: 'fromKitchen' }],
  props: [
    {
      key: 'main_table',
      path: 'assets/kitchens/main_table.png',
      tx: 14, ty: 9,
      w: 15, h: 7,
      solid: true,
      collider: { tx: 19.78, ty: 9.45, w: 6.57, h: 4.83 },
    },
  ],
  // Chapter 1: ema/sara/nima are placed here by their JSON `locations.chapter-1`.
};
