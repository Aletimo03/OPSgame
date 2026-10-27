// js/scenes/TitleScene.js
// Boot screen: "Continua" (if a save exists), "Scegli capitolo" and "Nuova
// partita". Starting a new game over an existing save asks for confirmation
// first. Every start lands in Zio Nick's room (START_MAP). "Scegli capitolo"
// restarts the story from any chapter already reached, resetting what that
// chapter and the later ones gave you (js/story/rewind.js), after a confirm.
import { questState } from '../story/questState.js';
import { CHAPTERS, ORDER } from '../story/chapters.js';
import { START_MAP } from '../../maps/index.js';
import { loadSave, clearSave, applySave } from '../core/save.js';
import { CHARACTERS } from '../core/characters.js';
import { rewindChoices, rewindTo, itemChaptersFrom, devPrime } from '../story/rewind.js';

const FONT = 'monospace';
const BG_KEY = 'menu-bg';
const BG_PATH = 'assets/menu/OPSentrata.jpg';
const PANEL_ALPHA = 0.72; // dark panel behind the text: lets the photo show through
const PANEL_PAD = 28;
// Bouncing heads, like an old screensaver: every character's head drifts
// slowly and bounces off the screen edges and off the menu panel.
const HEAD_IDS = ['zionick', 'ana', 'antonella', 'caue', 'ema', 'ernesto', 'gabbo', 'gaia', 'gatta', 'lilia', 'mari', 'nima', 'sara', 'timo'];
const HEAD_SIZE = 96;              // px on screen
const HEAD_SPEED = [45, 90];       // px/s, random per head

// TEMPORARY test entry on the title menu (remove before release): start ANY
// chapter from a fresh run, as if the earlier ones were played (rewind.devPrime).
const DEV_CHAPTERS = '🛠 DEV · Scegli capitolo';

export default class TitleScene extends Phaser.Scene {
  constructor() {
    super('TitleScene');
  }

  preload() {
    if (!this.textures.exists(BG_KEY)) this.load.image(BG_KEY, BG_PATH);
    // Floating heads (assets/characters/<id>/head.png, cut from the portraits).
    for (const id of HEAD_IDS) {
      if (!this.textures.exists(`head-${id}`)) this.load.image(`head-${id}`, `assets/characters/${id}/head.png`);
    }
    // Character JSONs: which chapter gives which item (chapter select reset).
    for (const folder of CHARACTERS) {
      const k = `${folder}-data`;
      if (!this.cache.json.exists(k)) this.load.json(k, `assets/characters/${folder}/character.json`);
    }
  }

  create() {
    this.save = loadSave();
    this.mode = 'menu'; // 'menu' | 'confirm'
    this.sel = 0;
    this.objs = [];
    this.leaving = false; // set once a choice is made, so a 2nd Space during the fade is ignored
    this.cursors = this.input.keyboard.createCursorKeys();
    this.escKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);

    this.layout();
    this.spawnHeads();
    // RESIZE scale mode: re-layout when the window changes size.
    this.scale.on('resize', this.layout, this);
    this.events.once('shutdown', () => this.scale.off('resize', this.layout, this));
  }

  options() {
    if (this.mode === 'confirm') return ['No, torna indietro', 'Sì, cancella e ricomincia'];
    if (this.mode === 'chapters') return [...this.chapterList().map((id) => CHAPTERS[id].title), 'Indietro'];
    if (this.mode === 'rewind') return ['No, torna indietro', 'Sì, riparti da qui'];
    if (this.mode === 'dev') return [...this.devList().map((id) => CHAPTERS[id].title), 'Indietro'];
    // DEV_CHAPTERS: TEMPORARY test entry (remove before release).
    return this.save ? ['Continua', 'Scegli capitolo', 'Nuova partita', DEV_CHAPTERS] : ['Nuova partita', DEV_CHAPTERS];
  }

  // DEV: every chapter with a quest, in play order.
  devList() {
    return ORDER.filter((id) => CHAPTERS[id]?.quest);
  }

  // Chapters you can restart from (1 … the furthest reached in this save).
  chapterList() {
    if (!this.save) return [];
    questState.restore(this.save.quest);
    return rewindChoices();
  }

  layout() {
    this.objs.forEach((o) => o.destroy());
    this.objs = [];
    const W = this.scale.width;
    const H = this.scale.height;
    const add = (o) => (this.objs.push(o), o);
    const text = (x, y, str, style) =>
      add(this.add.text(x, y, str, { fontFamily: FONT, ...style }).setOrigin(0.5).setDepth(2));

    // Background photo, "cover"-fitted: fills the window, cropped, never stretched.
    if (this.textures.exists(BG_KEY)) {
      const bg = add(this.add.image(W / 2, H / 2, BG_KEY).setDepth(0));
      bg.setScale(Math.max(W / bg.width, H / bg.height));
    }

    text(W / 2, H * 0.24, 'OPSgame', { fontSize: '64px', color: '#ffd54a', fontStyle: 'bold' });
    text(W / 2, H * 0.24 + 56, 'Zio Nick e i due peperoni', { fontSize: '20px', color: '#9aa0a8' });

    // What the save holds (or the warning on the confirm screen).
    let info = '';
    if (this.mode === 'confirm') {
      info = 'C\'è già un salvataggio: verrà cancellato.';
    } else if (this.mode === 'chapters') {
      info = 'Da che capitolo vuoi ripartire?\nSi riparte dalla camera di Zio Nick.';
    } else if (this.mode === 'dev') {
      info = '🛠 DEV: parti da un capitolo qualsiasi, come se i precedenti fossero fatti.\nÈ una partita nuova: il salvataggio attuale viene sovrascritto.';
    } else if (this.mode === 'rewind') {
      info = `Ripartire da «${CHAPTERS[this.rewindId].title}»?\nObiettivi e oggetti di questo capitolo e dei successivi si azzerano.\nCalzini, favori, punti casa, affinità e indizi restano.`;
    } else if (this.save) {
      const ch = CHAPTERS[this.save.quest.activeChapter];
      const when = new Date(this.save.savedAt).toLocaleString('it-IT', {
        day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
      });
      info = `${ch ? ch.title : ''} · salvato ${when}\nSi riparte dalla camera di Zio Nick.`;
    }
    if (info) {
      text(W / 2, H * 0.45, info, {
        fontSize: '15px',
        color: this.mode === 'confirm' || this.mode === 'rewind' || this.mode === 'dev' ? '#e05a4a' : '#c8ccd4',
        align: 'center',
      });
    }

    // The chapter list is long: smaller rows, and a window of at most 7
    // around the selection.
    const opts = this.options();
    const list = this.mode === 'chapters' || this.mode === 'dev';
    const rowH = list ? 30 : 44;
    const maxRows = list ? 7 : opts.length;
    const first = Math.max(0, Math.min(this.sel - Math.floor(maxRows / 2), opts.length - maxRows));
    opts.slice(first, first + maxRows).forEach((label, k) => {
      const i = first + k;
      const selected = i === this.sel;
      text(W / 2, H * 0.58 + k * rowH, `${selected ? '▶ ' : '  '}${label}`, {
        fontSize: list ? '18px' : '24px',
        color: selected ? '#ffd54a' : '#ffffff',
      });
    });

    // Semi-transparent panel only behind the central block (title → options),
    // sized to whatever is shown (with/without Continua, confirm screen).
    const block = this.objs.filter((o) => o.type === 'Text');
    const top = Math.min(...block.map((o) => o.getBounds().top)) - PANEL_PAD;
    const bottom = Math.max(...block.map((o) => o.getBounds().bottom)) + PANEL_PAD;
    const panelW = Math.min(620, W - 32);
    this.panelRect = { x: (W - panelW) / 2, y: top, w: panelW, h: bottom - top }; // heads bounce off it
    add(this.add.graphics().setDepth(1))
      .fillStyle(0x0d0f17, PANEL_ALPHA)
      .fillRoundedRect((W - panelW) / 2, top, panelW, bottom - top, 18)
      .lineStyle(2, 0xffd54a, 0.5)
      .strokeRoundedRect((W - panelW) / 2, top, panelW, bottom - top, 18);

    // Key hint at the bottom, outside the panel: a shadow keeps it readable.
    text(W / 2, H - 40, '↑/↓ scegli · Spazio conferma', {
      fontSize: '13px', color: '#e6e6e6', shadow: { offsetX: 1, offsetY: 1, color: '#000', blur: 4, fill: true },
    });
  }

  // Place every head somewhere free (on screen, off the panel), random direction.
  spawnHeads() {
    const W = this.scale.width;
    const H = this.scale.height;
    const r = HEAD_SIZE / 2;
    this.heads = HEAD_IDS.filter((id) => this.textures.exists(`head-${id}`)).map((id) => {
      let x = W / 2, y = H / 2;
      for (let t = 0; t < 60; t++) {
        x = Phaser.Math.Between(r, Math.max(r, W - r));
        y = Phaser.Math.Between(r, Math.max(r, H - r));
        if (!this.hitsPanel(x, y, r)) break;
      }
      const a = Math.random() * Math.PI * 2;
      const v = Phaser.Math.Between(...HEAD_SPEED);
      const img = this.add.image(x, y, `head-${id}`).setDisplaySize(HEAD_SIZE, HEAD_SIZE).setDepth(0.5);
      return { img, vx: Math.cos(a) * v, vy: Math.sin(a) * v, r };
    });
  }

  // Closest point of the panel to (x, y) → overlap info, or null.
  hitsPanel(x, y, r) {
    const p = this.panelRect;
    if (!p) return null;
    const cx = Phaser.Math.Clamp(x, p.x, p.x + p.w);
    const cy = Phaser.Math.Clamp(y, p.y, p.y + p.h);
    const dx = x - cx, dy = y - cy;
    const d2 = dx * dx + dy * dy;
    if (d2 >= r * r) return null;
    return { cx, cy, dx, dy, d: Math.sqrt(d2) };
  }

  moveHeads(dt) {
    const W = this.scale.width;
    const H = this.scale.height;
    for (const h of this.heads || []) {
      const { img, r } = h;
      img.x += h.vx * dt;
      img.y += h.vy * dt;
      // Screen edges.
      if (img.x < r) { img.x = r; h.vx = Math.abs(h.vx); }
      if (img.x > W - r) { img.x = W - r; h.vx = -Math.abs(h.vx); }
      if (img.y < r) { img.y = r; h.vy = Math.abs(h.vy); }
      if (img.y > H - r) { img.y = H - r; h.vy = -Math.abs(h.vy); }
      // The menu panel: push out along the contact normal and reflect.
      const hit = this.hitsPanel(img.x, img.y, r);
      if (hit) {
        let nx, ny;
        if (hit.d > 0.0001) { nx = hit.dx / hit.d; ny = hit.dy / hit.d; }
        else { // centre inside the panel (e.g. after a resize): leave by the nearest side
          const p = this.panelRect;
          const out = [[-1, 0, img.x - p.x], [1, 0, p.x + p.w - img.x], [0, -1, img.y - p.y], [0, 1, p.y + p.h - img.y]]
            .sort((a, b) => a[2] - b[2])[0];
          [nx, ny] = out;
        }
        img.x = hit.cx + nx * (r + 0.5);
        img.y = hit.cy + ny * (r + 0.5);
        const vn = h.vx * nx + h.vy * ny;
        if (vn < 0) { h.vx -= 2 * vn * nx; h.vy -= 2 * vn * ny; }
      }
    }
  }

  update(time, delta) {
    this.moveHeads(Math.min(delta, 50) / 1000);
    if (this.leaving) return;
    const J = Phaser.Input.Keyboard.JustDown;
    const n = this.options().length;
    if (J(this.cursors.up)) {
      this.sel = (this.sel + n - 1) % n;
      this.layout();
    } else if (J(this.cursors.down)) {
      this.sel = (this.sel + 1) % n;
      this.layout();
    } else if (J(this.escKey) && this.mode !== 'menu') {
      this.setMode('menu', this.mode === 'confirm' ? 2 : this.mode === 'dev' ? (this.save ? 3 : 1) : 1);
    } else if (J(this.cursors.space)) {
      this.choose(this.options()[this.sel]);
    }
  }

  setMode(mode, sel = 0) {
    this.mode = mode;
    this.sel = sel;
    this.layout();
  }

  choose(label) {
    if (this.mode === 'dev') {
      const id = this.devList()[this.sel];
      if (!id) return this.setMode('menu', this.save ? 3 : 1); // "Indietro"
      return this.devJump(id);
    }
    if (this.mode === 'chapters') {
      const id = this.chapterList()[this.sel];
      if (!id) return this.setMode('menu', 1); // "Indietro"
      this.rewindId = id;
      return this.setMode('rewind');
    }
    if (this.mode === 'rewind') {
      if (label === 'Sì, riparti da qui') return this.restartFrom(this.rewindId);
      return this.setMode('chapters', Math.max(0, this.chapterList().indexOf(this.rewindId)));
    }
    if (label === DEV_CHAPTERS) {
      this.setMode('dev');
    } else if (label === 'Continua') {
      this.startWorld(applySave(this.save));
    } else if (label === 'Scegli capitolo') {
      const list = this.chapterList();
      this.setMode('chapters', Math.max(0, list.indexOf(this.save.quest.activeChapter)));
    } else if (label === 'Nuova partita') {
      if (this.save) this.setMode('confirm');
      else this.newGame();
    } else if (label === 'No, torna indietro') {
      this.setMode('menu', 2);
    } else {
      this.newGame();
    }
  }

  // Load the save, rewind the story to `id`, start in Zio Nick's room.
  restartFrom(id) {
    const data = Object.fromEntries(CHARACTERS.map((f) => [f, this.cache.json.get(`${f}-data`)]));
    applySave(this.save);
    rewindTo(id, itemChaptersFrom(data));
    this.startWorld({ mapKey: START_MAP, spawnName: 'default' });
  }

  // TEMPORARY (testing): a fresh run starting at chapter `id`, earlier
  // chapters counted as done, in the chapter's `devStart` spot. Remove with
  // DEV_CHAPTERS.
  devJump(id) {
    const data = Object.fromEntries(CHARACTERS.map((f) => [f, this.cache.json.get(`${f}-data`)]));
    clearSave();
    devPrime(id, data);
    this.startWorld(CHAPTERS[id].devStart || { mapKey: START_MAP, spawnName: 'default' });
  }

  newGame() {
    clearSave();
    questState.reset();
    this.startWorld({ mapKey: START_MAP, spawnName: 'default' });
  }

  startWorld(data) {
    this.leaving = true;
    this.cameras.main.fadeOut(200);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('WorldScene', data));
  }
}
