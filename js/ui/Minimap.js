// js/ui/Minimap.js
// Minimap (key M): the floor you're on only. Blue = you; yellow numbers = the
// active quest's open objectives on this floor (legend below; objectives on
// the other floor are listed with "altro piano", no marker). Anything inside a
// room is marked on the door that leads into it (questGuide.hubPosition).
// Close with M or Esc.

import { TILE, TILES } from '../config.js';
import { MAPS } from '../../maps/index.js';
import { HUBS, hubPosition, objectiveTargets } from '../story/questGuide.js';
import { feetY } from '../core/playerSprite.js';

const DEPTH = 3000000;
const PAD = 24;
const LABEL = { 'base-floor': 'PIANO TERRA', 'first-floor': 'PRIMO PIANO' };
const COL = {
  bg: 0x0d0f17, floor: 0x8a909c, door: 0xc9a23b, you: 0x3fa9ff, target: 0xffd54a,
};

export class Minimap {
  constructor(scene) {
    this.scene = scene;
    this.open = false;
    this.objs = [];
    this.key = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.M);
    this.escKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
  }

  // Same contract as Inventory.update(canOpen).
  update(canOpen = true) {
    const J = Phaser.Input.Keyboard.JustDown;
    if (this.open) {
      if (J(this.key) || J(this.escKey)) this.close();
    } else if (canOpen && J(this.key)) {
      this.show();
    }
    return this.open;
  }

  show() {
    this.open = true;
    this.rebuild();
  }

  close() {
    this.open = false;
    this.objs.forEach((o) => o.destroy());
    this.objs = [];
  }

  rebuild() {
    this.objs.forEach((o) => o.destroy());
    this.objs = [];
    const s = this.scene;
    const cam = s.cameras.main;
    const W = cam.width;
    const H = cam.height;
    const add = (o) => {
      o.setScrollFactor(0).setDepth(DEPTH);
      this.objs.push(o);
      return o;
    };
    const text = (x, y, str, style) => add(s.add.text(x, y, str, { fontFamily: 'monospace', ...style }));

    // Which floor: the one your current map hangs off.
    const p = s.player;
    const you = hubPosition(s.mapKey, p.x / TILE - 0.5, feetY(p) / TILE - 0.5);
    const hub = you?.hub || HUBS[0];
    const grid = MAPS[hub].grid;

    const targets = objectiveTargets(s)
      .filter((tg) => !tg.done)
      .map((tg, i) => ({ ...tg, n: i + 1, pos: tg.mapKey ? hubPosition(tg.mapKey, tg.tx, tg.ty) : null }));
    const legendH = 24 + targets.length * 20;

    // Tile size so the floor fits above the legend.
    const cols = grid[0].length;
    const rows = grid.length;
    const t = Math.max(2, Math.min((W - PAD * 4) / cols, (H - PAD * 6 - legendH - 40) / rows));
    const panelW = Math.max(cols * t, 360) + PAD * 2;
    const panelH = rows * t + 40 + legendH + PAD * 2;
    const px = (W - panelW) / 2;
    const py = (H - panelH) / 2;

    add(s.add.rectangle(px, py, panelW, panelH, COL.bg, 0.96).setOrigin(0, 0).setStrokeStyle(3, COL.you, 0.9));
    text(px + PAD, py + 12, `🗺  ${LABEL[hub]}`, { fontSize: '18px', color: '#9ad0ff', fontStyle: 'bold' });
    text(px + panelW - PAD, py + 14, '[M] chiudi', { fontSize: '13px', color: '#9aa0a8' }).setOrigin(1, 0);

    const g = add(s.add.graphics());
    const ox = px + (panelW - cols * t) / 2;
    const oy = py + 54;
    // Floor and doors, one rectangle per horizontal run of equal tiles.
    grid.forEach((row, y) => {
      let x = 0;
      while (x < row.length) {
        const v = row[x];
        let e = x;
        while (e < row.length && row[e] === v) e++;
        if (v !== TILES.WALL) {
          g.fillStyle(v === TILES.DOOR ? COL.door : COL.floor, 1);
          g.fillRect(ox + x * t, oy + y * t, (e - x) * t, t);
        }
        x = e;
      }
    });

    const mark = (pos, color, label) => {
      if (!pos || pos.hub !== hub) return;
      const cx = ox + (pos.tx + 0.5) * t;
      const cy = oy + (pos.ty + 0.5) * t;
      g.fillStyle(0x000000, 1).fillCircle(cx, cy, Math.max(5, t * 1.1) + 2);
      g.fillStyle(color, 1).fillCircle(cx, cy, Math.max(5, t * 1.1));
      if (label) {
        text(cx, cy, label, { fontSize: '11px', color: '#000000', fontStyle: 'bold' }).setOrigin(0.5);
      }
    };

    // Objectives first, so "you" is drawn on top when you're standing on one.
    targets.forEach((tg) => mark(tg.pos, COL.target, String(tg.n)));
    mark(you, COL.you);

    // Legend.
    let ly = oy + rows * t + 16;
    text(px + PAD, ly, '● tu', { fontSize: '13px', color: '#9ad0ff' });
    ly += 22;
    if (!targets.length) text(px + PAD, ly, 'Nessun obiettivo da segnare.', { fontSize: '13px', color: '#9aa0a8' });
    targets.forEach((tg, i) => {
      const other = tg.pos && tg.pos.hub !== hub;
      text(px + PAD, ly + i * 20,
        `${tg.n}  ${tg.label} — ${tg.who ? `${tg.who}, ` : ''}${tg.where}${other ? '  (altro piano)' : ''}`, {
          fontSize: '13px', color: other ? '#9aa0a8' : '#ffd54a',
          wordWrap: { width: panelW - PAD * 2 },
        });
    });
  }
}
