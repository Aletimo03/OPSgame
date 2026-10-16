// js/core/MapRenderer.js
// Renders a map `grid` and builds its wall colliders. Decoupled from any
// specific map so every area in maps/ is drawn the same way.

import { TILE, TILES } from '../config.js';
import { THEMES } from './themes.js';

function wallTouchesFloor(grid, x, y) {
  if (grid[y][x] !== TILES.WALL) return false;
  const h = grid.length;
  const w = grid[0].length;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      if (grid[ny][nx] === TILES.FLOOR) return true; // floor only: doors sit IN the wall line, so walls stay straight around them
    }
  }
  return false;
}

// White wall, 3/4 look (themes with `wallStyle`).
//  • A wall with FLOOR right below it (not a door) shows its FRONT: white face,
//    a darker band at the top, a skirting board at the bottom.
//  • Front walls rise `wallRise` tiles upward over the wall / outside area
//    above them (never over a floor), so outer walls look taller. A door in
//    such a wall gets the same rise as a lintel above it, so the wall runs on.
//  • Every horizontal run of front walls / lintels rises to ONE height (the
//    run's minimum), so its top edge is straight; a corner tile at the end of
//    a run rises with it (if it can), so corners stay square.
//  • Every side touching floor gets a thin edge line.
const isOpen = (grid, x, y) => grid[y] && grid[y][x] !== undefined && grid[y][x] !== TILES.WALL;
const isFloorAt = (grid, x, y) => grid[y]?.[x] === TILES.FLOOR;

// How far (tiles) the space above (x, y) is free to draw on: up to `rise`,
// stopping at the first open tile above.
function freeAbove(grid, x, y, rise) {
  let free = 0;
  for (let k = 1; k <= Math.ceil(rise); k++) {
    if (isOpen(grid, x, y - k)) break;
    free = k;
  }
  return Math.min(free, rise);
}

// rise[y][x] in px for every tile that rises (front walls, lintels, corners).
function computeRise(grid, rise) {
  const rows = grid.length;
  const cols = grid[0].length;
  const out = Array.from({ length: rows }, () => new Array(cols).fill(0));
  const rises = (x, y) => isFloorAt(grid, x, y + 1)
    && (grid[y][x] === TILES.WALL || grid[y][x] === TILES.DOOR);
  for (let y = 0; y < rows; y++) {
    let x = 0;
    while (x < cols) {
      if (!rises(x, y)) { x++; continue; }
      let e = x;
      let min = Infinity;
      while (e < cols && rises(e, y)) { min = Math.min(min, freeAbove(grid, e, y, rise)); e++; }
      for (let k = x; k < e; k++) out[y][k] = min * TILE;
      // square corners: the wall tiles just outside the run
      for (const cx of [x - 1, e]) {
        if (grid[y][cx] === TILES.WALL && !isFloorAt(grid, cx, y + 1)) {
          out[y][cx] = Math.max(out[y][cx], Math.min(freeAbove(grid, cx, y, rise), min) * TILE);
        }
      }
      x = e;
    }
  }
  return out;
}

function drawWhiteWall(g, grid, x, y, px, py, t, riseMap) {
  const front = isFloorAt(grid, x, y + 1);
  const up = riseMap[y][x];
  if (front || up > 0) {
    const top = py - up;
    g.fillStyle(front ? t.wallFace : t.wall, 1).fillRect(px, top, TILE, TILE + up);
    g.fillStyle(t.wallTop, 1).fillRect(px, top, TILE, 6);
    if (front) g.fillStyle(t.wallBase, 1).fillRect(px, py + TILE - 7, TILE, 7);
    g.fillStyle(t.wallEdge, 1).fillRect(px, top, TILE, 2); // top edge of the tall wall
  }
  g.fillStyle(t.wallEdge, 1); // edges only against real floor (not doors)
  if (front) g.fillRect(px, py + TILE - 2, TILE, 2);
  if (isFloorAt(grid, x, y - 1)) g.fillRect(px, py, TILE, 2);
  if (isFloorAt(grid, x - 1, y)) g.fillRect(px, py, 2, TILE);
  if (isFloorAt(grid, x + 1, y)) g.fillRect(px + TILE - 2, py, 2, TILE);
}

// Lintel: the tall wall continuing above a door in a front wall.
function drawLintel(g, x, y, px, py, t, riseMap) {
  const up = riseMap[y][x];
  if (up <= 0) return;
  g.fillStyle(t.wallFace, 1).fillRect(px, py - up, TILE, up);
  g.fillStyle(t.wallTop, 1).fillRect(px, py - up, TILE, 6);
  g.fillStyle(t.wallEdge, 1).fillRect(px, py - up, TILE, 2);
  g.fillStyle(t.wallEdge, 1).fillRect(px, py - 2, TILE, 2);
}

// Draw void / walls / floor / doors / grid lines onto one Graphics object.
export function drawMap(scene, grid, themeName = 'default') {
  const t = THEMES[themeName] || THEMES.default;
  const rows = grid.length;
  const cols = grid[0].length;
  const g = scene.add.graphics();

  g.fillStyle(t.void, 1);
  g.fillRect(0, 0, cols * TILE, rows * TILE);

  // Plain floor: one flat colour, no grout lines between tiles (the user's
  // choice). Set GROUT > 0 to bring back a tiled look (inset face of
  // `t.floor` over a `t.tileGrout` background).
  const GROUT = 0;
  const grout = t.tileGrout ?? t.floor;

  const riseMap = t.wallStyle ? computeRise(grid, t.wallRise || 0) : null;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const px = x * TILE;
      const py = y * TILE;
      const code = grid[y][x];

      if (code === TILES.FLOOR || code === TILES.DOOR) {
        if (GROUT > 0) {
          g.fillStyle(grout, 1); // grout background, visible around the inset face
          g.fillRect(px, py, TILE, TILE);
        }
        g.fillStyle(t.floor, 1);
        g.fillRect(px + GROUT, py + GROUT, TILE - GROUT * 2, TILE - GROUT * 2);
      } else if (wallTouchesFloor(grid, x, y)) {
        g.fillStyle(t.wall, 1); // only the wall ring bordering the floor
        g.fillRect(px, py, TILE, TILE);
        if (t.wallStyle) drawWhiteWall(g, grid, x, y, px, py, t, riseMap);
      }
    }
  }

  // Lintels above doors set in tall front walls.
  if (riseMap) {
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        if (grid[y][x] === TILES.DOOR) drawLintel(g, x, y, x * TILE, y * TILE, t, riseMap);
      }
    }
  }

  // Draw each run of DOOR tiles as ONE united pad (so a 2-tile doorway looks
  // like a single threshold, not separate squares) — works for both horizontal
  // and vertical doorways.
  g.fillStyle(t.door, 1);
  const drawn = Array.from({ length: rows }, () => new Array(cols).fill(false));
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (grid[y][x] !== TILES.DOOR || drawn[y][x]) continue;
      // measure how far this run extends horizontally vs vertically
      let hx = x;
      while (hx < cols && grid[y][hx] === TILES.DOOR && !drawn[y][hx]) hx++;
      let vy = y;
      while (vy < rows && grid[vy][x] === TILES.DOOR && !drawn[vy][x]) vy++;
      const hlen = hx - x;
      const vlen = vy - y;
      if (hlen >= vlen) {
        for (let i = x; i < hx; i++) drawn[y][i] = true;
        g.fillRect(x * TILE + 6, y * TILE + 6, hlen * TILE - 12, TILE - 12);
      } else {
        for (let i = y; i < vy; i++) drawn[i][x] = true;
        g.fillRect(x * TILE + 6, y * TILE + 6, TILE - 12, vlen * TILE - 12);
      }
    }
  }
  return g;
}

// Draw a flight of stairs (white treads with a thin blue glass riser under
// each) over a tile region { tx, ty, w, h }. Sits above the floor, below
// characters. Used for the central staircase linking the floors.
// Lerp between two 0xRRGGBB colours.
function lerpHex(a, b, t) {
  const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
  const br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return (r << 16) | (g << 8) | bl;
}

// Draw the central staircase over region { tx, ty, w, h }.
// If an image asset is provided (stairs.imageKey loaded), it's used directly;
// otherwise we draw an angled wooden flight: beveled steps descending
// diagonally, lightest/highest at the top-left to darkest/lowest at the
// bottom-right, with a shaded riser under each step.
export function drawStairs(scene, stairs) {
  const x = stairs.tx * TILE;
  const y = stairs.ty * TILE;
  const w = stairs.w * TILE;
  const h = stairs.h * TILE;

  // Optional elevation shadow on the side OPPOSITE the entry, to sell the
  // up/down illusion. stairs.enter = 'left' | 'right' (the walkable side).
  if (stairs.enter) {
    const onRight = stairs.enter === 'left'; // shadow falls opposite the entry
    const half = w * 0.5;
    const sg = scene.add.graphics().setDepth(2);
    sg.fillStyle(0x000000, 0.26);
    sg.fillRect(onRight ? x + w - half : x, y, half, h);
    sg.fillStyle(0x000000, 0.3); // darker lip right at the far edge
    const edge = TILE * 0.6;
    sg.fillRect(onRight ? x + w - edge : x, y, edge, h);
  }

  // --- Asset version: drop a PNG and it replaces the drawing. -------------
  if (stairs.imageKey && scene.textures.exists(stairs.imageKey)) {
    const img = scene.add.image(x, y, stairs.imageKey).setOrigin(0, 0).setDepth(1);
    img.setDisplaySize(w, h);
    return img;
  }

  // --- Drawn version: angled wooden staircase. ----------------------------
  const n = stairs.steps || 6;
  const woodLight = 0xc9a36a;
  const woodDark = 0x5e4428;
  const sw = w / n;
  const sh = h / n;

  const g = scene.add.graphics();
  g.setDepth(1);

  // Each successive (lower) step overdraws the remaining block below-right,
  // building a staircase that descends from top-left (high) to bottom-right.
  for (let k = 0; k < n; k++) {
    const body = lerpHex(woodLight, woodDark, k / (n - 1));
    const sx = x + k * sw;
    const sy = y + k * sh;
    const bw = w - k * sw;
    const bh = h - k * sh;

    g.fillStyle(body, 1);
    g.fillRect(sx, sy, bw, bh);
    g.fillStyle(0xffffff, 0.22); // tread highlight (top of the step)
    g.fillRect(sx, sy, bw, Math.max(2, sh * 0.4));
    g.fillStyle(0x000000, 0.32); // riser shadow line under the tread
    g.fillRect(sx, sy + sh * 0.4, bw, Math.max(1, sh * 0.18));
  }

  g.lineStyle(2, 0x3a2a18, 1); // wood frame outline
  g.strokeRect(x, y, w, h);
  return g;
}

// Build static colliders for WALL tiles, merging each row's runs into one body.
export function buildWallColliders(scene, grid) {
  const group = scene.physics.add.staticGroup();
  const rows = grid.length;
  const cols = grid[0].length;

  for (let y = 0; y < rows; y++) {
    let x = 0;
    while (x < cols) {
      if (grid[y][x] === TILES.WALL) {
        const start = x;
        while (x < cols && grid[y][x] === TILES.WALL) x++;
        const w = (x - start) * TILE;
        const cx = start * TILE + w / 2;
        const cy = y * TILE + TILE / 2;
        const zone = scene.add.zone(cx, cy, w, TILE);
        scene.physics.add.existing(zone, true);
        group.add(zone);
      } else {
        x++;
      }
    }
  }
  return group;
}
