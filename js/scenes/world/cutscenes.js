// js/scenes/world/cutscenes.js
// One-off scenes (js/story/events.js) and their cinematic mode: black bars,
// HUD hidden, the camera on whoever speaks. Also the premise.
// A class mixin of WorldScene: the methods run with `this` = the scene.
import { PLAYER, CAMERA_ZOOM } from '../../config.js';
import { idleFrame } from '../../core/playerSprite.js';
import { questState } from '../../story/questState.js';
import { EVENTS } from '../../story/events.js';
import { PREMISE } from '../../story/premise.js';
import { PROLOGUE } from '../../story/prologue.js';

export const withCutscenes = (Base) => class extends Base {
  // One-off scenes for this map + chapter (js/story/events.js), e.g. Ana's
  // aperitivo. Lines are spoken only by the housemates actually in the room.
  playEvents() {
    if (!this.player?.active) return;
    const ev = EVENTS.find((e) => e.map === this.mapKey && e.chapter === questState.activeChapter
      && !questState.hasFlag(`event:${e.id}`) && (!e.requires || questState.hasFlag(e.requires)));
    if (!ev) return;
    const busy = this.dialogue.open || this.warpLocked || this.seated || this.inCutscene || this.heets
      || this.time.now < (this.cardUntil || 0) // let the chapter card fade first
      || [this.inventory, this.phone, this.minimap, this.pauseMenu].some((o) => o?.open);
    if (busy) { this.time.delayedCall(1500, () => this.playEvents()); return; }
    questState.setFlag(`event:${ev.id}`);
    const here = new Map(this.npcs.list.map((n) => [n.id, n]));
    // Zio Nick speaks in scenes too (`who: 'zionick'`): the camera turns to him.
    here.set(PLAYER.SPRITE_KEY, { sprite: this.player, name: PLAYER.NAME, portraitKey: PLAYER.PORTRAIT_KEY });
    const lines = ev.lines.filter((l) => here.has(l.who));
    this.cutsceneStart();
    const step = (i) => {
      if (i >= lines.length) {
        this.cutsceneEnd();
        if (ev.gift) {
          questState.addSupply(ev.gift, null);
          this.inventory.refresh();
          this.showItemReceived(`${ev.gift.name} x${ev.gift.qty ?? 1}`);
        }
        if (ev.hearts) {
          [...new Set(lines.map((l) => l.who))].filter((id) => id !== PLAYER.SPRITE_KEY)
            .forEach((id) => this.bumpAffinity(id, ev.hearts));
        }
        this.player.facing = 'down'; // he turned to the camera for his lines
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

  // Zio Nick thinking aloud as a scene: black bars, the camera on him, each
  // line big. A line may be { text, zoom }: the camera slams in to
  // CAMERA_ZOOM × zoom with a shake (a realisation), and stays there until
  // the next plain line.
  monologue(lines, onDone) {
    const me = { sprite: this.player, name: PLAYER.NAME, portraitKey: PLAYER.PORTRAIT_KEY };
    this.holdPlayer();
    this.cutsceneStart();
    const step = (i) => {
      if (i >= lines.length) {
        this.cutsceneEnd();
        this.player.facing = 'down';
        onDone?.();
        return;
      }
      const l = typeof lines[i] === 'string' ? { text: lines[i] } : lines[i];
      if (l.zoom) {
        const cam = this.cameras.main;
        const s = this.player;
        cam.pan(s.x, s.y - s.displayHeight * 0.3, 260, 'Quad.easeIn', true);
        cam.zoomTo(CAMERA_ZOOM * l.zoom, 260, 'Quad.easeIn', true);
        this.time.delayedCall(260, () => cam.shake(320, 0.012));
        this.time.delayedCall(700, () =>
          this.dialogue.show(me.name, l.text, me.portraitKey, () => step(i + 1), { big: true }));
        return;
      }
      this.cutsceneFocus(me, l.text);
      this.time.delayedCall(500, () =>
        this.dialogue.show(me.name, l.text, me.portraitKey, () => step(i + 1), { big: true }));
    };
    step(0);
  }

  // Cinematic mode for scenes: black bars, the camera leaves the player and
  // zooms in on whoever is talking (cutsceneFocus), then comes back.
  // Hide / show the HUD (room name, tracker, phone icon, key hints).
  setHudVisible(v) {
    [this.roomLabel, this.keyHints, ...(this.questTracker?.objs || []), ...(this.phoneHud?.objs || [])]
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

  // The premise, once, at the very start (js/story/premise.js). Waits if
  // something is on screen.
  storyIntros() {
    if (!this.player?.active) return;
    if (questState.hasFlag('premise-seen') || questState.activeChapter !== PROLOGUE.chapter) return;
    const busy = this.dialogue.open || this.warpLocked || this.seated
      || [this.inventory, this.phone, this.minimap, this.pauseMenu].some((o) => o?.open);
    if (busy) { this.time.delayedCall(1500, () => this.storyIntros()); return; }
    questState.setFlag('premise-seen');
    this.say(null, PREMISE.lines);
    this.saveGame();
  }
};
