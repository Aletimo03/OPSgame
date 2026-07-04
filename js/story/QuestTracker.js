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

    const cam = this.scene.cameras.main;
    const x = cam.width - W - 12;
    const y = 12;
    const lineH = 22;
    const headH = 60;
    const h = headH + q.objectives.length * lineH + PAD;

    const add = (o) => {
      o.setScrollFactor(0).setDepth(DEPTH);
      this.objs.push(o);
      return o;
    };

    add(
      this.scene.add
        .rectangle(x, y, W, h, 0x0d0f17, 0.82)
        .setOrigin(0, 0)
        .setStrokeStyle(2, 0xffffff, 0.55)
    );

    // Chapter + quest heading (turns green once complete).
    add(
      this.scene.add.text(x + PAD, y + 8, q.chapterTitle.toUpperCase(), {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: '#7a8190',
      })
    );
    add(
      this.scene.add.text(x + PAD, y +22, q.title, {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: q.complete ? '#7CFC8A' : '#ffd54a',
        fontStyle: 'bold',
        wordWrap: { width: W - PAD * 2 },
      })
    );

    let oy = y + headH;
    for (const o of q.objectives) {
      add(
        this.scene.add.text(x + PAD, oy, `${o.done ? '☑' : '☐'} ${o.label}`, {
          fontFamily: 'monospace',
          fontSize: '13px',
          color: o.done ? '#8f97a3' : '#ffffff',
        })
      );
      oy += lineH;
    }
  }

  refresh() {
    this.build();
  }
}
