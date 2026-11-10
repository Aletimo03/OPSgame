// js/scenes/CutsceneScene.js
// A full-screen video cutscene. Plays `video` (an MP4, with its own sound
// unless `noAudio`) cover-fitted. Over the PAUSED WorldScene (chapter 8: leaving
// the house for the Alcatraz, js/story/alcatraz.js) it then calls
// world.onCutsceneDone(); with `next: { scene, data }` (the opening of a new
// game, js/story/prologue.js) it starts that scene instead. `lines`: at
// `holdAt` seconds (else at the end) the picture holds and `speaker` says them;
// then the clip goes on, from `resumeAt` if given.
// If the file isn't there yet, a title card (`title`) stands in for 3 s. Hold
// Space SKIP_HOLD_MS to skip, like the intro.
import { PLAYER } from '../config.js';
import { Dialogue } from '../core/npcs.js';

const KEY = 'cutscene-video';
const SKIP_HOLD_MS = 1500;
const CARD_MS = 3000;

export default class CutsceneScene extends Phaser.Scene {
  constructor() {
    super('CutsceneScene');
  }

  init(data) {
    this.videoPath = data.video;
    this.title = data.title || '';
    this.returnScene = data.returnScene || 'WorldScene';
    this.noAudio = !!data.noAudio;
    this.lines = data.lines || null;
    this.speaker = data.speaker || '';
    this.holdAt = data.holdAt || 0;
    this.resumeAt = data.resumeAt || 0;
    this.over = false; // the clip has played to its end
    this.next = data.next || null;
    this.talking = false;
    this.done = false;
    this.holdMs = 0;
  }

  preload() {
    this.videoOk = true;
    this.load.once('loaderror', (file) => { if (file.key === KEY) this.videoOk = false; });
    if (this.cache.video.exists(KEY)) this.cache.video.remove(KEY); // a new clip under the same key
    this.load.video(KEY, this.videoPath, this.noAudio);
    if (this.lines && !this.textures.exists(PLAYER.PORTRAIT_KEY)) this.load.image(PLAYER.PORTRAIT_KEY, PLAYER.PORTRAIT_PATH);
  }

  create() {
    const W = this.scale.width;
    const H = this.scale.height;
    this.add.rectangle(0, 0, W, H, 0x000000, 1).setOrigin(0, 0);
    if (this.videoOk && this.cache.video.exists(KEY)) {
      const v = this.add.video(W / 2, H / 2, KEY);
      const fit = () => {
        const w = v.video?.videoWidth || v.width;
        const h = v.video?.videoHeight || v.height;
        if (!w || !h) return;
        const k = Math.max(W / w, H / h); // cover, never distorted
        v.setDisplaySize(w * k, h * k);
      };
      v.once('created', fit);
      v.once('playing', fit);
      v.once('complete', () => this.ended());
      if (this.noAudio) v.setMute(true);
      v.play(false);
      this.vid = v;
    } else {
      const t = this.add.text(W / 2, H / 2, this.title, {
        fontFamily: 'monospace', fontSize: '34px', color: '#ffffff', fontStyle: 'bold',
      }).setOrigin(0.5).setAlpha(0);
      this.tweens.add({ targets: t, alpha: 1, duration: 600, yoyo: true, hold: CARD_MS - 1200 });
      this.time.delayedCall(CARD_MS, () => this.ended());
    }
    this.space = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.enter = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    this.skip = this.add.text(W - 16, H - 16, '', { fontFamily: 'monospace', fontSize: '13px', color: '#c8ccd4' })
      .setOrigin(1, 1);
    this.cameras.main.fadeIn(300);
  }

  update(time, delta) {
    if (this.done) return;
    if (this.talking) {
      const J = Phaser.Input.Keyboard.JustDown;
      const space = J(this.space);
      if (J(this.enter) || space) this.dialogue.advance();
      return;
    }
    if (this.holdAt && this.lines && this.vid?.getCurrentTime() >= this.holdAt) { this.talk(); return; }
    this.holdMs = this.space.isDown ? this.holdMs + delta : 0;
    this.skip.setText(this.holdMs > 0 ? `Tieni premuto Spazio per saltare ${Math.round((this.holdMs / SKIP_HOLD_MS) * 100)}%` : '');
    if (this.holdMs >= SKIP_HOLD_MS) this.finish();
  }

  // The clip is over: its lines if they haven't been said yet, then out.
  ended() {
    this.over = true;
    if (this.lines?.length) this.talk();
    else this.finish();
  }

  // Hold the picture for the lines, then go on.
  talk() {
    const lines = this.lines;
    this.lines = null;
    this.talking = true;
    this.vid?.setPaused(true);
    this.skip.setText('');
    this.dialogue = new Dialogue(this);
    this.dialogue.show(this.speaker, lines, PLAYER.PORTRAIT_KEY, () => {
      this.talking = false;
      if (this.over || !this.vid) { this.finish(); return; }
      if (this.resumeAt) this.vid.setCurrentTime(this.resumeAt);
      this.vid.setPaused(false);
    });
  }

  finish() {
    if (this.done) return;
    this.done = true;
    this.cameras.main.fadeOut(300);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.vid?.stop();
      if (this.next) { this.scene.start(this.next.scene, this.next.data); return; }
      const world = this.scene.get(this.returnScene);
      this.scene.stop();
      world.onCutsceneDone();
    });
  }
}
