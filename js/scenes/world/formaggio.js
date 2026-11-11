// js/scenes/world/formaggio.js
// Chapter-formaggio on the world side (rules in js/story/formaggio.js): going
// back to bed until morning, mrjackson's message after the fridge, the note
// on the laundry floor (a star like the repeaters'), the key safe in the
// ripostiglio (drawn on the wall; its panel is SafeScene), and Zio Nick's
// comments when he closes the phone after reading a chat.
// A class mixin of WorldScene: the methods run with `this` = the scene.
import { TILE } from '../../config.js';
import { questState } from '../../story/questState.js';
import { setClock } from '../../story/clock.js';
import { PROLOGUE } from '../../story/prologue.js';
import { FORMAGGIO, SAFE, inFormaggio, noteOn, safeOpen } from '../../story/formaggio.js';

export const withFormaggio = (Base) => class extends Base {
  // Map entry: the note's star, the safe on the wall.
  setupFormaggio() {
    this.noteStar = null;
    if (this.map.safe) this.drawSafe(this.map.safe);
    const n = FORMAGGIO.note;
    if (!noteOn() || n.map !== this.mapKey) return;
    const star = PROLOGUE.star;
    if (!this.textures.exists(star.key)) return;
    if (!this.anims.exists(star.key)) {
      this.anims.create({
        key: star.key, frameRate: star.fps, repeat: -1,
        frames: this.anims.generateFrameNumbers(star.key, { start: 0, end: star.frames - 1 }),
      });
    }
    this.noteStar = this.add.sprite((n.tx + 0.5) * TILE, (n.ty + 0.5) * TILE, star.key)
      .setDisplaySize(star.size, star.size).setDepth(900000).play(star.key);
  }

  // The key safe: a small dark box with a three-digit lock, on the wall.
  drawSafe(s) {
    const x = s.tx * TILE, y = s.ty * TILE, w = s.w * TILE, h = s.h * TILE;
    const g = this.add.graphics().setDepth(4);
    g.fillStyle(0x1e1f24, 1).fillRoundedRect(x, y, w, h, 5);
    g.fillStyle(0x45474f, 1).fillRoundedRect(x + 3, y + 3, w - 6, h - 6, 4);
    g.fillStyle(0x15161a, 1).fillRect(x + w * 0.2, y + h * 0.4, w * 0.6, h * 0.2);
    g.fillStyle(0xffffff, 0.8);
    for (let i = 0; i < 3; i++) g.fillRect(x + w * (0.27 + i * 0.17), y + h * 0.45, 2, h * 0.1);
  }

  // Walking onto the star picks up the note.
  formaggioTick() {
    if (!this.noteStar) return;
    const f = this.player.body.center;
    if (Math.hypot(f.x - this.noteStar.x, f.y - this.noteStar.y) > TILE * FORMAGGIO.touchTiles) return;
    this.noteStar.destroy();
    this.noteStar = null;
    this.holdPlayer();
    this.say(null, FORMAGGIO.noteLines, () => {
      questState.setFlag(FORMAGGIO.noteFlag);
      this.showBanner(FORMAGGIO.noteBanner, 0.3, '#ffd54a', 0xffd54a);
      this.onProgress();
    });
  }

  // Back to bed after the party: he wakes up in the morning (scene `sveglia`).
  morningSleep() {
    this.warpLocked = true;
    this.holdPlayer();
    this.cameras.main.fadeOut(700, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      questState.heroHp = null;
      questState.setFlag(FORMAGGIO.sleepFlag);
      setClock(FORMAGGIO.morningTime);
      this.saveGame();
      this.time.delayedCall(900, () => this.scene.restart({ mapKey: FORMAGGIO.room, spawnName: 'bedside' }));
    });
  }

  // After the fridge minigame (onFridgeDone): mrjackson's message arrives
  // (it shows once `frigo-pulito` is set: chapter `phone`, `after`).
  afterFridge(t) {
    if (t.chapter !== FORMAGGIO.chapter) return;
    this.time.delayedCall(1200, () => {
      this.cameras.main.shake(250, 0.004); // the phone buzzes
      this.showBanner(FORMAGGIO.newMessage, 0.3, '#7CFC8A', 0x7cfc8a);
    });
  }

  // Space facing the safe (tryExamine): its code panel, or why not.
  trySafe(px, py) {
    const s = this.map.safe;
    if (!s) return false;
    const m = 0.45 * TILE;
    if (px < s.tx * TILE - m || px > (s.tx + s.w) * TILE + m || py < s.ty * TILE - m || py > (s.ty + s.h) * TILE + m) return false;
    if (questState.hasFlag(SAFE.openFlag)) { this.say(null, SAFE.empty); return true; }
    if (!safeOpen()) { this.say(null, SAFE.look); return true; }
    this.say(null, SAFE.look, () => {
      this.holdPlayer();
      this.scene.pause();
      this.scene.launch('SafeScene', { returnScene: 'WorldScene' });
    });
    return true;
  }

  // Called by SafeScene with the right code: the key of room 18.
  onSafeOpened() {
    questState.setFlag(SAFE.openFlag);
    if (!questState.hasItem(SAFE.key.name)) questState.addItem(SAFE.key);
    this.inventory.refresh();
    this.say(null, SAFE.openLines, () => {
      this.showItemReceived(SAFE.key.name);
      this.onProgress();
    });
  }

  // Called by the phone when it closes: the flags its chats set on reading
  // (`readFlag`), and Zio Nick's comment on each.
  onPhoneRead(flags) {
    const lines = inFormaggio() ? flags.flatMap((f) => FORMAGGIO.phoneLines[f] || []) : [];
    if (lines.length) this.say(null, lines, () => this.onProgress());
    else this.onProgress();
  }
};
