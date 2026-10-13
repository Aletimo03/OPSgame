# assets/furniture/

Orientable furniture, in three groups: `kitchen/` (kitchen pieces), `rooms/`
(bedroom pieces), `others/` (everything else: laundry, drying racks, …).
One folder per piece, one PNG per direction:

```
assets/furniture/<gruppo>/<tipo>/<tipo>_n.png   front faces UP (back to the camera)
assets/furniture/<gruppo>/<tipo>/<tipo>_e.png   front faces RIGHT
assets/furniture/<gruppo>/<tipo>/<tipo>_s.png   front faces DOWN (towards the camera)
assets/furniture/<gruppo>/<tipo>/<tipo>_w.png   front faces LEFT
```

- `<gruppo>`: `kitchen`, `rooms` or `others`. The catalogue entry says it (`group: 'kitchen'`).

- `<tipo>`: lowercase, no spaces (e.g. `divano`, `poltrona`, `letto_matrimoniale`).
- Any subset of the four is fine. Nothing is rotated or mirrored by the game.
- PNG RGBA, transparent background preferred; same pixels-per-tile in every view
  (48 px = 1 tile is ideal).

Then run `python3 tools/sprites/furniture.py <tipo>` and paste its output into
`js/core/furniture-catalog.js`. Place it in a map with
`{ furniture: '<tipo>', dir: 's', tx, ty }`.
