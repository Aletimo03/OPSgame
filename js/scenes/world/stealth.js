// js/scenes/world/stealth.js
// WorldScene mixin: the cigarette mission (rules and data in js/story/stealth.js).
// On the first floor the three guards walk their scripted loops and, while he
// carries the cigarette, show their cones of vision. Seen = lecture, the
// cigarette is confiscated, back to the kitchen. The balcony = smoke, done.
import { TILE } from '../../config.js';
import { idleFrame, feetCenterY } from '../../core/playerSprite.js';
import { questState } from '../../story/questState.js';
import {
  STEALTH, carryingCigarette, confiscateCigarette, guardAt, sees, rayLength, facingAngle, sightBoxes,
} from '../../story/stealth.js';

const RAYS = 26; // of each cone's fan
const CONE = { idle: 0xffe066, seen: 0xff4a4a, alpha: 0.42, depth: 1.6 }; // over the floor, under everyone

export const withStealth = (Base) => class extends Base {
  setupStealth() {
    this.stealth = null;
    this.smokeAt = this.mapKey === STEALTH.balcony ? this.time.now + 600 : Infinity; // once the fade-in is over
    if (questState.activeChapter !== STEALTH.chapter || this.mapKey !== STEALTH.map) return;
    const guards = [];
    for (const def of STEALTH.guards) {
      const npc = this.npcs.list.find((n) => n.id === def.id);
      if (!npc) continue;
      npc.wander = false;
      npc.sprite.body.checkCollision.none = true; // scripted: nothing pushes them off it
      guards.push({ def, npc, t: 0, state: null });
    }
    this.stealth = {
      guards,
      boxes: sightBoxes(this.map),
      cones: this.add.graphics().setDepth(CONE.depth),
      graceMs: STEALTH.vision.graceMs,
      seenMs: 0,
      over: false,
    };
    for (const g of guards) this.placeGuard(g);
  }

  // Carrying it, he goes on tiptoe (movement speed in WorldScene.update).
  sneaking() {
    return !!this.stealth && carryingCigarette();
  }

  placeGuard(g) {
    const s = g.npc.sprite;
    const st = guardAt(g.def, g.t);
    g.state = st;
    s.body.reset(st.x * TILE, st.y * TILE - (feetCenterY(s) - s.y));
    if (st.moving) {
      const [dx, dy] = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[st.facing];
      this.animateMove(g.npc, dx, dy);
    } else if (g.npc.facing !== st.facing || s.anims.isPlaying) {
      s.anims.stop();
      g.npc.facing = st.facing;
      s.setFlipX(st.facing === 'right'); // side art faces LEFT natively
      s.setFrame(idleFrame(st.facing));
    }
    s.setDepth(this.characterDepth(s));
  }

  // Runs every frame, dialogue included: the guards keep walking while you read
  // (only whoever you're talking to stands still) and nobody notices you then.
  stealthTick(delta) {
    if (!this.dialogue.open && this.time.now >= this.smokeAt && carryingCigarette()) this.smokeCigarette();
    const st = this.stealth;
    if (!st || st.over) return;
    for (const g of st.guards) {
      if (this.dialogue.open && g.npc === this.talkingTo) continue;
      g.t += delta / 1000;
      this.placeGuard(g);
    }
    const carrying = carryingCigarette();
    let spotter = null;
    if (carrying && !this.dialogue.open) {
      st.graceMs -= delta;
      if (st.graceMs <= 0) {
        const px = this.player.x / TILE, py = feetCenterY(this.player) / TILE;
        let near = null;
        for (const g of st.guards) {
          const how = sees(g.state, px, py, this.map.grid, st.boxes);
          if (how === 'near') near = g;
          if (how) spotter ||= g;
        }
        st.seenMs = spotter ? st.seenMs + delta : Math.max(0, st.seenMs - delta * 2);
        if (near || st.seenMs >= STEALTH.vision.noticeMs) { this.stealthCaught(near || spotter); return; }
      }
    }
    this.drawCones(carrying, spotter);
  }

  drawCones(carrying, spotter) {
    const st = this.stealth;
    st.cones.clear();
    if (!carrying) return;
    const v = STEALTH.vision;
    for (const g of st.guards) {
      const { x, y, facing } = g.state;
      const mid = facingAngle(facing);
      st.cones.fillStyle(g === spotter ? CONE.seen : CONE.idle, CONE.alpha);
      st.cones.beginPath();
      st.cones.moveTo(x * TILE, y * TILE);
      for (let i = 0; i <= RAYS; i++) {
        const a = mid - v.halfAngle + (2 * v.halfAngle * i) / RAYS;
        const d = rayLength(this.map.grid, st.boxes, x, y, a, v.range);
        st.cones.lineTo((x + Math.cos(a) * d) * TILE, (y + Math.sin(a) * d) * TILE);
      }
      st.cones.closePath();
      st.cones.fillPath();
    }
  }

  // Walking up to a guard with it in your hand is getting caught too (tryInteract).
  stealthTalk(target) {
    const g = this.stealth?.guards.find((x) => x.npc === target);
    if (!g || !carryingCigarette()) return false;
    this.stealthCaught(g);
    return true;
  }

  stealthCaught(g) {
    const st = this.stealth;
    st.over = true;
    st.cones.clear();
    this.warpLocked = true; // no moving, no doors, until the restart
    this.holdPlayer();
    for (const o of st.guards) { o.npc.sprite.body.setVelocity(0); o.npc.sprite.anims.stop(); }
    const s = g.npc.sprite;
    const dx = this.player.x - s.x, dy = this.player.y - s.y;
    const face = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
    g.npc.facing = face;
    s.setFlipX(face === 'right');
    s.setFrame(idleFrame(face));
    const mark = this.add.text(s.x, s.y - s.displayHeight * 0.5 + 2, '!', {
      fontFamily: 'monospace', fontSize: '34px', fontStyle: 'bold', color: '#ff4a4a', stroke: '#000000', strokeThickness: 6,
    }).setOrigin(0.5, 1).setDepth(900000).setScale(0.2);
    this.tweens.add({ targets: mark, scale: 1, duration: 220, ease: 'Back.easeOut' });
    this.time.delayedCall(650, () => {
      mark.destroy();
      const options = STEALTH.caught[g.def.id];
      this.talkingTo = g.npc;
      this.say(g.npc, options[Math.floor(Math.random() * options.length)], () => {
        confiscateCigarette();
        this.cameras.main.fadeOut(180);
        this.cameras.main.once('camerafadeoutcomplete', () => {
          this.scene.restart({
            mapKey: 'first-floor-kitchen', spawnName: 'default', notice: STEALTH.confiscated(g.npc.name),
          });
        });
      });
    });
  }

  // He made it: the balcony, the cigarette, a few thoughts.
  smokeCigarette() {
    this.smokeAt = Infinity;
    this.holdPlayer();
    for (let i = 0; i < 3; i++) {
      this.time.delayedCall(i * 900, () => {
        const puff = this.add.text(this.player.x + 14, this.player.y - this.player.displayHeight * 0.3, '💨', { fontSize: '26px' })
          .setOrigin(0.5).setDepth(900000);
        this.tweens.add({ targets: puff, y: puff.y - 60, alpha: 0, duration: 1400, onComplete: () => puff.destroy() });
      });
    }
    this.say(null, STEALTH.smokeLines, () => {
      questState.setFlag(STEALTH.flags.smoked);
      this.onProgress();
    });
  }
};
