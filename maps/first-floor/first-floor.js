// maps/first-floor/first-floor.js
// The real co-housing first floor (architectural plan, rotated 180°).
// Same framework as base-floor: enclosed rooms drawn on the grid, each entered
// through a hardcoded doorway (setDoor) that warps to its own empty room map
// under maps/first-floor-rooms/. living + cucina are walkable on this floor.
//
// Corridors are now ~7 tiles wide to match the base floor; the rooms were
// pushed outward to make room, so all the door/warp/spawn coords below were
// recomputed to sit on the new room/corridor boundaries.
//
// HOW TO EDIT:
//   • Room positions/sizes -> the `rooms` array (PLAN orientation; the builder
//     rotates 180°). Each gets an automatic 1-tile wall border.
//   • Doorways -> the hardcoded setDoor(grid, X, Y, 2[, vertical]) calls below,
//     in GRID coordinates. Horizontal wall = horizontal door; vertical wall =
//     pass `true` for a vertical door.
//   • Warps -> the `warps` array, one per door, pointing at a room map.
import { makeFloorPlan, rotRect } from '../../js/core/floorPlan.js';
import { setDoor } from '../../js/core/roomBuilder.js';
import { TILES } from '../../js/config.js';

const cols = 72;
const rows = 48;

// All corridors ~7 tiles wide (like the base floor). A long hall along the
// screen-bottom plus two full-height verticals down the sides; the verticals
// reach the bottom hall so the network stays connected (no central hall).
// (PLAN coords — the builder rotates 180°, so plan-left renders screen-right.)
const corridors = [
  { x: 8, y: 14, w: 57, h: 7 }, // bottom hall (screen) — left end meets the L-turn leg
  { x: 12, y: 14, w: 7, h: 25 }, // screen-right vertical (kitchen caps its top)
  { x: 58, y: 14, w: 7, h: 25 }, // screen-left vertical (grid rows8-39): room-25 caps the top, leg reaches room-21 at the bottom
];

// Every room except `living` + `cucina` is its own separate map: keep them
// `solid` so the corridor only shows the doorway (mimics the base-floor doors).
const rooms = [
  // top row (above the upper hall — unchanged)
  { label: 'room-15', x: 6, y: 2, w: 7, h: 12, solid: true },
  { label: 'room-16', x: 14, y: 2, w: 6, h: 12, solid: true },
  { label: 'room-17', x: 21, y: 2, w: 7, h: 12, solid: true },
  { label: 'room-18', x: 29, y: 2, w: 7, h: 12, solid: true },
  { label: 'bathroom', x: 35, y: 4, w: 7, h: 10, solid: true }, // grid cols30-36, rows34-43 (between rooms 18 & 19)
  { label: 'room-19', x: 42, y: 4, w: 7, h: 10, solid: true },
  { label: 'room-20', x: 49, y: 4, w: 7, h: 10, solid: true }, // shifted right (grid cols16-22)
  { label: 'room-21', x: 58, y: 7, w: 7, h: 7, solid: true }, // bottom of the L-corner, below the hall (grid cols7-13, rows34-40)
  { label: 'room-22', x: 65, y: 21, w: 6, h: 5, solid: true }, // left of vertical, just above the L-turn (grid cols1-6, rows22-26)
  // left wing (left of the left vertical)
  { label: 'room-14', x: 1, y: 21, w: 11, h: 8, solid: true },
  { label: 'room-13', x: 1, y: 30, w: 11, h: 8, solid: true },
  // kitchen: solid room capping the TOP of the screen-right vertical corridor
  { label: 'cucina', x: 10, y: 39, w: 11, h: 8, solid: true }, // grid cols51-61, rows1-8
  // centre + right cluster
  { label: 'living', x: 39, y: 21, w: 12, h: 10 },
  { label: 'room-23', x: 65, y: 27, w: 6, h: 6, solid: true }, // middle of left stack (grid cols1-6, rows15-20)
  { label: 'room-24', x: 65, y: 34, w: 6, h: 6, solid: true }, // TOP of left stack (grid cols1-6, rows8-13)
  // room-25 caps the very top of the screen-left vertical corridor.
  { label: 'room-25', x: 56, y: 39, w: 11, h: 8, solid: true }, // grid cols5-15, rows1-8 (caps corridor top at row9)
  // rooms 26 & 27 hang off the living's top-left corner (entered from inside).
  { label: 'room-26', x: 50, y: 23, w: 8, h: 8, solid: true }, // grid cols14-21, rows17-24 (left of living)
  { label: 'room-27', x: 42, y: 30, w: 9, h: 9, solid: true }, // grid cols21-29, rows9-17 (above living)
];

const { grid, rooms: C } = makeFloorPlan({ cols, rows, rooms, corridors });

// --- Doorways (GRID coords). Horizontal walls -> horizontal door; ------------
//     vertical walls -> setDoor(..., true).
// top rooms -> upper hall (horizontal) — unchanged (hall top edge didn't move)
setDoor(grid, 61, 34, 2); // room-15
setDoor(grid, 54, 34, 2); // room-16
setDoor(grid, 46, 34, 2); // room-17
setDoor(grid, 38, 34, 2); // room-18
setDoor(grid, 31, 34, 2); // shared bathroom & laundry (between rooms 18 & 19)
setDoor(grid, 25, 34, 2); // room-19
setDoor(grid, 19, 34, 2); // room-20 (shifted right)
setDoor(grid, 10, 34, 2); // room-21 (caps the bottom of the L-corner, into the hall)
// left wing -> left vertical (VERTICAL)
setDoor(grid, 60, 22, 2, true); // room-14
setDoor(grid, 60, 13, 2, true); // room-13
// kitchen door: horizontal, in its bottom wall, into the top of the corridor
setDoor(grid, 56, 8, 2); // cucina/kitchen
// right cluster -> right vertical (VERTICAL)
setDoor(grid, 6, 23, 2, true); // room-22 (bottom of left stack)
setDoor(grid, 6, 17, 2, true); // room-23 (middle of left stack)
setDoor(grid, 6, 10, 2, true); // room-24 (top of left stack)
// living's whole bottom side is open to the bottom hall (no wall, no door box).
for (let x = 22; x <= 31; x++) grid[26][x] = TILES.FLOOR; // living (walkable)
// room-25 caps the top of the left corridor (horizontal door in its floor wall)
setDoor(grid, 10, 8, 2); // room-25
// rooms 26 & 27 entered from inside the living (top-left corner)
setDoor(grid, 21, 18, 2, true); // room-26 (living's left wall)
setDoor(grid, 22, 17, 2); // room-27 (living's top wall)

// --- Staircase down to the base floor: attached to the TOP edge of the bottom
//     hall, between the living and the right vertical corridor (grid cols42-45)
const SC = rotRect(cols, rows, 19, 17, 10, 4);
// enter:'right' -> walkable only from the right; shadow falls on the left.
const stairs = { ...SC, enter: 'right', imageKey: 'stairs', image: 'assets/tilesets/stairs.png' };

export default {
  key: 'first-floor',
  name: 'First Floor',
  theme: 'white',
  grid,
  stairs,
  spawns: {
    default: { tx: 53, ty: 29 },
    fromStairs: { tx: 53, ty: 29 }, // up from the base floor (right foot of the stairs)
    // where you reappear after leaving each room
    fromRoom15: { tx: 61, ty: 33 }, fromRoom16: { tx: 54, ty: 33 },
    fromRoom17: { tx: 46, ty: 33 }, fromRoom18: { tx: 38, ty: 33 },
    fromRoom19: { tx: 25, ty: 33 }, fromRoom20: { tx: 19, ty: 33 },
    fromRoom21: { tx: 10, ty: 33 }, fromRoom22: { tx: 8, ty: 23 },
    fromRoom14: { tx: 58, ty: 23 }, fromRoom13: { tx: 58, ty: 13 },
    fromRoom23: { tx: 8, ty: 17 }, fromRoom24: { tx: 8, ty: 10 },
    fromRoom25: { tx: 10, ty: 9 }, fromRoom26: { tx: 23, ty: 19 },
    fromRoom27: { tx: 24, ty: 19 },
    fromKitchen: { tx: 56, ty: 10 },
    fromBathroom: { tx: 31, ty: 32 },
  },
  warps: [
    { tx: SC.tx, ty: SC.ty, w: 1, h: SC.h, to: 'base-floor', toSpawn: 'fromStairs' }, // last (leftmost) column = darkest shadow
    // top rooms (horizontal doorways)
    { tx: 61, ty: 34, w: 2, h: 1, to: 'room-15', toSpawn: 'default' },
    { tx: 54, ty: 34, w: 2, h: 1, to: 'room-16', toSpawn: 'default' },
    { tx: 46, ty: 34, w: 2, h: 1, to: 'room-17', toSpawn: 'default' },
    { tx: 38, ty: 34, w: 2, h: 1, to: 'room-18', toSpawn: 'default' },
    { tx: 31, ty: 34, w: 2, h: 1, to: 'first-floor-bathroom', toSpawn: 'default' },
    { tx: 25, ty: 34, w: 2, h: 1, to: 'room-19', toSpawn: 'default' },
    { tx: 19, ty: 34, w: 2, h: 1, to: 'room-20', toSpawn: 'default' },
    // room-21 caps the bottom of the L-leg
    { tx: 10, ty: 34, w: 2, h: 1, to: 'room-21', toSpawn: 'default' },
    // left wing (vertical doorways)
    { tx: 60, ty: 22, w: 1, h: 2, to: 'room-14', toSpawn: 'default' },
    { tx: 60, ty: 13, w: 1, h: 2, to: 'room-13', toSpawn: 'default' },
    // right cluster (vertical doorways)
    { tx: 6, ty: 23, w: 1, h: 2, to: 'room-22', toSpawn: 'default' },
    { tx: 6, ty: 17, w: 1, h: 2, to: 'room-23', toSpawn: 'default' },
    { tx: 6, ty: 10, w: 1, h: 2, to: 'room-24', toSpawn: 'default' },
    // kitchen (horizontal doorway at the top of the corridor)
    { tx: 56, ty: 8, w: 2, h: 1, to: 'first-floor-kitchen', toSpawn: 'default' },
    // room-25 caps the top of the left corridor; 26 & 27 open off the living
    { tx: 10, ty: 8, w: 2, h: 1, to: 'room-25', toSpawn: 'default' },
    { tx: 21, ty: 18, w: 1, h: 2, to: 'room-26', toSpawn: 'default' },
    { tx: 22, ty: 17, w: 2, h: 1, to: 'room-27', toSpawn: 'default' },
  ],
  // Drying racks in the square hall (the open `living`, interior x 22–31,
  // y 18–26), along its top wall and right side, away from the room-26/27 doors
  // in its top-left corner. Colliders = the rack feet only: you can walk behind
  // the rails (between them and the wall) and get hidden by them.
  props: [
    { furniture: 'hanger', dir: 's', tx: 25.6, ty: 18 },
    { furniture: 'hanger_zionick', dir: 's', tx: 28.8, ty: 18 },
    { furniture: 'hanger', dir: 's', tx: 28.8, ty: 21.4 },
  ],
  // NPCs are placed by each character's JSON `locations` (per chapter), not here.
  // For chapter-3: gaia + gatta + nima roam this floor (see their character.json).
};
