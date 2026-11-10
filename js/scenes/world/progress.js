// js/scenes/world/progress.js
// Story progress: quest marks, rolling the chapters forward, the deferred
// "chapter complete" banner, the chapter card and the ending.
// A class mixin of WorldScene: the methods run with `this` = the scene.
import { hud, hudPx } from '../../config.js';
import { questState } from '../../story/questState.js';
import { advanceChapterIfDone, activeChapter, activeQuest, isStoryComplete } from '../../story/chapters.js';
import { questNpcIds } from '../../story/questGuide.js';
import { PROLOGUE } from '../../story/prologue.js';
import { sideStepFor } from '../../story/sideQuests.js';

export const withProgress = (Base) => class extends Base {
  // Show "!" only over the NPCs the active quest still needs.
  // Blue "?" instead over NPCs with a favour to offer or to hand in.
  refreshQuestMarks() {
    const ids = questNpcIds(this);
    (this.questMarks || []).forEach(({ npc, t }) => {
      const side = sideStepFor(npc.id);
      const sideMark = side && side.step !== 'remind';
      const fight = !ids.has(npc.id) && !sideMark && this.canRematch(npc)
        && !questState.didIn('defeated', npc.id); // ⚔ = rematch available
      t.setText(ids.has(npc.id) ? '!' : fight ? '⚔' : '?');
      t.setColor(ids.has(npc.id) ? '#ffd54a' : fight ? '#ff8a65' : '#8fd3ff');
      t.setVisible(ids.has(npc.id) || !!sideMark || fight);
    });
  }

  // Progress changed: roll the story forward, refresh the HUD and save. Also
  // called by BattleScene after a win. Announces a completed chapter.
  onProgress() {
    const before = questState.activeChapter;
    this.payRematch();
    advanceChapterIfDone();
    this.refreshQuestMarks();
    this.refreshRepeaters();
    this.saveGame();
    // A new chapter / the ending are shown only once whatever is going on is
    // over (e.g. Nima's lines that completed chapter 1): flushProgress() in
    // update() waits for no dialogue, cutscene, overlay or warp. Till then the
    // tracker keeps showing the chapter you just finished.
    if (questState.activeChapter !== before) this.pendingAnnounce = true;
    else this.questTracker?.refresh();
    // A `stop` chapter finished: the story written so far ends here.
    if (activeChapter()?.stop && activeQuest()?.complete && !questState.hasFlag('stop-seen')) {
      questState.setFlag('stop-seen');
      this.pendingStop = true;
    }
    // Last chapter done → the ending, once (the flag is saved).
    if (isStoryComplete() && !questState.hasFlag('ending-seen')) {
      questState.setFlag('ending-seen');
      this.saveGame();
      this.pendingEnding = true;
    }
  }

  // Show a deferred chapter change / ending as soon as the screen is free.
  flushProgress() {
    if (!this.pendingAnnounce && !this.pendingEnding && !this.pendingStop) return;
    const busy = this.dialogue?.open || this.inCutscene || this.warpLocked || this.seated
      || [this.inventory, this.phone, this.minimap, this.pauseMenu].some((o) => o?.open);
    if (busy) return;
    if (this.pendingAnnounce) {
      this.pendingAnnounce = false;
      this.questTracker?.refresh();
      this.announceChapter();
    }
    if (this.pendingStop) {
      this.pendingStop = false;
      this.time.delayedCall(800, () => this.showBanner(PROLOGUE.end, 0.3));
    }
    if (this.pendingEnding) {
      this.pendingEnding = false;
      this.time.delayedCall(900, () => this.showEnding());
    }
  }

  // Credits + run stats over the paused world (EndingScene resumes it).
  showEnding() {
    this.player.body.setVelocity(0);
    this.scene.pause();
    this.scene.launch('EndingScene', { returnScene: 'WorldScene' });
  }

  // "Chapter complete" banner naming the chapter that just started.
  announceChapter() {
    const next = activeChapter();
    this.showBanner(
      `✓ Capitolo completato — partita salvata${next ? `\n${next.title}` : ''}`,
      0.28,
      '#7CFC8A',
      0x7cfc8a
    );
    this.time.delayedCall(1400, () => this.showChapterCard());
    this.time.delayedCall(4200, () => this.storyIntros());
    this.time.delayedCall(3600, () => this.playEvents()); // e.g. chapter 7 starting while you're already in the kitchen
  }

  // Big "CAPITOLO N / title / mission" card across the screen, once per chapter
  // (flag `card:<chapter>`, saved). Doesn't block movement; fades out alone.
  showChapterCard() {
    const id = questState.activeChapter;
    const ch = activeChapter();
    if (!ch || questState.hasFlag(`card:${id}`) || isStoryComplete()) return;
    questState.setFlag(`card:${id}`);
    this.saveGame();
    this.cardUntil = this.time.now + 3400; // events wait for it (playEvents)
    const cam = this.cameras.main;
    const W = cam.width;
    const H = cam.height;
    const num = /(\d+)$/.exec(id)?.[1];
    const quest = activeQuest();
    const objs = [
      this.add.rectangle(W / 2, H * 0.42, W, hud(150), 0x05060a, 0.88).setStrokeStyle(2, 0xffd54a, 0.6),
      this.add.text(W / 2, H * 0.42 - hud(46), ch.card || (num ? `CAPITOLO ${num}` : 'CAPITOLO'), {
        fontFamily: 'monospace', fontSize: hudPx(16), color: '#9aa0a8', letterSpacing: 6,
      }).setOrigin(0.5),
      this.add.text(W / 2, H * 0.42 - hud(6), ch.title, {
        fontFamily: 'monospace', fontSize: hudPx(30), color: '#ffd54a', fontStyle: 'bold',
        align: 'center', wordWrap: { width: W - 60 },
      }).setOrigin(0.5),
      this.add.text(W / 2, H * 0.42 + hud(40), quest ? quest.title : '', {
        fontFamily: 'monospace', fontSize: hudPx(15), color: '#ffffff',
        align: 'center', wordWrap: { width: W - 60 },
      }).setOrigin(0.5),
    ];
    objs.forEach((o) => o.setScrollFactor(0).setDepth(2600000).setAlpha(0));
    this.tweens.add({
      targets: objs, alpha: 1, duration: 450, ease: 'Sine.easeOut',
      onComplete: () => this.tweens.add({
        targets: objs, alpha: 0, delay: 2300, duration: 600,
        onComplete: () => objs.forEach((o) => o.destroy()),
      }),
    });
  }
};
