// js/core/battleRules.js
// The rules of a fight, kept apart from BattleScene (which only draws them), so
// Node can import them: tools/checks/story-check.mjs simulates the story's
// fights with `simulate` to keep them winnable but not trivial.
//
// A move (hero's or enemy's, in the character JSON's `moves`):
//   { name, power, acc?, pp?, status?, chance?, arrest?, arrestBelow?, desc? }
//   power  base damage (0 = a status-only move); the old field `dmg` still works
//   acc    hit chance in % (default 100)
//   pp     uses per battle (default 20; refilled at every new battle)
//   status 'imbarazzato' (the target loses its next action) or 'assonnato' (the
//          target's next 2 actions deal half damage), applied with `chance` (default 1)
//   arrest a FINISHER: it KOs only if the enemy is at or below `arrestBelow` of
//          its max HP (default ARREST_BELOW), otherwise it fails. Hero only.
//
// Damage = (power + attack − defense) × a random 85–100 %, × 1.5 on a critical
// hit (1 in 16), at least 1. Halved while the attacker is `assonnato`.

export const ARREST_BELOW = 0.4;
export const MUST_LOSE_FLOOR = 0.6; // a scripted loss: the enemy never drops below this
export const CRIT_CHANCE = 1 / 16;
export const CRIT_MULT = 1.5;
export const DEFAULT_PP = 20;

export const STATUS = {
  imbarazzato: { turns: 1, tag: 'IMB', colour: 0xd96bd0, inflict: (n) => `${n} va in imbarazzo!` },
  assonnato: { turns: 2, tag: 'SON', colour: 0x6b8cd9, inflict: (n) => `A ${n} viene sonno!` },
};

export const power = (m) => m.power ?? m.dmg ?? 0;
export const accuracy = (m) => m.acc ?? 100;
export const maxPp = (m) => m.pp ?? DEFAULT_PP;
export const canArrest = (m, hp, max, mustLose = false) =>
  !mustLose && hp <= max * (m.arrestBelow ?? ARREST_BELOW);

// One hit: { hit, crit, dmg }. `rnd` = a () => [0,1) source (Math.random).
export function rollHit(move, att, def, attackerStatus = {}, rnd = Math.random) {
  if (rnd() * 100 >= accuracy(move)) return { hit: false, crit: false, dmg: 0 };
  if (!power(move)) return { hit: true, crit: false, dmg: 0 };
  const crit = rnd() < CRIT_CHANCE;
  let dmg = (power(move) + att.attack - def.defense) * (0.85 + 0.15 * rnd()) * (crit ? CRIT_MULT : 1);
  dmg = Math.max(1, Math.round(dmg));
  if (attackerStatus.assonnato) dmg = Math.max(1, Math.ceil(dmg / 2));
  return { hit: true, crit, dmg };
}

// Whether a move's status sticks (after a hit).
export const rollStatus = (move, target, rnd = Math.random) =>
  !!STATUS[move.status] && !target[move.status] && rnd() < (move.chance ?? 1);

// The enemy's pick: a random move, rerolled once if its status is one the
// hero already has (so it doesn't waste turns), never a move out of PP.
export function enemyPick(moves, heroStatus, rnd = Math.random) {
  if (!moves.length) return null;
  const pick = () => moves[Math.floor(rnd() * moves.length)];
  let m = pick();
  if (m.status && !power(m) && heroStatus[m.status]) m = pick();
  return m;
}

// The battle background for the place the fight happens in (BattleScene draws it).
export function battleEnv(mapKey = '', party = false) {
  if (party) return 'party';
  if (/kitchen/.test(mapKey)) return 'kitchen';
  if (mapKey === 'alcatraz') return 'club';
  if (/^dream/.test(mapKey)) return 'dream';
  if (/^room-/.test(mapKey)) return 'room';
  if (/bathroom|laundry|trashbin/.test(mapKey)) return 'bathroom';
  return 'corridor';
}

// Monte Carlo of a fight with a simple player strategy: heal under 35 % HP
// while there are items, arrest once it works, else the strongest attack
// (with one Insulto / Lezione di fisica opener when they exist). Returns the
// win rate and the average number of rounds. Used by story-check.
export function simulate({ hero, heroMoves, enemy, enemyMoves, heals = [], runs = 4000, rnd = Math.random }) {
  let wins = 0; let rounds = 0;
  for (let r = 0; r < runs; r++) {
    let hHp = hero.maxHp; let eHp = enemy.maxHp;
    const hs = {}; const es = {}; const bag = [...heals];
    const pp = new Map(heroMoves.map((m) => [m, maxPp(m)]));
    let n = 0; let opened = false;
    while (hHp > 0 && eHp > 0 && n < 60) {
      n++;
      if (hs.imbarazzato) hs.imbarazzato = 0;
      else {
        if (hHp < hero.maxHp * 0.35 && bag.length) hHp = Math.min(hero.maxHp, hHp + bag.shift());
        else {
          const usable = heroMoves.filter((m) => pp.get(m) > 0);
          const arrest = usable.find((m) => m.arrest && canArrest(m, eHp, enemy.maxHp));
          const opener = !opened && usable.find((m) => !m.arrest && m.status === 'assonnato');
          const attack = usable.filter((m) => !m.arrest).sort((a, b) => power(b) * accuracy(b) - power(a) * accuracy(a))[0];
          const m = arrest || opener || attack;
          opened = true;
          pp.set(m, pp.get(m) - 1);
          if (m.arrest) { if (rnd() * 100 < accuracy(m)) eHp = 0; } else {
            const h = rollHit(m, hero, enemy, hs, rnd);
            eHp -= h.dmg;
            if (h.hit && eHp > 0 && rollStatus(m, es, rnd)) es[m.status] = STATUS[m.status].turns;
          }
        }
        if (hs.assonnato) hs.assonnato--;
      }
      if (eHp <= 0) break;
      if (es.imbarazzato) { es.imbarazzato = 0; continue; }
      const em = enemyPick(enemyMoves, hs, rnd);
      const h = rollHit(em || { power: 4 }, enemy, hero, es, rnd);
      hHp -= h.dmg;
      if (em && h.hit && hHp > 0 && rollStatus(em, hs, rnd)) hs[em.status] = STATUS[em.status].turns;
      if (es.assonnato) es.assonnato--;
    }
    if (eHp <= 0) wins++;
    rounds += n;
  }
  return { winRate: wins / runs, rounds: rounds / runs };
}
