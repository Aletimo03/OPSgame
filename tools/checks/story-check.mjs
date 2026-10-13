// tools/checks/story-check.mjs
// Static check of the whole story + save system, using the REAL game modules
// (no browser, no Phaser). Run from the project root after any change to
// chapters, character JSONs or maps:
//
//     node --no-warnings tools/checks/story-check.mjs
//
// Checks:
//   1. every character `locations[ch].map` resolves to a real map;
//   2. a worst-case playthrough: in every chapter, BEFORE doing the objectives,
//      talk to every other NPC placed there and enter every other map — no
//      chapter may start with an objective already ticked, noise alone must not
//      complete it, every objective must be doable (NPC / item giver actually
//      placed that chapter, visit target is a real map), and it must complete;
//   3. save → load round-trip and the corrupt / incompatible save fallbacks;
//   4. hero HP rules (persisting, +maxHp items heal) and the defeat respawn
//      point; every seat (`props[].seats`) in every map is reachable on foot.
// Exits with code 1 on any failure.
//
// `talk()` mirrors WorldScene.tryInteract's branch order (battle → quiz → item →
// plain) and assumes every fight is won. Keep it in sync if that flow changes.
import fs from 'node:fs';

const ROOT = new URL('../../', import.meta.url);

// In-memory localStorage, installed BEFORE save.js is imported.
const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
};

const imp = (p) => import(new URL(p, ROOT).href);
const { questState } = await imp('js/story/questState.js');
const { CHAPTERS, activeQuest, advanceChapterIfDone, isStoryComplete } = await imp('js/story/chapters.js');
const { writeSave, loadSave, clearSave, applySave } = await imp('js/core/save.js');
const { MAPS, START_MAP } = await imp('maps/index.js');
const { resolveSpawn } = await imp('maps/spawn-points/spawn-points.js');
const { DEFEAT_RESPAWN } = await imp('js/config.js');
const { propColliders } = await imp('js/core/props.js');
const { FURNITURE } = await imp('js/core/furniture-catalog.js');
const { FURNITURE_ERRORS, checkFurnitureEntry } = await imp('js/core/furniture.js');

// CHARACTERS lives in js/core/characters.js, which only needs the game at call
// time — reading the array from the source keeps this script Phaser-free.
const src = fs.readFileSync(new URL('js/core/characters.js', ROOT), 'utf8');
const NPCS = [...src.match(/export const CHARACTERS = \[([^\]]*)\]/)[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
const DATA = Object.fromEntries(
  NPCS.map((n) => [n, JSON.parse(fs.readFileSync(new URL(`assets/characters/${n}/character.json`, ROOT)))])
);

let fails = 0;
const check = (cond, msg) => {
  if (!cond) {
    fails++;
    console.log(`FAIL  ${msg}`);
  }
  return cond;
};

function talk(id) {
  const entry = DATA[id].chapters?.[questState.activeChapter];
  questState.greet(id);
  if (entry?.battle) {
    const ch = questState.activeChapter;
    advanceChapterIfDone();
    if (!questState.didIn('defeated', id, ch)) questState.defeat(id, ch); // assume a win
  } else if (entry?.quiz) {
    if (!questState.didIn('solved', id)) questState.solve(id); // assume the right answer
  } else if (entry?.item) {
    if (entry.item.consumable) {
      if (!questState.gotGiftFrom(id)) questState.addSupply(entry.item, id);
    } else {
      questState.addItem(entry.item);
    }
  }
  advanceChapterIfDone();
}
const enter = (mapKey) => {
  questState.visit(mapKey);
  advanceChapterIfDone();
};
const pending = () => activeQuest().objectives.filter((o) => !o.done).map((o) => o.label).join(', ');

// ── 1. placements resolve ────────────────────────────────────────────────────
for (const n of NPCS) {
  for (const [ch, loc] of Object.entries(DATA[n].locations || {})) {
    check(MAPS[resolveSpawn(loc.map).map], `${n}.locations.${ch}.map "${loc.map}" is not a map or spawn point`);
    check(CHAPTERS[ch], `${n}.locations has "${ch}", which is not a registered chapter`);
  }
}

// ── 2. worst-case playthrough ────────────────────────────────────────────────
questState.reset();
const order = Object.keys(CHAPTERS);
for (const ch of order) {
  if (!check(questState.activeChapter === ch, `story never reached ${ch} (stuck in ${questState.activeChapter}: ${pending()})`)) break;
  const pre = activeQuest().objectives.filter((o) => o.done && !(o.visit && o.visit === questState.currentMap));
  check(pre.length === 0, `${ch} starts with objectives already done: ${pre.map((o) => o.label).join(', ')}`);

  const objectives = CHAPTERS[ch].quest.objectives;
  const targets = new Set(objectives.flatMap((o) => [o.npc, o.defeat, o.quiz, o.visit]).filter(Boolean));
  for (const n of NPCS) {
    const placed = DATA[n].locations?.[ch];
    if (placed && !targets.has(n) && !DATA[n].chapters?.[ch]?.item && questState.activeChapter === ch) talk(n);
  }
  for (const m of Object.keys(MAPS)) if (!targets.has(m) && questState.activeChapter === ch) enter(m);
  check(questState.activeChapter === ch, `${ch} was completed by unrelated actions`);

  for (const o of objectives) {
    if (questState.activeChapter !== ch) break;
    if (o.visit) {
      if (check(MAPS[o.visit], `${ch}: visit target "${o.visit}" is not a map`)) enter(o.visit);
    } else if (o.item) {
      const giver = NPCS.find((n) => DATA[n].chapters?.[ch]?.item?.name === o.item && DATA[n].locations?.[ch]);
      if (check(giver, `${ch}: nobody placed in ${ch} gives "${o.item}" (soft-lock)`)) talk(giver);
    } else if (o.flag) {
      console.log(`note  ${ch}: flag objective "${o.flag}" can't be simulated — setting it`);
      questState.setFlag(o.flag);
      advanceChapterIfDone();
    } else {
      const id = o.npc || o.defeat || o.quiz;
      const entry = DATA[id]?.chapters?.[ch];
      if (!check(DATA[id]?.locations?.[ch], `${ch}: "${id}" is an objective but isn't placed in ${ch} (soft-lock)`)) continue;
      if (o.defeat) check(entry?.battle, `${ch}: defeat "${id}" but their ${ch} entry has no battle block`);
      if (o.quiz) check(entry?.quiz, `${ch}: quiz "${id}" but their ${ch} entry has no quiz block`);
      talk(id);
    }
  }
  const last = ch === order[order.length - 1];
  check(last ? activeQuest().complete : questState.activeChapter !== ch, `${ch} did not complete (left: ${pending()})`);
  if (!last) check(!isStoryComplete(), `isStoryComplete() is already true in ${ch}`);
}
check(isStoryComplete(), 'isStoryComplete() is false after the last chapter (no ending screen)');

// Consumables: given once per chapter per giver, counted, usable, saved.
for (const n of NPCS) {
  for (const [ch, e] of Object.entries(DATA[n].chapters || {})) {
    if (!e.item?.consumable) continue;
    check(e.item.heal > 0, `${n}.${ch}: consumable "${e.item.name}" has no heal`);
    check(DATA[n].locations?.[ch], `${n}.${ch}: gives "${e.item.name}" but isn't placed in ${ch}`);
  }
}
const sup = Object.values(questState.supplies);
check(sup.length > 0 && sup.every((x) => x.qty >= 1), 'consumables were not collected during the playthrough');

// ── 3. save / load ───────────────────────────────────────────────────────────
questState.reset();
questState.activeChapter = order[Math.min(2, order.length - 1)];
questState.greet('x');
questState.visit(START_MAP);
questState.setFlag('f');
questState.addItem({ name: 'Test', buff: { attack: 3 } });
questState.heroHp = 17;
const snap = JSON.stringify(questState.toJSON());
check(writeSave({ mapKey: START_MAP, x: 100, y: 100, facing: 'left' }), 'writeSave failed');
questState.reset();
const saved = loadSave();
if (check(saved, 'loadSave returned nothing')) {
  const start = applySave(saved);
  check(JSON.stringify(questState.toJSON()) === snap, 'questState does not round-trip through the save');
  check(questState.buffs.attack === 3, 'buffs are not re-derived from items on load');
  check(start.mapKey === START_MAP && start.spawnPos?.x === 100 && start.facing === 'left', 'start data != saved position');
  check(applySave({ ...saved, x: 1e9 }).spawnPos === null, 'out-of-bounds position is not rejected');
  check(applySave({ ...saved, mapKey: '??' }).mapKey === START_MAP, 'unknown map does not fall back to START_MAP');
  store.set('opsgame-save', '{bad');
  check(loadSave() === null, 'corrupt save is not ignored');
  store.set('opsgame-save', JSON.stringify({ ...saved, quest: { ...saved.quest, activeChapter: '??' } }));
  check(loadSave() === null, 'save with an unknown chapter is not ignored');
}
clearSave();
check(loadSave() === null, 'clearSave did not clear');

// ── 4. hero HP, defeat respawn, seats ────────────────────────────────────────
questState.reset();
check(questState.currentHp(30) === 30, 'a new game does not start at full HP');
questState.setHp(12, 30);
check(questState.currentHp(30) === 12, 'damage is not kept between battles');
questState.addItem({ name: 'Cuore', buff: { maxHp: 10 } });
check(questState.currentHp(40) === 22, 'a +maxHp item does not heal by the same amount');
questState.setHp(99, 40);
check(questState.heroHp === null, 'healing past max does not clamp to full');

const rm = MAPS[DEFEAT_RESPAWN.mapKey];
const rs = rm?.spawns[DEFEAT_RESPAWN.spawnName];
check(rs && rm.grid[rs.ty]?.[rs.tx] === 0, `defeat respawn ${DEFEAT_RESPAWN.mapKey}/${DEFEAT_RESPAWN.spawnName} is missing or not on floor`);

// Player feet box relative to the sprite centre, in tiles (WorldScene body:
// lower 68–96% of a ~3.08-tile frame, half its width). Flood-fill on a ¼-tile
// lattice from the default spawn; a seat counts if the feet centre fits in it.
const FX = 0.43, FY0 = 0.55, FY1 = 1.42, STEP = 0.25;
let seatCount = 0;
for (const [key, map] of Object.entries(MAPS)) {
  const seats = (map.props || []).flatMap((p) => (p.seats || []).map((s, i) => ({ ...s, prop: p.key, n: i + 1 })));
  if (!seats.length) continue;
  const g = map.grid, R = g.length, C = g[0].length;
  const boxes = (map.props || []).filter((p) => p.solid).flatMap((p) => propColliders(p));
  const ok = (cx, cy) => {
    const x0 = cx - FX, x1 = cx + FX, y0 = cy + FY0, y1 = cy + FY1;
    if (x0 < 0 || y0 < 0 || x1 > C || y1 > R) return false;
    for (let ty = Math.floor(y0); ty <= Math.ceil(y1) - 1; ty++)
      for (let tx = Math.floor(x0); tx <= Math.ceil(x1) - 1; tx++) if (g[ty][tx] === 1) return false;
    return !boxes.some((b) => x0 < b.tx + b.w && x1 > b.tx && y0 < b.ty + b.h && y1 > b.ty);
  };
  const sp = map.spawns.default;
  const start = [Math.round((sp.tx + 0.5) / STEP), Math.round((sp.ty + 0.5) / STEP)];
  const seen = new Set([start.join()]), q = [start];
  while (q.length) {
    const [i, j] = q.shift();
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const n = [i + di, j + dj], k = n.join();
      if (!seen.has(k) && ok(n[0] * STEP, n[1] * STEP)) { seen.add(k); q.push(n); }
    }
  }
  const pts = [...seen].map((k) => k.split(',').map(Number));
  seats.forEach((s) => {
    seatCount++;
    check(['up', 'down', 'left', 'right'].includes(s.facing), `${key}: seat ${s.n} of ${s.prop} has an invalid facing`);
    check(pts.some(([i, j]) => {
      const x = i * STEP, fy = j * STEP + (FY0 + FY1) / 2;
      return x >= s.tx && x <= s.tx + s.w && fy >= s.ty && fy <= s.ty + s.h;
    }), `${key}: seat ${s.n} of ${s.prop} can't be reached on foot`);
  });
}

// Orientable furniture: every catalogue view is well-formed, every map entry
// expanded, and every prop image (plain or catalogue) exists on disk.
let views = 0;
for (const [type, def] of Object.entries(FURNITURE)) {
  for (const dir of Object.keys(def.dirs || {})) {
    views++;
    checkFurnitureEntry(type, dir).forEach((m) => check(false, `furniture catalogue: ${m}`));
  }
}
FURNITURE_ERRORS.forEach((m) => check(false, `furniture in map ${m}`));
for (const [key, map] of Object.entries(MAPS)) {
  for (const p of map.props || []) {
    check(p.key && p.path, `${key}: a prop has no key/path`);
    if (p.path) check(fs.existsSync(new URL(p.path, ROOT)), `${key}: prop image ${p.path} is missing`);
  }
}

console.log(fails ? `\n${fails} problem(s) found.` : `OK — ${order.length} chapters, ${NPCS.length} characters, ${Object.keys(MAPS).length} maps, save system, hero HP, ${seatCount} seats, ${views} furniture views.`);
process.exit(fails ? 1 : 0);
