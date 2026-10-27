// maps/dream-maze/dream-maze.js
// Chapter 13 — Zio Nick's nightmare: a dark maze (js/story/dream.js builds it
// from a fixed seed, so it's always the same one). You start in the
// bottom-left corner; the pale light in the top-right corner wakes you up. A
// shadow hunts you through the corridors (WorldScene.startShadow).
import { buildMaze } from '../../js/story/dream.js';

const COLS = 14;
const ROWS = 11;
const maze = buildMaze(COLS, ROWS, 13);
const start = maze.cellBox(0, ROWS - 1);
const exit = maze.cellBox(COLS - 1, 0);

export default {
  key: 'dream-maze',
  name: 'Il sogno',
  theme: 'dream',
  grid: maze.grid,
  areas: { start, exit },
  spawns: { default: { tx: start.x0, ty: start.y0 } },
  warps: [],
  ambient: 0.45,          // dim inside the bubble; outside it everything is black (vision)
  vision: 4.2,            // radius (tiles) of the only visible bubble of light (DREAM.mazeVision)
  lantern: true,          // a dim light follows Zio Nick (WorldScene.startDream)
  playerSpeed: 330,       // heavy legs in the dream (see DREAM.playerSpeed)
  shadow: true,           // the hunting shadow (DREAM.shadow)
  jumpscare: 'assets/dream/jumpscare.png', // full screen when it catches you (WorldScene.caughtByShadow)
  music: 'dream-theme',   // the user's track (assets/sounds/dream.mp3); silence until it exists
  // The way out: a pale light pulsing in the top-right cell.
  disco: [{ area: exit, lights: 2, radius: 2.2, colors: [0xfff2c0, 0xc8e0ff] }],
  flagZones: [
    { ...exit, flag: 'dream-escaped', chapter: 'chapter-9', banner: '☀️ Una luce... Zio Nick si sta svegliando!' },
  ],
};
