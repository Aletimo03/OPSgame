// maps/base-kitchen/base-kitchen.js
import { makeRoom, setDoor } from '../../js/core/roomBuilder.js';

const grid = makeRoom(30, 17);
setDoor(grid, 26, 0); // door top-right (north wall) -> base floor; you arrive just below it

export default {
  key: 'base-kitchen',
  name: 'Base Floor — Kitchen',
  theme: 'white',
  grid,
  spawns: {
    default: { tx: 26, ty: 2 },
    fromBaseFloor: { tx: 26, ty: 2 }, // just inside the top-right door
  },
  warps: [{ tx: 26, ty: 0, to: 'base-floor', toSpawn: 'fromKitchen' }],
  // Furniture from the catalogue (js/core/furniture-catalog.js): each entry only
  // sets where the image's top-left goes; size, colliders, seats and depth line
  // live in the catalogue.
  // Where NPCs placed in this kitchen start (in turn), spread around the room.
  npcSpots: [{ tx: 4, ty: 11 }, { tx: 17, ty: 9 }, { tx: 11, ty: 9 }, { tx: 21, ty: 4 }, { tx: 10, ty: 13 }, { tx: 27, ty: 14 }, { tx: 6, ty: 14 }, { tx: 12, ty: 14 }],
  props: [
    // wall of cabinets along the top wall, top-left (door is top-right). Relative to
    // the image's natural size: 2x longer, 1.1x taller. Its top deliberately pokes
    // above the map edge. Collider = the whole unit (stand at its counter).
    { furniture: 'kitchen_shelfs', dir: 's', tx: 0.89, ty: -2.89, side: 'noodles', hidden: { kind: 'sock', id: 'cucina-terra-pensili' } },
    // 4 recycling bins in a column against the left wall, upper part, just below
    // the shelves. Collider = all of them.
    { furniture: 'trashbins', dir: 's', tx: -0.41, ty: 2.91, clue: 'buccia' },
    // island in the middle (new art, 3 stools). Collider = the band from 1 tile below
    // the slab's top edge to 1 tile below its bottom edge: you can step 1 tile
    // "behind" the slab (it then hides your legs) and still reach every stool.
    { furniture: 'island', dir: 's', tx: 5.54, ty: 3.37 },
    // main table, lower half near the right corner. Collider = the wooden top
    // only, so all 8 chairs are walkable; each chair is a seat. ysort: false =
    // characters always draw on top of it (user's choice).
    { furniture: 'main_table', dir: 's', tx: 13, ty: 9.5 },
    // sofas (user's layout): a vertical one against the right wall, centred on
    // it and 1.5 tiles lower; a horizontal one between the island and it, 2 tiles
    // lower than the island. Colliders = back + armrests only, so every seat
    // cushion is walkable and sittable. `baseY` = the depth line at the back
    // (horizontal: backrest bottom; vertical: where the seats start), so a
    // seated character is drawn IN FRONT of the sofa, not hidden by it.
    { furniture: 'sofa', dir: 'w', tx: 24, ty: 6.22 },
    { furniture: 'sofa', dir: 's', tx: 17.72, ty: 5.82 },
  ],
  // Chapter 1: ema/sara/nima are placed here by their JSON `locations.chapter-1`.
};
