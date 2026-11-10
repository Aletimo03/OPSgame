// js/scenes/world/decor.js
// Map decorations drawn in code: painted floor areas and the wandering disco lights
// (the Alcatraz, the prologue party, the dream).
// A class mixin of WorldScene: the methods run with `this` = the scene.
import { TILE } from '../../config.js';
import { PROLOGUE, partyOn } from '../../story/prologue.js';

export const withDecor = (Base) => class extends Base {
  // Coloured floor areas drawn in code (map `paint`: { x0, y0, x1, y1, color,
  // label? } in tiles, inclusive), e.g. the Alcatraz stage and bar.
  drawPaint(map) {
    for (const p of map.paint || []) {
      const x = p.x0 * TILE;
      const y = p.y0 * TILE;
      const w = (p.x1 - p.x0 + 1) * TILE;
      const h = (p.y1 - p.y0 + 1) * TILE;
      this.add.rectangle(x, y, w, h, p.color, 1).setOrigin(0, 0).setDepth(1.5)
        .setStrokeStyle(4, 0x000000, 0.35);
      if (p.label) {
        this.add.text(x + w / 2, y + h / 2, p.label, {
          fontFamily: 'monospace', fontSize: '28px', fontStyle: 'bold', color: '#ffffff',
        }).setOrigin(0.5).setAlpha(0.3).setDepth(1.6);
      }
    }
  }

  // Disco lights (map `disco`): coloured light pools that wander at random
  // over the dance floor, drawn ADDITIVELY just above the night veil, so with a
  // dark `ambient` they light up the floor and whoever is dancing on it.
  // disco: { area: { x0, y0, x1, y1 } (tiles), lights, radius (tiles), colors }
  startDisco(map) {
    const party = partyOn() && map.key === PROLOGUE.party.kitchen; // the prologue's party
    for (const d of [].concat(party ? PROLOGUE.party.disco : map.disco || [])) this.discoLights(d); // one or several areas
  }

  // The soft round light texture (white centre → transparent) used by the
  // disco lights and the dream lantern.
  ensureLightTexture() {
    const KEY = 'disco-light';
    if (!this.textures.exists(KEY)) {
      const S = 256;
      const tex = this.textures.createCanvas(KEY, S, S);
      const ctx = tex.getContext();
      const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
      g.addColorStop(0, 'rgba(255,255,255,1)');
      g.addColorStop(0.35, 'rgba(255,255,255,0.55)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, S, S);
      tex.refresh();
    }
    return KEY;
  }

  discoLights(d) {
    const KEY = this.ensureLightTexture();
    const a = d.area;
    const rx = () => Phaser.Math.FloatBetween(a.x0, a.x1 + 1) * TILE;
    const ry = () => Phaser.Math.FloatBetween(a.y0, a.y1 + 1) * TILE;
    const colors = d.colors || [0xff2bd6, 0x2bd9ff, 0x7dff3b, 0xffe02b, 0x8a4fff, 0xff5a2b];
    const size = (d.radius || 3.5) * 2 * TILE;
    for (let i = 0; i < (d.lights || 8); i++) {
      const light = this.add.image(rx(), ry(), KEY)
        .setDisplaySize(size, size)
        .setTint(Phaser.Utils.Array.GetRandom(colors))
        .setBlendMode(Phaser.BlendModes.ADD)
        .setAlpha(0.75)
        .setDepth(880001);
      const wander = () => {
        if (!light.active) return;
        this.tweens.add({
          targets: light, x: rx(), y: ry(),
          duration: Phaser.Math.Between(900, 2600), ease: 'Sine.easeInOut',
          onComplete: () => {
            if (Math.random() < 0.4) light.setTint(Phaser.Utils.Array.GetRandom(colors)); // new colour now and then
            wander();
          },
        });
      };
      wander();
      // Pulse with the beat-ish: size and brightness breathe out of sync.
      this.tweens.add({
        targets: light, alpha: { from: 0.45, to: 0.85 }, scale: light.scale * Phaser.Math.FloatBetween(0.75, 1.15),
        duration: Phaser.Math.Between(350, 700), yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
        delay: Phaser.Math.Between(0, 500),
      });
    }
  }
};
