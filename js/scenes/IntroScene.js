// js/scenes/IntroScene.js
// Intro before the title screen, "edited" live on a timeline that follows the
// music (assets/intro/intro_theme.mp3, 25 s):
//   0 s ............ black screen, the music already playing
//   CLIP_START (7 s) the Google Earth clip (intro_earth.mp4, 6.2 s long), slowed
//                    down (playbackRate) so it stretches to end exactly at LOGO_AT
//   LOGO_AT (20 s) . the "OPS THE GAME by Timo & Gaia" logo (ops_logo.jpg)
//   END_AT (25 s) .. fade → TitleScene
// Everything fills the whole screen ("cover": scaled to cover, centred, the
// overflow cropped; never distorted). Browsers only allow sound after a
// click/key, so a "press a key" screen comes first (its text dissolves when
// you press). The intro can't be skipped (user's choice).
// The Earth clip is shifted so the globe sits in the middle of the screen
// (EARTH_CENTRE, measured on its first frame) and zoomed just enough that the
// shift leaves no black edges.
const CLIP_SECONDS = 6.205;
const LOGO_AT = 20;
const CLIP_START = 7;
const CLIP_RATE = CLIP_SECONDS / (LOGO_AT - CLIP_START); // ≈0.48: the clip fills 7 → 20 s
const END_AT = 25;
// Where the globe is in the clip's first frame (768×498 source px).
const EARTH_CENTRE = { x: 328, y: 216 };
const KEYS = { frame: 'intro-frame', clip: 'intro-clip', logo: 'intro-logo', music: 'intro-theme' };

export default class IntroScene extends Phaser.Scene {
  constructor() {
    super('IntroScene');
  }

  preload() {
    this.load.image(KEYS.frame, 'assets/intro/intro_first_frame.jpg');
    this.load.image(KEYS.logo, 'assets/intro/ops_logo.jpg');
    this.load.video(KEYS.clip, 'assets/intro/intro_earth.mp4', true); // noAudio: the music is separate
    this.load.audio(KEYS.music, 'assets/intro/intro_theme.mp3');
  }

  create() {
    this.cameras.main.setBackgroundColor('#000000');
    this.stage = 'gate'; // 'gate' | 'playing' | 'leaving'
    this.gate = this.add.text(0, 0, 'Premi un tasto o clicca per iniziare', {
      fontFamily: 'monospace', fontSize: '22px', color: '#c8ccd4',
    }).setOrigin(0.5);
    this.gatePulse = this.tweens.add({ targets: this.gate, alpha: 0.35, duration: 900, yoyo: true, repeat: -1 });
    this.layout();
    this.scale.on('resize', this.layout, this);
    this.events.once('shutdown', () => this.scale.off('resize', this.layout, this));

    // Only the first key / click matters: it starts the intro (no skipping).
    const onInput = () => {
      if (this.stage === 'gate') this.begin();
    };
    this.input.keyboard.on('keydown', onInput);
    this.input.on('pointerdown', onInput);
  }

  // Fit an image/video to cover the whole window (overflow cropped, never
  // distorted). With `focus` (a point in source px), that point goes to the
  // screen centre and the zoom grows just enough to keep the screen covered.
  fit(obj, w, h, focus = null) {
    const W = this.scale.width;
    const H = this.scale.height;
    const dx = focus ? w / 2 - focus.x : 0; // source px between the image centre and the focus
    const dy = focus ? h / 2 - focus.y : 0;
    const k = Math.max(W / (w - 2 * Math.abs(dx)), H / (h - 2 * Math.abs(dy)));
    obj.setPosition(W / 2 + dx * k, H / 2 + dy * k).setDisplaySize(w * k, h * k);
  }

  layout() {
    const W = this.scale.width;
    const H = this.scale.height;
    this.gate?.setPosition(W / 2, H / 2);
    for (const o of [this.frameImg, this.video, this.logo]) {
      if (o?.active) this.fit(o, o.baseW, o.baseH, o.focus);
    }
  }

  show(key, kind, focus = null) {
    const obj = kind === 'video' ? this.add.video(0, 0, key) : this.add.image(0, 0, key);
    obj.focus = focus;
    const src = kind === 'video' ? { width: 768, height: 498 } : this.textures.get(key).getSourceImage();
    obj.baseW = src.width;
    obj.baseH = src.height;
    obj.setOrigin(0.5);
    if (kind === 'video') {
      // A video has no size until its texture exists: fit it then (and again
      // when it starts playing, to be safe).
      obj.setPosition(this.scale.width / 2, this.scale.height / 2);
      const refit = () => obj.active && this.fit(obj, obj.baseW, obj.baseH, obj.focus);
      obj.once('created', refit);
      obj.once('playing', refit);
    } else {
      this.fit(obj, obj.baseW, obj.baseH, obj.focus);
    }
    return obj;
  }

  begin() {
    this.stage = 'playing';
    // The "press a key" text dissolves.
    this.gatePulse.stop();
    const gate = this.gate;
    this.gate = null;
    this.tweens.add({ targets: gate, alpha: 0, duration: 700, ease: 'Sine.easeOut', onComplete: () => gate.destroy() });

    this.music = this.sound.add(KEYS.music, { volume: 0.9 });
    if (this.sound.locked) this.sound.once('unlocked', () => this.music.play());
    else this.music.play();

    // 0 → CLIP_START: black, music only.

    // CLIP_START: the clip, on top of the freeze frame (removed once it really
    // plays, so there's never a black flash).
    this.time.delayedCall(CLIP_START * 1000, () => {
      if (this.stage !== 'playing') return;
      // The first frame as a still under the video, until the video really
      // plays (so there's never a black flash between them).
      this.frameImg = this.show(KEYS.frame, 'image', EARTH_CENTRE);
      this.video = this.show(KEYS.clip, 'video', EARTH_CENTRE).setDepth(1);
      this.video.setMute(true);
      this.video.play(false);
      this.video.setPlaybackRate(CLIP_RATE);
      this.video.once('playing', () => this.frameImg?.destroy());
    });

    // LOGO_AT: the logo, fading in quickly over the end of the clip.
    this.time.delayedCall(LOGO_AT * 1000, () => {
      if (this.stage !== 'playing') return;
      this.logo = this.show(KEYS.logo, 'image').setDepth(2).setAlpha(0);
      this.tweens.add({
        targets: this.logo, alpha: 1, duration: 350,
        onComplete: () => { this.video?.stop(); this.video?.destroy(); this.frameImg?.destroy(); },
      });
    });

    // END_AT: on to the title screen.
    this.time.delayedCall(END_AT * 1000, () => this.finish());
  }

  finish() {
    if (this.stage === 'leaving') return;
    this.stage = 'leaving';
    this.cameras.main.fadeOut(500, 0, 0, 0);
    this.tweens.add({ targets: this.music, volume: 0, duration: 450 });
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.music?.stop();
      this.video?.stop();
      this.scene.start('TitleScene');
    });
  }
}
