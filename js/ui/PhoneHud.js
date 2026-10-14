// js/ui/PhoneHud.js
// Phone icon pinned under the quest tracker (top-right). A red badge on it
// counts the messages you haven't read yet in ALL chats (group + private:
// phoneChats.totalUnread; opening a chat marks it read), with "[P] telefono" below.
// It re-renders only when the count or the tracker's height changes.
import { totalUnread } from '../story/phoneChats.js';

const DEPTH = 1000000;
const SIZE = 46; // icon tile (px)

export class PhoneHud {
  constructor(scene, tracker) {
    this.scene = scene;
    this.tracker = tracker;
    this.objs = [];
    this.key = null; // last rendered "unread|top|width"
  }

  unread() {
    return totalUnread();
  }

  // Call every frame (cheap: rebuilds only on change).
  update() {
    const cam = this.scene.cameras.main;
    const n = this.unread();
    const top = (this.tracker?.bottom ?? 12) + 10;
    const key = `${n}|${top}|${cam.width}`;
    if (key !== this.key) this.build(n, top, cam.width);
  }

  build(n, top, W) {
    this.key = `${n}|${top}|${W}`;
    this.objs.forEach((o) => o.destroy());
    this.objs = [];
    const s = this.scene;
    const add = (o, d = 0) => {
      o.setScrollFactor(0).setDepth(DEPTH + d);
      this.objs.push(o);
      return o;
    };
    const cx = W - 12 - SIZE / 2; // right-aligned with the tracker
    const cy = top + SIZE / 2;

    // Rounded dark tile + a drawn handset (no image asset needed).
    const g = add(s.add.graphics());
    g.fillStyle(0x0d0f17, 0.82).fillRoundedRect(cx - SIZE / 2, top, SIZE, SIZE, 10);
    g.lineStyle(2, n ? 0x25d366 : 0xffffff, n ? 0.95 : 0.55).strokeRoundedRect(cx - SIZE / 2, top, SIZE, SIZE, 10);
    g.fillStyle(0xe8eaee, 1).fillRoundedRect(cx - 11, cy - 17, 22, 34, 5);   // body
    g.fillStyle(0x075e54, 1).fillRect(cx - 8, cy - 12, 16, 22);              // screen (WhatsApp green)
    g.fillStyle(0x0d0f17, 1).fillCircle(cx, cy + 13.5, 1.8);                 // home button

    if (n > 0) {
      const label = n > 9 ? '9+' : String(n);
      const bx = cx + SIZE / 2 - 4;
      const by = top + 4;
      const r = label.length > 1 ? 11 : 9;
      g.fillStyle(0xe53935, 1).fillCircle(bx, by, r);
      g.lineStyle(2, 0x0d0f17, 1).strokeCircle(bx, by, r);
      add(s.add.text(bx, by, label, {
        fontFamily: 'monospace', fontSize: '12px', color: '#ffffff', fontStyle: 'bold',
      }).setOrigin(0.5), 1);
    }

    add(s.add.text(W - 12, top + SIZE + 4, n ? `[P] ${n === 1 ? 'nuovo messaggio' : 'nuovi messaggi'}` : '[P] telefono', {
      fontFamily: 'monospace', fontSize: '11px', color: n ? '#7CFC8A' : '#c8ccd4',
      backgroundColor: 'rgba(0,0,0,0.45)', padding: { x: 4, y: 2 },
    }).setOrigin(1, 0), 1); // right-aligned: never runs off the screen edge
  }

  refresh() {
    this.key = null;
    this.update();
  }
}
