// js/scenes/world/battles.js
// Starting a battle over the paused world and what happens after it.
// A class mixin of WorldScene: the methods run with `this` = the scene.
import { PLAYER, DEFEAT_RESPAWN } from '../../config.js';
import { questState } from '../../story/questState.js';
import { advanceChapterIfDone } from '../../story/chapters.js';

export const withBattles = (Base) => class extends Base {
  // A fight lost by the script (chapter 1, Gabbo): the loss IS the story. Set
  // its flag (the chapter's objective), roll the story on and wake up where
  // the battle says (the first-floor kitchen), at full HP.
  onScriptedLoss() {
    const b = this.battleInfo?.b || {};
    this.battleInfo = null;
    questState.heroHp = null;
    if (b.lossFlag) questState.setFlag(b.lossFlag);
    advanceChapterIfDone();
    this.warpLocked = true;
    this.cameras.main.fadeOut(600);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.restart({ ...(b.wakeAt || DEFEAT_RESPAWN), notice: b.wakeNotice || null });
    });
  }

  // Called by BattleScene after a win (the world is running again): the
  // battle's `won` lines, and its `reward` item.
  afterBattleWin() {
    const info = this.battleInfo;
    this.battleInfo = null;
    if (!info) return;
    const { npc, b } = info;
    const give = () => {
      if (!b.reward || questState.hasItem(b.reward.name)) return;
      questState.addItem(b.reward);
      this.inventory.refresh();
      this.showItemReceived(b.reward.name);
      this.saveGame();
    };
    if (b.won) this.say(npc, b.won, give);
    else give();
  }

  // Lost a battle (called by BattleScene): wake up in the living room at full HP.
  // No other penalty — talk to the enemy again to retry.
  onDefeat() {
    questState.heroHp = null;
    this.pendingRematch = null; // a lost rematch pays nothing
    this.battleInfo = null;
    this.warpLocked = true;
    this.cameras.main.fadeOut(400);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.restart({
        ...DEFEAT_RESPAWN,
        notice: 'Aia... mi risveglio sul divano del salotto.\nHP ripristinati.',
      });
    });
  }

  // Pause the overworld and overlay the battle; we resume here afterwards so the
  // player is exactly where they were.
  // `chapter` = the chapter this fight belongs to (a win is credited to it).
  // `b` = the JSON battle block: `mustLose` (+ `lossLine`, `lossFlag`, `wakeAt`,
  // `wakeNotice`: onScriptedLoss), `won` lines and a `reward` item (afterBattleWin).
  startBattle(npc, chapter, b = {}) {
    this.battleInfo = { npc, chapter, b };
    this.scene.pause();
    this.scene.launch('BattleScene', {
      blackBg: !!b.blackBg,
      mustLose: !!b.mustLose,
      lossLine: b.lossLine || null,
      enemyKey: npc.spriteKey,    // texture for the enemy sprite
      enemyChar: npc.character,   // character.json folder (enemy stats)
      enemyName: npc.name,
      heroChar: PLAYER.SPRITE_KEY, // protagonist character.json folder
      heroKey: PLAYER.SPRITE_KEY,  // protagonist texture
      heroName: PLAYER.NAME,
      returnScene: 'WorldScene',
      chapter,
    });
  }
};
