// js/ui/Phone.js
// House phone (key P), drawn as a WhatsApp chat: the group "Cucina di su".
//   • header: group avatar, name, members;
//   • pinned message (📌): the active mission with WHERE to do each objective
//     (questGuide, read from the data);
//   • chat: one hint per chapter so far (chapter `phone` arrays), with a
//     chapter "date chip" between chapters, newest at the bottom;
//   • a decorative "Scrivi un messaggio" bar.
// ↑/↓ scroll the history. Close with P or Esc. Everything is plain Phaser
// shapes + text (screen-fixed, so the unzoomed HUD camera draws it).

import { activeQuest, phoneMessages } from '../story/chapters.js';
import { objectiveTargets } from '../story/questGuide.js';
import { CHARACTERS, getCharData } from '../core/characters.js';

const GROUP_NAME = 'Cucina di su';
const DEPTH = 3000000;
const FONT = 'Helvetica, Arial, sans-serif';
const C = {
  bezel: 0x111111,
  statusBar: 0x054d44,
  header: 0x075e54,
  chatBg: 0xece5dd,
  bubble: 0xffffff,
  pinned: 0xffffff,
  chip: 0xe1f3fb,
  input: 0xffffff,
  send: 0x00a884,
  avatar: 0xdfe5e7,
};
// WhatsApp-like sender colours, one per character (stable by registry order).
const NAME_COLORS = ['#e542a3', '#1f7aec', '#00a884', '#fc9775', '#a62c71',
  '#02a698', '#d3396d', '#5f66cd', '#c4532d', '#2f8f3f', '#b4876e'];

// Fake but stable send time for the i-th message ("09:05", "09:52", ...).
const fakeTime = (i) => {
  const mins = 9 * 60 + 5 + i * 47;
  return `${String(Math.floor(mins / 60) % 24).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
};

export class Phone {
  constructor(scene) {
    this.scene = scene;
    this.open = false;
    this.objs = [];
    this.scroll = 0; // how many chat items (messages/chips) are hidden below
    this.key = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.P);
    this.escKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    this.cursors = scene.input.keyboard.createCursorKeys();
    this.ws = scene.input.keyboard.addKeys({ up: 'W', down: 'S' });
  }

  // Same contract as Inventory.update(canOpen).
  update(canOpen = true) {
    const J = Phaser.Input.Keyboard.JustDown;
    if (this.open) {
      if (J(this.key) || J(this.escKey)) this.close();
      else if (J(this.cursors.up) || J(this.ws.up)) this.scrollBy(1);
      else if (J(this.cursors.down) || J(this.ws.down)) this.scrollBy(-1);
    } else if (canOpen && J(this.key)) {
      this.show();
    }
    return this.open;
  }

  show() {
    this.open = true;
    this.scroll = 0; // always open on the newest message
    this.rebuild();
  }

  close() {
    this.open = false;
    this.clear();
  }

  clear() {
    this.objs.forEach((o) => o.destroy());
    this.objs = [];
  }

  scrollBy(d) {
    const max = Math.max(0, this.chatItems().length - 1);
    const next = Phaser.Math.Clamp(this.scroll + d, 0, max);
    if (next === this.scroll) return;
    this.scroll = next;
    this.rebuild();
  }

  // Messages oldest → newest, with a chip whenever the chapter changes.
  chatItems() {
    const items = [];
    let last = null;
    phoneMessages().forEach((m, i) => {
      if (m.chapter !== last) {
        items.push({ chip: m.chapterTitle });
        last = m.chapter;
      }
      items.push({ ...m, time: fakeTime(i) });
    });
    return items;
  }

  add(o, depth = 1) {
    o.setScrollFactor(0).setDepth(DEPTH + depth);
    this.objs.push(o);
    return o;
  }

  text(str, style) {
    return this.add(this.scene.add.text(0, 0, str, { fontFamily: FONT, ...style }), 3);
  }

  rebuild() {
    this.clear();
    const s = this.scene;
    const cam = s.cameras.main;
    const W = cam.width;
    const H = cam.height;

    // Phone body (portrait, ~1:2) and screen.
    const fh = Math.min(H - 40, 780);
    const fw = Math.min(W - 32, fh * 0.5);
    const fx = (W - fw) / 2;
    const fy = (H - fh) / 2;
    const sx = fx + 10, sy = fy + 10, sw = fw - 20, sh = fh - 20;
    const g = this.add(s.add.graphics(), 0);
    g.fillStyle(C.bezel, 1).fillRoundedRect(fx, fy, fw, fh, 36);
    g.fillStyle(C.chatBg, 1).fillRoundedRect(sx, sy, sw, sh, 28);

    // Status bar.
    const now = new Date();
    g.fillStyle(C.statusBar, 1).fillRoundedRect(sx, sy, sw, 26, { tl: 28, tr: 28, bl: 0, br: 0 });
    this.text(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
      { fontSize: '12px', color: '#ffffff', fontStyle: 'bold' }).setPosition(sx + 26, sy + 6);
    this.text('▂▄▆ ● 100%', { fontSize: '11px', color: '#ffffff' }).setOrigin(1, 0).setPosition(sx + sw - 24, sy + 7);

    // Header: back, avatar, group name, members.
    const hy = sy + 26, hh = 58;
    g.fillStyle(C.header, 1).fillRect(sx, hy, sw, hh);
    this.text('←', { fontSize: '20px', color: '#ffffff' }).setPosition(sx + 10, hy + 16);
    g.fillStyle(C.avatar, 1).fillCircle(sx + 52, hy + hh / 2, 19);
    this.text('🍳', { fontSize: '20px' }).setOrigin(0.5).setPosition(sx + 52, hy + hh / 2);
    this.text(GROUP_NAME, { fontSize: '16px', color: '#ffffff', fontStyle: 'bold' }).setPosition(sx + 80, hy + 10);
    const members = this.fitText(
      [...CHARACTERS.map((c) => getCharData(s, c).name || c), 'Tu'].join(', '),
      sw - 80 - 34, { fontSize: '12px', color: '#d1f4ee' });
    members.setPosition(sx + 80, hy + 32);
    this.text('⋮', { fontSize: '20px', color: '#ffffff' }).setOrigin(1, 0).setPosition(sx + sw - 12, hy + 16);

    // Pinned message: the mission + where to go.
    const py = hy + hh;
    const pinned = this.buildPinned(sx, py, sw);

    // Input bar (decorative).
    const iy = sy + sh - 54;
    g.fillStyle(C.input, 1).fillRoundedRect(sx + 8, iy + 8, sw - 66, 38, 19);
    this.text('😊  Scrivi un messaggio', { fontSize: '14px', color: '#8696a0' }).setPosition(sx + 20, iy + 18);
    g.fillStyle(C.send, 1).fillCircle(sx + sw - 30, iy + 27, 20);
    this.text('🎤', { fontSize: '16px' }).setOrigin(0.5).setPosition(sx + sw - 30, iy + 27);

    // Chat, laid out bottom-up from just above the input bar.
    this.buildChat(g, sx, pinned.bottom + 6, sw, iy - 4);

    // Footer hint below the phone.
    this.add(s.add.text(W / 2, fy + fh + 4, '[P] chiudi · ↑/↓ o W/S scorri', {
      fontFamily: 'monospace', fontSize: '12px', color: '#c8ccd4',
    }).setOrigin(0.5, 0), 3);
  }

  // White pinned box under the header. Returns { bottom }.
  buildPinned(x, y, w) {
    const q = activeQuest();
    const lines = [];
    if (q) {
      for (const t of objectiveTargets(this.scene)) {
        lines.push({
          str: `${t.done ? '✓' : '•'} ${t.label}${t.done ? '' : `  →  ${t.who ? `${t.who}, ` : ''}${t.where}`}`,
          color: t.done ? '#8696a0' : '#111b21',
        });
      }
    }
    const head = this.text(q ? `📌  ${q.title}` : '📌  Nessuna missione', {
      fontSize: '13px', color: '#00a884', fontStyle: 'bold', wordWrap: { width: w - 24 },
    }).setPosition(x + 12, y + 8);
    let cy = y + 8 + head.height + 4;
    for (const l of lines) {
      const t = this.text(l.str, { fontSize: '11px', color: l.color, wordWrap: { width: w - 24 } })
        .setPosition(x + 12, cy);
      cy += t.height + 2;
    }
    const bottom = cy + 6;
    const g = this.add(this.scene.add.graphics(), 2);
    g.fillStyle(C.pinned, 0.97).fillRect(x, y, w, bottom - y);
    g.fillStyle(0x000000, 0.08).fillRect(x, bottom, w, 2); // soft shadow
    return { bottom };
  }

  // Bubbles + chapter chips between `top` and `bottom`, newest at the bottom,
  // skipping the `this.scroll` newest items.
  buildChat(g, x, top, w, bottom) {
    const items = this.chatItems();
    const maxBubble = w * 0.8;
    const hintTop = top;
    top += 26; // keep room for the "↑ N precedenti" hint, so it never covers a bubble
    let y = bottom;
    let shown = 0;
    for (let i = items.length - 1 - this.scroll; i >= 0; i--) {
      const it = items[i];
      const objs = [];
      let h;
      if (it.chip) {
        const t = this.text(it.chip.toUpperCase(), { fontSize: '10px', color: '#54656f' });
        objs.push(t);
        h = t.height + 10;
        if (y - h - 8 < top) { objs.forEach((o) => o.destroy()); break; }
        y -= h + 8;
        const cw = t.width + 18;
        g.fillStyle(C.chip, 1).fillRoundedRect(x + (w - cw) / 2, y, cw, h, 8);
        t.setPosition(x + (w - t.width) / 2, y + 5);
      } else {
        const idx = Math.max(0, CHARACTERS.indexOf(it.from));
        const name = this.text(getCharData(this.scene, it.from).name || it.from, {
          fontSize: '12px', color: NAME_COLORS[idx % NAME_COLORS.length], fontStyle: 'bold',
        });
        const body = this.text(it.text, { fontSize: '14px', color: '#111b21', wordWrap: { width: maxBubble - 20 } });
        const time = this.text(`${it.time} ✓✓`, { fontSize: '10px', color: '#53bdeb' });
        objs.push(name, body, time);
        const bw = Math.min(maxBubble, Math.max(name.width, body.width, time.width + 30) + 20);
        h = 6 + name.height + 2 + body.height + 2 + time.height + 6;
        if (y - h - 6 < top) { objs.forEach((o) => o.destroy()); break; }
        y -= h + 6;
        const bx = x + 14;
        g.fillStyle(C.bubble, 1).fillRoundedRect(bx, y, bw, h, 8);
        g.fillTriangle(bx - 7, y, bx + 8, y, bx + 8, y + 10); // tail
        name.setPosition(bx + 10, y + 6);
        body.setPosition(bx + 10, y + 6 + name.height + 2);
        time.setOrigin(1, 0).setPosition(bx + bw - 8, y + h - time.height - 5);
      }
      shown++;
    }
    // Older messages hidden above → a hint chip at the top (messages only,
    // chapter chips aren't counted).
    const hiddenAbove = items.slice(0, items.length - this.scroll - shown).filter((it) => !it.chip).length;
    if (hiddenAbove > 0) {
      const t = this.text(`↑ ${hiddenAbove} ${hiddenAbove === 1 ? 'precedente' : 'precedenti'}`, {
        fontSize: '10px', color: '#ffffff',
      });
      g.fillStyle(0x000000, 0.35).fillRoundedRect(x + (w - t.width - 16) / 2, hintTop + 2, t.width + 16, t.height + 6, 8);
      t.setPosition(x + (w - t.width) / 2, hintTop + 5);
    }
  }

  // A one-line text cut with "…" so it fits `maxW` px.
  fitText(str, maxW, style) {
    const t = this.text(str, style);
    while (t.width > maxW && str.length > 1) {
      str = str.slice(0, -1);
      t.setText(`${str.trimEnd()}…`);
    }
    return t;
  }
}
