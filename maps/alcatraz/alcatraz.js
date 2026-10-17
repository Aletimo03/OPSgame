// maps/alcatraz/alcatraz.js
// The Alcatraz, the Milan club (chapter 12). A SKELETON from the user's plan
// (isometric drawing, to be refined with more images): you come in from the
// street into the lobby at the bottom, which opens into the big main hall
// with the stage across its far (top) end; a smaller second room with its own
// little stage sits on the left. Grid coords, y down.
//
//   x 0 ............................................... 51
//   y 2   [ sala 2 ]        [========= PALCO =========]
//         [ palchetto]      [                         ]
//         [          ]<====>[      SALA PRINCIPALE    ]
//         [__________]      [                         ]
//                           [_____________   bar  ____]
//   y 32            [ lobby / ingresso ]
//   y 39            [_____ porta ______] → home
import { setDoor } from '../../js/core/roomBuilder.js';

const COLS = 52;
const ROWS = 40;
const grid = Array.from({ length: ROWS }, () => Array(COLS).fill(1));
const carve = (x0, y0, w, h) => {
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) grid[y][x] = 0;
};

// Areas (interiors, tiles). Exported for story-check reachability + triggers.
export const AREAS = {
  hall:   { x0: 20, y0: 7,  x1: 49, y1: 29 }, // sala principale
  stage:  { x0: 25, y0: 2,  x1: 44, y1: 6 },  // palco, across the top of the hall
  sala2:  { x0: 2,  y0: 4,  x1: 16, y1: 20 }, // seconda sala
  stage2: { x0: 4,  y0: 4,  x1: 14, y1: 6 },  // palchetto della seconda sala
  lobby:  { x0: 13, y0: 32, x1: 26, y1: 38 }, // ingresso
};
const box = (a) => carve(a.x0, a.y0, a.x1 - a.x0 + 1, a.y1 - a.y0 + 1);
Object.values(AREAS).forEach(box);
carve(17, 11, 3, 4);   // passage sala 2 ↔ main hall (through the wall x 17–19)
carve(20, 30, 5, 2);   // lobby → main hall (bottom-left corner of the hall)

const door = setDoor(grid, 18, ROWS - 1); // street door (back home)

export default {
  key: 'alcatraz',
  name: 'Alcatraz — Milano',
  theme: 'alcatraz',
  ambient: 0.72, // always dark in here (fixed night veil), lit by the disco lights
  // Coloured lights wandering at random over the dance floor (WorldScene.startDisco).
  disco: { area: AREAS.hall, lights: 7, radius: 5 },
  // Music for this map (js/core/audio.js) and its tempo: the crowd dances on it.
  music: 'alcatraz-theme',
  beat: { bpm: 121.35, offset: 0.093 }, // measured on the track (s of the first beat)
  // Dark dancing silhouettes (WorldScene.startCrowd): the cast's sheets tinted
  // almost black, not solid, bobbing / turning on the beat.
  crowd: {
    area: { x0: 21, y0: 9, x1: 43, y1: 27 }, count: 24, spacing: 1.6,
    from: ['ana', 'caue', 'ema', 'ernesto', 'gaia', 'gatta', 'lilia', 'mari', 'nima', 'sara', 'timo'],
  },
  // Where NPCs placed by map key start (girls + Gabbo spread over the floor).
  npcSpots: [
    { tx: 25, ty: 12 }, { tx: 40, ty: 12 }, { tx: 26, ty: 24 }, { tx: 39, ty: 24 },
    { tx: 32, ty: 18 }, { tx: 22, ty: 28 },
  ],
  grid,
  areas: AREAS,
  spawns: {
    default: { tx: 19, ty: 36 },
  },
  warps: [{ tx: door.tx, ty: door.ty, to: 'entrance', toSpawn: 'fromAlcatraz' }],
  // Coloured floor areas drawn in code (WorldScene.drawPaint): stage, bar.
  paint: [
    { ...AREAS.stage, color: 0x5a3a24, label: 'PALCO' },
    { ...AREAS.stage2, color: 0x4a3020, label: 'PALCO 2' },
    { x0: 44, y0: 24, x1: 49, y1: 29, color: 0x23324a, label: 'BAR' },
  ],
  // Stepping in sets a flag (WorldScene.checkFlagZones): chapter 12's last objective.
  flagZones: [
    { ...AREAS.stage, flag: 'alcatraz-stage', chapter: 'chapter-12', requires: 'alcatraz-number', banner: '🎤 Sul palco dell\'Alcatraz con Gabbo!' },
  ],
};
