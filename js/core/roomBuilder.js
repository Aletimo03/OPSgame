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
