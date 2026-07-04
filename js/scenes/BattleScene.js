// js/scenes/BattleScene.js
import { PLAYER, BATTLE_BG_KEY } from '../config.js';
import { questState } from '../story/questState.js';
import { baseStats } from '../core/characters.js';
import { advanceChapterIfDone } from '../story/chapters.js';
import { loadAudio, attachAudio } from '../core/audio.js';

// Fallback moves if the protagonist's character.json defines none.
const DEFAULT_MOVES = [
    { name: 'Spinta', dmg: 7 },
    { name: 'Insulto', dmg: 9 },
    { name: 'Manette', dmg: 5 },
    { name: 'Sei in arresto meddoso!!!!', arrest: true },
];

const DEPTH = { bg: 0, sprite: 2, ui: 10, text: 11 };

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
        this.heroChar = data.heroChar || PLAYER.SPRITE_KEY; // character.json folder
        this.returnScene = data.returnScene || 'WorldScene';
    }

    preload() {
        // Soundtrack + SFX (cached globally; a no-op if WorldScene already loaded them).
        loadAudio(this);
    }

    create() {
        const W = this.scale.width;
        const H = this.scale.height;

        // Battle soundtrack — pause the world theme so it doesn't bleed through,
        // then play the battle theme (currently a no-op until a file is added).
        const world = this.scene.get(this.returnScene);
        if (world?.audio?.music?.isPlaying) world.audio.music.pause();
        attachAudio(this);
        this.audio.playSceneMusic();

        // REPLACE THE RECTANGLE WITH THIS IMAGE GENERATOR:
        if (this.textures.exists(BATTLE_BG_KEY)) {
            this.add
                .image(0, 0, BATTLE_BG_KEY)
                .setOrigin(0, 0)
                .setDisplaySize(W, H) // Forces the image to stretch to your viewport dimensions
                .setDepth(DEPTH.bg);
        } else {
            // Fallback to your old dark background if the image fails to load
            this.add
                .rectangle(0, 0, W, H, 0x05060a, 1)
                .setOrigin(0, 0)
                .setDepth(DEPTH.bg);
        }

        const enemyPortraitKey = `${this.enemyKey}-portrait`;
        const heroPortraitKey = `${this.heroKey}-portrait`;

        this.enemy = this.add
            .image(
                W * 0.84,
                H * 0.34,
                this.textures.exists(enemyPortraitKey)
                    ? enemyPortraitKey
                    : this.enemyKey
            )
            .setDepth(DEPTH.sprite);

        this.hero = this.add
            .image(
                W * 0.20,
                H * 0.74,
                this.textures.exists(heroPortraitKey)
                    ? heroPortraitKey
                    : this.heroKey
            )
            .setDepth(DEPTH.sprite);

        const fitPortrait = (img, targetH) => {
            const src = this.textures.get(img.texture.key).getSourceImage();
            img.setDisplaySize(
                (src.width / src.height) * targetH,
                targetH
            );
        };

        fitPortrait(this.enemy, H * 0.50);
        fitPortrait(this.hero, H * 0.60);

        // Stats — read each fighter's base stats from their character.json.
        // The protagonist's stats get item buffs folded in via questState.
        const heroData = this.cache.json.get(`${this.heroChar}-data`) || {};
        const enemyData = this.cache.json.get(`${this.enemyChar}-data`) || {};
        this.heroStats = questState.heroStats(baseStats(heroData));
        this.enemyStats = baseStats(enemyData);
        this.moves = (heroData.moves && heroData.moves.length) ? heroData.moves : DEFAULT_MOVES;

        this.enemyHp = this.enemyMax = this.enemyStats.maxHp;
        this.heroHp = this.heroMax = this.heroStats.maxHp;

        // HP plates.
        this.enemyPlate = this.makePlate(
            W * 0.65,
            H * 0.16,
            this.enemyName
        );

        this.heroPlate = this.makePlate(
            W * 0.08,
            H * 0.55,
            this.heroName
        );

        // Bottom UI.
        this.bar = this.add
            .rectangle(0, H - 150, W, 150, 0x0d0f17, 0.96)
            .setOrigin(0, 0)
            .setDepth(DEPTH.ui)
            .setStrokeStyle(3, 0xffffff, 0.85);

        this.msg = this.add
            .text(28, H - 132, '', {
                fontFamily: 'monospace',
                fontSize: '20px',
                color: '#ffffff',
                wordWrap: { width: W - 56 },
            })
            .setDepth(DEPTH.text);

        this.moveTexts = this.moves.map((m, i) => {
            const col = i % 2;
            const row = Math.floor(i / 2);

            return this.add
                .text(
                    W * 0.12 + col * W * 0.42,
                    H - 96 + row * 34,
                    '',
                    {
                        fontFamily: 'monospace',
                        fontSize: '19px',
                        color: '#ffffff',
                    }
                )
                .setDepth(DEPTH.text);
        });

        this.state = 'select';
        this.sel = 0;
        this.queue = [];
        this.pendingEnd = null;
        this.inputLocked = true;
        this.cursors = this.input.keyboard.createCursorKeys();

        this.updateBars();
        this.renderMenu();
    }

    makePlate(x, y, name) {
        const w = 300;

        const g = this.add.graphics().setDepth(DEPTH.ui);

        const label = this.add
            .text(x + 12, y + 8, name, {
                fontFamily: 'monospace',
                fontSize: '17px',
                color: '#ffffff',
            })
            .setDepth(DEPTH.text);

        return { x, y, w, g, label };
    }

    updateBars() {
        const draw = (plate, hp, max) => {
            const { x, y, w, g } = plate;

            g.clear();

            g.fillStyle(0x0d0f17, 0.92);
            g.fillRect(x, y, w, 46);

            g.lineStyle(2, 0xffffff, 0.7);
            g.strokeRect(x, y, w, 46);

            const bw = w - 24;

            g.fillStyle(0x333a47, 1);
            g.fillRect(x + 12, y + 30, bw, 8);

            const frac = Math.max(0, hp / max);

            const col =
                frac > 0.5
                    ? 0x57d977
                    : frac > 0.2
                        ? 0xe8c84a
                        : 0xe05a4a;

            g.fillStyle(col, 1);
            g.fillRect(x + 12, y + 30, bw * frac, 8);
        };

        draw(this.enemyPlate, this.enemyHp, this.enemyMax);
        draw(this.heroPlate, this.heroHp, this.heroMax);
    }

    renderMenu() {
        const show = this.state === 'select';

        this.moveTexts.forEach((t, i) => {
            t.setVisible(show);

            if (!show) return;

            const selected = i === this.sel;

            t.setText(`${selected ? '▶ ' : '  '}${this.moves[i].name}`);
            t.setColor(selected ? '#ffd54a' : '#ffffff');
        });

        if (show) {
            this.msg.setText(`Cosa fa ${this.heroName}?`);
        }
    }

    update() {
        const c = this.cursors;
        const J = (k) => Phaser.Input.Keyboard.JustDown(k);

        if (this.inputLocked) {
            if (!c.space.isDown) this.inputLocked = false;
            return;
        }

        if (this.state === 'message') {
            if (J(c.space)) this.nextMessage();
            return;
        }

        if (this.state === 'select') {
            if (J(c.left)) this.moveSel(-1);
            else if (J(c.right)) this.moveSel(1);
            else if (J(c.up)) this.moveSel(-2);
            else if (J(c.down)) this.moveSel(2);
            else if (J(c.space)) this.confirm();
        }
    }

    moveSel(d) {
        this.sel = Phaser.Math.Clamp(
            this.sel + d,
            0,
            this.moves.length - 1
        );

        this.renderMenu();
    }

    confirm() {
        const m = this.moves[this.sel];

        this.queue = [`${this.heroName} usa ${m.name}!`];

        // Damage = move base + attacker.attack - defender.defense (min 1).
        const dmg = m.arrest
            ? this.enemyHp
            : Math.max(1, (m.dmg || 0) + this.heroStats.attack - this.enemyStats.defense);
        this.enemyHp = Math.max(0, this.enemyHp - dmg);

        if (m.arrest) {
            this.queue.push(`${this.enemyName} è in arresto!`);
        }

        if (this.enemyHp <= 0) {
            this.queue.push(`${this.enemyName} è KO!`);
            this.pendingEnd = 'win';
        } else {
            // Enemy counterattack: a small base swing scaled by its attack vs
            // the hero's defense.
            const ed = Math.max(1, Phaser.Math.Between(3, 6) + this.enemyStats.attack - this.heroStats.defense);

            this.heroHp = Math.max(
                0,
                this.heroHp - ed
            );

            this.queue.push(`${this.enemyName} contrattacca!`);

            if (this.heroHp <= 0) {
                this.queue.push(`${this.heroName} è esausto...`);
                this.pendingEnd = 'lose';
            }
        }

        this.updateBars();

        this.state = 'message';
        this.renderMenu();
        this.showMessage(this.queue.shift());
    }

    showMessage(text) {
        this.msg.setText(text + '   ▼');
    }

    nextMessage() {
        if (this.queue.length) {
            this.showMessage(this.queue.shift());
            return;
        }

        if (this.pendingEnd) {
            this.endBattle();
            return;
        }

        this.state = 'select';
        this.renderMenu();
    }

    endBattle() {
        const world = this.scene.get(this.returnScene);

        if (world) {
            world.spaceGuard = true;
        }

        // Fight quests: record the win, then roll the story forward and refresh
        // the world's quest tracker so a `{ defeat: '<id>' }` objective ticks off.
        if (this.pendingEnd === 'win') {
            questState.defeat(this.enemyChar);
            advanceChapterIfDone();
            world?.questTracker?.refresh();
        }

        // Stop the battle theme and resume the world soundtrack.
        this.audio?.stopMusic();
        if (world?.audio?.music && !world.audio.music.isPlaying) {
            world.audio.music.resume();
        }

        this.scene.resume(this.returnScene);
        this.scene.stop();
    }
}