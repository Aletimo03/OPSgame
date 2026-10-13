// js/scenes/WorldScene.js
// One scene that can render ANY map from the registry and warp between them.
// Switching maps = restart this scene with new { mapKey, spawnName } data.

import {
  TILE, PLAYER, DOOR_WIDTH, BATTLE_BG_KEY, BATTLE_BG_PATH, CAMERA_ZOOM, CAMERA_MARGIN,
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
import { createNpcs, updateNpcs, stopNpcs, faceNpcToPlayer, Dialogue } from '../core/npcs.js';
import { resolveInteraction, CHARACTERS, baseStats } from '../core/characters.js';
import { MAPS, START_MAP } from '../../maps/index.js';
import { questState } from '../story/questState.js';
import { advanceChapterIfDone, activeChapter, isStoryComplete } from '../story/chapters.js';
import { QuestTracker } from '../story/QuestTracker.js';
import { Inventory } from '../ui/Inventory.js';
import { PauseMenu } from '../ui/PauseMenu.js';
import { Phone } from '../ui/Phone.js';
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
    (map.props || []).forEach((p) => {
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
    this.physics.add.collider(this.player, this.npcs.group);
    this.dialogue = new Dialogue(this);

    // Warp pads: an overlap zone on each door tile.
    this.setupWarps(map);

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

    // Tiny HUD label so you always know which room you're in.
    this.add
      .text(10, 10, map.name, {
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
  }

  // Camera bounds = the map plus CAMERA_MARGIN tiles all round. On an axis where
  // that's still smaller than what the (zoomed) camera shows, widen the bounds
  // symmetrically so the map sits centred instead of in the top-left corner.
  // Re-run on window resize (the visible area changes).
  fitCameraBounds() {
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
      this.player.body.setVelocity(0);
      stopNpcs(this.npcs);
      return;
    }
    for (const o of overlays) {
      const othersOpen = overlays.some((x) => x !== o && x.open);
      if (o.update(!busy && !othersOpen)) {
        this.player.body.setVelocity(0);
        stopNpcs(this.npcs);
        return;
      }
    }

    const pressedSpace = Phaser.Input.Keyboard.JustDown(this.cursors.space);
    this.keyHints.setVisible(!this.dialogue.open);

    // While a dialogue is open, freeze movement; space closes it.
    if (this.dialogue.open) {
      this.player.body.setVelocity(0);
      stopNpcs(this.npcs);
      if (this.dialogue.mode === 'choice') {
        if (this.justPressed('up')) this.dialogue.moveSelection(-1);
        else if (this.justPressed('down')) this.dialogue.moveSelection(1);
        else if (pressedSpace) this.dialogue.confirm();
      } else if (pressedSpace) {
        this.dialogue.advance(); // next line, or close on the last
      }
      return;
    }

    if (this.warpLocked) {
      this.player.body.setVelocity(0);
      stopNpcs(this.npcs);
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
    this.player.setDepth(this.characterDepth(this.player)); // vs NPCs and props, by feet
    updateNpcs(this, this.npcs, time); // NPCs stroll around so they feel alive

    if (this.spaceGuard && !this.cursors.space.isDown) this.spaceGuard = false;
    if (pressedSpace && !this.spaceGuard) this.tryInteract();

    // Arm warps once the player is clear of every door zone.
    if (!this.canWarp && !this.physics.overlap(this.player, this.warps)) {
      this.canWarp = true;
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
      this.trySit(); // nobody in front: maybe the player is standing on a seat
      return;
    }
    faceNpcToPlayer(target, this.player.facing, this.time.now);
    this.audio?.playSfx('npc-talk'); // interaction blip (no-op until a file is added)
    questState.greet(target.id); // mark NPC as spoken-to

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
        this.dialogue.ask(target.name, b.prompt, b.options, target.portraitKey, () =>
          this.startBattle(target, ch)
        );
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
      this.dialogue.show(target.name, act.dialogue, target.portraitKey);
    }
  }

  // Progress changed: roll the story forward, refresh the HUD and save. Also
  // called by BattleScene after a win. Announces a completed chapter.
  onProgress() {
    const before = questState.activeChapter;
    advanceChapterIfDone();
    this.questTracker?.refresh();
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
    );
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
        if (inside) return this.sitOn(s);
      }
    }
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
  startBattle(npc, chapter) {
    this.scene.pause();
    this.scene.launch('BattleScene', {
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
