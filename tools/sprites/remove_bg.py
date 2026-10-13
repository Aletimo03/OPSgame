#!/usr/bin/env python3
"""Prepare a furniture / prop PNG for the game and print its `props` entry.

1. Background removal (only if the image is NOT already transparent):
   near-white pixels CONNECTED TO THE IMAGE BORDER become transparent, plus a
   1-px light fringe around them (kills the white halo). White parts INSIDE the
   object (a white table top, a sheet, cabinet doors) are kept — unlike a plain
   "every white pixel" key. The original is kept as <name>_source.png.
   LIMIT: a white edge of the object that touches the white background with
   no outline in between can't be told apart from it, and may be eaten on a
   noisy (JPEG / AI) background. Best: export with transparency, or ask the
   render for an outline / non-white background.
2. Optional --trim: crop the transparent margin (keeps a small pad).
3. Placement: given where the prop goes in a map, print a ready-to-paste
   `props` entry whose `collider` hugs the visible pixels (not the padding).

Usage (from the project root):
    python3 tools/sprites/remove_bg.py assets/furniture/island/island_s.png
    python3 tools/sprites/remove_bg.py assets/furniture/sofa/sofa_s.png --trim
    # visible object should cover tiles x 11..17, starting at row 6:
    python3 tools/sprites/remove_bg.py assets/furniture/island/island_s.png --fit 11 6 6
    # or give the image's display box directly (as written in the map file):
    python3 tools/sprites/remove_bg.py assets/furniture/main_table/main_table_s.png --box 14 9 15 7

Options:
    --threshold N   0-255: channels ABOVE this count as background white.
                    Default "auto": measured from the image border, so a clean
                    pure-white background only removes pure white (keeps the
                    248-254 whites of the object) and a noisy one gets more slack.
    --force         key the background even if the image already has alpha
    --trim          crop to the visible pixels (+ PAD px) and save
    --fit TX TY W [H]  place by the VISIBLE object: its left/top tile + width
                    in tiles (+ height to stretch it; default keeps the aspect)
    --box TX TY W [H]  place by the IMAGE box (H defaults to keep the aspect)
    --foot F        collider = only the bottom fraction F of the object
                    (default 1 = whole object; e.g. 0.5 for a tall wardrobe
                    whose top half is "above" the floor)
    --region X0 Y0 X1 Y1  collider = only this part of the image (source px),
                    e.g. a table top without its chairs, so the chairs stay
                    walkable. Default: all visible pixels. Repeatable: several
                    regions print a `colliders: [...]` array (e.g. a sofa's
                    back + armrests, leaving the seats free).
    --seat X0 Y0 X1 Y1 FACING  (repeatable) a seat: the area (source px) where
                    the player's feet must be to sit with Space, and the
                    direction they face once seated (up/down/left/right).
    --key NAME      props key (default: file name without extension)
"""
import argparse
import os
import sys
from collections import deque

import numpy as np
from PIL import Image

PAD = 4          # px kept around the object by --trim
ALPHA_MIN = 10   # alpha above this counts as "visible"


def border_is_transparent(alpha):
    border = np.concatenate([alpha[0], alpha[-1], alpha[:, 0], alpha[:, -1]])
    return (border < ALPHA_MIN).mean() > 0.9


def edge_connected(mask):
    """Pixels of `mask` 4-connected to the image border."""
    try:
        from scipy import ndimage
        labels, _ = ndimage.label(mask)
        edge_labels = np.unique(np.concatenate([labels[0], labels[-1], labels[:, 0], labels[:, -1]]))
        edge_labels = edge_labels[edge_labels != 0]
        return np.isin(labels, edge_labels)
    except ImportError:  # plain BFS fallback
        h, w = mask.shape
        out = np.zeros_like(mask)
        q = deque()
        for x in range(w):
            for y in (0, h - 1):
                if mask[y, x] and not out[y, x]:
                    out[y, x] = True
                    q.append((y, x))
        for y in range(h):
            for x in (0, w - 1):
                if mask[y, x] and not out[y, x]:
                    out[y, x] = True
                    q.append((y, x))
        while q:
            y, x = q.popleft()
            for ny, nx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
                if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and not out[ny, nx]:
                    out[ny, nx] = True
                    q.append((ny, nx))
        return out


def auto_threshold(rgb):
    """Background cut-off from the border's own whiteness (5th percentile)."""
    border = np.concatenate([rgb[0], rgb[-1], rgb[:, 0], rgb[:, -1]]).min(-1)
    return int(np.clip(np.percentile(border, 5) - 1, 200, 254))


def remove_background(arr, threshold):
    rgb = arr[..., :3].astype(int)
    bg = edge_connected((rgb > threshold).all(-1))
    # 1-px fringe: light pixels touching the removed area (anti-aliased halo).
    grown = bg.copy()
    grown[1:] |= bg[:-1]
    grown[:-1] |= bg[1:]
    grown[:, 1:] |= bg[:, :-1]
    grown[:, :-1] |= bg[:, 1:]
    fringe = grown & ~bg & (rgb > threshold - 40).all(-1)
    arr[bg | fringe, 3] = 0
    return int(bg.sum() + fringe.sum())


def content_bbox(alpha):
    ys, xs = np.where(alpha > ALPHA_MIN)
    if not len(xs):
        sys.exit('The image is fully transparent — nothing to place.')
    return xs.min(), ys.min(), xs.max() + 1, ys.max() + 1  # x0, y0, x1, y1 (exclusive)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('png')
    ap.add_argument('--threshold', default='auto')
    ap.add_argument('--force', action='store_true')
    ap.add_argument('--trim', action='store_true')
    ap.add_argument('--fit', type=float, nargs='+', metavar='N')
    ap.add_argument('--region', type=float, nargs=4, action='append', default=[], metavar=('X0', 'Y0', 'X1', 'Y1'))
    ap.add_argument('--seat', nargs=5, action='append', default=[], metavar=('X0', 'Y0', 'X1', 'Y1', 'FACING'))
    ap.add_argument('--box', type=float, nargs='+', metavar='N')
    ap.add_argument('--foot', type=float, default=1.0)
    ap.add_argument('--key')
    a = ap.parse_args()

    path = a.png
    img = Image.open(path).convert('RGBA')
    arr = np.array(img)
    changed = False

    if border_is_transparent(arr[..., 3]) and not a.force:
        print(f'{path}: {img.size[0]}x{img.size[1]}, already transparent — background left as is.')
    else:
        thr = auto_threshold(arr[..., :3]) if a.threshold == 'auto' else int(a.threshold)
        n = remove_background(arr, thr)
        print(f'{path}: removed {n} background px ({100 * n / arr[..., 3].size:.1f}%), threshold {thr}'
              f'{" (auto)" if a.threshold == "auto" else ""}.')
        changed = n > 0

    if a.trim:
        x0, y0, x1, y1 = content_bbox(arr[..., 3])
        x0, y0 = max(0, x0 - PAD), max(0, y0 - PAD)
        x1, y1 = min(arr.shape[1], x1 + PAD), min(arr.shape[0], y1 + PAD)
        if (x0, y0, x1, y1) != (0, 0, arr.shape[1], arr.shape[0]):
            arr = arr[y0:y1, x0:x1].copy()
            print(f'trimmed to {arr.shape[1]}x{arr.shape[0]}.')
            changed = True

    if changed:
        stem, ext = os.path.splitext(path)
        backup = f'{stem}_source{ext}'
        if not os.path.exists(backup):
            img.save(backup)
            print(f'original kept as {backup}')
        Image.fromarray(arr).save(path)
        print(f'saved {path}')

    # ── placement ────────────────────────────────────────────────────────────
    H, W = arr.shape[:2]
    x0, y0, x1, y1 = content_bbox(arr[..., 3])
    print(f'visible object: x {x0}-{x1}, y {y0}-{y1} of {W}x{H} '
          f'(aspect {(x1 - x0) / (y1 - y0):.3f}, image aspect {W / H:.3f})')
    if not (a.fit or a.box):
        return

    if a.fit:
        if len(a.fit) not in (3, 4):
            sys.exit('--fit needs TX TY W [H]')
        ctx, cty, cw = a.fit[:3]
        w = cw * W / (x1 - x0)             # image width so the visible part is cw tiles
        h = a.fit[3] * H / (y1 - y0) if len(a.fit) == 4 else w * H / W
        tx = ctx - x0 / W * w
        ty = cty - y0 / H * h
    else:
        if len(a.box) not in (3, 4):
            sys.exit('--box needs TX TY W [H]')
        tx, ty, w = a.box[:3]
        h = a.box[3] if len(a.box) == 4 else w * H / W

    sx, sy = w / W, h / H                  # tiles per source px
    vx0, vy0, vx1, vy1 = x0, y0, x1, y1    # visible object (for the summary line)
    cols = [{
        'tx': tx + rx0 * sx,
        'ty': ty + ry0 * sy + (1 - a.foot) * (ry1 - ry0) * sy,
        'w': (rx1 - rx0) * sx,
        'h': (ry1 - ry0) * sy * a.foot,
    } for rx0, ry0, rx1, ry1 in (a.region or [(x0, y0, x1, y1)])]
    seats = []
    for sx0, sy0, sx1, sy1, facing in a.seat:
        if facing not in ('up', 'down', 'left', 'right'):
            sys.exit(f'--seat facing must be up/down/left/right, got {facing!r}')
        sx0, sy0, sx1, sy1 = map(float, (sx0, sy0, sx1, sy1))
        seats.append((tx + sx0 * sx, ty + sy0 * sy, (sx1 - sx0) * sx, (sy1 - sy0) * sy, facing))
    rel = os.path.relpath(path).replace(os.sep, '/')
    key = a.key or os.path.splitext(os.path.basename(path))[0]
    f = lambda v: f'{round(v, 2) + 0.0:.2f}'.rstrip('0').rstrip('.')  # + 0.0 avoids "-0"
    box = lambda c: f"{{ tx: {f(c['tx'])}, ty: {f(c['ty'])}, w: {f(c['w'])}, h: {f(c['h'])} }}"
    colliders = f"collider: {box(cols[0])}" if len(cols) == 1 else f"colliders: [{', '.join(box(c) for c in cols)}]"
    print('\nprops entry:')
    print(f"    {{ key: '{key}', path: '{rel}', tx: {f(tx)}, ty: {f(ty)}, w: {f(w)}, h: {f(h)}, "
          f"solid: true, {colliders}"
          + (', seats: [' + ', '.join(f"{{ tx: {f(a_)}, ty: {f(b_)}, w: {f(c_)}, h: {f(d_)}, facing: '{e_}' }}"
                                       for a_, b_, c_, d_, e_ in seats) + ']' if seats else '')
          + ' },')
    print(f"visible object covers tiles x {f(tx + vx0 * sx)}–{f(tx + vx1 * sx)}, "
          f"y {f(ty + vy0 * sy)}–{f(ty + vy1 * sy)}")
    for c in cols:
        print(f"collider covers tiles x {f(c['tx'])}–{f(c['tx'] + c['w'])}, "
              f"y {f(c['ty'])}–{f(c['ty'] + c['h'])}")


if __name__ == '__main__':
    main()
