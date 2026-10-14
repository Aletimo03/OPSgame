// js/scenes/WorldScene.js
// One scene that can render ANY map from the registry and warp between them.
// Switching maps = restart this scene with new { mapKey, spawnName } data.

import {
  TILE, TILES, PLAYER, DOOR_WIDTH, BATTLE_BG_KEY, BATTLE_BG_PATH, CAMERA_ZOOM, CAMERA_MARGIN,
  SEAT_HEAL_PER_SEC, DEFEAT_RESPAWN,
} from '../config.js';
import { drawMap, drawStairs, buildWallColliders } from '../core/MapRenderer.js';
import {
  preparePlayerTexture,
  createPlayerAnims,
  movePlayer,
  idleFrame,
  feetY,
  feetCenterY,
} from '../core/playerSprite.js';
import { createNpcs, updateNpcs, stopNpcs, freezeNpc, faceNpcToPlayer, Dialogue } from '../core/npcs.js';
import { resolveInteraction, CHARACTERS, baseStats } from '../core/characters.js';
import { MAPS, START_MAP } from '../../maps/index.js';
import { questState } from '../story/questState.js';
import { CHAPTERS, advanceChapterIfDone, activeChapter, activeQuest, isStoryComplete } from '../story/chapters.js';
import { QuestTracker } from '../story/QuestTracker.js';
import { Inventory } from '../ui/Inventory.js';
import { PauseMenu } from '../ui/PauseMenu.js';
import { Phone } from '../ui/Phone.js';
import { PhoneHud } from '../ui/PhoneHud.js';
import { questNpcIds } from '../story/questGuide.js';
import { addAffinity } from '../story/affinity.js';
import { EVENTS } from '../story/events.js';
import { FRIDGE, fridgeOpen, holdingCheese, fridgeCleaned, throwCheese } from '../story/fridge.js';
import { advanceClock, clockNow, fmt, nightAlpha, phaseIcon } from '../story/clock.js';
import { INVESTIGATION, investigationOpen, clueFound, cluesFound, findClue } from '../story/investigation.js';
import {
  SHOP_KEEPER, sideStepFor, startSide, completeSide, findSideThing, sideState, sideFound, shopStock, buy,
} from '../story/sideQuests.js';
import { KINDS as COLLECTIBLE_KINDS, collectionStatus, foundFlag, isFound } from '../story/collectibles.js';
import { Minimap } from '../ui/Minimap.js';
import { loadAudio, attachAudio } from '../core/audio.js';
import { writeSave, clearSave } from '../core/save.js';
import { propColliders, propBaseY } from '../core/props.js';

const AUTOSAVE_MS = 4000; // position autosave interval (progress saves immediately)
let unloadHooked = false; // the tab-close save listener is registered once per page

export default class WorldScene extends Phaser.Scene {
  constructor() {
    super('WorldScene');
  }

  init(data) {
    this.inCutscene = false;
    this.talkingTo = null;
    this.mapKey = data.mapKey || START_MAP;
    this.spawnName = data.spawnName || 'default';
    this.spawnPos = data.spawnPos || null; // exact pixel position (only when continuing a save)
    this.spawnFacing = data.facing || 'down';
    this.warpLocked = false;
    this.restarting = false; // true between "Ricomincia da capo" and the scene restart
    this.notice = data.notice || null; // one-off banner on arrival (e.g. after a defeat)
    this.seated = null; // the seat the player is sitting on, if any
    this.healAcc = 0;   // fractional HP regenerated while seated
  }

  preload() {
    const map = MAPS[this.mapKey];

    this.playerLoaded = true;
    this.load.once('loaderror', (file) => {
      if (file.key === PLAYER.SPRITE_KEY) this.playerLoaded = false;
    });
    this.load.image(PLAYER.SPRITE_KEY, PLAYER.SPRITE_PATH);

      // Clean, direct load using your new config settings
      if (!this.textures.exists(PLAYER.PORTRAIT_KEY)) {
          this.load.image(PLAYER.PORTRAIT_KEY, PLAYER.PORTRAIT_PATH);
      }


    // Protagonist character data (stats + battle moves).
    if (!this.cache.json.exists(`${PLAYER.SPRITE_KEY}-data`)) {
      this.load.json(`${PLAYER.SPRITE_KEY}-data`, `assets/characters/${PLAYER.SPRITE_KEY}/character.json`);
    }

    // NPC placement now lives in each character's JSON (locations per chapter),
    // which we can't read until after the loader runs — so load EVERY
    // character's art + portrait + JSON up front (all cached globally, so it's
    // a one-time cost). createNpcs then spawns whoever belongs in this map for
    // the active chapter.
    CHARACTERS.forEach((folder) => {
      if (!this.textures.exists(folder)) {
        this.load.image(folder, `assets/characters/${folder}/player.png`);
      }
      const pKey = folder + '-portrait';
      if (!this.textures.exists(pKey)) {
        this.load.image(pKey, `assets/characters/${folder}/portrait.png`);
      }
      const dKey = `${folder}-data`;
      if (!this.cache.json.exists(dKey)) {
        this.load.json(dKey, `assets/characters/${folder}/character.json`);
      }
    });

    // Optional staircase image asset (overrides the drawn version).
    if (map?.stairs?.image && !this.textures.exists(map.stairs.imageKey)) {
      this.load.image(map.stairs.imageKey, map.stairs.image);
    }

    // Room prop images (bed, desk, etc.).
    (map?.props || []).forEach((p) => {
      if (!this.textures.exists(p.key)) this.load.image(p.key, p.path);
    });
    if (!this.textures.exists(BATTLE_BG_KEY)) {
          this.load.image(BATTLE_BG_KEY, BATTLE_BG_PATH);
          console.log("background loaded");
      }

    // Soundtrack + sound effects (declared in js/core/audio.js).
    loadAudio(this);
  }

  create() {
    const map = MAPS[this.mapKey];
    if (!map) {
      console.error(`[OPSgame] unknown map "${this.mapKey}"`);
      return;
    }
    this.map = map;

    // Explore quests: record entering this map, then roll the story forward if
    // that completed the active quest. Done BEFORE NPCs/tracker are built so
    // they reflect the (possibly advanced) chapter.
    const chapterBefore = questState.activeChapter;
    questState.visit(this.mapKey);
    advanceChapterIfDone();

    const grid = map.grid;
    const cols = grid[0].length;
    const rows = grid.length;
    const worldW = cols * TILE;
    const worldH = rows * TILE;

    // Map visuals + colliders.
    drawMap(this, grid, map.theme);
    if (map.stairs) drawStairs(this, map.stairs);

    // Room labels (for floor-plan maps).
    (map.labels || []).forEach((l) => {
      this.add
        .text(l.tx * TILE, l.ty * TILE, l.text, {
          fontFamily: 'monospace',
          fontSize: '20px',
          color: '#d23b3b',
          fontStyle: 'bold',
        })
        .setOrigin(0.5)
        .setDepth(2);
    });
    this.physics.world.setBounds(0, 0, worldW, worldH);
    this.walls = buildWallColliders(this, grid);
    this.setupStairsAccess(map); // restrict which side the stairs are mounted from

    // Static room props (bed, desk, etc.), optionally solid, depth-sorted vs characters.
    this.sortBoxes = []; // y-sorted props, for characterDepth()
    this.propShown = new Set();
    (map.props || []).forEach((p) => {
      // `onlyIn`: shown only in those chapters (e.g. the aperitivo on the table).
      // Checked on map entry, so it stays until you leave the room.
      if (p.onlyIn && !p.onlyIn.includes(questState.activeChapter)) return;
      this.propShown.add(p);
      const px = p.tx * TILE;
      const py = p.ty * TILE;
      const spr = this.add.image(px, py, p.key).setOrigin(0, 0);
      let dw, dh;
      if (p.w != null) {
        dw = p.w * TILE;
        dh = p.h != null ? p.h * TILE : dw * (spr.height / spr.width);
        spr.setDisplaySize(dw, dh);
      } else {
        dw = spr.width;
        dh = spr.height;
      }
      // Collision boxes (tiles): `colliders` (several, e.g. a sofa's back +
      // armrests), else `collider`, else the whole display box.
      const boxes = propColliders(p, dw / TILE, dh / TILE);
      // Depth = the prop's base line (its lowest collider edge, or `baseY`).
      // Characters depth-sort on their FEET (feetY), so one whose feet are above
      // that line is drawn behind the prop — you can walk behind it.
      // `ysort: false` keeps the prop under every character.
      const baseY = propBaseY(p, dw / TILE, dh / TILE);
      spr.setDepth(p.ysort === false ? 1 : baseY * TILE);
      if (p.ysort !== false) {
        boxes.forEach((c) => this.sortBoxes.push({
          x0: c.tx * TILE, x1: (c.tx + c.w) * TILE, y0: c.ty * TILE, base: baseY * TILE,
        }));
      }
      if (p.solid) {
        boxes.forEach((c) => {
          const zone = this.add.zone((c.tx + c.w / 2) * TILE, (c.ty + c.h / 2) * TILE, c.w * TILE, c.h * TILE);
          this.physics.add.existing(zone, true);
          this.walls.add(zone);
        });
      }
    });

    // Player frames.
    const { frameW, frameH } = preparePlayerTexture(this, this.playerLoaded);
    this.frameW = frameW;
    this.frameH = frameH;

    // Spawn position: the exact saved spot when continuing a save, otherwise
    // the named spawn for the door we arrived through.
    const spawn = map.spawns[this.spawnName] || map.spawns.default;
    this.player = this.physics.add.sprite(
      this.spawnPos ? this.spawnPos.x : spawn.tx * TILE + TILE / 2,
      this.spawnPos ? this.spawnPos.y : spawn.ty * TILE + TILE / 2,
      PLAYER.SPRITE_KEY,
      idleFrame(this.spawnFacing)
    );
    this.player.facing = this.spawnFacing;
    this.player.setScale(PLAYER.SCALE);
    this.player.setDepth(this.characterDepth(this.player));
    this.player.setCollideWorldBounds(true);
    const bw = frameW * 0.5;
    const bh = frameH * 0.28;
    this.player.body.setSize(bw, bh);
    this.player.body.setOffset((frameW - bw) / 2, frameH - bh - frameH * 0.04);

    createPlayerAnims(this);
    this.physics.add.collider(this.player, this.walls);

    // NPCs (solid, interactable) + dialogue box.
    this.npcs = createNpcs(this, map);
    // A bobbing "!" over every NPC the active quest still needs.
    this.questMarks = this.npcs.list.map((npc) => {
      const t = this.add
        .text(npc.sprite.x, npc.sprite.y, '!', {
          fontFamily: 'monospace', fontSize: '30px', fontStyle: 'bold',
          color: '#ffd54a', stroke: '#000000', strokeThickness: 6,
        })
        .setOrigin(0.5, 1)
        .setDepth(900000) // over every character/prop and the night veil (world camera), under the HUD
        .setVisible(false);
      t.bob = 0;
      this.tweens.add({ targets: t, bob: -8, duration: 420, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      return { npc, t };
    });
    this.refreshQuestMarks();
    this.physics.add.collider(this.player, this.npcs.group);
    this.dialogue = new Dialogue(this);

    // Warp pads: an overlap zone on each door tile.
    this.setupWarps(map);
    this.drawDoorPlates(map);

    // Camera.
    this.worldW = worldW;
    this.worldH = worldH;
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setRoundPixels(true);
    this.cameras.main.setZoom(CAMERA_ZOOM);
    this.fitCameraBounds();
    this.scale.on('resize', this.fitCameraBounds, this);
    this.events.once('shutdown', () => this.scale.off('resize', this.fitCameraBounds, this));
    this.cameras.main.fadeIn(220);
    this.setupUiCamera();

    // Input.
    // Arrows and WASD both move: `this.cursors.<dir>.isDown` is true if either
    // key is held; use justPressed(dir) instead of JustDown for taps.
    const arrows = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys({ up: 'W', left: 'A', down: 'S', right: 'D' });
    this.cursors = { space: arrows.space, shift: arrows.shift };
    for (const d of ['up', 'down', 'left', 'right']) {
      const a = arrows[d], w = this.wasd[d];
      this.cursors[d] = { arrow: a, wasd: w, get isDown() { return a.isDown || w.isDown; } };
    }
    this.spaceGuard = false; // set true by BattleScene on exit so the closing space doesn't re-interact

    // Clock (top-left): in-game time + day/night icon (js/story/clock.js).
    this.clockText = this.add
      .text(10, 10, '', {
        fontFamily: 'monospace',
        fontSize: '18px',
        color: '#ffffff',
        fontStyle: 'bold',
        backgroundColor: 'rgba(0,0,0,0.55)',
        padding: { x: 8, y: 4 },
      })
      .setScrollFactor(0)
      .setDepth(1000000);
    // Night: a dark-blue veil over the world only (world camera, scroll 1),
    // under the HUD and the "!" markers; its alpha follows the clock.
    this.nightVeil = this.add
      .rectangle(-50 * TILE, -50 * TILE, (map.grid[0].length + 100) * TILE, (map.grid.length + 100) * TILE, 0x0b1030, 1)
      .setOrigin(0, 0)
      .setDepth(880000)
      .setAlpha(0);
    this.lastClockMin = null;
    this.updateClock();

    // Tiny HUD label so you always know which room you're in.
    this.roomLabel = this.add
      .text(10, 48, map.name, {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#ffffff',
        backgroundColor: 'rgba(0,0,0,0.45)',
        padding: { x: 6, y: 3 },
      })
      .setScrollFactor(0)
      .setDepth(1000000);

    // Key reminder, bottom-left (hidden while a dialogue box is up).
    this.keyHints = this.add
      .text(0, 0, 'WASD/frecce muovi · Spazio parla/siedi · I zaino · P telefono · M mappa · Esc menu', {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#e8eaee',
        backgroundColor: 'rgba(0,0,0,0.45)',
        padding: { x: 6, y: 3 },
        wordWrap: { width: 10000 },
      })
      .setOrigin(0, 1)
      .setScrollFactor(0)
      .setDepth(1500);

    // Active-quest checklist, pinned to the top-right.
    this.questTracker = new QuestTracker(this);
    // Phone icon under it, with an unread-messages badge and the [P] hint.
    this.phoneHud = new PhoneHud(this, this.questTracker);
    this.layoutHud();
    this.scale.on('resize', this.layoutHud, this);
    this.events.once('shutdown', () => this.scale.off('resize', this.layoutHud, this));

    // Overlays: bag (I, also the only place HP is shown), phone (P), map (M).
    this.inventory = new Inventory(this, {
      getHp: () => {
        const max = this.heroMaxHp();
        return { hp: questState.currentHp(max), max };
      },
    });
    this.phone = new Phone(this);
    this.minimap = new Minimap(this);

    // Esc menu — resume or restart from scratch.
    this.pauseMenu = new PauseMenu(this, { onRestart: () => this.newGame() });

    // Entering this map completed an explore chapter → announce it.
    if (questState.activeChapter !== chapterBefore) this.announceChapter();
    else this.time.delayedCall(500, () => this.showChapterCard()); // first time in this chapter (e.g. a new game)
    this.time.delayedCall(900, () => this.storyIntros());
    this.time.delayedCall(1300, () => this.playEvents());
    if (this.notice) this.showBanner(this.notice, 0.28);

    // Autosave: now (map entry), every few seconds (position), and on tab close.
    this.saveGame();
    this.time.addEvent({ delay: AUTOSAVE_MS, loop: true, callback: () => this.saveGame() });
    if (!unloadHooked) {
      unloadHooked = true;
      // Scene restarts reuse this same instance, so `this` stays valid.
      window.addEventListener('beforeunload', () => this.saveGame());
    }

    // Soundtrack — plays the WorldScene theme, adopting the already-playing
    // instance across map warps so it never restarts.
    attachAudio(this);
    this.audio.playSceneMusic();
  }

  // True once per tap of an arrow OR its WASD twin. Reads both keys, so a tap
  // of one never leaves the other stuck "just down".
  justPressed(dir) {
    const J = Phaser.Input.Keyboard.JustDown;
    const c = this.cursors[dir];
    const a = J(c.arrow);
    const w = J(c.wasd);
    return a || w;
  }

  // Screen-size-dependent HUD: key hints (wrap on narrow windows) + tracker.
  layoutHud() {
    const cam = this.cameras.main;
    this.keyHints.setWordWrapWidth(Math.max(120, cam.width - 20));
    this.keyHints.setPosition(10, cam.height - 10);
    this.questTracker.refresh();
    this.phoneHud.refresh();
  }

  // Camera bounds = the map plus CAMERA_MARGIN tiles all round. On an axis where
  // that's still smaller than what the (zoomed) camera shows, widen the bounds
  // symmetrically so the map sits centred instead of in the top-left corner.
  // Re-run on window resize (the visible area changes).
  fitCameraBounds() {
    if (this.inCutscene) return; // re-run by cutsceneEnd at the normal zoom
    const cam = this.cameras.main;
    const viewW = cam.width / cam.zoom;
    const viewH = cam.height / cam.zoom;
    const m = CAMERA_MARGIN * TILE;
    let x = -m, y = -m, w = this.worldW + 2 * m, h = this.worldH + 2 * m;
    if (w < viewW) { x -= (viewW - w) / 2; w = viewW; }
    if (h < viewH) { y -= (viewH - h) / 2; h = viewH; }
    cam.setBounds(x, y, w, h);
  }

  // The world camera is zoomed (CAMERA_ZOOM), which would also shrink and shift
  // the HUD. So screen-fixed objects (scrollFactor 0: tracker, room label,
  // dialogue, bag, menus, banners) are drawn by a second, unzoomed camera, and
  // each camera ignores the other's objects. New objects are routed once per
  // frame, after update and before render — by then their scrollFactor is set.
  setupUiCamera() {
    const world = this.cameras.main;
    const ui = this.cameras.add(0, 0, this.scale.width, this.scale.height).setName('ui');
    const route = (go) => {
      if (go.scrollFactorX === 0 && go.scrollFactorY === 0) world.ignore(go);
      else ui.ignore(go);
    };
    this.children.list.forEach(route); // everything created so far (map, props, player…)

    const pending = [];
    const onAdded = (go) => pending.push(go);
    const flush = () => pending.splice(0).forEach(route);
    this.events.on(Phaser.Scenes.Events.ADDED_TO_SCENE, onAdded);
    this.events.on(Phaser.Scenes.Events.POST_UPDATE, flush);
    // Restarts (warps) reuse this scene instance: drop the listeners each time.
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.events.off(Phaser.Scenes.Events.ADDED_TO_SCENE, onAdded);
      this.events.off(Phaser.Scenes.Events.POST_UPDATE, flush);
    });
  }

  // Wall off every approach to the stairs except the `enter` side (plus the
  // bottom), so they read as a one-way up/down ramp. The footprint itself stays
  // walkable; only the surrounding edges are blocked. (enter = 'left' | 'right')
  setupStairsAccess(map) {
    const s = map.stairs;
    if (!s || !s.enter) return;
    const T = TILE;
    const addWall = (tx, ty, w, h) => {
      const zone = this.add.zone((tx + w / 2) * T, (ty + h / 2) * T, w * T, h * T);
      this.physics.add.existing(zone, true);
      this.walls.add(zone);
    };
    addWall(s.tx, s.ty + s.h, s.w, 1); // bottom edge
    if (s.enter === 'left') addWall(s.tx + s.w, s.ty, 1, s.h); // block the right edge
    else addWall(s.tx - 1, s.ty, 1, s.h); // block the left edge
  }

  setupWarps(map) {
    this.warps = this.physics.add.staticGroup();
    // Warps stay disarmed until the player steps off every door — prevents
    // instantly bouncing back when you spawn on/next to the door you arrived
    // through.
    this.canWarp = false;

    (map.warps || []).forEach((w) => {
      const tilesW = w.w || DOOR_WIDTH; // width in tiles (doorway or stairs)
      const tilesH = w.h || 1; // height in tiles (>1 for stairs)
      const cx = (w.tx + tilesW / 2) * TILE; // centre of the region
      const cy = (w.ty + tilesH / 2) * TILE;
      const zone = this.add.zone(cx, cy, tilesW * TILE, tilesH * TILE);
      this.physics.add.existing(zone, true);
      zone.warp = w;
      this.warps.add(zone);
    });

    this.physics.add.overlap(this.player, this.warps, (player, zone) =>
      this.doWarp(zone.warp)
    );
  }

  // A small plate on the wall beside every door that leads to a bedroom (its
  // number) or a shared room (an icon), so you can tell the doors apart.
  drawDoorPlates(map) {
    const ICON = {
      'base-kitchen': '🍳', 'first-floor-kitchen': '🍳', 'first-floor-bathroom': '🚿',
      'laundry-room': '🧺', 'trashbin-room': '🗑️', entrance: '🚪',
    };
    const g = map.grid;
    const used = new Set(); // one plate per wall tile (doors in a corner share neighbours)
    const free = (x, y) => g[y]?.[x] === TILES.WALL && !used.has(`${x},${y}`);
    for (const w of map.warps || []) {
      const room = /^room-(\d+)$/.exec(w.to);
      const label = room ? room[1] : ICON[w.to];
      if (!label) continue;
      const tw = w.w || DOOR_WIDTH;
      const th = w.h || 1;
      // Horizontal door → plate on the free wall tile to its left (else right);
      // vertical door → above it (else below). Skip a tile another plate took.
      const tries = tw >= th
        ? [[w.tx - 1, w.ty], [w.tx + tw, w.ty]]
        : [[w.tx, w.ty - 1], [w.tx, w.ty + th]];
      const spot = tries.find(([x, y]) => free(x, y));
      if (!spot) continue;
      used.add(`${spot[0]},${spot[1]}`);
      const cx = (spot[0] + 0.5) * TILE;
      const cy = (spot[1] + 0.5) * TILE;
      const t = this.add.text(cx, cy, label, {
        fontFamily: 'monospace', fontSize: room ? '22px' : '24px', fontStyle: 'bold', color: '#1d1d24',
      }).setOrigin(0.5).setDepth(4);
      const pw = Math.max(TILE * 0.8, t.width + 12);
      this.add.rectangle(cx, cy, pw, TILE * 0.72, 0xf2e3b3, 1)
        .setStrokeStyle(3, 0x6b4f2a, 1).setDepth(3);
    }
  }

  // Door assist: walking towards a doorway while a little off-centre would
  // snag on the wall corner. Within ~1 tile of a door (sideways) and about to
  // enter it, add a sideways slide towards the door's centre, so you don't
  // have to line up perfectly.
  assistDoor() {
    const b = this.player.body;
    const vx = b.velocity.x;
    const vy = b.velocity.y;
    if (!vx && !vy) return;
    for (const z of this.warps.getChildren()) {
      const w = z.warp;
      const x0 = w.tx * TILE;
      const y0 = w.ty * TILE;
      const tw = (w.w || DOOR_WIDTH) * TILE;
      const th = (w.h || 1) * TILE;
      if (vy && tw >= th) {        // horizontal door, walking up/down into it
        const ahead = vy > 0 ? y0 - b.bottom : b.top - (y0 + th);
        const dx = x0 + tw / 2 - b.center.x;
        if (ahead < TILE * 0.8 && ahead > -th && Math.abs(dx) < tw / 2 + TILE && Math.abs(dx) > 2) {
          b.setVelocityX(Math.sign(dx) * Math.min(Math.abs(vy), Math.abs(dx) * 12));
          return;
        }
      } else if (vx && th > tw) {  // vertical door, walking left/right into it
        const ahead = vx > 0 ? x0 - b.right : b.left - (x0 + tw);
        const dy = y0 + th / 2 - b.center.y;
        if (ahead < TILE * 0.8 && ahead > -tw && Math.abs(dy) < th / 2 + TILE && Math.abs(dy) > 2) {
          b.setVelocityY(Math.sign(dy) * Math.min(Math.abs(vx), Math.abs(dy) * 12));
          return;
        }
      }
    }
  }

  doWarp(warp) {
    if (!this.canWarp || this.warpLocked) return;
    this.warpLocked = true;
    this.cameras.main.fadeOut(180);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.restart({ mapKey: warp.to, spawnName: warp.toSpawn || 'default' });
    });
  }

  update(time, delta) {
    if (!this.player) return;
    questState.stats.playMs += delta; // play time, for the ending screen
    advanceClock(delta);
    this.updateClock();
    if (!this.inCutscene) this.phoneHud.update(); // badge follows new chapters / reading the phone
    for (const { npc, t } of this.questMarks) {
      t.setPosition(npc.sprite.x, npc.sprite.y - npc.sprite.displayHeight * 0.5 + 6 + t.bob);
    }
    const maxHp = this.heroMaxHp();

    // Overlays. At most one is open; none opens during a dialogue or a warp.
    // The Esc menu can only open when no other overlay owns the screen, so Esc
    // still closes those first (each overlay reads Esc only while open).
    const overlays = [this.inventory, this.phone, this.minimap];
    const busy = this.dialogue.open || this.warpLocked;
    if (busy) {
      // Drop overlay key presses made during a dialogue/warp: Phaser keeps a
      // press "just down" until it's read, so it would pop the overlay open
      // the moment the dialogue closes.
      const J = Phaser.Input.Keyboard.JustDown;
      [this.pauseMenu.escKey, this.inventory.iKey, this.phone.key, this.minimap.key].forEach((k) => J(k));
    }
    const canPause = !busy && !overlays.some((o) => o.open);
    if (this.pauseMenu.update(canPause)) {
      this.holdPlayer();
      stopNpcs(this.npcs, time);
      return;
    }
    for (const o of overlays) {
      const othersOpen = overlays.some((x) => x !== o && x.open);
      if (o.update(!busy && !othersOpen)) {
        this.holdPlayer();
        stopNpcs(this.npcs, time);
        return;
      }
    }

    const pressedSpace = Phaser.Input.Keyboard.JustDown(this.cursors.space);
    this.keyHints.setVisible(!this.dialogue.open && !this.inCutscene);

    // While a dialogue is open, freeze movement; space closes it.
    // Normal chat: only Zio Nick and the person he talks to stand still; the
    // others keep strolling. In a cutscene everyone stands still, listening.
    if (this.dialogue.open) {
      this.holdPlayer();
      if (this.inCutscene) stopNpcs(this.npcs, time);
      else updateNpcs(this, this.npcs, time, this.talkingTo ? new Set([this.talkingTo]) : null);
      if (this.dialogue.mode === 'choice') {
        if (this.justPressed('up')) this.dialogue.moveSelection(-1);
        else if (this.justPressed('down')) this.dialogue.moveSelection(1);
        else if (pressedSpace) this.dialogue.confirm();
      } else if (pressedSpace) {
        this.dialogue.advance(); // next line, or close on the last
      }
      return;
    }

    if (this.talkingTo) { // the chat just ended: let them stand a moment, then stroll
      freezeNpc(this.talkingTo, time + 700);
      this.talkingTo = null;
    }

    if (this.warpLocked || this.inCutscene) { // cutscene: nobody moves between lines either
      this.holdPlayer();
      stopNpcs(this.npcs, time);
      return;
    }

    // Sitting: regain HP; any arrow or Space stands up. NPCs keep strolling.
    if (this.seated) {
      this.player.body.setVelocity(0);
      updateNpcs(this, this.npcs, time);
      const moved = ['left', 'right', 'up', 'down'].map((d) => this.justPressed(d)).some(Boolean);
      if (moved || pressedSpace) this.standUp();
      else this.restTick(delta, maxHp);
      return;
    }

    movePlayer(this.player, this.cursors);
    this.assistDoor(); // slide into a doorway you're slightly off-centre from
    this.player.setDepth(this.characterDepth(this.player)); // vs NPCs and props, by feet
    updateNpcs(this, this.npcs, time); // NPCs stroll around so they feel alive

    if (this.spaceGuard && !this.cursors.space.isDown) this.spaceGuard = false;
    if (pressedSpace && !this.spaceGuard) this.tryInteract();

    // Arm warps once the player is clear of every door zone.
    if (!this.canWarp && !this.physics.overlap(this.player, this.warps)) {
      this.canWarp = true;
    }
  }

  // Zio Nick stands still: no velocity and no walk animation left running.
  holdPlayer() {
    const p = this.player;
    p.body.setVelocity(0);
    if (p.anims.isPlaying) {
      p.anims.stop();
      p.setFrame(idleFrame(p.facing));
    }
  }

  // Talk to the NPC the player is facing (must be adjacent).
  tryInteract() {
    const dir = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
    const [dx, dy] = dir[this.player.facing] || [0, 1];
    const c = this.player.body.center;
    const px = c.x + dx * TILE; // a tile ahead of the player's feet
    const py = c.y + dy * TILE;

    let target = null;
    let best = TILE * 1.1; // must be roughly one tile in front
    for (const npc of this.npcs.list) {
      const f = npc.sprite.body.center;
      const d = Phaser.Math.Distance.Between(px, py, f.x, f.y);
      if (d < best) {
        best = d;
        target = npc;
      }
    }
    if (!target) {
      // Nobody in front: sit if standing on a seat, else look at the furniture ahead.
      if (!this.trySit()) this.tryExamine(px, py);
      return;
    }
    faceNpcToPlayer(target, this.player.facing, this.time.now);
    this.talkingTo = target; // stands still for the whole conversation (update)
    this.audio?.playSfx('npc-talk'); // interaction blip (no-op until a file is added)
    const firstToday = !questState.didIn('greeted', target.id); // first chat this chapter → +1 heart
    questState.greet(target.id); // mark NPC as spoken-to
    if (firstToday) this.bumpAffinity(target.id, 1);

    // Resolve what this character says/does for the CURRENT chapter, live from
    // their JSON. battle/item only ever come from a chapter entry, so a fight
    // can never trigger in a chapter where it wasn't authored.
    const act = resolveInteraction(target.data);

    if (act.battle) {
      // The chapter this encounter belongs to — captured BEFORE onProgress(),
      // which may roll the story forward (greet-based objectives like ch2).
      const ch = questState.activeChapter;
      this.onProgress();
      if (questState.didIn('defeated', target.id, ch)) {
        // Already beaten in this chapter — no rematch.
        this.dialogue.show(
          target.name,
          act.dialogueAfter || 'Mi hai già battuto, lasciami in pace...',
          target.portraitKey
        );
        return;
      }
      // Lines first, then a branching prompt; either choice leads to the fight.
      this.dialogue.show(target.name, act.dialogue, target.portraitKey, () => {
        const b = act.battle;
        const fight = (opts) => this.dialogue.ask(target.name, b.prompt, b.options, target.portraitKey, () =>
          this.startBattle(target, ch, opts)
        );
        // The melon investigation's accusation (final only): present a clue first.
        const inv = INVESTIGATION;
        const clues = cluesFound();
        if (target.id === inv.accused && ch === inv.finalChapter && clues.length) {
          this.dialogue.ask('🔍 Indagine', 'Presenta una prova', [...clues.map((c) => c.name), 'Nessuna prova'], null, (i) => {
            const c = clues[i];
            if (!c) return fight();
            if (c.key) {
              this.dialogue.show('🔍 Indagine', [c.text, `${target.name} impallidisce. La prova lo inchioda!`], null,
                () => fight({ enemyHpFrac: inv.bonusFrac }));
            } else {
              const max = this.heroMaxHp();
              questState.setHp(Math.max(1, questState.currentHp(max) - inv.penaltyHp), max);
              this.dialogue.show('🔍 Indagine', [c.text, `Non prova niente. ${target.name} sorride. (−${inv.penaltyHp} HP)`], null,
                () => fight());
            }
          });
          return;
        }
        fight();
      });
    } else if (act.quiz) {
      // Quiz-based objective — the chapter advances only on a CORRECT answer.
      const q = act.quiz;
      const already = questState.didIn('solved', target.id);
      if (already) {
        // Already passed — just replay a closing line, no re-quiz.
        this.dialogue.show(
          target.name,
          act.dialogueAfter || 'Hai già superato la prova!',
          target.portraitKey
        );
      } else {
        // Intro lines → branching question → grade the chosen option.
        this.dialogue.show(target.name, act.dialogue, target.portraitKey, () => {
          this.dialogue.ask(target.name, q.prompt, q.options, target.portraitKey, (idx) => {
            if (idx === q.answer) {
              questState.solve(target.id);
              this.dialogue.show(target.name, q.correct || 'Esatto!', target.portraitKey, () =>
                this.onProgress()
              );
            } else {
              this.dialogue.show(target.name, q.wrong || 'Sbagliato! Riprova.', target.portraitKey);
            }
          });
        });
      }
    } else if (act.item) {
      // Item-based objective — chapter advances only once the item is given.
      // A permanent item is given once ever; a consumable (`consumable: true`)
      // once per chapter per giver, adding `qty` units.
      const it = act.item;
      const already = it.consumable ? questState.gotGiftFrom(target.id) : questState.hasItem(it.name);
      const lines = already
        ? (act.dialogueAfter || `Hai già ${it.name} con te!`)
        : act.dialogue;
      this.dialogue.show(target.name, lines, target.portraitKey, () => {
        if (already) this.afterTalk(target);
        if (!already) {
          if (it.consumable) questState.addSupply(it, target.id);
          else questState.addItem(it);
          this.onProgress();
          this.inventory.refresh();
          this.showItemReceived(it.consumable ? `${it.name} x${it.qty ?? 1}` : it.name);
        }
      });
    } else {
      this.onProgress();
      this.dialogue.show(target.name, act.dialogue, target.portraitKey, () => this.afterTalk(target));
    }
  }

  // After a plain chat (or an item already given): favours (side quests) and
  // Alessio's shop. Never after battles or quizzes.
  afterTalk(target) {
    const st = sideStepFor(target.id);
    if (st) {
      const q = st.quest;
      if (st.step === 'offer') {
        this.dialogue.show(target.name, q.ask, target.portraitKey, () =>
          this.dialogue.ask(target.name, `Favore: ${q.title}`, ['Ci penso io', 'Ora no'], target.portraitKey, (i) => {
            if (i !== 0) return;
            startSide(q);
            this.showBanner(`★ Nuovo favore: ${q.title}`, 0.28, '#8fd3ff', 0x8fd3ff);
            this.afterSideChange();
          }));
      } else if (st.step === 'remind') {
        this.dialogue.show(target.name, q.remind, target.portraitKey);
      } else {
        this.dialogue.show(target.name, q.thanks, target.portraitKey, () => {
          completeSide(q);
          this.bumpAffinity(q.giver, 2);
          this.showBanner(`★ Favore fatto! +${q.points} punti casa\n(totale ${questState.points})`, 0.28, '#8fd3ff', 0x8fd3ff);
          this.afterSideChange();
        });
      }
      return;
    }
    if (target.id === SHOP_KEEPER) { this.openShop(target); return; }
    if (this.canRematch(target)) this.offerRematch(target);
  }

  // Rematch (character JSON `rematch`, e.g. Gabbo roaming the corridors from
  // chapter 3): a fight for punti casa, once per chapter, no story effect.
  canRematch(npc) {
    const r = npc.data?.rematch;
    if (!r) return false;
    const order = Object.keys(CHAPTERS);
    return order.indexOf(questState.activeChapter) >= order.indexOf(r.from);
  }

  offerRematch(target) {
    const r = target.data.rematch;
    const ch = questState.activeChapter;
    if (questState.didIn('defeated', target.id, ch)) {
      this.dialogue.show(target.name, r.after, target.portraitKey);
      return;
    }
    this.dialogue.ask(target.name, r.prompt, r.options, target.portraitKey, (i) => {
      if (i !== 0) return;
      this.pendingRematch = { id: target.id, ch, reward: r.reward, name: target.name };
      this.startBattle(target, ch);
    });
  }

  // Called from onProgress (BattleScene calls it after a win): pay a rematch.
  payRematch() {
    const r = this.pendingRematch;
    if (!r || !questState.didIn('defeated', r.id, r.ch)) return;
    this.pendingRematch = null;
    questState.points = (questState.points || 0) + r.reward;
    this.bumpAffinity(r.id, 1);
    this.showBanner(`⚔ ${r.name} battuto! +${r.reward} punti casa\n(totale ${questState.points})`, 0.28, '#ff8a65', 0xff8a65);
    this.inventory.refresh();
    this.saveGame();
  }

  // +n hearts with a housemate; a newly unlocked private message gets a banner
  // (the phone badge counts it too).
  bumpAffinity(id, n) {
    const unlocked = addAffinity(id, n);
    if (unlocked.length) {
      const name = this.npcs?.list.find((x) => x.id === id)?.name || id;
      this.time.delayedCall(900, () => this.showBanner(`💬 Nuovo messaggio privato da ${name}\n[P] per leggerlo`, 0.62, '#7CFC8A', 0x25d366));
    }
  }

  afterSideChange() {
    this.refreshQuestMarks();
    this.inventory.refresh();
    this.saveGame();
  }

  // Alessio's shop: spend punti casa (sideQuests.SHOP).
  openShop(target) {
    const stock = shopStock();
    const pts = questState.points || 0;
    const opts = [...stock.map((it) => `${it.name} — ${it.price} punti`), 'Niente'];
    this.dialogue.ask(target.name, `O fra. Shop? (hai ${pts} punti casa)`, opts, target.portraitKey, (i) => {
      const it = stock[i];
      if (!it) return;
      if (!buy(it)) {
        this.dialogue.show(target.name, 'O fra, punti non bastano.', target.portraitKey);
        return;
      }
      this.bumpAffinity(target.id, 1);
      this.inventory.refresh();
      this.saveGame();
      this.showItemReceived(it.consumable ? `${it.name} x${it.qty ?? 1}` : it.name);
    });
  }

  // Zio Nick's own bed (prop `sleep: true`): a short nap, full HP.
  sleepInBed() {
    this.warpLocked = true; // freeze input during the fade
    const cam = this.cameras.main;
    cam.fadeOut(500, 0, 0, 0);
    cam.once('camerafadeoutcomplete', () => {
      questState.heroHp = null; // null = full
      this.saveGame();
      this.time.delayedCall(600, () => {
        cam.fadeIn(500, 0, 0, 0);
        this.warpLocked = false;
        this.showBanner('Zio Nick si fa un pisolino... 💤\nHP al massimo!', 0.28, '#7CFC8A', 0x7cfc8a);
      });
    });
  }

  // Clock HUD + night veil, redrawn once per in-game minute.
  updateClock() {
    const min = Math.floor(clockNow());
    if (min === this.lastClockMin) return;
    this.lastClockMin = min;
    this.clockText.setText(`${phaseIcon(min)} ${fmt(min)}`);
    this.nightVeil.setAlpha(nightAlpha(min));
  }

  // One-off scenes for this map + chapter (js/story/events.js), e.g. Ana's
  // aperitivo. Lines are spoken only by the housemates actually in the room.
  playEvents() {
    if (!this.player?.active) return;
    const ev = EVENTS.find((e) => e.map === this.mapKey && e.chapter === questState.activeChapter
      && !questState.hasFlag(`event:${e.id}`));
    if (!ev) return;
    const busy = this.dialogue.open || this.warpLocked || this.seated
      || [this.inventory, this.phone, this.minimap, this.pauseMenu].some((o) => o?.open);
    if (busy) { this.time.delayedCall(1500, () => this.playEvents()); return; }
    questState.setFlag(`event:${ev.id}`);
    const here = new Map(this.npcs.list.map((n) => [n.id, n]));
    const lines = ev.lines.filter((l) => here.has(l.who));
    this.showBanner(ev.title, 0.2, '#ffd54a', 0xffd54a);
    this.cutsceneStart();
    const step = (i) => {
      if (i >= lines.length) {
        this.cutsceneEnd();
        if (ev.gift) {
          questState.addSupply(ev.gift, null);
          this.inventory.refresh();
          this.showItemReceived(`${ev.gift.name} x${ev.gift.qty ?? 1}`);
        }
        if (ev.hearts) [...new Set(lines.map((l) => l.who))].forEach((id) => this.bumpAffinity(id, ev.hearts));
        this.onProgress(); // an event can be a chapter's objective (flag event:<id>)
        return;
      }
      const n = here.get(lines[i].who);
      this.cutsceneFocus(n, lines[i].text);
      // 0.5 s on the zoomed, turned character, then the big line.
      this.time.delayedCall(500, () =>
        this.dialogue.show(n.name, lines[i].text, n.portraitKey, () => step(i + 1), { big: true }));
    };
    step(0);
  }

  // Cinematic mode for scenes: black bars, the camera leaves the player and
  // zooms in on whoever is talking (cutsceneFocus), then comes back.
  // Hide / show the HUD (clock, room name, tracker, phone icon, key hints).
  setHudVisible(v) {
    [this.clockText, this.roomLabel, this.keyHints, ...(this.questTracker?.objs || []), ...(this.phoneHud?.objs || [])]
      .forEach((o) => o?.setVisible(v));
    if (v) { this.questTracker?.refresh(); this.phoneHud?.refresh(); }
  }

  cutsceneStart() {
    const cam = this.cameras.main;
    this.inCutscene = true;
    this.setHudVisible(false);
    cam.stopFollow();
    const W = this.scale.width;
    const H = this.scale.height;
    // Bars grow from the screen edges (scaleY tween; origin on the outer edge).
    const bar = (y, oy) => this.add.rectangle(0, y, W, Math.round(H * 0.09), 0x000000, 1)
      .setOrigin(0, oy).setScrollFactor(0).setDepth(1900).setScale(1, 0);
    this.cutBars = [bar(0, 0), bar(H, 1)];
    this.tweens.add({ targets: this.cutBars, scaleY: 1, duration: 400, ease: 'Sine.easeOut' });
  }

  cutsceneFocus(npc, text) {
    const cam = this.cameras.main;
    const s = npc.sprite;
    // Turn to face the camera: front idle frame (not back or side).
    s.anims.stop();
    s.setFlipX(false);
    s.setFrame(idleFrame('down'));
    npc.facing = 'down';
    cam.pan(s.x, s.y - s.displayHeight * 0.15, 450, 'Sine.easeInOut', true);
    cam.zoomTo(CAMERA_ZOOM * 1.45, 450, 'Sine.easeInOut', true);
    // A little hop (squash-and-stretch; the physics body owns x/y).
    const base = s.scaleY;
    this.tweens.add({ targets: s, scaleY: base * 1.1, duration: 120, yoyo: true, repeat: 1, ease: 'Sine.easeOut',
      onComplete: () => s.setScale(s.scaleX, base) });
    if (/!/.test(text)) cam.shake(220, 0.005); // exclamations shake the view
  }

  cutsceneEnd() {
    const cam = this.cameras.main;
    cam.zoomTo(CAMERA_ZOOM, 450, 'Sine.easeInOut', true);
    cam.pan(this.player.x, this.player.y, 450, 'Sine.easeInOut', true, (c, p) => {
      if (p < 1) return;
      cam.startFollow(this.player, true, 0.1, 0.1);
      this.inCutscene = false;
      this.setHudVisible(true);
      this.fitCameraBounds(); // bounds were computed for the normal zoom
    });
    const bars = this.cutBars || [];
    this.tweens.add({ targets: bars, scaleY: 0, duration: 350, ease: 'Sine.easeIn', onComplete: () => bars.forEach((b) => b.destroy()) });
    this.cutBars = null;
  }

  // One-off story explanations: the premise at the very start, the
  // investigation when it opens (chapter 3). Waits if something is on screen.
  storyIntros() {
    if (!this.player?.active) return;
    const busy = this.dialogue.open || this.warpLocked || this.seated
      || [this.inventory, this.phone, this.minimap, this.pauseMenu].some((o) => o?.open);
    const want = !questState.hasFlag('premise-seen') && questState.activeChapter === 'chapter-1' ? 'premise'
      : !questState.hasFlag('investigation-intro') && investigationOpen() ? 'investigation' : null;
    if (!want) return;
    if (busy) { this.time.delayedCall(1500, () => this.storyIntros()); return; }
    if (want === 'premise') {
      questState.setFlag('premise-seen');
      this.dialogue.show('🍈 Il caso dei due meloni', INVESTIGATION.premise);
    } else {
      questState.setFlag('investigation-intro');
      this.dialogue.show('🔍 Indagine aperta', INVESTIGATION.intro);
    }
    this.saveGame();
  }

  // Fridge minigame (js/scenes/FridgeScene.js) over the paused world.
  startFridge() {
    this.holdPlayer();
    this.scene.pause();
    this.scene.launch('FridgeScene', { returnScene: 'WorldScene' });
  }

  // Called by FridgeScene after a win: fridge clean, cheese in hand.
  onFridgeDone() {
    fridgeCleaned();
    this.inventory.refresh();
    this.onProgress();
    this.showBanner('🧀 Formaggio ammuffito in mano:\nbuttalo nei bidoni', 0.28, '#ffd54a', 0xffd54a);
  }

  // A collectible hidden in a piece of furniture was found (tryExamine).
  findCollectible(h) {
    questState.setFlag(foundFlag(h.id));
    const st = collectionStatus()[h.kind];
    const k = COLLECTIBLE_KINDS[h.kind] || { name: 'Oggetto', plural: 'Oggetti', icon: '★' };
    const all = st && st.found === st.total;
    this.showBanner(
      `${k.icon} Hai trovato: ${k.name}!\n${st ? `${st.found}/${st.total}` : ''}${all ? ` — ${k.plural} tutti trovati!` : ''}`,
      0.28, '#ffd54a', 0xffd54a
    );
    this.inventory.refresh();
    this.saveGame();
  }

  // Show "!" only over the NPCs the active quest still needs.
  // Blue "?" instead over NPCs with a favour to offer or to hand in.
  refreshQuestMarks() {
    const ids = questNpcIds(this);
    (this.questMarks || []).forEach(({ npc, t }) => {
      const side = sideStepFor(npc.id);
      const sideMark = side && side.step !== 'remind';
      const fight = !ids.has(npc.id) && !sideMark && this.canRematch(npc)
        && !questState.didIn('defeated', npc.id); // ⚔ = rematch available
      t.setText(ids.has(npc.id) ? '!' : fight ? '⚔' : '?');
      t.setColor(ids.has(npc.id) ? '#ffd54a' : fight ? '#ff8a65' : '#8fd3ff');
      t.setVisible(ids.has(npc.id) || !!sideMark || fight);
    });
  }

  // Progress changed: roll the story forward, refresh the HUD and save. Also
  // called by BattleScene after a win. Announces a completed chapter.
  onProgress() {
    const before = questState.activeChapter;
    this.payRematch();
    advanceChapterIfDone();
    this.questTracker?.refresh();
    this.refreshQuestMarks();
    this.saveGame();
    if (questState.activeChapter !== before) this.announceChapter();
    // Last chapter done → the ending, once (the flag is saved).
    if (isStoryComplete() && !questState.hasFlag('ending-seen')) {
      questState.setFlag('ending-seen');
      this.saveGame();
      this.time.delayedCall(900, () => this.showEnding());
    }
  }

  // Credits + run stats over the paused world (EndingScene resumes it).
  showEnding() {
    this.player.body.setVelocity(0);
    this.scene.pause();
    this.scene.launch('EndingScene', { returnScene: 'WorldScene' });
  }

  // "Chapter complete" banner naming the chapter that just started.
  announceChapter() {
    const next = activeChapter();
    this.showBanner(
      `✓ Capitolo completato — partita salvata${next ? `\n${next.title}` : ''}`,
      0.28,
      '#7CFC8A',
      0x7cfc8a
    );    this.time.delayedCall(1400, () => this.showChapterCard());
    this.time.delayedCall(4200, () => this.storyIntros());
    this.time.delayedCall(3600, () => this.playEvents()); // e.g. chapter 7 starting while you're already in the kitchen
  }

  // Big "CAPITOLO N / title / mission" card across the screen, once per chapter
  // (flag `card:<chapter>`, saved). Doesn't block movement; fades out alone.
  showChapterCard() {
    const id = questState.activeChapter;
    const ch = activeChapter();
    if (!ch || questState.hasFlag(`card:${id}`) || isStoryComplete()) return;
    questState.setFlag(`card:${id}`);
    this.saveGame();
    const cam = this.cameras.main;
    const W = cam.width;
    const H = cam.height;
    const num = /(\d+)$/.exec(id)?.[1];
    const quest = activeQuest();
    const objs = [
      this.add.rectangle(W / 2, H * 0.42, W, 150, 0x05060a, 0.88).setStrokeStyle(2, 0xffd54a, 0.6),
      this.add.text(W / 2, H * 0.42 - 46, num ? `CAPITOLO ${num}` : 'CAPITOLO', {
        fontFamily: 'monospace', fontSize: '16px', color: '#9aa0a8', letterSpacing: 6,
      }).setOrigin(0.5),
      this.add.text(W / 2, H * 0.42 - 6, ch.title, {
        fontFamily: 'monospace', fontSize: '30px', color: '#ffd54a', fontStyle: 'bold',
        align: 'center', wordWrap: { width: W - 60 },
      }).setOrigin(0.5),
      this.add.text(W / 2, H * 0.42 + 40, quest ? quest.title : '', {
        fontFamily: 'monospace', fontSize: '15px', color: '#ffffff',
        align: 'center', wordWrap: { width: W - 60 },
      }).setOrigin(0.5),
    ];
    objs.forEach((o) => o.setScrollFactor(0).setDepth(2600000).setAlpha(0));
    this.tweens.add({
      targets: objs, alpha: 1, duration: 450, ease: 'Sine.easeOut',
      onComplete: () => this.tweens.add({
        targets: objs, alpha: 0, delay: 2300, duration: 600,
        onComplete: () => objs.forEach((o) => o.destroy()),
      }),
    });
  }

  // Depth of a character (player or NPC): its feet line, so it sorts against
  // other characters and against props' base lines. Exception (user's call):
  // walking BESIDE a prop never puts you behind it. A character is drawn behind
  // a prop only when its feet are horizontally over the prop's collider (truly
  // behind it); next to it, where the sprites merely overlap, it stays in front.
  characterDepth(s) {
    const feet = feetY(s);
    const half = s.displayWidth / 2; // whole sprite
    const body = s.displayWidth / 4; // collision body = half the frame width
    let d = feet;
    for (const b of this.sortBoxes || []) {
      if (feet >= b.base) continue;                           // already in front
      if (s.x + half < b.x0 || s.x - half > b.x1) continue;   // too far to overlap
      if (feet < b.y0 - s.displayHeight) continue;            // well above it
      const behind = s.x + body > b.x0 && s.x - body < b.x1;
      if (!behind) d = Math.max(d, b.base + 1);               // beside it: stay in front
    }
    return d;
  }

  // Hero max HP right now: base stats from zionick's JSON + item buffs.
  heroMaxHp() {
    const data = this.cache.json.get(`${PLAYER.SPRITE_KEY}-data`) || {};
    return questState.heroStats(baseStats(data)).maxHp;
  }

  // Sit if the player's feet are on a seat of any prop (`props[].seats`).
  trySit() {
    const fx = this.player.x;
    const fy = feetCenterY(this.player);
    for (const p of this.map.props || []) {
      for (const s of p.seats || []) {
        const inside = fx >= s.tx * TILE && fx <= (s.tx + s.w) * TILE
          && fy >= s.ty * TILE && fy <= (s.ty + s.h) * TILE;
        if (inside) {
          this.sitOn(s);
          return true;
        }
      }
    }
    return false;
  }

  // Space facing a piece of furniture with `examine` lines (catalogue): show
  // them. (px, py) = the point one tile ahead of the player's feet; it counts
  // if it falls within ~0.4 tile of one of the prop's colliders.
  tryExamine(px, py) {
    const m = 0.4 * TILE;
    // The fridge task (chapter 4): the right end of the cabinets is the fridge.
    if (fridgeOpen() && this.mapKey === FRIDGE.map) {
      const z = FRIDGE.zone;
      if (px >= z.tx * TILE - m && px <= (z.tx + z.w) * TILE + m && py >= z.ty * TILE - m && py <= (z.ty + z.h) * TILE + m) {
        this.dialogue.show('Frigorifero', FRIDGE.intro, null, () => this.startFridge());
        return true;
      }
    }
    for (const p of this.map.props || []) {
      if (!p.examine?.length && !p.hidden && !p.side) continue;
      if (!this.propShown.has(p)) continue; // not in the room this chapter
      const hit = propColliders(p).some((c) =>
        px >= c.tx * TILE - m && px <= (c.tx + c.w) * TILE + m
        && py >= c.ty * TILE - m && py <= (c.ty + c.h) * TILE + m);
      if (hit && p.furniture === 'trashbins' && holdingCheese()) {
        // Throw the mouldy cheese away (fridge task, chapter 4).
        this.dialogue.show(p.label || 'Bidoni', FRIDGE.throwLines, null, () => {
          throwCheese();
          this.inventory.refresh();
          this.onProgress();
        });
        return true;
      }
      if (hit) {
        const h = p.hidden && !isFound(p.hidden.id) ? p.hidden : null;
        const sideHere = p.side && sideState(p.side) === 'active' && !sideFound(p.side);
        const clueHere = p.clue && investigationOpen() && !clueFound(p.clue);
        const lines = p.examine?.length ? p.examine : ['Frughi un po\'...'];
        this.dialogue.show(p.label || 'Mobile', h || sideHere || clueHere ? [...lines, 'Aspetta... c\'è qualcosa qui!'] : lines, null, () => {
          if (h) this.findCollectible(h);
          if (clueHere) {
            const c = findClue(p.clue);
            if (c) {
              const n = cluesFound().length;
              this.time.delayedCall(10, () => this.dialogue.show('🔍 Indizio', [c.text, `Indizi trovati: ${n}. Sono nello zaino (I).`]));
              this.saveGame();
            }
          }
          if (sideHere) {
            const q = findSideThing(p.side);
            if (q) {
              this.showBanner(`★ Trovato: ${q.thing}\nPortalo a chi te l'ha chiesto`, 0.4, '#8fd3ff', 0x8fd3ff);
              this.afterSideChange();
            }
          }
          if (p.sleep) this.sleepInBed();
        });
        return true;
      }
    }
    return false;
  }

  // No sitting pose in the sprite sheet yet: the player just faces the table
  // (seat.facing) and stays put. Healing happens in restTick().
  sitOn(seat) {
    this.seated = seat;
    this.healAcc = 0;
    this.player.body.setVelocity(0);
    this.player.anims.stop();
    this.player.facing = seat.facing;
    this.player.setFlipX(seat.facing === 'right'); // side art faces LEFT natively
    this.player.setFrame(idleFrame(seat.facing));
    this.showBanner('Zio Nick si siede e riprende fiato\n(frecce o Spazio per alzarsi)', 0.18);
  }

  standUp() {
    this.seated = null;
    this.saveGame();
  }

  // +SEAT_HEAL_PER_SEC HP per second while seated, in whole points.
  restTick(delta, maxHp) {
    const hp = questState.currentHp(maxHp);
    if (hp >= maxHp) return;
    this.healAcc += (delta / 1000) * SEAT_HEAL_PER_SEC;
    const whole = Math.floor(this.healAcc);
    if (whole < 1) return;
    this.healAcc -= whole;
    questState.setHp(hp + whole, maxHp);
  }

  // Lost a battle (called by BattleScene): wake up in the living room at full HP.
  // No other penalty — talk to the enemy again to retry.
  onDefeat() {
    questState.heroHp = null;
    this.pendingRematch = null; // a lost rematch pays nothing
    this.warpLocked = true;
    this.cameras.main.fadeOut(400);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.restart({
        ...DEFEAT_RESPAWN,
        notice: 'Zio Nick si risveglia sul divano del salotto.\nHP ripristinati.',
      });
    });
  }

  // Write the save slot (quest progress + exact position). Safe to call any time.
  saveGame() {
    if (this.restarting || !this.player || !this.player.active) return;
    writeSave({
      mapKey: this.mapKey,
      x: Math.round(this.player.x),
      y: Math.round(this.player.y),
      facing: this.player.facing,
    });
  }

  // "Ricomincia da capo": wipe the save + progress and start over at the start map.
  newGame() {
    this.restarting = true;
    this.warpLocked = true;
    clearSave();
    questState.reset();
    this.cameras.main.fadeOut(300);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.restart({ mapKey: START_MAP, spawnName: 'default' });
    });
  }

  // Brief "you got an item" pop-up, auto-dismisses after 2.2 s.
  showItemReceived(name) {
    this.showBanner(`✦  Hai ottenuto: ${name}!`, 0.42);
  }

  // Centred pop-up at `yFrac` of the screen height; auto-dismisses after 2.2 s.
  showBanner(msg, yFrac, color = '#ffd54a', stroke = 0xffd54a) {
    const cam = this.cameras.main;
    const W = cam.width;
    const H = cam.height;

    const txt = this.add
      .text(W / 2, H * yFrac, msg, {
        fontFamily: 'monospace',
        fontSize: '19px',
        color,
        align: 'center',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(2500001);
    const bg = this.add
      .rectangle(W / 2, H * yFrac, Math.min(520, W - 48), txt.height + 26, 0x0d0f17, 0.95)
      .setScrollFactor(0)
      .setDepth(2500000)
      .setStrokeStyle(2, stroke, 0.9);

    this.time.delayedCall(2200, () => {
      bg.destroy();
      txt.destroy();
    });
  }

  // Pause the overworld and overlay the battle; we resume here afterwards so the
  // player is exactly where they were.
  // `chapter` = the chapter this fight belongs to (a win is credited to it).
  startBattle(npc, chapter, opts = {}) {
    this.scene.pause();
    this.scene.launch('BattleScene', {
      enemyHpFrac: opts.enemyHpFrac || 0, // enemy starts this fraction below full (investigation bonus)
      enemyKey: npc.spriteKey,    // texture for the enemy sprite
      enemyChar: npc.character,   // character.json folder (enemy stats)
      enemyName: npc.name,
      heroChar: PLAYER.SPRITE_KEY, // protagonist character.json folder
      heroKey: PLAYER.SPRITE_KEY,  // protagonist texture
      heroName: PLAYER.NAME,
      returnScene: 'WorldScene',
      chapter,
    });
  }
}
