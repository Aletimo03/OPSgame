// js/scenes/world/heets.js
// Antonella's heets (js/story/heets.js): a quiet smoke, or in a kitchen the
// dark, the footsteps and Nima's chase.
// A class mixin of WorldScene: the methods run with `this` = the scene.
import { TILE, PLAYER, DOOR_WIDTH, CAMERA_ZOOM } from '../../config.js';
import { idleFrame, sliceSheet, createWalkAnims } from '../../core/playerSprite.js';
import { HEETS, inKitchen, nimaStart } from '../../story/heets.js';

export const withHeets = (Base) => class extends Base {
  // Antonella offers a heets (js/story/heets.js). Anywhere but a kitchen Zio
  // Nick smokes it in peace; in a kitchen it's too calm, and Nima comes.
  offerHeets(target) {
    this.dialogue.ask(target.name, HEETS.offer, HEETS.options, target.portraitKey, (i) => {
      if (i !== 0) { this.dialogue.show(target.name, HEETS.declined, target.portraitKey); return; }
      if (inKitchen(this.mapKey)) { this.heetsTooCalm(); return; }
      const line = Phaser.Utils.Array.GetRandom(HEETS.relaxedLines);
      this.say(null, [HEETS.relaxed, line]);
    });
  }

  // Smoking in a kitchen: the music stops, the room goes dark, then the steps.
  heetsTooCalm() {
    this.say(null, HEETS.smoke, () => {
      this.audio?.silence();
      this.say(null, HEETS.quiet, () => {
        const veil = this.nightVeil;
        const dark = this.add.rectangle(veil.x, veil.y, veil.width, veil.height, 0x000000, 1)
          .setOrigin(0, 0).setDepth(veil.depth + 0.5).setAlpha(0);
        this.tweens.add({ targets: dark, alpha: HEETS.dark, duration: HEETS.darkMs });
        this.say(null, HEETS.dots, () => this.heetsFootsteps());
      });
    });
  }

  // Three giant footsteps shake the screen, then Nima bursts in.
  heetsFootsteps() {
    this.inCutscene = true; // everyone stands still, listening (until the chase)
    const ui = this.cameras.getCamera('ui');
    for (const st of HEETS.steps) {
      this.time.delayedCall(st.at, () => {
        this.cameras.main.shake(st.ms, st.power);
        ui?.shake(st.ms, st.power);
      });
    }
    this.time.delayedCall(HEETS.runAt, () => this.startHeetsChase());
  }

  // Nima comes in through the kitchen door, as a little cutscene: the camera
  // goes to the door and he walks out of it (a sprite of his own, cropped at
  // the door's top edge so he appears from inside it; the real NPC, if he's in
  // the room, steps aside). Then the camera returns and heetsTick runs him.
  startHeetsChase() {
    const real = this.npcs.list.find((n) => n.id === HEETS.chaser);
    if (real) {
      real.wander = false;
      real.sprite.setVisible(false);
      real.sprite.body.enable = false;
      this.questMarks.find((m) => m.npc === real)?.t.setAlpha(0);
    }
    const key = HEETS.chaser;
    sliceSheet(this, key);
    const anims = createWalkAnims(this, key);
    const at = nimaStart(this.map);
    const doorX = (at.tx + (this.map.warps[0].w || DOOR_WIDTH) / 2) * TILE;
    const doorTop = at.ty * TILE;
    const s = this.add.sprite(doorX, doorTop, key, idleFrame('down')).setScale(PLAYER.SCALE);
    const h = s.displayHeight;
    s.y = doorTop - h / 2; // fully above the door's top edge: hidden
    s.setDepth(doorTop + h * 2);
    const clip = () => { // hide whatever is still above the door's top edge
      const hidden = Math.max(0, doorTop - (s.y - h / 2)) / PLAYER.SCALE;
      s.setCrop(0, hidden, s.width, Math.max(0, s.height - hidden));
    };
    clip();
    this.cutsceneStart();
    const cam = this.cameras.main;
    cam.pan(doorX, doorTop + h, HEETS.panMs, 'Sine.easeInOut', true);
    cam.zoomTo(CAMERA_ZOOM * 1.45, HEETS.panMs, 'Sine.easeInOut', true);
    this.time.delayedCall(HEETS.panMs, () => {
      s.anims.play(anims.down, true);
      this.tweens.add({
        targets: s, y: doorTop + h / 2, duration: HEETS.enterMs, onUpdate: clip,
        onComplete: () => {
          s.setCrop();
          s.anims.stop();
          s.setFrame(idleFrame('down'));
          cam.shake(220, 0.01);
          this.audio?.playMusic(HEETS.music);
          this.audio?.playSfx('shadow-near');
          this.showBanner(HEETS.shout, 0.22, '#ff8a8a', 0xff8a8a);
          this.time.delayedCall(HEETS.holdMs, () => {
            this.heets = { sprite: s, anims, facing: 'down', path: null, nextSfx: 0 };
            this.cutsceneEnd(); // heetsTick starts when the camera is back
          });
        },
      });
    });
  }

  // One frame of the chase: Nima runs tile to tile along the shortest way
  // round the furniture. Reaching you ends it; the door is in doWarp.
  heetsTick(delta) {
    const h = this.heets;
    if (!h || this.warpLocked) return;
    const s = h.sprite;
    const p = this.player;
    const away = Math.hypot(p.x - s.x, p.y - s.y) / TILE;
    if (away < HEETS.catchTiles) { this.heetsCaught(); return; }
    if (away < HEETS.nearTiles && this.time.now >= h.nextSfx) { // faster as he closes in, like the shadow
      this.audio?.playSfx('shadow-near');
      h.nextSfx = this.time.now + 350 + 160 * away;
    }
    if (!h.path) h.path = this.bfsStep(this.tileOf(s), this.tileOf(p), null, this.npcs.blocked);
    const wx = h.path ? h.path.tx * TILE + TILE / 2 : p.x;
    const wy = h.path ? h.path.ty * TILE + TILE / 2 : p.y;
    const dist = Math.hypot(wx - s.x, wy - s.y);
    const step = (HEETS.nimaSpeed * delta) / 1000;
    const k = dist <= step ? 1 : step / dist;
    const dx = (wx - s.x) * k;
    const dy = (wy - s.y) * k;
    s.setPosition(s.x + dx, s.y + dy);
    if (dist <= step) h.path = null;
    this.animateMove(h, dx, dy);
    s.setDepth(this.characterDepth(s));
  }

  // Caught: black screen, then Zio Nick wakes up in his room.
  heetsCaught() {
    this.warpLocked = true;
    this.heets.sprite.anims.stop();
    this.setHudVisible(false);
    this.cameras.main.fadeOut(120, 0, 0, 0);
    this.audio?.silence();
    const wake = () => this.scene.restart({ mapKey: 'room-20', spawnName: 'bedside', heetsDazed: true });
    if (!this.cache.audio.exists('jumpscare')) { this.time.delayedCall(HEETS.blackMs, wake); return; }
    const scream = this.sound.add('jumpscare', { volume: 1 });
    scream.play();
    // Fades out in the dark. Stop it only once the tween is over: a tween still
    // writing to a destroyed sound throws and freezes the whole game.
    this.tweens.add({
      targets: scream, volume: 0, duration: HEETS.blackMs,
      onComplete: () => { scream.stop(); wake(); },
    });
  }

  // Waking up after Nima caught you: a slow fade in, the view swaying, stars
  // over his head, his lines, then a few seconds of walking slowly.
  startDazed() {
    const cam = this.cameras.main;
    cam.fadeIn(HEETS.dazedFadeMs);
    this.dazed = true;
    this.dazeMark = this.add.text(this.player.x, this.player.y - this.player.displayHeight * 0.5, '💫', { fontSize: '34px' })
      .setOrigin(0.5, 1).setDepth(900000);
    const sway = this.tweens.add({
      targets: cam, rotation: { from: -HEETS.dazedSway, to: HEETS.dazedSway },
      duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });
    this.time.delayedCall(HEETS.dazedFadeMs, () => this.say(null, HEETS.dazed, () => {
      this.time.delayedCall(HEETS.dazedMs, () => {
        sway.stop();
        this.tweens.add({ targets: cam, rotation: 0, duration: 500 });
        this.dazed = false;
        this.dazeMark.destroy();
        this.dazeMark = null;
      });
    }));
  }
};
