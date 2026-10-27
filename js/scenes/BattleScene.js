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

// An `arrest: true` move is a FINISHER: it only works once the enemy is at or
// below this fraction of max HP (override per move with `arrestBelow`).
// Above it the arrest fails and the turn is wasted.
const ARREST_BELOW = 0.4;
// A scripted loss (`mustLose`): the enemy never drops below this fraction of max HP.
const MUST_LOSE_FLOOR = 0.6;

// Status effects. Any move (hero's or enemy's) may carry
// `"status": "imbarazzato" | "assonnato"` and `"chance": 0..1` (default 1).
//   imbarazzato — the target loses its next action;
//   assonnato   — the target's next `turns` actions deal half damage.
const STATUS = {
    imbarazzato: { turns: 1, tag: 'IMBARAZZO' },
    assonnato: { turns: 2, tag: 'SONNO' },
};

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
        // Chapter this fight belongs to — a win is credited to it.
        this.chapter = data.chapter || questState.activeChapter;
        // A fight lost by the script (chapter 1, Gabbo): he can't be brought
        // below MUST_LOSE_FLOOR of his HP, no arrest works, his hits take a
        // third of your HP, and you say `lossLine` as you go down. The world
        // then calls onScriptedLoss instead of the usual defeat.
        this.mustLose = !!data.mustLose;
        this.lossLine = data.lossLine || null;
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
        // Enemy moves (optional, in the enemy's JSON); none → a generic counter.
        this.enemyMoves = Array.isArray(enemyData.moves) ? enemyData.moves : [];
        this.heroStatus = {};  // { imbarazzato: turnsLeft, assonnato: turnsLeft }
        this.enemyStatus = {};

        this.enemyHp = this.enemyMax = this.enemyStats.maxHp;
        // Hero HP persists between battles (questState.heroHp); enemies start full.
        this.heroMax = this.heroStats.maxHp;
        this.heroHp = questState.currentHp(this.heroMax);

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

        // Main menu: the hero's moves + the bag (consumables). No Fuga, by design.
        this.entries = [...this.moves, { name: 'Zaino', bag: true }];
        this.menuTexts = this.entries.map((m, i) =>
            this.add
                .text(W * 0.12 + (i % 2) * W * 0.42, H - 96 + Math.floor(i / 2) * 30, '', {
                    fontFamily: 'monospace',
                    fontSize: '19px',
                    color: '#ffffff',
                })
                .setDepth(DEPTH.text)
        );
        this.bagTexts = [];

        this.state = 'select'; // 'select' | 'bag' | 'message'
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

        return { x, y, w, g, label, name };
    }

    updateBars() {
        const draw = (plate, hp, max, status) => {
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

            // Name + active statuses, e.g. "Gabbo  [SONNO]".
            const tags = Object.keys(STATUS).filter((k) => status[k] > 0).map((k) => `[${STATUS[k].tag}]`);
            plate.label.setText([plate.name, ...tags].join('  '));
        };

        draw(this.enemyPlate, this.enemyHp, this.enemyMax, this.enemyStatus);
        draw(this.heroPlate, this.heroHp, this.heroMax, this.heroStatus);
    }

    renderMenu() {
        const select = this.state === 'select';
        const bag = this.state === 'bag';

        this.menuTexts.forEach((t, i) => {
            t.setVisible(select);
            if (!select) return;
            const selected = i === this.sel;
            const m = this.entries[i];
            // An arrest that would fail right now is shown dimmed.
            const dim = m.arrest && !this.canArrest(m);
            t.setText(`${selected ? '▶ ' : '  '}${m.name}`);
            t.setColor(selected ? '#ffd54a' : dim ? '#6b7280' : '#ffffff');
        });

        this.bagTexts.forEach((t) => t.destroy());
        this.bagTexts = [];
        if (bag) {
            const W = this.scale.width;
            const H = this.scale.height;
            this.bagList.forEach((it, i) => {
                const selected = i === this.sel;
                const label = it.back ? 'Indietro' : `${it.name}  x${it.qty}   (+${it.heal} HP)`;
                this.bagTexts.push(
                    this.add
                        .text(W * 0.12 + Math.floor(i / 3) * W * 0.42, H - 100 + (i % 3) * 30,
                            `${selected ? '▶ ' : '  '}${label}`, {
                                fontFamily: 'monospace',
                                fontSize: '18px',
                                color: selected ? '#ffd54a' : '#ffffff',
                            })
                        .setDepth(DEPTH.text)
                );
            });
        }

        if (select) this.msg.setText(`Cosa fa ${this.heroName}?`);
        if (bag) this.msg.setText('Zaino — cosa usi? (usare un oggetto consuma il turno)');
    }

    update(time, delta) {
        questState.stats.playMs += delta;
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
        } else if (this.state === 'bag') {
            if (J(c.up)) this.moveSel(-1);
            else if (J(c.down)) this.moveSel(1);
            else if (J(c.left)) this.moveSel(-3);
            else if (J(c.right)) this.moveSel(3);
            else if (J(c.space)) this.confirmBag();
        }
    }

    moveSel(d) {
        const n = this.state === 'bag' ? this.bagList.length : this.entries.length;
        this.sel = Phaser.Math.Clamp(this.sel + d, 0, n - 1);
        this.renderMenu();
    }

    confirm() {
        const m = this.entries[this.sel];
        if (m.bag) return this.openBag();
        this.playTurn(() => this.heroMove(m));
    }

    openBag() {
        this.bagList = [...questState.suppliesLeft(), { back: true }];
        this.state = 'bag';
        this.sel = 0;
        this.renderMenu();
    }

    confirmBag() {
        const it = this.bagList[this.sel];
        this.sel = this.entries.findIndex((e) => e.bag); // back on "Zaino" in the main menu
        if (it.back) {
            this.state = 'select';
            this.renderMenu();
            return;
        }
        this.playTurn(() => this.heroItem(it));
    }

    // One full round: the hero's action (unless in imbarazzo), then — if the
    // enemy is still standing — the enemy's. Messages queue up and are shown
    // one per Space press.
    playTurn(heroAction) {
        this.queue = [];
        if (this.heroStatus.imbarazzato) {
            this.heroStatus.imbarazzato = 0;
            this.queue.push(`${this.heroName} è in imbarazzo e non riesce ad agire!`);
        } else {
            heroAction();
            this.tickSleep(this.heroStatus, this.heroName);
        }

        if (this.mustLose && this.enemyHp < this.enemyMax * MUST_LOSE_FLOOR) {
            this.enemyHp = Math.ceil(this.enemyMax * MUST_LOSE_FLOOR);
            this.queue.push(`${this.enemyName} non sente niente!`);
        }
        if (this.enemyHp <= 0) {
            this.queue.push(`${this.enemyName} è KO!`);
            this.pendingEnd = 'win';
        } else {
            this.enemyAct();
        }

        this.updateBars();
        this.state = 'message';
        this.renderMenu();
        this.showMessage(this.queue.shift());
    }

    heroMove(m) {
        this.queue.push(`${this.heroName} usa ${m.name}!`);

        // An arrest KOs only a weakened enemy (see ARREST_BELOW), else it fails.
        if (m.arrest) {
            if (this.canArrest(m)) {
                this.enemyHp = 0;
                this.queue.push(`${this.enemyName} è in arresto!`);
            } else {
                this.queue.push(`${this.enemyName} resiste all'arresto! Prima indeboliscilo.`);
            }
            return;
        }

        // Damage = move base + attacker.attack - defender.defense (min 1).
        const dmg = this.sleepy(this.heroStatus, this.heroName,
            Math.max(1, (m.dmg || 0) + this.heroStats.attack - this.enemyStats.defense));
        this.enemyHp = Math.max(0, this.enemyHp - dmg);
        if (this.enemyHp > 0) this.tryStatus(m, this.enemyStatus, this.enemyName);
    }

    heroItem(it) {
        const heal = questState.useSupply(it.name);
        const gained = Math.min(heal, this.heroMax - this.heroHp);
        this.heroHp += gained;
        this.queue.push(`${this.heroName} usa ${it.name}! +${gained} HP`);
    }

    enemyAct() {
        if (this.enemyStatus.imbarazzato) {
            this.enemyStatus.imbarazzato = 0;
            this.queue.push(`${this.enemyName} è in imbarazzo e salta il turno!`);
            return;
        }

        // A random move from the enemy's JSON, or a generic counter (base 3–6).
        const em = this.enemyMoves.length ? Phaser.Utils.Array.GetRandom(this.enemyMoves) : null;
        const base = em ? (em.dmg || 0) : Phaser.Math.Between(3, 6);
        this.queue.push(em ? `${this.enemyName} usa ${em.name}!` : `${this.enemyName} contrattacca!`);
        let dmg = this.sleepy(this.enemyStatus, this.enemyName,
            Math.max(1, base + this.enemyStats.attack - this.heroStats.defense));
        if (this.mustLose) dmg = Math.max(dmg, Math.ceil(this.heroMax / 3));
        this.heroHp = Math.max(0, this.heroHp - dmg);
        this.tickSleep(this.enemyStatus, this.enemyName);

        if (this.heroHp <= 0) {
            if (this.lossLine) this.queue.push(`${this.heroName}: «${this.lossLine}»`);
            this.queue.push(`${this.heroName} è esausto...`);
            this.pendingEnd = 'lose';
        } else if (em) {
            this.tryStatus(em, this.heroStatus, this.heroName);
        }
    }

    // Halve outgoing damage while `assonnato` (rounded up, min 1).
    sleepy(status, name, dmg) {
        if (!status.assonnato) return dmg;
        this.queue.push(`${name} ha sonno: colpo dimezzato.`);
        return Math.max(1, Math.ceil(dmg / 2));
    }

    // After the side's action: one fewer sleepy turn; announce waking up.
    tickSleep(status, name) {
        if (!status.assonnato) return;
        status.assonnato--;
        if (!status.assonnato) this.queue.push(`${name} si sveglia.`);
    }

    // Roll a move's status effect onto `target`.
    tryStatus(move, target, name) {
        const def = STATUS[move.status];
        if (!def || Math.random() >= (move.chance ?? 1)) return;
        target[move.status] = def.turns;
        this.queue.push(move.status === 'imbarazzato' ? `${name} va in imbarazzo!` : `A ${name} viene sonno!`);
    }

    // Whether an arrest move would succeed against the enemy's current HP.
    canArrest(m) {
        if (this.mustLose) return false;
        return this.enemyHp <= this.enemyMax * (m.arrestBelow ?? ARREST_BELOW);
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

        if (this.pendingEnd === 'win') questState.stats.wins++;
        else if (!this.mustLose) questState.stats.losses++; // a scripted loss isn't one

        // Fight quests: record the win against the fight's own chapter, then let
        // the world roll the story forward, refresh its HUD and save.
        if (this.pendingEnd === 'win') {
            questState.setHp(this.heroHp, this.heroMax); // keep the damage taken
            questState.defeat(this.enemyChar, this.chapter);
            if (world?.onProgress) world.onProgress();
            else advanceChapterIfDone();
        }

        // Stop the battle theme and resume the world soundtrack.
        this.audio?.stopMusic();
        if (world?.audio?.music && !world.audio.music.isPlaying) {
            world.audio.music.resume();
        }

        this.scene.resume(this.returnScene);
        this.scene.stop();

        // Lost: the world wakes the hero up in the living room at full HP (or,
        // for a scripted loss, wherever the story goes on). Won: the battle's
        // closing lines and reward.
        if (this.pendingEnd === 'lose') {
            if (this.mustLose) world?.onScriptedLoss?.();
            else world?.onDefeat?.();
        }
        if (this.pendingEnd === 'win') world?.afterBattleWin?.();
    }
}
