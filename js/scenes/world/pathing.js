// js/scenes/world/pathing.js
// Shared helpers for whoever walks without physics (followers, chasers, Nima,
// the shadow): walk animation, line of sight, BFS on the tile grid.
// A class mixin of WorldScene: the methods run with `this` = the scene.
import { TILE, TILES } from '../../config.js';
import { idleFrame } from '../../core/playerSprite.js';

export const withPathing = (Base) => class extends Base {
  // Face + walk animation for an NPC moved by code (dx, dy = this frame's move).
  animateMove(npc, dx, dy) {
    const s = npc.sprite;
    if (Math.abs(dx) < 0.3 && Math.abs(dy) < 0.3) {
      if (s.anims.isPlaying) { s.anims.stop(); s.setFrame(idleFrame(npc.facing)); }
      return;
    }
    const face = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
    npc.facing = face;
    s.setFlipX(face === 'right'); // side art faces LEFT natively
    s.anims.play(face === 'up' ? npc.anims.up : face === 'down' ? npc.anims.down : npc.anims.side, true);
  }

  // Can a character on tile `a` see tile `b`? (Bresenham: no wall or solid in between.)
  lineOfSight(a, b) {
    const g = this.map.grid;
    let x = a.tx;
    let y = a.ty;
    const dx = Math.abs(b.tx - x);
    const dy = -Math.abs(b.ty - y);
    const sx = x < b.tx ? 1 : -1;
    const sy = y < b.ty ? 1 : -1;
    let err = dx + dy;
    for (let n = 0; n < 200; n++) {
      if (g[y]?.[x] !== TILES.FLOOR || this.solidTiles?.has(y * 1000 + x)) return false;
      if (x === b.tx && y === b.ty) return true;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x += sx; }
      if (e2 <= dx) { err += dx; y += sy; }
    }
    return false;
  }

  // First floor tile of a shortest 4-way path from `a` to `b` (tiles), or null.
  // `blocked`: extra tiles to avoid ("tx,ty", npcs.blocked); `b` itself never is.
  bfsStep(a, b, area = null, blocked = null) {
    const g = this.map.grid;
    const inArea = (x, y) => !area || (x >= area.x0 && x <= area.x1 && y >= area.y0 && y <= area.y1);
    const key = (x, y) => y * 1000 + x;
    const prev = new Map([[key(a.tx, a.ty), null]]);
    const q = [a];
    while (q.length) {
      const c = q.shift();
      if (c.tx === b.tx && c.ty === b.ty) {
        let n = c;
        while (prev.get(key(n.tx, n.ty)) && !(prev.get(key(n.tx, n.ty)).tx === a.tx && prev.get(key(n.tx, n.ty)).ty === a.ty)) {
          n = prev.get(key(n.tx, n.ty));
        }
        return n.tx === a.tx && n.ty === a.ty ? null : n;
      }
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = c.tx + dx;
        const ny = c.ty + dy;
        if (g[ny]?.[nx] !== TILES.FLOOR || prev.has(key(nx, ny)) || this.solidTiles?.has(key(nx, ny)) || !inArea(nx, ny)) continue;
        if (blocked?.has(`${nx},${ny}`) && !(nx === b.tx && ny === b.ty)) continue;
        prev.set(key(nx, ny), c);
        q.push({ tx: nx, ty: ny });
      }
    }
    return null;
  }

  tileOf(o) {
    return { tx: Math.round((o.x - TILE / 2) / TILE), ty: Math.round((o.y - TILE / 2) / TILE) };
  }
};
