// maps/base-floor/base-floor.js
// The base floor now shares the FIRST FLOOR's shape exactly (same corridors +
// living, same pixels) — see maps/first-floor/first-floor.js for the layout
// rationale. The 12 enclosed rooms (room-1..room-12) sit in the same grid slots
// as the first floor's rooms, renumbered in reading order ending at the living.
//
// (PLAN coords — the builder rotates 180°, so plan-left renders screen-right.)
import { makeFloorPlan, rotRect } from '../../js/core/floorPlan.js';
import { setDoor } from '../../js/core/roomBuilder.js';
import { TILES } from '../../js/config.js';

const cols = 72;
const rows = 48;

// Corridors — identical to the first floor: bottom hall + two verticals (a U)
// whose tops are capped by rooms; living hangs in the middle.
const corridors = [
  { x: 8, y: 14, w: 57, h: 7 }, // bottom hall (screen)
  { x: 12, y: 14, w: 7, h: 25 }, // screen-right vertical (room-2 caps its top)
  { x: 58, y: 14, w: 7, h: 25 }, // screen-left vertical (room-1 caps its top)
];

// Every room except `living` is its own separate map: keep them `solid` so the
// corridor only shows the doorway. Slots mirror the first floor.
const rooms = [
  // --- vertical-top caps ----------------------------------------------------
  { label: 'room-11', x: 56, y: 39, w: 11, h: 8, solid: true }, // caps screen-left vertical (grid cols5-15, rows1-8)
  { label: 'cucina', x: 10, y: 39, w: 11, h: 8, solid: true }, // KITCHEN — caps screen-right vertical (grid cols51-61, rows1-8)
  // --- right side: room-1 stacked over room-2 (where room-11 used to be) -----
  { label: 'room-1', x: 1, y: 30, w: 11, h: 8, solid: true }, // right of screen-right vertical, upper (grid cols60-70, rows10-17)
  { label: 'room-2', x: 1, y: 21, w: 11, h: 8, solid: true }, // right of screen-right vertical, lower (grid cols60-70, rows19-26)
  // --- bottom-hall row: room-3 far RIGHT, numbers increase leftward to 10 ---
  { label: 'room-3', x: 6, y: 2, w: 7, h: 12, solid: true }, // grid cols58-64 (far right)
  { label: 'room-4', x: 14, y: 2, w: 6, h: 12, solid: true }, // grid cols52-57
  { label: 'room-5', x: 21, y: 2, w: 7, h: 12, solid: true }, // grid cols44-50
  { label: 'room-6', x: 29, y: 2, w: 7, h: 12, solid: true }, // grid cols36-42
  { label: 'room-7', x: 35, y: 4, w: 7, h: 10, solid: true }, // grid cols30-36
  { label: 'room-8', x: 42, y: 4, w: 7, h: 10, solid: true }, // grid cols23-29
  { label: 'room-9', x: 49, y: 4, w: 7, h: 10, solid: true }, // grid cols16-22
  { label: 'room-10', x: 56, y: 4, w: 7, h: 10, solid: true }, // grid cols9-15 (far left end)
  // --- laundry: left of the left vertical (where room-10 used to sit) -------
  { label: 'laundry', x: 65, y: 27, w: 6, h: 6, solid: true }, // grid cols1-6, rows15-20
  // --- living + its single room ---------------------------------------------
  { label: 'living', x: 39, y: 21, w: 12, h: 10 }, // walkable (grid cols21-32, rows17-26)
  { label: 'room-12', x: 42, y: 30, w: 9, h: 9, solid: true }, // above the living, door on its top-left (grid cols21-29, rows9-17)
];

const { grid, rooms: C } = makeFloorPlan({ cols, rows, rooms, corridors });

// --- Doorways (GRID coords) --------------------------------------------------
// vertical-top caps (horizontal door in the room's bottom wall, into the corridor top)
setDoor(grid, 10, 8, 2); // room-11 (caps left vertical)
setDoor(grid, 56, 8, 2); // cucina/kitchen (caps right vertical)
// right side: room-1 stacked over room-2 (vertical doors into the right vertical)
setDoor(grid, 60, 13, 2, true); // room-1 (upper)
setDoor(grid, 60, 22, 2, true); // room-2 (lower)
// bottom-hall rooms (horizontal doors): room-3 far right -> room-10 far left
setDoor(grid, 61, 34, 2); // room-3 (far right)
setDoor(grid, 54, 34, 2); // room-4
setDoor(grid, 46, 34, 2); // room-5
setDoor(grid, 38, 34, 2); // room-6
setDoor(grid, 31, 34, 2); // room-7
setDoor(grid, 25, 34, 2); // room-8
setDoor(grid, 19, 34, 2); // room-9
setDoor(grid, 19, 26, 2); // trashbin-room — north wall of corridor, directly opposite room-9
setDoor(grid, 11, 34, 2); // room-10 (far left)
// laundry (vertical door into the left vertical, where room-10 used to be)
setDoor(grid, 6, 17, 2, true); // laundry
// room-12 entered from inside the living (door on the living's TOP-left corner)
setDoor(grid, 22, 17, 2); // room-12
// living's whole bottom side is open to the bottom hall (no wall, no door box).
for (let x = 22; x <= 31; x++) grid[26][x] = TILES.FLOOR; // living (walkable)
// entrance: doorway on the living's RIGHT wall, bottom-right corner
setDoor(grid, 32, 24, 2, true); // -> entrance

// --- Staircase UP to the first floor: top edge of the bottom hall ------------
const SC = rotRect(cols, rows, 19, 17, 10, 4); // grid cols38-45, rows27-30
// enter:'left' -> walkable only from the left; shadow falls on the right.
const stairs = { ...SC, enter: 'left', imageKey: 'stairs', image: 'assets/tilesets/stairs.png' };

export default {
  key: 'base-floor',
  name: 'Base Floor — Main Hall',
  theme: 'white',
  grid,
  stairs,
  spawns: {
    default: { tx: 42, ty: 29 },
    fromStairs: { tx: 42, ty: 29 }, // back down from the first floor (left foot of the stairs)
    fromEntrance: { tx: 31, ty: 24 },
    living: { tx: 26, ty: 21 }, // middle of the living room — respawn after a lost battle
    fromKitchen: { tx: 56, ty: 10 }, // back from the base kitchen
    // where you reappear after leaving each room
    fromRoom1: { tx: 58, ty: 13 }, fromRoom2: { tx: 58, ty: 22 },
    fromRoom3: { tx: 61, ty: 33 }, fromRoom4: { tx: 54, ty: 33 },
    fromRoom5: { tx: 46, ty: 33 }, fromRoom6: { tx: 38, ty: 33 },
    fromRoom7: { tx: 31, ty: 33 }, fromRoom8: { tx: 25, ty: 33 },
    fromRoom9: { tx: 19, ty: 33 }, fromRoom10: { tx: 11, ty: 33 },
    fromTrash: { tx: 19, ty: 27 },
    fromRoom11: { tx: 10, ty: 9 }, fromRoom12: { tx: 23, ty: 19 },
    fromLaundry: { tx: 8, ty: 17 },
  },
  warps: [
    // central staircase -> first floor
    { tx: SC.tx + SC.w - 1, ty: SC.ty, w: 1, h: SC.h, to: 'first-floor', toSpawn: 'fromStairs' }, // last (rightmost) column = darkest shadow
    // entrance (living's right wall, bottom-right corner)
    { tx: 32, ty: 24, w: 1, h: 2, to: 'entrance', toSpawn: 'fromBaseFloor' },
    // vertical-top caps
    { tx: 10, ty: 8, w: 2, h: 1, to: 'room-11', toSpawn: 'default' },
    { tx: 56, ty: 8, w: 2, h: 1, to: 'base-kitchen', toSpawn: 'fromBaseFloor' },
    // right side: room-1 over room-2
    { tx: 60, ty: 13, w: 1, h: 2, to: 'room-1', toSpawn: 'default' },
    { tx: 60, ty: 22, w: 1, h: 2, to: 'room-2', toSpawn: 'default' },
    // bottom-hall rooms: room-3 far right -> room-10 far left
    { tx: 61, ty: 34, w: 2, h: 1, to: 'room-3', toSpawn: 'default' },
    { tx: 54, ty: 34, w: 2, h: 1, to: 'room-4', toSpawn: 'default' },
    { tx: 46, ty: 34, w: 2, h: 1, to: 'room-5', toSpawn: 'default' },
    { tx: 38, ty: 34, w: 2, h: 1, to: 'room-6', toSpawn: 'default' },
    { tx: 31, ty: 34, w: 2, h: 1, to: 'room-7', toSpawn: 'default' },
    { tx: 25, ty: 34, w: 2, h: 1, to: 'room-8', toSpawn: 'default' },
    { tx: 19, ty: 34, w: 2, h: 1, to: 'room-9', toSpawn: 'default' },
    { tx: 19, ty: 26, w: 2, h: 1, to: 'trashbin-room', toSpawn: 'fromBaseFloor' },
    { tx: 11, ty: 34, w: 2, h: 1, to: 'room-10', toSpawn: 'default' },
    // laundry (where room-10 used to sit)
    { tx: 6, ty: 17, w: 1, h: 2, to: 'laundry-room', toSpawn: 'fromBaseFloor' },
    // living's room
    { tx: 22, ty: 17, w: 2, h: 1, to: 'room-12', toSpawn: 'default' },
  ],
  // The living room (interior x 22–31, y 18–26): a sofa seen from behind, in
  // the middle and a bit low, so the defeat respawn (living, 26,21) stays free
  // and lands on its seat side ("si risveglia sul divano del salotto").
  props: [
    { furniture: 'divano', dir: 'n', tx: 24.49, ty: 22.5 },
  ],
  // NPCs are placed by each character's JSON `locations` (per chapter), not here.
  // For this map/chapter: ana, mari (ch1–2) and gabbo (ch2 battle) sit in the living.
};
