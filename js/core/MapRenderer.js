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
      if (grid[ny][nx] !== TILES.WALL) return true; // floor or door
    }
  }
  return false;
}

// Draw void / walls / floor / doors / grid lines onto one Graphics object.
export function drawMap(scene, grid, themeName = 'default') {
  const t = THEMES[themeName] || THEMES.default;
  const rows = grid.length;
  const cols = grid[0].length;
  const g = scene.add.graphics();

  g.fillStyle(t.void, 1);
  g.fillRect(0, 0, cols * TILE, rows * TILE);

  // Grout inset: full tile in grout colour, then face inset by GROUT pixels.
  const GROUT = 2;
  const grout = t.tileGrout ?? t.floor;

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const px = x * TILE;
      const py = y * TILE;
      const code = grid[y][x];

      if (code === TILES.FLOOR || code === TILES.DOOR) {
        // Grout background (fills the full tile, becomes the visible grout line)
        g.fillStyle(grout, 1);
        g.fillRect(px, py, TILE, TILE);
        // Tile face (inset so the grout peeks around each edge)
        g.fillStyle(t.floor, 1);
        g.fillRect(px + GROUT, py + GROUT, TILE - GROUT * 2, TILE - GROUT * 2);
      } else if (wallTouchesFloor(grid, x, y)) {
        g.fillStyle(t.wall, 1); // only the wall ring bordering the floor
        g.fillRect(px, py, TILE, TILE);
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
