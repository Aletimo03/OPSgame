// js/story/questState.js
// Runtime progress for the storyline. A module-level singleton so progress
// survives scene restarts (warping between maps). Persisted to localStorage by
// js/core/save.js via toJSON() / restore().

// Stat keys a buff (or character) can carry.
const STAT_KEYS = ['maxHp', 'attack', 'defense'];

// Action kinds. Each one is kept twice:
//   • a global "ever happened" Set (e.g. this.greeted) — for lines like
//     "you already beat me" that don't care about chapters;
//   • a per-chapter log entry `${chapter}|${kind}|${id}` — what quest
//     OBJECTIVES check (chapters.js objectiveDone). So an objective only counts
//     actions taken while its own chapter is active: greeting Ana in chapter 1
//     can never pre-complete "talk to Ana" in chapter 8.
const KINDS = ['greeted', 'defeated', 'solved', 'visited'];

class QuestState {
  constructor() {
    this.reset();
  }

  // Wipe all progress back to a brand-new game.
  reset() {
    this.activeChapter = 'chapter-1';
    this.greeted = new Set();  // npc ids the player has talked to (interact quests)
    this.defeated = new Set(); // npc ids beaten in battle (fight quests)
    this.solved = new Set();   // npc ids whose quiz was answered right (quiz quests)
    this.visited = new Set();  // map keys the player has entered (explore quests)
    this.flags = new Set();    // arbitrary named flags (custom quest logic) — global state
    this.log = new Set();      // `${chapter}|${kind}|${id}` — actions per chapter (see KINDS)
    this.items = [];           // { name, description, buff? } — items collected (search quests)
    this.buffs = { maxHp: 0, attack: 0, defense: 0 }; // cumulative item bonuses
    this.currentMap = null;    // last map entered (re-credited as a visit when a chapter starts)
    this.heroHp = null;        // hero HP outside battle; null = full. Persists between fights.
    this.supplies = {};        // consumables: { [name]: { name, description, heal, qty } }
    this.stats = { playMs: 0, wins: 0, losses: 0 }; // for the ending screen
  }

  // ── consumables (usable in battle from the Zaino menu) ─────────────────────
  // An NPC `item` with `consumable: true` gives `qty` (default 1) units that heal
  // `heal` HP each. Unlike permanent items they can be given again in another
  // chapter (once per chapter per giver — see gotGiftFrom).
  addSupply(item, fromNpc) {
    const s = this.supplies[item.name] || (this.supplies[item.name] = {
      name: item.name, description: item.description || '', heal: item.heal || 0, qty: 0,
    });
    s.qty += item.qty ?? 1;
    if (fromNpc) this.log.add(`${this.activeChapter}|gift|${fromNpc}`);
  }

  gotGiftFrom(npcId, chapter = this.activeChapter) {
    return this.log.has(`${chapter}|gift|${npcId}`);
  }

  // Consume one unit; returns its heal amount (0 if none left).
  useSupply(name) {
    const s = this.supplies[name];
    if (!s || s.qty < 1) return 0;
    s.qty--;
    return s.heal;
  }

  suppliesLeft() {
    return Object.values(this.supplies).filter((s) => s.qty > 0);
  }

  // ── hero HP (persists between battles) ────────────────────────────────────
  // `maxHp` comes from heroStats() (base + item buffs), so callers pass it in.
  currentHp(maxHp) {
    return this.heroHp == null ? maxHp : Math.max(0, Math.min(this.heroHp, maxHp));
  }

  setHp(hp, maxHp) {
    this.heroHp = hp >= maxHp ? null : Math.max(0, Math.round(hp));
  }

  // Record an action globally AND against the chapter it happened in.
  // `chapter` defaults to the active one; pass it explicitly when the action
  // belongs to a chapter that has since rolled forward (e.g. a battle started
  // in chapter 2 that ends after chapter 2's greet objective already advanced).
  _record(kind, id, chapter = this.activeChapter) {
    if (!id) return;
    this[kind].add(id);
    this.log.add(`${chapter}|${kind}|${id}`);
  }

  // Did this action happen while `chapter` (default: the active one) was active?
  didIn(kind, id, chapter = this.activeChapter) {
    return this.log.has(`${chapter}|${kind}|${id}`);
  }

  // ── interact quests ───────────────────────────────────────────────────────
  greet(npcId, chapter) {
    this._record('greeted', npcId, chapter);
  }

  isGreeted(npcId) {
    return this.greeted.has(npcId);
  }

  // ── fight quests ──────────────────────────────────────────────────────────
  defeat(npcId, chapter) {
    this._record('defeated', npcId, chapter);
  }

  isDefeated(npcId) {
    return this.defeated.has(npcId);
  }

  // ── quiz quests ───────────────────────────────────────────────────────────
  solve(npcId, chapter) {
    this._record('solved', npcId, chapter);
  }

  isSolved(npcId) {
    return this.solved.has(npcId);
  }

  // ── explore quests ────────────────────────────────────────────────────────
  visit(mapKey, chapter) {
    if (!mapKey) return;
    this.currentMap = mapKey;
    this._record('visited', mapKey, chapter);
  }

  hasVisited(mapKey) {
    return this.visited.has(mapKey);
  }

  // ── generic flags (custom objectives) ─────────────────────────────────────
  setFlag(name) {
    if (!name) return;
    this.flags.add(name);
  }

  hasFlag(name) {
    return this.flags.has(name);
  }

  // Add an item once. If it carries a `buff: { attack: +5, ... }`, fold those
  // bonuses into the protagonist's cumulative buffs.
  addItem(item) {
    if (this.hasItem(item.name)) return;
    this.items.push(item);
    if (item.buff) {
      for (const k of STAT_KEYS) {
        if (item.buff[k]) this.buffs[k] += item.buff[k];
      }
      // A +maxHp item also heals by the same amount (when not already full).
      if (item.buff.maxHp && this.heroHp != null) this.heroHp += item.buff.maxHp;
    }
  }

  // Ever obtained (a permanent item, or a consumable even if used up since).
  hasItem(name) {
    return this.items.some((i) => i.name === name) || name in this.supplies;
  }

  // Apply collected buffs on top of a character's base stats.
  heroStats(base) {
    const b = base || {};
    return {
      maxHp:   (b.maxHp   ?? 30) + this.buffs.maxHp,
      attack:  (b.attack  ?? 5)  + this.buffs.attack,
      defense: (b.defense ?? 2)  + this.buffs.defense,
    };
  }

  // ── persistence (see js/core/save.js) ─────────────────────────────────────
  // Plain-JSON snapshot. Buffs are NOT stored: they're re-derived from items on
  // restore, so tuning an item's buff in its JSON applies to old saves too.
  toJSON() {
    return {
      activeChapter: this.activeChapter,
      greeted: [...this.greeted],
      defeated: [...this.defeated],
      solved: [...this.solved],
      visited: [...this.visited],
      flags: [...this.flags],
      log: [...this.log],
      items: this.items.map((i) => ({ ...i })),
      currentMap: this.currentMap,
      heroHp: this.heroHp,
      supplies: Object.values(this.supplies).map((x) => ({ ...x })),
      stats: { ...this.stats },
    };
  }

  // Load a toJSON() snapshot (tolerant of missing/garbage fields).
  restore(data) {
    this.reset();
    if (!data || typeof data !== 'object') return;
    if (typeof data.activeChapter === 'string') this.activeChapter = data.activeChapter;
    for (const k of [...KINDS, 'flags', 'log']) {
      if (Array.isArray(data[k])) this[k] = new Set(data[k]);
    }
    if (Array.isArray(data.items)) {
      data.items.forEach((it) => it && it.name && this.addItem(it));
    }
    if (typeof data.currentMap === 'string') this.currentMap = data.currentMap;
    if (Number.isFinite(data.heroHp)) this.heroHp = data.heroHp; // after items (addItem heals)
    if (Array.isArray(data.supplies)) {
      for (const x of data.supplies) if (x && x.name) this.supplies[x.name] = { ...x };
    }
    if (data.stats && typeof data.stats === 'object') {
      for (const k of Object.keys(this.stats)) {
        if (Number.isFinite(data.stats[k])) this.stats[k] = data.stats[k];
      }
    }
  }
}

export const questState = new QuestState();
