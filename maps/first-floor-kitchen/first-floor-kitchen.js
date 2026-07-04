// maps/first-floor-kitchen/first-floor-kitchen.js
// Chapter 3 location: Alessio gives Trenbolone, Sara gives Palle a terra.
import { makeRoom, setDoor } from '../../js/core/roomBuilder.js';

const grid = makeRoom(30, 17);
setDoor(grid, 2, 16); // south door -> first floor

export default {
  key: 'first-floor-kitchen',
  name: 'First Floor — Kitchen',
  theme: 'white',
  grid,
  spawns: {
    default: { tx: 2, ty: 14},
    fromFirstFloor: { tx: 2, ty: 14 },
  },
  warps: [{ tx: 2, ty: 16, to: 'first-floor', toSpawn: 'fromKitchen' }],
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
  // Chapter 3: Timo (a.k.a. Alessio → Trenbolone) and Sara (→ Palle a terra) are
  // placed here by their JSON `locations.chapter-3`.
};
