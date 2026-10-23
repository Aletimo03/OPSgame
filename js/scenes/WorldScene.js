// js/scenes/WorldScene.js
// One scene that can render ANY map from the registry and warp between them.
// Switching maps = restart this scene with new { mapKey, spawnName } data.

import {
  TILE, TILES, PLAYER, hud, hudPx, DOOR_WIDTH, BATTLE_BG_KEY, BATTLE_BG_PATH, CAMERA_ZOOM, CAMERA_MARGIN,
  SEAT_HEAL_PER_SEC, DEFEAT_RESPAWN,
} from '../config.js';
import { drawMap, drawStairs, buildWallColliders } from '../core/MapRenderer.js';
import {
  preparePlayerTexture,
  createPlayerAnims,
  movePlayer,
  idleFrame,
  sliceSheet,
  createWalkAnims,
  prepareSitTexture,
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
import { ALCATRAZ, exitState } from '../story/alcatraz.js';
import {
  GIRLS, APPROACHES, GABBO, CHAPTER as FLIRT_CHAPTER, MAP as FLIRT_MAP, CHIARA_SPEED, CHIARA_WAIT_MS,
  isGirl, flirtActive, girlState, girlTag, approach, snub, winNumber, loseNight,
  gabbo as gabboState, garbleChance, goChance, slur, gabboTag, bar, DRINKS, drinkLabel, buyDrink, expireOrder, deliverDrink,
  danceResult, MARANZA, phone as phoneState, tryToSteal,
} from '../story/flirt.js';

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
    if (!this.textures.exists(PLAYER.SIT_KEY)) this.load.image(PLAYER.SIT_KEY, PLAYER.SIT_PATH);

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
    for (const d of map?.dancers || []) { // static dancers (the bear on the Alcatraz stage)
      if (!this.textures.exists(d.key)) this.load.image(d.key, d.path);
    }
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
    this.drawPaint(map);
    this.physics.world.setBounds(0, 0, worldW, worldH);
    this.walls = buildWallColliders(this, grid);
    this.setupStairsAccess(map); // restrict which side the stairs are mounted from
    this.solidTiles = new Set(); // tiles code-drawn solids cover (y*1000+x)
    this.drawStage(map);
    this.drawBarIsland(map);

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
    this.canSitPose = prepareSitTexture(this);
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
    // Chapter 12: mood + hearts over each girl at the Alcatraz (js/story/flirt.js).
    this.girlTags = this.npcs.list.filter((n) => isGirl(n.id)).map((npc) => ({
      npc,
      t: this.add.text(npc.sprite.x, npc.sprite.y, '', {
        fontFamily: 'monospace', fontSize: '24px', stroke: '#000000', strokeThickness: 5,
      }).setOrigin(0.5, 1).setDepth(900000),
    }));
    this.setupFollowers();
    this.physics.add.collider(this.player, this.npcs.group);
    this.dialogue = new Dialogue(this);

    // Warp pads: an overlap zone on each door tile.
    this.setupWarps(map);
    this.exitArmed = false; // map `exits` (front door): armed once you step off them
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
      .text(hud(10), hud(10), '', {
        fontFamily: 'monospace',
        fontSize: hudPx(18),
        color: '#ffffff',
        fontStyle: 'bold',
        backgroundColor: 'rgba(0,0,0,0.55)',
        padding: { x: hud(8), y: hud(4) },
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
    this.startDisco(map);
    this.startCrowd(map);

    // Tiny HUD label so you always know which room you're in.
    this.roomLabel = this.add
      .text(hud(10), hud(48), map.name, {
        fontFamily: 'monospace',
        fontSize: hudPx(16),
        color: '#ffffff',
        backgroundColor: 'rgba(0,0,0,0.45)',
        padding: { x: hud(6), y: hud(3) },
      })
      .setScrollFactor(0)
      .setDepth(1000000);

    // Key reminder, bottom-left (hidden while a dialogue box is up).
    this.keyHints = this.add
      .text(0, 0, 'WASD/frecce muovi · Spazio parla/siedi · I zaino · P telefono · M mappa · Esc menu', {
        fontFamily: 'monospace',
        fontSize: hudPx(12),
        color: '#e8eaee',
        backgroundColor: 'rgba(0,0,0,0.45)',
        padding: { x: hud(6), y: hud(3) },
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
    if (map.music) this.audio.playMusic(map.music); // a map's own track (the Alcatraz)
    else this.audio.playSceneMusic();
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
    this.keyHints.setWordWrapWidth(Math.max(120, cam.width - hud(20)));
    this.keyHints.setPosition(hud(10), cam.height - hud(10));
    this.roomLabel.setPosition(hud(10), this.clockText.y + this.clockText.height + hud(6)); // under the clock
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
      // A warp may pin its plate (`plateAt`), e.g. the room-26/27 corner.
      const spot = w.plateAt ? [w.plateAt.tx, w.plateAt.ty] : tries.find(([x, y]) => free(x, y));
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

  // Coloured floor areas drawn in code (map `paint`: { x0, y0, x1, y1, color,
  // label? } in tiles, inclusive), e.g. the Alcatraz stage and bar.
  drawPaint(map) {
    for (const p of map.paint || []) {
      const x = p.x0 * TILE;
      const y = p.y0 * TILE;
      const w = (p.x1 - p.x0 + 1) * TILE;
      const h = (p.y1 - p.y0 + 1) * TILE;
      this.add.rectangle(x, y, w, h, p.color, 1).setOrigin(0, 0).setDepth(1.5)
        .setStrokeStyle(4, 0x000000, 0.35);
      if (p.label) {
        this.add.text(x + w / 2, y + h / 2, p.label, {
          fontFamily: 'monospace', fontSize: '28px', fontStyle: 'bold', color: '#ffffff',
        }).setOrigin(0.5).setAlpha(0.3).setDepth(1.6);
      }
    }
  }

  // Disco lights (map `disco`): coloured light pools that wander at random
  // over the dance floor, drawn ADDITIVELY just above the night veil, so with a
  // dark `ambient` they light up the floor and whoever is dancing on it.
  // disco: { area: { x0, y0, x1, y1 } (tiles), lights, radius (tiles), colors }
  startDisco(map) {
    for (const d of [].concat(map.disco || [])) this.discoLights(d); // one or several areas
  }

  discoLights(d) {
    const KEY = 'disco-light';
    if (!this.textures.exists(KEY)) { // soft round light, white centre → transparent
      const S = 256;
      const tex = this.textures.createCanvas(KEY, S, S);
      const ctx = tex.getContext();
      const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
      g.addColorStop(0, 'rgba(255,255,255,1)');
      g.addColorStop(0.35, 'rgba(255,255,255,0.55)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, S, S);
      tex.refresh();
    }
    const a = d.area;
    const rx = () => Phaser.Math.FloatBetween(a.x0, a.x1 + 1) * TILE;
    const ry = () => Phaser.Math.FloatBetween(a.y0, a.y1 + 1) * TILE;
    const colors = d.colors || [0xff2bd6, 0x2bd9ff, 0x7dff3b, 0xffe02b, 0x8a4fff, 0xff5a2b];
    const size = (d.radius || 3.5) * 2 * TILE;
    for (let i = 0; i < (d.lights || 8); i++) {
      const light = this.add.image(rx(), ry(), KEY)
        .setDisplaySize(size, size)
        .setTint(Phaser.Utils.Array.GetRandom(colors))
        .setBlendMode(Phaser.BlendModes.ADD)
        .setAlpha(0.75)
        .setDepth(880001);
      const wander = () => {
        if (!light.active) return;
        this.tweens.add({
          targets: light, x: rx(), y: ry(),
          duration: Phaser.Math.Between(900, 2600), ease: 'Sine.easeInOut',
          onComplete: () => {
            if (Math.random() < 0.4) light.setTint(Phaser.Utils.Array.GetRandom(colors)); // new colour now and then
            wander();
          },
        });
      };
      wander();
      // Pulse with the beat-ish: size and brightness breathe out of sync.
      this.tweens.add({
        targets: light, alpha: { from: 0.45, to: 0.85 }, scale: light.scale * Phaser.Math.FloatBetween(0.75, 1.15),
        duration: Phaser.Math.Between(350, 700), yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
        delay: Phaser.Math.Between(0, 500),
      });
    }
  }

  // Dancing crowd (map `crowd`): dark silhouettes made from the cast's own
  // sheets (tinted almost black, so the disco lights colour them), scattered
  // over `area` at least `spacing` tiles apart, not solid. They dance on the
  // map's `beat` (danceCrowd), synced to the music when it's playing.
  startCrowd(map) {
    this.crowd = [];
    this.lastBeat = -1;
    for (const c of [].concat(map.crowd || [])) this.crowdIn(map, c); // one or several areas
    // Static dancers (map `dancers`: { key, path, tx, ty, scale }): a 4x3 sheet
    // of dance poses, a new pose on every beat, dancing on the spot. Solid feet.
    this.dancers = (map.dancers || []).filter((d) => this.textures.exists(d.key)).map((d) => {
      sliceSheet(this, d.key);
      const sp = this.add.sprite(d.tx * TILE, d.ty * TILE, d.key, 0).setScale(PLAYER.SCALE * (d.scale || 1));
      sp.setDepth(feetY(sp));
      const zone = this.add.zone(sp.x, feetY(sp) - TILE * 0.4, TILE * 1.6, TILE * 0.8);
      this.physics.add.existing(zone, true);
      this.walls.add(zone);
      return sp;
    });
  }

  crowdIn(map, c) {
    const a = c.area;
    const spots = [];
    const free = (x, y) => map.grid[Math.floor(y)]?.[Math.floor(x)] === TILES.FLOOR
      && spots.every((p) => Math.hypot(p.x - x, p.y - y) >= (c.spacing || 1.5));
    for (let k = 0; k < (c.count || 20) * 30 && spots.length < (c.count || 20); k++) {
      const x = Phaser.Math.FloatBetween(a.x0, a.x1 + 1);
      const y = Phaser.Math.FloatBetween(a.y0, a.y1 + 1);
      if (free(x, y)) spots.push({ x, y });
    }
    const kinds = (c.from || []).filter((k) => this.textures.exists(k));
    if (!kinds.length) return;
    for (const p of spots) {
      const key = Phaser.Utils.Array.GetRandom(kinds);
      sliceSheet(this, key);
      const sp = this.add.sprite(p.x * TILE, p.y * TILE, key, idleFrame(Phaser.Utils.Array.GetRandom(['down', 'left', 'up'])))
        .setScale(PLAYER.SCALE * Phaser.Math.FloatBetween(0.92, 1.05))
        .setTint(0x1c1a26)
        .setFlipX(Math.random() < 0.5);
      sp.baseY = sp.y;
      sp.phase = Math.floor(Math.random() * 4); // not everyone moves on the same beat
      sp.setDepth(feetY(sp));
      this.crowd.push(sp);
    }
  }

  // Current beat number of the map's music (or of the scene clock as a fallback).
  beatNow(time) {
    const b = MAPS[this.mapKey].beat;
    if (!b) return -1;
    const m = this.audio?.music;
    const sec = m?.isPlaying ? m.seek : time / 1000;
    return Math.floor(((sec - (b.offset || 0)) * b.bpm) / 60);
  }

  // On every beat each dancer hops; every 2 beats it turns or changes pose.
  danceCrowd(time) {
    if (!this.crowd?.length && !this.dancers?.length) return;
    const beat = this.beatNow(time);
    if (beat === this.lastBeat) return;
    this.lastBeat = beat;
    for (const d of this.dancers || []) d.setFrame(((beat % 12) + 12) % 12); // next pose every beat
    const half = (60 / MAPS[this.mapKey].beat.bpm) * 500; // half a beat, ms
    for (const sp of this.crowd) {
      this.tweens.add({ targets: sp, y: sp.baseY - TILE * 0.18, duration: half * 0.8, yoyo: true, ease: 'Quad.easeOut' });
      if ((beat + sp.phase) % 2 === 0) {
        if (Math.random() < 0.5) sp.setFlipX(!sp.flipX);
        else sp.setFrame(Phaser.Utils.Array.GetRandom([0, 1, 2, 3, 4, 6, 8, 10]));
      }
    }
  }

  npcName(id) {
    return this.npcs.list.find((n) => n.id === id)?.name || id;
  }

  // Gabbo's lines at the club: slurred a bit more with every drink.
  gabboSays(lines, after) {
    const l = Array.isArray(lines) ? lines.map(slur) : slur(lines);
    this.dialogue.show('Gabbo', l, 'gabbo-portrait', after);
  }

  // ── Chapter 12 at the Alcatraz: followers ────────────────────────────────
  // Gabbo follows Zio Nick like a Pokémon partner: he walks the player's own
  // trail, ~1.2 tiles behind. Chiara slowly chases Gabbo (BFS over the floor)
  // and, when she reaches him, tries to take him home (chiaraPitch).
  setupFollowers() {
    this.trail = [];
    this.gabboNpc = null;
    this.chasers = [];
    this.gabboTagText = null;
    if (this.mapKey !== FLIRT_MAP) phoneState.stolen = false; // out of the club: phone back
    if (questState.activeChapter !== FLIRT_CHAPTER || this.mapKey !== FLIRT_MAP) return;
    const find = (id) => this.npcs.list.find((n) => n.id === id);
    const g = find('gabbo');
    if (g) {
      g.wander = false;
      g.sprite.body.checkCollision.none = true; // walks through Zio Nick
      g.sprite.body.reset(this.player.x, this.player.y + TILE * 0.6);
      this.gabboNpc = g;
      this.gabboTagText = this.add.text(0, 0, '', { fontFamily: 'monospace', fontSize: '20px' })
        .setOrigin(0.5, 1).setDepth(900000);
    }
    // Chasers: Chiara goes after Gabbo, the maranza after Zio Nick's phone.
    this.chasers = [];
    const chase = (id, speed, headStart, target, onReach) => {
      const n = find(id);
      if (!n) return;
      n.wander = false;
      n.sprite.body.checkCollision.none = true;
      this.chasers.push({ npc: n, speed, target, onReach, waitUntil: this.time.now + headStart, path: null, pathAt: 0 });
    };
    if (g) chase('chiara', CHIARA_SPEED, 6000, () => g.sprite, (ch) => this.chiaraPitch(ch.npc, ch));
    // Maranzas: each one stays in an 8x8 area around where he starts and only
    // comes after you when he sees you ("!" over his head).
    const half = MARANZA.area / 2;
    for (const n of this.npcs.list.filter((x) => x.id === MARANZA.id)) {
      n.wander = false;
      n.sprite.body.checkCollision.none = true;
      const hx = Math.round((n.sprite.x - TILE / 2) / TILE);
      const hy = Math.round((n.sprite.y - TILE / 2) / TILE);
      const mark = this.add.text(0, 0, '!', {
        fontFamily: 'monospace', fontSize: '34px', fontStyle: 'bold', color: '#ff4a4a', stroke: '#000000', strokeThickness: 6,
      }).setOrigin(0.5, 1).setDepth(900000).setVisible(false);
      this.chasers.push({
        npc: n, speed: MARANZA.speed, target: () => this.player, onReach: (ch) => this.maranzaTry(ch),
        waitUntil: this.time.now + 1500, path: null, pathAt: 0, mark, sees: false,
        home: { tx: hx, ty: hy },
        area: { x0: hx - half, y0: hy - half, x1: hx + half - 1, y1: hy + half - 1 },
      });
    }
  }

  // Face + walk animation for an NPC moved by code (dx, dy = this frame's move).
  animateMove(npc, dx, dy) {
    const s = npc.sprite;
    if (Math.abs(dx) < 0.3 && Math.abs(dy) < 0.3) {
      if (s.anims.isPlaying) { s.anims.stop(); s.setFrame(idleFrame(npc.facing)); }
      return;
    }
    const face = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
    npc.facing = face;
    s.setFlipX(face === 'right'); // side art faces LEFT natively
    s.anims.play(face === 'up' ? npc.anims.up : face === 'down' ? npc.anims.down : npc.anims.side, true);
  }

  followTick(time, delta) {
    const g = this.gabboNpc;
    if (!g) return;
    const p = this.player;
    const last = this.trail[this.trail.length - 1];
    if (!last || Math.hypot(p.x - last.x, p.y - last.y) > 4) this.trail.push({ x: p.x, y: p.y });
    if (this.trail.length > 240) this.trail.shift();
    // The point ~1.2 tiles back along the trail.
    let need = TILE * 1.2;
    let pos = null;
    for (let i = this.trail.length - 1; i > 0 && need > 0; i--) {
      const a = this.trail[i];
      const b = this.trail[i - 1];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (d >= need) { pos = { x: a.x + ((b.x - a.x) * need) / d, y: a.y + ((b.y - a.y) * need) / d }; need = 0; }
      else need -= d;
    }
    const s = g.sprite;
    if (pos) {
      const dx = pos.x - s.x;
      const dy = pos.y - s.y;
      s.body.reset(pos.x, pos.y);
      this.animateMove(g, dx, dy);
    } else this.animateMove(g, 0, 0);
    s.setDepth(this.characterDepth(s));
    this.chaseTick(time, delta);
  }

  // Code-moved chasers (BFS over the floor, re-planned twice a second). When
  // one reaches its target it calls onReach and waits (its waitUntil).
  chaseTick(time, delta) {
    const tile = (o) => ({ tx: Math.round((o.x - TILE / 2) / TILE), ty: Math.round((o.y - TILE / 2) / TILE) });
    for (const ch of this.chasers || []) {
      const c = ch.npc;
      const s = c.sprite;
      const tgt = ch.target();
      let goal = tgt; // where to walk this frame (a sprite-like {x, y})
      if (ch.area) {
        // Area-bound chaser (maranza): chases only while he sees you, never
        // leaves his area; otherwise he walks back to his spot.
        const pt = tile(tgt);
        const me = tile(s);
        const sees = flirtActive(this.mapKey) && !phoneState.stolen && time >= ch.waitUntil
          && Math.hypot(pt.tx - me.tx, pt.ty - me.ty) <= MARANZA.sight && this.lineOfSight(me, pt);
        if (sees && !ch.sees) { // just spotted you: the "!" pops
          ch.mark.setScale(0.2);
          this.tweens.add({ targets: ch.mark, scale: 1, duration: 220, ease: 'Back.easeOut' });
        }
        ch.sees = sees;
        ch.mark.setVisible(sees).setPosition(s.x, s.y - s.displayHeight * 0.5 + 2);
        if (sees && Math.hypot(tgt.x - s.x, tgt.y - s.y) < TILE * 1.3) {
          this.animateMove(c, 0, 0);
          ch.mark.setVisible(false);
          ch.waitUntil = Infinity;
          ch.onReach(ch);
          return;
        }
        const a = ch.area;
        const want = sees
          ? { tx: Phaser.Math.Clamp(pt.tx, a.x0, a.x1), ty: Phaser.Math.Clamp(pt.ty, a.y0, a.y1) }
          : ch.home;
        goal = { x: want.tx * TILE + TILE / 2, y: want.ty * TILE + TILE / 2 };
        if (Math.hypot(goal.x - s.x, goal.y - s.y) < 4) { this.animateMove(c, 0, 0); continue; }
      } else {
        if (!tgt || !flirtActive(this.mapKey) || time < ch.waitUntil) { this.animateMove(c, 0, 0); continue; }
        if (Math.hypot(tgt.x - s.x, tgt.y - s.y) < TILE * 1.3) {
          this.animateMove(c, 0, 0);
          ch.waitUntil = Infinity; // until onReach's talk ends
          ch.onReach(ch);
          return; // one scene at a time
        }
      }
      if (!ch.path || time > ch.pathAt) {
        ch.path = this.bfsStep(tile(s), tile(goal), ch.area);
        ch.pathAt = time + 400;
      }
      const w = ch.path;
      if (!w) { this.animateMove(c, 0, 0); continue; }
      const wx = w.tx * TILE + TILE / 2;
      const wy = w.ty * TILE + TILE / 2;
      const dist = Math.hypot(wx - s.x, wy - s.y);
      const step = (ch.speed * delta) / 1000;
      const k = dist <= step ? 1 : step / dist;
      const dx = (wx - s.x) * k;
      const dy = (wy - s.y) * k;
      s.body.reset(s.x + dx, s.y + dy);
      if (dist <= step) ch.path = null;
      this.animateMove(c, dx, dy);
      s.setDepth(this.characterDepth(s));
    }
  }

  // Can a character on tile `a` see tile `b`? (Bresenham: no wall or solid in between.)
  lineOfSight(a, b) {
    const g = this.map.grid;
    let x = a.tx;
    let y = a.ty;
    const dx = Math.abs(b.tx - x);
    const dy = -Math.abs(b.ty - y);
    const sx = x < b.tx ? 1 : -1;
    const sy = y < b.ty ? 1 : -1;
    let err = dx + dy;
    for (let n = 0; n < 200; n++) {
      if (g[y]?.[x] !== TILES.FLOOR || this.solidTiles?.has(y * 1000 + x)) return false;
      if (x === b.tx && y === b.ty) return true;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x += sx; }
      if (e2 <= dx) { err += dx; y += sy; }
    }
    return false;
  }

  // The maranza reached Zio Nick: he tries for the phone (stealChance grows
  // with the night's drinks). Then he backs off for a while.
  maranzaTry(ch) {
    const m = ch.npc;
    this.holdPlayer();
    this.dialogue.show(m.name, MARANZA.hello, m.portraitKey, () => {
      const stole = tryToSteal();
      this.dialogue.show(m.name, stole ? MARANZA.stole : MARANZA.kept, m.portraitKey, () => {
        this.showBanner(stole ? `${MARANZA.stoleBanner}\n−${MARANZA.fine} punti casa · niente telefono finché sei qui` : MARANZA.keptBanner,
          0.3, stole ? '#ff8a8a' : '#8fd3ff', stole ? 0xff8a8a : 0x8fd3ff);
        this.inventory.refresh();
        ch.waitUntil = this.time.now + MARANZA.waitMs;
        // Stolen: every maranza stops (phone.stolen); kept: this one backs off.
      });
    });
  }

  // First floor tile of a shortest 4-way path from `a` to `b` (tiles), or null.
  bfsStep(a, b, area = null) {
    const g = this.map.grid;
    const inArea = (x, y) => !area || (x >= area.x0 && x <= area.x1 && y >= area.y0 && y <= area.y1);
    const key = (x, y) => y * 1000 + x;
    const prev = new Map([[key(a.tx, a.ty), null]]);
    const q = [a];
    while (q.length) {
      const c = q.shift();
      if (c.tx === b.tx && c.ty === b.ty) {
        let n = c;
        while (prev.get(key(n.tx, n.ty)) && !(prev.get(key(n.tx, n.ty)).tx === a.tx && prev.get(key(n.tx, n.ty)).ty === a.ty)) {
          n = prev.get(key(n.tx, n.ty));
        }
        return n.tx === a.tx && n.ty === a.ty ? null : n;
      }
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = c.tx + dx;
        const ny = c.ty + dy;
        if (g[ny]?.[nx] !== TILES.FLOOR || prev.has(key(nx, ny)) || this.solidTiles?.has(key(nx, ny)) || !inArea(nx, ny)) continue;
        prev.set(key(nx, ny), c);
        q.push({ tx: nx, ty: ny });
      }
    }
    return null;
  }

  // Chiara reached Gabbo (or you talked to her): she asks him to go home with
  // her and Gabbo asks you. Letting him go loses the night; telling him to
  // stay works, unless he's drunk (goChance) and goes anyway.
  chiaraPitch(c, ch = this.chasers?.find((x) => x.npc === c)) {
    const g = GIRLS.chiara;
    const pk = c.portraitKey;
    const done = () => { if (ch) ch.waitUntil = this.time.now + CHIARA_WAIT_MS; };
    if (ch) ch.waitUntil = Infinity; // until the talk ends
    this.holdPlayer();
    const stay = () => {
      if (Math.random() < goChance()) { this.gabboSays(g.drunkGo, () => this.gabboLeaves(c)); return; }
      this.gabboSays(g.stay, () => this.dialogue.show(c.name, g.refused, pk, done));
    };
    // Option 0 (pre-selected) = tell him to stay; letting him go asks again.
    this.dialogue.show(c.name, [g.hello, g.ask], pk, () =>
      this.dialogue.ask('Gabbo', slur(g.gabbo), g.options, 'gabbo-portrait', (i) => {
        if (i === 0) { stay(); return; }
        this.dialogue.ask('⚠️ Attenzione', g.confirm, g.confirmOptions, null, (j) => (j === 1 ? this.gabboLeaves(c) : stay()));
      }));
  }

  // The bar (map `bar`): with a drink order, walking up to the counter opens
  // the menu (re-armed once you step away). Stronger = more ❤️, more alcohol
  // for Gabbo too, more punti casa.
  checkBar() {
    const z = MAPS[this.mapKey].bar;
    if (!z || !flirtActive(this.mapKey)) return;
    const fx = this.player.body.center.x / TILE;
    const fy = this.player.body.bottom / TILE;
    const inside = fx >= z.x0 && fx < z.x1 + 1 && fy >= z.y0 && fy < z.y1 + 1;
    if (!inside) { this.barArmed = true; return; }
    if (!this.barArmed) return;
    this.barArmed = false;
    if (bar.order && !bar.carrying) this.openBar(); // walking up with an order opens the menu by itself
  }

  // Space facing the bar island (no one in front): talk to the barman.
  tryBar(px, py) {
    const b = MAPS[this.mapKey].barIsland;
    if (!b) return false;
    const inX = px >= (b.x0 - 0.3) * TILE && px <= (b.x1 + 1.3) * TILE;
    const inY = py >= (b.y0 - 0.3) * TILE && py <= (b.y1 + 1.3) * TILE;
    if (!inX || !inY) return false;
    this.openBar();
    return true;
  }

  // The barman's menu. Stronger = more ❤️, more alcohol for Gabbo too, more
  // punti casa. Only for the girl who asked for a drink.
  openBar() {
    this.barArmed = false;
    if (!flirtActive(this.mapKey)) { this.dialogue.show('Barista', 'Serata tranquilla? Fammi sapere se ti serve qualcosa.'); return; }
    if (!bar.order) { this.dialogue.show('Barista', 'Prima trovatevi qualcuno a cui offrire da bere!'); return; }
    if (bar.carrying) { this.dialogue.show('Barista', `Il drink ce l'hai già: portalo a ${this.npcName(bar.order.girl)}!`); return; }
    this.holdPlayer();
    const opts = [...DRINKS.map(drinkLabel), 'Niente, grazie'];
    this.dialogue.ask('Barista', `Cosa vi preparo per ${this.npcName(bar.order.girl)}? (punti casa: ${questState.points || 0})`, opts, null, (i) => {
      if (i >= DRINKS.length) return;
      const r = buyDrink(i);
      if (r === 'poor') { this.dialogue.show('Barista', 'Non vi bastano i punti casa. Una birra invece?'); return; }
      if (r !== 'ok') return;
      this.inventory.refresh();
      this.showBanner(`${DRINKS[i].label} presa: portala a ${this.npcName(bar.order.girl)}!\n(Gabbo ne beve uno uguale)`, 0.3, '#8fd3ff', 0x8fd3ff);
    });
  }

  // A raised stage (map `stage`: { x0, y0, x1, y1, steps: { x0, x1 }, rise }):
  // the platform top, a front face along its bottom edge, two steps in the
  // middle, and invisible walls along the front except at the steps.
  drawStage(map) {
    for (const st of [].concat(map.stage || [])) this.drawOneStage(st); // one or several stages
  }

  drawOneStage(st) {
    const T = TILE;
    const x = st.x0 * T;
    const y = st.y0 * T;
    const w = (st.x1 - st.x0 + 1) * T;
    const h = (st.y1 - st.y0 + 1) * T;
    const face = (st.rise ?? 0.6) * T;
    const g = this.add.graphics().setDepth(1.5);
    g.fillStyle(0x3a2516, 1).fillRect(x, y, w, h);                          // boards
    g.lineStyle(2, 0x2a1a10, 1);
    for (let yy = y + T / 2; yy < y + h; yy += T / 2) g.lineBetween(x, yy, x + w, yy);
    g.fillStyle(0x1b120c, 1).fillRect(x, y + h - face, w, face);            // front face
    g.fillStyle(0xc9a23b, 1).fillRect(x, y + h - face, w, 3);               // brass edge
    // Two steps up, centred on st.steps.
    const sx = st.steps.x0 * T;
    const sw = (st.steps.x1 - st.steps.x0 + 1) * T;
    g.fillStyle(0x4a3220, 1).fillRect(sx, y + h - face, sw, face / 2);      // upper step
    g.fillStyle(0x5a3d27, 1).fillRect(sx - T * 0.25, y + h - face / 2, sw + T * 0.5, face / 2 + T * 0.35); // lower step
    g.lineStyle(2, 0x1b120c, 1).strokeRect(sx, y + h - face, sw, face / 2).strokeRect(sx - T * 0.25, y + h - face / 2, sw + T * 0.5, face / 2 + T * 0.35);
    // Walls along the front edge, except the steps.
    const wall = (wx, ww) => {
      if (ww <= 0) return;
      const zone = this.add.zone(wx + ww / 2, y + h - face / 2, ww, face);
      this.physics.add.existing(zone, true);
      this.walls.add(zone);
    };
    wall(x, sx - x);
    wall(sx + sw, x + w - (sx + sw));
    // Sides, where the stage doesn't touch a wall (the second room's stage).
    const g2 = this.map.grid;
    for (const [col, ex] of [[st.x0 - 1, x], [st.x1 + 1, x + w]]) {
      let open = false;
      for (let ty = st.y0; ty <= st.y1; ty++) if (g2[ty]?.[col] === TILES.FLOOR) open = true;
      if (!open) continue;
      const zone = this.add.zone(ex, y + h / 2, T * 0.3, h);
      this.physics.add.existing(zone, true);
      this.walls.add(zone);
      g.fillStyle(0x1b120c, 1).fillRect(ex - (ex === x ? 0 : 4), y, 4, h); // a dark edge
    }
  }

  // The bar island (map `barIsland`: { x0, y0, x1, y1 } tiles, the outer
  // square): a closed ring of counters with a barman walking round inside.
  // The whole square is solid; you order from any side (map `bar` zone).
  drawBarIsland(map) {
    const b = map.barIsland;
    if (!b) return;
    const T = TILE;
    const X0 = b.x0 * T;
    const Y0 = b.y0 * T;
    const X1 = (b.x1 + 1) * T;
    const Y1 = (b.y1 + 1) * T;
    const k = T * 0.75; // counter depth
    const TOP = 0x6b4a2e;
    const FACE = 0x2b1c12;
    const BRASS = 0xc9a23b;
    // Back + side counters: drawn under whoever is inside (the barman).
    const back = this.add.graphics().setDepth(Y0 + k);
    back.fillStyle(0x15131c, 1).fillRect(X0, Y0, X1 - X0, Y1 - Y0);          // floor inside
    back.fillStyle(TOP, 1).fillRect(X0, Y0, X1 - X0, k);                    // back counter
    back.fillStyle(FACE, 1).fillRect(X0 + k, Y0 + k, X1 - X0 - 2 * k, T * 0.3); // its inner face
    back.fillStyle(TOP, 1).fillRect(X0, Y0, k, Y1 - Y0).fillRect(X1 - k, Y0, k, Y1 - Y0); // sides
    const colors = [0x7dff4f, 0xffe04f, 0xff4fd8, 0x4fd9ff, 0xff8a3b, 0xffffff];
    for (let bx = X0 + 10, i = 0; bx < X1 - 10; bx += 13, i++) {            // bottles on the back counter
      back.fillStyle(colors[i % colors.length], 0.9).fillRect(bx, Y0 + 6, 6, k * 0.6);
    }
    // Front counter: drawn over the barman's legs.
    const front = this.add.graphics().setDepth(Y1 + 1);
    front.fillStyle(TOP, 1).fillRect(X0, Y1 - k, X1 - X0, k * 0.6);
    front.fillStyle(FACE, 1).fillRect(X0, Y1 - k * 0.4, X1 - X0, k * 0.4 + T * 0.25);
    front.fillStyle(BRASS, 1).fillRect(X0, Y1 - k * 0.4, X1 - X0, 3);
    front.lineStyle(3, 0x1b120c, 1).strokeRect(X0, Y0, X1 - X0, Y1 - Y0 + T * 0.25);
    this.add.text((X0 + X1) / 2, Y1 + T * 0.02, '🍸 BAR', { fontFamily: 'monospace', fontSize: '20px', fontStyle: 'bold', color: '#ffd54a' })
      .setOrigin(0.5, 0.5).setDepth(Y1 + 2);
    // Solid square (also for code-moved NPCs: Chiara's path avoids it).
    for (let ty = b.y0; ty <= b.y1; ty++) for (let tx = b.x0; tx <= b.x1; tx++) this.solidTiles.add(ty * 1000 + tx);
    const zone = this.add.zone((X0 + X1) / 2, (Y0 + Y1) / 2, X1 - X0, Y1 - Y0);
    this.physics.add.existing(zone, true);
    this.walls.add(zone);
    // The barman: a dark silhouette walking round the inside of the ring.
    this.barman = null;
    const key = b.barman || 'timo';
    if (!this.textures.exists(key)) return;
    sliceSheet(this, key);
    const sp = this.add.sprite(X0 + k + T * 0.5, Y0 + k, key, idleFrame('down')).setScale(PLAYER.SCALE * 0.9).setTint(0x1c1a26);
    const inX0 = X0 + k + T * 0.4;
    const inX1 = X1 - k - T * 0.4;
    const inY0 = Y0 + k - T * 0.2;          // sprite centre: his feet stay inside the ring
    const inY1 = Y1 - k - T * 1.2;
    this.barman = {
      sprite: sp, anims: createWalkAnims(this, key), facing: 'down',
      path: [[inX0, inY0], [inX1, inY0], [inX1, inY1], [inX0, inY1]], next: 1, waitUntil: 0,
    };
  }

  // The barman goes round the ring, stopping now and then at a corner.
  barmanTick(time, delta) {
    const m = this.barman;
    if (!m) return;
    const s = m.sprite;
    if (time < m.waitUntil) { this.animateMove(m, 0, 0); return; }
    const [tx, ty] = m.path[m.next];
    const dist = Math.hypot(tx - s.x, ty - s.y);
    const step = (70 * delta) / 1000;
    if (dist <= step) {
      s.setPosition(tx, ty);
      m.next = (m.next + 1) % m.path.length;
      if (Math.random() < 0.5) m.waitUntil = time + 600 + Math.random() * 1600;
      this.animateMove(m, 0, 0);
    } else {
      const dx = ((tx - s.x) * step) / dist;
      const dy = ((ty - s.y) * step) / dist;
      s.setPosition(s.x + dx, s.y + dy);
      this.animateMove(m, dx, dy);
    }
    s.setDepth(feetY(s));
  }

  // Chapter 12: talking to a girl at the Alcatraz (js/story/flirt.js).
  flirt(target) {
    const id = target.id;
    const g = GIRLS[id];
    const now = this.time.now;
    const name = target.name;
    const pk = target.portraitKey;
    if (g.trap) { this.chiaraPitch(target); return; }
    const st = girlState(id, now);
    if (now < st.cooldownUntil) { this.dialogue.show(name, g.busy, pk); return; }
    // Her drink.
    if (bar.order?.girl === id) {
      if (!bar.carrying) { this.dialogue.show(name, 'Allora, questo drink? Il bar è in fondo a destra.', pk); return; }
      const r = deliverDrink(id, now);
      this.dialogue.show(name, g.thanks, pk, () => this.gabboSays(GABBO.cheers, () => {
        this.showBanner(`🍺 Anche Gabbo ha bevuto (${gabboState.drunk})\nPiù beve, meno capisce...`, 0.3, '#ffb36b', 0xffb36b);
        if (r === 'win') this.dialogue.show(name, g.win, pk, () => this.gabboSays(GABBO.win, () => this.onNumber(target)));
      }));
      return;
    }
    if (st.mood === 'no') {
      const r = snub(id, now);
      this.dialogue.show(name, r === 'leave' ? [g.no, g.leave] : g.no, pk, r === 'leave' ? () => this.gabboSays(GABBO.gone) : null);
      return;
    }
    this.dialogue.show(name, g.hello, pk, () =>
      this.dialogue.ask('Gabbo', slur(GABBO.ask), APPROACHES.map((a) => a.label), 'gabbo-portrait', (choice) => {
        // A drunk Gabbo may say something else than what you told him.
        let i = choice;
        const garbled = Math.random() < garbleChance();
        if (garbled) i = (choice + Phaser.Math.Between(1, 2)) % APPROACHES.length;
        const r = approach(id, i, this.time.now);
        const outcome = () => {
          if (r.result === 'order') {
            this.dialogue.show(name, g.order, pk, () => this.gabboSays(GABBO.toBar, () =>
              this.showBanner(`🍹 Vai al BAR (in fondo a destra) e torna da ${name}\nentro ${Math.round(45)} secondi`, 0.3, '#8fd3ff', 0x8fd3ff)));
          } else if (r.result === 'dance') {
            this.dialogue.show(name, g.dance, pk, () => this.startDance(target));
          } else if (r.result === 'win') {
            this.dialogue.show(name, [g.right, g.win], pk, () => this.gabboSays(GABBO.win, () => this.onNumber(target)));
          } else if (r.result === 'leave') {
            this.dialogue.show(name, [r.delta > 0 ? g.right : g.wrong, g.leave], pk, () => this.gabboSays(GABBO.gone));
          } else {
            this.dialogue.show(name, r.result === 'ok' ? g.right : g.wrong, pk);
          }
        };
        this.gabboSays(APPROACHES[i].gabbo, () => (garbled ? this.gabboSays(GABBO.garbled, outcome) : outcome()));
      }));
  }

  // Dance challenge (DanceScene) over the paused world, on the club's beat.
  startDance(target) {
    const beat = MAPS[this.mapKey].beat || { bpm: 120, offset: 0 };
    this.holdPlayer();
    this.scene.pause();
    this.scene.launch('DanceScene', {
      girlId: target.id, girlName: target.name, need: GIRLS[target.id].danceNeed ?? 0.7,
      bpm: beat.bpm, offset: beat.offset, returnScene: 'WorldScene',
    });
  }

  // Called by DanceScene: a good dance = +1 ❤️ (her number once she's won over).
  onDanceDone(id, won) {
    const target = this.npcs.list.find((n) => n.id === id);
    if (!target) return;
    const g = GIRLS[id];
    const r = danceResult(id, won, this.time.now);
    if (r === 'win') {
      this.dialogue.show(target.name, [g.danceWin, g.win], target.portraitKey, () => this.gabboSays(GABBO.win, () => this.onNumber(target)));
    } else if (r === 'ok') {
      this.dialogue.show(target.name, g.danceWin, target.portraitKey);
    } else {
      this.dialogue.show(target.name, r === 'leave' ? [g.danceLose, g.leave] : g.danceLose, target.portraitKey);
    }
  }

  // Gabbo got the number: points, a heart with him, chapter progress.
  onNumber(target) {
    winNumber(target.id);
    questState.points = (questState.points || 0) + 10;
    this.bumpAffinity('gabbo', 1);
    this.showBanner(`📱 Gabbo ha il numero di ${target.name}!\n+10 punti casa · ora tutti sul palco`, 0.26, '#ff8ad8', 0xff8ad8);
    this.onProgress();
  }

  // Chiara's trap: you let Gabbo go home with her → the night is lost: back
  // home, Gabbo in the hall again, the front door takes you to the club again.
  gabboLeaves(target) {
    loseNight();
    this.warpLocked = true;
    this.holdPlayer();
    this.cameras.main.fadeOut(600);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.saveGame();
      this.scene.restart({ mapKey: START_MAP, spawnName: 'default', notice: GIRLS[target.id].lose });
    });
  }

  // Map `exits` (not warps): the entrance's front door. Stepping on one asks
  // js/story/alcatraz.js whether you can go out (chapter 12, after Gabbo);
  // otherwise a short line. Re-armed once you step off it.
  checkExits() {
    const exits = MAPS[this.mapKey].exits;
    if (!exits?.length) return;
    const b = this.player.body;
    const hit = exits.find((e) => b.right > e.tx * TILE && b.left < (e.tx + (e.w || DOOR_WIDTH)) * TILE
      && b.bottom > e.ty * TILE && b.top < (e.ty + (e.h || 1)) * TILE);
    if (!hit) { this.exitArmed = true; return; }
    if (!this.exitArmed || this.warpLocked) return;
    this.exitArmed = false;
    const st = exitState(hit.id);
    if (st === 'go') { this.startTrip(); return; }
    this.holdPlayer();
    this.dialogue.show('Porta d\'ingresso', st === 'needPartner' ? ALCATRAZ.needPartner : ALCATRAZ.locked);
  }

  // Out of the house: fade, the video cutscene (CutsceneScene) over the paused
  // world, then onCutsceneDone() lands you in the Alcatraz.
  startTrip() {
    this.warpLocked = true;
    this.holdPlayer();
    this.saveGame();
    if (this.audio?.music?.isPlaying) this.audio.music.pause();
    this.cameras.main.fadeOut(400);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.pause();
      this.scene.launch('CutsceneScene', { video: ALCATRAZ.video, title: ALCATRAZ.title, returnScene: 'WorldScene' });
    });
  }

  // Called by CutsceneScene when the clip ends (or is skipped).
  onCutsceneDone() {
    questState.setFlag(ALCATRAZ.arrivedFlag);
    this.scene.resume();
    if (this.audio?.music?.isPaused) this.audio.music.resume();
    this.scene.restart(ALCATRAZ.to);
  }

  // Map `flagZones`: stepping into the area (feet) sets a flag once, during
  // `chapter` if given, then onProgress() (e.g. the Alcatraz stage, chapter 12).
  checkFlagZones() {
    const zones = MAPS[this.mapKey].flagZones;
    if (!zones?.length) return;
    const fx = this.player.body.center.x / TILE;
    const fy = this.player.body.bottom / TILE;
    for (const z of zones) {
      if (questState.hasFlag(z.flag) || (z.chapter && questState.activeChapter !== z.chapter)) continue;
      if (z.requires && !questState.hasFlag(z.requires)) continue; // e.g. the stage after Gabbo's number
      if (fx >= z.x0 && fx < z.x1 + 1 && fy >= z.y0 && fy < z.y1 + 1) {
        questState.setFlag(z.flag);
        if (z.banner) this.showBanner(z.banner, 0.22, '#ffd54a', 0xffd54a);
        this.onProgress();
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
    this.flushProgress(); // a finished chapter is announced only after the talk that finished it
    questState.stats.playMs += delta; // play time, for the ending screen
    advanceClock(delta);
    this.updateClock();
    if (!this.inCutscene) this.phoneHud.update(); // badge follows new chapters / reading the phone
    for (const { npc, t } of this.questMarks) {
      t.setPosition(npc.sprite.x, npc.sprite.y - npc.sprite.displayHeight * 0.5 + 6 + t.bob);
    }
    const flirting = flirtActive(this.mapKey);
    for (const { npc, t } of this.girlTags) {
      t.setVisible(flirting);
      if (flirting) t.setText(girlTag(npc.id, this.time.now)).setPosition(npc.sprite.x, npc.sprite.y - npc.sprite.displayHeight * 0.5 + 4);
    }
    if (this.gabboTagText) {
      const s = this.gabboNpc.sprite;
      this.gabboTagText.setText(gabboTag()).setPosition(s.x, s.y - s.displayHeight * 0.5 + 4);
    }
    if (flirting) {
      const late = expireOrder(this.time.now); // too slow with the drink (scene clock, like the girls)
      if (late) {
        this.showBanner(`⌛ Troppo tardi: ${GIRLS[late] ? this.npcName(late) : ''} non aspetta più.\nIl drink se lo beve Gabbo 🍺`, 0.3, '#ffb36b', 0xffb36b);
      }
    }
    this.danceCrowd(time);
    this.barmanTick(this.time.now, delta);
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
    // Phone stolen by the maranza: P only reminds you (until you leave the club).
    if (phoneState.stolen && this.mapKey === FLIRT_MAP && !busy && !this.phone.open
        && Phaser.Input.Keyboard.JustDown(this.phone.key)) {
      this.showBanner('📵 Il maranza ti ha rubato il telefono!', 0.3, '#ff8a8a', 0xff8a8a);
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

    this.checkExits();
    this.checkFlagZones();
    this.followTick(this.time.now, delta);
    this.checkBar();

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
    if (this.seated) { p.body.setVelocity(0); return; } // keep the seated pose
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
      if (npc === this.gabboNpc) continue; // at the club Gabbo follows you: never the one you talk to
      const f = npc.sprite.body.center;
      const d = Phaser.Math.Distance.Between(px, py, f.x, f.y);
      if (d < best) {
        best = d;
        target = npc;
      }
    }
    if (!target) {
      // Nobody in front: the bar, else sit if standing on a seat, else look at the furniture ahead.
      if (!this.tryBar(px, py) && !this.trySit()) this.tryExamine(px, py);
      return;
    }
    faceNpcToPlayer(target, this.player.facing, this.time.now);
    this.talkingTo = target; // stands still for the whole conversation (update)
    this.audio?.playSfx('npc-talk'); // interaction blip (no-op until a file is added)
    const firstToday = !questState.didIn('greeted', target.id); // first chat this chapter → +1 heart
    questState.greet(target.id); // mark NPC as spoken-to
    if (firstToday) this.bumpAffinity(target.id, 1);

    if (isGirl(target.id) && flirtActive(this.mapKey)) { this.flirt(target); return; }
    if (target.id === MARANZA.id && flirtActive(this.mapKey) && !phoneState.stolen) {
      const ch = this.chasers.find((x) => x.npc === target);
      if (ch && ch.waitUntil !== Infinity) { ch.waitUntil = Infinity; this.maranzaTry(ch); return; }
    }

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
    const i = order.indexOf(questState.activeChapter);
    return i >= order.indexOf(r.from) && (!r.until || i <= order.indexOf(r.until));
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
    const m = MAPS[this.mapKey];
    // `ambient`: a fixed darkness (the club); `noNight`: never dark.
    this.nightVeil.setAlpha(m.ambient ?? (m.noNight ? 0 : nightAlpha(min)));
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
    this.refreshQuestMarks();
    this.saveGame();
    // A new chapter / the ending are shown only once whatever is going on is
    // over (e.g. Nima's lines that completed chapter 1): flushProgress() in
    // update() waits for no dialogue, cutscene, overlay or warp. Till then the
    // tracker keeps showing the chapter you just finished.
    if (questState.activeChapter !== before) this.pendingAnnounce = true;
    else this.questTracker?.refresh();
    // Last chapter done → the ending, once (the flag is saved).
    if (isStoryComplete() && !questState.hasFlag('ending-seen')) {
      questState.setFlag('ending-seen');
      this.saveGame();
      this.pendingEnding = true;
    }
  }

  // Show a deferred chapter change / ending as soon as the screen is free.
  flushProgress() {
    if (!this.pendingAnnounce && !this.pendingEnding) return;
    const busy = this.dialogue?.open || this.inCutscene || this.warpLocked || this.seated
      || [this.inventory, this.phone, this.minimap, this.pauseMenu].some((o) => o?.open);
    if (busy) return;
    if (this.pendingAnnounce) {
      this.pendingAnnounce = false;
      this.questTracker?.refresh();
      this.announceChapter();
    }
    if (this.pendingEnding) {
      this.pendingEnding = false;
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
      this.add.rectangle(W / 2, H * 0.42, W, hud(150), 0x05060a, 0.88).setStrokeStyle(2, 0xffd54a, 0.6),
      this.add.text(W / 2, H * 0.42 - hud(46), num ? `CAPITOLO ${num}` : 'CAPITOLO', {
        fontFamily: 'monospace', fontSize: hudPx(16), color: '#9aa0a8', letterSpacing: 6,
      }).setOrigin(0.5),
      this.add.text(W / 2, H * 0.42 - hud(6), ch.title, {
        fontFamily: 'monospace', fontSize: hudPx(30), color: '#ffd54a', fontStyle: 'bold',
        align: 'center', wordWrap: { width: W - 60 },
      }).setOrigin(0.5),
      this.add.text(W / 2, H * 0.42 + hud(40), quest ? quest.title : '', {
        fontFamily: 'monospace', fontSize: hudPx(15), color: '#ffffff',
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

  // Sit down: slide onto the middle of the seat, swap to the seated sheet
  // (PLAYER.SIT_KEY, one pose per facing) with a little squash, then loop the
  // seated frames slowly. Healing happens in restTick().
  sitOn(seat) {
    const p = this.player;
    this.seated = seat;
    this.healAcc = 0;
    p.body.setVelocity(0);
    p.anims.stop();
    p.facing = seat.facing;
    // Centre the feet on the seat sideways (the seat is a feet area in tiles).
    const dx = (seat.tx + seat.w / 2) * TILE - p.body.center.x;
    if (Math.abs(dx) > 1) this.tweens.add({ targets: p, x: p.x + dx, duration: 120, ease: 'Sine.easeOut' });
    if (this.canSitPose) {
      p.setFlipX(false); // every seated facing has its own art
      p.setTexture(PLAYER.SIT_KEY, 0);
      p.anims.play(`sit-${seat.facing}`);
      this.tweens.add({ targets: p, scaleY: PLAYER.SCALE * 0.9, duration: 90, yoyo: true, ease: 'Quad.easeOut' });
    } else {
      p.setFlipX(seat.facing === 'right'); // side art faces LEFT natively
      p.setFrame(idleFrame(seat.facing));
    }
    p.setDepth(this.characterDepth(p));
    this.showBanner('Zio Nick si siede e riprende fiato\n(frecce o Spazio per alzarsi)', 0.18);
  }

  standUp() {
    const p = this.player;
    this.seated = null;
    this.tweens.killTweensOf(p);
    p.anims.stop();
    p.setTexture(PLAYER.SPRITE_KEY, idleFrame(p.facing));
    p.setFlipX(p.facing === 'right');
    p.setScale(PLAYER.SCALE);
    this.tweens.add({ targets: p, scaleY: PLAYER.SCALE * 1.06, duration: 80, yoyo: true, ease: 'Quad.easeOut' });
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
        fontSize: hudPx(19),
        color,
        align: 'center',
        wordWrap: { width: Math.min(hud(520), W - 48) - hud(24) },
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(2500001);
    const bg = this.add
      .rectangle(W / 2, H * yFrac, Math.min(hud(520), W - 48), txt.height + hud(26), 0x0d0f17, 0.95)
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
