// js/scenes/world/club.js
// Chapter 8, the night at the Alcatraz (js/story/alcatraz.js, js/story/flirt.js):
// the trip from the front door, the crowd, Gabbo following, Chiara and the
// maranzas chasing, the bar, the stages, flirting and the dance challenge.
// A class mixin of WorldScene: the methods run with `this` = the scene.
import { TILE, TILES, PLAYER, DOOR_WIDTH } from '../../config.js';
import { idleFrame, sliceSheet, createWalkAnims, feetY } from '../../core/playerSprite.js';
import { MAPS, START_MAP } from '../../../maps/index.js';
import { questState } from '../../story/questState.js';
import { ALCATRAZ, exitState } from '../../story/alcatraz.js';
import {
  GIRLS, APPROACHES, GABBO, CHAPTER as FLIRT_CHAPTER, MAP as FLIRT_MAP, CHIARA_SPEED, CHIARA_WAIT_MS, flirtActive,
  girlState, approach, snub, winNumber, loseNight, gabbo as gabboState, garbleChance, goChance, slur, bar, DRINKS,
  drinkLabel, buyDrink, deliverDrink, danceResult, MARANZA, phone as phoneState, tryToSteal,
} from '../../story/flirt.js';

export const withClub = (Base) => class extends Base {
  // Dancing crowd (map `crowd`): dark silhouettes made from the cast's own
  // sheets (tinted almost black, so the disco lights colour them), scattered
  // over `area` at least `spacing` tiles apart, not solid. They dance on the
  // map's `beat` (danceCrowd), synced to the music when it's playing.
  startCrowd(map) {
    this.crowd = [];
    this.lastBeat = -1;
    for (const c of [].concat(map.crowd || [])) this.crowdIn(map, c); // one or several areas
    // Static dancers (map `dancers`: { key, path, tx, ty, scale }): a 4x3 sheet
    // of dance poses, a new pose on every beat, dancing on the spot. Solid feet.
    this.dancers = (map.dancers || []).filter((d) => this.textures.exists(d.key)).map((d) => {
      sliceSheet(this, d.key);
      const sp = this.add.sprite(d.tx * TILE, d.ty * TILE, d.key, 0).setScale(PLAYER.SCALE * (d.scale || 1));
      sp.setDepth(feetY(sp));
      const zone = this.add.zone(sp.x, feetY(sp) - TILE * 0.4, TILE * 1.6, TILE * 0.8);
      this.physics.add.existing(zone, true);
      this.walls.add(zone);
      return sp;
    });
  }

  crowdIn(map, c) {
    const a = c.area;
    const spots = [];
    const free = (x, y) => map.grid[Math.floor(y)]?.[Math.floor(x)] === TILES.FLOOR
      && spots.every((p) => Math.hypot(p.x - x, p.y - y) >= (c.spacing || 1.5));
    for (let k = 0; k < (c.count || 20) * 30 && spots.length < (c.count || 20); k++) {
      const x = Phaser.Math.FloatBetween(a.x0, a.x1 + 1);
      const y = Phaser.Math.FloatBetween(a.y0, a.y1 + 1);
      if (free(x, y)) spots.push({ x, y });
    }
    const kinds = (c.from || []).filter((k) => this.textures.exists(k));
    if (!kinds.length) return;
    for (const p of spots) {
      const key = Phaser.Utils.Array.GetRandom(kinds);
      sliceSheet(this, key);
      const sp = this.add.sprite(p.x * TILE, p.y * TILE, key, idleFrame(Phaser.Utils.Array.GetRandom(['down', 'left', 'up'])))
        .setScale(PLAYER.SCALE * Phaser.Math.FloatBetween(0.92, 1.05))
        .setTint(0x1c1a26)
        .setFlipX(Math.random() < 0.5);
      sp.baseY = sp.y;
      sp.phase = Math.floor(Math.random() * 4); // not everyone moves on the same beat
      sp.setDepth(feetY(sp));
      this.crowd.push(sp);
    }
  }

  // Current beat number of the map's music (or of the scene clock as a fallback).
  beatNow(time) {
    const b = MAPS[this.mapKey].beat;
    if (!b) return -1;
    const m = this.audio?.music;
    const sec = m?.isPlaying ? m.seek : time / 1000;
    return Math.floor(((sec - (b.offset || 0)) * b.bpm) / 60);
  }

  // On every beat each dancer hops; every 2 beats it turns or changes pose.
  danceCrowd(time) {
    if (!this.crowd?.length && !this.dancers?.length) return;
    const beat = this.beatNow(time);
    if (beat === this.lastBeat) return;
    this.lastBeat = beat;
    for (const d of this.dancers || []) d.setFrame(((beat % 12) + 12) % 12); // next pose every beat
    const half = (60 / MAPS[this.mapKey].beat.bpm) * 500; // half a beat, ms
    for (const sp of this.crowd) {
      this.tweens.add({ targets: sp, y: sp.baseY - TILE * 0.18, duration: half * 0.8, yoyo: true, ease: 'Quad.easeOut' });
      if ((beat + sp.phase) % 2 === 0) {
        if (Math.random() < 0.5) sp.setFlipX(!sp.flipX);
        else sp.setFrame(Phaser.Utils.Array.GetRandom([0, 1, 2, 3, 4, 6, 8, 10]));
      }
    }
  }

  npcName(id) {
    return this.npcs.list.find((n) => n.id === id)?.name || id;
  }

  // Gabbo's lines at the club: slurred a bit more with every drink.
  gabboSays(lines, after) {
    const l = Array.isArray(lines) ? lines.map(slur) : slur(lines);
    this.dialogue.show('Gabbo', l, 'gabbo-portrait', after);
  }

  // ── Chapter 8 at the Alcatraz: followers ────────────────────────────────
  // Gabbo follows Zio Nick like a Pokémon partner: he walks the player's own
  // trail, ~1.2 tiles behind. Chiara slowly chases Gabbo (BFS over the floor)
  // and, when she reaches him, tries to take him home (chiaraPitch).
  setupFollowers() {
    this.trail = [];
    this.gabboNpc = null;
    this.chasers = [];
    this.gabboTagText = null;
    if (this.mapKey !== FLIRT_MAP) phoneState.stolen = false; // out of the club: phone back
    if (questState.activeChapter !== FLIRT_CHAPTER || this.mapKey !== FLIRT_MAP) return;
    const find = (id) => this.npcs.list.find((n) => n.id === id);
    const g = find('gabbo');
    if (g) {
      g.wander = false;
      g.sprite.body.checkCollision.none = true; // walks through Zio Nick
      g.sprite.body.reset(this.player.x, this.player.y + TILE * 0.6);
      this.gabboNpc = g;
      this.gabboTagText = this.add.text(0, 0, '', { fontFamily: 'monospace', fontSize: '20px' })
        .setOrigin(0.5, 1).setDepth(900000);
    }
    // Chasers: Chiara goes after Gabbo, the maranza after Zio Nick's phone.
    this.chasers = [];
    const chase = (id, speed, headStart, target, onReach) => {
      const n = find(id);
      if (!n) return;
      n.wander = false;
      n.sprite.body.checkCollision.none = true;
      this.chasers.push({ npc: n, speed, target, onReach, waitUntil: this.time.now + headStart, path: null, pathAt: 0 });
    };
    if (g) chase('chiara', CHIARA_SPEED, 6000, () => g.sprite, (ch) => this.chiaraPitch(ch.npc, ch));
    // Maranzas: each one stays in an 8x8 area around where he starts and only
    // comes after you when he sees you ("!" over his head).
    const half = MARANZA.area / 2;
    for (const n of this.npcs.list.filter((x) => x.id === MARANZA.id)) {
      n.wander = false;
      n.sprite.body.checkCollision.none = true;
      const hx = Math.round((n.sprite.x - TILE / 2) / TILE);
      const hy = Math.round((n.sprite.y - TILE / 2) / TILE);
      const mark = this.add.text(0, 0, '!', {
        fontFamily: 'monospace', fontSize: '34px', fontStyle: 'bold', color: '#ff4a4a', stroke: '#000000', strokeThickness: 6,
      }).setOrigin(0.5, 1).setDepth(900000).setVisible(false);
      this.chasers.push({
        npc: n, speed: MARANZA.speed, target: () => this.player, onReach: (ch) => this.maranzaTry(ch),
        waitUntil: this.time.now + 1500, path: null, pathAt: 0, mark, sees: false,
        home: { tx: hx, ty: hy },
        area: { x0: hx - half, y0: hy - half, x1: hx + half - 1, y1: hy + half - 1 },
      });
    }
  }

  followTick(time, delta) {
    const g = this.gabboNpc;
    if (!g) return;
    const p = this.player;
    const last = this.trail[this.trail.length - 1];
    if (!last || Math.hypot(p.x - last.x, p.y - last.y) > 4) this.trail.push({ x: p.x, y: p.y });
    if (this.trail.length > 240) this.trail.shift();
    // The point ~1.2 tiles back along the trail.
    let need = TILE * 1.2;
    let pos = null;
    for (let i = this.trail.length - 1; i > 0 && need > 0; i--) {
      const a = this.trail[i];
      const b = this.trail[i - 1];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (d >= need) { pos = { x: a.x + ((b.x - a.x) * need) / d, y: a.y + ((b.y - a.y) * need) / d }; need = 0; }
      else need -= d;
    }
    const s = g.sprite;
    if (pos) {
      const dx = pos.x - s.x;
      const dy = pos.y - s.y;
      s.body.reset(pos.x, pos.y);
      this.animateMove(g, dx, dy);
    } else this.animateMove(g, 0, 0);
    s.setDepth(this.characterDepth(s));
    this.chaseTick(time, delta);
  }

  // Code-moved chasers (BFS over the floor, re-planned twice a second). When
  // one reaches its target it calls onReach and waits (its waitUntil).
  chaseTick(time, delta) {
    const tile = (o) => ({ tx: Math.round((o.x - TILE / 2) / TILE), ty: Math.round((o.y - TILE / 2) / TILE) });
    for (const ch of this.chasers || []) {
      const c = ch.npc;
      const s = c.sprite;
      const tgt = ch.target();
      let goal = tgt; // where to walk this frame (a sprite-like {x, y})
      if (ch.area) {
        // Area-bound chaser (maranza): chases only while he sees you, never
        // leaves his area; otherwise he walks back to his spot.
        const pt = tile(tgt);
        const me = tile(s);
        const sees = flirtActive(this.mapKey) && !phoneState.stolen && time >= ch.waitUntil
          && Math.hypot(pt.tx - me.tx, pt.ty - me.ty) <= MARANZA.sight && this.lineOfSight(me, pt);
        if (sees && !ch.sees) { // just spotted you: the "!" pops
          ch.mark.setScale(0.2);
          this.tweens.add({ targets: ch.mark, scale: 1, duration: 220, ease: 'Back.easeOut' });
        }
        ch.sees = sees;
        ch.mark.setVisible(sees).setPosition(s.x, s.y - s.displayHeight * 0.5 + 2);
        if (sees && Math.hypot(tgt.x - s.x, tgt.y - s.y) < TILE * 1.3) {
          this.animateMove(c, 0, 0);
          ch.mark.setVisible(false);
          ch.waitUntil = Infinity;
          ch.onReach(ch);
          return;
        }
        const a = ch.area;
        const want = sees
          ? { tx: Phaser.Math.Clamp(pt.tx, a.x0, a.x1), ty: Phaser.Math.Clamp(pt.ty, a.y0, a.y1) }
          : ch.home;
        goal = { x: want.tx * TILE + TILE / 2, y: want.ty * TILE + TILE / 2 };
        if (Math.hypot(goal.x - s.x, goal.y - s.y) < 4) { this.animateMove(c, 0, 0); continue; }
      } else {
        if (!tgt || !flirtActive(this.mapKey) || time < ch.waitUntil) { this.animateMove(c, 0, 0); continue; }
        if (Math.hypot(tgt.x - s.x, tgt.y - s.y) < TILE * 1.3) {
          this.animateMove(c, 0, 0);
          ch.waitUntil = Infinity; // until onReach's talk ends
          ch.onReach(ch);
          return; // one scene at a time
        }
      }
      if (!ch.path || time > ch.pathAt) {
        ch.path = this.bfsStep(tile(s), tile(goal), ch.area);
        ch.pathAt = time + 400;
      }
      const w = ch.path;
      if (!w) { this.animateMove(c, 0, 0); continue; }
      const wx = w.tx * TILE + TILE / 2;
      const wy = w.ty * TILE + TILE / 2;
      const dist = Math.hypot(wx - s.x, wy - s.y);
      const step = (ch.speed * delta) / 1000;
      const k = dist <= step ? 1 : step / dist;
      const dx = (wx - s.x) * k;
      const dy = (wy - s.y) * k;
      s.body.reset(s.x + dx, s.y + dy);
      if (dist <= step) ch.path = null;
      this.animateMove(c, dx, dy);
      s.setDepth(this.characterDepth(s));
    }
  }

  // The maranza reached Zio Nick: he tries for the phone (stealChance grows
  // with the night's drinks). Then he backs off for a while.
  maranzaTry(ch) {
    const m = ch.npc;
    this.holdPlayer();
    this.dialogue.show(m.name, MARANZA.hello, m.portraitKey, () => {
      const stole = tryToSteal();
      this.dialogue.show(m.name, stole ? MARANZA.stole : MARANZA.kept, m.portraitKey, () => {
        this.showBanner(stole ? `${MARANZA.stoleBanner}\n−${MARANZA.fine} punti casa · niente telefono finché sei qui` : MARANZA.keptBanner,
          0.3, stole ? '#ff8a8a' : '#8fd3ff', stole ? 0xff8a8a : 0x8fd3ff);
        this.inventory.refresh();
        ch.waitUntil = this.time.now + MARANZA.waitMs;
        // Stolen: every maranza stops (phone.stolen); kept: this one backs off.
      });
    });
  }

  // Chiara reached Gabbo (or you talked to her): she asks him to go home with
  // her and Gabbo asks you. Letting him go loses the night; telling him to
  // stay works, unless he's drunk (goChance) and goes anyway.
  chiaraPitch(c, ch = this.chasers?.find((x) => x.npc === c)) {
    const g = GIRLS.chiara;
    const pk = c.portraitKey;
    const done = () => { if (ch) ch.waitUntil = this.time.now + CHIARA_WAIT_MS; };
    if (ch) ch.waitUntil = Infinity; // until the talk ends
    this.holdPlayer();
    const stay = () => {
      if (Math.random() < goChance()) { this.gabboSays(g.drunkGo, () => this.gabboLeaves(c)); return; }
      this.gabboSays(g.stay, () => this.dialogue.show(c.name, g.refused, pk, done));
    };
    // Option 0 (pre-selected) = tell him to stay; letting him go asks again.
    this.dialogue.show(c.name, [g.hello, g.ask], pk, () =>
      this.dialogue.ask('Gabbo', slur(g.gabbo), g.options, 'gabbo-portrait', (i) => {
        if (i === 0) { stay(); return; }
        this.dialogue.ask('⚠️ Attenzione', g.confirm, g.confirmOptions, null, (j) => (j === 1 ? this.gabboLeaves(c) : stay()));
      }));
  }

  // The bar (map `bar`): with a drink order, walking up to the counter opens
  // the menu (re-armed once you step away). Stronger = more ❤️, more alcohol
  // for Gabbo too, more punti casa.
  checkBar() {
    const z = MAPS[this.mapKey].bar;
    if (!z || !flirtActive(this.mapKey)) return;
    const fx = this.player.body.center.x / TILE;
    const fy = this.player.body.bottom / TILE;
    const inside = fx >= z.x0 && fx < z.x1 + 1 && fy >= z.y0 && fy < z.y1 + 1;
    if (!inside) { this.barArmed = true; return; }
    if (!this.barArmed) return;
    this.barArmed = false;
    if (bar.order && !bar.carrying) this.openBar(); // walking up with an order opens the menu by itself
  }

  // Space facing the bar island (no one in front): talk to the barman.
  tryBar(px, py) {
    const b = MAPS[this.mapKey].barIsland;
    if (!b) return false;
    const inX = px >= (b.x0 - 0.3) * TILE && px <= (b.x1 + 1.3) * TILE;
    const inY = py >= (b.y0 - 0.3) * TILE && py <= (b.y1 + 1.3) * TILE;
    if (!inX || !inY) return false;
    this.openBar();
    return true;
  }

  // The barman's menu. Stronger = more ❤️, more alcohol for Gabbo too, more
  // punti casa. Only for the girl who asked for a drink.
  openBar() {
    this.barArmed = false;
    if (!flirtActive(this.mapKey)) { this.dialogue.show('Barista', 'Serata tranquilla? Fammi sapere se ti serve qualcosa.'); return; }
    if (!bar.order) { this.dialogue.show('Barista', 'Prima trovatevi qualcuno a cui offrire da bere!'); return; }
    if (bar.carrying) { this.dialogue.show('Barista', `Il drink ce l'hai già: portalo a ${this.npcName(bar.order.girl)}!`); return; }
    this.holdPlayer();
    const opts = [...DRINKS.map(drinkLabel), 'Niente, grazie'];
    this.dialogue.ask('Barista', `Cosa vi preparo per ${this.npcName(bar.order.girl)}? (punti casa: ${questState.points || 0})`, opts, null, (i) => {
      if (i >= DRINKS.length) return;
      const r = buyDrink(i);
      if (r === 'poor') { this.dialogue.show('Barista', 'Non vi bastano i punti casa. Una birra invece?'); return; }
      if (r !== 'ok') return;
      this.inventory.refresh();
      this.showBanner(`${DRINKS[i].label} presa: portala a ${this.npcName(bar.order.girl)}!\n(Gabbo ne beve uno uguale)`, 0.3, '#8fd3ff', 0x8fd3ff);
    });
  }

  // A raised stage (map `stage`: { x0, y0, x1, y1, steps: { x0, x1 }, rise }):
  // the platform top, a front face along its bottom edge, two steps in the
  // middle, and invisible walls along the front except at the steps.
  drawStage(map) {
    for (const st of [].concat(map.stage || [])) this.drawOneStage(st); // one or several stages
  }

  drawOneStage(st) {
    const T = TILE;
    const x = st.x0 * T;
    const y = st.y0 * T;
    const w = (st.x1 - st.x0 + 1) * T;
    const h = (st.y1 - st.y0 + 1) * T;
    const face = (st.rise ?? 0.6) * T;
    const g = this.add.graphics().setDepth(1.5);
    g.fillStyle(0x3a2516, 1).fillRect(x, y, w, h);                          // boards
    g.lineStyle(2, 0x2a1a10, 1);
    for (let yy = y + T / 2; yy < y + h; yy += T / 2) g.lineBetween(x, yy, x + w, yy);
    g.fillStyle(0x1b120c, 1).fillRect(x, y + h - face, w, face);            // front face
    g.fillStyle(0xc9a23b, 1).fillRect(x, y + h - face, w, 3);               // brass edge
    // Two steps up, centred on st.steps.
    const sx = st.steps.x0 * T;
    const sw = (st.steps.x1 - st.steps.x0 + 1) * T;
    g.fillStyle(0x4a3220, 1).fillRect(sx, y + h - face, sw, face / 2);      // upper step
    g.fillStyle(0x5a3d27, 1).fillRect(sx - T * 0.25, y + h - face / 2, sw + T * 0.5, face / 2 + T * 0.35); // lower step
    g.lineStyle(2, 0x1b120c, 1).strokeRect(sx, y + h - face, sw, face / 2).strokeRect(sx - T * 0.25, y + h - face / 2, sw + T * 0.5, face / 2 + T * 0.35);
    // Walls along the front edge, except the steps.
    const wall = (wx, ww) => {
      if (ww <= 0) return;
      const zone = this.add.zone(wx + ww / 2, y + h - face / 2, ww, face);
      this.physics.add.existing(zone, true);
      this.walls.add(zone);
    };
    wall(x, sx - x);
    wall(sx + sw, x + w - (sx + sw));
    // Sides, where the stage doesn't touch a wall (the second room's stage).
    const g2 = this.map.grid;
    for (const [col, ex] of [[st.x0 - 1, x], [st.x1 + 1, x + w]]) {
      let open = false;
      for (let ty = st.y0; ty <= st.y1; ty++) if (g2[ty]?.[col] === TILES.FLOOR) open = true;
      if (!open) continue;
      const zone = this.add.zone(ex, y + h / 2, T * 0.3, h);
      this.physics.add.existing(zone, true);
      this.walls.add(zone);
      g.fillStyle(0x1b120c, 1).fillRect(ex - (ex === x ? 0 : 4), y, 4, h); // a dark edge
    }
  }

  // The bar island (map `barIsland`: { x0, y0, x1, y1 } tiles, the outer
  // square): a closed ring of counters with a barman walking round inside.
  // The whole square is solid; you order from any side (map `bar` zone).
  drawBarIsland(map) {
    const b = map.barIsland;
    if (!b) return;
    const T = TILE;
    const X0 = b.x0 * T;
    const Y0 = b.y0 * T;
    const X1 = (b.x1 + 1) * T;
    const Y1 = (b.y1 + 1) * T;
    const k = T * 0.75; // counter depth
    const TOP = 0x6b4a2e;
    const FACE = 0x2b1c12;
    const BRASS = 0xc9a23b;
    // Back + side counters: drawn under whoever is inside (the barman).
    const back = this.add.graphics().setDepth(Y0 + k);
    back.fillStyle(0x15131c, 1).fillRect(X0, Y0, X1 - X0, Y1 - Y0);          // floor inside
    back.fillStyle(TOP, 1).fillRect(X0, Y0, X1 - X0, k);                    // back counter
    back.fillStyle(FACE, 1).fillRect(X0 + k, Y0 + k, X1 - X0 - 2 * k, T * 0.3); // its inner face
    back.fillStyle(TOP, 1).fillRect(X0, Y0, k, Y1 - Y0).fillRect(X1 - k, Y0, k, Y1 - Y0); // sides
    const colors = [0x7dff4f, 0xffe04f, 0xff4fd8, 0x4fd9ff, 0xff8a3b, 0xffffff];
    for (let bx = X0 + 10, i = 0; bx < X1 - 10; bx += 13, i++) {            // bottles on the back counter
      back.fillStyle(colors[i % colors.length], 0.9).fillRect(bx, Y0 + 6, 6, k * 0.6);
    }
    // Front counter: drawn over the barman's legs.
    const front = this.add.graphics().setDepth(Y1 + 1);
    front.fillStyle(TOP, 1).fillRect(X0, Y1 - k, X1 - X0, k * 0.6);
    front.fillStyle(FACE, 1).fillRect(X0, Y1 - k * 0.4, X1 - X0, k * 0.4 + T * 0.25);
    front.fillStyle(BRASS, 1).fillRect(X0, Y1 - k * 0.4, X1 - X0, 3);
    front.lineStyle(3, 0x1b120c, 1).strokeRect(X0, Y0, X1 - X0, Y1 - Y0 + T * 0.25);
    this.add.text((X0 + X1) / 2, Y1 + T * 0.02, '🍸 BAR', { fontFamily: 'monospace', fontSize: '20px', fontStyle: 'bold', color: '#ffd54a' })
      .setOrigin(0.5, 0.5).setDepth(Y1 + 2);
    // Solid square (also for code-moved NPCs: Chiara's path avoids it).
    for (let ty = b.y0; ty <= b.y1; ty++) for (let tx = b.x0; tx <= b.x1; tx++) this.solidTiles.add(ty * 1000 + tx);
    const zone = this.add.zone((X0 + X1) / 2, (Y0 + Y1) / 2, X1 - X0, Y1 - Y0);
    this.physics.add.existing(zone, true);
    this.walls.add(zone);
    // The barman: a dark silhouette walking round the inside of the ring.
    this.barman = null;
    const key = b.barman || 'timo';
    if (!this.textures.exists(key)) return;
    sliceSheet(this, key);
    const sp = this.add.sprite(X0 + k + T * 0.5, Y0 + k, key, idleFrame('down')).setScale(PLAYER.SCALE * 0.9).setTint(0x1c1a26);
    const inX0 = X0 + k + T * 0.4;
    const inX1 = X1 - k - T * 0.4;
    const inY0 = Y0 + k - T * 0.2;          // sprite centre: his feet stay inside the ring
    const inY1 = Y1 - k - T * 1.2;
    this.barman = {
      sprite: sp, anims: createWalkAnims(this, key), facing: 'down',
      path: [[inX0, inY0], [inX1, inY0], [inX1, inY1], [inX0, inY1]], next: 1, waitUntil: 0,
    };
  }

  // The barman goes round the ring, stopping now and then at a corner.
  barmanTick(time, delta) {
    const m = this.barman;
    if (!m) return;
    const s = m.sprite;
    if (time < m.waitUntil) { this.animateMove(m, 0, 0); return; }
    const [tx, ty] = m.path[m.next];
    const dist = Math.hypot(tx - s.x, ty - s.y);
    const step = (70 * delta) / 1000;
    if (dist <= step) {
      s.setPosition(tx, ty);
      m.next = (m.next + 1) % m.path.length;
      if (Math.random() < 0.5) m.waitUntil = time + 600 + Math.random() * 1600;
      this.animateMove(m, 0, 0);
    } else {
      const dx = ((tx - s.x) * step) / dist;
      const dy = ((ty - s.y) * step) / dist;
      s.setPosition(s.x + dx, s.y + dy);
      this.animateMove(m, dx, dy);
    }
    s.setDepth(feetY(s));
  }

  // Chapter 8: talking to a girl at the Alcatraz (js/story/flirt.js).
  flirt(target) {
    const id = target.id;
    const g = GIRLS[id];
    const now = this.time.now;
    const name = target.name;
    const pk = target.portraitKey;
    if (g.trap) { this.chiaraPitch(target); return; }
    const st = girlState(id, now);
    if (now < st.cooldownUntil) { this.dialogue.show(name, g.busy, pk); return; }
    // Her drink.
    if (bar.order?.girl === id) {
      if (!bar.carrying) { this.dialogue.show(name, 'Allora, questo drink? Il bar è in fondo a destra.', pk); return; }
      const r = deliverDrink(id, now);
      this.dialogue.show(name, g.thanks, pk, () => this.gabboSays(GABBO.cheers, () => {
        this.showBanner(`🍺 Anche Gabbo ha bevuto (${gabboState.drunk})\nPiù beve, meno capisce...`, 0.3, '#ffb36b', 0xffb36b);
        if (r === 'win') this.dialogue.show(name, g.win, pk, () => this.gabboSays(GABBO.win, () => this.onNumber(target)));
      }));
      return;
    }
    if (st.mood === 'no') {
      const r = snub(id, now);
      this.dialogue.show(name, r === 'leave' ? [g.no, g.leave] : g.no, pk, r === 'leave' ? () => this.gabboSays(GABBO.gone) : null);
      return;
    }
    this.dialogue.show(name, g.hello, pk, () =>
      this.dialogue.ask('Gabbo', slur(GABBO.ask), APPROACHES.map((a) => a.label), 'gabbo-portrait', (choice) => {
        // A drunk Gabbo may say something else than what you told him.
        let i = choice;
        const garbled = Math.random() < garbleChance();
        if (garbled) i = (choice + Phaser.Math.Between(1, 2)) % APPROACHES.length;
        const r = approach(id, i, this.time.now);
        const outcome = () => {
          if (r.result === 'order') {
            this.dialogue.show(name, g.order, pk, () => this.gabboSays(GABBO.toBar, () =>
              this.showBanner(`🍹 Vai al BAR (in fondo a destra) e torna da ${name}\nentro ${Math.round(45)} secondi`, 0.3, '#8fd3ff', 0x8fd3ff)));
          } else if (r.result === 'dance') {
            this.dialogue.show(name, g.dance, pk, () => this.startDance(target));
          } else if (r.result === 'win') {
            this.dialogue.show(name, [g.right, g.win], pk, () => this.gabboSays(GABBO.win, () => this.onNumber(target)));
          } else if (r.result === 'leave') {
            this.dialogue.show(name, [r.delta > 0 ? g.right : g.wrong, g.leave], pk, () => this.gabboSays(GABBO.gone));
          } else {
            this.dialogue.show(name, r.result === 'ok' ? g.right : g.wrong, pk);
          }
        };
        this.gabboSays(APPROACHES[i].gabbo, () => (garbled ? this.gabboSays(GABBO.garbled, outcome) : outcome()));
      }));
  }

  // Dance challenge (DanceScene) over the paused world, on the club's beat.
  startDance(target) {
    const beat = MAPS[this.mapKey].beat || { bpm: 120, offset: 0 };
    this.holdPlayer();
    this.scene.pause();
    this.scene.launch('DanceScene', {
      girlId: target.id, girlName: target.name, need: GIRLS[target.id].danceNeed ?? 0.7,
      bpm: beat.bpm, offset: beat.offset, returnScene: 'WorldScene',
    });
  }

  // Called by DanceScene: a good dance = +1 ❤️ (her number once she's won over).
  onDanceDone(id, won) {
    const target = this.npcs.list.find((n) => n.id === id);
    if (!target) return;
    const g = GIRLS[id];
    const r = danceResult(id, won, this.time.now);
    if (r === 'win') {
      this.dialogue.show(target.name, [g.danceWin, g.win], target.portraitKey, () => this.gabboSays(GABBO.win, () => this.onNumber(target)));
    } else if (r === 'ok') {
      this.dialogue.show(target.name, g.danceWin, target.portraitKey);
    } else {
      this.dialogue.show(target.name, r === 'leave' ? [g.danceLose, g.leave] : g.danceLose, target.portraitKey);
    }
  }

  // Gabbo got the number: points, a heart with him, chapter progress.
  onNumber(target) {
    winNumber(target.id);
    questState.points = (questState.points || 0) + 10;
    this.bumpAffinity('gabbo', 1);
    this.showBanner(`📱 Gabbo ha il numero di ${target.name}!\n+10 punti casa · ora tutti sul palco`, 0.26, '#ff8ad8', 0xff8ad8);
    this.onProgress();
  }

  // Chiara's trap: you let Gabbo go home with her → the night is lost: back
  // home, Gabbo in the hall again, the front door takes you to the club again.
  gabboLeaves(target) {
    loseNight();
    this.warpLocked = true;
    this.holdPlayer();
    this.cameras.main.fadeOut(600);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.saveGame();
      this.scene.restart({ mapKey: START_MAP, spawnName: 'default', notice: GIRLS[target.id].lose });
    });
  }

  // Map `exits` (not warps): the entrance's front door. Stepping on one asks
  // js/story/alcatraz.js whether you can go out (chapter 8, after Gabbo);
  // otherwise a short line. Re-armed once you step off it.
  checkExits() {
    const exits = MAPS[this.mapKey].exits;
    if (!exits?.length) return;
    const b = this.player.body;
    const hit = exits.find((e) => b.right > e.tx * TILE && b.left < (e.tx + (e.w || DOOR_WIDTH)) * TILE
      && b.bottom > e.ty * TILE && b.top < (e.ty + (e.h || 1)) * TILE);
    if (!hit) { this.exitArmed = true; return; }
    if (!this.exitArmed || this.warpLocked) return;
    this.exitArmed = false;
    const st = exitState(hit.id);
    if (st === 'go') { this.startTrip(); return; }
    this.holdPlayer();
    this.say(null, st === 'needPartner' ? ALCATRAZ.needPartner : ALCATRAZ.locked);
  }

  // Out of the house: fade, the video cutscene (CutsceneScene) over the paused
  // world, then onCutsceneDone() lands you in the Alcatraz.
  startTrip() {
    this.warpLocked = true;
    this.holdPlayer();
    this.saveGame();
    if (this.audio?.music?.isPlaying) this.audio.music.pause();
    this.cameras.main.fadeOut(400);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.pause();
      this.scene.launch('CutsceneScene', { video: ALCATRAZ.video, title: ALCATRAZ.title, returnScene: 'WorldScene' });
    });
  }

  // Called by CutsceneScene when the clip ends (or is skipped).
  onCutsceneDone() {
    questState.setFlag(ALCATRAZ.arrivedFlag);
    this.scene.resume();
    if (this.audio?.music?.isPaused) this.audio.music.resume();
    this.scene.restart(ALCATRAZ.to);
  }
};
