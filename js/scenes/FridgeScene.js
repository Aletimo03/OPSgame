// js/scenes/FridgeScene.js
// First-person minigame (chapter 7, js/story/fridge.js), launched over a
// PAUSED WorldScene like BattleScene. The open, dirty fridge fills the screen;
// FRIDGE.flies flies buzz around (at most FRIDGE.onScreen at once). Move the
// crosshair with the arrows / WASD and press Space to squirt white detergent:
// FRIDGE.ammo shots, then a FRIDGE.reloadMs reload. When every fly is down:
// fade to black, half a second of black, the clean fridge fades in, and Space
// goes back to the house (world.onFridgeDone). Esc gives up (try again later).
import { FRIDGE } from '../story/fridge.js';

const KEYS = { dirty: 'fridge-dirty', clean: 'fridge-clean', fly: 'fridge-fly' };

export default class FridgeScene extends Phaser.Scene {
  constructor() {
    super('FridgeScene');
  }

  init(data) {
    this.returnScene = data.returnScene || 'WorldScene';
  }

  preload() {
    this.load.image(KEYS.dirty, 'assets/minigames/fridge/fridge_dirty.jpg');
    this.load.image(KEYS.clean, 'assets/minigames/fridge/fridge_clean.jpg');
    this.load.image(KEYS.fly, 'assets/minigames/fridge/fly.png');
  }

  create() {
    const W = this.scale.width;
    const H = this.scale.height;
    this.unit = Math.min(W, H) / 800; // sizes scale with the window
    this.stage = 'play'; // 'play' | 'outro' | 'done'
    this.killed = 0;
    this.spawned = 0;
    this.ammo = FRIDGE.ammo;
    this.reloading = false;
    this.flies = [];

    this.bg = this.cover(this.add.image(W / 2, H / 2, KEYS.dirty));

    // HUD
    const hud = { fontFamily: 'monospace', fontSize: `${Math.round(20 * this.unit + 6)}px`, color: '#ffffff', stroke: '#000000', strokeThickness: 5 };
    this.countText = this.add.text(16, 14, '', hud).setDepth(10);
    this.ammoText = this.add.text(W - 16, 14, '', hud).setOrigin(1, 0).setDepth(10);
    this.reloadBar = this.add.graphics().setDepth(10);
    this.add.text(W / 2, H - 12, '←↑↓→ / WASD mira · Spazio spruzza · Esc esci', { ...hud, fontSize: '14px', strokeThickness: 4 })
      .setOrigin(0.5, 1).setDepth(10);
    const title = this.add.text(W / 2, H * 0.12, 'Fai fuori le mosche!', { ...hud, fontSize: `${Math.round(34 * this.unit + 8)}px`, color: '#ffd54a' })
      .setOrigin(0.5).setDepth(10);
    this.tweens.add({ targets: title, alpha: 0, delay: 1500, duration: 600, onComplete: () => title.destroy() });

    // Crosshair
    this.cx = W / 2;
    this.cy = H / 2;
    this.cross = this.add.graphics().setDepth(9);
    this.crossR = 26 * this.unit + 8;

    // Input
    const K = Phaser.Input.Keyboard.KeyCodes;
    this.keys = this.input.keyboard.addKeys({
      left: K.LEFT, right: K.RIGHT, up: K.UP, down: K.DOWN, a: K.A, d: K.D, w: K.W, s: K.S, space: K.SPACE, esc: K.ESC,
    });

    this.updateHud();
    this.time.addEvent({ delay: 450, loop: true, callback: () => this.spawnFlies() });
    this.spawnFlies();
  }

  // Scale an image to cover the window (centred, overflow cropped).
  cover(img) {
    const W = this.scale.width;
    const H = this.scale.height;
    const k = Math.max(W / img.width, H / img.height);
    return img.setDisplaySize(img.width * k, img.height * k);
  }

  spawnFlies() {
    if (this.stage !== 'play') return;
    const alive = this.flies.filter((f) => !f.dead).length;
    if (alive >= FRIDGE.onScreen || this.spawned >= FRIDGE.flies) return;
    const W = this.scale.width;
    const H = this.scale.height;
    const size = 70 * this.unit + 20;
    // Come in from a random side.
    const side = Phaser.Math.Between(0, 3);
    const x = side === 0 ? -size : side === 1 ? W + size : Phaser.Math.Between(size, W - size);
    const y = side === 2 ? -size : side === 3 ? H + size : Phaser.Math.Between(size, H - size);
    const img = this.add.image(x, y, KEYS.fly).setDepth(5);
    img.setDisplaySize(size, size * (img.height / img.width));
    const fly = { img, size, vx: 0, vy: 0, turnAt: 0, phase: Math.random() * 6, dead: false, entering: true };
    this.aimFly(fly, W / 2 + Phaser.Math.Between(-W / 4, W / 4), H / 2 + Phaser.Math.Between(-H / 4, H / 4));
    this.flies.push(fly);
    this.spawned++;
  }

  // Head towards (tx, ty) at a random fly speed.
  aimFly(fly, tx, ty) {
    const sp = Phaser.Math.Between(140, 260) * this.unit + 40;
    const a = Math.atan2(ty - fly.img.y, tx - fly.img.x);
    fly.vx = Math.cos(a) * sp;
    fly.vy = Math.sin(a) * sp;
    fly.turnAt = this.time.now + Phaser.Math.Between(350, 1100);
  }

  update(time, delta) {
    const dt = Math.min(delta, 50) / 1000;
    if (this.stage === 'play') {
      this.moveCrosshair(dt);
      this.moveFlies(time, dt);
      if (Phaser.Input.Keyboard.JustDown(this.keys.space)) this.shoot();
      if (Phaser.Input.Keyboard.JustDown(this.keys.esc)) this.leave(false);
    } else if (this.stage === 'done' && Phaser.Input.Keyboard.JustDown(this.keys.space)) {
      this.leave(true);
    }
    this.drawCrosshair();
  }

  moveCrosshair(dt) {
    const k = this.keys;
    const sp = 620 * this.unit + 120;
    const dx = (k.right.isDown || k.d.isDown ? 1 : 0) - (k.left.isDown || k.a.isDown ? 1 : 0);
    const dy = (k.down.isDown || k.s.isDown ? 1 : 0) - (k.up.isDown || k.w.isDown ? 1 : 0);
    const n = dx && dy ? Math.SQRT1_2 : 1;
    this.cx = Phaser.Math.Clamp(this.cx + dx * sp * n * dt, 0, this.scale.width);
    this.cy = Phaser.Math.Clamp(this.cy + dy * sp * n * dt, 0, this.scale.height);
  }

  moveFlies(time, dt) {
    const W = this.scale.width;
    const H = this.scale.height;
    for (const f of this.flies) {
      if (f.dead) continue;
      const m = f.size / 2;
      if (f.entering && f.img.x > m && f.img.x < W - m && f.img.y > m && f.img.y < H - m) f.entering = false;
      if (time >= f.turnAt) this.aimFly(f, Phaser.Math.Between(m, W - m), Phaser.Math.Between(m, H - m));
      f.img.x += f.vx * dt;
      f.img.y += f.vy * dt + Math.sin(time / 90 + f.phase) * 40 * dt; // buzzing wobble
      if (!f.entering) { // bounce inside the screen once in
        if (f.img.x < m || f.img.x > W - m) { f.vx *= -1; f.img.x = Phaser.Math.Clamp(f.img.x, m, W - m); }
        if (f.img.y < m || f.img.y > H - m) { f.vy *= -1; f.img.y = Phaser.Math.Clamp(f.img.y, m, H - m); }
      }
      f.img.setFlipX(f.vx < 0); // the art faces right
      f.img.setAngle(Math.sin(time / 120 + f.phase) * 8);
    }
  }

  shoot() {
    if (this.reloading || this.ammo <= 0) return;
    this.ammo--;
    const tx = this.cx;
    const ty = this.cy;
    // A white squirt flying from the bottom of the screen to the crosshair.
    const W = this.scale.width;
    const H = this.scale.height;
    const drop = this.add.circle(W / 2, H + 10, 10 * this.unit + 4, 0xffffff, 0.95).setDepth(8);
    this.tweens.add({
      targets: drop, x: tx, y: ty, duration: 130, ease: 'Quad.easeOut',
      onComplete: () => {
        drop.destroy();
        const splat = this.add.circle(tx, ty, 14 * this.unit + 6, 0xffffff, 0.9).setDepth(8);
        this.tweens.add({ targets: splat, scale: 2.4, alpha: 0, duration: 320, onComplete: () => splat.destroy() });
        this.hitAt(tx, ty);
      },
    });
    if (this.ammo === 0) this.reload();
    this.updateHud();
  }

  hitAt(x, y) {
    const target = this.flies
      .filter((f) => !f.dead && Phaser.Math.Distance.Between(x, y, f.img.x, f.img.y) < f.size * 0.45 + this.crossR * 0.5)
      .sort((a, b) => Phaser.Math.Distance.Between(x, y, a.img.x, a.img.y) - Phaser.Math.Distance.Between(x, y, b.img.x, b.img.y))[0];
    if (!target) return;
    target.dead = true;
    this.killed++;
    target.img.setTint(0xffffff).setTintFill(0xf4f4f4);
    this.tweens.add({
      targets: target.img, y: this.scale.height + target.size, angle: 200, alpha: 0.4, duration: 700, ease: 'Quad.easeIn',
      onComplete: () => target.img.destroy(),
    });
    this.cameras.main.shake(90, 0.003);
    this.updateHud();
    if (this.killed >= FRIDGE.flies) this.time.delayedCall(700, () => this.outro());
  }

  reload() {
    this.reloading = true;
    this.reloadStart = this.time.now;
    this.time.delayedCall(FRIDGE.reloadMs, () => {
      this.reloading = false;
      this.ammo = FRIDGE.ammo;
      this.updateHud();
    });
  }

  updateHud() {
    this.countText.setText(`🪰 ${this.killed}/${FRIDGE.flies}`);
    this.ammoText.setText(this.reloading ? 'Ricarica...' : '💧'.repeat(this.ammo) + '·'.repeat(FRIDGE.ammo - this.ammo));
  }

  drawCrosshair() {
    const g = this.cross;
    g.clear();
    if (this.stage !== 'play') return;
    const r = this.crossR;
    for (const [w, c] of [[6, 0x000000], [3, 0xffffff]]) {
      g.lineStyle(w, c, 1).strokeCircle(this.cx, this.cy, r);
      g.lineBetween(this.cx - r - 10, this.cy, this.cx - r * 0.4, this.cy);
      g.lineBetween(this.cx + r * 0.4, this.cy, this.cx + r + 10, this.cy);
      g.lineBetween(this.cx, this.cy - r - 10, this.cx, this.cy - r * 0.4);
      g.lineBetween(this.cx, this.cy + r * 0.4, this.cx, this.cy + r + 10);
    }
    // reload progress under the ammo
    this.reloadBar.clear();
    if (this.reloading) {
      const p = Math.min(1, (this.time.now - this.reloadStart) / FRIDGE.reloadMs);
      const W = this.scale.width;
      this.reloadBar.fillStyle(0x000000, 0.6).fillRect(W - 176, 50, 160, 10);
      this.reloadBar.fillStyle(0x8fd3ff, 1).fillRect(W - 176, 50, 160 * p, 10);
    }
  }

  // All flies down: fade to black, half a second of black, the clean fridge.
  outro() {
    if (this.stage !== 'play') return;
    this.stage = 'outro';
    this.reloadBar.clear();
    const cam = this.cameras.main;
    cam.fadeOut(400, 0, 0, 0);
    cam.once('camerafadeoutcomplete', () => {
      this.time.delayedCall(500, () => {
        this.bg.setTexture(KEYS.clean);
        this.cover(this.bg);
        [this.countText, this.ammoText].forEach((t) => t.setVisible(false));
        cam.fadeIn(600, 0, 0, 0);
        const W = this.scale.width;
        const H = this.scale.height;
        const box = this.add.rectangle(W / 2, H * 0.84, Math.min(620, W - 40), 110, 0x0d0f17, 0.88)
          .setStrokeStyle(2, 0x7cfc8a, 0.9).setDepth(10);
        this.add.text(W / 2, H * 0.84 - 10, FRIDGE.done, {
          fontFamily: 'monospace', fontSize: '18px', color: '#7CFC8A', align: 'center',
        }).setOrigin(0.5).setDepth(11);
        this.add.text(W / 2, H * 0.84 + 38, 'Spazio per continuare', {
          fontFamily: 'monospace', fontSize: '13px', color: '#c8ccd4',
        }).setOrigin(0.5).setDepth(11);
        box.setAlpha(0);
        this.tweens.add({ targets: box, alpha: 1, duration: 400 });
        this.time.delayedCall(700, () => { this.stage = 'done'; });
      });
    });
  }

  leave(won) {
    const world = this.scene.get(this.returnScene);
    if (world) world.spaceGuard = true; // the closing Space must not talk to anyone
    this.scene.resume(this.returnScene);
    if (won && world?.onFridgeDone) world.onFridgeDone();
    this.scene.stop();
  }
}
