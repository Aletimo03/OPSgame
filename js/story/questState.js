// js/story/questState.js
// Runtime progress for the storyline. A module-level singleton so progress
// survives scene restarts (warping between maps). No disk persistence yet —
// it resets on page reload. (A later step can serialise this to localStorage.)

// Stat keys a buff (or character) can carry.
const STAT_KEYS = ['maxHp', 'attack', 'defense'];

class QuestState {
  constructor() {
    this.activeChapter = 'chapter-1';
    this.greeted = new Set();  // npc ids the player has talked to (interact quests)
    this.defeated = new Set(); // npc ids beaten in battle (fight quests)
    this.solved = new Set();   // npc ids whose quiz was answered right (quiz quests)
    this.visited = new Set();  // map keys the player has entered (explore quests)
    this.flags = new Set();    // arbitrary named flags (custom quest logic)
    this.items = [];           // { name, description, buff? } — items collected (search quests)
    this.buffs = { maxHp: 0, attack: 0, defense: 0 }; // cumulative item bonuses
  }

  // ── interact quests ───────────────────────────────────────────────────────
  greet(npcId) {
    if (!npcId) return;
    this.greeted.add(npcId);
  }

  isGreeted(npcId) {
    return this.greeted.has(npcId);
  }

  // ── fight quests ──────────────────────────────────────────────────────────
  defeat(npcId) {
    if (!npcId) return;
    this.defeated.add(npcId);
  }

  isDefeated(npcId) {
    return this.defeated.has(npcId);
  }

  // ── quiz quests ───────────────────────────────────────────────────────────
  solve(npcId) {
    if (!npcId) return;
    this.solved.add(npcId);
  }

  isSolved(npcId) {
    return this.solved.has(npcId);
  }

  // ── explore quests ────────────────────────────────────────────────────────
  visit(mapKey) {
    if (!mapKey) return;
    this.visited.add(mapKey);
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
    }
  }

  hasItem(name) {
    return this.items.some((i) => i.name === name);
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
}

export const questState = new QuestState();
