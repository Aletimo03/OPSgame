// js/scenes/CutsceneScene.js
// A full-screen video cutscene over the PAUSED WorldScene (chapter 8: leaving
// the house for the Alcatraz, js/story/alcatraz.js). Plays `video` (an MP4,
// with its own sound) cover-fitted, then calls world.onCutsceneDone(). If the
// file isn't there yet, a title card (`title`) stands in for 3 s. Hold Space
// SKIP_HOLD_MS to skip, like the intro.
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
    this.done = false;
    this.holdMs = 0;
  }

  preload() {
    this.videoOk = true;
    this.load.once('loaderror', (file) => { if (file.key === KEY) this.videoOk = false; });
    if (this.cache.video.exists(KEY)) this.cache.video.remove(KEY); // a new clip under the same key
    this.load.video(KEY, this.videoPath, false); // with sound
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
      v.once('complete', () => this.finish());
      v.play(false);
      this.vid = v;
    } else {
      const t = this.add.text(W / 2, H / 2, this.title, {
        fontFamily: 'monospace', fontSize: '34px', color: '#ffffff', fontStyle: 'bold',
      }).setOrigin(0.5).setAlpha(0);
      this.tweens.add({ targets: t, alpha: 1, duration: 600, yoyo: true, hold: CARD_MS - 1200 });
      this.time.delayedCall(CARD_MS, () => this.finish());
    }
    this.space = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.skip = this.add.text(W - 16, H - 16, '', { fontFamily: 'monospace', fontSize: '13px', color: '#c8ccd4' })
      .setOrigin(1, 1);
    this.cameras.main.fadeIn(300);
  }

  update(time, delta) {
    if (this.done) return;
    this.holdMs = this.space.isDown ? this.holdMs + delta : 0;
    this.skip.setText(this.holdMs > 0 ? `Tieni premuto Spazio per saltare ${Math.round((this.holdMs / SKIP_HOLD_MS) * 100)}%` : '');
    if (this.holdMs >= SKIP_HOLD_MS) this.finish();
  }

  finish() {
    if (this.done) return;
    this.done = true;
    this.cameras.main.fadeOut(300);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.vid?.stop();
      const world = this.scene.get(this.returnScene);
      this.scene.stop();
      world.onCutsceneDone();
    });
  }
}
