// js/ui/Inventory.js
// A Pokémon-bag-style overlay that lists every item the player has collected.
// Toggle with the I key; close with I or Escape. While open, movement is frozen.

import { questState } from '../story/questState.js';

const DEPTH  = 3000000;
const PAD    = 24;
const LINE_H = 42;
const HEAD_H = 52;  // space above the item list for the title
const MIN_H  = 160; // minimum panel height (at least looks nice when bag is empty)

export class Inventory {
  constructor(scene) {
    this.scene = scene;
    this.open  = false;
    this.objs  = [];

    // Single key listener: I (or Escape while open) toggles the panel.
    this.iKey  = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.I);
    this.escKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
  }

  // Call once per frame from WorldScene.update() (before movement logic).
  // Returns true while the inventory is blocking input.
  update() {
    const justI   = Phaser.Input.Keyboard.JustDown(this.iKey);
    const justEsc = Phaser.Input.Keyboard.JustDown(this.escKey);

    if (justI || (justEsc && this.open)) {
      this.open ? this.close() : this.show();
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

    const cam   = this.scene.cameras.main;
    const W     = cam.width;
    const H     = cam.height;
    const items = questState.items;

    const panelW = Math.min(480, W - PAD * 4);
    const panelH = Math.max(MIN_H, HEAD_H + items.length * LINE_H + PAD * 2);
    const px     = (W - panelW) / 2;
    const py     = (H - panelH) / 2;

    const add = (o) => {
      o.setScrollFactor(0).setDepth(DEPTH);
      this.objs.push(o);
      return o;
    };

    // Panel background.
    add(
      this.scene.add
        .rectangle(px, py, panelW, panelH, 0x0d0f17, 0.96)
        .setOrigin(0, 0)
        .setStrokeStyle(3, 0xffd54a, 0.9)
    );

    // Title row.
    add(
      this.scene.add.text(px + PAD, py + 14, '🎒  ZAINO', {
        fontFamily: 'monospace',
        fontSize:   '18px',
        color:      '#ffd54a',
        fontStyle:  'bold',
      })
    );
    add(
      this.scene.add.text(px + panelW - PAD, py + 14, '[I] chiudi', {
        fontFamily: 'monospace',
        fontSize:   '13px',
        color:      '#9aa0a8',
      }).setOrigin(1, 0)
    );

    // Divider.
    const dg = this.scene.add.graphics().setScrollFactor(0).setDepth(DEPTH);
    dg.lineStyle(1, 0xffffff, 0.2);
    dg.lineBetween(px + PAD, py + HEAD_H - 8, px + panelW - PAD, py + HEAD_H - 8);
    this.objs.push(dg);

    if (items.length === 0) {
      add(
        this.scene.add.text(px + panelW / 2, py + HEAD_H + PAD, 'Lo zaino è vuoto.', {
          fontFamily: 'monospace',
          fontSize:   '16px',
          color:      '#9aa0a8',
        }).setOrigin(0.5, 0)
      );
      return;
    }

    items.forEach((item, i) => {
      const iy = py + HEAD_H + i * LINE_H;
      // bullet + name
      add(
        this.scene.add.text(px + PAD, iy, `✦  ${item.name}`, {
          fontFamily: 'monospace',
          fontSize:   '17px',
          color:      '#ffffff',
        })
      );
      // buff summary (e.g. "+5 ATK"), right-aligned and green
      const buffText = this._buffLabel(item.buff);
      if (buffText) {
        add(
          this.scene.add.text(px + panelW - PAD, iy, buffText, {
            fontFamily: 'monospace',
            fontSize:   '15px',
            color:      '#57d977',
          }).setOrigin(1, 0)
        );
      }
      // description (under the name, dimmer)
      if (item.description) {
        add(
          this.scene.add.text(px + PAD + 22, iy + 17, item.description, {
            fontFamily: 'monospace',
            fontSize:   '12px',
            color:      '#9aa0a8',
          })
        );
      }
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
