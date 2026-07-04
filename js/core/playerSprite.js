// js/core/playerSprite.js
// Everything about the protagonist sprite: slicing the sheet into frames,
// building walk animations, and per-frame movement. Kept separate from the
// scene so any scene (overworld, future battle intro, etc.) can reuse it.

import { PLAYER, SHEET, ROW } from '../config.js';

const KEY = PLAYER.SPRITE_KEY;
const COLS = SHEET.cols;
const STAND = 0; // standing column

// Slice any already-loaded 4x3 character sheet (under texture `key`) into the
// numbered walk frames 0..11. Returns { frameW, frameH }. Used for the player
// AND for NPCs. Safe to call again (re-adds the same frames).
export function sliceSheet(scene, key) {
  const tex = scene.textures.get(key);
  const src = tex.getSourceImage();
  const totalBands = SHEET.walkRows + SHEET.previewBands;
  const fw = Math.floor(src.width / COLS);
  const fh = Math.floor(src.height / totalBands);

  let f = 0;
  for (let r = 0; r < SHEET.walkRows; r++) {
    const y = (r + SHEET.previewBands) * fh;
    for (let c = 0; c < COLS; c++) {
      tex.add(f++, 0, c * fw, y, fw, fh);
    }
  }
  return { frameW: fw, frameH: fh };
}

// Slice the player sheet (falls back to a generated placeholder if missing).
export function preparePlayerTexture(scene, loaded) {
  if (!loaded) return createPlaceholder(scene);
  return sliceSheet(scene, KEY);
}

export function createPlayerAnims(scene) {
  const make = (key, row) => {
    if (scene.anims.exists(key)) return;
    scene.anims.create({
      key,
      frames: scene.anims.generateFrameNumbers(KEY, {
        start: row * COLS,
        end: row * COLS + (COLS - 1),
      }),
      frameRate: PLAYER.WALK_FRAMERATE,
      repeat: -1,
    });
  };
  make('walk-down', ROW.DOWN);
  make('walk-side', ROW.SIDE); // side art faces LEFT; mirrored for Right
  make('walk-up', ROW.UP);
}

// Build walk animations for ANY already-sliced character texture `key`.
// Returns { down, side, up } anim keys. Used for NPCs so each one animates from
// its own sheet (the player's anims above are bound to PLAYER.SPRITE_KEY).
export function createWalkAnims(scene, key) {
  const mk = (suffix, row) => {
    const animKey = `walk-${suffix}-${key}`;
    if (!scene.anims.exists(animKey)) {
      scene.anims.create({
        key: animKey,
        frames: scene.anims.generateFrameNumbers(key, {
          start: row * COLS,
          end: row * COLS + (COLS - 1),
        }),
        frameRate: PLAYER.WALK_FRAMERATE,
        repeat: -1,
      });
    }
    return animKey;
  };
  return { down: mk('down', ROW.DOWN), side: mk('side', ROW.SIDE), up: mk('up', ROW.UP) };
}

export function idleFrame(facing) {
  switch (facing) {
    case 'up':
      return ROW.UP * COLS + STAND;
    case 'left':
    case 'right':
      return ROW.SIDE * COLS + STAND;
    default:
      return ROW.DOWN * COLS + STAND;
  }
}

// 4-way, diagonal-locked movement. Mutates the player's body + animation.
export function movePlayer(player, cursors) {
  const body = player.body;
  body.setVelocity(0);
  const { left, right, up, down } = cursors;

  if (left.isDown) {
    body.setVelocityX(-PLAYER.SPEED);
    player.facing = 'left';
    player.setFlipX(false); // side art already faces LEFT
    player.anims.play('walk-side', true);
  } else if (right.isDown) {
    body.setVelocityX(PLAYER.SPEED);
    player.facing = 'right';
    player.setFlipX(true);
    player.anims.play('walk-side', true);
  } else if (up.isDown) {
    body.setVelocityY(-PLAYER.SPEED);
    player.facing = 'up';
    player.setFlipX(false);
    player.anims.play('walk-up', true);
  } else if (down.isDown) {
    body.setVelocityY(PLAYER.SPEED);
    player.facing = 'down';
    player.setFlipX(false);
    player.anims.play('walk-down', true);
  } else {
    player.anims.stop();
    player.setFrame(idleFrame(player.facing));
  }
}

// Generated stand-in sheet (4x3) used only if the art is missing.
function createPlaceholder(scene) {
  const fw = 48;
  const fh = 64;
  const rows = SHEET.walkRows;
  const tex = scene.textures.createCanvas(KEY, COLS * fw, rows * fh);
  const ctx = tex.getContext();
  const rowColors = ['#3b5bdb', '#1c7ed6', '#1098ad'];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < COLS; c++) {
      const ox = c * fw;
      const oy = r * fh;
      const bob = c % 2 === 0 ? 0 : 4;
      ctx.fillStyle = rowColors[r] || '#888';
      ctx.fillRect(ox + 12, oy + 18 + bob, 24, 34);
      ctx.fillStyle = '#f1c27d';
      ctx.fillRect(ox + 16, oy + 6 + bob, 16, 16);
    }
  }
  tex.refresh();
  let i = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < COLS; c++) tex.add(i++, 0, c * fw, r * fh, fw, fh);
  }
  console.warn(`[OPSgame] ${PLAYER.SPRITE_PATH} not found — using placeholder.`);
  return { frameW: fw, frameH: fh };
}
