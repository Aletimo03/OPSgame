// js/core/floorPlan.js
// Build an irregular multi-room floor.
//   - corridors: full floor rectangles (the walkable hallways)
//   - rooms:     ENCLOSED — only their interior is floor, a 1-tile wall border
//                stays, so you enter through a doorway
//   - doors:     small floor rectangles that punch an opening through a room's
//                wall into the adjacent corridor
// The whole plan is rotated 180° so a layout transcribed straight from a
// top-down architectural drawing comes out matching our orientation.

import { TILES } from '../config.js';

const rotXY = (cols, rows, x, y, w, h, on) => (on ? { x: cols - x - w, y: rows - y - h } : { x, y });

// image-space rect -> grid rect (for stairs / warps authored in plan coords)
export const rotRect = (cols, rows, x, y, w, h) => ({ tx: cols - x - w, ty: rows - y - h, w, h });
// image-space point -> grid point
export const rotPoint = (cols, rows, x, y) => ({ tx: cols - 1 - x, ty: rows - 1 - y });

export function makeFloorPlan({ cols, rows, rooms = [], corridors = [], doors = [], rotate180 = true }) {
  const grid = Array.from({ length: rows }, () => new Array(cols).fill(TILES.WALL));
  const labels = [];
  const centers = {};

  const fill = (x, y, w, h) => {
    for (let iy = y; iy < y + h; iy++)
      for (let ix = x; ix < x + w; ix++)
        if (grid[iy] && grid[iy][ix] !== undefined) grid[iy][ix] = TILES.FLOOR;
  };

  // 1. Corridors first (full floor).
  for (const c of corridors) {
    const p = rotXY(cols, rows, c.x, c.y, c.w, c.h, rotate180);
    fill(p.x, p.y, c.w, c.h);
  }

  // 2. Rooms: interior floor only, leaving the 1-tile border as wall.
  //    `solid` rooms stay fully wall (their interior never gets carved), so the
  //    only visible thing from the corridor is the doorway — like the base floor.
  for (const r of rooms) {
    const p = rotXY(cols, rows, r.x, r.y, r.w, r.h, rotate180);
    if (!r.solid) fill(p.x + 1, p.y + 1, r.w - 2, r.h - 2);
    const cx = p.x + r.w / 2;
    const cy = p.y + r.h / 2;
    labels.push({ text: r.label, tx: cx, ty: cy });
    centers[r.label] = { tx: Math.round(cx - 0.5), ty: Math.round(cy - 0.5) };
  }

  // 3. Doors: punch openings through borders into corridors.
  for (const d of doors) {
    const p = rotXY(cols, rows, d.x, d.y, d.w, d.h, rotate180);
    fill(p.x, p.y, d.w, d.h);
  }

  return { grid, labels, rooms: centers };
}
