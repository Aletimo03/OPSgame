// js/ui/PauseMenu.js
// Esc menu: "Riprendi" or "Ricomincia da capo" (wipes the save, with a confirm
// step). There's no manual save entry — the game autosaves (js/core/save.js).
// While open, movement is frozen (WorldScene.update returns early).

const DEPTH = 3100000; // above the inventory
const PAD = 24;
const FONT = 'monospace';

export class PauseMenu {
  constructor(scene, { onRestart }) {
    this.scene = scene;
    this.onRestart = onRestart;
    this.open = false;
    this.objs = [];
    this.escKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    this.cursors = scene.input.keyboard.createCursorKeys();
  }

  // Call once per frame from WorldScene.update(), BEFORE the inventory.
  // `canOpen` is false while another overlay (bag, dialogue) owns the screen —
  // then Esc is left unread so that overlay can use it. Returns true while the
  // menu is blocking input.
  update(canOpen) {
    const J = Phaser.Input.Keyboard.JustDown;
    if (!this.open) {
      if (canOpen && J(this.escKey)) this.show();
      return this.open;
    }
    if (J(this.escKey)) {
      if (this.mode === 'confirm') this.setMode('menu', 1);
      else this.close();
    } else if (J(this.cursors.up)) {
      this.move(-1);
    } else if (J(this.cursors.down)) {
      this.move(1);
    } else if (J(this.cursors.space)) {
      this.confirm();
    }
    return true; // also true on the frame it closes, so that Space isn't reused
  }

  show() {
    this.open = true;
    this.setMode('menu', 0);
  }

  close() {
    this.open = false;
    this.objs.forEach((o) => o.destroy());
    this.objs = [];
  }

  options() {
    return this.mode === 'confirm'
      ? ['No, torna indietro', 'Sì, cancella e ricomincia']
      : ['Riprendi', 'Ricomincia da capo'];
  }

  setMode(mode, sel) {
    this.mode = mode;
    this.sel = sel;
    this.rebuild();
  }

  move(d) {
    const n = this.options().length;
    this.sel = (this.sel + d + n) % n;
    this.rebuild();
  }

  confirm() {
    if (this.mode === 'menu') {
      if (this.sel === 0) this.close();
      else this.setMode('confirm', 0); // default to the safe "No"
    } else if (this.sel === 0) {
      this.setMode('menu', 1);
    } else {
      this.close();
      this.onRestart();
    }
  }

  rebuild() {
    this.objs.forEach((o) => o.destroy());
    this.objs = [];

    const cam = this.scene.cameras.main;
    const W = cam.width;
    const H = cam.height;
    const confirm = this.mode === 'confirm';
    const panelW = Math.min(440, W - PAD * 4);
    const panelH = 230;
    const px = (W - panelW) / 2;
    const py = (H - panelH) / 2;
    const accent = confirm ? 0xe05a4a : 0xffd54a;

    const add = (o) => {
      o.setScrollFactor(0).setDepth(DEPTH);
      this.objs.push(o);
      return o;
    };
    const text = (x, y, str, style) => add(this.scene.add.text(x, y, str, { fontFamily: FONT, ...style }));

    add(
      this.scene.add
        .rectangle(px, py, panelW, panelH, 0x0d0f17, 0.96)
        .setOrigin(0, 0)
        .setStrokeStyle(3, accent, 0.9)
    );
    text(px + PAD, py + 16, confirm ? '⚠  RICOMINCIARE?' : '⏸  PAUSA', {
      fontSize: '18px',
      color: confirm ? '#e05a4a' : '#ffd54a',
      fontStyle: 'bold',
    });
    text(px + PAD, py + 46, confirm
      ? 'Tutti i progressi salvati andranno persi.'
      : 'Il gioco salva da solo a ogni progresso.', {
      fontSize: '13px',
      color: '#9aa0a8',
      wordWrap: { width: panelW - PAD * 2 },
    });

    this.options().forEach((label, i) => {
      const selected = i === this.sel;
      text(px + PAD, py + 90 + i * 36, `${selected ? '▶ ' : '  '}${label}`, {
        fontSize: '18px',
        color: selected ? '#ffd54a' : '#ffffff',
      });
    });

    text(px + PAD, py + panelH - 30, '↑/↓ scegli · Spazio conferma · Esc indietro', {
      fontSize: '12px',
      color: '#7a8190',
    });
  }
}
