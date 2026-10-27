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
//      point; every seat (`props[].seats`) in every map is reachable on foot;
//   5. every flag objective has something in the game that sets it (a find,
//      an event, a character's `setFlag`, a scripted loss, a map flag zone or
//      one of the minigames' flags), and every story find can be examined.
// Exits with code 1 on any failure.
//
// `talk()` mirrors WorldScene.tryInteract's branch order (battle → quiz → item →
// plain), with the same `when` / `setFlag` resolution (resolveInteraction), and
// assumes every fight is won (a `mustLose` one sets its loss flag instead).
// Keep it in sync if that flow changes.
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
const { HIDDEN, KINDS: COLLECTIBLE_KINDS } = await imp('js/story/collectibles.js');
const { SIDE_QUESTS, SHOP } = await imp('js/story/sideQuests.js');
const { FINDS, findFlag } = await imp('js/story/finds.js');
const { resolveInteraction } = await imp('js/core/characters.js');
const { ALCATRAZ } = await imp('js/story/alcatraz.js');
const { DREAM } = await imp('js/story/dream.js');
const { rewindTo, rewindChoices, itemChaptersFrom, devPrime } = await imp('js/story/rewind.js');
const { AFFINITY_DMS } = await imp('js/story/affinity.js');
const { EVENTS } = await imp('js/story/events.js');
const { FRIDGE } = await imp('js/story/fridge.js');

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
  const act = resolveInteraction(DATA[id]);
  questState.greet(id);
  if (act.battle) {
    const ch = questState.activeChapter;
    advanceChapterIfDone();
    if (act.battle.mustLose) questState.setFlag(act.battle.lossFlag); // lost by the script
    else if (!questState.didIn('defeated', id, ch)) {
      questState.defeat(id, ch); // assume a win
      if (act.battle.reward) questState.addItem(act.battle.reward);
    }
  } else if (act.quiz) {
    if (!questState.didIn('solved', id)) questState.solve(id); // assume the right answer
  } else if (act.item) {
    if (act.item.consumable) {
      if (!questState.gotGiftFrom(id)) questState.addSupply(act.item, id);
    } else {
      questState.addItem(act.item);
    }
    if (act.setFlag) questState.setFlag(act.setFlag);
  } else if (act.setFlag) {
    questState.setFlag(act.setFlag);
  }
  advanceChapterIfDone();
}

// Flags something in the game can set, per chapter (null = any chapter).
const PRODUCERS = [];
const produce = (flag, chapter = null) => PRODUCERS.push({ flag, chapter });
for (const f of FINDS) produce(findFlag(f.id), f.chapter);
for (const n of NPCS) {
  for (const [ch, e] of Object.entries(DATA[n].chapters || {})) {
    for (const v of [e, ...(e.when || [])]) if (v.setFlag) produce(v.setFlag, ch);
    if (e.battle?.lossFlag) produce(e.battle.lossFlag, ch);
  }
}
for (const m of Object.values(MAPS)) for (const z of m.flagZones || []) produce(z.flag, z.chapter || null);
produce(ALCATRAZ.arrivedFlag, ALCATRAZ.chapter);
produce('alcatraz-number', ALCATRAZ.chapter); // js/story/flirt.js winNumber
produce(DREAM.enteredFlag, DREAM.chapter);
produce(DREAM.trashFlag, DREAM.chapter);
produce(DREAM.wokeLinesFlag, DREAM.chapter); // his waking lines in the dream house
produce(FRIDGE.flags.clean, FRIDGE.chapter);
produce(FRIDGE.flags.thrown, FRIDGE.chapter);
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
    for (const alt of loc.alt || []) {
      check(MAPS[resolveSpawn(alt.map).map], `${n}.locations.${ch}.alt map "${alt.map}" is not a map or spawn point`);
      check(alt.flag, `${n}.locations.${ch}.alt entry without a flag`);
    }
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
  const targets = new Set(objectives.flatMap((o) => [o.npc, o.defeat, o.quiz, o.visit, o.at]).filter(Boolean));
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
      if (o.at && check(DATA[o.at]?.locations?.[ch], `${ch}: "${o.at}" (flag "${o.flag}") isn't placed in ${ch} (soft-lock)`)) talk(o.at);
      if (questState.activeChapter !== ch || questState.hasFlag(o.flag)) continue;
      const evt = o.flag.startsWith('event:') && EVENTS.find((e) => `event:${e.id}` === o.flag);
      check(evt ? evt.chapter === ch : PRODUCERS.some((p) => p.flag === o.flag && (!p.chapter || p.chapter === ch)),
        `${ch}: nothing in the game sets the flag objective "${o.flag}" in ${ch} (soft-lock)`);
      if (o.after) check(objectives.some((x) => x.flag === o.after) || PRODUCERS.some((p) => p.flag === o.after) || o.after.startsWith('event:'),
        `${ch}: objective "${o.label}" waits for an unknown flag "${o.after}"`);
      questState.setFlag(o.flag); // a find / event / minigame: done by hand in the game
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
  check(start.mapKey === START_MAP && !start.spawnPos, 'loading must always start in Zio Nick\'s room (START_MAP)');
  store.set('opsgame-save', '{bad');
  check(loadSave() === null, 'corrupt save is not ignored');
  store.set('opsgame-save', JSON.stringify({ ...saved, quest: { ...saved.quest, activeChapter: '??' } }));
  check(loadSave() === null, 'save with an unknown chapter is not ignored');
}
clearSave();
check(loadSave() === null, 'clearSave did not clear');

// ── 3b. chapter select (rewind) ─────────────────────────────────────────────
// Play the whole story (worst case, as above), rewind to the middle chapter,
// and check that chapter + later are fresh while earlier ones stay done.
{
  questState.reset();
  const itemCh = itemChaptersFrom(DATA);
  const mid = order[Math.floor(order.length / 2)];
  // fake a finished run: every chapter visited/greeted, all items, all flags
  for (const ch of order) {
    questState.activeChapter = ch;
    questState.greet('ana', ch);
    questState.setFlag(`card:${ch}`);
  }
  for (const [name, ch] of Object.entries(itemCh)) questState.addItem({ name, buff: { attack: 1 } });
  questState.reached = order[order.length - 1];
  questState.setFlag('ending-seen');
  questState.points = 7;
  check(rewindChoices().length === order.length, 'chapter select does not offer every reached chapter');
  rewindTo(mid, itemCh);
  const later = order.slice(order.indexOf(mid));
  check(questState.activeChapter === mid, 'rewind: wrong active chapter');
  check(later.every((ch) => !questState.didIn('greeted', 'ana', ch)), 'rewind: later chapters still have actions logged');
  check(order.slice(0, order.indexOf(mid)).every((ch) => questState.didIn('greeted', 'ana', ch)), 'rewind: earlier chapters lost their log');
  check(questState.items.every((it) => !later.includes(itemCh[it.name])), 'rewind: items from later chapters kept');
  check(!questState.hasFlag('ending-seen') && !questState.hasFlag(`card:${mid}`), 'rewind: later flags kept');
  check(questState.points === 7 && questState.reached === order[order.length - 1], 'rewind: lost points or furthest chapter');
  check(!activeQuest().complete, `rewind: ${mid} starts already complete`);
}

// ── 3c. DEV chapter select (devPrime) ───────────────────────────────────────
// Every chapter can be started fresh: active, not already complete, earlier
// chapters' items in the bag.
{
  const itemCh = itemChaptersFrom(DATA);
  for (const id of order) {
    devPrime(id, DATA);
    check(questState.activeChapter === id && !activeQuest().complete, `devPrime: ${id} is not a fresh start`);
    const early = Object.entries(itemCh).filter(([, ch]) => order.indexOf(ch) < order.indexOf(id)).map(([n]) => n);
    check(early.every((n) => questState.hasItem(n)), `devPrime: ${id} misses earlier items`);
    const start = CHAPTERS[id].devStart;
    check(!start || MAPS[start.mapKey]?.spawns[start.spawnName], `${id}: devStart ${start?.mapKey}/${start?.spawnName} is not a spawn`);
  }
}

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

// Collectibles: unique ids, known kinds, and each one findable — some spot the
// player can walk to has the point one tile ahead (WorldScene.tryExamine:
// body centre + facing × 1 tile) within 0.4 tile of the prop's collider.
{
  const ids = new Set();
  for (const h of HIDDEN) {
    check(!ids.has(h.id), `collectible id '${h.id}' is used twice`);
    ids.add(h.id);
    check(COLLECTIBLE_KINDS[h.kind], `collectible '${h.id}' has unknown kind '${h.kind}'`);
  }
  for (const [key, map] of Object.entries(MAPS)) {
    const hiddenProps = (map.props || []).filter((p) => p.hidden || p.side
      || FINDS.some((f) => f.map === key && f.furniture === p.furniture));
    if (!hiddenProps.length) continue;
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
    for (const p of hiddenProps) {
      const cols = propColliders(p), M = 0.4;
      const findable = pts.some(([i, j]) => [[0, -1], [0, 1], [-1, 0], [1, 0]].some(([dx, dy]) => {
        const x = i * STEP + dx, y = j * STEP + (FY0 + FY1) / 2 + dy;
        return cols.some((c) => x >= c.tx - M && x <= c.tx + c.w + M && y >= c.ty - M && y <= c.ty + c.h + M);
      }));
      check(findable, `${key}: '${p.hidden?.id || p.side || p.furniture}' in ${p.key} can't be examined from anywhere reachable`);
    }
  }
}

// Side quests: unique ids, a giver placed in some chapter from `from` on, a
// valid start chapter, exactly one prop carrying the thing; shop prices sane.
{
  const ids = new Set();
  for (const q of SIDE_QUESTS) {
    check(!ids.has(q.id), `side quest id '${q.id}' is used twice`);
    ids.add(q.id);
    check(order.includes(q.from), `side quest '${q.id}': unknown start chapter ${q.from}`);
    const later = order.slice(order.indexOf(q.from));
    check(later.some((ch) => DATA[q.giver]?.locations?.[ch]), `side quest '${q.id}': giver ${q.giver} is never placed from ${q.from} on`);
    const props = Object.values(MAPS).flatMap((m) => (m.props || []).filter((p) => p.side === q.id));
    check(props.length === 1, `side quest '${q.id}': ${props.length} props carry its thing (need exactly 1)`);
    check(q.points > 0 && q.ask?.length && q.thanks?.length && q.remind, `side quest '${q.id}': missing points/texts`);
  }
  // Story finds: known chapter and map, exactly one such furniture there (or a
  // zone), unique ids; zones are checked for reachability further down.
  {
    const ids = new Set();
    for (const f of FINDS) {
      check(!ids.has(f.id), `find '${f.id}' is used twice`);
      ids.add(f.id);
      check(order.includes(f.chapter) && MAPS[f.map], `find '${f.id}': unknown chapter or map`);
      if (f.furniture) {
        const n = (MAPS[f.map]?.props || []).filter((p) => p.furniture === f.furniture).length;
        check(n === 1, `find '${f.id}': ${n} '${f.furniture}' in ${f.map} (need exactly 1)`);
      } else check(f.zone, `find '${f.id}': neither furniture nor zone`);
      check(f.lines?.length && (!f.needsItem || f.locked?.length), `find '${f.id}': missing lines`);
    }
  }
  // Events: known map/chapter, speakers are characters, at least one of them is
  // placed in that map in that chapter (else the scene would be empty).
  for (const e of EVENTS) {
    check(MAPS[e.map] && order.includes(e.chapter), `event '${e.id}': unknown map or chapter`);
    check(e.lines.every((l) => (NPCS.includes(l.who) || l.who === 'zionick') && l.text), `event '${e.id}': bad line`);
    const placed = e.lines.filter((l) => resolveSpawn(DATA[l.who]?.locations?.[e.chapter]?.map || '')?.map === e.map);
    check(placed.length > 0, `event '${e.id}': nobody who speaks is in ${e.map} in ${e.chapter}`);
    if (e.gift) check(e.gift.consumable ? e.gift.heal > 0 : e.gift.buff, `event '${e.id}': bad gift`);
  }
  // Affinity messages: known characters, texts present, thresholds in range.
  for (const [id, list] of Object.entries(AFFINITY_DMS)) {
    check(NPCS.includes(id), `affinity: unknown character '${id}'`);
    for (const m of list) check((m.text || m.sticker) && m.at >= 1 && m.at <= 5, `affinity: bad message for ${id}`);
  }
  for (const it of SHOP) check(it.price > 0 && (it.consumable ? it.heal > 0 : it.buff), `shop item '${it.name}' is malformed`);
}

// Every chapter has a valid start time for the in-game clock (js/story/clock.js).
for (const id of order) check(/^\d{1,2}:\d{2}$/.test(CHAPTERS[id].time || ''), `${id}: missing or bad \`time\` ('HH:MM')`);

// Every map: from its default spawn, on foot (feet box vs walls + solid
// furniture), every other spawn and every warp must be reachable. Catches
// furniture that walls off a door, an anteroom or a spawn.
function floodFill(map) {
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
  return { ok, pts: [...seen].map((k) => k.split(',').map(Number)) };
}
for (const [key, map] of Object.entries(MAPS)) {
  const { ok, pts } = floodFill(map);
  const sp0 = map.spawns.default;
  check(ok(sp0.tx + 0.5, sp0.ty + 0.5), `${key}: the default spawn's feet are blocked`);
  for (const [name, sp] of Object.entries(map.spawns)) {
    const near = pts.some(([i, j]) => Math.abs(i * STEP - (sp.tx + 0.5)) <= 0.5 && Math.abs(j * STEP - (sp.ty + 0.5)) <= 0.5);
    check(near, `${key}: spawn '${name}' can't be reached on foot`);
  }
  for (const w of map.warps || []) {
    const ww = w.w || 2, wh = w.h || 1;
    const hit = pts.some(([i, j]) => {
      const x = i * STEP, y = j * STEP;
      return x + FX > w.tx && x - FX < w.tx + ww && y + FY1 > w.ty && y + FY0 < w.ty + wh + 0.6;
    });
    check(hit, `${key}: the door to ${w.to} can't be reached on foot`);
  }  for (const [name, ar] of Object.entries(map.areas || {})) {
    const inside = pts.some(([i, j]) => {
      const x = i * STEP, y = j * STEP + (FY0 + FY1) / 2;
      return x > ar.x0 && x < ar.x1 + 1 && y > ar.y0 && y < ar.y1 + 1;
    });
    check(inside, `${key}: the ${name} can't be reached on foot`);
  }
}

// Zones you examine (the fridge, the story finds' zones): reachable and
// faceable on foot (point one tile ahead of the feet, within 0.4 tile of the
// zone, like WorldScene.tryExamine).
for (const f of FINDS.filter((x) => x.zone)) {
  const map = MAPS[f.map];
  if (!map) continue;
  const { pts } = floodFill(map);
  const z = f.zone, M = 0.4;
  check(pts.some(([i, j]) => [[0, -1], [0, 1], [-1, 0], [1, 0]].some(([dx, dy]) => {
    const x = i * STEP + dx, y = j * STEP + (FY0 + FY1) / 2 + dy;
    return x >= z.tx - M && x <= z.tx + z.w + M && y >= z.ty - M && y <= z.ty + z.h + M;
  })), `find '${f.id}': its zone can't be faced from anywhere reachable`);
}
{
  const map = MAPS[FRIDGE.map];
  check(map && order.includes(FRIDGE.chapter), 'fridge: unknown map or chapter');
  if (map) {
    const { pts } = floodFill(map);
    const z = FRIDGE.zone, M = 0.4;
    const ok = pts.some(([i, j]) => [[0, -1], [0, 1], [-1, 0], [1, 0]].some(([dx, dy]) => {
      const x = i * STEP + dx, y = j * STEP + (FY0 + FY1) / 2 + dy;
      return x >= z.tx - M && x <= z.tx + z.w + M && y >= z.ty - M && y <= z.ty + z.h + M;
    }));
    check(ok, 'fridge: its zone can\'t be faced from anywhere reachable');
    check((map.props || []).some((p) => p.furniture === 'trashbins'), 'fridge: no bins in its kitchen to throw the cheese');
  }
}

// npcSpots: on floor and clear of solid furniture (feet box), so a spread-out
// crowd never starts inside a table.
for (const [key, map] of Object.entries(MAPS)) {
  const boxes = (map.props || []).filter((p) => p.solid).flatMap((p) => propColliders(p));
  for (const sp of map.npcSpots || []) {
    const cx = sp.tx + 0.5, cy = sp.ty + 0.5;
    const x0 = cx - FX, x1 = cx + FX, y0 = cy + FY0, y1 = cy + FY1;
    const wall = [Math.floor(y0), Math.ceil(y1) - 1].some((ty) => [Math.floor(x0), Math.ceil(x1) - 1].some((tx) => map.grid[ty]?.[tx] !== 0));
    const prop = boxes.some((b) => x0 < b.tx + b.w && x1 > b.tx && y0 < b.ty + b.h && y1 > b.ty);
    check(!wall && !prop, `${key}: npcSpot (${sp.tx},${sp.ty}) is ${wall ? 'in a wall' : 'inside furniture'}`);
  }
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

console.log(fails ? `\n${fails} problem(s) found.` : `OK — ${order.length} chapters, ${NPCS.length} characters, ${Object.keys(MAPS).length} maps, save system, hero HP, ${seatCount} seats, ${views} furniture views, ${HIDDEN.length} collectibles, ${SIDE_QUESTS.length} side quests, ${FINDS.length} story finds.`);
process.exit(fails ? 1 : 0);
