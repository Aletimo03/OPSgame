#!/usr/bin/env python3
"""Repack a raw character render into a clean game sprite sheet.

Input : assets/characters/<name>/player_source.* (the AI render: a preview
        frame + 3 walk rows of 4 frames, optionally with a standalone
        full-body figure off to one side). Background may be white OR already
        transparent.
Output: assets/characters/<name>/player.png -> transparent, evenly-spaced
        4 cols x 3 rows (Down / Side / Up). Preview frame + any standalone
        full-body figure are dropped.

Handles automatically:
  * already-transparent sources (keeps the existing alpha — no white-keying,
    so white clothing/shoes are NOT punched out);
  * a tall standalone figure beside the grid (detected because it bridges the
    walk rows into one band) — it is cropped away before slicing.

Run from the project root:
    python3 tools/sprites/repack_player.py [character]
e.g.  python3 tools/sprites/repack_player.py gaia   (default: gaia)
"""
import sys
import numpy as np
from PIL import Image

CHARACTER = sys.argv[1] if len(sys.argv) > 1 else "gaia"
BASE = f"assets/characters/{CHARACTER}"
SRC_CANDIDATES = [f"{BASE}/player_source.png", f"{BASE}/player_source.jpg",
                  f"{BASE}/player_source.jpeg"]
OUT = f"{BASE}/player.png"
PORTRAIT = f"{BASE}/portrait.png"

COLS = 4
ROWS = 3                # down, side, up (preview row is dropped)
NEEDED_BANDS = ROWS + 1 # preview + the 3 walk rows
WHITE_THRESH = 235      # only used when the source has NO real alpha channel
PAD = 6                 # transparent padding around each sprite in the output


def load_source():
    for p in SRC_CANDIDATES:
        try:
            return Image.open(p).convert("RGBA"), p
        except FileNotFoundError:
            continue
    sys.exit(f"No source found. Save the raw art as {BASE}/player_source.png")


def runs(mask):
    """Return [(start, end_exclusive), ...] for contiguous True runs."""
    out = []
    i, n = 0, len(mask)
    while i < n:
        if mask[i]:
            j = i
            while j < n and mask[j]:
                j += 1
            out.append((i, j))
            i = j
        else:
            i += 1
    return out


def bands_of(alpha):
    row_has = alpha.max(axis=1) > 0
    return [run for run in runs(row_has) if run[1] - run[0] > 8]


def col_runs_of(alpha):
    col_has = alpha.max(axis=0) > 0
    return [c for c in runs(col_has) if c[1] - c[0] > 6]


def main():
    img, src_path = load_source()
    arr = np.array(img)

    # Use the existing alpha if the source is already keyed; otherwise treat
    # near-white as background. (Keying white would eat white clothes/shoes.)
    has_alpha = int(arr[..., 3].min()) < 250
    if has_alpha:
        print(f"source: {src_path} {img.size} (already transparent — keeping alpha)")
    else:
        r, g, b = arr[..., 0], arr[..., 1], arr[..., 2]
        opaque = ~((r > WHITE_THRESH) & (g > WHITE_THRESH) & (b > WHITE_THRESH))
        arr[..., 3] = np.where(opaque, 255, 0)
        print(f"source: {src_path} {img.size} (white-keyed to transparent)")

    # Crop away a standalone full-body figure: if it sits beside the grid it
    # vertically bridges the walk rows, so we see FEWER bands than expected.
    # Remove the leftmost column run and retry until the bands separate out.
    # Strip the leftmost column run as long as doing so actually SEPARATES more
    # bands (i.e. it was a tall figure bridging the walk rows). We can't rely on
    # a plain column count: the grid's own columns sometimes merge into fewer
    # runs than COLS, so "figure + grid" can already look like <= COLS columns.
    x_off = 0
    while len(bands_of(arr[:, x_off:, 3])) < NEEDED_BANDS:
        cr = col_runs_of(arr[:, x_off:, 3])
        if len(cr) <= 1:
            break  # nothing left to strip
        cand = x_off + cr[0][1]  # skip past the leftmost run
        before = len(bands_of(arr[:, x_off:, 3]))
        after = len(bands_of(arr[:, cand:, 3]))
        if after <= before:
            break  # leftmost run isn't a band-bridging figure; stop stripping
        x_off = cand
    if x_off:
        print(f"  dropped standalone figure: cropped left {x_off}px")
        # Save that standalone full-body figure as a dialogue portrait.
        fig = arr[:, :x_off]
        mask = fig[..., 3] > 40  # ignore faint anti-alias pixels when trimming
        ys = np.where(mask.max(axis=1))[0]
        xs = np.where(mask.max(axis=0))[0]
        if len(ys) and len(xs):
            crop = fig[ys[0]:ys[-1] + 1, xs[0]:xs[-1] + 1]
            Image.fromarray(crop).save(PORTRAIT)
            print(f"  wrote {PORTRAIT} ({crop.shape[1]}x{crop.shape[0]})")
    arr = arr[:, x_off:]
    alpha = arr[..., 3]

    bands = bands_of(alpha)
    print(f"  content bands found: {len(bands)}")
    if len(bands) < ROWS:
        sys.exit(f"Expected at least {ROWS} bands, got {len(bands)}.")

    # Drop the preview frame: it's the topmost (smallest, single) band.
    walk_bands = bands[-ROWS:]

    # --- per band, find the COLS columns + per-frame bbox + FOOT line -------
    # Each frame is anchored by its FEET, detected as the lowest opaque pixel
    # in the CENTRAL part of the sprite (so an off-center swinging bag or coat
    # tail can't drag the anchor down and make the feet appear to float).
    def foot_line(x0, x1, y0, y1):
        w = x1 - x0
        cx0 = x0 + int(w * 0.30)
        cx1 = x0 + int(w * 0.70)
        central = alpha[y0:y1, cx0:cx1]
        ys = np.where(central.max(axis=1) > 0)[0]
        if len(ys) == 0:  # fallback: use full-width bottom
            ys = np.where(alpha[y0:y1, x0:x1].max(axis=1) > 0)[0]
        return y0 + ys[-1]  # absolute y of the foot baseline

    cells = []  # each row: list of (x0, y0, x1, y1, foot_y)
    for (y0, y1) in walk_bands:
        sub = alpha[y0:y1, :]
        col_has = sub.max(axis=0) > 0
        col_runs = [c for c in runs(col_has) if c[1] - c[0] > 6]
        if len(col_runs) != COLS:
            print(f"  band y[{y0}:{y1}] -> {len(col_runs)} columns (expected {COLS})")
        col_runs = sorted(sorted(col_runs, key=lambda c: c[1] - c[0],
                                 reverse=True)[:COLS])
        row_cells = []
        for (x0, x1) in col_runs:
            colsub = alpha[y0:y1, x0:x1]
            ys = np.where(colsub.max(axis=1) > 0)[0]
            ty0, ty1 = y0 + ys[0], y0 + ys[-1] + 1   # tight vertical bbox
            fy = foot_line(x0, x1, ty0, ty1)
            row_cells.append((x0, ty0, x1, ty1, fy))
        cells.append(row_cells)

    # --- uniform cell size --------------------------------------------------
    # Width: widest sprite. Height: enough for the tallest "head-above-foot"
    # plus the deepest "below-foot" overhang (bag/coat), so nothing clips.
    max_w = max(x1 - x0 for row in cells for (x0, _, x1, _, _) in row)
    max_above = max(fy - y0 for row in cells for (_, y0, _, _, fy) in row)
    max_below = max(y1 - fy for row in cells for (_, _, _, y1, fy) in row)
    cell_w = max_w + PAD * 2
    cell_h = max_above + max_below + PAD * 2
    foot_base = PAD + max_above  # y of the foot baseline inside every cell
    print(f"cell {cell_w}x{cell_h}, foot baseline at y={foot_base} "
          f"-> sheet {cell_w*COLS}x{cell_h*ROWS}")

    sheet = Image.new("RGBA", (cell_w * COLS, cell_h * ROWS), (0, 0, 0, 0))
    src_rgba = Image.fromarray(arr)

    for r_i, row in enumerate(cells):
        for c_i, (x0, y0, x1, y1, fy) in enumerate(row):
            sprite = src_rgba.crop((x0, y0, x1, y1))
            w = x1 - x0
            local_foot = fy - y0  # foot position within this crop
            dx = c_i * cell_w + (cell_w - w) // 2          # center horizontally
            dy = r_i * cell_h + (foot_base - local_foot)   # align feet to baseline
            sheet.paste(sprite, (dx, dy), sprite)

    sheet.save(OUT)
    print(f"wrote {OUT}")


if __name__ == "__main__":
    main()
