// js/scenes/SafeScene.js
// The key safe's code panel, over a PAUSED WorldScene: the user's picture of
// the safe (assets/ui/cassaforte.jpg) cover-fitted, «Inserisci il codice»,
// and the three dials drawn over the picture's own. ←/→ (A/D) pick a dial,
// ↑/↓ (W/S) turn it, Space / Enter tries the code, Esc gives up.
// Right → world.onSafeOpened(); wrong → «Codice sbagliato.», try again.
// Rules and data: js/story/formaggio.js (SAFE).
import { SAFE, checkCode } from '../story/formaggio.js';

const FONT = 'monospace';

export default class SafeScene extends Phaser.Scene {
  constructor() {
    super('SafeScene');
  }

  init(data) {
    this.returnScene = data.returnScene || 'WorldScene';
  }

  preload() {
    if (!this.textures.exists(SAFE.image.key)) this.load.image(SAFE.image.key, SAFE.image.path);
  }

  create() {
    this.digits = [0, 0, 0];
    this.sel = 0;
    this.done = false;
    this.keys = this.input.keyboard.addKeys({
      up: 'UP', down: 'DOWN', left: 'LEFT', right: 'RIGHT', w: 'W', s: 'S', a: 'A', d: 'D',
      space: 'SPACE', enter: 'ENTER', esc: 'ESC',
    });
    this.inputLocked = true; // until the Space that opened it is released
    this.objs = [];
    this.layout();
    this.cameras.main.fadeIn(250, 0, 0, 0);
  }

  layout() {
    this.objs.forEach((o) => o.destroy());
    this.objs = [];
    const W = this.scale.width;
    const H = this.scale.height;
    const add = (o) => (this.objs.push(o), o);
    add(this.add.rectangle(0, 0, W, H, 0x000000).setOrigin(0, 0));
    // The picture, "contain"-fitted so the whole safe shows.
    const img = add(this.add.image(W / 2, H / 2, SAFE.image.key));
    const k = Math.min(W / img.width, H / img.height);
    img.setScale(k);
    const ox = W / 2 - (img.width * k) / 2;
    const oy = H / 2 - (img.height * k) / 2;
    this.dialObjs = SAFE.dials.map((d) => {
      const x = ox + d.x * k;
      const y = oy + d.y * k;
      const w = SAFE.dialW * k;
      const h = SAFE.dialH * k;
      const face = add(this.add.rectangle(x, y, w, h, 0x111114).setStrokeStyle(Math.max(2, 2 * k), 0x2c2c33));
      const txt = add(this.add.text(x, y, '0', {
        fontFamily: 'Helvetica, Arial, sans-serif', fontSize: `${Math.round(h * 0.62)}px`, color: '#ffffff', fontStyle: 'bold',
      }).setOrigin(0.5));
      const up = add(this.add.text(x, y - h * 0.95, '▲', { fontFamily: FONT, fontSize: `${Math.round(h * 0.4)}px`, color: '#ffd54a' }).setOrigin(0.5));
      const down = add(this.add.text(x, y + h * 0.95, '▼', { fontFamily: FONT, fontSize: `${Math.round(h * 0.4)}px`, color: '#ffd54a' }).setOrigin(0.5));
      return { face, txt, up, down };
    });
    const panel = (y, str, size, color) => {
      const t = add(this.add.text(W / 2, y, str, {
        fontFamily: FONT, fontSize: `${size}px`, color, fontStyle: 'bold', align: 'center',
        backgroundColor: '#000000aa', padding: { x: 14, y: 8 },
      }).setOrigin(0.5));
      return t;
    };
    panel(H * 0.08, SAFE.prompt, 30, '#ffd54a');
    this.status = panel(H * 0.88, '', 24, '#ff6b5a').setVisible(false);
    panel(H - 22, '←/→ cifra · ↑/↓ cambia · Spazio prova · Esc esci', 14, '#c8ccd4').setY(H - 20);
    this.refresh();
  }

  refresh() {
    this.dialObjs.forEach((o, i) => {
      o.txt.setText(String(this.digits[i]));
      const on = i === this.sel;
      o.face.setStrokeStyle(on ? 4 : 2, on ? 0xffd54a : 0x2c2c33);
      o.up.setVisible(on);
      o.down.setVisible(on);
    });
  }

  update() {
    const k = this.keys;
    const J = (key) => Phaser.Input.Keyboard.JustDown(key);
    if (this.inputLocked) {
      if (!k.space.isDown && !k.enter.isDown) this.inputLocked = false;
      return;
    }
    if (this.done) return;
    if (J(k.esc)) return this.close(false);
    if (J(k.left) || J(k.a)) this.sel = (this.sel + 2) % 3;
    else if (J(k.right) || J(k.d)) this.sel = (this.sel + 1) % 3;
    else if (J(k.up) || J(k.w)) this.digits[this.sel] = (this.digits[this.sel] + 1) % 10;
    else if (J(k.down) || J(k.s)) this.digits[this.sel] = (this.digits[this.sel] + 9) % 10;
    else if (J(k.space) || J(k.enter)) return this.tryCode();
    else return;
    this.status.setVisible(false);
    this.refresh();
  }

  tryCode() {
    if (!checkCode(this.digits)) {
      this.status.setText(SAFE.wrong).setColor('#ff6b5a').setVisible(true);
      this.cameras.main.shake(180, 0.006);
      return;
    }
    this.done = true;
    this.status.setText('🔓').setColor('#7CFC8A').setVisible(true);
    this.time.delayedCall(700, () => this.close(true));
  }

  close(opened) {
    this.done = true;
    this.cameras.main.fadeOut(250, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      const world = this.scene.get(this.returnScene);
      if (world) world.spaceGuard = true; // the closing Space must not talk to anyone
      this.scene.resume(this.returnScene);
      if (opened) world?.onSafeOpened?.();
      this.scene.stop();
    });
  }
}
