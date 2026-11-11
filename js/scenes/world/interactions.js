// js/scenes/world/interactions.js
// Sitting, examining furniture (finds, collectibles, the fridge task) and
// sleeping in bed.
// A class mixin of WorldScene: the methods run with `this` = the scene.
import { TILE, PLAYER, SEAT_HEAL_PER_SEC } from '../../config.js';
import { idleFrame, feetCenterY } from '../../core/playerSprite.js';
import { questState } from '../../story/questState.js';
import { FRIDGE, fridgeOpen, fridgeTask, holdingCheese, fridgeCleaned, throwCheese } from '../../story/fridge.js';
import { sleepReady } from '../../story/formaggio.js';
import { FINDS, findFlag, findOpen } from '../../story/finds.js';
import { napReady } from '../../story/prologue.js';
import { findSideThing, sideState, sideFound } from '../../story/sideQuests.js';
import { KINDS as COLLECTIBLE_KINDS, collectionStatus, foundFlag, isFound } from '../../story/collectibles.js';
import { propColliders } from '../../core/props.js';
import { dreamActive } from '../../story/dream.js';

export const withInteractions = (Base) => class extends Base {
  // Zio Nick's own bed (prop `sleep: true`): a short nap, full HP.
  sleepInBed() {
    if (dreamActive()) { this.enterDream(); return; } // chapter 9: the nightmare
    if (napReady()) { this.prologueNap(); return; }
    if (sleepReady()) { this.morningSleep(); return; }
    this.warpLocked = true; // freeze input during the fade
    const cam = this.cameras.main;
    cam.fadeOut(500, 0, 0, 0);
    cam.once('camerafadeoutcomplete', () => {
      questState.heroHp = null; // null = full
      this.saveGame();
      this.time.delayedCall(600, () => {
        cam.fadeIn(500, 0, 0, 0);
        this.warpLocked = false;
        this.showBanner('Un pisolino... 💤\nHP al massimo!', 0.28, '#7CFC8A', 0x7cfc8a);
      });
    });
  }

  // Fridge minigame (js/scenes/FridgeScene.js) over the paused world.
  startFridge() {
    this.holdPlayer();
    this.scene.pause();
    this.scene.launch('FridgeScene', { returnScene: 'WorldScene' });
  }

  // Called by FridgeScene after a win: fridge clean, cheese in hand.
  onFridgeDone() {
    const t = fridgeTask();
    if (!t) return;
    fridgeCleaned(t);
    this.inventory.refresh();
    this.say(null, t.found, () => {
      if (t.banner) this.showBanner(t.banner, 0.28, '#ffd54a', 0xffd54a);
      this.onProgress();
      this.afterFridge?.(t); // chapter-formaggio: mrjackson writes
    });
  }

  // A collectible hidden in a piece of furniture was found (tryExamine).
  findCollectible(h) {
    questState.setFlag(foundFlag(h.id));
    const st = collectionStatus()[h.kind];
    const k = COLLECTIBLE_KINDS[h.kind] || { name: 'Oggetto', plural: 'Oggetti', icon: '★' };
    const all = st && st.found === st.total;
    this.showBanner(
      `${k.icon} Hai trovato: ${k.name}!\n${st ? `${st.found}/${st.total}` : ''}${all ? ` — ${k.plural} tutti trovati!` : ''}`,
      0.28, '#ffd54a', 0xffd54a
    );
    this.inventory.refresh();
    this.saveGame();
  }

  // Sit if the player's feet are on a seat of any prop (`props[].seats`).
  trySit() {
    const fx = this.player.x;
    const fy = feetCenterY(this.player);
    for (const p of this.map.props || []) {
      for (const s of p.seats || []) {
        const inside = fx >= s.tx * TILE && fx <= (s.tx + s.w) * TILE
          && fy >= s.ty * TILE && fy <= (s.ty + s.h) * TILE;
        if (inside) {
          this.sitOn(s);
          return true;
        }
      }
    }
    return false;
  }

  // Space facing a piece of furniture with `examine` lines (catalogue): show
  // them. (px, py) = the point one tile ahead of the player's feet; it counts
  // if it falls within ~0.4 tile of one of the prop's colliders.
  tryExamine(px, py) {
    const m = 0.4 * TILE;
    // The fridge task (FRIDGE_TASKS): the right end of the cabinets is the fridge.
    if (fridgeOpen() && this.mapKey === FRIDGE.map) {
      const z = FRIDGE.zone;
      if (px >= z.tx * TILE - m && px <= (z.tx + z.w) * TILE + m && py >= z.ty * TILE - m && py <= (z.ty + z.h) * TILE + m) {
        this.say(null, fridgeTask().intro, () => this.startFridge());
        return true;
      }
    }
    const near = (c) => px >= c.tx * TILE - m && px <= (c.tx + c.w) * TILE + m
      && py >= c.ty * TILE - m && py <= (c.ty + c.h) * TILE + m;
    const facingProp = (p) => this.propShown.has(p) && propColliders(p).some(near);
    // Story finds (js/story/finds.js): furniture or a zone, this chapter only.
    for (const f of FINDS) {
      if (f.map !== this.mapKey || !findOpen(f)) continue;
      const hit = f.zone ? near(f.zone) : (this.map.props || []).some((p) => p.furniture === f.furniture && facingProp(p));
      if (!hit) continue;
      if (f.needsItem && !questState.hasItem(f.needsItem)) { this.say(null, f.locked); return true; }
      this.say(null, f.lines, () => {
        questState.setFlag(findFlag(f.id));
        if (f.gives?.consumable) questState.addSupply(f.gives, null);
        else if (f.gives) questState.addItem(f.gives);
        if (f.banner) this.showBanner(f.banner, 0.3, '#ffd54a', 0xffd54a);
        this.inventory.refresh();
        this.onProgress();
        this.playEvents(); // a scene may be waiting for this find
      });
      return true;
    }
    for (const p of this.map.props || []) {
      if (!p.examine?.length && !p.hidden && !p.side) continue;
      const hit = facingProp(p); // (not in the room this chapter: never)
      if (hit && p.furniture === 'trashbins' && holdingCheese()) {
        // Throw the mouldy cheese away (fridge task, chapter 7).
        this.say(null, FRIDGE.throwLines, () => {
          throwCheese();
          this.inventory.refresh();
          this.onProgress();
        });
        return true;
      }
      if (hit) {
        const h = p.hidden && !isFound(p.hidden.id) ? p.hidden : null;
        const sideHere = p.side && sideState(p.side) === 'active' && !sideFound(p.side);
        const lines = p.examine?.length ? p.examine : ['Frughi un po\'...'];
        this.say(null, h || sideHere ? [...lines, 'Aspetta... c\'è qualcosa qui!'] : lines, () => {
          if (h) this.findCollectible(h);
          if (sideHere) {
            const q = findSideThing(p.side);
            if (q) {
              this.showBanner(`★ Trovato: ${q.thing}\nPortalo a chi te l'ha chiesto`, 0.4, '#8fd3ff', 0x8fd3ff);
              this.afterSideChange();
            }
          }
          if (p.sleep) this.sleepInBed();
        });
        return true;
      }
    }
    return false;
  }

  // Sit down: slide onto the middle of the seat, swap to the seated sheet
  // (PLAYER.SIT_KEY, one pose per facing) with a little squash, then loop the
  // seated frames slowly. Healing happens in restTick().
  sitOn(seat) {
    const p = this.player;
    this.seated = seat;
    this.healAcc = 0;
    p.body.setVelocity(0);
    p.anims.stop();
    p.facing = seat.facing;
    // Centre the feet on the seat sideways (the seat is a feet area in tiles).
    const dx = (seat.tx + seat.w / 2) * TILE - p.body.center.x;
    if (Math.abs(dx) > 1) this.tweens.add({ targets: p, x: p.x + dx, duration: 120, ease: 'Sine.easeOut' });
    if (this.canSitPose) {
      p.setFlipX(false); // every seated facing has its own art
      p.setTexture(PLAYER.SIT_KEY, 0);
      p.anims.play(`sit-${seat.facing}`);
      this.tweens.add({ targets: p, scaleY: PLAYER.SCALE * 0.9, duration: 90, yoyo: true, ease: 'Quad.easeOut' });
    } else {
      p.setFlipX(seat.facing === 'right'); // side art faces LEFT natively
      p.setFrame(idleFrame(seat.facing));
    }
    p.setDepth(this.characterDepth(p));
    this.showBanner('Mi siedo e riprendo fiato\n(frecce o Spazio per alzarsi)', 0.18);
  }

  standUp() {
    const p = this.player;
    this.seated = null;
    this.tweens.killTweensOf(p);
    p.anims.stop();
    p.setTexture(PLAYER.SPRITE_KEY, idleFrame(p.facing));
    p.setFlipX(p.facing === 'right');
    p.setScale(PLAYER.SCALE);
    this.tweens.add({ targets: p, scaleY: PLAYER.SCALE * 1.06, duration: 80, yoyo: true, ease: 'Quad.easeOut' });
    this.saveGame();
  }

  // +SEAT_HEAL_PER_SEC HP per second while seated, in whole points.
  restTick(delta, maxHp) {
    const hp = questState.currentHp(maxHp);
    if (hp >= maxHp) return;
    this.healAcc += (delta / 1000) * SEAT_HEAL_PER_SEC;
    const whole = Math.floor(this.healAcc);
    if (whole < 1) return;
    this.healAcc -= whole;
    questState.setHp(hp + whole, maxHp);
  }
};
