// js/core/props.js
// Shared helpers for map props (furniture). Kept Phaser-free so Node checks
// (tools/checks/story-check.mjs) can use the exact same rules as the game.

// Collision rectangles of a prop, in tiles: `colliders` (several boxes, e.g. a
// sofa's back + armrests with the seats left free), else `collider`, else the
// whole display box (`dw`/`dh` in tiles when known, else `w`/`h`).
export function propColliders(p, dw, dh) {
  if (Array.isArray(p.colliders) && p.colliders.length) return p.colliders;
  if (p.collider) return [p.collider];
  return [{ tx: p.tx, ty: p.ty, w: dw ?? p.w, h: dh ?? p.h ?? p.w }];
}

// Depth line of a prop, in tiles: `baseY` if given, else the lowest collider
// edge. Characters whose feet are above it can be drawn behind the prop.
export function propBaseY(p, dw, dh) {
  if (p.baseY != null) return p.baseY;
  return Math.max(...propColliders(p, dw, dh).map((c) => c.ty + c.h));
}
