// js/scenes/world/dream.js
// Chapter 9, Zio Nick's nightmare (js/story/dream.js): the dream house, the
// bubble of light, the maze and the shadow.
// A class mixin of WorldScene: the methods run with `this` = the scene.
import { TILE, PLAYER } from '../../config.js';
import { idleFrame, sliceSheet, createWalkAnims } from '../../core/playerSprite.js';
import { questState } from '../../story/questState.js';
import { DREAM, dreamActive } from '../../story/dream.js';

export const withDream = (Base) => class extends Base {
  // ── Chapter 9: the dream (js/story/dream.js) ──────────────────────────────
  // Bed → a slow fade, two lines, then the maze.
  enterDream() {
    this.warpLocked = true;
    this.holdPlayer();
    this.showBanner(DREAM.enter[0], 0.3, '#c8a0ff', 0x8a5cff);
    const cam = this.cameras.main;
    cam.fadeOut(1600, 0, 0, 0);
    cam.once('camerafadeoutcomplete', () => {
      questState.setFlag(DREAM.enteredFlag);
      questState.heroHp = null;
      this.onProgress();
      // "Wake up" in the same room… which is now the dream house. If you had
      // already fallen into the maze (a save reloaded mid-dream), straight back there.
      if (questState.hasFlag(DREAM.trashFlag)) this.scene.restart({ mapKey: DREAM.map, spawnName: 'default', notice: DREAM.mazeEnter });
      else this.scene.restart({ mapKey: 'room-20', spawnName: 'bedside' }); // standing in front of the bed
    });
  }

  // Dream house, first time: Zio Nick's lines (he speaks only in the dream),
  // then the new objective appears.
  dreamWakeLines() {
    if (!this.inDreamHouse || questState.hasFlag(DREAM.wokeLinesFlag)) return;
    if (this.dialogue.open || this.warpLocked) { this.time.delayedCall(500, () => this.dreamWakeLines()); return; }
    this.holdPlayer();
    this.dialogue.show(PLAYER.NAME, DREAM.wokeLines, PLAYER.PORTRAIT_KEY, () => {
      questState.setFlag(DREAM.wokeLinesFlag);
      this.questTracker?.refresh();
      this.saveGame();
      this.showBanner(DREAM.newGoal, 0.3, '#ffd54a', 0xffd54a);
    });
  }

  // Dream house, the trash room: the floor opens and you fall into the maze.
  dreamTrashScene() {
    if (!this.inDreamHouse || this.mapKey !== DREAM.trashMap || !questState.hasFlag(DREAM.wokeLinesFlag)) return;
    if (this.dialogue.open || this.warpLocked) { this.time.delayedCall(500, () => this.dreamTrashScene()); return; }
    this.holdPlayer();
    this.warpLocked = true;
    this.cameras.main.shake(600, 0.006);
    this.say(null, DREAM.trashScene, () => {
      questState.setFlag(DREAM.trashFlag);
      this.onProgress();
      const cam = this.cameras.main;
      cam.shake(700, 0.012);
      cam.fadeOut(1200, 0, 0, 0);
      cam.once('camerafadeoutcomplete', () =>
        this.scene.restart({ mapKey: DREAM.map, spawnName: 'default', notice: DREAM.mazeEnter }));
    });
  }

  // Only a bubble of light around Zio Nick: everything else is pitch black.
  // A soft-edged hole (canvas texture, black outside a radial gradient) that
  // follows him, plus four huge black rectangles around it. Above the night
  // veil, the lights and the shadow (so the shadow is unseen in the dark).
  startVision(radiusTiles) {
    const KEY = 'vision-hole';
    if (!this.textures.exists(KEY)) {
      const S = 512;
      const tex = this.textures.createCanvas(KEY, S, S);
      const ctx = tex.getContext();
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, S, S);
      ctx.globalCompositeOperation = 'destination-out';
      const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
      g.addColorStop(0, 'rgba(0,0,0,1)');
      g.addColorStop(0.55, 'rgba(0,0,0,1)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, S, S);
      tex.refresh();
    }
    const D = radiusTiles * 2 * TILE;
    const BIG = 40000;
    const depth = 890000; // over veil (880000), lights (880001), shadow (880002); under the "!" marks
    this.vision = {
      D,
      hole: this.add.image(0, 0, KEY).setDisplaySize(D, D).setDepth(depth),
      rects: [0, 1, 2, 3].map(() => this.add.rectangle(0, 0, BIG, BIG, 0x000000, 1).setOrigin(0, 0).setDepth(depth)),
    };
    this.visionTick();
  }

  visionTick() {
    const v = this.vision;
    if (!v) return;
    const x = this.player.x;
    const y = this.player.y + TILE * 0.3; // centred a bit low: on the body, not the hair
    const h = v.D / 2;
    v.hole.setPosition(x, y);
    const [top, bottom, left, right] = v.rects;
    top.setPosition(x - 20000, y - h - 40000).setSize(40000, 40000);
    bottom.setPosition(x - 20000, y + h).setSize(40000, 40000);
    left.setPosition(x - h - 40000, y - h).setSize(40000, v.D);
    right.setPosition(x + h, y - h).setSize(40000, v.D);
  }

  // A strange, dim colour grade on the world camera in the dream (WebGL only).
  dreamColours() {
    const fx = this.cameras.main.postFX;
    if (!fx?.addColorMatrix) return;
    const cm = fx.addColorMatrix();
    cm.saturate(-0.55);
    cm.hue(-25, true);
    cm.brightness(0.8, true);
  }

  // In the maze: a dim lantern light on Zio Nick, a red vignette that grows as
  // the shadow gets closer, and the shadow itself (shadowReveal, after a few steps).
  startDream(map) {
    this.shadowSpr = null;
    this.lantern = null;
    this.dreadVeil = null;
    this.vision = null;
    this.cameras.main.postFX?.clear?.(); // no dream colours left over from a previous map
    // In the dream there's no interface: no tracker, phone, clock, room name or
    // key hints (update() keeps them hidden), and I / P / M don't open.
    this.hudHidden = this.inDreamHouse || !!map.shadow;
    const radius = this.inDreamHouse ? DREAM.houseVision : map.vision;
    if (radius) { this.startVision(radius); this.dreamColours(); }
    if (this.inDreamHouse) {
      this.time.delayedCall(900, () => this.dreamWakeLines());
      this.time.delayedCall(700, () => this.dreamTrashScene());
    }
    if (!map.shadow && !map.lantern) return;
    this.ensureLightTexture();
    if (map.lantern) {
      this.lantern = this.add.image(this.player.x, this.player.y, 'disco-light')
        .setDisplaySize(TILE * 7, TILE * 7).setTint(0xb8a6d9).setBlendMode(Phaser.BlendModes.ADD)
        .setAlpha(0.45).setDepth(880001);
    }
    if (!map.shadow || !dreamActive()) return;
    const cam = this.cameras.main;
    this.dreadVeil = this.add.rectangle(0, 0, cam.width, cam.height, 0x5a0000, 1)
      .setOrigin(0, 0).setScrollFactor(0).setDepth(1400).setAlpha(0);
    // The shadow rises behind you, at the entrance, once you've walked
    // DREAM.revealTiles away from it (dreamTick → shadowReveal).
    const spawn = map.spawns.default;
    this.shadowStart = this.tileOf({ x: spawn.tx * TILE + TILE / 2, y: spawn.ty * TILE + TILE / 2 + TILE * 1.2 }); // ≈ where the player's feet start
    this.shadowPending = true;
    if (!questState.hasFlag(DREAM.lineFlag('maze'))) {
      this.time.delayedCall(700, () => this.dreamSay('maze'));
    }
  }

  // Zio Nick thinks aloud in the dream, once per line set (DREAM.lines[id]).
  dreamSay(id, after = null) {
    const flag = DREAM.lineFlag(id);
    if (questState.hasFlag(flag)) { after?.(); return; }
    if (this.dialogue.open) { this.time.delayedCall(400, () => this.dreamSay(id, after)); return; }
    questState.setFlag(flag);
    this.holdPlayer();
    this.dialogue.show(PLAYER.NAME, DREAM.lines[id], PLAYER.PORTRAIT_KEY, () => { this.saveGame(); after?.(); });
  }

  // Dream house triggers: leaving the bedroom (into the anteroom) and the
  // corridor outside the room.
  dreamHouseTick() {
    if (!this.inDreamHouse || this.dialogue.open || this.warpLocked) return;
    if (!questState.hasFlag(DREAM.wokeLinesFlag)) return; // first the waking lines
    for (const t of DREAM.houseTriggers) {
      if (t.map !== this.mapKey || questState.hasFlag(DREAM.lineFlag(t.id))) continue;
      const a = t.area && this.map.areas?.[t.area];
      if (a) {
        const f = this.player.body.center;
        const tx = Math.floor(f.x / TILE);
        const ty = Math.floor(f.y / TILE);
        if (tx < a.x0 || tx > a.x1 || ty < a.y0 || ty > a.y1) continue;
      }
      this.dreamSay(t.id);
      return;
    }
  }

  // The scare: everything stops, the screen shakes, the shadow rises behind
  // Zio Nick, he jumps ("!"), then the chase begins.
  shadowReveal() {
    this.shadowPending = false;
    this.warpLocked = true;
    this.holdPlayer();
    const sh = DREAM.shadow;
    const cam = this.cameras.main;
    cam.shake(900, 0.008);
    this.audio?.playSfx('shadow-near');
    sliceSheet(this, sh.key);
    const st = this.shadowStart;
    const s = this.add.sprite(st.tx * TILE + TILE / 2, st.ty * TILE + TILE / 2, sh.key, idleFrame('down'))
      .setOrigin(0.5, 0.96).setScale(PLAYER.SCALE * sh.scale).setTint(0x000000).setAlpha(0);
    s.setDepth(880002); // above the dark (the vision mask still hides it outside your light)
    this.tweens.add({ targets: s, alpha: 0.92, duration: 900 });
    this.time.delayedCall(1000, () => {
      // Zio Nick jumps: a "!" over his head and a hop.
      const p = this.player;
      const mark = this.add.text(p.x, p.y - p.displayHeight * 0.5, '!', {
        fontFamily: 'monospace', fontSize: '40px', fontStyle: 'bold', color: '#ffffff', stroke: '#000000', strokeThickness: 7,
      }).setOrigin(0.5, 1).setDepth(900001);
      this.tweens.add({ targets: mark, y: mark.y - 14, duration: 140, yoyo: true, repeat: 1 });
      this.tweens.add({ targets: p, scaleY: PLAYER.SCALE * 1.12, duration: 110, yoyo: true });
      this.time.delayedCall(700, () => {
        mark.destroy();
        this.dreamSay('scared', () => {
          this.shadowSpr = { sprite: s, anims: createWalkAnims(this, sh.key), facing: 'down', next: null, speed: sh.speed, nextSfx: 0 };
          this.warpLocked = false; // run!
        });
      });
    });
  }

  dreamTick(time, delta) {
    this.visionTick();
    if (this.lantern) this.lantern.setPosition(this.player.x, this.player.y + TILE * 0.4);
    this.dreamHouseTick();
    if (this.shadowPending && !this.dialogue.open && dreamActive()) {
      const f = this.player.body.center;
      const st = this.shadowStart;
      if (Math.hypot(Math.floor(f.x / TILE) - st.tx, Math.floor(f.y / TILE) - st.ty) >= DREAM.revealTiles) this.shadowReveal();
    }
    const sh = this.shadowSpr;
    if (!sh || this.warpLocked) return;
    const s = sh.sprite; // origin at its feet: (s.x, s.y) is where it stands
    const cfg = DREAM.shadow;
    sh.speed = Math.min(cfg.maxSpeed, sh.speed + (cfg.speedUp * delta) / 1000); // it gets faster
    const feet = this.player.body.center; // Zio Nick's feet
    const d = Math.hypot(feet.x - s.x, feet.y - s.y) / TILE;
    if (d < cfg.catchTiles) { this.caughtByShadow(); return; }
    // Dread: red vignette and a tremor when it's close; its sound each time it closes in.
    this.dreadVeil?.setAlpha(Phaser.Math.Clamp((6 - d) / 6, 0, 1) * 0.35);
    if (d < 3 && Math.random() < 0.04) this.cameras.main.shake(120, 0.003);
    // Its sound, again and again while it's near: faster the closer it gets.
    if (d < cfg.nearTiles && time >= sh.nextSfx) {
      this.audio?.playSfx('shadow-near');
      sh.nextSfx = time + 350 + 160 * d;
    }
    // Grid walk: from tile centre to tile centre along the corridors (never
    // through a wall). At each centre it picks the next tile of a shortest
    // path to the tile you stand on.
    let step = (sh.speed * delta) / 1000;
    while (step > 0) {
      if (!sh.next) {
        const here = { tx: Math.floor(s.x / TILE), ty: Math.floor(s.y / TILE) };
        const goal = { tx: Math.floor(feet.x / TILE), ty: Math.floor(feet.y / TILE) };
        sh.next = (here.tx === goal.tx && here.ty === goal.ty) ? null : this.bfsStep(here, goal);
        if (!sh.next) { // same tile as you (or no path): straight at you, inside this tile
          const dx = feet.x - s.x;
          const dy = feet.y - s.y;
          const len = Math.hypot(dx, dy) || 1;
          const k = Math.min(1, step / len);
          s.setPosition(s.x + dx * k, s.y + dy * k);
          this.animateMove(sh, dx * k, dy * k);
          return;
        }
      }
      const wx = sh.next.tx * TILE + TILE / 2;
      const wy = sh.next.ty * TILE + TILE / 2;
      const dx = wx - s.x;
      const dy = wy - s.y;
      const dist = Math.hypot(dx, dy);
      if (dist <= step) { // reached the tile centre: on to the next one
        s.setPosition(wx, wy);
        step -= dist;
        sh.next = null;
        this.animateMove(sh, dx, dy);
      } else {
        s.setPosition(s.x + (dx / dist) * step, s.y + (dy / dist) * step);
        this.animateMove(sh, dx, dy);
        step = 0;
      }
    }
  }

  // Caught: a red flash and the dream starts over.
  caughtByShadow() {
    // One try only: caught = the dream (and the chapter) is over. First the
    // jumpscare: the user's image full screen for DREAM.jumpscareMs with the
    // screen shaking hard and the scream, then Zio Nick wakes up.
    this.warpLocked = true;
    this.holdPlayer();
    questState.setFlag(DREAM.caughtFlag);
    questState.setFlag(DREAM.escapedFlag); // the maze is done either way
    this.onProgress(); // queues the ending (shown after the wake-up)
    this.audio?.silence();
    const W = this.scale.width;
    const H = this.scale.height;
    const objs = [this.add.rectangle(0, 0, W, H, 0x000000, 1).setOrigin(0, 0)];
    if (this.textures.exists('jumpscare')) {
      const img = this.add.image(W / 2, H / 2, 'jumpscare');
      const k = Math.max(W / img.width, H / img.height) * 1.12; // cover, with margin for the shake
      img.setScale(k);
      this.tweens.add({ targets: img, scale: k * 1.06, duration: 90, yoyo: true, repeat: -1 }); // a throbbing face
      objs.push(img);
    }
    objs.forEach((o) => o.setScrollFactor(0).setDepth(3000000));
    let scream = null;
    if (this.cache.audio.exists('jumpscare')) {
      scream = this.sound.add('jumpscare', { volume: 1 });
      scream.play();
    }
    const ms = DREAM.jumpscareMs;
    this.cameras.getCamera('ui')?.shake(ms, 0.03);
    this.cameras.main.shake(ms, 0.02);
    this.time.delayedCall(ms, () => {
      if (scream) this.tweens.add({ targets: scream, volume: 0, duration: 400, onComplete: () => scream.stop() });
      this.cameras.main.fadeOut(600, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () =>
        this.scene.restart({ mapKey: 'room-20', spawnName: 'bedside', notice: DREAM.caughtWake }));
    });
  }

  // Out of the maze: wake up in bed (room-20).
  wakeUp() {
    this.warpLocked = true;
    this.holdPlayer();
    const cam = this.cameras.main;
    cam.fadeOut(1000, 255, 255, 255);
    cam.once('camerafadeoutcomplete', () =>
      this.scene.restart({ mapKey: 'room-20', spawnName: 'bedside', notice: DREAM.wake }));
  }
};
