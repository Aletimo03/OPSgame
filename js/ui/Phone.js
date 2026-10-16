// js/ui/Phone.js
// House phone (key P), drawn as WhatsApp. Two screens:
//   • LIST: every chat so far, most recent first: the group "Cucina di su" and
//     the private chats (chapter `phone` entries with `dm: true`), each with
//     its last message, time and a green unread badge. The 📌 mission (with
//     WHERE to do each objective, from questGuide) is pinned on top.
//     ↑/↓ (W/S) choose, Space / Enter / → open.
//   • CHAT: the bubbles of one chat, a chapter "date chip" between chapters,
//     newest at the bottom; the group chat also keeps the 📌 mission. ↑/↓ (W/S)
//     scroll, ← / Backspace back to the list.
// P or Esc close the phone. Opening a chat marks it read (phoneChats.markRead),
// which clears that part of the HUD badge (PhoneHud). Everything is plain
// Phaser shapes + text (screen-fixed, so the unzoomed HUD camera draws it).

import { activeQuest } from '../story/chapters.js';
import { objectiveTargets } from '../story/questGuide.js';
import { GROUP, phoneChats, unreadIn, markRead } from '../story/phoneChats.js';
import { CHARACTERS, getCharData } from '../core/characters.js';
import { heartsLabel } from '../story/affinity.js';
import { clockNow, fmt } from '../story/clock.js';

const GROUP_NAME = 'Cucina di su';
const DEPTH = 3000000;
const FONT = 'Helvetica, Arial, sans-serif';
const C = {
  bezel: 0x111111,
  statusBar: 0x054d44,
  header: 0x075e54,
  chatBg: 0xece5dd,
  listBg: 0xffffff,
  rowSel: 0xe9edef,
  bubble: 0xffffff,
  pinned: 0xffffff,
  chip: 0xe1f3fb,
  input: 0xffffff,
  send: 0x00a884,
  unread: 0x25d366,
  avatar: 0xdfe5e7,
};
// WhatsApp-like sender colours, one per character (stable by registry order).
const NAME_COLORS = ['#e542a3', '#1f7aec', '#00a884', '#fc9775', '#a62c71',
  '#02a698', '#d3396d', '#5f66cd', '#c4532d', '#2f8f3f', '#b4876e'];
const colorOf = (id) => NAME_COLORS[Math.max(0, CHARACTERS.indexOf(id)) % NAME_COLORS.length];

// Send time of a message: its in-game minute (phoneChats / clock.js).
const timeOf = (m) => fmt(m.min ?? 0);

export class Phone {
  constructor(scene) {
    this.scene = scene;
    this.open = false;
    this.objs = [];
    this.view = 'list'; // 'list' | 'chat'
    this.sel = 0;       // selected row in the list
    this.chatId = null; // open chat
    this.scroll = 0;    // how many chat items (messages/chips) are hidden below
    const K = Phaser.Input.Keyboard.KeyCodes;
    this.key = scene.input.keyboard.addKey(K.P);
    this.escKey = scene.input.keyboard.addKey(K.ESC);
    this.cursors = scene.input.keyboard.createCursorKeys();
    this.ws = scene.input.keyboard.addKeys({ up: 'W', down: 'S', left: 'A', right: 'D' });
    this.enter = scene.input.keyboard.addKey(K.ENTER);
    this.back = scene.input.keyboard.addKey(K.BACKSPACE);
  }

  // Same contract as Inventory.update(canOpen).
  update(canOpen = true) {
    const J = Phaser.Input.Keyboard.JustDown;
    if (!this.open) {
      if (canOpen && J(this.key)) this.show();
      return this.open;
    }
    const c = this.cursors;
    const up = J(c.up) || J(this.ws.up);
    const down = J(c.down) || J(this.ws.down);
    if (J(this.key) || J(this.escKey)) this.close();
    else if (this.view === 'list') {
      if (up) this.moveSel(-1);
      else if (down) this.moveSel(1);
      else if (J(c.space) || J(this.enter) || J(c.right) || J(this.ws.right)) this.openChat();
    } else {
      if (up) this.scrollBy(1);
      else if (down) this.scrollBy(-1);
      else if (J(c.left) || J(this.ws.left) || J(this.back)) this.toList();
    }
    return this.open;
  }

  show() {
    this.open = true;
    this.view = 'list';
    this.sel = 0; // the most recent chat
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

  moveSel(d) {
    const n = phoneChats().length;
    this.sel = Phaser.Math.Clamp(this.sel + d, 0, Math.max(0, n - 1));
    this.rebuild();
  }

  openChat() {
    const chat = phoneChats()[this.sel];
    if (!chat) return;
    this.view = 'chat';
    this.chatId = chat.id;
    this.scroll = 0; // open on the newest message
    markRead(chat);
    this.rebuild();
  }

  toList() {
    this.view = 'list';
    const i = phoneChats().findIndex((c) => c.id === this.chatId);
    this.sel = Math.max(0, i);
    this.rebuild();
  }

  currentChat() {
    return phoneChats().find((c) => c.id === this.chatId) || { id: this.chatId, messages: [] };
  }

  scrollBy(d) {
    const max = Math.max(0, this.chatItems().length - 1);
    const next = Phaser.Math.Clamp(this.scroll + d, 0, max);
    if (next === this.scroll) return;
    this.scroll = next;
    this.rebuild();
  }

  // The open chat's messages oldest → newest, with a chip whenever the chapter changes.
  chatItems() {
    const items = [];
    let last = null;
    for (const m of this.currentChat().messages) {
      if (m.chapter !== last) {
        items.push({ chip: m.chapterTitle });
        last = m.chapter;
      }
      items.push({ ...m, time: timeOf(m) });
    }
    return items;
  }

  nameOf(id) {
    return id === GROUP ? GROUP_NAME : getCharData(this.scene, id).name || id;
  }

  add(o, depth = 1) {
    o.setScrollFactor(0).setDepth(DEPTH + depth);
    this.objs.push(o);
    return o;
  }

  text(str, style) {
    return this.add(this.scene.add.text(0, 0, str, { fontFamily: FONT, ...style }), 3);
  }

  // Round avatar: 🍳 for the group, the coloured initial for a person.
  avatar(g, x, y, r, id) {
    if (id === GROUP) {
      g.fillStyle(C.avatar, 1).fillCircle(x, y, r);
      this.text('🍳', { fontSize: `${Math.round(r * 1.05)}px` }).setOrigin(0.5).setPosition(x, y);
    } else {
      g.fillStyle(Phaser.Display.Color.HexStringToColor(colorOf(id)).color, 1).fillCircle(x, y, r);
      this.text(this.nameOf(id).charAt(0).toUpperCase(), {
        fontSize: `${Math.round(r * 1.1)}px`, color: '#ffffff', fontStyle: 'bold',
      }).setOrigin(0.5).setPosition(x, y);
    }
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
    g.fillStyle(this.view === 'list' ? C.listBg : C.chatBg, 1).fillRoundedRect(sx, sy, sw, sh, 28);

    // Status bar.
    g.fillStyle(C.statusBar, 1).fillRoundedRect(sx, sy, sw, 26, { tl: 28, tr: 28, bl: 0, br: 0 });
    this.text(fmt(clockNow()), // the in-game clock, not the real one
      { fontSize: '12px', color: '#ffffff', fontStyle: 'bold' }).setPosition(sx + 26, sy + 6);
    this.text('▂▄▆ ● 100%', { fontSize: '11px', color: '#ffffff' }).setOrigin(1, 0).setPosition(sx + sw - 24, sy + 7);

    const hy = sy + 26, hh = 58;
    g.fillStyle(C.header, 1).fillRect(sx, hy, sw, hh);
    if (this.view === 'list') this.buildList(g, sx, hy, hh, sy + sh, sw);
    else this.buildChatView(g, sx, hy, hh, sy + sh, sw);

    // Footer hint below the phone.
    const hint = this.view === 'list'
      ? '↑/↓ scegli · Spazio apri · [P] chiudi'
      : '← indietro · ↑/↓ scorri · [P] chiudi';
    this.add(s.add.text(W / 2, fy + fh + 4, hint, {
      fontFamily: 'monospace', fontSize: '12px', color: '#c8ccd4',
    }).setOrigin(0.5, 0), 3);
  }

  // LIST screen: header, pinned mission, one row per chat.
  buildList(g, x, hy, hh, bottom, w) {
    this.text('WhatsApp', { fontSize: '20px', color: '#ffffff', fontStyle: 'bold' }).setPosition(x + 16, hy + 16);
    this.text('Chat', { fontSize: '13px', color: '#d1f4ee' }).setOrigin(1, 0).setPosition(x + w - 16, hy + 22);
    const pinned = this.buildPinned(x, hy + hh, w);

    const chats = phoneChats();
    this.sel = Phaser.Math.Clamp(this.sel, 0, Math.max(0, chats.length - 1));
    const rowH = 64;
    const top = pinned.bottom + 4;
    const fit = Math.max(1, Math.floor((bottom - 24 - top) / rowH));
    const first = Phaser.Math.Clamp(this.sel - fit + 1, 0, Math.max(0, chats.length - fit)); // keep the selection visible
    chats.slice(first, first + fit).forEach((chat, k) => {
      const i = first + k;
      const y = top + k * rowH;
      if (i === this.sel) g.fillStyle(C.rowSel, 1).fillRect(x, y, w, rowH);
      g.fillStyle(0x000000, 0.06).fillRect(x + 76, y + rowH - 1, w - 76, 1);
      this.avatar(g, x + 38, y + rowH / 2, 23, chat.id);

      const last = chat.messages[chat.messages.length - 1];
      const n = unreadIn(chat);
      const time = this.text(last ? timeOf(last) : '', { fontSize: '11px', color: n ? '#1fa855' : '#667781' })
        .setOrigin(1, 0).setPosition(x + w - 14, y + 13);
      const nm = this.fitText(this.nameOf(chat.id), w - 76 - time.width - 26 - (chat.id === GROUP ? 0 : 60), {
        fontSize: '15px', color: '#111b21', fontStyle: 'bold',
      }).setPosition(x + 72, y + 11);
      if (chat.id !== GROUP) {
        this.text(heartsLabel(chat.id), { fontSize: '10px', color: '#e53935' }).setPosition(x + 76 + nm.width, y + 15);
      }
      let preview = 'Nessun messaggio';
      if (last) {
        const body = last.sticker ? `${last.sticker} Sticker` : last.text;
        preview = chat.id === GROUP ? `${this.nameOf(last.from)}: ${body}` : body;
      }
      this.fitText(preview, w - 76 - (n ? 40 : 16), { fontSize: '12px', color: '#667781' })
        .setPosition(x + 72, y + 35);
      if (n) {
        const bx = x + w - 24;
        const by = y + 42;
        g.fillStyle(C.unread, 1).fillCircle(bx, by, 10);
        this.text(n > 9 ? '9+' : String(n), { fontSize: '11px', color: '#ffffff', fontStyle: 'bold' })
          .setOrigin(0.5).setPosition(bx, by);
      }
    });
    if (first + fit < chats.length) {
      this.text(`↓ altre ${chats.length - first - fit} chat`, { fontSize: '11px', color: '#667781' })
        .setOrigin(0.5, 0).setPosition(x + w / 2, bottom - 22);
    }
  }

  // CHAT screen: header with back arrow + avatar + name, (group: pinned
  // mission), bubbles, decorative input bar.
  buildChatView(g, x, hy, hh, bottom, w) {
    const id = this.chatId;
    const isGroup = id === GROUP;
    this.text('←', { fontSize: '20px', color: '#ffffff' }).setPosition(x + 10, hy + 16);
    this.avatar(g, x + 52, hy + hh / 2, 19, id);
    this.text(this.nameOf(id), { fontSize: '16px', color: '#ffffff', fontStyle: 'bold' }).setPosition(x + 80, hy + 10);
    const sub = isGroup
      ? [...CHARACTERS.filter((c) => !getCharData(this.scene, c).guest).map((c) => getCharData(this.scene, c).name || c), 'Tu'].join(', ')
      : `online · affinità ${heartsLabel(id)}`;
    this.fitText(sub, w - 80 - 34, { fontSize: '12px', color: '#d1f4ee' }).setPosition(x + 80, hy + 32);
    this.text('⋮', { fontSize: '20px', color: '#ffffff' }).setOrigin(1, 0).setPosition(x + w - 12, hy + 16);

    const top = isGroup ? this.buildPinned(x, hy + hh, w).bottom + 6 : hy + hh + 6;

    // Input bar (decorative).
    const iy = bottom - 54;
    g.fillStyle(C.input, 1).fillRoundedRect(x + 8, iy + 8, w - 66, 38, 19);
    this.text('😊  Scrivi un messaggio', { fontSize: '14px', color: '#8696a0' }).setPosition(x + 20, iy + 18);
    g.fillStyle(C.send, 1).fillCircle(x + w - 30, iy + 27, 20);
    this.text('🎤', { fontSize: '16px' }).setOrigin(0.5).setPosition(x + w - 30, iy + 27);

    this.buildChat(g, x, top, w, iy - 4, isGroup);
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
  // skipping the `this.scroll` newest items. Sender names only in the group.
  buildChat(g, x, top, w, bottom, showNames) {
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
      } else if (it.sticker) {
        // Sticker message ({ from, sticker: '🌸' }): big emoji, no bubble, like WhatsApp.
        const name = showNames
          ? this.text(this.nameOf(it.from), { fontSize: '11px', color: colorOf(it.from), fontStyle: 'bold' })
          : null;
        const st = this.text(it.sticker, { fontSize: '54px' });
        const time = this.text(it.time, { fontSize: '10px', color: '#667781', backgroundColor: '#ffffffcc', padding: { x: 4, y: 1 } });
        objs.push(st, time);
        if (name) objs.push(name);
        const nh = name ? name.height : 0;
        h = nh + st.height + 4;
        if (y - h - 6 < top) { objs.forEach((o) => o.destroy()); break; }
        y -= h + 6;
        if (name) name.setPosition(x + 14, y);
        st.setPosition(x + 14, y + nh);
        time.setOrigin(0, 1).setPosition(x + 14 + st.width + 4, y + h);
      } else {
        const name = showNames
          ? this.text(this.nameOf(it.from), { fontSize: '12px', color: colorOf(it.from), fontStyle: 'bold' })
          : null;
        const body = this.text(it.text, { fontSize: '14px', color: '#111b21', wordWrap: { width: maxBubble - 20 } });
        const time = this.text(it.time, { fontSize: '10px', color: '#667781' });
        objs.push(body, time);
        if (name) objs.push(name);
        const nh = name ? name.height + 2 : 0;
        const bw = Math.min(maxBubble, Math.max(name ? name.width : 0, body.width, time.width + 30) + 20);
        h = 6 + nh + body.height + 2 + time.height + 6;
        if (y - h - 6 < top) { objs.forEach((o) => o.destroy()); break; }
        y -= h + 6;
        const bx = x + 14;
        g.fillStyle(C.bubble, 1).fillRoundedRect(bx, y, bw, h, 8);
        g.fillTriangle(bx - 7, y, bx + 8, y, bx + 8, y + 10); // tail
        if (name) name.setPosition(bx + 10, y + 6);
        body.setPosition(bx + 10, y + 6 + nh);
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
    if (!items.length) {
      this.text('Nessun messaggio', { fontSize: '12px', color: '#667781' }).setOrigin(0.5).setPosition(x + w / 2, (top + bottom) / 2);
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
