// js/story/QuestTracker.js
// A small panel pinned to the TOP-RIGHT of the screen showing the active quest
// and its objectives as a done/todo checklist. Rebuilt whenever progress
// changes (call refresh()) and once per scene (it's recreated on every map).
import { activeQuest } from './chapters.js';

const DEPTH = 1000000;
const W = 280; // panel width (px)
const PAD = 12;

export class QuestTracker {
  constructor(scene) {
    this.scene = scene;
    this.objs = [];
    this.build();
  }

  build() {
    this.objs.forEach((o) => o.destroy());
    this.objs = [];

    const q = activeQuest();
    if (!q) return;

    // Width clamps to the screen; every line word-wraps and the box is sized
    // to the measured text, so long titles/objectives never run off the right
    // edge. Rebuilt on resize (WorldScene.layoutHud).
    const cam = this.scene.cameras.main;
    const w = Math.min(W, cam.width - 24);
    const x = cam.width - w - 12;
    const y = 12;
    const wrap = { width: w - PAD * 2 };

    const add = (o) => {
      o.setScrollFactor(0).setDepth(DEPTH);
      this.objs.push(o);
      return o;
    };
    const text = (ty, str, style) =>
      add(this.scene.add.text(x + PAD, ty, str, { fontFamily: 'monospace', wordWrap: wrap, ...style }));

    // Chapter + quest heading (turns green once complete).
    let ty = y + 8;
    ty += text(ty, q.chapterTitle.toUpperCase(), { fontSize: '11px', color: '#7a8190' }).height + 4;
    ty += text(ty, q.title, {
      fontSize: '14px',
      color: q.complete ? '#7CFC8A' : '#ffd54a',
      fontStyle: 'bold',
    }).height + 10;

    for (const o of q.objectives) {
      ty += text(ty, `${o.done ? '☑' : '☐'} ${o.label}`, {
        fontSize: '13px',
        color: o.done ? '#8f97a3' : '#ffffff',
      }).height + 6;
    }
    // Background last (now that the height is known), one depth step below.
    add(
      this.scene.add
        .rectangle(x, y, w, ty - y + PAD - 6, 0x0d0f17, 0.82)
        .setOrigin(0, 0)
        .setStrokeStyle(2, 0xffffff, 0.55)
    ).setDepth(DEPTH - 1);
  }

  refresh() {
    this.build();
  }
}
