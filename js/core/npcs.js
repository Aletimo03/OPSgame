// js/core/npcs.js
// Spawn interactable NPCs from a map's `npcs` array, plus a simple dialogue box.

import { TILE, TILES, PLAYER } from '../config.js';
import { sliceSheet, idleFrame, createWalkAnims, feetY } from './playerSprite.js';
import { placementsForMap } from './characters.js';
import { propColliders } from './props.js';

// Random-walk tuning.
const NPC_SPEED = 200; // px/sec while strolling (well under the player)
const WANDER_RADIUS = 5; // tiles from home an NPC will roam (override per-npc)
const ARRIVE = 3; // px tolerance for "reached the target tile"
const OPP = { up: 'down', down: 'up', left: 'right', right: 'left' };

// NPCs move tile-to-tile and don't collide with the physics walls, so solid
// furniture has to be excluded by hand. FEET is the NPC's collision body (set in
// createNpcs: lower 14–46% of the frame, half its width) in TILES, relative to
// the centre of the tile the NPC stands on, at PLAYER.SCALE with ~190x344 frames.
const FEET = { halfW: 0.43, top: 0.43, bottom: 1.42 };

// Tiles ("tx,ty") where a standing NPC's feet would overlap a solid prop
// (its `colliders`/`collider`, else its display box). Used for spawning AND strolling.
export function propBlockedTiles(map) {
  // Tiles where an NPC can't stand: its FEET box (≈1 tile wide, from ~0.9 to
  // ~1.9 tiles below the sprite centre) would overlap a solid prop OR a
  // non-floor tile. Checking only the centre tile let NPCs on the last row
  // above a wall stand with their feet inside it ("walking on the walls").
  const boxes = (map.props || [])
    .filter((p) => p.solid)
    .flatMap((p) => propColliders(p));
  const g = map.grid;
  const blocked = new Set();
  for (let ty = 0; ty < g.length; ty++) {
    for (let tx = 0; tx < g[0].length; tx++) {
      const x0 = tx + 0.5 - FEET.halfW, x1 = tx + 0.5 + FEET.halfW;
      const y0 = ty + 0.5 + FEET.top, y1 = ty + 0.5 + FEET.bottom;
      let wall = false;
      for (let yy = Math.floor(y0); yy <= Math.ceil(y1) - 1 && !wall; yy++) {
        for (let xx = Math.floor(x0); xx <= Math.ceil(x1) - 1; xx++) {
          if (g[yy]?.[xx] !== TILES.FLOOR) { wall = true; break; }
        }
      }
      if (wall || boxes.some((b) => x0 < b.tx + b.w && x1 > b.tx && y0 < b.ty + b.h && y1 > b.ty)) {
        blocked.add(tx + ',' + ty);
      }
    }
  }
  return blocked;
}

// Centroid of a grid's walkable area (average of all FLOOR tiles). For a
// rectangular room this is the geometric centre; for an irregular / U-shaped
// map it sits inside the floor mass rather than in a central void.
function floorCentroid(grid) {
  let sx = 0, sy = 0, n = 0;
  for (let y = 0; y < grid.length; y++) {
    const row = grid[y];
    for (let x = 0; x < row.length; x++) {
      if (row[x] === TILES.FLOOR) { sx += x; sy += y; n++; }
    }
  }
  if (!n) return { cx: Math.floor(grid[0].length / 2), cy: Math.floor(grid.length / 2) };
  return { cx: Math.round(sx / n), cy: Math.round(sy / n) };
}

// Build the NPC sprites for a map. Returns { group, list, blocked }.
// Placement is NOT stored on the map — it comes from each character's JSON
// `locations` block for the active chapter (placementsForMap). A location may
// give an exact `tx`/`ty`, OR omit them to auto-place at the map's floor centre
// (multiple centred NPCs fan outward to the nearest free floor tiles). All
// dialogue / battle / item / stats also come from the character JSON, resolved
// live at interaction time. The sprite/portrait art folder == the character
// folder by convention.
export function createNpcs(scene, map) {
  const group = scene.physics.add.group();
  const list = [];

  const grid = map.grid;
  const cols = grid[0].length;
  const rows = grid.length;
  const blocked = propBlockedTiles(map); // tiles under solid furniture
  const isFloor = (tx, ty) =>
    grid[ty] && grid[ty][tx] === TILES.FLOOR && !blocked.has(tx + ',' + ty);
  const used = new Set(); // "tx,ty" tiles already claimed
  let centroid = null;
  // BFS out from an anchor tile to the nearest free floor tile (claims it).
  // Ring-by-ring expansion clusters NPCs sharing an anchor without stacking,
  // and works on any map shape.
  const bfsFreeFloor = (sx, sy) => {
    const queue = [[sx, sy]];
    const seen = new Set([sx + ',' + sy]);
    while (queue.length) {
      const [x, y] = queue.shift();
      const key = x + ',' + y;
      if (isFloor(x, y) && !used.has(key)) { used.add(key); return { tx: x, ty: y }; }
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy, nk = nx + ',' + ny;
        if (nx >= 0 && nx < cols && ny >= 0 && ny < rows && !seen.has(nk)) {
          seen.add(nk);
          queue.push([nx, ny]);
        }
      }
    }
    return { tx: sx, ty: sy };
  };

  // Maps can list `npcSpots` (e.g. the kitchens): NPCs placed by raw map key
  // take them in turn, so a crowd spreads over the room instead of piling up
  // around the centre.
  const spots = map.npcSpots || [];
  let spotI = 0;
  placementsForMap(scene, map.key).forEach(({ character, data: cdata, at }) => {
    // Anchor = the spawn point's tile (named spawn point), the next of the
    // map's npcSpots, or the map centroid (raw map key). BFS from there to the
    // nearest free floor tile.
    let ax, ay;
    if (at.tx != null && at.ty != null) {
      ax = at.tx; ay = at.ty;
    } else if (spots.length) {
      const sp = spots[spotI++ % spots.length];
      ax = sp.tx; ay = sp.ty;
    } else {
      if (!centroid) centroid = floorCentroid(grid);
      ax = centroid.cx; ay = centroid.cy;
    }
    const { tx, ty } = bfsFreeFloor(ax, ay);

    const art = character; // sprite/portrait folder == character folder
    sliceSheet(scene, art); // ensure frames exist on the texture
    const anims = createWalkAnims(scene, art); // per-sheet walk anims
    const x = tx * TILE + TILE / 2;
    const y = ty * TILE + TILE / 2;
    const facing = at.facing || 'down';

    const spr = scene.physics.add.sprite(x, y, art, idleFrame(facing));
    spr.setScale(PLAYER.SCALE);
    spr.setFlipX(facing === 'right'); // side art faces LEFT natively

    // Solid collision body covering the lower body, so the player is stopped
    // with a clear gap instead of sliding into the sprite.
    const fw = spr.frame.width;
    const fh = spr.frame.height;
    const bw = fw * 0.5;
    const bh = fh * 0.32;
    spr.body.setSize(bw, bh);
    spr.body.setOffset((fw - bw) / 2, fh - bh - fh * 0.04);
    spr.setImmovable(true);
    spr.body.pushable = false; // can't be shoved by the player

    // Depth-sort by feet so the character lower on screen draws in front
    // (and props are sorted on the same line — see WorldScene props).
    spr.setDepth(feetY(spr));

    group.add(spr);
    list.push({
      sprite: spr,
      id: character,             // quest/greet id == character folder
      character,                 // data folder / cache key
      spriteKey: art,            // texture key
      name: cdata.name || character, // display name
      data: cdata,               // parsed character.json (live)
      portraitKey: art + '-portrait',
      // Random-walk state.
      anims,
      facing,
      home: { tx, ty },
      radius: at.wanderRadius != null ? at.wanderRadius : WANDER_RADIUS,
      wander: at.wander !== false, // on by default; set wander:false to pin
      state: 'idle',
      target: null,
      nextTime: scene.time.now + Math.random() * 1500,
      // Step bob (character JSON `walkBob`, a fraction of the frame height):
      // for sheets whose walk frames barely change (Lilia), a hop per step.
      bob: cdata.walkBob || 0,
      baseOffsetY: spr.body.offset.y,
    });
  });

  return { group, list, blocked };
}

// Step bob: lift the drawn sprite by |sin| once per step and rock it a little.
// The lift moves the ORIGIN and the body offset by the same amount, so the
// physics body (and the feet line used for depth) stay where they are.
const STEP_MS = 135; // one step = 2 walk frames at 15 fps
function stepBob(npc, time, walking) {
  if (!npc.bob) return;
  const spr = npc.sprite;
  const ph = walking ? (time / STEP_MS) * Math.PI : 0;
  const lift = npc.bob * Math.abs(Math.sin(ph));
  spr.setOrigin(0.5, 0.5 + lift);
  spr.body.setOffset(spr.body.offset.x, npc.baseOffsetY + lift * spr.frame.height);
  spr.setAngle(walking ? 2.5 * Math.sin(ph) : 0);
}

// Tile a sprite's feet currently sit on.
const tileOf = (s) => ({
  tx: Math.round((s.x - TILE / 2) / TILE),
  ty: Math.round((s.y - TILE / 2) / TILE),
});

// Freeze all NPCs in place (used while a dialogue/warp pauses the world).
// Stop one NPC properly: no velocity, no walk animation left running, idle
// frame for where it faces, and a short pause before it may stroll again.
export function freezeNpc(npc, time = 0) {
  const spr = npc.sprite;
  stepBob(npc, 0, false);
  spr.body.setVelocity(0);
  if (npc.state === 'walking' || spr.anims.isPlaying) {
    spr.anims.stop();
    spr.setFrame(idleFrame(npc.facing || 'down'));
  }
  npc.state = 'idle';
  npc.target = null;
  npc.nextTime = Math.max(npc.nextTime || 0, time + 800);
}

// Freeze every NPC (overlays, cutscenes, warps).
export function stopNpcs(npcs, time = 0) {
  npcs.list.forEach((n) => freezeNpc(n, time));
}

// Drive each NPC's idle/stroll loop. Call once per frame from the scene's
// update() while the world is active. `scene` provides the grid + player so
// NPCs only step onto empty floor and never onto each other or the player.
// `frozen`: NPCs to keep still this frame (e.g. the one you're talking to);
// everyone else strolls as usual.
export function updateNpcs(scene, npcs, time, frozen = null) {
  const grid = scene.map.grid;
  const walkable = (tx, ty) =>
    grid[ty] && grid[ty][tx] === TILES.FLOOR && !npcs.blocked.has(tx + ',' + ty);

  const occupied = (tx, ty, self) => {
    for (const o of npcs.list) {
      if (o === self) continue;
      const ot = o.state === 'walking' ? tileOf({ x: o.target.x, y: o.target.y }) : tileOf(o.sprite);
      if (ot.tx === tx && ot.ty === ty) return true;
    }
    if (scene.player) {
      const p = tileOf(scene.player);
      if (p.tx === tx && p.ty === ty) return true;
    }
    return false;
  };

  for (const npc of npcs.list) {
    const spr = npc.sprite;
    if (frozen && frozen.has(npc)) {
      freezeNpc(npc, time);
    } else if (npc.wander) {
      if (npc.state === 'walking') {
        const dx = npc.target.x - spr.x;
        const dy = npc.target.y - spr.y;
        const dist = Math.hypot(dx, dy);
        if (dist <= ARRIVE) {
          spr.body.reset(npc.target.x, npc.target.y); // snap + stop, keep tile-aligned
          spr.anims.stop();
          spr.setFrame(idleFrame(npc.facing));
          npc.state = 'idle';
          npc.nextTime = time + 500 // + Math.random() * 500;
        } else {
          spr.body.setVelocity((dx / dist) * NPC_SPEED, (dy / dist) * NPC_SPEED);
        }
      } else if (time >= npc.nextTime) {
        // Sometimes just keep loitering.
        if (Math.random() < 0.35) {
          npc.nextTime = time + 800 + Math.random() * 2200;
        } else {
          const here = tileOf(spr);
          const dirs = Phaser.Utils.Array.Shuffle([
            ['down', 0, 1], ['up', 0, -1], ['left', -1, 0], ['right', 1, 0],
          ]);
          let stepped = false;
          for (const [face, ddx, ddy] of dirs) {
            const ntx = here.tx + ddx;
            const nty = here.ty + ddy;
            const fromHome = Math.abs(ntx - npc.home.tx) + Math.abs(nty - npc.home.ty);
            if (fromHome > npc.radius || !walkable(ntx, nty) || occupied(ntx, nty, npc)) continue;
            npc.target = { x: ntx * TILE + TILE / 2, y: nty * TILE + TILE / 2 };
            npc.facing = face;
            spr.setFlipX(face === 'right'); // side art faces LEFT natively
            spr.anims.play(face === 'up' ? npc.anims.up : face === 'down' ? npc.anims.down : npc.anims.side, true);
            npc.state = 'walking';
            stepped = true;
            break;
          }
          if (!stepped) npc.nextTime = time + 600 + Math.random() * 1500;
        }
      }
    }
    stepBob(npc, time, npc.state === 'walking');
    // Depth-sort by feet vs the player and props (WorldScene.characterDepth also
    // keeps characters in front of props they merely walk beside).
    spr.setDepth(scene.characterDepth ? scene.characterDepth(spr) : feetY(spr));
  }
}

// Turn an NPC to face the player and stop it strolling (for conversations).
// It resumes wandering a beat after the dialogue closes (NPCs are frozen while
// a dialogue is open, so `time` only governs the post-chat pause).
export function faceNpcToPlayer(npc, playerFacing, time) {
  const facing = OPP[playerFacing] || 'down';
  stepBob(npc, 0, false);
  npc.facing = facing;
  npc.state = 'idle';
  npc.target = null;
  npc.nextTime = time + 1000;
  npc.sprite.body.setVelocity(0);
  npc.sprite.anims.stop();
  npc.sprite.setFlipX(facing === 'right');
  npc.sprite.setFrame(idleFrame(facing));
}

// Typewriter speed: ms per character (Space while typing shows the whole line).
const TYPE_MS = 18;

// A bottom-of-screen dialogue box, pinned to the camera.
export class Dialogue {
  constructor(scene) {
    this.scene = scene;
    this.open = false;
    this.objs = [];
  }

  // `text` may be a single string OR an array of lines shown one at a time.
  // `onComplete` (optional) fires once the last line is dismissed.
  // `opts.big` (cutscenes): the rest of the screen is darkened, the portrait
  // is half the screen tall and the text is larger.
  show(name, text, portraitKey, onComplete, opts = {}) {
    if (this.open) return;
    this.open = true;
    this.big = !!opts.big;
    this.mode = 'lines';
    this.name = name;
    this.portraitKey = portraitKey;
    this.onComplete = onComplete || null;
    this.lines = Array.isArray(text) ? text.slice() : [text];
    this.index = 0;
    this.render();
  }

  // A branching prompt: `options` is a list of strings; `onSelect(index)` fires
  // when the player confirms. Navigate with up/down, confirm with space.
  ask(name, prompt, options, portraitKey, onSelect) {
    this.open = true;
    this.big = false;
    this.mode = 'choice';
    this.name = name;
    this.portraitKey = portraitKey;
    this.prompt = prompt;
    this.options = options;
    this.onSelect = onSelect;
    this.sel = 0;
    this.renderChoice();
  }

  // Advance to the next line; close once past the last one. Returns true if a
  // line was shown, false if the box just closed (caller may want to know).
  advance() {
    if (!this.open || this.mode !== 'lines') return false;
    // Typewriter still running: Space shows the whole line first.
    if (this.typing) {
      this.finishTyping();
      return true;
    }
    if (this.index >= this.lines.length - 1) {
      const cb = this.onComplete;
      this.hide();
      if (cb) cb();
      return false;
    }
    this.index += 1;
    this.render();
    return true;
  }

  moveSelection(delta) {
    if (this.mode !== 'choice') return;
    this.sel = Phaser.Math.Clamp(this.sel + delta, 0, this.options.length - 1);
    this.renderChoice();
  }

  confirm() {
    if (this.mode !== 'choice') return;
    const cb = this.onSelect;
    const idx = this.sel;
    this.hide();
    if (cb) cb(idx);
  }

  render() {
    this.objs.forEach((o) => o.destroy());
    this.objs = [];
    const cam = this.scene.cameras.main;
    const w = cam.width;
    const h = cam.height;
    const m = 20;
    const big = this.big;
    const bh = big ? 176 : 149; // normal box 20% bigger than the original 124 (user's request)
    const boxTop = h - m - bh;
    const last = this.index >= this.lines.length - 1;

    if (big) {
      // Darken everything else, like night, so the speaker stands out.
      this.objs.push(this.scene.add.rectangle(0, 0, w, h, 0x05060c, 0.6)
        .setOrigin(0, 0).setScrollFactor(0).setDepth(1950));
    }
    const bg = this.scene.add
      .rectangle(w / 2, h - m - bh / 2, w - m * 2, bh, 0x0d0f17, 0.92)
      .setScrollFactor(0)
      .setDepth(2000)
      .setStrokeStyle(3, 0xffffff, 0.85);
    this.objs.push(bg);

    // Portrait (the NPC's full standalone figure) standing over the left of
    // the bar, rising above it.
    let textX = m + 18;
    if (this.portraitKey && this.scene.textures.exists(this.portraitKey)) {
      const src = this.scene.textures.get(this.portraitKey).getSourceImage();
      const ph = big ? h * 0.5 : bh * 1.95; // taller than the bar so it pops above
      const pw = (src.width / src.height) * ph;
      const portrait = this.scene.add
        .image(m + 16, h - m - 4, this.portraitKey)
        .setOrigin(0, 1)
        .setDisplaySize(pw, ph)
        .setScrollFactor(0)
        .setDepth(2002);
      this.objs.push(portrait);
      textX = m + 16 + pw + 18;
    }

    const label = this.scene.add
      .text(textX, boxTop + 12, this.name, {
        fontFamily: 'monospace',
        fontSize: big ? '20px' : '18px',
        color: '#ffd54a',
      })
      .setScrollFactor(0)
      .setDepth(2001);
    const body = this.scene.add
      .text(textX, boxTop + (big ? 42 : 48), '', {
        fontFamily: 'monospace',
        fontSize: big ? '26px' : '23px',
        color: '#ffffff',
        wordWrap: { width: w - textX - m - 18 },
      })
      .setScrollFactor(0)
      .setDepth(2001);
    const hint = this.scene.add
      .text(w - m - 14, h - m - 12, last ? '▼ space' : '▶ space', {
        fontFamily: 'monospace',
        fontSize: big ? '13px' : '15px',
        color: '#9aa0a8',
      })
      .setOrigin(1, 1)
      .setScrollFactor(0)
      .setDepth(2001);

    this.objs.push(label, body, hint);
    this.typeLine(body, this.lines[this.index], hint);
  }

  // Typewriter: reveal `full` one character every TYPE_MS ms. The text is laid
  // out with the full line first (then emptied), so word-wrap never jumps.
  typeLine(body, full, hint) {
    this.stopTyping();
    body.setText(full);
    const wrapped = body.getWrappedText(full).join('\n');
    body.setText('');
    this.typingBody = body;
    this.typingFull = wrapped;
    this.typingHint = hint;
    hint.setVisible(false);
    let i = 0;
    this.typing = this.scene.time.addEvent({
      delay: TYPE_MS,
      loop: true,
      callback: () => {
        i += 1;
        body.setText(wrapped.slice(0, i));
        if (i >= wrapped.length) this.finishTyping();
      },
    });
  }

  stopTyping() {
    if (this.typing) this.typing.remove(false);
    this.typing = null;
  }

  finishTyping() {
    this.stopTyping();
    if (this.typingBody?.active) this.typingBody.setText(this.typingFull);
    if (this.typingHint?.active) this.typingHint.setVisible(true);
  }

  renderChoice() {
    this.stopTyping();
    this.objs.forEach((o) => o.destroy());
    this.objs = [];
    const cam = this.scene.cameras.main;
    const w = cam.width;
    const h = cam.height;
    const m = 20;
    const bh = Math.max(149, 66 + this.options.length * 31); // grows with the options (sizes +20%)
    const boxTop = h - m - bh;

    const bg = this.scene.add
      .rectangle(w / 2, h - m - bh / 2, w - m * 2, bh, 0x0d0f17, 0.92)
      .setScrollFactor(0)
      .setDepth(2000)
      .setStrokeStyle(3, 0xffffff, 0.85);
    this.objs.push(bg);

    let textX = m + 18;
    if (this.portraitKey && this.scene.textures.exists(this.portraitKey)) {
      const src = this.scene.textures.get(this.portraitKey).getSourceImage();
      const ph = Math.min(bh, 149) * 1.95;
      const pw = (src.width / src.height) * ph;
      const portrait = this.scene.add
        .image(m + 16, h - m - 4, this.portraitKey)
        .setOrigin(0, 1)
        .setDisplaySize(pw, ph)
        .setScrollFactor(0)
        .setDepth(2002);
      this.objs.push(portrait);
      textX = m + 16 + pw + 18;
    }

    const prompt = this.scene.add
      .text(textX, boxTop + 12, this.prompt, {
        fontFamily: 'monospace',
        fontSize: '19px',
        color: '#ffd54a',
      })
      .setScrollFactor(0)
      .setDepth(2001);
    this.objs.push(prompt);

    this.options.forEach((opt, i) => {
      const selected = i === this.sel;
      const t = this.scene.add
        .text(textX + 8, boxTop + 52 + i * 31, `${selected ? '▶ ' : '   '}${opt}`, {
          fontFamily: 'monospace',
          fontSize: '22px',
          color: selected ? '#ffd54a' : '#ffffff',
        })
        .setScrollFactor(0)
        .setDepth(2001);
      this.objs.push(t);
    });
  }

  hide() {
    this.stopTyping();
    this.open = false;
    this.objs.forEach((o) => o.destroy());
    this.objs = [];
  }
}
