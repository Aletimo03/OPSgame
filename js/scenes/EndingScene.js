// js/scenes/EndingScene.js
// Shown once, over a paused WorldScene, when the last chapter's quest is done
// (WorldScene.onProgress → showEnding). Credits + run stats; Space goes back
// to the house so the player can keep exploring (the save keeps the story
// finished, and the flag 'ending-seen' stops it from showing again).
import { questState } from '../story/questState.js';
import { CHAPTERS } from '../story/chapters.js';
import { CHARACTERS, getCharData } from '../core/characters.js';
import { PLAYER } from '../config.js';
import { collectionStatus } from '../story/collectibles.js';

const FONT = 'monospace';

// "1h 05m 09s" / "12m 03s"
function formatTime(ms) {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const pad = (n) => String(n).padStart(2, '0');
  return h ? `${h}h ${pad(m)}m ${pad(s % 60)}s` : `${m}m ${pad(s % 60)}s`;
}

export default class EndingScene extends Phaser.Scene {
  constructor() {
    super('EndingScene');
  }

  init(data) {
    this.returnScene = data.returnScene || 'WorldScene';
  }

  create() {
    const W = this.scale.width;
    const H = this.scale.height;
    const st = questState.stats;
    const world = this.scene.get(this.returnScene);
    const cast = CHARACTERS.map((c) => getCharData(world, c).name || c).join(' · ');
    const collected = questState.items.length + Object.keys(questState.supplies).length;

    this.add.rectangle(0, 0, W, H, 0x05060a, 0.97).setOrigin(0, 0);
    const lines = [
      ['FINE', { fontSize: '56px', color: '#ffd54a', fontStyle: 'bold' }, 70],
      ['OPSgame — Zio Nick e i due peperoni', { fontSize: '20px', color: '#c8ccd4' }, 50],
      ['🌶️🌶️  Il chili è servito, i peperoni sono tornati a casa', { fontSize: '18px', color: '#ffd54a' }, 26],
      [`${Object.keys(CHAPTERS).length} capitoli completati`, { fontSize: '18px', color: '#7CFC8A' }, 40],
      [`Tempo di gioco   ${formatTime(st.playMs)}`, { fontSize: '16px', color: '#ffffff' }, 26],
      [`Scontri vinti    ${st.wins}`, { fontSize: '16px', color: '#ffffff' }, 26],
      [`Scontri persi    ${st.losses}`, { fontSize: '16px', color: '#ffffff' }, 26],
      [`Oggetti raccolti ${collected}`, { fontSize: '16px', color: '#ffffff' }, 26],
      ...Object.values(collectionStatus()).map((c) =>
        [`${c.plural.padEnd(16)} ${c.found}/${c.total}`, { fontSize: '16px', color: '#ffffff' }, 26]),
      ['', { fontSize: '4px' }, 20],
      [`Con ${PLAYER.NAME} e`, { fontSize: '14px', color: '#9aa0a8' }, 22],
      [cast, { fontSize: '14px', color: '#9aa0a8', align: 'center', wordWrap: { width: W - 80 } }, 50],
      ['Grazie per aver giocato!', { fontSize: '20px', color: '#ffd54a' }, 60],
      ['Spazio — torna in casa', { fontSize: '13px', color: '#7a8190' }, 0],
    ];

    // Stack the lines, then centre the block vertically and fade each one in.
    const objs = [];
    let y = 0;
    for (const [str, style, gap] of lines) {
      const t = this.add.text(W / 2, y, str, { fontFamily: FONT, ...style }).setOrigin(0.5, 0).setAlpha(0);
      objs.push(t);
      y += t.height + gap * 0.4;
    }
    const top = Math.max(20, (H - y) / 2);
    objs.forEach((t, i) => {
      t.y += top;
      this.tweens.add({ targets: t, alpha: 1, duration: 600, delay: 300 + i * 250 });
    });

    this.ready = false; // ignore Space until everything has faded in
    this.time.delayedCall(300 + lines.length * 250 + 600, () => (this.ready = true));
    this.space = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
  }

  update() {
    if (!this.ready || !Phaser.Input.Keyboard.JustDown(this.space)) return;
    const world = this.scene.get(this.returnScene);
    if (world) world.spaceGuard = true; // the closing Space must not talk to anyone
    this.scene.resume(this.returnScene);
    this.scene.stop();
  }
}
