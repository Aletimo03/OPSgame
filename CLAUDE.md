# CLAUDE.md

Guidance for Claude Code in this repository.

**Rules**
1. Read this file at the start of every session. Never rely on in-context memory across sessions.
2. When you change a mechanic, a map connection or the configuration, update the matching section here **in the same session**. When you change the story, also update [`STORY.md`](STORY.md) (the player-facing story bible, in Italian).
3. After touching chapters, character JSONs, maps or the save system, run `node --no-warnings tools/checks/story-check.mjs` and fix anything it reports.
4. Keep **Repo state**, **Known issues** and **Roadmap** current as work lands: tick roadmap items, add newly found issues.
5. Before writing **any** line for a character (dialogue, quiz, phone message, move name, item text), read `assets/characters/<id>/persona.md`. It fixes *how* they talk; the story fixes *what* they say. Never invent persona traits: ask the user and write them down there.

## Project

OPSgame is a Phaser 3 top-down RPG (Pokémon Gen-5 style) set in the user's real co-housing. The protagonist is "Zio Nick" (folder and sprite key `zionick`). There's no build step, no bundler, and no npm dependencies. Phaser 3.80.1 loads from a CDN in `index.html`, and all JS uses native ES modules.

**Controls:**
- **Arrows or WASD** move the player (WorldScene merges them: `this.cursors.<dir>.isDown`, taps via `justPressed(dir)`); in menus the arrows pick an option, and W/S also scroll the phone.
- A **key-hint bar** (bottom-left, `this.keyHints`) lists every key; it hides while a dialogue box is up.
- **Clock** (top-left, room name under it): in-game time with a ☀️/🌅/🌆/🌙 icon (`js/story/clock.js`). Each chapter has `time: 'HH:MM'` (its start, chosen so its messages fit: ch1 07:30, ch2 22:30, ch3 11:00, ch4 23:00, ch5 16:00, ch6 09:00, ch7 19:00 (aperitivo), ch8 17:30, ch9 18:30, ch10 10:30, ch11 21:00, ch12 23:30). The clock runs at 1 game minute per real second (`RATE`), saved in `questState.clock`. At night a dark-blue veil covers the world (`nightAlpha`, max 0.5, dawn/dusk ramps). The phone's status bar and message times use the same clock: a chapter's messages arrive in the minutes before its start time.
- **Scenes** (events) are cinematic (`cutsceneStart/Focus/End`): black bars, HUD hidden (`setHudVisible`), the world frozen (`inCutscene`). For each line the camera zooms ×1.45 onto the speaker, who turns to face the camera (front idle frame) and hops; after 0.5 s the line appears in **big** dialogue mode (`Dialogue.show(..., { big: true })`: screen darkened, portrait half the screen tall, larger text). Lines with "!" shake the view.
- **Space** talks, advances dialogue, or confirms. Dialogue lines type out letter by letter (`TYPE_MS` in `npcs.js`); Space while typing shows the whole line. With nobody in front of you, it **sits** on the seat under your feet (any arrow or Space stands you up); otherwise it **examines** the furniture in front (catalogue `label` + `examine` lines, `WorldScene.tryExamine`).
- **Collectibles**: 12 odd socks (*calzini spaiati*) hidden in furniture. A map prop with `hidden: { kind: 'sock', id }` gives one the first time you examine it, with a banner showing found/total. They're counted in the bag and on the ending screen. The data is in `js/story/collectibles.js` (`KINDS`, `HIDDEN` read from the maps, flags `found:<id>`). story-check checks that ids are unique and that each sock can be examined from a reachable spot.
- **Chapter card**: a big "CAPITOLO N / title / mission" card fades in once per chapter (flag `card:<chapter>`): after a chapter completes, and on the first map entry of a new game or old save.
- The quest tracker shows a blue **"→ who, where"** line under each open objective (`objectiveTargets`).
- Over NPCs: a blue **"?"** = a favour to offer or hand in; an orange **"⚔"** = a rematch is available (Gabbo roams the corridors from chapter 3, one fight per chapter, +8 punti casa: character JSON `rematch`).
- **Who stands still** (user's rule): in a normal chat only Zio Nick and the person he talks to (`this.talkingTo`, kept for the whole conversation, chained prompts included) freeze; everyone else keeps strolling (`updateNpcs(..., frozen)`). In a cutscene, with an overlay open or during a warp, **everyone** freezes. Freezing (`freezeNpc` / `holdPlayer`) also stops the walk animation and sets the idle frame: before, a stopped NPC could stay "walking on the spot".
- A bobbing yellow **"!"** floats over every NPC the active quest still needs (talk / beat / quiz / item giver: `questNpcIds` in `questGuide.js`, refreshed by `onProgress`).
- **I** opens the bag. It is the **only place HP is shown** outside battle (the user's choice).
- A **phone icon** under the quest tracker shows a red badge with the number of unread messages and the `[P]` hint.
- **P** opens the phone, drawn as WhatsApp. It opens on the **chat list**: the group "Cucina di su" plus **private chats**, most recent first, each with an unread badge and (for people) their affinity hearts. The mission is pinned on top. ↑/↓ (W/S) choose, Space / Enter / → open, ← / Backspace go back, P / Esc close.
- **M** opens the map of **the floor you're on** with the objectives marked; objectives on the other floor are listed as "altro piano" without a marker.
- **Esc** opens the pause menu (Riprendi / Ricomincia da capo) and closes any overlay.
- In battle, the arrows move the cursor (←/→ ±1, ↑/↓ ±2) and Space confirms.

## What Claude can and cannot do here

| Task | Who |
|---|---|
| Edit JS / JSON: maps, chapters, characters, dialogue, stats, props, warps, UI | Claude |
| `node --check`, `tools/checks/story-check.mjs`, ad-hoc Node checks of maps and quest flow | Claude |
| Remove white backgrounds from prop PNGs and compute tight colliders (`tools/sprites/remove_bg.py`) | Claude |
| Run `tools/sprites/repack_player.py` on art the user supplied | Claude |
| **Create image assets** (sprites, portraits, furniture, backgrounds) | **User**. Claude has no image generator and must not fake one (a PIL-drawn "sprite" is no substitute). |
| **Create audio** (music, SFX) | **User** drops files in `assets/sounds/`; Claude wires them up |
| **See or play the game** | **User**. Claude never opens the Artifacts/preview window. Visual results (prop placement, door look, sprite scale, UI layout) are confirmed by the user. Claude reasons in tile coordinates and backs logic with Node checks. |

When a request needs an asset that doesn't exist yet, do all the wiring, then tell the user the exact path and format to drop in.

## Running the game

Serve the project root over HTTP (WebStorm's built-in server, or `npx serve .`). A `file://` URL fails because ES-module imports are blocked.

**Online**: it's a static site, so any static host serves it as is (no build). Free, no time limit: GitHub Pages (Settings → Pages → branch `master`, root; needs a public repo on the free plan), Cloudflare Pages, Netlify, or Vercel (Hobby). Asset paths are relative and case-exact, which matters because hosts are case-sensitive and macOS isn't. `.gitignore` keeps `.DS_Store`, `.idea/`, `.claude/` and Python caches out of the repo. `.claude/launch.json` defines `opsgame-static` (port 5599) for the user's convenience; Claude doesn't use it.

## Verification

```bash
node --input-type=module --check < js/scenes/WorldScene.js   # syntax, any file (see the warning below)
node --no-warnings tools/checks/story-check.mjs       # story + save system (exit 1 on problems)
```

**Warning (found 2026-10-17):** with this machine's Node (v26), `node --check file.js` on an ES-module `.js` file exits 0 **even with syntax errors** (module-type detection swallows them). Always check through stdin as a module, e.g. for every file:
`for f in $(git ls-files 'js/*.js' 'maps/*.js'); do node --input-type=module --check < $f || echo FAIL $f; done`

`story-check.mjs` imports the real modules. It checks:
- every NPC placement resolves to a map;
- a **worst-case playthrough**: in each chapter, it talks to everyone else and enters every other map *before* doing the objectives. No chapter may start pre-ticked or be completed by noise; every objective must be doable (NPC / item giver placed that chapter, battle/quiz block present, visit target exists).
- the save → load round-trip and the corrupt / incompatible save fallbacks;
- the hero HP rules and that the defeat respawn point exists on floor;
- consumables (each has `heal`, its giver is placed in that chapter, they get collected) and that the ending triggers only after the last chapter;
- that **every seat** (`props[].seats`) in every map is reachable on foot, via a ¼-tile flood fill of the player's feet box.
- side quests (unique ids, giver placed, exactly one prop with the thing), shop items, clues (one prop each, a key clue, the accused has a final battle), affinity messages and events (speakers present in that room);
- that every furniture catalogue view is well-formed (colliders/seats inside the image box, valid facings), every `{ furniture, dir }` map entry expanded, and every prop image exists on disk.

Its `talk()` mirrors `WorldScene.tryInteract`, so keep the two in sync.

**What can be imported in Node.** Modules needing the global `Phaser` can only be `node --check`-ed:
- needs Phaser: `WorldScene`, `BattleScene`, `TitleScene`, `npcs.js`, `playerSprite.js`, `MapRenderer.js`, `Inventory.js`, `PauseMenu.js`, `QuestTracker.js`, `audio.js`;
- importable: `js/core/furniture.js`, `js/core/furniture-catalog.js`, `maps/index.js`, `maps/spawn-points/spawn-points.js`, `js/story/questState.js`, `js/story/chapters.js`, `js/core/save.js` (with a fake `globalThis.localStorage`).

For map-geometry questions, write a throwaway script in the scratchpad that prints a map's `grid` as ASCII (`#` wall, `.` floor, `D` door) or flood-fills from a spawn.

## Configuration (tuning knobs)

| Where | Knob | Now | Meaning |
|---|---|---|---|
| `js/config.js` | `PROTAGONIST_SPEED` | 600 | player px/s (12.5 tiles/s). The user found 220 too slow; they asked for 500–700 |
| `js/config.js` | `HUD_SCALE` (+ helpers `hud(n)` / `hudPx(n)`) | 1.7 | size of the screen HUD (quest tracker, phone icon, clock, room name, key hints, banners, chapter card) vs the original; raised on 2026-10-22 so it reads on a big TV from ~2 m. The tracker is at most 45% of the screen wide. Dialogue box and overlays are not affected |
| `js/config.js` | `CAMERA_ZOOM` | 0.80 | world camera zoom (<1 = see more of the map). The HUD is unaffected (see Cameras) |
| `js/config.js` | `CAMERA_MARGIN` | 3 | tiles of empty margin the camera may show around any map (also leaves room for the tall top walls, which rise 1.5 tiles above row 0) |
| `js/config.js` | `SEAT_HEAL_PER_SEC` | 3 | HP regained per second while seated |
| `js/config.js` | `DEFEAT_RESPAWN` | `base-floor` / `living` (26,21) | where you wake up, at full HP, after losing a battle |
| `js/config.js` | `TILE` / `DOOR_WIDTH` | 48 / 2 | tile px; doorway + warp width in tiles |
| `js/config.js` | `PLAYER.SCALE` / `WALK_FRAMERATE` | 0.43 / 15 | sprite size (~3 tiles tall); walk anim fps |
| `js/config.js` | `BATTLE_BG_PATH` | `assets/tilesets/battle_room12.png` | one background for every fight |
| `maps/index.js` | `START_MAP` | `'room-20'` | where every game starts: Zio Nick wakes up in his room. **Loading a save also starts here** (`applySave` restores progress only), and so does a chapter-select restart |
| `js/core/npcs.js` | `NPC_SPEED` / `WANDER_RADIUS` | 200 / 5 | NPC stroll speed; roam radius in tiles (per NPC: `wanderRadius`, `wander: false`) |
| `js/scenes/BattleScene.js` | `ARREST_BELOW` | 0.4 | default HP fraction under which an `arrest` move works (per move: `arrestBelow`) |
| `assets/characters/zionick/character.json` | stats / moves | 30 HP, 5 ATK, 2 DEF; Spinta 6, Insulto 9, Manette 5, SEI IN ARRESTO (`arrestBelow` 0.4) | hero base |
| `js/scenes/WorldScene.js` | `AUTOSAVE_MS` | 4000 | position autosave interval |
| `js/core/save.js` | `KEY` / `VERSION` | `'opsgame-save'` / 1 | localStorage slot; bump `VERSION` on an incompatible save shape (old saves are then ignored) |
| `js/core/audio.js` | `SOUNDS` / `SCENE_MUSIC` | world-theme only | see Audio |

## Assets pipeline

- **Characters**: `assets/characters/<name>/` holds three files:
  - `player_source.png`: the raw render, supplied by the user;
  - `player.png`: a clean 4×3 sheet, with rows Down / Side(left) / Up;
  - `portrait.png`: used for dialogue and battle.
  - `head.png`: 160×160 round crop of the head from the portrait, for the title screen (cut once with a PIL script; redo it if the portrait changes).

  Build the last two with `python3 tools/sprites/repack_player.py <name>`. It keys out white, crops the standalone figure as the portrait, and aligns feet to a shared baseline. Sheet layout comes from `SHEET` in `config.js`.
- **Props**: **every** furniture PNG now lives in `assets/furniture/<group>/<type>/<type>_<dir>.png` (`<group>` = `kitchen` / `rooms` / `others`) and is a catalogue entry (see the next bullet); `assets/kitchens/` and `assets/rooms/` no longer exist. `python3 tools/sprites/remove_bg.py <png>` is still there for one-off props placed with absolute coordinates. It:
  - removes a white background, but only the white **connected to the image border**, so white parts of the object survive. The original is kept as `<name>_source.png`.
  - auto-picks the threshold from the border's own white. It does nothing if the PNG is already transparent.
  - with `--trim`, crops the empty margin.
  - with `--fit TX TY W [H]` (place by the visible object; add H to stretch it) or `--box TX TY W [H]` (place by the image box), prints a ready-to-paste `props` entry whose `collider` hugs the visible pixels.
  - `--region X0 Y0 X1 Y1` (source px) restricts the collider to part of the image, e.g. a table top without its chairs. `--foot F` keeps only the bottom fraction.

  Limit: a white object edge touching a noisy white background with no outline can't be separated. Ask for transparent exports instead.
- **Orientable furniture** (one PNG per direction, nothing rotated or mirrored): `assets/furniture/<group>/<type>/<type>_<n|e|s|w>.png` (group folder found automatically), where the letter is where the piece's **front** faces (s = towards the camera). Run `python3 tools/sprites/furniture.py <type>`. It:
  - cleans and trims each view in place (keeping `_source.png`);
  - converts px → tiles with **one scale for all views** (`--ppt`, default 48; or `--width DIR TILES`);
  - prints the catalogue entry to paste into `js/core/furniture-catalog.js`.

  Per-view options: `--region DIR X0 Y0 X1 Y1` (solid boxes), `--foot DIR F`, `--seat DIR X0 Y0 X1 Y1 FACING`, `--base DIR Y`. Pixel coordinates refer to the **trimmed** file, so run once without options first.
- **Audio**: `assets/sounds/`, declared in `js/core/audio.js`.
- **Intro**: `assets/intro/` (clip, first frame, logo, music); timings are constants at the top of `js/scenes/IntroScene.js` (`CLIP_START`, `LOGO_AT`, `END_AT`; the clip's speed is derived so it ends at `LOGO_AT`). No ffmpeg on this machine: video work uses macOS `avconvert` and an AVFoundation Swift snippet for frames.

## Architecture

```
index.html
└── js/game.js         Phaser config (RESIZE, arcade physics, pixelArt) → [IntroScene, TitleScene, WorldScene, BattleScene, EndingScene]
    ├── IntroScene     "press a key" (browsers need a gesture for sound), then a 25 s intro timed on
    │                  assets/intro/intro_theme.mp3: black screen (music only) until 7 s → the Google
    │                  Earth clip from its first frame (intro_earth.mp4, 6.2 s, from the user's .mov via avconvert; intro_first_frame.jpg covers the start until it plays) slowed to fill
    │                  7 → 20 s → the OPS logo (ops_logo.jpg) → title at 25 s. Everything covers the whole
    │                  screen (cropped, never distorted); the Earth clip is shifted so the globe (measured at 328,216 on the first frame) is centred, zoomed just enough to leave no black edges. The "press a key" text dissolves on press. **Hold Space 3 s to skip** (`SKIP_HOLD_MS`, a bar fills bottom-right; a tap does nothing).
    ├── TitleScene     Continua / Nuova partita (confirm before overwriting a save) → starts WorldScene.
    │                  Background: assets/menu/OPSentrata.jpg ("cover"-fitted), text on a 72%-opaque
    │                  panel sized to the central block (PANEL_ALPHA / PANEL_PAD in the file).
    │                  The 13 characters' heads (assets/characters/<id>/head.png, round crops of the
    │                  portraits) drift slowly and bounce off the screen edges and the menu panel, like
    │                  an old screensaver (HEAD_SIZE / HEAD_SPEED; circle-vs-rectangle bounce).
    ├── WorldScene     renders ANY map; movement, warps, NPCs, dialogue, quests, bag, Esc menu, autosave
    ├── BattleScene    launched over a PAUSED WorldScene; resumes it on exit
    ├── CutsceneScene  full-screen MP4 over a PAUSED WorldScene (cover-fitted, with sound; hold Space 1.5 s to skip);
    │                  without the file a 3 s title card plays. Ends with world.onCutsceneDone()
    ├── DanceScene     the Alcatraz dance challenge (arrows on the beat) over a PAUSED WorldScene → world.onDanceDone()
    ├── FridgeScene    first-person minigame (chapter 4) over a PAUSED WorldScene: the dirty fridge
    │                  (assets/minigames/fridge/), 10 flies (fly.png, cut from the user's image), a crosshair
    │                  moved with arrows/WASD, Space squirts white detergent, 3 shots then a 3 s reload.
    │                  All down → fade, 0.5 s black, clean fridge → Space → world.onFridgeDone(). Esc gives up.
    └── EndingScene    credits + run stats over the paused world, once, after the last chapter
```

`WorldScene` restarts with `{ mapKey, spawnName, spawnPos?, facing? }` to warp: one scene serves every map, and restarts reuse the same instance. The module-level `questState` and the global Phaser caches (textures, JSON, sounds) survive restarts.

### Cameras (WorldScene)

WorldScene uses two cameras:
- **main**: follows the player, zoomed by `CAMERA_ZOOM`, and draws the world.
- **ui**: unzoomed, and draws only the HUD.

`fitCameraBounds()` sets the world camera's bounds to the map plus `CAMERA_MARGIN` tiles. On any axis where that is still smaller than the zoomed view (kitchens, bedrooms), it widens the bounds symmetrically, so the map is **centred** instead of hugging the top-left corner (Phaser's default when the bounds are smaller than the view). It re-runs on window resize. This was verified against Phaser 3.80.1's `clampX`/`clampY`.

`setupUiCamera()` routes every object by its scroll factor. `scrollFactor 0` goes to the ui camera; everything else goes to main. Objects created later are routed once per frame (on `POST_UPDATE`, before render).

**Rule:** anything screen-fixed (HUD, overlays, pop-ups) must call `setScrollFactor(0)`. Otherwise it is drawn by the zoomed world camera and ends up the wrong size and position.

Camera fades (warps, restart) only fade the world camera, so the HUD stays visible during them.

### Core modules

| File | Role |
|---|---|
| `js/config.js` | shared constants (see Configuration) |
| `js/core/floorPlan.js` | `makeFloorPlan`, `rotRect`, `rotPoint` |
| `js/core/roomBuilder.js` | `makeRoom`, `setDoor`, `makeUShape` |
| `js/core/MapRenderer.js` | `drawMap`, `drawStairs`, `buildWallColliders` |
| `js/core/themes.js` | palettes: `default`, `white`, `entrance` |
| `js/core/playerSprite.js` | sheet slicing, walk anims, `idleFrame`, `feetY` / `feetCenterY` (depth + seats) |
| `js/core/npcs.js` | `createNpcs` (BFS-snaps to free floor), wander AI, `propBlockedTiles`, `Dialogue` (`show` lines / `ask` choice) |
| `js/core/characters.js` | `CHARACTERS` registry, `resolveInteraction`, `placementsForMap`, `baseStats` |
| `js/core/furniture-catalog.js` | **data only**: `FURNITURE[type].dirs[n/e/s/w] = { w, h, colliders, seats, baseY, solid?, ysort?, path?, key? }`, with coordinates **relative to the image's top-left** (`x, y, w, h` in tiles). Per type `group: 'kitchen' | 'rooms' | 'others'`. Default path `assets/furniture/<group>/<type>/<type>_<dir>.png`, default key `<type>_<dir>` |
| `js/core/furniture.js` | `expandProp` / `expandMapProps`: a map entry `{ furniture, dir, tx, ty, scale?, key?, solid?, ysort? }` → a normal prop with absolute `colliders` / `seats` / `baseY`. `maps/index.js` runs it once on every map at load, so WorldScene, NPC blocking, the minimap and story-check only ever see normal props. A broken entry is skipped with a console warning and recorded in `FURNITURE_ERRORS`; `checkFurnitureEntry` validates catalogue data. Node-importable |
| `js/core/props.js` | `propColliders(p)` (`colliders` → `collider` → image box) and `propBaseY(p)`. Shared by the game, NPC blocking and story-check |
| `js/core/save.js` | `writeSave`, `loadSave`, `clearSave`, `applySave` (localStorage) |
| `js/core/audio.js` | `SOUNDS`, `SCENE_MUSIC`, `loadAudio`, `attachAudio`, `AudioManager` |
| `js/story/questState.js` | progress singleton (+ `toJSON` / `restore` / `reset`) |
| `js/story/chapters.js` | `CHAPTERS`, `ORDER`, `activeQuest`, `advanceChapterIfDone`, `objectiveDone` |
| `js/story/QuestTracker.js` | top-right quest HUD. Every line word-wraps and the box is sized to the measured text (width ≤ 280 px, clamped to the screen), so long titles/objectives never run off the right edge. Rebuilt on resize by `WorldScene.layoutHud()` |
| `js/ui/Inventory.js` | bag overlay (I): HP bar, permanent items with buffs, consumables with quantities |
| `js/ui/PauseMenu.js` | Esc menu with restart confirmation |
| `js/ui/Phone.js` | phone overlay (P), drawn as a **WhatsApp chat of the group "Cucina di su"** (`GROUP_NAME`). It has a green header with the members, a 📌 pinned message (mission + where to go, from questGuide), bubbles with coloured sender names, fake times and ✓✓, a chip per chapter, and a decorative input bar. ↑/↓ scroll. Pure Phaser shapes/text, no assets |
| `js/story/phoneChats.js` | chats built from the chapters' `phone` arrays (`{ from, text|sticker }` → group; `dm: true` → private chat with `from`) plus `questState.extraMessages` (affinity unlocks), slotted after their chapter. `phoneChats()`, `unreadIn`, `totalUnread`, `markRead` (per-chat `questState.phoneSeen[id]`; an old numeric value = group). Node-importable |
| `js/story/sideQuests.js` | **favours** (`SIDE_QUESTS`: giver, `from` chapter, the thing to find in the prop with `side: '<id>'`, points, persona texts), **punti casa** (`questState.points`) and **Alessio's shop** (`SHOP`, keeper `timo`). Offered after a plain chat (`WorldScene.afterTalk`); state `questState.side[id]`, found = flag `side-found:<id>`. Node-importable |
| `js/story/affinity.js` | hearts 0–5 per housemate (`questState.affinity`): +1 first chat per chapter, +2 favour done, +1 rematch win (Gabbo) / shop purchase (Alessio). 2 and 4 hearts unlock a private message (`AFFINITY_DMS`, stored in `questState.extraMessages`). Node-importable |
| `js/story/investigation.js` | the melon investigation: `INVESTIGATION` (premise shown at the start, intro when it opens at chapter 3, accused Caue in chapter 11, bonus/penalty) and `CLUES` (props with `clue: '<id>'`, flags `clue:<id>`, `key` clues). In the final, presenting a key clue starts Caue at −30% HP (`BattleScene` `enemyHpFrac`); a wrong one costs 6 HP. Node-importable |
| `js/story/events.js` | one-off scenes on entering a map in a chapter (flag `event:<id>`): **Ana's aperitivo** (chapter 7, first-floor kitchen): lines from whoever is in the room, then 2× *Guacamole di Ana* (cura 25) and +1 heart with each of them. Node-importable |
| `js/ui/PhoneHud.js` | phone icon under the quest tracker (top-right, below `QuestTracker.bottom`) with a red badge counting unread chat messages (`phoneMessages().length − questState.phoneSeen`; `Phone.show()` marks them read) and a `[P] telefono` / `[P] nuovi messaggi` hint. Drawn with shapes, no asset; re-renders only when the count or the tracker height changes |
| `js/ui/Minimap.js` | map overlay (M): the current floor only, you + numbered objective markers + legend |
| `js/story/collectibles.js` | hidden collectibles: `KINDS`, `HIDDEN` (from map props' `hidden`), `collectionStatus()`, `foundFlag` / `isFound`. Node-importable |
| `js/story/questGuide.js` | where each active objective is: `objectiveTargets`, `placeName`, `hubPosition` (rooms → their hub door). Node-importable |
| `js/scenes/EndingScene.js` | credits + run stats, shown once after the last chapter |
| `tools/checks/story-check.mjs` | story + save verification (see Verification) |

### Maps

`maps/index.js` holds `MAPS` (36 maps) and `START_MAP`. Map object:

```js
{
  key, name, theme,          // name = HUD label (top-left); theme = key in themes.js
  grid,                      // 2D array: 0 floor, 1 wall, 2 door
  spawns: { [name]: { tx, ty } },
  warps:  [{ tx, ty, w?, h?, to, toSpawn }],   // w defaults to DOOR_WIDTH (2), h to 1
  stairs?: { tx, ty, w, h, enter: 'left'|'right', imageKey?, image? },
  props?:  [{ key, path, tx, ty, w, h, solid?, collider? | colliders?, ysort?, baseY?, seats? }],
           // colliders: [{tx,ty,w,h}, …] — several boxes (e.g. sofa back + armrests)
           // seats: [{ tx, ty, w, h, facing }] — feet area to sit with Space
  // or, for catalogue furniture: { furniture: 'divano', dir: 'n'|'e'|'s'|'w', tx, ty, scale? }
  //   → expanded at load into the full form above (js/core/furniture.js)
  labels?: [{ tx, ty, text }],                 // debug overlays
}
```

Maps have **no `npcs` array**; NPC placement lives in the character JSONs.

- **Rotation gotcha:** `makeFloorPlan` takes PLAN coords and rotates them 180°. Everything after it (`setDoor`, warps, spawns, props, stairs) uses **GRID coords**, with y going down. Convert with `rotRect(cols, rows, x, y, w, h)`, or `grid_x = cols − plan_x − w`, `grid_y = rows − plan_y − h`.
- `solid: true` on a plan room skips carving its interior, so every enclosed room is its own map.
- Warps arm only after the player steps off every door zone, which prevents bounce-back.
- **Door plates** (`WorldScene.drawDoorPlates`; a warp may pin its plate with `plateAt: { tx, ty }` — room-26's is under its door, room-27's right of its door, leaving the corner between them plain wall): every warp to `room-N` gets a plate with **N** on the wall tile beside the door (left of a horizontal door, above a vertical one). Shared rooms get an icon: 🍳 kitchens, 🚿 shared bathroom & laundry, 🧺 laundry, 🗑️ trash room, 🚪 entrance.
- **Door assist** (`WorldScene.assistDoor`, every frame after `movePlayer`): walking into a doorway while off-centre used to snag on the wall corner ("you had to be perfectly centred"). Within ~1 tile sideways of a door and about to enter it, the player now also slides towards the door's centre.
- **Depth sorting**: characters sort on their **feet** line (`feetY` in `playerSprite.js`, the bottom of the collision body). Each prop sorts on its **base line**: the bottom of its `collider` (else of its image), or `baseY` in tiles if given. A character whose feet are above a prop's base line is drawn behind it. `ysort: false` keeps a prop under every character; the user chose that for the kitchen `main_table`.
  - The visible effect depends on the collider: a character can only get "behind" a prop as far as its collider allows. That's why the island's collider starts **1 tile below** its visual top: you can step into that band, and the counter then covers your legs.
  - **Beside a prop you always stay in front** (the user's call). `WorldScene.characterDepth()` puts a character behind a prop only when its feet are horizontally over the prop's collider. Where the sprites merely overlap side by side, the character is bumped in front. NPCs use the same function.
- **Chapter 12 — Notte all'Alcatraz** (added 2026-10-16, an epilogue after the finale; the ending now comes after it). Alessio is always with Gaia, so Gabbo takes Zio Nick "a pushare". Objectives: talk to Gabbo in the base-floor living room (spawn point `base-floor-living`); go out of the **entrance's front door** (flag `alcatraz-arrived`); step on the **stage** (flag `alcatraz-stage`). Pieces:
  - `js/story/alcatraz.js`: `ALCATRAZ` config (video path, destination, door texts) and `exitState(id)` → `go` (chapter 12 + Gabbo greeted this chapter) / `needPartner` / `locked`.
  - Map field **`exits`** (`entrance`: the south door (5,8)): not a warp; `WorldScene.checkExits` asks `exitState`, then `startTrip` → fade → **CutsceneScene** plays `assets/cutscenes/alcatraz.mp4` (**the user supplies it**; until then a title card) → `onCutsceneDone` sets the flag and restarts in `alcatraz`. Re-armed after you step off.
  - **`alcatraz`** map (`maps/alcatraz/alcatraz.js`, 52×40, theme `alcatraz`, `noNight`): a **skeleton** from the user's isometric plan, to be refined with their images: lobby at the bottom with the street door (back to `entrance` / `fromAlcatraz`), the big main hall, the **stage** across its top end, a second room on the left with a small stage, a bar corner. `AREAS` exported as `areas`.
  - **Flirting at the club** (`js/story/flirt.js`, objective flag `alcatraz-number`; the stage `flagZone` has `requires: 'alcatraz-number'`): 4 guest girls (`martina`, `ludovica`, `vanessa`, `chiara`: names picked at random, traits from the user, lines in `GIRLS`) wander the main hall. Over each, a mood icon that changes every 8–15 s (💃 dance / 🍹 drink / 😂 laugh / 😒 not now) + hearts (`WorldScene.girlTags`). Talking to one → Gabbo asks what to say → 3 approaches: matching the mood +1 ❤️ (+1 more if it's what she likes most), wrong −1; on 😒 a wasted try. `need` hearts (Martina 3 with 5 tries, the high-self-esteem Ludovica and Vanessa 4 with 6); **every positive interaction is exactly +1 ❤️** (approach, drink, dance; user's rule, 2026-10-17) = the number (+10 punti casa, +1 heart with Gabbo); out of tries she leaves for 25 s and resets. **Chiara is the trap**: she wants Gabbo and asks him to go home with her; Gabbo asks Zio Nick what to do — letting him go (`gabboLeaves`) loses the night, talking him out of it keeps him at the club: flags `alcatraz-arrived` / `alcatraz-number` cleared, restart in room-20 with a notice, go back through the front door. Girl state is runtime only (not saved).
  - **Bar, dance, followers** (2026-10-17, same module + WorldScene):
    - 🍹 right → an **order**: walk up to the bar counter (map `bar` zone in front of `barCounter`, `checkBar`, re-armed when you step away) and pick a drink from the barman's menu (`DRINKS`: 🍺 Birra free / 🍹 Spritz 4 punti casa / 🥃 Jäger bomb 8 punti; all +1 ❤️, booze 1/2/3), then talk to her within 45 s (`ORDER_MS`): the drink's ❤️ (+1 if she likes drinks) and **Gabbo drinks the same** (`gabbo.drunk` += booze, 🍺 over his head). Too late: she gives up and Gabbo drinks it.
    - Drunk Gabbo **garbles**: with `garbleChance` (15% per drink, max 60%) he says another approach than the one you chose (10% per unit of alcohol, max 60%); his lines get slurred (`slur`).
    - 💃 right → a **dance challenge**: `DanceScene` over the paused world, 20 arrows in 4 lanes rising on the club track's beat (its clock = the music's `seek` at start + `performance.now()` since: **not** the scene clock, which is 0 during a just-launched scene's create and then jumps, which made every arrow "missed" at once), PERFETTO ≤ 0.09 s / BENE ≤ 0.18 s; accuracy ≥ her `danceNeed` (Martina 60%, the others 75%, with some half-beat arrows) = **+1 ❤️** (her number only once she has enough; changed 2026-10-17, it used to be an instant number); a loss = −1 ❤️. Esc gives up. Calls `world.onDanceDone(id, won)`.
    - **Gabbo follows Zio Nick** around the club like a Pokémon partner (`followTick`: he walks the player's own trail ~1.2 tiles behind, no collision with him). He's **skipped by `tryInteract`** while following (he'd always be the NPC in front of you).
    - **Chiara chases Gabbo** slowly (`chaseTick`, `CHIARA_SPEED` 95 px/s, BFS over floor tiles, re-planned twice a second, 6 s head start). When she reaches him (or you talk to her) she asks him home (`chiaraPitch`): letting him go loses; telling him to stay works unless he's drunk (`goChance`: 15% per unit of alcohol, max 85%). After a refusal she waits 15 s (`CHIARA_WAIT_MS`).
  - **Mood timing**: 😒 lasts only 2.5–4.5 s (`NO_MOOD_MS`), the other moods 8–15 s. Ludovica and Vanessa start together in the **second room** (spawn points `alcatraz-sala2` / `-b`), Martina and Chiara in the main hall.
  - **Chiara's choice**: the refusal is option 0 (pre-selected); picking "let him go" asks a second time (`confirm`, default "No, ci ripenso").
  - **The maranzas** (`maranza`, guest; **5 copies** of one character via the location field `copies: [{ tx, ty }]`, handled by `placementsForMap`; `MARANZA` in flirt.js): two in the second room, three in the main hall. Each is confined to an **8x8 area** around his starting tile (`MARANZA.area`; BFS bounded to it) and only comes after Zio Nick when he **sees** him (≤ 6 tiles, `lineOfSight` on the grid, walls and solids block it): a red **"!"** pops over his head; otherwise he walks back to his spot. On reaching you (or if you talk to him) he tries for the phone: `stealChance` = 15% per unit of the night's alcohol (`gabbo.drunk`: you drink together; 0 when sober), max 80%. Stolen: −5 punti casa, P only shows "📵" until you leave the club (`phone.stolen`, reset on entering any other map), and all of them stop. Kept: that one backs off 15 s. Chasers are generic (`this.chasers`: target, speed, wait, `onReach`, optional `area`); Chiara is one without an area.
  - **Dancing bear** (map `dancers`: `{ key, path, tx, ty, scale }`, drawn in `startCrowd`): `assets/alcatraz/orso_dance.png` (the user's 12 poses, packed 4×3 with `pack_sheet.py`, source `orso_source.png`) on the main stage at ×1.6, a new pose on every beat, on the spot, with solid feet.
  - **Stages and bar** (map `stage` (one or an array), `barIsland`; `WorldScene.drawStage` / `drawBarIsland`, drawn in code): each stage is a raised wooden platform with a dark front face, a brass edge and **two steps** in the middle (main x 33–36, second room x 8–10); its front edge (and any side that isn't against a wall) is an invisible wall except at the steps. The bar is a **closed square of counters** (x 42–47, y 21–26, bottles on the back counter) with a dark **barman walking round inside** (`barmanTick`); the whole square is solid (and in `solidTiles`, so Chiara's BFS avoids it); you order by pressing **Space facing it** from any side (`tryBar`, checked before sitting / examining), or it opens by itself when you walk up with a pending order (`bar` zone all round it). No text on the stages. Map `disco` and `crowd` can also be arrays: the second room has its own lights and 11 dancers.
  - **Crowd** (map `crowd`, `WorldScene.startCrowd` / `danceCrowd`): ~24 dark silhouettes from the cast's own sheets (tinted `0x1c1a26`, so the disco lights colour them), not solid, hopping on every beat and turning / changing pose every 2 beats. The beat comes from map `beat` (`bpm` 121.35, `offset` 0.093 s, measured on the track) and the music's `seek` (scene clock if it isn't playing).
  - **Music per map**: map `music` = a `SOUNDS` key (`alcatraz-theme` = `assets/sounds/alcatraz.mp3`, "Disco Party" by Aurec, Pixabay, free licence); `AudioManager.playMusic` now stops any other music track first, so walking back home switches to the house theme.
  - Map field **`paint`** (`WorldScene.drawPaint`): coloured floor rectangles with a faint label (stage, bar), drawn in code until there's art. Map field **`flagZones`** (`checkFlagZones`): feet inside → set `flag` once (only in `chapter`), banner, `onProgress`. Map field **`noNight`**: no night veil; **`ambient`** (0–1): a fixed night-veil alpha instead of the clock's (the club: 0.72). Map field **`disco`** (`{ area, lights, radius, colors? }`, `WorldScene.startDisco`): soft coloured light pools (a radial-gradient canvas texture, tinted, ADD blend, depth just above the veil) that wander to random points of the area, change colour now and then and pulse; the Alcatraz has 9 over the main hall.
  - Character JSON: a location may have **`alt: [{ flag, map, … }]`** (once the flag is set the character is there instead: Gabbo moves to the club) and a chapter entry may have **`when: [{ flag, dialogue }]`** (other lines once the flag is set). `locationFor` / `resolveInteraction` handle both; questGuide uses `locationFor`; story-check checks `alt` maps. Gabbo's `rematch` got `until: 'chapter-11'` (no ⚔ in the epilogue).
- **Chapter 7 is Ana's aperitivo** (inserted on 2026-10-14; the old 7–10 became 8–11). Its objective is `{ flag: 'event:aperitivo', place: 'first-floor-kitchen' }`: `place` gives a flag objective a location for questGuide. The event plays on entering the first-floor kitchen in chapter 7 (or a few seconds after the chapter starts if you're already there) and calls `onProgress()` when it ends. Chapter 6 now inspects the **base** kitchen (not the first-floor one) so it never overlaps the aperitivo; Ana's invitation is in chapter 6's chat.
- **New furniture (2026-10-14)**: `aperitivo` (kitchen, `s`, not solid, under characters) on the first-floor kitchen table with `onlyIn: ['chapter-7']` (a map-entry field: the prop is created only in those chapters and stays until you leave the room, so it's still there in chapter 8 if you never left); `armadio` (rooms, side view `e`) against the left wall of every single suite's anteroom (doubles have no anteroom); `divano` (others, back view `n`) in the middle of the base-floor living room, low enough that the defeat respawn (26,21) lands on its seat side.
- **Bathroom fixtures** (group `bathroom`): `bathroomFixtures(area)` in `roomBuilder.js`, in every room's bathroom: the **sink** (`lavandino`, 1.8× = `SINK_SCALE`) towards the left of the top wall, one tile in from the left wall so the doorway stays clear; the **toilet** (`wc`, 1.5×) right next to it; the **corner shower** (`doccia_angolo`: the user's top view, mirrored; original kept as `doccia_angolo_s_source.png`) in the **bottom-right** corner, 1.5×. The upright shower `doccia` (views s/n/e, `e` mirrored) stays in the catalogue, unused for now.
- **NPCs never stand in walls**: `propBlockedTiles` blocks every tile where an NPC's feet box (~0.9–1.9 tiles below its centre) overlaps a solid prop **or a non-floor tile**. Before, only the centre tile was checked, so NPCs on the row above a wall stood with their feet in it.
- **Walls** (theme `white`, i.e. every map but the entrance): **white**, like the real building. `wallStyle` in `themes.js` makes `MapRenderer.drawWhiteWall` draw a wall with floor below it as a front face (white, darker top band, grey skirting board), the others off-white, plus a thin grey edge wherever a wall meets the floor. Only **floor** counts as open for walls: doors sit *in* the wall line (before, the wall ring wrapped around every door and the edges looked jagged), a wall shows its front only with floor (not a door) below it, a door in a tall front wall gets a **lintel** above it, and each horizontal run of front walls rises to one height so its top edge is straight. Front walls also **rise** `wallRise` (1.5) extra tiles upward over the wall / outside area above them, never over a floor, so outer walls look ~2.5 tiles tall; a corner rises only as high as the front wall beside it, and interior dividers with a floor right above stay 1 tile. Drawn in code, no image. Before: flat dark grey `#565b63`. The **floor** is a neutral light grey `#b1b3b6` (a warm dark grey read as brown; plain near-white read as white on white).
- **Floor**: plain colour, no grout lines (`GROUT = 0` in `MapRenderer.drawMap`; set it > 0 for the tiled look).
- **Dialogue box**: the normal box, portrait and text are 20% bigger than the originals (box 149 px, name 18 px, text 23 px, choices 22 px); the cutscene `big` mode is unchanged.
- **story-check reachability**: from each map's default spawn, every spawn, every door and every room area (`areas` exported by the suites) must be reachable on foot.
- **Fridge task (chapter 4, `js/story/fridge.js`)**: Nima asks in the group chat. In the first-floor kitchen, Space facing the right end of the cabinets (`FRIDGE.zone`, there's no fridge sprite yet) starts FridgeScene. Winning sets `fridge-clean` + `cheese-held` (shown in the bag as "Formaggio ammuffito"); Space at the kitchen bins throws it (`cheese-thrown`). `fridge-clean` and `cheese-thrown` are chapter-4 objectives (with `place`); a chapter's `resetFlags` (here `cheese-held`) and the flags of its objectives are cleared by chapter select. story-check checks the zone can be faced on foot.
- **`npcSpots`** (map field, the kitchens have 8): NPCs placed by raw map key start from these in turn instead of all from the centre, so a crowd spreads over the room. story-check checks every spot is on floor and clear of furniture.
- Solid props block the player (physics) **and NPCs**. NPCs don't collide physically; they move tile-to-tile. `propBlockedTiles(map)` in `npcs.js` marks every tile where an NPC's feet would overlap a solid prop's collider, and both spawning (BFS) and strolling skip those tiles.
- Stairs: `setupStairsAccess` walls off every side except `enter`. The warp sits on the darkest shadow column.

**World layout:**
- **Hub — `base-floor`**: a U of corridors plus the living room. It connects to:
  - `entrance` (living room's right wall);
  - `base-kitchen` (cap of the screen-right vertical);
  - `laundry-room`;
  - `room-1..12`;
  - `trashbin-room` — north corridor wall at grid (19,26), directly opposite room-9's door at (19,34); return spawn `fromTrash` (19,27);
  - the stairs up.
- **`first-floor`**: the same shape. It connects to `first-floor-kitchen`, `first-floor-bathroom`, `room-13..27`, and the stairs down.
  - Its square hall (the open `living`, interior x 22–31, y 18–26) holds 3 drying racks along the top wall and right side: `hanger` (25.6, 18), `hanger_zionick` (28.8, 18), `hanger` (28.8, 21.4). Colliders are the rack feet only, so you can walk behind the rails. The room-26/27 doors in the top-left corner stay clear.
- **`first-floor-bathroom`** = **"Shared Bathroom & Laundry"** (11×8). The door is in the north wall, top-right (8,0); you arrive at (8,1). This matches the hub, where the door is in the corridor above the room. The washing machine (`laundry`) stands against the top wall, centred (visible x 4.62–6.39, y 0.55–2.92).
- **room-10 and room-22 are DOUBLE rooms** ("Room N — doppia"), built by `makeDoubleSuite()` (19×30). You enter from below (door (1,29), arrive at (1,27)) into a corridor on the left (interior x 1–3). Going up it, on the right, you pass:
  - bedroom A (interior x 5–17, y 18–28; doorway at y 27–28);
  - then the bathroom (x 5–17, y 12–16; doorway at y 13–14, empty);
  - and at the top the corridor opens (x 1–2) into bedroom B, which spans the whole width (x 1–17, y 1–10).

  Both bedrooms are a bit smaller than a single's 15×14 and have the usual three pieces of furniture, shifted by `origins.a` / `origins.b`.
- **room-20 is Zio Nick's room** ("Room 20 — Zio Nick"). Examining his bed is a nap that restores full HP, and his furniture has its own texts: map-entry `label` / `examine` override the catalogue's.
- **Bedrooms** (`room-1..27` except the doubles 10 and 22): identical **suites** built by `makeRoomSuite(17, 16)` in `roomBuilder.js` (17×25 grid; widened by 3 tiles on 2026-10-13; the wall between the bedroom and the strip below is **2 rows thick** since 2026-10-15, `WALL_T`, so its front rises like a real wall):
  - the bedroom on top (interior x 1–15, y 1–14; furniture unchanged from the old 14-wide box), with `bed` / `fruit_table` / `phone_little_table` (catalogue furniture, view `s`);
  - below it, a strip with the same width and half the height, split by a wall at x 8: **anteroom** on the left (interior x 1–7, y 17–23, with the wardrobe) and **bathroom** on the right (x 9–15, y 17–23);
  - you **enter from below** through the anteroom's bottom-wall door (3,24) and arrive at (3,22). An open doorway through the thick wall (rows 15–16, x 3–4) leads up into the bedroom, and one in the dividing wall (y 19–20) leads into the bathroom. The openings are plain floor, not warps.
  - The room files take `grid`, `door` and `spawn` from the suite, so changing the layout means editing only `makeRoomSuite`.
- **Kitchens** (`base-kitchen`, `first-floor-kitchen`, identical 30×17 layout):
  - the door is **top-right**, in the north wall at (26,0); you arrive at (26,2) just below it;
  - `kitchen_shelfs` runs along the top wall, top-left. Relative to the image's natural size it is 2× longer and 1.1× taller (visible x 2–23, y −1.8–3.27). Its top **deliberately pokes above the map edge** (the user's choice), so the upper cabinets are cut off by the camera bounds. Its collider is the whole unit.
  - `trashbins` (4 recycling bins in a column) stand against the left wall, upper part (x 1–2.63, y 3.4–9.31; 1.25× the first placement), just under the shelves. This also closes the 1-tile strip between the wall and the shelves.
  - `island` sits in the centre-left. The art was replaced on 2026-10-13 (666×375, **3 stools**); visible x 6.4–15.5, y 4.75–8.08. Its collider runs from 1 tile below the slab's top edge to 1 tile below its bottom edge (x 6.4–15.52, y 5.77–6.89). The band above it is the "behind the counter" spot, and all 3 stools are seats.
  - All kitchen furniture is catalogue furniture (`kitchen_shelfs`, `trashbins`, `island`, `main_table` in view `s`; the two sofas are one type, `sofa`, views `s` and `w`). The map only sets each image's top-left; the numbers below are the expanded absolute values.
  - `sofa` (view `w`) stands against the right wall, centred on it and 1.5 tiles lower (visible x 27.02–29, y 7.5–12.5). Its colliders are the backrest + the bottom armrest block; it has 3 seats facing left; `baseY: 8`.
  - `sofa` (view `s`) sits between the island and the vertical sofa, 2 tiles lower than the island (visible x 18.75–23.75, y 6.75–9.3). Its colliders are the back + both armrests; it has 2 seats facing down; `baseY: 7.79`.
  - Sofas set `baseY` by hand: by default the depth line is the lowest collider (the armrests), which would draw a seated character *behind* the cushions.
  - `main_table` is in the lower right, in the user's box (13, 9.5, 15×7). The image was replaced on 2026-10-12 with a wooden top and 8 chairs. Its collider is **only the wooden top** (x 15.43–25.57, y 11.46–13.94), so all 8 chairs are walkable.

  Seats (chairs, stools) are meant to be walkable: give furniture with seats a `--region` collider covering just the surface.

  In the hub, the kitchen doors are still on the cucina's bottom wall. Arriving at the top of the kitchen is a deliberate choice by the user.

### Spawn points

`maps/spawn-points/spawn-points.js`: `resolveSpawn(name)` returns `{ map, tx, ty }` for a named point, or `{ map: name }` for a raw map key (which spawns at the floor centroid).

Named points: `base-floor-main`, `base-floor-vertical-1`, `base-floor-vertical-2`, and the same three for `first-floor-*`. Several NPCs resolving to the same tile fan out via BFS.

### Character JSON (single source of truth)

`assets/characters/<folder>/character.json`. The folder name is the NPC id, the texture key, and the quest id. A folder must also be listed in `CHARACTERS` (`js/core/characters.js`) to load. `zionick` is the player and is not listed.

```jsonc
{
  "name": "Gabbo",
  "stats": { "maxHp": 30, "attack": 7, "defense": 2 },   // defaults 30/5/2
  "moves": [ { "name": "…", "dmg": 9, "status": "imbarazzato", "chance": 0.25 },  // hero AND enemies
             { "name": "…", "arrest": true, "arrestBelow": 0.4 } ],                  // arrest: hero only
  "locations": { "chapter-2": { "map": "base-floor-main", "facing": "down", "wander": true, "wanderRadius": 3 } },
  "default": "ambient line",
  "chapters": {
    "chapter-2": {
      "dialogue": ["…"], "dialogueAfter": "…",
      "battle": { "prompt": "…", "options": ["…"] },
      "quiz":   { "prompt": "…", "options": ["…"], "answer": 0, "correct": "…", "wrong": "…" },
      "item":   { "name": "…", "description": "…", "buff": { "attack": 5, "maxHp": 10, "defense": 1 } }
      // or a consumable: { "name", "description", "consumable": true, "heal": 12, "qty": 2 }
    }
  }
}
```

- **Sara's sprites were replaced on 2026-10-15** ("Sara 2": new `player_source.png` keyed with an edge-connected white key + small-speck cleanup, repacked, the sheet scaled to the others' 345 px cell height, new `portrait.png` and `head.png`). The old sprites were deleted. Her face was then made longer (user's request): in `player_source.png` each walking figure's head band (top 40%) is 85% as wide and 120% as tall, with the body shifted down; the standalone figure's head is 84% as wide and 112% as tall, stretched upward (the phone at head height is left alone); then repacked as above.
- **Ernesto** (`ernesto`, "Er Fresco", added 2026-10-16): a housemate, in the first-floor kitchen every chapter (base kitchen in ch6), plain lines only (ch1, 3, 4, 6, 7, 9), an aperitivo event line and a ch8 group message. His sheet was replaced on 2026-10-16 by the user's new one (black background: keyed with an edge-connected near-black key, max channel ≤ 6, so the dark outlines survive), packed with `repack_player.py` and scaled to the median sprite size (see below).
- **`tools/sprites/pack_sheet.py <name> [source]`** (2026-10-17): packs a sheet with ANY layout (with or without the preview frame, frames that touch each other: it slices at the emptiest rows/columns), keys white or black backgrounds, scales to the median size and cuts the head. Used for the 4 Alcatraz girls.
- **Sprite size rule** (2026-10-16): a new or resized character's sheet is scaled so its median opaque-pixel area per frame matches the **median of the other characters** (Sara ×1.156 → 191×399 cells, Ernesto ×1.304 → 203×364). Heads on the title screen are cut so the head fills ~60% of the circle like the others. Light outline fringes left by white-background keying were removed (Lilia, Sara): edge pixels with every channel ≥ 175, 3 passes.
- **`walkBob`** (character JSON, fraction of the frame height, Lilia 0.035): for sheets whose walk frames barely change, NPCs hop once per step and rock ±2.5° (`stepBob` in `npcs.js`; the lift moves the sprite origin and the body offset together, so the body and the depth line don't move). New walk frames from the user remain the real fix for Lilia.
- A character JSON with `"guest": true` (Lilia) is left out of the group chat's member list (`Phone.js`).
- **Lilia** (`lilia`, added 2026-10-15): Gaia's sister, a guest who appears only in chapters 3 (first-floor-main, by Gaia), 7 (the aperitivo, with an event line) and 10 (first-floor-vertical-1, by Gaia); no battle or objective. Sprites from the user's sheet, keyed and repacked like Sara (345 px cells), head cut from the portrait. Gaia's chapter 3/4/10 lines answer Zio Nick asking about her.
- **`persona.md`** (same folder) = how the character talks and behaves, written from the user's answers. In short:
  - Zio Nick never speaks: his habits only come up in what others say (meddles, runs 10–15 km, two eggs every breakfast, works at the museum, touches Alessio's arms).
  - Emanuele says "O <name>", writes "sz" for "z" (*grszie*, *Lameszia*, *Szio Nick*) and asks silly questions.
  - Ana speaks English and hosts aperitivos (guacamole).
  - Gabbo starts **every** sentence with "O fra" and ends it with "diahane"; Alessio (`timo`) is taciturn and says "O fra" only at the start of the **first** sentence; Gaia says "senza rispetto" **now and then** (the user found it too frequent: ~4 times in the whole game).
  - Nima mixes English and broken Italian, often opens with mangled greetings (*Buongiorns*, *Goodnights*, *Buonanots*), uses Arabic script for memes, and nags about the kitchen.
  - Mari uses flower emoji and stickers; Ernesto ("Er Fresco", from Piedmont, product designer working on a Kinder-egg dragon toy) has no catchphrase: plain Italian, always up for wine / aperitivo, brings salame and cheese to the kitchen; Lilia (Gaia's sister, IQOS always in hand) often opens with "compa", says "amunì" for "andiamo", loves her boyfriend Andrea Raineri and gets angry if asked for a heets; Gatta (= Federico "Fede" Gatta, the Fede Mari waits for) says "pota" and cites Brescia; Sara **rarely** drops a censored "porco d\*o" (~3 times in the whole game); Caue barely appears and preaches in verses.
- Phone entries can be stickers: `{ from, sticker: '🌸' }` (a big emoji, no bubble).
- **`locations[chapter]`** is explicit per chapter; with no entry, the character is absent that chapter. `map` is a spawn-point name or a raw map key.
- **`chapters[chapter]`** is resolved live by `resolveInteraction`; with no entry, the character just says `default`. `battle`/`quiz`/`item` only fire in the chapter that defines them.

### Interaction flow (`WorldScene.tryInteract`)

The target is the NPC about one tile in front of the player. On every interaction, `questState.greet(id)` runs first. Then the branches are checked in the order **battle → quiz → item → plain**:

- **battle**: capture the current chapter `ch` → `onProgress()` (greet objectives tick here) → if already won **in `ch`**, show `dialogueAfter` and stop (no rematch). Otherwise show `dialogue` → `ask(prompt, options)` → **any** option fights. A win is credited to `ch`, even if the story moved on meanwhile.
- **quiz**: show `dialogue` → `ask`. A right answer → `solve(id)` → `onProgress()`. A wrong answer → `wrong`, with a retry. Once solved this chapter, it shows `dialogueAfter`.
- **item**: show `dialogue`, give the item, `onProgress()`, then the "Hai ottenuto" pop-up.
  - A **permanent** item is given once ever (`addItem`); once owned, it shows `dialogueAfter`.
  - A **consumable** (`consumable: true`) is given **once per chapter per giver**, adding `qty` units (`addSupply`; tracked by `gotGiftFrom`).
  - `{ item }` objectives count consumables as obtained even after they're used up.
- **plain**: `onProgress()`, then show the dialogue.

`onProgress()` advances the chapter if it's done, refreshes the HUD, **saves**, and shows the green "Capitolo completato — partita salvata" banner when the chapter changed. It also runs on map entry (explore objectives) and after a battle win.

### Battle

Launch with `scene.launch('BattleScene', { enemyKey, enemyChar, enemyName, heroChar, heroKey, heroName, chapter })`. Portraits are used as battle sprites when they exist.
- **Stats**: hero = `questState.heroStats(baseStats(zionick))`, i.e. base stats + every item buff. Enemy = `baseStats(enemy)`.
- **Hero hit** = `move.dmg + hero.attack − enemy.defense` (min 1).
- **Arrest** (`arrest: true`) is a **finisher**: it KOs only if enemy HP ≤ `arrestBelow` × max (default `ARREST_BELOW` 0.4). Otherwise it fails and the turn is wasted. The menu dims it while unavailable.
- **Menu**: the hero's moves + **Zaino** (consumables: `+heal` HP, uses the turn; "Indietro" doesn't). There is **no Fuga**, by the user's decision.
- **Enemy turn**: a random move from the enemy's JSON `moves`, dealing `move.dmg + enemy.attack − hero.defense` (min 1). Without `moves`, a generic counter with base `rand(3,6)`. Gabbo, Gatta, Mari and Caue have named moves.
- **Status effects** (any move with `status` + `chance`): **imbarazzato** = the target loses its next action; **assonnato** = the target's next 2 actions deal half damage (rounded up). They show as `[IMBARAZZO]` / `[SONNO]` on the HP plates. Hero moves: Insulto (25% imbarazzo), Manette (60% imbarazzo).
- **Round order**: hero (unless in imbarazzo), then enemy (unless KO or in imbarazzo). No speed, misses or crits.
- **HP persists between battles.** The hero starts with `questState.currentHp(max)`, and after a win keeps what's left (`questState.setHp`). Enemies always start full.
- **Stats**: battles add to `questState.stats` (`wins`, `losses`, and `playMs`, which the world also accumulates) for the ending screen.
- **A loss** → `world.onDefeat()`: wake up at `DEFEAT_RESPAWN` (the living room) at full HP, with a banner. No other penalty; talk to the enemy again to retry.
- **A win** → `questState.defeat(enemyChar, chapter)` → `world.onProgress()` (advance + save).
- **Healing outside battle**: sit on a seat (`SEAT_HEAL_PER_SEC`), and +maxHp items also heal by the same amount. A new game starts at full HP.
- **Seats**: `props[].seats` define where the player's feet must be to sit. Generate them with `remove_bg.py --seat X0 Y0 X1 Y1 FACING`. Sitting (`WorldScene.sitOn`) slides Zio Nick to the seat's centre sideways, swaps to the **seated sheet** `assets/characters/zionick/sit.png` (4×4, rows down / left / right / up, every facing its own art, no mirroring; same 216×350 cells and feet baseline as `player.png`; built from the user's `sit_source.jpg`, figures scaled ×1.1 so the head matches the walking sprite) with a small squash, and loops the 4 frames slowly (`sit-<facing>`, `PLAYER.SIT_FRAMERATE` 3, yoyo). `standUp` restores the walk sheet with a small stretch. `prepareSitTexture` in `playerSprite.js`; without the file, the old fallback (idle frame facing the seat) still works.

### Save system

`js/core/save.js`, one localStorage slot (`opsgame-save`).
- **What's saved**: `{ version, savedAt, mapKey, x, y, facing, quest: questState.toJSON() }`. The quest part includes `heroHp` (`null` = full), `supplies`, `stats`, `phoneSeen` (per chat), `side` + `points` (favours, punti casa), `affinity` + `extraMessages` (hearts, unlocked private messages). Every field is optional on restore, so older saves still load. Buffs are **not** stored; they're re-derived from items on load, so retuning an item applies to old saves.
- **When it saves**: WorldScene autosaves on map entry, on every `onProgress()`, every `AUTOSAVE_MS`, and on `beforeunload`. There is no manual save.
- **TitleScene**: *Continua* (`applySave`: progress restored, **always in Zio Nick's room**), *Scegli capitolo* and *Nuova partita* (with a confirmation if a save exists).
- **Scegli capitolo** (`js/story/rewind.js`): any chapter up to the furthest reached (`questState.reached`, set by `markReached` in `advanceChapterIfDone`). After a confirmation, `rewindTo(id, itemChaptersFrom(characterJsons))` resets that chapter and the later ones: their log entries (global sets rebuilt from what's left), the items/consumables they gave (item → chapter map from the character JSONs + event gifts), their chapter cards/events, the ending, the premise/investigation intro if you go back before them; HP full, clock reset, visible messages marked read. Socks, favours, points, affinity, clues and stats are kept. story-check tests it.
- **Esc menu**: *Ricomincia da capo* → confirmation (defaults to No) → `clearSave()` + `questState.reset()` + restart at `START_MAP`.
- **Robustness**: `loadSave` returns null for corrupt JSON, another `VERSION`, or a chapter that no longer exists. `applySave` falls back to `START_MAP` for an unknown map, and to the map's default spawn for an out-of-bounds position. A position inside a wall (the map was edited after saving) is **not** detected.

### Story / quest system

`questState` holds:
- `activeChapter`, the global Sets `greeted`/`defeated`/`solved`/`visited`/`flags`, and the per-chapter `log`;
- `items[]`, `buffs`, `supplies`, `heroHp`, `stats` and `currentMap`.

Chapter files:
- Register each chapter in **both** `CHAPTERS` and `ORDER` (`js/story/chapters.js`).
- A chapter may have `phone: [{ from: '<character id>', text }]`: group-chat messages shown on the phone (P) from that chapter on (`phoneMessages()`). Each chapter has **2–5** messages (the user asked for about 3–4, varied): the first carries the hint, the rest is ordinary house chatter in each persona's voice. **Nobody knows about Zio Nick's melons**: the chat never mentions them; only the NPCs he questions in person react to them.
- When the last chapter's quest completes (`isStoryComplete()`), `onProgress` shows **EndingScene** once (flag `ending-seen`).
- `advanceChapterIfDone()` moves to the next chapter that has a `quest`, and credits the map you're standing in as visited for the new chapter.

**Objectives are chapter-scoped.** Action objectives only count actions taken **while their chapter is active** (`questState.didIn(kind, id)`), so nothing done earlier can pre-complete a later chapter. State objectives (item, flag) check what you have now.

| Objective | Done when | Recorded by | Kind |
|---|---|---|---|
| `{ npc: 'id' }` | talked to them during this chapter | any interaction | interact |
| `{ item: 'Name' }` | the item is in the bag (ever obtained) | item branch | search/fetch |
| `{ defeat: 'id' }` | beat them during this chapter | battle win | fight |
| `{ quiz: 'id' }` | answered them right during this chapter | quiz branch | quiz |
| `{ visit: 'map-key' }` | entered or stood in the map during this chapter | map entry / chapter start | explore |
| `{ flag: 'name' }` | the flag is set (ever) | your `questState.setFlag()` | custom |

Objectives mix freely, are unordered, and all must be done. Points to keep in mind:
- **Soft-locks**: every referenced NPC or item giver must be placed in that chapter (story-check enforces this).
- **Talking to a battle NPC** greets them before the fight, so a `{ npc }` objective on a battle NPC completes on talking, not on winning. **Never use `{ npc }` for an enemy**: use `{ defeat }` (chapter 2 had this bug).
- **Item names are global**: never give the same item name in two chapters.
- **Global vs per-chapter**: `isGreeted` / `isDefeated` / `isSolved` / `hasVisited` are global ("ever"); `didIn` is per chapter.

### Audio

`js/core/audio.js` is the single source of truth. `SOUNDS[key] = { path, type: 'music'|'sfx', volume?, loop? }`, and `SCENE_MUSIC[sceneKey] = trackKey`.
- `loadAudio(scene)` runs in `preload`. `attachAudio(scene)` sets `scene.audio`; it deliberately does **not** stop music on shutdown, because WorldScene restarts on every warp.
- `playSceneMusic()` / `playMusic(key)` adopt an already-playing instance, so music runs continuously across warps. `playSfx(key)` is a no-op for unknown keys.
- **Wired now**: `world-theme` = `assets/sounds/zionick.mp3` (WorldScene).
  - `npc-talk` fires on every interaction but has no file yet.
  - `battle-theme` is scaffolded but commented out. BattleScene pauses the world theme and `endBattle` resumes it.
- Audio unlocks on the first key press (browser autoplay policy). TitleScene is silent; music starts with WorldScene.

## Repo state

Git: branch `master`, commits `29d68aa` (initial) and `ffd0ee4` (lowered Zio Nick's attack and Spinta). Everything below is built and checked (`story-check` passes), but the latest work is **uncommitted**.

| Area | State |
|---|---|
| World | 35 maps (2 U-shaped floors, 27 bedrooms, 2 kitchens, shared bathroom & laundry, laundry, trashbin, entrance), warps, stairs, all furniture from the orientable catalogue (12 views, 11 types) |
| NPCs | 11 housemates + Lilia (guest, 3 chapters) with sprites + portraits, data-driven placement / dialogue per chapter, wandering |
| Story | **"Zio Nick e i due meloni"**: he wakes up in room-20 and his two melons are gone; 11 chapters + the chapter-12 epilogue at the Alcatraz club (skeleton) (all six objective kinds) follow the leads to Caue, who took them ("chi ha due meloni ne dia uno a chi non ne ha"). Fights, items and personas unchanged — see [STORY.md](STORY.md) |
| Battle | turn-based, stat-driven, item buffs, arrest finisher |
| UI | title screen, quest tracker, bag, Esc menu, item / chapter banners, room label |
| Save | autosave to localStorage, continue / new game / restart with confirmation |
| Audio | world theme; battle theme + talk SFX scaffolded (files missing) |
| Tooling | sprite repack + prop background removal / placement (Python), story + save check (Node) |

## Known issues

1. Only Zio Nick has seated poses; NPCs never sit.
2. A save made before a map edit can drop the player inside a wall (only bounds are validated).
4. **TEMPORARY**: the title menu has a test shortcut `🛠 DEV · Vai al capitolo 12` (`DEV_JUMP` / `devJump` in `TitleScene.js`, added 2026-10-17 at the user's request). Remove it before release.
3. `maps/README.md` and `assets/characters/README.md` are outdated (theme names, start map, connection diagram, protagonist). This file is authoritative.

## Roadmap

Ordered by value ÷ effort. Tick items as they land and add new ones as they come up.

**Done**
- [x] Save / load: autosave, title screen (Continua / Nuova partita), Esc → Ricomincia da capo with confirmation
- [x] Chapter-scoped objectives. This fixed three skips: ch2 skipped after meeting Gabbo in ch1; ch6 pre-ticked by the ch3 kitchen visit; ch8 pre-ticked by greeting Ana (ch1–2) / Gaia (ch3).
- [x] SEI IN ARRESTO is a finisher (≤ 40% HP) instead of an unlimited instant KO
- [x] No rematch after a win in the same chapter (uses `dialogueAfter`)
- [x] `tools/checks/story-check.mjs` and `STORY.md`
- [x] `tools/sprites/remove_bg.py`: background removal, trimming, props entry + collider
- [x] NPCs avoid solid furniture. Before, they could spawn inside and walk through it.
- [x] Kitchens: shelves + island added, `main_table` collider fixed (it was still sized for the table's old position), door and arrival moved top-right

**Next: quick wins**
- [x] `START_MAP = 'entrance'` and walking speed 600 px/s (2026-10-13)
- [ ] Optional dev toggle (e.g. hold Shift to run) for fast travel while testing
- [x] Unify naming: `timo` is called Alessio (2026-10-13)
- [x] All chapter titles/labels in Italian (2026-10-14)
- [x] Ch2 needs **beating** Gabbo (`{ defeat: 'gabbo' }`): talking to him used to complete it before the fight (user bug report, 2026-10-14)
- [x] "!" over NPCs needed by the active quest (2026-10-13)
- [x] Quest guidance: "→ who, where" under each open objective in the tracker (2026-10-13)
- [x] Typewriter dialogue text (2026-10-13)
- [x] Chapter title card (2026-10-13)
- [ ] The `battle-theme` + `npc-talk` files (user supplies the audio)
- [x] Light rebalance (2026-10-14): Gatta 34/9/3, Mari 46/13/5, Caue 70/17/6 (Monte Carlo numbers in STORY.md). They now leave a mark; Caue needs the badge (96% with it, 45% without).
- [ ] Refresh the outdated READMEs
- [ ] A map preview tool that renders a map PNG (tiles, props, colliders, spawns, NPC tiles) so layouts can be reviewed without running the game. It was done ad hoc in a scratch script for the kitchens.

**Approved gameplay features** (approved by the user on 2026-10-13: all 17 proposals, with one exception: **no Fuga / flee option in battle**). They are grouped into phases by what they need. Numbers refer to the original proposal list.

*Phase A: engine only, no new content or art needed*
- [x] (10 + 8) Persistent hero HP between battles, sitting on chairs/stools to heal, and losing → wake up in the living room at full HP
- [x] Sleeping in Zio Nick's own room (**room-20**, first floor) for a full heal: examine his bed → fade + `heroHp = null` (`sleep: true` on the prop, `WorldScene.sleepInBed`) (2026-10-13)
- [x] (3) Battle depth. **No Fuga.**
  - named enemy moves (Gabbo, Gatta, Mari, Caue);
  - imbarazzo / sonno statuses;
  - consumables + a Zaino menu in battle. Sources: Sara ch1 "Caffè della moka" ×2, Emanuele ch8 "Biscotti fatti in casa" ×2.
- [x] (12) House phone (P): a WhatsApp chat of the group "Cucina di su", with the mission + where to go pinned (from the data) and one hint per chapter (placeholder texts, for the user to rewrite)
- [x] (15) Minimap (M) of the current floor, with you + numbered objectives (rooms marked at their door)
- [x] WASD movement, key-hint bar, quest tracker wraps long text (2026-10-13)
- [x] Bedroom suites (anteroom + bathroom under every room) and the phone HUD icon with an unread badge (2026-10-13)
- [ ] Bathroom art for the suites (toilet, sink, shower): the user supplies PNGs → `assets/furniture/rooms/<type>/`
- [x] Orientable furniture: catalogue (`furniture-catalog.js`) + expansion (`furniture.js`) + `tools/sprites/furniture.py` + story-check checks. All kitchen + bedroom furniture migrated to `assets/furniture/` with identical geometry (2026-10-13); washing machine in the shared bathroom & laundry, 3 drying racks in the first-floor hall
- [x] (17) Ending screen after the last chapter (11): credits + time, wins, losses, items. Shown once, then you can keep exploring.
- [x] The HP bar moved into the bag (the user didn't want it on screen)
- [x] Prop depth sorting (the user's choice: every prop except the kitchen table)

*Phase B: new systems + light content*
- [~] (2) Examinable props: **descriptions done** (catalogue `label` / `examine`, placeholder Italian lines for the user to rewrite). Still to do: hidden items / `flag` objectives, and per-room texts so each of the 27 bedrooms belongs to its housemate.
- [ ] (9) Recycling minigame at the kitchen bins: timed; drop each item in the right colour (yellow plastic / grey residual / blue paper / green glass). **Waiting for the user's waste-item images.**
- [ ] (5) Doors locked until you hold a key item
- [x] (13) 5 favours → punti casa → Alessio's shop (Proteine, Pre-workout +2 ATK, Cintura +2 DEF) (2026-10-14)
- [x] Gabbo roams the corridors from chapter 3: rematch once per chapter for punti casa (2026-10-14)
- [x] Phone: chat list + private chats (`dm: true`) (2026-10-14)
- [x] Idle housemates hang out in the first-floor kitchen ("cucina di su") in every chapter where they have no story role (2026-10-14)
- [~] (14) Collectibles: **12 odd socks done** (bag + ending count). Still to do: more kinds (lost tupperware…) and achievements on the title screen
- [ ] (11) Cooking at the kitchen counter: combine items into consumables, with recipes taught by housemates

*Phase C: content-heavy (needs the user's house jokes / memories)*
- [x] (1) Melon investigation: premise at start, opens in chapter 3, 4 clues in the furniture, present evidence before the final fight (2026-10-14)
- [x] Ana's aperitivo event in chapter 7 (first-floor kitchen), cinematic camera (2026-10-14)
- [x] Clock + day/night with a start time per chapter; message times follow it (2026-10-14)
- [ ] (8) "Riunione di casa" event at the kitchen table: everyone seated, with house votes as dialogue choices
- [x] (6) Affinity hearts + unlocked private messages (2026-10-14). Still possible: affinity-gated dialogue choices or endings
- [ ] (16) Allies: one assist move per battle from a befriended housemate
- [~] (7) Day/night: **clock + night veil done**. Still to do: NPC schedules by time of day, house chore turns
- [ ] (4) More location minigames: laundry socks, dishes rhythm
- [ ] Per-enemy battle backgrounds (needs art)
- [~] Chapter 12, night at the Alcatraz: **skeleton done** (chapter, front-door trip, cutscene scene, club map, stage trigger). Waiting for the user's MP4 (`assets/cutscenes/alcatraz.mp4`) and more images of the club to customise the map, props and people

## How-to recipes

- **New room / map**: create `maps/<name>/<name>.js` → register it in `maps/index.js` → add `setDoor` + a warp in the connecting map, plus a return spawn → give the new map spawns and a warp back. Validate with an ASCII / flood-fill check and story-check.
- **New NPC**: the user supplies `player_source.png` → run `repack_player.py <name>` → write `character.json` → add the folder to `CHARACTERS`. No map edits needed. To move an NPC, just change `locations`.
- **New chapter**: create `js/story/chapter-N/chapter-N.js` with `{ id, title, quest: { id, title, objectives } }` → register it in `CHAPTERS` + `ORDER` → add `locations` / `chapters` entries for the characters involved → run story-check → update STORY.md (and Repo state / Roadmap here if relevant).
- **Orientable furniture**: the user drops `assets/furniture/<group>/<type>/<type>_<n|e|s|w>.png` → `python3 tools/sprites/furniture.py <type>` (no options) → read the trimmed sizes and pick the solid regions, seats and depth line per view → rerun with `--region/--seat/--base` → paste the entry into `js/core/furniture-catalog.js` → place it with `{ furniture: '<type>', dir, tx, ty }` → story-check. Changing direction in a map = changing `dir` only.
- **New prop**: the user drops the PNG → run `python3 tools/sprites/remove_bg.py <png> --fit TX TY W` → paste the printed entry into the map's `props`. `key` is a texture key, so it must be unique per image; reuse the same key for the same image in other maps. Check that the gaps between colliders are ≥ 1 tile, so the player (body ~0.85 tile) can pass.
- **Tune a fight**: edit the enemy `stats`, the item `buff`s, or `arrestBelow`, using the formulas in Battle. Recompute the turns / damage table in STORY.md.
- **Add a sound**: the user drops the file → add a `SOUNDS` entry (+ `SCENE_MUSIC` for a soundtrack). No scene edits needed.
