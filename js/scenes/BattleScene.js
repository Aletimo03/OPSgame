// js/scenes/BattleScene.js
// A turn-based fight drawn like a Pokémon battle (Gen 4/5): a backdrop chosen
// by the place the fight happens in, the enemy (front view) on a far platform
// top-right, Zio Nick (back view) on a near platform bottom-left, cream HP
// boxes, a text box at the bottom with LOTTA / ZAINO, then the four moves
// with their PP. The rules (damage, accuracy, statuses, arrest) are in
// js/core/battleRules.js; this file draws and sequences them.
// Launched over a PAUSED WorldScene, which it resumes on exit.
import { PLAYER } from '../config.js';
import { questState } from '../story/questState.js';
import { baseStats } from '../core/characters.js';
import { advanceChapterIfDone } from '../story/chapters.js';
import { loadAudio, attachAudio } from '../core/audio.js';
import { sliceSheet, idleFrame } from '../core/playerSprite.js';
import { clockNow, nightAlpha } from '../story/clock.js';
import {
  STATUS, MUST_LOSE_FLOOR, power, accuracy, maxPp, canArrest, rollHit, rollStatus, enemyPick,
} from '../core/battleRules.js';

// Fallback moves if the protagonist's character.json defines none.
const DEFAULT_MOVES = [{ name: 'Spinta', power: 7, acc: 95, pp: 25 }];

// Optional art per backdrop: { kitchen: 'assets/battle/kitchen.png', … }. A
// listed image replaces the drawn wall + floor (cover-fitted); the platforms
// are still drawn on top. Empty until the user supplies pictures.
const BACKDROP_IMAGES = {};

const FONT = 'monospace';
const TYPE_MS = 18;           // typewriter speed
const BEAT_MS = 60000 / 121.35; // the party lights pulse on the Alcatraz track's beat
const D = { bg: 0, fx: 1, base: 2, sprite: 3, box: 10, text: 11, top: 20 };
const C = {
  box: 0xf8f8e8, boxEdge: 0x404850, boxShade: 0xc8c8b0,
  text: '#303030', shadow: '#d0d0c8',
  hpLabel: 0xe8a830, hpBack: 0x505860,
  green: 0x58d878, yellow: 0xf8c830, red: 0xf05040,
  frame: 0x2c3a52, panel: 0xfafafa, panelEdge: 0x5a6e92,
};

export default class BattleScene extends Phaser.Scene {
  constructor() {
    super('BattleScene');
  }

  init(data) {
    this.enemyKey = data.enemyKey || 'gabbo';
    this.enemyChar = data.enemyChar || this.enemyKey; // character.json folder
    this.enemyName = data.enemyName || 'Gabbo';
    this.heroName = data.heroName || PLAYER.NAME;
    this.heroKey = data.heroKey || PLAYER.SPRITE_KEY;
    this.heroChar = data.heroChar || PLAYER.SPRITE_KEY;
    this.returnScene = data.returnScene || 'WorldScene';
    this.chapter = data.chapter || questState.activeChapter; // a win is credited to it
    this.env = data.env || 'corridor';
    // Per-battle overrides from the JSON battle block (`stats`, `moves`).
    this.statsOverride = data.enemyStats || null;
    this.movesOverride = data.enemyMoves || null;
    // A fight lost by the script (chapter 1, Gabbo): he can't be brought
    // below MUST_LOSE_FLOOR of his HP, no arrest works, his hits take a
    // third of your HP, and you say `lossLine` as you go down.
    this.mustLose = !!data.mustLose;
    this.lossLine = data.lossLine || null;
  }

  preload() {
    loadAudio(this);
    const img = BACKDROP_IMAGES[this.env];
    if (img && !this.textures.exists(`battle-bg-${this.env}`)) this.load.image(`battle-bg-${this.env}`, img);
  }

  create() {
    const world = this.scene.get(this.returnScene);
    if (world?.audio?.music?.isPlaying && this.env !== 'party' && this.env !== 'club') world.audio.music.pause();
    attachAudio(this);
    this.audio.playSceneMusic();

    // Stats and moves.
    const heroData = this.cache.json.get(`${this.heroChar}-data`) || {};
    const enemyData = this.cache.json.get(`${this.enemyChar}-data`) || {};
    this.heroStats = questState.heroStats(baseStats(heroData));
    this.enemyStats = { ...baseStats(enemyData), ...(this.statsOverride || {}) };
    this.moves = (heroData.moves?.length ? heroData.moves : DEFAULT_MOVES).slice(0, 4);
    this.pp = this.moves.map((m) => maxPp(m));
    this.enemyMoves = this.movesOverride || (Array.isArray(enemyData.moves) ? enemyData.moves : []);
    this.heroStatus = {};
    this.enemyStatus = {};
    this.enemyHp = this.enemyMax = this.enemyStats.maxHp;
    this.heroMax = this.heroStats.maxHp;
    this.heroHp = questState.currentHp(this.heroMax);
    this.shown = { hero: this.heroHp, enemy: this.enemyHp }; // what the bars show (they drain)

    this.mode = 'intro'; // intro | steps | command | fight | bag | end
    this.sel = 0;
    this.steps = [];
    this.pendingEnd = null;
    this.inputLocked = true;
    this.keys = this.input.keyboard.addKeys({
      up: 'UP', down: 'DOWN', left: 'LEFT', right: 'RIGHT', w: 'W', s: 'S', a: 'A', d: 'D',
      space: 'SPACE', enter: 'ENTER', esc: 'ESC', back: 'BACKSPACE', x: 'X',
    });

    this.layout();
    this.intro();
  }

  // ── layout ────────────────────────────────────────────────────────────────
  layout() {
    const W = this.scale.width;
    const H = this.scale.height;
    this.W = W; this.H = H;
    this.boxH = Math.round(Phaser.Math.Clamp(H * 0.25, 150, 230));
    this.A = H - this.boxH; // the arena's height (above the text box)
    const A = this.A;
    this.horizon = A * 0.5;

    this.drawBackdrop();

    // Platforms (ellipses of floor, lighter in the middle, like Pokémon's).
    this.enemyBase = { x: W * 0.72, y: A * 0.62, rx: Math.min(W * 0.17, 260), ry: A * 0.075 };
    this.heroBase = { x: W * 0.25, y: A * 0.98, rx: Math.min(W * 0.25, 380), ry: A * 0.1 };
    this.enemyPlat = this.drawPlatform(this.enemyBase);
    this.heroPlat = this.drawPlatform(this.heroBase);

    // Fighters: the big portraits, the same as in a conversation (user's
    // choice, 2026-11-11); the walk sheet's idle frame only as a fallback.
    // Zio Nick stands in front, his legs hidden by the text box.
    this.enemy = this.fighter(this.enemyKey, 'down', A * 0.62);
    this.enemy.setPosition(this.enemyBase.x, this.enemyBase.y + this.enemyBase.ry * 0.35);
    this.hero = this.fighter(this.heroKey, 'up', A * 0.86);
    this.hero.setPosition(this.heroBase.x, this.A + this.boxH * 0.22);
    this.enemyShadow = this.add.ellipse(this.enemy.x, this.enemyBase.y + this.enemyBase.ry * 0.2,
      this.enemy.displayWidth * 0.7, this.enemyBase.ry * 0.8, 0x000000, 0.22).setDepth(D.base);
    this.home = { enemy: { x: this.enemy.x, y: this.enemy.y }, hero: { x: this.hero.x, y: this.hero.y } };

    // HP boxes.
    const bw = Math.min(400, W * 0.4);
    this.enemyBox = this.hpBox(W * 0.05, A * 0.08, bw, false, this.enemyName);
    this.heroBox = this.hpBox(W - bw - W * 0.05, A * 0.62, bw, true, this.heroName);

    // Bottom: frame + message panel + command panel + moves panel.
    const y0 = this.A;
    this.add.rectangle(0, y0, W, this.boxH, C.frame).setOrigin(0, 0).setDepth(D.box);
    this.msgPanel = this.add.graphics().setDepth(D.box);
    this.msg = this.add.text(0, 0, '', this.textStyle(Math.round(this.boxH * 0.15))).setDepth(D.text);
    this.cmdPanel = this.add.graphics().setDepth(D.box);
    this.cmdTexts = [];
    this.movePanel = this.add.graphics().setDepth(D.box);
    this.moveTexts = [];
    this.infoText = this.add.text(0, 0, '', this.textStyle(Math.round(this.boxH * 0.11))).setDepth(D.text);
    this.hint = this.add.text(W - 12, H - 8, '', { fontFamily: FONT, fontSize: '13px', color: '#9fb0cc' })
      .setOrigin(1, 1).setDepth(D.text);
    this.arrow = this.add.text(0, 0, '▼', { fontFamily: FONT, fontSize: '18px', color: '#e05040' })
      .setDepth(D.text).setVisible(false);
    this.tweens.add({ targets: this.arrow, alpha: 0.2, duration: 380, yoyo: true, repeat: -1 });

    this.updateBars();
    this.renderPanels();
  }

  textStyle(size) {
    return {
      fontFamily: FONT, fontSize: `${size}px`, color: C.text, fontStyle: 'bold',
      shadow: { offsetX: 2, offsetY: 2, color: C.shadow, fill: true },
      lineSpacing: Math.round(size * 0.35),
    };
  }

  fighter(key, facing, targetH) {
    const portrait = `${key}-portrait`;
    const tex = this.textures.exists(portrait) ? portrait : key;
    let frame;
    if (tex === key && this.textures.exists(key)) {
      sliceSheet(this, key);
      frame = idleFrame(facing);
    }
    const img = this.add.image(0, 0, tex, frame).setOrigin(0.5, 1).setDepth(D.sprite);
    img.setScale(targetH / img.height);
    img.baseScale = img.scaleX;
    return img;
  }

  // ── backdrops (drawn in code; BACKDROP_IMAGES can replace them) ────────────
  drawBackdrop() {
    const { W, H, A, horizon: hy } = this;
    const g = this.add.graphics().setDepth(D.bg);
    const env = this.env;
    const look = {
      kitchen: { wall: [0xf2f3f5, 0xdfe2e6], floor: 0xb1b3b6, line: 0x8e9196, plat: 0xd0d2d5, rim: 0x86898e },
      party: { wall: [0xf2f3f5, 0xdfe2e6], floor: 0xb1b3b6, line: 0x8e9196, plat: 0xd0d2d5, rim: 0x86898e },
      corridor: { wall: [0xf6f6f4, 0xe6e6e2], floor: 0x7d8084, line: 0x5e6165, plat: 0x9a9da1, rim: 0x55585c },
      room: { wall: [0xf1ece2, 0xe0d8ca], floor: 0xb1b3b6, line: 0x8e9196, plat: 0xc9b89a, rim: 0x8a7656 },
      bathroom: { wall: [0xeef5f8, 0xd9e6ec], floor: 0xc6ced2, line: 0x98a4aa, plat: 0xdde5e8, rim: 0x8c989e },
      club: { wall: [0x07050d, 0x1d1034], floor: 0x16111d, line: 0x2c2238, plat: 0x2a1f36, rim: 0xff4fd8 },
      dream: { wall: [0x05030a, 0x26133d], floor: 0x110b1a, line: 0x221833, plat: 0x2a1c40, rim: 0x9a6bff },
    }[env] || {};
    this.look = look;

    const imgKey = `battle-bg-${env}`;
    if (this.textures.exists(imgKey)) {
      const img = this.add.image(W / 2, A / 2, imgKey).setDepth(D.bg);
      img.setScale(Math.max(W / img.width, A / img.height));
      this.add.rectangle(0, A, W, H - A, look.floor ?? 0x777777).setOrigin(0, 0).setDepth(D.bg);
      return;
    }

    // Wall.
    g.fillGradientStyle(look.wall[0], look.wall[0], look.wall[1], look.wall[1], 1);
    g.fillRect(0, 0, W, hy);
    // Floor with perspective tiles.
    g.fillStyle(look.floor, 1);
    g.fillRect(0, hy, W, H - hy);
    g.lineStyle(2, look.line, 0.45);
    for (let i = 1; i <= 9; i++) {
      const t = i / 9;
      const y = hy + (H - hy) * t * t;
      g.lineBetween(0, y, W, y);
    }
    for (let i = -8; i <= 8; i++) {
      const x0 = W / 2 + i * W * 0.09;
      g.lineBetween(x0, hy, W / 2 + (x0 - W / 2) * 3.2, H);
    }

    const dark = env === 'club' || env === 'dream';
    if (!dark) {
      // Skirting board.
      g.fillStyle(0x9a9ca0, 1).fillRect(0, hy - 8, W, 8);
      g.fillStyle(0xffffff, 0.5).fillRect(0, hy - 8, W, 2);
    }
    ({
      kitchen: () => this.drawKitchen(g),
      party: () => this.drawKitchen(g),
      corridor: () => this.drawCorridor(g),
      room: () => this.drawRoom(g),
      bathroom: () => this.drawBathroom(g),
      club: () => this.drawClub(g),
      dream: () => this.drawDream(g),
    }[env] || (() => {}))();

    if (env === 'party') this.drawParty();
    // Night outside the party / club / dream: the world's own veil, a bit lighter.
    if (!dark && env !== 'party') {
      const a = nightAlpha(clockNow()) * 0.7;
      if (a > 0.01) this.add.rectangle(0, 0, W, A, 0x0b1030, a).setOrigin(0, 0).setDepth(D.fx);
    }
  }

  drawKitchen(g) {
    const { W, A, horizon: hy } = this;
    // Upper cabinets (dark grey, like the real ones) along the left two thirds.
    const ux0 = W * 0.04, ux1 = W * 0.64, uy0 = A * 0.05, uy1 = A * 0.2;
    g.fillStyle(0x3a3d42, 1).fillRect(ux0, uy0, ux1 - ux0, uy1 - uy0);
    g.lineStyle(2, 0x55595f, 1);
    const n = 6;
    for (let i = 1; i < n; i++) g.lineBetween(ux0 + (ux1 - ux0) * i / n, uy0, ux0 + (ux1 - ux0) * i / n, uy1);
    g.fillStyle(0x1f2124, 1).fillRect(ux0, uy1, ux1 - ux0, 6);
    // Lower cabinets + worktop.
    const ly0 = hy - A * 0.17;
    g.fillStyle(0xf9f9f9, 1).fillRect(ux0, ly0, ux1 - ux0, hy - 8 - ly0);
    g.lineStyle(2, 0xc7c9cc, 1);
    for (let i = 1; i < n; i++) g.lineBetween(ux0 + (ux1 - ux0) * i / n, ly0 + 10, ux0 + (ux1 - ux0) * i / n, hy - 8);
    g.fillStyle(0x8c9097, 1).fillRect(ux0 - 6, ly0 - 10, ux1 - ux0 + 12, 12);
    // Hob on the worktop, kettle.
    g.fillStyle(0x222428, 1).fillRect(ux0 + (ux1 - ux0) * 0.38, ly0 - 13, (ux1 - ux0) * 0.18, 4);
    g.fillStyle(0xbfc3c8, 1).fillCircle(ux0 + (ux1 - ux0) * 0.8, ly0 - 24, 13);
    // Tall fridge on the right.
    const fx0 = W * 0.76, fx1 = W * 0.9, fy0 = A * 0.06;
    g.fillStyle(0xdfe3e8, 1).fillRect(fx0, fy0, fx1 - fx0, hy - 8 - fy0);
    g.lineStyle(2, 0xb7bdc4, 1).strokeRect(fx0, fy0, fx1 - fx0, hy - 8 - fy0);
    g.lineBetween(fx0, fy0 + (hy - fy0) * 0.38, fx1, fy0 + (hy - fy0) * 0.38);
    g.fillStyle(0x9aa1a9, 1).fillRect(fx0 + 10, fy0 + 20, 6, A * 0.08).fillRect(fx0 + 10, fy0 + (hy - fy0) * 0.45, 6, A * 0.1);
  }

  drawCorridor(g) {
    const { W, A, horizon: hy } = this;
    // Two room doors with their frames and numbers, round wall lamps (like the house).
    const doors = [[W * 0.2, '12'], [W * 0.62, '20']];
    for (const [x, num] of doors) {
      const dw = W * 0.12, dh = (hy - 8) - A * 0.08;
      const top = hy - 8 - dh;
      g.fillStyle(0xd9dad3, 1).fillRect(x - 8, top - 8, dw + 16, dh + 8);
      g.fillStyle(0xe9e9e3, 1).fillRect(x, top, dw, dh);
      g.fillStyle(0x8b9096, 1).fillRect(x + dw * 0.78, top + dh * 0.55, dw * 0.14, 5);
      this.add.text(x + dw * 0.62, top + dh * 0.12, num, {
        fontFamily: 'Helvetica, Arial, sans-serif', fontSize: `${Math.round(dh * 0.16)}px`, color: '#3f5a73',
      }).setOrigin(0.5, 0).setDepth(D.bg);
    }
    for (const x of [W * 0.42, W * 0.48]) {
      g.fillStyle(0xb08d57, 1).fillCircle(x, A * 0.2, 17);
      g.fillStyle(0xfdfbf2, 1).fillCircle(x, A * 0.2, 11);
      g.lineStyle(2, 0x222222, 0.8).lineBetween(x, A * 0.2 + 17, x + 4, hy - 10);
    }
    // Cork board.
    g.fillStyle(0xb98a52, 1).fillRect(W * 0.86, A * 0.14, W * 0.12, A * 0.17);
    g.fillStyle(0xffffff, 0.9).fillRect(W * 0.88, A * 0.17, W * 0.03, A * 0.08);
  }

  drawRoom(g) {
    const { W, A, horizon: hy } = this;
    const night = nightAlpha(clockNow()) > 0.2;
    const x0 = W * 0.36, x1 = W * 0.64, y0 = A * 0.07, y1 = hy - A * 0.1;
    g.fillGradientStyle(night ? 0x0d1738 : 0x7ec3f0, night ? 0x0d1738 : 0x7ec3f0, night ? 0x24345e : 0xcfe9fb, night ? 0x24345e : 0xcfe9fb, 1);
    g.fillRect(x0, y0, x1 - x0, y1 - y0);
    g.lineStyle(8, 0xffffff, 1).strokeRect(x0, y0, x1 - x0, y1 - y0);
    g.lineStyle(5, 0xffffff, 1).lineBetween((x0 + x1) / 2, y0, (x0 + x1) / 2, y1);
    g.fillStyle(0x6f8fb0, 0.85).fillRect(x0 - W * 0.05, y0 - 10, W * 0.05, y1 - y0 + 30).fillRect(x1, y0 - 10, W * 0.05, y1 - y0 + 30);
    // Bed edge on the left, poster on the right.
    g.fillStyle(0x50607a, 1).fillRect(0, hy - A * 0.12, W * 0.2, A * 0.12);
    g.fillStyle(0xf3f3f3, 1).fillRect(0, hy - A * 0.15, W * 0.2, A * 0.04);
    g.fillStyle(0x2d2d48, 1).fillRect(W * 0.78, A * 0.12, W * 0.1, A * 0.18);
    g.fillStyle(0xffd54a, 1).fillCircle(W * 0.83, A * 0.19, A * 0.035);
  }

  drawBathroom(g) {
    const { W, horizon: hy } = this;
    g.lineStyle(2, 0xc3d2d8, 1);
    const s = 46;
    for (let y = s; y < hy - 8; y += s) g.lineBetween(0, y, W, y);
    for (let x = s; x < W; x += s) g.lineBetween(x, 0, x, hy - 8);
  }

  drawClub(g) {
    const { W, A } = this;
    for (const [x, col] of [[0.15, 0xff4fd8], [0.38, 0x4fd8ff], [0.62, 0xffe14f], [0.85, 0x7cff6b]]) {
      const beam = this.add.triangle(0, 0, W * x, 0, W * x - W * 0.12, A, W * x + W * 0.12, A, col, 0.16)
        .setOrigin(0, 0).setDepth(D.fx).setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({ targets: beam, alpha: 0.04, duration: BEAT_MS * 2, yoyo: true, repeat: -1, delay: x * 900 });
    }
    g.fillStyle(0x3a1d4a, 1).fillRect(0, this.horizon - 14, W, 14);
  }

  drawDream(g) {
    const { W, A } = this;
    for (let i = 0; i < 7; i++) {
      const fog = this.add.ellipse(Math.random() * W, A * (0.2 + Math.random() * 0.6), W * 0.4, A * 0.12, 0x9a7cc8, 0.07)
        .setDepth(D.fx);
      this.tweens.add({ targets: fog, x: fog.x + (Math.random() < 0.5 ? -1 : 1) * W * 0.2, duration: 6000 + i * 700, yoyo: true, repeat: -1 });
    }
    g.fillStyle(0x000000, 0.25).fillRect(0, 0, W, A * 0.15);
  }

  // The prologue's party: the kitchen in the dark, coloured light pools
  // drifting and pulsing on the beat, and a disco ball.
  drawParty() {
    const { W, A } = this;
    this.add.rectangle(0, 0, W, this.H, 0x0a0620, 0.72).setOrigin(0, 0).setDepth(D.fx);
    const cols = [0xff4fd8, 0x4fd8ff, 0xffe14f, 0x7cff6b, 0xff7a3c, 0x9a6bff];
    for (let i = 0; i < 16; i++) {
      const c = this.add.circle(Math.random() * W, Math.random() * A, 50 + Math.random() * 70, cols[i % cols.length], 0.3)
        .setDepth(D.fx).setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({ targets: c, x: Math.random() * W, y: Math.random() * A, duration: 2500 + Math.random() * 2500, yoyo: true, repeat: -1 });
      this.tweens.add({ targets: c, alpha: 0.12, duration: BEAT_MS / 2, yoyo: true, repeat: -1, delay: (i % 2) * BEAT_MS / 2 });
    }
    const bx = W * 0.5, by = A * 0.1, r = Math.max(22, A * 0.05);
    this.add.line(0, 0, bx, 0, bx, by - r, 0x888888).setOrigin(0, 0).setDepth(D.fx);
    const ball = this.add.circle(bx, by, r, 0xd8dde6).setDepth(D.fx);
    const gl = this.add.graphics().setDepth(D.fx);
    gl.lineStyle(1, 0x6b7280, 0.8);
    for (let k = -2; k <= 2; k++) { gl.lineBetween(bx - r, by + k * r / 3, bx + r, by + k * r / 3); gl.lineBetween(bx + k * r / 3, by - r, bx + k * r / 3, by + r); }
    this.tweens.add({ targets: ball, scale: 1.06, duration: BEAT_MS / 2, yoyo: true, repeat: -1 });
  }

  drawPlatform(b) {
    const g = this.add.graphics().setDepth(D.base);
    const L = this.look;
    g.fillStyle(L.rim ?? 0x777777, 1).fillEllipse(b.x, b.y + 4, b.rx * 2, b.ry * 2);
    g.fillStyle(L.plat ?? 0xaaaaaa, 1).fillEllipse(b.x, b.y, b.rx * 2, b.ry * 2);
    g.fillStyle(0xffffff, 0.16).fillEllipse(b.x, b.y - b.ry * 0.15, b.rx * 1.4, b.ry * 1.2);
    if (this.env === 'party') g.setAlpha(0.6);
    return g;
  }

  // ── HP boxes ──────────────────────────────────────────────────────────────
  hpBox(x, y, w, isHero, name) {
    const h = isHero ? 92 : 70;
    const g = this.add.graphics().setDepth(D.box);
    g.fillStyle(C.boxEdge, 1).fillRoundedRect(x, y, w, h, 14);
    g.fillStyle(C.box, 1).fillRoundedRect(x + 4, y + 4, w - 8, h - 8, 11);
    g.fillStyle(C.boxShade, 1).fillRect(x + 14, y + h - 12, w - 28, 3);
    const label = this.add.text(x + 18, y + 10, name, this.textStyle(22)).setDepth(D.text);
    const tag = this.add.text(x + w - 18, y + 12, '', {
      fontFamily: FONT, fontSize: '15px', color: '#ffffff', fontStyle: 'bold', padding: { x: 5, y: 2 },
    }).setOrigin(1, 0).setDepth(D.text);
    const bar = this.add.graphics().setDepth(D.text);
    const nums = isHero ? this.add.text(x + w - 22, y + 58, '', this.textStyle(19)).setOrigin(1, 0).setDepth(D.text) : null;
    const parts = [g, label, tag, bar, nums].filter(Boolean);
    return { x, y, w, h, isHero, g, label, tag, bar, nums, parts };
  }

  updateBars() {
    const draw = (box, hp, max, status) => {
      const { x, y, w, bar } = box;
      const bx = x + 70, by = y + 44, bw = w - 70 - 22;
      bar.clear();
      bar.fillStyle(C.hpBack, 1).fillRoundedRect(x + 18, by - 4, bw + 56, 16, 8);
      bar.fillStyle(C.hpLabel, 1).fillRoundedRect(x + 22, by - 2, 40, 12, 5);
      const frac = Phaser.Math.Clamp(hp / max, 0, 1);
      bar.fillStyle(0x283038, 1).fillRect(bx, by, bw, 8);
      bar.fillStyle(frac > 0.5 ? C.green : frac > 0.2 ? C.yellow : C.red, 1).fillRect(bx, by, bw * frac, 8);
      bar.fillStyle(0xffffff, 0.35).fillRect(bx, by, bw * frac, 3);
      if (!box.hpLabel) {
        box.hpLabel = this.add.text(x + 42, by + 4, 'HP', { fontFamily: FONT, fontSize: '11px', color: '#ffffff', fontStyle: 'bold' })
          .setOrigin(0.5).setDepth(D.text + 1);
        box.parts.push(box.hpLabel);
      }
      if (box.nums) box.nums.setText(`${Math.ceil(hp)}/${max}`);
      const st = Object.keys(STATUS).find((k) => status[k] > 0);
      box.tag.setText(st ? STATUS[st].tag : '');
      box.tag.setBackgroundColor(st ? `#${STATUS[st].colour.toString(16).padStart(6, '0')}` : 'rgba(0,0,0,0)');
    };
    draw(this.enemyBox, this.shown.enemy, this.enemyMax, this.enemyStatus);
    draw(this.heroBox, this.shown.hero, this.heroMax, this.heroStatus);
  }

  // ── bottom panels ─────────────────────────────────────────────────────────
  renderPanels() {
    const { W, A, boxH } = this;
    const pad = 10;
    const cmd = this.mode === 'command';
    const fight = this.mode === 'fight';
    const bag = this.mode === 'bag';

    // The message panel: full width, or the left part beside the commands.
    const mw = cmd ? W * 0.56 : W;
    this.msgPanel.clear();
    if (!fight) {
      this.msgPanel.fillStyle(C.panelEdge, 1).fillRoundedRect(pad, A + pad, mw - pad * 2, boxH - pad * 2, 12);
      this.msgPanel.fillStyle(C.panel, 1).fillRoundedRect(pad + 5, A + pad + 5, mw - pad * 2 - 10, boxH - pad * 2 - 10, 9);
    }
    this.msg.setPosition(pad + 26, A + pad + 20).setWordWrapWidth(mw - pad * 2 - 52).setVisible(!fight);

    // LOTTA / ZAINO.
    this.cmdPanel.clear();
    this.cmdTexts.forEach((t) => t.destroy());
    this.cmdTexts = [];
    if (cmd) {
      const x0 = W * 0.56, cw = (W - x0 - pad * 3) / 2, ch = boxH - pad * 4;
      [['LOTTA', 0xe0503c, 0xb33a2a], ['ZAINO', 0xe8b830, 0xb88c18]].forEach(([label, c1, c2], i) => {
        const x = x0 + pad + i * (cw + pad), y = A + pad * 2;
        const on = this.sel === i;
        this.cmdPanel.fillStyle(on ? 0xffffff : c2, 1).fillRoundedRect(x - 3, y - 3, cw + 6, ch + 6, 14);
        this.cmdPanel.fillStyle(c1, 1).fillRoundedRect(x, y, cw, ch, 12);
        this.cmdPanel.fillStyle(0xffffff, 0.18).fillRoundedRect(x + 6, y + 6, cw - 12, ch * 0.35, 8);
        this.cmdTexts.push(this.add.text(x + cw / 2, y + ch / 2, label, {
          fontFamily: FONT, fontSize: `${Math.round(boxH * 0.17)}px`, color: '#ffffff', fontStyle: 'bold',
          stroke: '#00000055', strokeThickness: 4,
        }).setOrigin(0.5).setDepth(D.text));
      });
    }

    // The moves (2 × 2) + PP / info, or the bag's list.
    this.movePanel.clear();
    this.moveTexts.forEach((t) => t.destroy());
    this.moveTexts = [];
    this.infoText.setVisible(false);
    if (fight) {
      const gw = W * 0.7, cw = (gw - pad * 3) / 2, ch = (boxH - pad * 3) / 2;
      this.moves.forEach((m, i) => {
        const x = pad + (i % 2) * (cw + pad), y = A + pad + Math.floor(i / 2) * (ch + pad);
        const on = this.sel === i;
        const off = this.pp[i] <= 0 || (m.arrest && !canArrest(m, this.enemyHp, this.enemyMax, this.mustLose));
        const col = m.arrest ? 0x3d6fd6 : m.status && !power(m) ? 0x9a5bd0 : 0xe06a3c;
        this.movePanel.fillStyle(on ? 0xffffff : 0x1b2536, 1).fillRoundedRect(x - 3, y - 3, cw + 6, ch + 6, 12);
        this.movePanel.fillStyle(off ? 0x7b818c : col, 1).fillRoundedRect(x, y, cw, ch, 10);
        this.movePanel.fillStyle(0xffffff, 0.16).fillRoundedRect(x + 5, y + 5, cw - 10, ch * 0.4, 6);
        this.moveTexts.push(this.add.text(x + cw / 2, y + ch / 2, m.name, {
          fontFamily: FONT, fontSize: `${Math.round(Math.min(boxH * 0.12, cw / Math.max(10, m.name.length) * 1.5))}px`,
          color: '#ffffff', fontStyle: 'bold', stroke: '#00000055', strokeThickness: 3,
        }).setOrigin(0.5).setDepth(D.text));
      });
      const ix = gw + pad, iw = W - ix - pad;
      this.movePanel.fillStyle(C.panelEdge, 1).fillRoundedRect(ix, A + pad, iw, boxH - pad * 2, 12);
      this.movePanel.fillStyle(C.panel, 1).fillRoundedRect(ix + 5, A + pad + 5, iw - 10, boxH - pad * 2 - 10, 9);
      const m = this.moves[this.sel];
      const lines = [`PP ${this.pp[this.sel]}/${maxPp(m)}`];
      if (m.arrest) lines.push(`Solo sotto il ${Math.round((m.arrestBelow ?? 0.4) * 100)}% HP`);
      else lines.push(power(m) ? `Potenza ${power(m)}` : 'Stato', `Precisione ${accuracy(m)}`);
      if (m.desc) lines.push(m.desc);
      this.infoText.setText(lines.join('\n')).setPosition(ix + 20, A + pad + 16)
        .setWordWrapWidth(iw - 40).setVisible(true);
    }
    if (bag) {
      this.bagList.forEach((it, i) => {
        const on = this.sel === i;
        const label = it.back ? 'Indietro' : `${it.name}  x${it.qty}   +${it.heal} HP`;
        this.moveTexts.push(this.add.text(W * 0.5 + 10, A + pad + 18 + i * Math.round(boxH * 0.17),
          `${on ? '▶ ' : '  '}${label}`, this.textStyle(Math.round(boxH * 0.12))).setDepth(D.text));
      });
    }

    this.hint.setText(fight || bag ? 'Spazio: scegli · Esc: indietro' : cmd ? 'Frecce: scegli · Spazio: conferma' : '');
    if (cmd) this.msg.setText(`Cosa deve fare\n${this.heroName}?`);
    if (bag) {
      this.msg.setText(this.bagList.length > 1 ? 'Zaino:\nusare un oggetto\nconsuma il turno.' : 'Lo zaino è vuoto.')
        .setWordWrapWidth(W * 0.45);
    }
  }

  // ── input ─────────────────────────────────────────────────────────────────
  update(time, delta) {
    questState.stats.playMs += delta;
    const k = this.keys;
    const J = (key) => Phaser.Input.Keyboard.JustDown(key);
    const ok = J(k.space) || J(k.enter);
    const back = J(k.esc) || J(k.back) || J(k.x);
    const up = J(k.up) || J(k.w), down = J(k.down) || J(k.s);
    const left = J(k.left) || J(k.a), right = J(k.right) || J(k.d);

    if (this.inputLocked) {
      if (!k.space.isDown && !k.enter.isDown) this.inputLocked = false;
      return;
    }
    if (this.mode === 'steps') {
      if (ok) this.advanceText();
      return;
    }
    if (this.mode === 'command') {
      if (left || right || up || down) { this.sel = 1 - this.sel; this.renderPanels(); }
      else if (ok) {
        if (this.sel === 0) { this.mode = 'fight'; this.sel = this.lastMove || 0; this.renderPanels(); }
        else this.openBag();
      }
    } else if (this.mode === 'fight') {
      const n = this.moves.length;
      let s = this.sel;
      if (left && s % 2) s--; else if (right && s % 2 === 0 && s + 1 < n) s++;
      else if (up && s >= 2) s -= 2; else if (down && s + 2 < n) s += 2;
      if (s !== this.sel) { this.sel = s; this.renderPanels(); }
      if (back) { this.mode = 'command'; this.sel = 0; this.renderPanels(); }
      else if (ok) this.chooseMove(this.sel);
    } else if (this.mode === 'bag') {
      if (up) this.sel = Math.max(0, this.sel - 1);
      if (down) this.sel = Math.min(this.bagList.length - 1, this.sel + 1);
      if (up || down) this.renderPanels();
      if (back) { this.mode = 'command'; this.sel = 1; this.renderPanels(); }
      else if (ok) this.chooseItem(this.bagList[this.sel]);
    }
  }

  openBag() {
    this.bagList = [...questState.suppliesLeft(), { back: true }];
    this.mode = 'bag';
    this.sel = 0;
    this.renderPanels();
  }

  chooseMove(i) {
    const m = this.moves[i];
    if (this.pp[i] <= 0) return this.flash('Non ci sono più PP per questa mossa!');
    this.lastMove = i;
    this.pp[i]--;
    this.playTurn(() => this.heroMove(m));
  }

  chooseItem(it) {
    if (it.back) { this.mode = 'command'; this.sel = 1; this.renderPanels(); return; }
    if (this.heroHp >= this.heroMax) return this.flash('Hai già tutti gli HP.');
    this.playTurn(() => this.heroItem(it));
  }

  // A one-line notice that doesn't use the turn.
  flash(text) {
    const back = this.mode;
    this.mode = 'steps';
    this.renderPanels();
    this.steps = [{ text }];
    this.afterSteps = () => { this.mode = back; this.renderPanels(); };
    this.runStep();
  }

  // ── turn logic: builds a list of steps (texts + animations) ───────────────
  say(text) { this.steps.push({ text }); }
  anim(fn) { this.steps.push({ fn }); }

  playTurn(heroAction) {
    this.steps = [];
    if (this.heroStatus.imbarazzato) {
      this.heroStatus.imbarazzato = 0;
      this.say(`${this.heroName} è in imbarazzo e non riesce ad agire!`);
      this.anim((done) => { this.updateBars(); done(); });
    } else {
      heroAction();
      this.tickSleep(this.heroStatus, this.heroName);
    }

    if (this.enemyHp <= 0) {
      this.anim((done) => this.faint(this.enemy, done));
      this.say(`${this.enemyName} è KO!`);
      this.pendingEnd = 'win';
    } else {
      this.enemyAct();
    }
    this.mode = 'steps';
    this.renderPanels();
    this.afterSteps = () => {
      if (this.pendingEnd) return this.endBattle();
      this.mode = 'command';
      this.sel = 0;
      this.renderPanels();
    };
    this.runStep();
  }

  heroMove(m) {
    this.say(`${this.heroName} usa ${m.name}!`);
    if (m.arrest) {
      this.anim((done) => this.lunge(this.hero, -1, done));
      if (canArrest(m, this.enemyHp, this.enemyMax, this.mustLose)) {
        this.enemyHp = 0;
        this.anim((done) => this.hit(this.enemy, 'enemy', 0, false, done));
        this.say(`${this.enemyName} è in arresto!`);
      } else {
        this.say(`${this.enemyName} resiste all'arresto! Prima indeboliscilo.`);
      }
      return;
    }
    const r = rollHit(m, this.heroStats, this.enemyStats, this.heroStatus);
    this.anim((done) => this.lunge(this.hero, -1, done));
    if (!r.hit) { this.say('Ma non va a segno!'); return; }
    if (this.heroStatus.assonnato && r.dmg) this.say(`${this.heroName} ha sonno: colpo dimezzato.`);
    this.enemyHp = Math.max(0, this.enemyHp - r.dmg);
    let clamped = false;
    if (this.mustLose && this.enemyHp < this.enemyMax * MUST_LOSE_FLOOR) {
      this.enemyHp = Math.ceil(this.enemyMax * MUST_LOSE_FLOOR);
      clamped = true;
    }
    const to = this.enemyHp;
    if (r.dmg) this.anim((done) => this.hit(this.enemy, 'enemy', to, r.crit, done));
    if (r.crit) this.say('Brutto colpo!');
    if (clamped) this.say(`${this.enemyName} non sente niente!`);
    if (this.enemyHp > 0 && rollStatus(m, this.enemyStatus)) {
      this.enemyStatus[m.status] = STATUS[m.status].turns;
      this.anim((done) => this.statusFx(this.enemy, m.status, done));
      this.say(STATUS[m.status].inflict(this.enemyName));
    } else if (!power(m) && m.status) {
      this.say(`Non ha effetto su ${this.enemyName}...`);
    }
  }

  heroItem(it) {
    const heal = questState.useSupply(it.name);
    const gained = Math.min(heal, this.heroMax - this.heroHp);
    this.heroHp += gained;
    const to = this.heroHp;
    this.say(`${this.heroName} usa ${it.name}!`);
    this.anim((done) => this.healFx(this.hero, to, done));
    this.say(`${this.heroName} recupera ${gained} HP.`);
  }

  enemyAct() {
    if (this.enemyStatus.imbarazzato) {
      this.enemyStatus.imbarazzato = 0;
      this.say(`${this.enemyName} è in imbarazzo e salta il turno!`);
      this.anim((done) => { this.updateBars(); done(); });
      return;
    }
    const em = enemyPick(this.enemyMoves, this.heroStatus) || { name: null, power: 4 };
    this.say(em.name ? `${this.enemyName} usa ${em.name}!` : `${this.enemyName} contrattacca!`);
    this.anim((done) => this.lunge(this.enemy, 1, done));
    const r = rollHit(em, this.enemyStats, this.heroStats, this.enemyStatus);
    if (!r.hit) {
      this.say('Ma non va a segno!');
    } else {
      let dmg = r.dmg;
      if (this.mustLose && power(em)) dmg = Math.max(dmg, Math.ceil(this.heroMax / 3));
      if (this.enemyStatus.assonnato && dmg) this.say(`${this.enemyName} ha sonno: colpo dimezzato.`);
      this.heroHp = Math.max(0, this.heroHp - dmg);
      const to = this.heroHp;
      if (dmg) this.anim((done) => this.hit(this.hero, 'hero', to, r.crit, done));
      if (r.crit) this.say('Brutto colpo!');
      if (this.heroHp > 0 && rollStatus(em, this.heroStatus)) {
        this.heroStatus[em.status] = STATUS[em.status].turns;
        this.anim((done) => this.statusFx(this.hero, em.status, done));
        this.say(STATUS[em.status].inflict(this.heroName));
      }
    }
    this.tickSleep(this.enemyStatus, this.enemyName);
    if (this.heroHp <= 0) {
      if (this.lossLine) this.say(`${this.heroName}: «${this.lossLine}»`);
      this.anim((done) => this.faint(this.hero, done));
      this.say(`${this.heroName} è esausto...`);
      this.pendingEnd = 'lose';
    }
  }

  // After the side's action: one fewer sleepy turn; announce waking up.
  tickSleep(status, name) {
    if (!status.assonnato) return;
    status.assonnato--;
    if (!status.assonnato) {
      this.say(`${name} si sveglia.`);
      this.anim((done) => { this.updateBars(); done(); });
    }
  }

  // ── the step runner ──────────────────────────────────────────────────────
  runStep() {
    const s = this.steps.shift();
    if (!s) { const f = this.afterSteps; this.afterSteps = null; f?.(); return; }
    if (s.fn) {
      this.arrow.setVisible(false);
      this.busy = true; // Space waits for the animation
      s.fn(() => { this.busy = false; this.runStep(); });
      return;
    }
    this.typeText(s.text);
  }

  typeText(text) {
    this.typeTimer?.remove();
    this.full = text;
    this.typed = 0;
    this.typing = true;
    this.msg.setText('');
    this.arrow.setVisible(false);
    this.typeTimer = this.time.addEvent({
      delay: TYPE_MS, repeat: text.length - 1,
      callback: () => {
        this.typed++;
        this.msg.setText(text.slice(0, this.typed));
        if (this.typed >= text.length) this.doneTyping();
      },
    });
  }

  doneTyping() {
    this.typing = false;
    this.typeTimer?.remove();
    this.msg.setText(this.full);
    const b = this.msg.getBounds();
    this.arrow.setPosition(Math.min(b.right + 10, this.W - 40), b.bottom - 20).setVisible(true);
  }

  advanceText() {
    if (this.typing) { this.doneTyping(); return; }
    if (this.busy) return;
    this.runStep();
  }

  // ── animations ────────────────────────────────────────────────────────────
  // The attacker hops towards the other side (dir −1 = up-right, the hero).
  lunge(img, dir, done) {
    const dx = (dir < 0 ? 1 : -1) * this.W * 0.03;
    const dy = (dir < 0 ? -1 : 1) * this.A * 0.02;
    this.tweens.add({ targets: img, x: img.x + dx, y: img.y + dy, duration: 110, yoyo: true, ease: 'Quad.easeOut', onComplete: () => done() });
  }

  // Blink + shake, then the HP bar drains to `to`.
  hit(img, side, to, crit, done) {
        if (crit) this.cameras.main.shake(220, 0.012);
    this.tweens.add({
      targets: img, alpha: 0, duration: 70, yoyo: true, repeat: 3,
      onComplete: () => { img.setAlpha(1); this.drain(side, to, done); },
    });
    this.tweens.add({ targets: img, x: img.x + 10, duration: 45, yoyo: true, repeat: 3 });
  }

  drain(side, to, done) {
    const from = this.shown[side];
    const max = side === 'hero' ? this.heroMax : this.enemyMax;
    const dur = 250 + 700 * Math.abs(from - to) / max;
    this.tweens.addCounter({
      from, to, duration: dur, ease: 'Linear',
      onUpdate: (tw) => { this.shown[side] = tw.getValue(); this.updateBars(); },
      onComplete: () => { this.shown[side] = to; this.updateBars(); done(); },
    });
  }

  statusFx(img, status, done) {
    img.setTint(STATUS[status].colour);
    this.updateBars();
    this.tweens.add({
      targets: img, scaleY: img.baseScale * 0.92, duration: 120, yoyo: true, repeat: 1,
      onComplete: () => { img.clearTint(); done(); },
    });
  }

  healFx(img, to, done) {
    img.setTint(0xa8ffb0);
    for (let i = 0; i < 10; i++) {
      const s = this.add.circle(img.x + (Math.random() - 0.5) * img.displayWidth * 0.8,
        img.y - Math.random() * img.displayHeight * 0.5, 5, 0xbaffc4).setDepth(D.sprite + 1);
      this.tweens.add({ targets: s, y: s.y - 80, alpha: 0, duration: 700, delay: i * 50, onComplete: () => s.destroy() });
    }
    this.time.delayedCall(450, () => { img.clearTint(); this.drain('hero', to, done); });
  }

  faint(img, done) {
    this.tweens.killTweensOf(img);
    this.tweens.add({
      targets: img, y: img.y + img.displayHeight * 0.5, alpha: 0, duration: 500, ease: 'Quad.easeIn',
      onComplete: () => done(),
    });
    if (img === this.enemy) this.tweens.add({ targets: this.enemyShadow, alpha: 0, duration: 500 });
  }

  breathe(img) {
    this.tweens.add({ targets: img, scaleY: img.baseScale * 1.025, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  // Pokémon-style entrance: two black halves open, the platforms slide in
  // from opposite sides, then the HP boxes, then "X ti sfida!".
  intro() {
    const { W, H } = this;
    const top = this.add.rectangle(0, 0, W, H / 2 + 1, 0x000000).setOrigin(0, 0).setDepth(D.top);
    const bot = this.add.rectangle(0, H / 2, W, H / 2 + 1, 0x000000).setOrigin(0, 0).setDepth(D.top);
    const enemySide = [this.enemyPlat, this.enemy, this.enemyShadow];
    const heroSide = [this.heroPlat, this.hero];
    enemySide.forEach((o) => { o.x -= W; });
    heroSide.forEach((o) => { o.x += W; });
    const boxes = [...this.enemyBox.parts, ...this.heroBox.parts];
    boxes.forEach((o) => o.setAlpha(0));
    this.mode = 'intro';
    this.renderPanels();
    this.tweens.add({ targets: top, y: -H / 2, duration: 420, ease: 'Quad.easeIn', delay: 120 });
    this.tweens.add({ targets: bot, y: H, duration: 420, ease: 'Quad.easeIn', delay: 120 });
    this.tweens.add({ targets: enemySide, x: `+=${W}`, duration: 900, ease: 'Cubic.easeOut', delay: 300 });
    this.tweens.add({
      targets: heroSide, x: `-=${W}`, duration: 900, ease: 'Cubic.easeOut', delay: 300,
      onComplete: () => {
        top.destroy(); bot.destroy();
        this.tweens.add({ targets: boxes, alpha: 1, duration: 250 });
        this.breathe(this.enemy);
        this.breathe(this.hero);
        this.steps = [{ text: `${this.enemyName} ti sfida!` }];
        this.mode = 'steps';
        this.afterSteps = () => { this.mode = 'command'; this.sel = 0; this.renderPanels(); };
        this.runStep();
      },
    });
  }

  // ── end ───────────────────────────────────────────────────────────────────
  endBattle() {
    const world = this.scene.get(this.returnScene);
    if (world) world.spaceGuard = true;

    if (this.pendingEnd === 'win') questState.stats.wins++;
    else if (!this.mustLose) questState.stats.losses++; // a scripted loss isn't one

    if (this.pendingEnd === 'win') {
      questState.setHp(this.heroHp, this.heroMax); // keep the damage taken
      questState.defeat(this.enemyChar, this.chapter);
      if (world?.onProgress) world.onProgress();
      else advanceChapterIfDone();
    }

    this.audio?.stopMusic();
    if (world?.audio?.music && !world.audio.music.isPlaying) world.audio.music.resume();

    this.scene.resume(this.returnScene);
    this.scene.stop();

    if (this.pendingEnd === 'lose') {
      if (this.mustLose) world?.onScriptedLoss?.();
      else world?.onDefeat?.();
    }
    if (this.pendingEnd === 'win') world?.afterBattleWin?.();
  }
}
