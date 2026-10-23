// js/story/QuestTracker.js
// A small panel pinned to the TOP-RIGHT of the screen showing the active quest
// and its objectives as a done/todo checklist. Rebuilt whenever progress
// changes (call refresh()) and once per scene (it's recreated on every map).
import { activeQuest } from './chapters.js';
import { objectiveTargets } from './questGuide.js';
import { hud, hudPx } from '../config.js';

const DEPTH = 1000000;
const W = hud(280); // panel width (px, HUD_SCALE)
const PAD = hud(12);

export class QuestTracker {
  constructor(scene) {
    this.scene = scene;
    this.objs = [];
    this.build();
  }

  build() {
    this.objs.forEach((o) => o.destroy());
    this.objs = [];

    this.bottom = hud(12); // screen y just below the panel (PhoneHud sits there)
    const q = activeQuest();
    if (!q) return;

    // Width clamps to the screen; every line word-wraps and the box is sized
    // to the measured text, so long titles/objectives never run off the right
    // edge. Rebuilt on resize (WorldScene.layoutHud).
    const cam = this.scene.cameras.main;
    const M = hud(12); // margin from the screen edges
    const w = Math.min(W, cam.width * 0.45, cam.width - 2 * M);
    const x = cam.width - w - M;
    const y = M;
    const wrap = { width: w - PAD * 2 };

    const add = (o) => {
      o.setScrollFactor(0).setDepth(DEPTH);
      this.objs.push(o);
      return o;
    };
    const text = (ty, str, style) =>
      add(this.scene.add.text(x + PAD, ty, str, { fontFamily: 'monospace', wordWrap: wrap, ...style }));

    // Chapter + quest heading (turns green once complete).
    let ty = y + hud(8);
    ty += text(ty, q.chapterTitle.toUpperCase(), { fontSize: hudPx(11), color: '#7a8190' }).height + hud(4);
    ty += text(ty, q.title, {
      fontSize: hudPx(14),
      color: q.complete ? '#7CFC8A' : '#ffd54a',
      fontStyle: 'bold',
    }).height + hud(10);

    // Each open objective gets a small "→ who, where" line under it (questGuide).
    const where = objectiveTargets(this.scene);
    q.objectives.forEach((o, i) => {
      ty += text(ty, `${o.done ? '☑' : '☐'} ${o.label}`, {
        fontSize: hudPx(13),
        color: o.done ? '#8f97a3' : '#ffffff',
      }).height + hud(6);
      const t = where[i];
      if (!o.done && t && t.where && t.where !== '—') {
        ty += text(ty - hud(4), `   → ${t.who ? `${t.who}, ` : ''}${t.where}`, {
          fontSize: hudPx(11),
          color: '#8fb3d9',
        }).height + hud(4);
      }
    });
    // Background last (now that the height is known), one depth step below.
    add(
      this.scene.add
        .rectangle(x, y, w, ty - y + PAD - hud(6), 0x0d0f17, 0.82)
        .setOrigin(0, 0)
        .setStrokeStyle(2, 0xffffff, 0.55)
    ).setDepth(DEPTH - 1);
    this.bottom = ty + PAD - hud(6);
  }

  refresh() {
    this.build();
  }
}
