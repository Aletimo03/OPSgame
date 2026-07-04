# maps/ — co-housing areas

Each area is its own folder with a single module exporting a **map
definition**. The registry in [`index.js`](index.js) lists them all, and the
generic [`WorldScene`](../js/scenes/WorldScene.js) can render any of them and
warp the player between them.

```
maps/
├── index.js                  registry + START_MAP
├── entrance/                 game starts here
├── base-floor/               the big U-shaped main hall (hub)
├── base-kitchen/
├── first-floor/
├── first-floor-kitchen/
├── laundry-room/
└── trashbin-room/
```

## How the areas connect

```
            first-floor-kitchen
                   │ (north door)
              first-floor
                   │ (stairs, right wing)
 base-kitchen ─ BASE FLOOR (hub) ─ first-floor (stairs)
   (left wing)     │   │   │
            laundry │   │ trash       entrance ── (start)
              (south doors)   (south-centre door)
```

## Map definition format

```js
export default {
  key: 'base-kitchen',          // must equal the registry key
  name: 'Base Floor — Kitchen', // shown in the on-screen HUD label
  theme: 'kitchen',             // palette from js/core/themes.js
  grid,                         // 2D array of tile codes (see below)
  spawns: {                     // tile coords to drop the player on arrival
    default: { tx: 6, ty: 7 },
    fromBaseFloor: { tx: 6, ty: 7 },
  },
  warps: [                      // door tiles that send you elsewhere
    { tx: 6, ty: 9, to: 'base-floor', toSpawn: 'fromKitchen' },
  ],
};
```

### Tile codes (`grid[y][x]`, from `js/config.js`)

| code | meaning           |
|------|-------------------|
| `0`  | floor (walkable)  |
| `1`  | wall (solid)      |
| `2`  | door (walkable; triggers a warp) |

Build grids with the helpers in
[`../js/core/roomBuilder.js`](../js/core/roomBuilder.js):

- `makeRoom(cols, rows)` — rectangular room with a wall border.
- `makeUShape({...})` — the U-shaped hall.
- `setDoor(grid, tx, ty)` — mark a tile as a door (then add a matching `warp`).

### Warps

A `warp` is a door tile + destination. When the player steps on tile
`(tx,ty)`, the scene fades out and restarts on map `to`, placing them at that
map's `spawns[toSpawn]`. Keep each spawn **at least one tile away** from any
door so you don't instantly bounce back.

## Adding a new area

1. `mkdir maps/<name>` and add `maps/<name>/<name>.js` exporting a definition.
2. Register it in `maps/index.js`.
3. Add a door + `warp` in whichever existing map should lead to it, and a
   matching `spawns` entry in the new map for the return trip.

---

## ⭐ Recommended path for *customizable, Pokémon B/W2-looking* maps

You asked whether to use grid arrays, a tool like Tiled, or plugins. Short
answer: **grid arrays now (this system), Tiled later for the real art.** Two
phases, and this engine is built so phase 2 doesn't throw away phase 1.

**Phase 1 — grid arrays (where we are):** fast to block out room shapes,
doors, and how everything connects. No art needed, hand-editable, and the
warp/spawn graph is already exactly what a finished game needs. Use this to
nail the *layout* of all ~15 rooms + kitchens.

**Phase 2 — [Tiled Map Editor](https://www.mapeditor.org) + a Gen-5 tileset
(this is what gives the B/W2 look):** Tiled is the free, standard map editor;
Phaser loads its JSON natively (`this.make.tilemap`). You paint rooms with a
real **tileset image** (floors, walls, furniture, rugs, counters) instead of
flat colors, on layers:
- a **ground** layer, a **decoration/furniture** layer, and an **overhead**
  layer (things drawn *above* the player — doorway tops, hanging lamps) for
  the depth Gen 5 is known for;
- an **object layer** for warps and NPC spawn points (no more hand-typed
  coords).
The B/W2 aesthetic comes from the *tileset art + layering*, not the engine —
so the move is: get/commission a 16px Gen-5-style interior tileset, drop the
PNGs in `assets/tilesets/`, and export Tiled JSON into each `maps/<name>/`
folder. I'd then swap `MapRenderer` to read the tilemap while keeping the same
`warps`/`spawns` concepts.

**Plugins / full RPG toolkits:** not recommended — they lock you into their
conventions and fight Phaser's own (excellent) tilemap support. Phaser + Tiled
is the flexible, well-documented standard.

When you're ready for phase 2, say so and I'll wire up Tiled loading.
