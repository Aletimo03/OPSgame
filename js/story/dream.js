// js/story/dream.js
// Chapter 9 — "Il sogno di Zio Nick". Zio Nick goes to bed (room-20); his bed
// takes him into a nightmare: a dark maze where a SHADOW (his own silhouette,
// tinted black) hunts him. Reach the light at the far corner to wake up.
// Caught → the dream starts over from the entrance of the maze.
// Node-importable (the maze is plain data, built from a fixed seed).
import { questState } from './questState.js';

export const DREAM = {
  chapter: 'chapter-9',
  map: 'dream-maze',
  enteredFlag: 'dream-entered',
  trashFlag: 'dream-trash',        // reached the trash room in the dream house
  trashMap: 'trashbin-room',
  wokeLinesFlag: 'dream-woke',     // Zio Nick's lines on waking in the dream, once
  // The "dream house" (between going to bed and the maze): the real maps, but
  // darker and stranger (WorldScene.startDream): dream theme, dim colours,
  // a wider bubble of light than in the maze.
  houseVision: 6,                  // tiles: radius of the light bubble at home
  mazeVision: 4.2,                 // tiles: radius of the light bubble in the maze
  // Zio Nick thinks aloud in the dream (see his persona.md).
  wokeLines: ['Oh cavolo...', 'Ho dimenticato di buttare la spazzatura...', "C'è una puzza orribile..."],
  newGoal: '🎯 Nuovo obiettivo: vai nel locale spazzatura',
  // More of Zio Nick's thoughts in the dream (each set once; flag `dream-line:<id>`).
  lines: {
    light: ['Provo ad accendere la luce...', '...non va. Molto strano.'],
    corridor: ['Strano... non si accende la solita luce del corridoio.'],
    maze: ['Dove sono?', "Devo trovare velocemente una via d'uscita...", 'Questo posto mi dà i brividi.'],
    scared: ["Cos'è quella cosa?!"],
  },
  // Where the dream-house lines play: leaving the bedroom (into the anteroom),
  // the corridor outside the room.
  houseTriggers: [
    { id: 'light', map: 'room-20', area: 'anteroom' },
    { id: 'corridor', map: 'first-floor' },
  ],
  lineFlag: (id) => `dream-line:${id}`,
  revealTiles: 3,                  // the shadow rises once you've walked this far from the maze entrance
  trashScene: ['La puzza qui è insopportabile...', 'Il pavimento sotto i bidoni si spalanca nel buio!'],
  escapedFlag: 'dream-escaped',
  playerSpeed: 330,      // px/s in the dream (awake: 600): legs feel heavy
  shadow: {
    key: 'zionick',      // whose silhouette the shadow wears
    speed: 255,          // px/s (slower than you, but it never gets lost)
    speedUp: 2.5,        // +px/s every second it hunts, up to maxSpeed
    maxSpeed: 315,
    // it rises once you've walked DREAM.revealTiles from the entrance (a short scare scene)
    catchTiles: 0.85,    // caught when its feet are this close to yours (tiles)
    nearTiles: 4.5,      // closer than this: its sound plays over and over (faster when closer)
    scale: 1.25,
  },
  enter: ['Zio Nick chiude gli occhi... 💤'],
  mazeEnter: 'Zio Nick precipita nel buio...\ne si ritrova in un labirinto. Non è solo.',
  caughtFlag: 'dream-caught',
  jumpscareMs: 5000,   // the jumpscare stays on screen this long, shaking
  caughtWake: 'Zio Nick si sveglia urlando, sudato fradicio.\nEra solo un sogno... forse.',
  wake: 'Zio Nick si sveglia di soprassalto, sudato.\nEra solo un sogno... forse.',
};

// In the dream house: gone to bed, not yet down to the trash room.
export const dreamHouse = () =>
  questState.activeChapter === DREAM.chapter && questState.hasFlag(DREAM.enteredFlag)
  && !questState.hasFlag(DREAM.trashFlag);

// The dream is on: chapter 9 and not escaped yet.
export const dreamActive = () =>
  questState.activeChapter === DREAM.chapter && !questState.hasFlag(DREAM.escapedFlag);

// ── Maze ────────────────────────────────────────────────────────────────────
// A cell = 2×2 floor tiles + 1-tile walls (corridors 2 tiles wide, so the
// player fits). Recursive backtracker from a fixed seed (the same maze every
// time), then some dead ends are knocked through so there are loops to dodge
// the shadow in.
export const CELL = 3;

function rng(seed) { // mulberry32
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function buildMaze(cols, rows, seed = 13, braid = 0.45) {
  const rand = rng(seed);
  const W = cols * CELL + 1;
  const H = rows * CELL + 1;
  const grid = Array.from({ length: H }, () => Array(W).fill(1));
  const open = (cx, cy) => { // a cell's 2×2 floor
    for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) grid[cy * CELL + 1 + y][cx * CELL + 1 + x] = 0;
  };
  const link = (ax, ay, bx, by) => { // knock the wall between two neighbours
    if (ax === bx) { const y = Math.max(ay, by) * CELL; for (let x = 1; x <= 2; x++) grid[y][ax * CELL + x] = 0; }
    else { const x = Math.max(ax, bx) * CELL; for (let y = 1; y <= 2; y++) grid[ay * CELL + y][x] = 0; }
  };
  const seen = Array.from({ length: rows }, () => Array(cols).fill(false));
  const links = Array.from({ length: rows }, () => Array.from({ length: cols }, () => new Set()));
  const D = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const stack = [[0, rows - 1]];
  seen[rows - 1][0] = true;
  open(0, rows - 1);
  while (stack.length) {
    const [cx, cy] = stack[stack.length - 1];
    const next = D.map(([dx, dy]) => [cx + dx, cy + dy])
      .filter(([x, y]) => x >= 0 && y >= 0 && x < cols && y < rows && !seen[y][x]);
    if (!next.length) { stack.pop(); continue; }
    const [nx, ny] = next[Math.floor(rand() * next.length)];
    seen[ny][nx] = true;
    open(nx, ny);
    link(cx, cy, nx, ny);
    links[cy][cx].add(`${nx},${ny}`); links[ny][nx].add(`${cx},${cy}`);
    stack.push([nx, ny]);
  }
  // Braid: open some dead ends into a neighbour they don't reach yet.
  for (let cy = 0; cy < rows; cy++) {
    for (let cx = 0; cx < cols; cx++) {
      if (links[cy][cx].size !== 1 || rand() > braid) continue;
      const opts = D.map(([dx, dy]) => [cx + dx, cy + dy])
        .filter(([x, y]) => x >= 0 && y >= 0 && x < cols && y < rows && !links[cy][cx].has(`${x},${y}`));
      if (!opts.length) continue;
      const [nx, ny] = opts[Math.floor(rand() * opts.length)];
      link(cx, cy, nx, ny);
      links[cy][cx].add(`${nx},${ny}`); links[ny][nx].add(`${cx},${cy}`);
    }
  }
  // Tile box of a cell's floor (for spawns / zones).
  const cellBox = (cx, cy) => ({ x0: cx * CELL + 1, y0: cy * CELL + 1, x1: cx * CELL + 2, y1: cy * CELL + 2 });
  return { grid, cols, rows, cellBox };
}
