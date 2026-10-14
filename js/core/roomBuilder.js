// js/core/roomBuilder.js
// Tiny helpers for authoring map `grid` arrays in code (Phase 1 authoring).
// A grid is a 2D array of TILES codes: grid[y][x].

import { TILES, DOOR_WIDTH } from '../config.js';

// A rectangular room: solid wall border, floor inside.
export function makeRoom(cols, rows) {
  const g = [];
  for (let y = 0; y < rows; y++) {
    g[y] = [];
    for (let x = 0; x < cols; x++) {
      const edge = x === 0 || y === 0 || x === cols - 1 || y === rows - 1;
      g[y][x] = edge ? TILES.WALL : TILES.FLOOR;
    }
  }
  return g;
}

// The U-shaped co-housing main hall: two vertical wings + a long base.
// `bump` (optional) carves a square space that pushes UP from the centre of
// the base into the U's open middle — e.g. { w: 12, h: 6 }.
export function makeUShape({ border = 3, intW = 48, intH = 16, wingW = 8, baseH = 7, bump = null } = {}) {
  const gw = intW + border * 2;
  const gh = intH + border * 2;
  const g = [];
  for (let y = 0; y < gh; y++) g[y] = new Array(gw).fill(TILES.WALL);

  for (let iy = 0; iy < intH; iy++) {
    for (let ix = 0; ix < intW; ix++) {
      const wing = ix < wingW || ix >= intW - wingW;
      const base = iy >= intH - baseH;
      if (wing || base) g[border + iy][border + ix] = TILES.FLOOR;
    }
  }

  // Central square space rising from the top of the base into the middle.
  // bump.dx shifts it horizontally (negative = left of centre).
  if (bump) {
    const baseTop = intH - baseH; // first base interior row
    const startIx = Math.floor((intW - bump.w) / 2) + (bump.dx || 0);
    for (let iy = baseTop - bump.h; iy < baseTop; iy++) {
      if (iy < 0) continue;
      for (let ix = startIx; ix < startIx + bump.w; ix++) {
        if (ix >= 0 && ix < intW) g[border + iy][border + ix] = TILES.FLOOR;
      }
    }
  }
  return g;
}

// Carve a door (warp opening) `w` tiles long, starting at (tx, ty).
// Horizontal by default (extends right); pass vertical=true for a door in a
// vertical wall (extends down). Default DOOR_WIDTH. Returns the start coords.
export function setDoor(grid, tx, ty, w = DOOR_WIDTH, vertical = false) {
  for (let i = 0; i < w; i++) {
    const x = vertical ? tx : tx + i;
    const y = vertical ? ty + i : ty;
    if (grid[y] && grid[y][x] !== undefined) grid[y][x] = TILES.DOOR;
  }
  return { tx, ty };
}

export function gridCols(grid) {
  return grid[0].length;
}
export function gridRows(grid) {
  return grid.length;
}

// A bedroom "suite": the bedroom is a cols×rows box (as before); below it a
// strip with the SAME width and HALF the height, split in two by a wall:
//   • left  = anteroom: the entrance door is in its bottom wall (you come in
//             from below) and an open doorway in its top wall leads into the
//             bedroom;
//   • right = bathroom: reached through an open doorway in the dividing wall.
// The openings are plain floor (no warp); only the entrance is a DOOR tile.
// Returns { grid, door, spawn, areas } — door/spawn in grid tiles, areas are
// the interior boxes { x0, y0, x1, y1 } (inclusive) of each part.
export function makeRoomSuite(cols, rows) {
  const total = rows + Math.round(rows / 2); // bedroom + strip (shared wall row)
  const g = makeRoom(cols, total);
  const top = rows - 1;                      // wall between bedroom and strip
  const split = Math.floor(cols / 2);        // wall between anteroom and bathroom
  for (let x = 0; x < cols; x++) g[top][x] = TILES.WALL;
  for (let y = top; y < total; y++) g[y][split] = TILES.WALL;

  const ante = { x0: 1, y0: top + 1, x1: split - 1, y1: total - 2 };
  const bath = { x0: split + 1, y0: top + 1, x1: cols - 2, y1: total - 2 };
  const bed = { x0: 1, y0: 1, x1: cols - 2, y1: top - 1 };
  // Entrance + bedroom doorway, centred on the anteroom's width.
  const doorX = ante.x0 + Math.floor((ante.x1 - ante.x0 + 1 - DOOR_WIDTH) / 2);
  for (let i = 0; i < DOOR_WIDTH; i++) g[top][doorX + i] = TILES.FLOOR;
  // Bathroom doorway, centred on the strip's height.
  const doorY = ante.y0 + Math.floor((ante.y1 - ante.y0 + 1 - DOOR_WIDTH) / 2);
  for (let i = 0; i < DOOR_WIDTH; i++) g[doorY + i][split] = TILES.FLOOR;
  setDoor(g, doorX, total - 1);

  return {
    grid: g,
    door: { tx: doorX, ty: total - 1 },
    // 2 rows above the door: the feet (~1.4 tiles below the sprite centre)
    // must clear the bottom wall.
    spawn: { tx: doorX, ty: total - 3 },
    areas: { bedroom: bed, anteroom: ante, bathroom: bath },
  };
}

// A DOUBLE room (room-10, room-22). You come in from below into a corridor on
// the left; going up it you pass, on the right, bedroom A, then the bathroom,
// and at the top it opens into bedroom B, which spans the whole width:
//
//   ###################
//   #  bedroom B      #     B: interior 17×10
//   #..##############     ← doorway up into B (corridor x 1–2)
//   #...#             #
//   #... bathroom     #     bathroom: interior 13×5, doorway from the corridor
//   #...#             #
//   #...# bedroom A   #     A: interior 13×11, doorway from the corridor
//   #...              #
//   ##DD###############     ← entrance from below
//
// Bedrooms are a bit smaller than a single suite's (15×14). Returns
// { grid, door, spawn, areas, origins } — origins.a / origins.b = the wall
// corner of each bedroom, to offset furniture written for a single room's
// (0,0) corner.
export function makeDoubleSuite() {
  const cols = 19;
  const rows = 30;
  const g = makeRoom(cols, rows);
  const W = TILES.WALL;
  const F = TILES.FLOOR;
  const cx1 = 3;         // corridor interior x 1..3
  const wallX = cx1 + 1; // corridor / rooms wall (x 4)
  const bBottom = 11;    // wall under bedroom B
  const bathBottom = 17; // wall between bathroom and bedroom A
  for (let x = 0; x < cols; x++) { g[bBottom][x] = W; g[bathBottom][x] = W; }
  for (let y = bBottom; y < rows; y++) g[y][wallX] = W;
  // corridor floor between the walls we just drew
  for (let y = bBottom + 1; y < rows - 1; y++) for (let x = 1; x <= cx1; x++) g[y][x] = F;
  g[bathBottom][1] = F; g[bathBottom][2] = F; g[bathBottom][3] = F;

  const corridor = { x0: 1, y0: bBottom + 1, x1: cx1, y1: rows - 2 };
  const bedB = { x0: 1, y0: 1, x1: cols - 2, y1: bBottom - 1 };
  const bath = { x0: wallX + 1, y0: bBottom + 1, x1: cols - 2, y1: bathBottom - 1 };
  const bedA = { x0: wallX + 1, y0: bathBottom + 1, x1: cols - 2, y1: rows - 2 };
  // Doorways (plain floor): up into B, and from the corridor into the
  // bathroom (middle) and into A (its bottom rows, clear of the furniture).
  for (let i = 0; i < DOOR_WIDTH; i++) {
    g[bBottom][1 + i] = F;
    g[bath.y0 + 1 + i][wallX] = F;
    g[bedA.y1 - 1 + i][wallX] = F;
  }
  const doorX = 1;
  setDoor(g, doorX, rows - 1);
  return {
    grid: g,
    door: { tx: doorX, ty: rows - 1 },
    spawn: { tx: doorX, ty: rows - 3 }, // feet clear the bottom wall
    areas: { corridor, bedroomA: bedA, bathroom: bath, bedroomB: bedB },
    origins: { a: { ox: wallX, oy: bathBottom }, b: { ox: 0, oy: 0 } },
  };
}
