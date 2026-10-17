#!/usr/bin/env python3
"""Pack a character sheet with ANY layout (with or without the small preview
frame) into the game's 4x3 player.png + portrait.png, at the cast's size.

Usage: python3 tools/sprites/pack_sheet.py <character> [source.png]
Input : assets/characters/<name>/player_source.png (or the given file, copied
        there): transparent, or on a plain white/black background (keyed by
        an edge-connected flood). One tall standalone figure (→ portrait) and
        12 walk frames in 3 rows (down / side-left / up); a 13th small frame
        above the rows (the preview) is dropped.
Output: player.png (4x3, feet on a shared baseline) scaled so its median
        opaque area per frame matches the MEDIAN of the other characters
        (CLAUDE.md "Sprite size rule"), portrait.png, head.png (round crop
        filling ~60% of the circle like the others).
"""
import os, shutil, sys
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

name = sys.argv[1]
BASE = f'assets/characters/{name}'
os.makedirs(BASE, exist_ok=True)
if len(sys.argv) > 2:
    Image.open(sys.argv[2]).convert('RGBA').save(f'{BASE}/player_source.png')
a = np.array(Image.open(f'{BASE}/player_source.png').convert('RGBA'))

# Background → alpha (only if the image isn't transparent already).
if (a[..., 3] < 255).mean() < 0.05:
    rgb = a[..., :3].astype(int)
    for bg in (rgb.min(2) >= 222, rgb.max(2) <= 6):        # white, then black
        lab, _ = ndimage.label(bg)
        edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
        if edge:
            a[np.isin(lab, list(edge)), 3] = 0
            break
op = a[..., 3] > 0
lab, n = ndimage.label(op)
sizes = ndimage.sum(op, lab, range(1, n + 1))
for i, s in enumerate(sizes):
    if s < 400:
        a[lab == i + 1, 3] = 0
lab, n = ndimage.label(a[..., 3] > 0)
objs = [(i + 1, o) for i, o in enumerate(ndimage.find_objects(lab))]

def crop(idx, o):
    c = a[o].copy(); c[lab[o] != idx] = 0; return c

hs = lambda o: o[0].stop - o[0].start
fig = max(objs, key=lambda t: hs(t[1]))
Image.fromarray(crop(*fig)).save(f'{BASE}/portrait.png')
rest = [t for t in objs if t is not fig]
top_of_rest = sorted(t[1][0].start for t in rest)
# The preview: a lone small frame clearly above all the others.
prev = [t for t in rest if t[1][0].start < top_of_rest[1] - 100 and hs(t[1]) < 300]
grid = a.copy()
for idx, o in [fig] + prev:
    grid[lab == idx] = 0

# Frames may touch each other, so slice the grid at the emptiest lines
# (projection minima) instead of trusting connected components.
def splits(profile, lo, hi, n):
    cuts = [lo]
    for k in range(1, n):
        g = lo + (hi - lo) * k / n; w = (hi - lo) / n * 0.25
        a0, a1 = int(g - w), int(g + w)
        cuts.append(a0 + int(np.argmin(profile[a0:a1])))
    return cuts + [hi]

ga = grid[..., 3] > 0
py = ga.sum(1); ys = np.where(py > 0)[0]
ycut = splits(py, ys[0], ys[-1] + 1, 3)
cells = []
for r in range(3):
    band = ga[ycut[r]:ycut[r + 1]]
    px = band.sum(0); xs = np.where(px > 0)[0]
    xcut = splits(px, xs[0], xs[-1] + 1, 4)
    row = []
    for k in range(4):
        c = grid[ycut[r]:ycut[r + 1], xcut[k]:xcut[k + 1]].copy()
        l, m = ndimage.label(c[..., 3] > 0)
        sz = ndimage.sum(c[..., 3] > 0, l, range(1, m + 1))
        keepl = [i + 1 for i, v in enumerate(sz) if v >= 0.15 * sz.max()]
        c[~np.isin(l, keepl)] = 0
        yy = np.where(c[..., 3].any(1))[0]; xx = np.where(c[..., 3].any(0))[0]
        row.append(c[yy[0]:yy[-1] + 1, xx[0]:xx[-1] + 1])
    cells.append(row)

cw = max(c.shape[1] for row in cells for c in row) + 12
ch = max(c.shape[0] for row in cells for c in row) + 12
sheet = Image.new('RGBA', (cw * 4, ch * 3), (0, 0, 0, 0))
for r, row in enumerate(cells):
    for k, c in enumerate(row):
        im = Image.fromarray(c)
        sheet.paste(im, (k * cw + (cw - im.width) // 2, r * ch + ch - 6 - im.height), im)

def median_area(path):
    m = np.array(Image.open(path))[..., 3] > 40
    H, W = m.shape; w, h = W // 4, H // 3
    return np.median([m[r*h:(r+1)*h, k*w:(k+1)*w].sum() for r in range(3) for k in range(4)])
others = [d for d in os.listdir('assets/characters') if d not in (name, 'zionick')
          and os.path.exists(f'assets/characters/{d}/player.png')]
target = np.median([median_area(f'assets/characters/{d}/player.png') for d in others])
sheet.save(f'{BASE}/player.png')
k = (target / median_area(f'{BASE}/player.png')) ** 0.5
ncw, nch = round(cw * k), round(ch * k)
sheet.resize((ncw * 4, nch * 3), Image.LANCZOS).save(f'{BASE}/player.png')

# Round head for the title screen / UI.
por = Image.open(f'{BASE}/portrait.png').convert('RGBA'); pa = np.array(por)[..., 3] > 40
H, W = pa.shape; top = int(np.where(pa.any(1))[0][0])
band = pa[top:top + int(0.15 * H)]; xs = np.where(band.any(0))[0]; cx = (xs[0] + xs[-1]) / 2
mask = Image.new('L', (160, 160), 0); ImageDraw.Draw(mask).ellipse((0, 0, 159, 159), fill=255); M = np.array(mask)
def head(S):
    s = S * H; cy = top + s / 2
    c = por.crop((int(cx - s / 2), int(cy - s / 2), int(cx + s / 2), int(cy + s / 2))).resize((160, 160), Image.LANCZOS)
    al = np.minimum(np.array(c)[..., 3], M); out = Image.new('RGBA', (160, 160), (0, 0, 0, 0))
    out.paste(c, (0, 0), Image.fromarray(al)); return out, (al > 40).mean()
S = min(np.arange(0.18, 0.36, 0.01), key=lambda S: abs(head(S)[1] - 0.6))
head(S)[0].save(f'{BASE}/head.png')
print(f'{name}: cell {cw}x{ch} → x{k:.3f} → {ncw}x{nch}; portrait {por.size}; head S={S:.2f}')
