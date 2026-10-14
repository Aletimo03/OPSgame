// js/config.js
// Shared constants used across the whole game.

export const TILE = 48; // pixel size of one map tile

// Tile codes used in every map's `grid` array.
export const TILES = {
  FLOOR: 0, // walkable
  WALL: 1, // solid (collider)
  DOOR: 2, // walkable + triggers a warp to another map
};


//Room 12 background
export const BATTLE_BG_KEY= 'battle-bg';
export const BATTLE_BG_PATH= 'assets/tilesets/battle_room12.png'; // Change to your actual file path


// World camera zoom. <1 shows more of the map (0.85 = 15% zoomed out). The HUD
// (quest tracker, dialogue, bag, menus) is on a separate unzoomed camera, so it
// keeps its size and screen position whatever this is.
export const CAMERA_ZOOM = 0.80;

// Empty margin (tiles) the camera may show around every map, so the outer walls
// are never flush with the screen edge. Maps smaller than the view are also
// centred on screen instead of hugging the top-left corner.
export const CAMERA_MARGIN = 3;

// Hero HP regenerated per second while sitting on a seat (chairs, stools).
export const SEAT_HEAL_PER_SEC = 3;

// Where you wake up (full HP) after losing a battle.
export const DEFEAT_RESPAWN = { mapKey: 'base-floor', spawnName: 'living' };

// Doorway width in tiles (the opening AND the warp trigger). 2 = a clear
// 2-tile doorway you don't have to line up exactly to walk through.
export const DOOR_WIDTH = 2;

// Protagonist walking speed in pixels/second (1 tile = 48 px). For testing you
// can bump it up (e.g. 700–1200) to fast-travel around the big map.
export const PROTAGONIST_SPEED = 600;

// Player (protagonist "Zio Nick") tuning.
export const PLAYER = {
  SPEED: PROTAGONIST_SPEED,
  SCALE: 0.43, // repacked frames are ~190x344; scaled to ~3 tiles tall
  WALK_FRAMERATE: 15,
  NAME: 'Zio Nick',
  SPRITE_KEY: 'zionick',
  SPRITE_PATH: 'assets/characters/zionick/player.png',
  // Add these two lines:
  PORTRAIT_KEY: 'zionick-portrait',
  PORTRAIT_PATH: 'assets/characters/zionick/portrait.png',

};

// How the protagonist sheet is laid out (see tools/sprites/repack_player.py).
export const SHEET = {
  cols: 4, // frames per walk row
  walkRows: 3, // down, right, up
  previewBands: 0, // repacked sheet has no preview band
};

// Walk-grid row order (after any preview band is skipped).
export const ROW = { DOWN: 0, SIDE: 1, UP: 2 };
