// js/scenes/world/favours.js
// Rematches, affinity hearts, favours and Alessio's shop
// (js/story/sideQuests.js, js/story/affinity.js).
// A class mixin of WorldScene: the methods run with `this` = the scene.
import { questState } from '../../story/questState.js';
import { ORDER } from '../../story/chapters.js';
import { addAffinity } from '../../story/affinity.js';
import { shopStock, buy } from '../../story/sideQuests.js';

export const withFavours = (Base) => class extends Base {
  // Rematch (character JSON `rematch`, e.g. Gabbo roaming the corridors from
  // chapter 3): a fight for punti casa, once per chapter, no story effect.
  canRematch(npc) {
    const r = npc.data?.rematch;
    if (!r) return false;
    const i = ORDER.indexOf(questState.activeChapter);
    return i >= ORDER.indexOf(r.from) && (!r.until || i <= ORDER.indexOf(r.until));
  }

  offerRematch(target) {
    const r = target.data.rematch;
    const ch = questState.activeChapter;
    if (questState.didIn('defeated', target.id, ch)) {
      this.dialogue.show(target.name, r.after, target.portraitKey);
      return;
    }
    this.dialogue.ask(target.name, r.prompt, r.options, target.portraitKey, (i) => {
      if (i !== 0) return;
      this.pendingRematch = { id: target.id, ch, reward: r.reward, name: target.name };
      this.startBattle(target, ch);
    });
  }

  // Called from onProgress (BattleScene calls it after a win): pay a rematch.
  payRematch() {
    const r = this.pendingRematch;
    if (!r || !questState.didIn('defeated', r.id, r.ch)) return;
    this.pendingRematch = null;
    questState.points = (questState.points || 0) + r.reward;
    this.bumpAffinity(r.id, 1);
    this.showBanner(`⚔ ${r.name} battuto! +${r.reward} punti casa\n(totale ${questState.points})`, 0.28, '#ff8a65', 0xff8a65);
    this.inventory.refresh();
    this.saveGame();
  }

  // +n hearts with a housemate; a newly unlocked private message gets a banner
  // (the phone badge counts it too).
  bumpAffinity(id, n) {
    const unlocked = addAffinity(id, n);
    if (unlocked.length) {
      const name = this.npcs?.list.find((x) => x.id === id)?.name || id;
      this.time.delayedCall(900, () => this.showBanner(`💬 Nuovo messaggio privato da ${name}\n[P] per leggerlo`, 0.62, '#7CFC8A', 0x25d366));
    }
  }

  afterSideChange() {
    this.refreshQuestMarks();
    this.inventory.refresh();
    this.saveGame();
  }

  // Alessio's shop: spend punti casa (sideQuests.SHOP).
  openShop(target) {
    const stock = shopStock();
    const pts = questState.points || 0;
    const opts = [...stock.map((it) => `${it.name} — ${it.price} punti`), 'Niente'];
    this.dialogue.ask(target.name, `O fra. Shop? (hai ${pts} punti casa)`, opts, target.portraitKey, (i) => {
      const it = stock[i];
      if (!it) return;
      if (!buy(it)) {
        this.dialogue.show(target.name, 'O fra, punti non bastano.', target.portraitKey);
        return;
      }
      this.bumpAffinity(target.id, 1);
      this.inventory.refresh();
      this.saveGame();
      this.showItemReceived(it.consumable ? `${it.name} x${it.qty ?? 1}` : it.name);
    });
  }
};
