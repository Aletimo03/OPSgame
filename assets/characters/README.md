# assets/characters/zionick/

Sprites for the **protagonist, Zionick**. Each character (you, then your
housemates) gets a sibling folder here: `alessio/`, `gaia/`, etc.

## Files

- `player_source.*` — the raw art render (white background, preview frame,
  uneven spacing). Keep this; it's the editable master.
- `player.png` — the **game sheet**: transparent, evenly-spaced 4×3 grid
  (Down / Side / Up), feet aligned to a shared baseline. Generated from the
  source by the repack tool — don't hand-edit it.

## Layout the engine expects (`player.png`)

- **4 columns** (4 frames per walk row)
- **3 rows**, top → bottom: **Down**, **Side**, **Up**
- **Left** = the Side row mirrored in code (`flipX`); the side art faces LEFT.
- The standalone preview frame is dropped during repacking.

## Regenerating after new art

Drop the new render at `player_source.png` (or `.jpg`) and run, from the
project root:

```
python3 tools/sprites/repack_player.py zionick
```

(omit the name and it defaults to `zionick`). The tool removes the white
background, finds the 12 walking sprites, anchors each by the **feet** (so a
swinging bag/coat can't make the character float), and writes `player.png`.

## Tuning the slice

If a future sheet is laid out differently, adjust `SHEET` in
[`../../../js/config.js`](../../js/config.js): `cols`, `walkRows`,
`previewBands`.
