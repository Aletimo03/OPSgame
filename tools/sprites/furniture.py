#!/usr/bin/env python3
"""Turn the orientation PNGs of one piece of furniture into a catalogue entry.

Expects, from the project root (<group> = kitchen | rooms | others):
    assets/furniture/<group>/<type>/<type>_n.png   (front faces up / the wall)
    assets/furniture/<group>/<type>/<type>_e.png   (front faces right)
    assets/furniture/<group>/<type>/<type>_s.png   (front faces down / the camera)
    assets/furniture/<group>/<type>/<type>_w.png   (front faces left)
The group folder is found automatically.
Any subset is fine (e.g. only _s and _e). Each file is its own drawing: nothing
is rotated or mirrored.

For every view it:
  1. removes a white background if the PNG isn't transparent yet (same rules as
     remove_bg.py: only white connected to the border), and trims the empty
     margin. The untouched original is kept once as <name>_source.png.
  2. converts pixels to tiles with ONE scale for all views (--ppt pixels per
     tile, default 48 = drawn 1:1 for the game; or --width to derive it), so
     the four views always match in size.
  3. prints the `FURNITURE` entry to paste into js/core/furniture-catalog.js:
     w/h, colliders, seats, baseY — all relative to the image's top-left.

Pixel coordinates in --region/--seat/--base refer to the TRIMMED file (run the
tool once with no options; it prints each trimmed size; measure on that file).

Usage:
    python3 tools/sprites/furniture.py divano
    python3 tools/sprites/furniture.py divano --width s 5          # _s visible width = 5 tiles
    python3 tools/sprites/furniture.py divano \\
        --region s 0 0 240 50  --region s 0 50 25 120  --region s 215 50 240 120 \\
        --seat s 30 60 120 115 down  --seat s 120 60 210 115 down  --base s 50

Options (DIR = n/e/s/w; all repeatable):
    --ppt N                     source pixels per tile (default 48)
    --width DIR TILES           instead of --ppt: that view's visible width in tiles
    --region DIR X0 Y0 X1 Y1    a solid box (px). None for a view = its whole visible area
    --foot DIR F                default collider = only the bottom fraction F of the view
    --seat DIR X0 Y0 X1 Y1 FACING   where the feet must be to sit; FACING up/down/left/right
    --base DIR Y                depth line (px): above it a character is drawn behind
    --no-solid / --no-ysort     add solid: false / ysort: false to every view
"""
import argparse
import glob
import os
import sys

import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from remove_bg import (PAD, auto_threshold, border_is_transparent,  # noqa: E402
                       content_bbox, remove_background)

ROOT = 'assets/furniture'
DIRS = ['n', 'e', 's', 'w']
FACINGS = ('up', 'down', 'left', 'right')


def prepare(path):
    """Key + trim in place (keeps <name>_source.png). Returns the RGBA array."""
    img = Image.open(path).convert('RGBA')
    arr = np.array(img)
    changed = False
    if not border_is_transparent(arr[..., 3]):
        n = remove_background(arr, auto_threshold(arr[..., :3]))
        changed = n > 0
    x0, y0, x1, y1 = content_bbox(arr[..., 3])
    x0, y0 = max(0, x0 - PAD), max(0, y0 - PAD)
    x1, y1 = min(arr.shape[1], x1 + PAD), min(arr.shape[0], y1 + PAD)
    if (x0, y0, x1, y1) != (0, 0, arr.shape[1], arr.shape[0]):
        arr = arr[y0:y1, x0:x1].copy()
        changed = True
    if changed:
        stem, ext = os.path.splitext(path)
        if not os.path.exists(f'{stem}_source{ext}'):
            img.save(f'{stem}_source{ext}')
        Image.fromarray(arr).save(path)
    return arr, changed


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('type')
    ap.add_argument('--ppt', type=float, default=48)
    ap.add_argument('--width', nargs=2, metavar=('DIR', 'TILES'))
    ap.add_argument('--region', nargs=5, action='append', default=[], metavar=('DIR', 'X0', 'Y0', 'X1', 'Y1'))
    ap.add_argument('--foot', nargs=2, action='append', default=[], metavar=('DIR', 'F'))
    ap.add_argument('--seat', nargs=6, action='append', default=[], metavar=('DIR', 'X0', 'Y0', 'X1', 'Y1', 'FACING'))
    ap.add_argument('--base', nargs=2, action='append', default=[], metavar=('DIR', 'Y'))
    ap.add_argument('--no-solid', action='store_true')
    ap.add_argument('--no-ysort', action='store_true')
    a = ap.parse_args()

    found = sorted(glob.glob(f'{ROOT}/*/{a.type}')) + sorted(glob.glob(f'{ROOT}/{a.type}'))
    found = [p for p in found if os.path.isdir(p)]
    if not found:
        sys.exit(f'No folder for {a.type!r}. Expected {ROOT}/<kitchen|rooms|others>/{a.type}/')
    if len(found) > 1:
        sys.exit(f'{a.type!r} exists in several groups: {", ".join(found)}')
    folder = found[0]
    rel = os.path.relpath(folder, ROOT).split(os.sep)
    group = rel[0] if len(rel) == 2 else None
    views = {}
    for d in DIRS:
        path = f'{folder}/{a.type}_{d}.png'
        if os.path.exists(path):
            arr, changed = prepare(path)
            views[d] = arr
            vx0, vy0, vx1, vy1 = content_bbox(arr[..., 3])
            print(f'{path}: {arr.shape[1]}x{arr.shape[0]} px{" (cleaned + trimmed)" if changed else ""}, '
                  f'visible x {vx0}-{vx1}, y {vy0}-{vy1}')
    if not views:
        sys.exit(f'No views found. Expected {folder}/{a.type}_<n|e|s|w>.png')

    def need(d):
        if d not in DIRS:
            sys.exit(f'Direction must be one of {"/".join(DIRS)}, got {d!r}')
        if d not in views:
            sys.exit(f'{folder}/{a.type}_{d}.png does not exist')
        return d

    ppt = a.ppt
    if a.width:
        d = need(a.width[0])
        vx0, _, vx1, _ = content_bbox(views[d][..., 3])
        ppt = (vx1 - vx0) / float(a.width[1])
    print(f'scale: {ppt:.2f} px per tile (same for every view)\n')

    f = lambda v: f'{round(v, 2) + 0.0:.2f}'.rstrip('0').rstrip('.')
    box = lambda x0, y0, x1, y1: f'{{ x: {f(x0 / ppt)}, y: {f(y0 / ppt)}, w: {f((x1 - x0) / ppt)}, h: {f((y1 - y0) / ppt)} }}'
    regions = {d: [] for d in DIRS}
    for d, *xy in a.region:
        regions[need(d)].append(tuple(map(float, xy)))
    foot = {need(d): float(v) for d, v in a.foot}
    seats = {d: [] for d in DIRS}
    for d, x0, y0, x1, y1, facing in a.seat:
        if facing not in FACINGS:
            sys.exit(f'Seat facing must be one of {"/".join(FACINGS)}, got {facing!r}')
        seats[need(d)].append((*map(float, (x0, y0, x1, y1)), facing))
    base = {need(d): float(v) for d, v in a.base}

    lines = [f'  {a.type}: {{'] + ([f"    group: '{group}',"] if group else []) + ['    dirs: {']
    for d in DIRS:
        if d not in views:
            continue
        arr = views[d]
        H, W = arr.shape[:2]
        vx0, vy0, vx1, vy1 = content_bbox(arr[..., 3])
        regs = regions[d] or [(vx0, vy1 - (vy1 - vy0) * foot.get(d, 1.0), vx1, vy1)]
        parts = [f'w: {f(W / ppt)}', f'h: {f(H / ppt)}']
        if d in base:
            parts.append(f'baseY: {f(base[d] / ppt)}')
        if a.no_solid:
            parts.append('solid: false')
        if a.no_ysort:
            parts.append('ysort: false')
        lines.append(f'      {d}: {{')
        lines.append(f'        {", ".join(parts)},')
        lines.append(f'        colliders: [{", ".join(box(*r) for r in regs)}],')
        if seats[d]:
            lines.append('        seats: [' + ', '.join(
                f"{{ {box(x0, y0, x1, y1)[2:-2]}, facing: '{fc}' }}" for x0, y0, x1, y1, fc in seats[d]) + '],')
        lines.append('      },')
    lines += ['    },', '  },']
    print('Paste into FURNITURE in js/core/furniture-catalog.js:\n')
    print('\n'.join(lines))
    print(f"\nThen place it in a map's props:  {{ furniture: '{a.type}', dir: '{next(iter(views))}', tx: 10, ty: 5 }},")


if __name__ == '__main__':
    main()
