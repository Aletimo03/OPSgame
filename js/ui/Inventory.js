// js/ui/Inventory.js
// A Pokémon-bag-style overlay: Zio Nick's HP (the only place HP is shown outside
// battle), permanent items with their buffs, and consumables with how many are
// left. Toggle with I; close with I or Esc. While open, movement is frozen.

import { questState } from '../story/questState.js';
import { collectionStatus } from '../story/collectibles.js';
import { activeSides, sideFound } from '../story/sideQuests.js';
import { CLUES, cluesFound, investigationOpen } from '../story/investigation.js';
import { holdingCheese } from '../story/fridge.js';

const DEPTH  = 3000000;
const PAD    = 24;
const LINE_H = 42;
const HEAD_H = 52;  // space above the HP row for the title
const HP_H   = 40;  // HP row
const SEC_H  = 26;  // section heading ("Consumabili")
const MIN_H  = 200; // minimum panel height

export class Inventory {
  // `getHp` → { hp, max } for the HP row.
  constructor(scene, { getHp } = {}) {
    this.scene = scene;
    this.getHp = getHp || (() => ({ hp: 0, max: 0 }));
    this.open  = false;
    this.objs  = [];
    this.iKey  = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.I);
    this.escKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
  }

  // Call once per frame from WorldScene.update(). `canOpen` is false while
  // another overlay owns the screen. Esc is only read while open, so it stays
  // free for the other overlays. Returns true while the bag blocks input.
  update(canOpen = true) {
    const J = Phaser.Input.Keyboard.JustDown;
    if (this.open) {
      if (J(this.iKey) || J(this.escKey)) this.close();
    } else if (canOpen && J(this.iKey)) {
      this.show();
    }
    return this.open;
  }

  show() {
    this.open = true;
    this._rebuild();
  }

  close() {
    this.open = false;
    this.objs.forEach((o) => o.destroy());
    this.objs = [];
  }

  // Re-render (call after picking up an item while the panel is already open).
  refresh() {
    if (this.open) this._rebuild();
  }

  _rebuild() {
    this.objs.forEach((o) => o.destroy());
    this.objs = [];

    const cam      = this.scene.cameras.main;
    const W        = cam.width;
    const H        = cam.height;
    const items    = questState.items;
    const supplies = questState.suppliesLeft();
    const coll     = Object.values(collectionStatus()).filter((c) => c.found > 0);
    const listH    = items.length * LINE_H + (supplies.length ? SEC_H + supplies.length * LINE_H : 0)
      + (coll.length ? SEC_H + coll.length * 26 : 0)
      + SEC_H + Math.max(1, activeSides().length) * 22
      + (!items.length && !supplies.length ? LINE_H : 0)
      + (holdingCheese() ? LINE_H : 0)
      + (investigationOpen() ? SEC_H + Math.max(1, cluesFound().length) * 22 : 0);

    const panelW = Math.min(480, W - PAD * 4);
    const panelH = Math.max(MIN_H, HEAD_H + HP_H + Math.max(listH, LINE_H) + PAD * 2);
    const px     = (W - panelW) / 2;
    const py     = (H - panelH) / 2;

    const add = (o) => {
      o.setScrollFactor(0).setDepth(DEPTH);
      this.objs.push(o);
      return o;
    };
    const text = (x, y, str, style) => add(this.scene.add.text(x, y, str, { fontFamily: 'monospace', ...style }));

    add(
      this.scene.add
        .rectangle(px, py, panelW, panelH, 0x0d0f17, 0.96)
        .setOrigin(0, 0)
        .setStrokeStyle(3, 0xffd54a, 0.9)
    );
    text(px + PAD, py + 14, '🎒  ZAINO', { fontSize: '18px', color: '#ffd54a', fontStyle: 'bold' });
    text(px + panelW - PAD, py + 14, '[I] chiudi', { fontSize: '13px', color: '#9aa0a8' }).setOrigin(1, 0);

    const g = add(this.scene.add.graphics());
    g.lineStyle(1, 0xffffff, 0.2);
    g.lineBetween(px + PAD, py + HEAD_H - 8, px + panelW - PAD, py + HEAD_H - 8);

    // HP row — same colour steps as the battle HP bars.
    const { hp, max } = this.getHp();
    const frac = max > 0 ? Math.max(0, hp / max) : 0;
    const barX = px + PAD + 120;
    const barW = panelW - PAD * 2 - 120 - 90;
    const hy = py + HEAD_H;
    text(px + PAD, hy, '♥  Zio Nick', { fontSize: '16px', color: '#ffffff' });
    g.fillStyle(0x333a47, 1).fillRect(barX, hy + 6, barW, 8);
    g.fillStyle(frac > 0.5 ? 0x57d977 : frac > 0.2 ? 0xe8c84a : 0xe05a4a, 1).fillRect(barX, hy + 6, barW * frac, 8);
    text(px + panelW - PAD, hy, `${hp}/${max} HP`, { fontSize: '15px', color: '#ffffff' }).setOrigin(1, 0);

    let y = hy + HP_H;

    // Permanent items: name, buff summary (green), description.
    items.forEach((item) => {
      text(px + PAD, y, `✦  ${item.name}`, { fontSize: '17px', color: '#ffffff' });
      const buffText = this._buffLabel(item.buff);
      if (buffText) {
        text(px + panelW - PAD, y, buffText, { fontSize: '15px', color: '#57d977' }).setOrigin(1, 0);
      }
      if (item.description) {
        text(px + PAD + 22, y + 17, item.description, { fontSize: '12px', color: '#9aa0a8' });
      }
      y += LINE_H;
    });

    // Consumables (usable in battle from the Zaino menu).
    if (supplies.length) {
      text(px + PAD, y + 4, 'Consumabili — si usano in battaglia', { fontSize: '12px', color: '#ffd54a' });
      y += SEC_H;
      supplies.forEach((s) => {
        text(px + PAD, y, `●  ${s.name}  x${s.qty}`, { fontSize: '17px', color: '#ffffff' });
        text(px + panelW - PAD, y, `cura ${s.heal} HP`, { fontSize: '15px', color: '#57d977' }).setOrigin(1, 0);
        if (s.description) {
          text(px + PAD + 22, y + 17, s.description, { fontSize: '12px', color: '#9aa0a8' });
        }
        y += LINE_H;
      });
    }

    if (holdingCheese()) { // quest thing (fridge task): not a real item
      text(px + PAD, y, '🧀  Formaggio ammuffito', { fontSize: '17px', color: '#ffd54a' });
      text(px + PAD + 22, y + 19, 'Buttalo nei bidoni della cucina.', { fontSize: '12px', color: '#9aa0a8' });
      y += LINE_H;
    }
    if (!items.length && !supplies.length) {
      text(px + PAD, y + 4, 'Nessun oggetto per ora.', { fontSize: '14px', color: '#9aa0a8' });
      y += LINE_H;
    }

    // Collectibles found in the furniture (js/story/collectibles.js).
    if (coll.length) {
      text(px + PAD, y + 4, 'Collezione — si trovano esaminando i mobili', { fontSize: '12px', color: '#ffd54a' });
      y += SEC_H;
      coll.forEach((c) => {
        text(px + PAD, y, `${c.icon}  ${c.plural}`, { fontSize: '17px', color: '#ffffff' });
        text(px + panelW - PAD, y, `${c.found}/${c.total}`, {
          fontSize: '15px', color: c.found === c.total ? '#57d977' : '#c8ccd4',
        }).setOrigin(1, 0);
        y += 26;
      });
    }

    // Melon investigation clues (js/story/investigation.js).
    if (investigationOpen()) {
      const found = cluesFound();
      text(px + PAD, y + 4, `🔍 Indagine — indizi ${found.length}/${CLUES.length}`, { fontSize: '12px', color: '#ffd54a' });
      y += SEC_H;
      if (!found.length) text(px + PAD, y, 'Esamina i mobili con Spazio.', { fontSize: '13px', color: '#9aa0a8' });
      found.forEach((c) => {
        text(px + PAD, y, `•  ${c.name}`, { fontSize: '13px', color: '#ffffff' });
        y += 22;
      });
      if (!found.length) y += 22;
    }

    // Favours (side quests) and house points (js/story/sideQuests.js).
    text(px + PAD, y + 4, 'Favori — da Alessio spendi i punti casa', { fontSize: '12px', color: '#8fd3ff' });
    text(px + panelW - PAD, y + 2, `★ ${questState.points || 0} punti`, { fontSize: '14px', color: '#8fd3ff' }).setOrigin(1, 0);
    y += SEC_H;
    const sides = activeSides();
    if (!sides.length) text(px + PAD, y, 'Nessun favore in corso.', { fontSize: '13px', color: '#9aa0a8' });
    sides.forEach((q) => {
      text(px + PAD, y, `★  ${q.title}${sideFound(q.id) ? ' — trovato, riportalo!' : ` — cerca: ${q.thing}`}`, {
        fontSize: '13px', color: sideFound(q.id) ? '#57d977' : '#ffffff',
      });
      y += 22;
    });
  }

  // "+5 ATK  +10 HP" from a buff object, or '' if none.
  _buffLabel(buff) {
    if (!buff) return '';
    const labels = { attack: 'ATK', defense: 'DEF', maxHp: 'HP' };
    return Object.keys(labels)
      .filter((k) => buff[k])
      .map((k) => `${buff[k] > 0 ? '+' : ''}${buff[k]} ${labels[k]}`)
      .join('  ');
  }
}
