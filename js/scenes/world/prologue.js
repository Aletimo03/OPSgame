// js/scenes/world/prologue.js
// The prologue (js/story/prologue.js): the repeaters marked by a star, and the nap.
// A class mixin of WorldScene: the methods run with `this` = the scene.
import { TILE } from '../../config.js';
import { questState } from '../../story/questState.js';
import { setClock } from '../../story/clock.js';
import { PROLOGUE, repeatersOn, repeaterFlag, repeatersFound } from '../../story/prologue.js';
import { advanceChapterIfDone } from '../../story/chapters.js';

export const withPrologue = (Base) => class extends Base {
  // The repeaters' stars in this map, while the hunt is on (js/story/prologue.js).
  refreshRepeaters() {
    if (!this.repeaterStars) return;
    const star = PROLOGUE.star;
    if (!repeatersOn()) return;
    if (!this.anims.exists(star.key)) {
      this.anims.create({
        key: star.key, frameRate: star.fps, repeat: -1,
        frames: this.anims.generateFrameNumbers(star.key, { start: 0, end: star.frames - 1 }),
      });
    }
    for (const sp of PROLOGUE.spots) {
      if (sp.map !== this.mapKey || this.repeaterStars.has(sp.id) || questState.hasFlag(repeaterFlag(sp.id))) continue;
      const s = this.add.sprite((sp.tx + 0.5) * TILE, (sp.ty + 0.5) * TILE, star.key)
        .setDisplaySize(star.size, star.size).setDepth(900000).play(star.key);
      this.repeaterStars.set(sp.id, s);
    }
  }

  // Walking onto a star unplugs that repeater.
  repeaterTick() {
    if (!this.repeaterStars?.size) return;
    const f = this.player.body.center;
    for (const [id, s] of this.repeaterStars) {
      if (Math.hypot(f.x - s.x, f.y - s.y) > TILE * PROLOGUE.touchTiles) continue;
      s.destroy();
      this.repeaterStars.delete(id);
      questState.setFlag(repeaterFlag(id));
      if (repeatersFound() < PROLOGUE.spots.length) { this.say(null, PROLOGUE.foundLine, () => this.saveGame()); return; }
      this.say(null, PROLOGUE.lastLines, () => {
        questState.setFlag(PROLOGUE.wifiFlag);
        const phone = questState.items.find((it) => it.name === PROLOGUE.phoneItem);
        if (phone) phone.description = PROLOGUE.phoneWorks;
        this.inventory.refresh();
        this.showBanner(PROLOGUE.wifiBanner, 0.3, '#7CFC8A', 0x7cfc8a);
        this.onProgress();
      });
      return;
    }
  }

  // The prologue's nap: he wakes up at night (scene `risveglio`, the party).
  prologueNap() {
    this.warpLocked = true;
    this.holdPlayer();
    this.cameras.main.fadeOut(700, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      questState.heroHp = null;
      questState.setFlag(PROLOGUE.napFlag);
      setClock(PROLOGUE.nightTime);
      advanceChapterIfDone(); // → chapter-festa, before the room is rebuilt (party placements)
      this.saveGame();
      this.time.delayedCall(700, () => this.scene.restart({ mapKey: PROLOGUE.room, spawnName: 'bedside', announce: true }));
    });
  }
};
