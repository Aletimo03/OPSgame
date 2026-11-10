// js/scenes/WorldScene.js
// One scene that can render ANY map from the registry and warp between them.
// Switching maps = restart this scene with new { mapKey, spawnName } data.
//
// The scene is assembled from feature mixins (js/scenes/world/*.js): each adds
// its methods to the class, so everything still runs as `this.method()`.

import {
  TILE, TILES, PLAYER, hud, hudPx, DOOR_WIDTH, BATTLE_BG_KEY, BATTLE_BG_PATH, CAMERA_ZOOM, CAMERA_MARGIN,
} from '../config.js';
import { drawMap, drawStairs, buildWallColliders } from '../core/MapRenderer.js';
import {
  preparePlayerTexture, createPlayerAnims, movePlayer, idleFrame, prepareSitTexture, feetY,
} from '../core/playerSprite.js';
import { createNpcs, updateNpcs, stopNpcs, freezeNpc, faceNpcToPlayer, Dialogue } from '../core/npcs.js';
import { resolveInteraction, CHARACTERS, baseStats } from '../core/characters.js';
import { MAPS, START_MAP } from '../../maps/index.js';
import { questState } from '../story/questState.js';
import { advanceChapterIfDone } from '../story/chapters.js';
import { QuestTracker } from '../story/QuestTracker.js';
import { Inventory } from '../ui/Inventory.js';
import { PauseMenu } from '../ui/PauseMenu.js';
import { Phone } from '../ui/Phone.js';
import { PhoneHud } from '../ui/PhoneHud.js';
import { clockNow, nightAlpha } from '../story/clock.js';
import {
  PROLOGUE, inPrologue, phoneLocked, warpGate, arrivalCutscene, partyOn, partyVolume,
} from '../story/prologue.js';
import { HEETS } from '../story/heets.js';
import { SHOP_KEEPER, sideStepFor, startSide, completeSide } from '../story/sideQuests.js';
import { Minimap } from '../ui/Minimap.js';
import { loadAudio, attachAudio } from '../core/audio.js';
import { writeSave, clearSave } from '../core/save.js';
import { propColliders, propBaseY } from '../core/props.js';
import { DREAM, dreamHouse } from '../story/dream.js';
import {
  GIRLS, MAP as FLIRT_MAP, isGirl, flirtActive, girlTag, gabboTag, expireOrder, MARANZA,
  phone as phoneState,
} from '../story/flirt.js';
import { withDecor } from './world/decor.js';
import { withPathing } from './world/pathing.js';
import { withClub } from './world/club.js';
import { withPrologue } from './world/prologue.js';
import { withHeets } from './world/heets.js';
import { withFavours } from './world/favours.js';
import { withDream } from './world/dream.js';
import { withCutscenes } from './world/cutscenes.js';
import { withProgress } from './world/progress.js';
import { withInteractions } from './world/interactions.js';
import { withBattles } from './world/battles.js';
import { withStealth } from './world/stealth.js';
import { STEALTH } from '../story/stealth.js';

const AUTOSAVE_MS = 4000; // position autosave interval (progress saves immediately)
let unloadHooked = false; // the tab-close save listener is registered once per page

// Phaser.Scene + every feature of the world, in one prototype chain.
const WorldBase = [
  withDecor, withPathing, withClub, withPrologue, withHeets, withFavours,
  withDream, withCutscenes, withProgress, withInteractions, withBattles, withStealth,
].reduce((Base, mixin) => mixin(Base), Phaser.Scene);

export default class WorldScene extends WorldBase {
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
    this.heets = null; // Nima's chase after a heets in the kitchen (startHeetsChase)
    this.heetsEscaped = !!data.heetsEscaped; // just ran out of the kitchen door
    this.heetsDazed = !!data.heetsDazed; // just caught by Nima: waking up dazed
    this.dazed = false; // walking slowly (startDazed)
    this.dazeMark = null;
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

    if (!this.textures.exists(PLAYER.PORTRAIT_KEY)) this.load.image(PLAYER.PORTRAIT_KEY, PLAYER.PORTRAIT_PATH);

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
    const star = PROLOGUE.star; // marks the repeaters
    if (!this.textures.exists(star.key)) this.load.spritesheet(star.key, star.path, { frameWidth: star.frame, frameHeight: star.frame });
    if (map?.jumpscare && !this.textures.exists('jumpscare')) this.load.image('jumpscare', map.jumpscare); // the dream's jumpscare
    for (const d of map?.dancers || []) { // static dancers (the bear on the Alcatraz stage)
      if (!this.textures.exists(d.key)) this.load.image(d.key, d.path);
    }
    if (!this.textures.exists(BATTLE_BG_KEY)) this.load.image(BATTLE_BG_KEY, BATTLE_BG_PATH);

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
    this.inDreamHouse = dreamHouse() && map.key !== DREAM.map; // chapter 9: the house, but dark and strange
    drawMap(this, grid, this.inDreamHouse ? 'dream' : map.theme);
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
    // Chapter 8: mood + hearts over each girl at the Alcatraz (js/story/flirt.js).
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
    this.cameras.main.setRotation(0); // in case you left the room still dazed
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
    this.enterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER); // advances dialogue, like Space
    this.questKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.O);
    this.spaceGuard = false; // set true by BattleScene on exit so the closing space doesn't re-interact

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
    this.startDream(map);
    this.setupStealth();
    this.repeaterStars = new Map(); // spot id → its star, in this map
    this.refreshRepeaters();

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
      .text(0, 0, 'WASD/frecce muovi · Spazio parla/siedi · O obiettivi · I zaino · P telefono · M mappa · Esc menu', {
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
    if (this.heetsDazed) this.startDazed();
    if (this.heetsEscaped) {
      this.time.delayedCall(450, () => this.say(null, HEETS.escaped));
    }

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
    const track = this.inDreamHouse ? 'dream-house-theme' : partyOn() ? PROLOGUE.party.track : map.music; // the dream house has its own track
    if (track && this.cache.audio.exists(track)) this.audio.playMusic(track); // a map's own track
    else if (track) this.audio.silence(); // its track isn't there yet (the dream): no house theme either
    else this.audio.playSceneMusic();
    if (partyOn()) this.audio.music?.setVolume(partyVolume(this.mapKey)); // the party: louder the closer you get
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
    this.roomLabel.setPosition(hud(10), hud(10));
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
      'laundry-room': '🧺', 'trashbin-room': '🗑️', entrance: '🚪', balcony: '🚬',
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

  // Map `flagZones`: stepping into the area (feet) sets a flag once, during
  // `chapter` if given, then onProgress() (e.g. the Alcatraz stage, chapter 8).
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
        if (z.say) { this.holdPlayer(); this.say(null, z.say); } // e.g. Gabbo's slip on the stage
        this.onProgress();
        if (z.flag === DREAM.escapedFlag) this.wakeUp(); // out of the maze: back in bed
      }
    }
  }

  doWarp(warp) {
    if (!this.canWarp || this.warpLocked) return;
    const shut = warpGate(this.mapKey, warp); // a door he can't use yet (js/story/prologue.js)
    if (shut) {
      this.canWarp = false; // re-armed once he steps off the door
      if (!this.dialogue.open) this.say(null, shut);
      return;
    }
    this.warpLocked = true;
    this.cameras.main.fadeOut(180);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.restart({ mapKey: warp.to, spawnName: warp.toSpawn || 'default', heetsEscaped: !!this.heets });
    });
  }

  update(time, delta) {
    if (!this.player) return;
    this.flushProgress(); // a finished chapter is announced only after the talk that finished it
    questState.stats.playMs += delta; // play time, for the ending screen
    if (!this.inCutscene && !this.hudHidden) this.phoneHud.update(); // badge follows new chapters / reading the phone
    if (this.hudHidden) this.setHudVisible(false); // the dream: no interface at all
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
    const phoneOff = phoneLocked(); // the prologue: no wi-fi
    const overlays = this.hudHidden ? [] : [this.inventory, ...(phoneOff ? [] : [this.phone]), this.minimap];
    const busy = this.dialogue.open || this.warpLocked;
    if (this.hudHidden) { // the dream: bag / phone / map keys do nothing
      const J = Phaser.Input.Keyboard.JustDown;
      [this.inventory.iKey, this.phone.key, this.minimap.key].forEach((k) => J(k));
    }
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
    if (phoneOff && Phaser.Input.Keyboard.JustDown(this.phone.key) && !busy && questState.hasItem(PROLOGUE.phoneItem)) {
      this.showBanner(PROLOGUE.noWifi, 0.3, '#ff8a8a', 0xff8a8a);
    }
    // O: the objectives box opens and closes, like the bag.
    const pressedQuest = Phaser.Input.Keyboard.JustDown(this.questKey);
    if (pressedQuest && !busy && !this.hudHidden && !this.inCutscene) this.questTracker.toggle();
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
    const pressedEnter = Phaser.Input.Keyboard.JustDown(this.enterKey);
    this.keyHints.setVisible(!this.dialogue.open && !this.inCutscene && !this.hudHidden);

    // While a dialogue is open, freeze movement; space closes it.
    // Normal chat: only Zio Nick and the person he talks to stand still; the
    // others keep strolling. In a cutscene everyone stands still, listening.
    if (this.dialogue.open) {
      this.holdPlayer();
      if (this.inCutscene) stopNpcs(this.npcs, time);
      else {
        updateNpcs(this, this.npcs, time, this.talkingTo ? new Set([this.talkingTo]) : null);
        this.stealthTick(delta);
      }
      if (this.dialogue.mode === 'choice') {
        if (this.justPressed('up')) this.dialogue.moveSelection(-1);
        else if (this.justPressed('down')) this.dialogue.moveSelection(1);
        else if (pressedSpace || pressedEnter) this.dialogue.confirm();
      } else if (pressedSpace || pressedEnter) {
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

    movePlayer(this.player, this.cursors, this.dazed ? HEETS.dazedSpeed : this.sneaking() ? STEALTH.sneakSpeed : MAPS[this.mapKey].playerSpeed || PLAYER.SPEED);
    this.assistDoor(); // slide into a doorway you're slightly off-centre from
    this.player.setDepth(this.characterDepth(this.player)); // vs NPCs and props, by feet
    updateNpcs(this, this.npcs, time); // NPCs stroll around so they feel alive

    this.checkExits();
    this.checkFlagZones();
    this.followTick(this.time.now, delta);
    this.dreamTick(this.time.now, delta);
    this.heetsTick(delta);
    this.stealthTick(delta);
    this.repeaterTick();
    this.dazeMark?.setPosition(this.player.x, this.player.y - this.player.displayHeight * 0.5);
    this.checkBar();

    if (this.spaceGuard && !this.cursors.space.isDown) this.spaceGuard = false;
    if (pressedSpace && !this.spaceGuard && !this.heets) this.tryInteract(); // no chatting with Nima behind you

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
    if (this.stealthTalk(target)) return; // with the cigarette in your hand? caught
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
        this.say(target, act.dialogueAfter || 'Mi hai già battuto, lasciami in pace...');
        return;
      }
      // Lines first, then a branching prompt; either choice leads to the fight.
      this.say(target, act.dialogue, () => {
        const b = act.battle;
        this.dialogue.ask(target.name, b.prompt, b.options, target.portraitKey, () => this.startBattle(target, ch, b));
      });
    } else if (act.quiz) {
      // Quiz-based objective — the chapter advances only on a CORRECT answer.
      const q = act.quiz;
      const already = questState.didIn('solved', target.id);
      if (already) {
        // Already passed — just replay a closing line, no re-quiz.
        this.say(target, act.dialogueAfter || 'Hai già superato la prova!');
      } else {
        // Intro lines → branching question → grade the chosen option.
        this.say(target, act.dialogue, () => {
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
      this.say(target, lines, () => {
        if (already) this.afterTalk(target);
        if (!already) {
          if (it.consumable) questState.addSupply(it, target.id);
          else questState.addItem(it);
          this.setTalkFlag(act);
          this.onProgress();
          this.inventory.refresh();
          this.showItemReceived(it.consumable ? `${it.name} x${it.qty ?? 1}` : it.name);
        }
      });
    } else {
      this.onProgress();
      this.say(target, act.dialogue, () => {
        this.setTalkFlag(act);
        this.afterTalk(target);
      });
    }
  }

  // A chapter entry's `setFlag` (character JSON): set once its lines are read.
  setTalkFlag(act) {
    if (!act.setFlag || questState.hasFlag(act.setFlag)) return;
    questState.setFlag(act.setFlag);
    if (act.banner) this.showBanner(act.banner, 0.3, '#ffd54a', 0xffd54a);
    this.onProgress();
  }

  // Show lines that may mix speakers: a string is said by `npc` (the one you
  // talk to), { who, text } by that character. There's no narrator: with no
  // `npc` a string is Zio Nick thinking aloud. Consecutive lines of one speaker
  // share a box.
  say(npc, lines, onDone = null, opts = {}) {
    const runs = [];
    for (const l of Array.isArray(lines) ? lines : [lines]) {
      const who = typeof l === 'string' ? null : l.who;
      const text = typeof l === 'string' ? l : l.text;
      const last = runs[runs.length - 1];
      if (last && last.who === who) last.lines.push(text);
      else runs.push({ who, lines: [text] });
    }
    const step = (i) => {
      if (i >= runs.length) { onDone?.(); return; }
      const sp = this.speaker(runs[i].who, npc);
      this.dialogue.show(sp.name, runs[i].lines, sp.portrait, () => step(i + 1), opts);
    };
    step(0);
  }

  // Name + portrait for a line's speaker (see say()).
  speaker(who, npc) {
    if (!who && npc) return { name: npc.name, portrait: npc.portraitKey };
    if (!who || who === PLAYER.SPRITE_KEY) return { name: PLAYER.NAME, portrait: PLAYER.PORTRAIT_KEY };
    const here = this.npcs?.list.find((n) => n.id === who);
    if (here) return { name: here.name, portrait: here.portraitKey };
    const key = `${who}-portrait`;
    return { name: this.cache.json.get(`${who}-data`)?.name || who, portrait: this.textures.exists(key) ? key : null };
  }

  // After a plain chat (or an item already given): favours (side quests) and
  // Alessio's shop. Never after battles or quizzes.
  afterTalk(target) {
    if (target.id === HEETS.npc && questState.activeChapter !== STEALTH.chapter) { this.offerHeets(target); return; } // that chapter she gives a cigarette instead
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
    if (target.id === SHOP_KEEPER && !inPrologue()) { this.openShop(target); return; }
    if (this.canRematch(target)) this.offerRematch(target);
  }

  // Night veil: day or night from the (hidden) time of day.
  updateClock() {
    const min = Math.floor(clockNow());
    if (min === this.lastClockMin) return;
    this.lastClockMin = min;
    const m = MAPS[this.mapKey];
    // `ambient`: a fixed darkness (the club); `noNight`: never dark.
    this.nightVeil.setAlpha(this.inDreamHouse ? 0.5 : m.ambient ?? (m.noNight ? 0 : nightAlpha(min)));
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
      this.audio?.silence();
      this.scene.start('CutsceneScene', arrivalCutscene()); // like a new game from the title
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
}
