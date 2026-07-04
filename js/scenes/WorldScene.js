// js/scenes/WorldScene.js
// One scene that can render ANY map from the registry and warp between them.
// Switching maps = restart this scene with new { mapKey, spawnName } data.

import { TILE, PLAYER, DOOR_WIDTH, BATTLE_BG_KEY, BATTLE_BG_PATH } from '../config.js';
import { drawMap, drawStairs, buildWallColliders } from '../core/MapRenderer.js';
import {
  preparePlayerTexture,
  createPlayerAnims,
  movePlayer,
  idleFrame,
} from '../core/playerSprite.js';
import { createNpcs, updateNpcs, stopNpcs, faceNpcToPlayer, Dialogue } from '../core/npcs.js';
import { resolveInteraction, CHARACTERS } from '../core/characters.js';
import { MAPS, START_MAP } from '../../maps/index.js';
import { questState } from '../story/questState.js';
import { advanceChapterIfDone } from '../story/chapters.js';
import { QuestTracker } from '../story/QuestTracker.js';
import { Inventory } from '../ui/Inventory.js';
import { loadAudio, attachAudio } from '../core/audio.js';

export default class WorldScene extends Phaser.Scene {
  constructor() {
    super('WorldScene');
  }

  init(data) {
    this.mapKey = data.mapKey || START_MAP;
    this.spawnName = data.spawnName || 'default';
    this.warpLocked = false;
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

    // Static room props (bed, desk, etc.) — drawn depth 1, optionally solid.
    (map.props || []).forEach((p) => {
      const px = p.tx * TILE;
      const py = p.ty * TILE;
      const spr = this.add.image(px, py, p.key).setOrigin(0, 0).setDepth(1);
      let dw, dh;
      if (p.w != null) {
        dw = p.w * TILE;
        dh = p.h != null ? p.h * TILE : dw * (spr.height / spr.width);
        spr.setDisplaySize(dw, dh);
      } else {
        dw = spr.width;
        dh = spr.height;
      }
      if (p.solid) {
        // Use explicit tight collider box if provided, else fall back to full display size.
        let zx, zy, zw, zh;
        if (p.collider) {
          zw = p.collider.w * TILE;
          zh = p.collider.h * TILE;
          zx = p.collider.tx * TILE + zw / 2;
          zy = p.collider.ty * TILE + zh / 2;
        } else {
          zw = dw; zh = dh;
          zx = px + dw / 2; zy = py + dh / 2;
        }
        const zone = this.add.zone(zx, zy, zw, zh);
        this.physics.add.existing(zone, true);
        this.walls.add(zone);
      }
    });

    // Player frames.
    const { frameW, frameH } = preparePlayerTexture(this, this.playerLoaded);
    this.frameW = frameW;
    this.frameH = frameH;

    // Spawn position (named spawn for the door we arrived through).
    const spawn = map.spawns[this.spawnName] || map.spawns.default;
    this.player = this.physics.add.sprite(
      spawn.tx * TILE + TILE / 2,
      spawn.ty * TILE + TILE / 2,
      PLAYER.SPRITE_KEY,
      idleFrame('down')
    );
    this.player.facing = 'down';
    this.player.setScale(PLAYER.SCALE);
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
    this.cameras.main.setBounds(0, 0, worldW, worldH);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setRoundPixels(true);
    this.cameras.main.fadeIn(220);

    // Input.
    this.cursors = this.input.keyboard.createCursorKeys();
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

    // Active-quest checklist, pinned to the top-right.
    this.questTracker = new QuestTracker(this);

    // Bag overlay — toggle with I key.
    this.inventory = new Inventory(this);

    // Soundtrack — plays the WorldScene theme, adopting the already-playing
    // instance across map warps so it never restarts.
    attachAudio(this);
    this.audio.playSceneMusic();
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

  update(time) {
    if (!this.player) return;

    // Inventory overlay blocks everything else when open.
    if (this.inventory.update()) {
      this.player.body.setVelocity(0);
      stopNpcs(this.npcs);
      return;
    }

    const pressedSpace = Phaser.Input.Keyboard.JustDown(this.cursors.space);

    // While a dialogue is open, freeze movement; space closes it.
    if (this.dialogue.open) {
      this.player.body.setVelocity(0);
      stopNpcs(this.npcs);
      if (this.dialogue.mode === 'choice') {
        if (Phaser.Input.Keyboard.JustDown(this.cursors.up)) this.dialogue.moveSelection(-1);
        else if (Phaser.Input.Keyboard.JustDown(this.cursors.down)) this.dialogue.moveSelection(1);
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

    movePlayer(this.player, this.cursors);
    this.player.setDepth(this.player.y); // depth-sort vs NPCs by feet
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
    if (!target) return;
    faceNpcToPlayer(target, this.player.facing, this.time.now);
    this.audio?.playSfx('npc-talk'); // interaction blip (no-op until a file is added)
    questState.greet(target.id); // mark NPC as spoken-to

    // Resolve what this character says/does for the CURRENT chapter, live from
    // their JSON. battle/item only ever come from a chapter entry, so a fight
    // can never trigger in a chapter where it wasn't authored.
    const act = resolveInteraction(target.data);

    if (act.battle) {
      // Greet-based objective — advance chapter immediately after greeting.
      advanceChapterIfDone();
      this.questTracker?.refresh();
      // Lines first, then a branching prompt; either choice leads to the fight.
      this.dialogue.show(target.name, act.dialogue, target.portraitKey, () => {
        const b = act.battle;
        this.dialogue.ask(target.name, b.prompt, b.options, target.portraitKey, () =>
          this.startBattle(target)
        );
      });
    } else if (act.quiz) {
      // Quiz-based objective — the chapter advances only on a CORRECT answer.
      const q = act.quiz;
      const already = questState.isSolved(target.id);
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
              this.dialogue.show(target.name, q.correct || 'Esatto!', target.portraitKey, () => {
                advanceChapterIfDone();
                this.questTracker?.refresh();
              });
            } else {
              this.dialogue.show(target.name, q.wrong || 'Sbagliato! Riprova.', target.portraitKey);
            }
          });
        });
      }
    } else if (act.item) {
      // Item-based objective — chapter advances only once the item is given.
      const already = questState.hasItem(act.item.name);
      const lines = already
        ? (act.dialogueAfter || `Hai già ${act.item.name} con te!`)
        : act.dialogue;
      this.dialogue.show(target.name, lines, target.portraitKey, () => {
        if (!already) {
          questState.addItem(act.item);
          advanceChapterIfDone();
          this.questTracker?.refresh();
          this.inventory.refresh();
          this.showItemReceived(act.item.name);
        }
      });
    } else {
      advanceChapterIfDone();
      this.questTracker?.refresh();
      this.dialogue.show(target.name, act.dialogue, target.portraitKey);
    }
  }

  // Brief "you got an item" pop-up, auto-dismisses after 2.2 s.
  showItemReceived(name) {
    const cam = this.cameras.main;
    const W = cam.width;
    const H = cam.height;
    const msg = `✦  Hai ottenuto: ${name}!`;

    const bg = this.add
      .rectangle(W / 2, H * 0.42, Math.min(480, W - 48), 52, 0x0d0f17, 0.95)
      .setScrollFactor(0)
      .setDepth(2500000)
      .setStrokeStyle(2, 0xffd54a, 0.9);
    const txt = this.add
      .text(W / 2, H * 0.42, msg, {
        fontFamily: 'monospace',
        fontSize: '19px',
        color: '#ffd54a',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(2500001);

    this.time.delayedCall(2200, () => {
      bg.destroy();
      txt.destroy();
    });
  }

  // Pause the overworld and overlay the battle; we resume here afterwards so the
  // player is exactly where they were.
  startBattle(npc) {
    this.scene.pause();
    this.scene.launch('BattleScene', {
      enemyKey: npc.spriteKey,    // texture for the enemy sprite
      enemyChar: npc.character,   // character.json folder (enemy stats)
      enemyName: npc.name,
      heroChar: PLAYER.SPRITE_KEY, // protagonist character.json folder
      heroKey: PLAYER.SPRITE_KEY,  // protagonist texture
      heroName: PLAYER.NAME,
      returnScene: 'WorldScene',
    });
  }
}
