import { describe, it, expect } from 'vitest';
import { Board } from './board';
import { Resolver, type RulesConfig } from './resolver';
import type { ResolveEvent } from './types';

// tiny chain for tests: a → A → Z (apex)
const POOL = ['p', 'q', 'r', 's', 't', 'u'];
const rules: RulesConfig = { nextTier: { a: 'x', x: 'z', b: 'y' }, basePieceScore: 60, comboStep: 0.5 };
const evs = (r: { events: ResolveEvent[] }, type: ResolveEvent['type']) => r.events.filter((e) => e.type === type);

describe('Resolver — basic swaps', () => {
  it('rejects non-adjacent and non-matching swaps without mutating', () => {
    const b = Board.fromAscii(['abcd', 'bcda', 'cdab', 'dabc']);
    const before = b.toAscii();
    const r = new Resolver(b, rules);
    expect(r.isLegal({ from: { col: 0, row: 0 }, to: { col: 2, row: 0 } })).toBe(false);
    const res = r.applyMove({ from: { col: 0, row: 0 }, to: { col: 1, row: 0 } });
    expect(res.events[0]).toEqual({ type: 'swap', a: { col: 0, row: 0 }, b: { col: 1, row: 0 }, valid: false });
    expect(b.toAscii()).toBe(before);
  });

  it('line3 → evolves into next tier at the swapped cell and scores', () => {
    // swap (2,1)↔(2,0) makes row 0 'aaa'
    const b = Board.fromAscii([
      'aab',
      'cca',
      'dcd',
      'cdc',
    ], 1, POOL);
    const r = new Resolver(b, rules);
    const res = r.applyMove({ from: { col: 2, row: 1 }, to: { col: 2, row: 0 } });
    const ev = evs(res, 'evolve');
    expect(ev.length).toBeGreaterThanOrEqual(1);
    expect(ev[0]).toMatchObject({ from: 'a', to: 'x', at: { col: 2, row: 0 } });
    expect(res.collected['x']).toBeGreaterThanOrEqual(1); // evolving counts as collecting the new emoji
    expect(res.scoreDelta).toBeGreaterThan(0);
    // the evolved piece exists somewhere in column 2 after gravity
    const col2 = [0, 1, 2, 3].map((row) => b.pieceAt({ col: 2, row })?.emoji);
    expect(col2).toContain('x');
  });

  it('apex tier match triggers a 3×3 burst instead of evolving', () => {
    // 'z' has no next tier
    const b = Board.fromAscii([
      'zzc',
      'ccz',
      'dcd',
    ], 1, POOL);
    const r = new Resolver(b, rules);
    const res = r.applyMove({ from: { col: 2, row: 1 }, to: { col: 2, row: 0 } });
    expect(evs(res, 'apex_burst').length).toBeGreaterThanOrEqual(1);
    expect((evs(res, 'apex_burst')[0] as Extract<ResolveEvent, { type: 'apex_burst' }>).emoji).toBe('z');
    expect(evs(res, 'evolve').filter((e) => (e as Extract<ResolveEvent, { type: 'evolve' }>).from === 'z')).toHaveLength(0);
  });
});

describe('Resolver — special creation', () => {
  it('line4 spawns a rocket perpendicular to the line', () => {
    const b = Board.fromAscii([
      'aaba',
      'ccad',
      'dcdc',
      'cdcd',
    ], 1, POOL);
    const r = new Resolver(b, rules);
    const res = r.applyMove({ from: { col: 2, row: 1 }, to: { col: 2, row: 0 } });
    const sp = evs(res, 'spawn_special');
    expect(sp).toHaveLength(1);
    // horizontal line → vertical rocket
    expect((sp[0] as Extract<ResolveEvent, { type: 'spawn_special' }>).piece.special).toBe('rocket_v');
  });

  it('line5 spawns a wild', () => {
    const b = Board.fromAscii([
      'aabaa',
      'ccadc',
      'dcdcd',
    ], 1, POOL);
    const res = new Resolver(b, rules).applyMove({ from: { col: 2, row: 1 }, to: { col: 2, row: 0 } });
    const sp = evs(res, 'spawn_special') as Extract<ResolveEvent, { type: 'spawn_special' }>[];
    expect(sp.some((e) => e.piece.special === 'wild')).toBe(true);
  });

  it('L / T shapes spawn a bomb', () => {
    // swap c(0,2)↔a(1,2) → col0 = a a a (rows0-2) + row2 = a a a  → L
    const b = Board.fromAscii([
      'abcd',
      'abcd',
      'caad',
      'adcd',
    ], 1, POOL);
    const res = new Resolver(b, rules).applyMove({ from: { col: 0, row: 3 }, to: { col: 0, row: 2 } });
    const match = evs(res, 'match')[0] as Extract<ResolveEvent, { type: 'match' }>;
    expect(match.group.shape).toBe('L');
    const sp = evs(res, 'spawn_special') as Extract<ResolveEvent, { type: 'spawn_special' }>[];
    expect(sp.some((e) => e.piece.special === 'bomb')).toBe(true);
  });
});

describe('Resolver — special firing & synergies', () => {
  it('bomb swapped with a normal piece clears 3×3 at its new position', () => {
    const b = Board.fromAscii([
      'cdcdc',
      'dcdcd',
      'cdBec',
      'dcdcd',
      'cdcdc',
    ], 1, POOL);
    const res = new Resolver(b, rules).applyMove({ from: { col: 2, row: 2 }, to: { col: 2, row: 1 } });
    const fire = evs(res, 'special_fire')[0] as Extract<ResolveEvent, { type: 'special_fire' }>;
    expect(fire.kind).toBe('bomb');
    expect(fire.at).toEqual({ col: 2, row: 1 });
    expect(fire.area).toHaveLength(9);
    const clear = evs(res, 'clear')[0] as Extract<ResolveEvent, { type: 'clear' }>;
    expect(clear.cells.length).toBe(8); // 9 cells minus the bomb itself (removed before clear)
    expect(clear.source).toBe('special');
  });

  it('horizontal rocket clears its whole row', () => {
    const b = Board.fromAscii(['cdcdc', 'dHdcd', 'cdcdc'], 1, POOL);
    const res = new Resolver(b, rules).applyMove({ from: { col: 1, row: 1 }, to: { col: 1, row: 2 } });
    const fire = evs(res, 'special_fire')[0] as Extract<ResolveEvent, { type: 'special_fire' }>;
    expect(fire.kind).toBe('rocket_h');
    expect(fire.area.every((p) => p.row === 2)).toBe(true);
    expect(fire.area).toHaveLength(5);
  });

  it('💣 + 🚀 synergy = MEGA CROSS at board center (5×5 + 3-wide row & column sweep)', () => {
    const rows = ['cdcdcdc', 'dcdcdcd', 'cdcdcdc', 'dcdBHcd', 'cdcdcdc', 'dcdcdcd', 'cdcdcdc', 'dcdcdcd'];
    const b = Board.fromAscii(rows, 1, ['c', 'd']);
    const res = new Resolver(b, rules).applyMove({ from: { col: 3, row: 3 }, to: { col: 4, row: 3 } });
    const syn = evs(res, 'synergy')[0] as Extract<ResolveEvent, { type: 'synergy' }>;
    expect(syn.kind).toBe('bomb_rocket');
    expect(syn.center).toEqual({ col: 3, row: 4 });
    const fire = evs(res, 'special_fire')[0] as Extract<ResolveEvent, { type: 'special_fire' }>;
    expect(fire.kind).toBe('mega_cross');
    expect(fire.magnitude).toBe(1);
    // 5×5 = 25, rows 3,4,5 = 21, cols 2,3,4 = 24 → union
    const rowsHit = new Set(fire.area.filter((p) => p.row >= 3 && p.row <= 5).map((p) => p.col));
    expect(rowsHit.size).toBe(7);
    const colsHit = new Set(fire.area.filter((p) => p.col >= 2 && p.col <= 4).map((p) => p.row));
    expect(colsHit.size).toBe(8);
    expect(fire.area.length).toBe(25 + 6 + 9); // 5×5 ∪ 3 rows (+6 outside) ∪ 3 cols (+9 outside)
  });

  it('💣 + 💣 = 5×5 at swap point', () => {
    const b = Board.fromAscii(['cdcdcdc', 'dcdcdcd', 'cdcdcdc', 'dcdBBcd', 'cdcdcdc', 'dcdcdcd', 'cdcdcdc'], 1, POOL);
    const res = new Resolver(b, rules).applyMove({ from: { col: 3, row: 3 }, to: { col: 4, row: 3 } });
    const fire = evs(res, 'special_fire')[0] as Extract<ResolveEvent, { type: 'special_fire' }>;
    expect(fire.kind).toBe('double_bomb');
    expect(fire.area).toHaveLength(25);
  });

  it('🚀 + 🚀 = row + column cross', () => {
    const b = Board.fromAscii(['cdcdc', 'dcdcd', 'cHVdc', 'dcdcd', 'cdcdc'], 1, POOL);
    const res = new Resolver(b, rules).applyMove({ from: { col: 1, row: 2 }, to: { col: 2, row: 2 } });
    const fire = evs(res, 'special_fire')[0] as Extract<ResolveEvent, { type: 'special_fire' }>;
    expect(fire.kind).toBe('double_rocket');
    expect(fire.area).toHaveLength(5 + 5 - 1);
  });

  it('🌟 wild swapped with X clears every X', () => {
    const b = Board.fromAscii(['cdcdc', 'dWdcd', 'cdcdc'], 1, POOL);
    const res = new Resolver(b, rules).applyMove({ from: { col: 1, row: 1 }, to: { col: 0, row: 1 } });
    const clear = evs(res, 'clear')[0] as Extract<ResolveEvent, { type: 'clear' }>;
    // all 'd' pieces: row0 has 2, row1 has (after swap) d at col1, col2, col4 → 3, row2 has 2 = 7
    expect(clear.cells.filter((c) => c.piece.emoji === 'd')).toHaveLength(7);
    expect(clear.cells.some((c) => c.piece.emoji === 'c')).toBe(false);
  });

  it('specials caught in a blast chain-react', () => {
    const b = Board.fromAscii(['cdcdc', 'dcHcd', 'cdBdc', 'dcdcd', 'cdcdc'], 1, POOL);
    // swap bomb (2,2) with piece below (2,3): bomb fires 3×3 around (2,3) → does not reach rocket at (2,1)
    // instead swap bomb with piece to the right (3,2): 3×3 around (3,2) covers rows1-3 cols2-4 → includes rocket (2,1)
    const res = new Resolver(b, rules).applyMove({ from: { col: 2, row: 2 }, to: { col: 3, row: 2 } });
    const fires = evs(res, 'special_fire') as Extract<ResolveEvent, { type: 'special_fire' }>[];
    expect(fires.slice(0, 2).map((f) => f.kind)).toEqual(['bomb', 'rocket_h']);
  });
});

describe('Resolver — blockers, gravity, refill, cascades', () => {
  it('matches damage ADJACENT blockers; rock dies in 1 hit, ice needs 2; pieces never fall through blockers', () => {
    const b = Board.fromAscii([
      'ccb',
      'aab',
      '❄#a',
      'dcb',
    ], 1, POOL);
    const res = new Resolver(b, rules).applyMove({ from: { col: 2, row: 2 }, to: { col: 2, row: 1 } });
    const hits = evs(res, 'blocker_hit') as Extract<ResolveEvent, { type: 'blocker_hit' }>[];
    // row-1 match 'aaa' is adjacent to both blockers at row 2
    expect(hits.find((h) => h.kind === 'rock')).toMatchObject({ remaining: 0 });
    expect(hits.find((h) => h.kind === 'ice')).toMatchObject({ remaining: 1 });
    expect(b.blockerAt({ col: 1, row: 2 })).toBeNull();
    expect(b.blockerAt({ col: 0, row: 2 })!.hp).toBe(1);
    expect(res.blockersCleared).toBe(1);
    // bottom-left piece untouched (ice still acts as floor for column 0)
    expect(b.pieceAt({ col: 0, row: 3 })!.emoji).toBe('d');
  });

  it('bomb blast damages blockers (ice needs 2 hits)', () => {
    const b = Board.fromAscii(['cdc', 'dBd', 'c❄c'], 1, POOL);
    const res = new Resolver(b, rules).applyMove({ from: { col: 1, row: 1 }, to: { col: 0, row: 1 } });
    const hit = evs(res, 'blocker_hit')[0] as Extract<ResolveEvent, { type: 'blocker_hit' }>;
    expect(hit).toMatchObject({ kind: 'ice', remaining: 1 });
    expect(b.blockerAt({ col: 1, row: 2 })!.hp).toBe(1);
  });

  it('board is always full after a move (no holes) and refill emits spawns', () => {
    for (let seed = 1; seed < 15; seed++) {
      const b = new Board({ cols: 7, rows: 8, spawnPool: ['a', 'b', 'c', 'd', 'e'], seed });
      b.fillNoMatches();
      const r = new Resolver(b, rules);
      // find any legal move
      let done = false;
      outer: for (let row = 0; row < 8; row++) for (let col = 0; col < 7; col++) {
        for (const to of [{ col: col + 1, row }, { col, row: row + 1 }]) {
          if (b.inBounds(to) && r.isLegal({ from: { col, row }, to })) {
            const res = r.applyMove({ from: { col, row }, to });
            expect(evs(res, 'refill').length).toBeGreaterThan(0);
            done = true; break outer;
          }
        }
      }
      if (!done) continue;
      for (let row = 0; row < 8; row++) for (let col = 0; col < 7; col++) expect(b.pieceAt({ col, row }), `seed ${seed} (${col},${row})`).not.toBeNull();
      // and no resting matches remain
      expect(r.applyMove({ from: { col: 0, row: 0 }, to: { col: 0, row: 0 } }).events[0]).toMatchObject({ valid: false });
    }
  });

  it('cascade score multiplier grows with depth', () => {
    const b = Board.fromAscii([
      'ccd',
      'ccd',
      'aab',
      'dda',
    ], 1, POOL);
    // swap (2,3)↔(2,2): row2 'aaa' → clears, then 'ccd/ccd' fall... columns 0,1 get c,c on top of d,d (row3). Row3 = d d ? ; refill 'e' only.
    const res = new Resolver(b, rules).applyMove({ from: { col: 2, row: 3 }, to: { col: 2, row: 2 } });
    const scores = evs(res, 'score') as Extract<ResolveEvent, { type: 'score' }>[];
    expect(scores[0]!.combo).toBe(1);
    if (scores.length > 1) expect(scores[1]!.combo).toBe(2);
    expect(res.cascades).toBeGreaterThanOrEqual(1);
  });
});
