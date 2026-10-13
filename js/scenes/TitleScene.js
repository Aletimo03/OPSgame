// js/scenes/TitleScene.js
// Boot screen: "Continua" (if a save exists) or "Nuova partita". Starting a new
// game over an existing save asks for confirmation first. Hands off to
// WorldScene with either the saved position or the start map.
import { questState } from '../story/questState.js';
import { CHAPTERS } from '../story/chapters.js';
import { MAPS, START_MAP } from '../../maps/index.js';
import { loadSave, clearSave, applySave } from '../core/save.js';

const FONT = 'monospace';
const BG_KEY = 'menu-bg';
const BG_PATH = 'assets/menu/OPSentrata.jpg';
const PANEL_ALPHA = 0.72; // dark panel behind the text: lets the photo show through
const PANEL_PAD = 28;

export default class TitleScene extends Phaser.Scene {
  constructor() {
    super('TitleScene');
  }

  preload() {
    if (!this.textures.exists(BG_KEY)) this.load.image(BG_KEY, BG_PATH);
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
    // RESIZE scale mode: re-layout when the window changes size.
    this.scale.on('resize', this.layout, this);
    this.events.once('shutdown', () => this.scale.off('resize', this.layout, this));
  }

  options() {
    if (this.mode === 'confirm') return ['No, torna indietro', 'Sì, cancella e ricomincia'];
    return this.save ? ['Continua', 'Nuova partita'] : ['Nuova partita'];
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
    text(W / 2, H * 0.24 + 56, 'Le indagini di Zio Nick', { fontSize: '20px', color: '#9aa0a8' });

    // What the save holds (or the warning on the confirm screen).
    let info = '';
    if (this.mode === 'confirm') {
      info = 'C\'è già un salvataggio: verrà cancellato.';
    } else if (this.save) {
      const ch = CHAPTERS[this.save.quest.activeChapter];
      const map = MAPS[this.save.mapKey];
      const when = new Date(this.save.savedAt).toLocaleString('it-IT', {
        day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
      });
      info = `${ch ? ch.title : ''}\n${map ? map.name : ''} · salvato ${when}`;
    }
    if (info) {
      text(W / 2, H * 0.45, info, {
        fontSize: '15px',
        color: this.mode === 'confirm' ? '#e05a4a' : '#c8ccd4',
        align: 'center',
      });
    }

    this.options().forEach((label, i) => {
      const selected = i === this.sel;
      text(W / 2, H * 0.58 + i * 44, `${selected ? '▶ ' : '  '}${label}`, {
        fontSize: '24px',
        color: selected ? '#ffd54a' : '#ffffff',
      });
    });

    // Semi-transparent panel only behind the central block (title → options),
    // sized to whatever is shown (with/without Continua, confirm screen).
    const block = this.objs.filter((o) => o.type === 'Text');
    const top = Math.min(...block.map((o) => o.getBounds().top)) - PANEL_PAD;
    const bottom = Math.max(...block.map((o) => o.getBounds().bottom)) + PANEL_PAD;
    const panelW = Math.min(620, W - 32);
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

  update() {
    if (this.leaving) return;
    const J = Phaser.Input.Keyboard.JustDown;
    const n = this.options().length;
    if (J(this.cursors.up)) {
      this.sel = (this.sel + n - 1) % n;
      this.layout();
    } else if (J(this.cursors.down)) {
      this.sel = (this.sel + 1) % n;
      this.layout();
    } else if (J(this.escKey) && this.mode === 'confirm') {
      this.setMode('menu', 1);
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
    if (label === 'Continua') {
      this.startWorld(applySave(this.save));
    } else if (label === 'Nuova partita') {
      if (this.save) this.setMode('confirm');
      else this.newGame();
    } else if (label === 'No, torna indietro') {
      this.setMode('menu', 1);
    } else {
      this.newGame();
    }
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
