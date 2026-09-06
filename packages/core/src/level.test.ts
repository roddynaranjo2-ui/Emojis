import { describe, it, expect } from 'vitest';
import { LevelRunner, type LevelConfig } from './level';
import { simulateLevel } from './bot';
import type { RulesConfig } from './resolver';
import { NEXT_TIER, LEVELS } from '@emojiverse/content';

const rules: RulesConfig = { nextTier: NEXT_TIER, basePieceScore: 60, comboStep: 0.5 };

const base: LevelConfig = {
  id: 't', cols: 7, rows: 8, moves: 20, seed: 42,
  spawnPool: ['water', 'fire', 'seed', 'happy', 'star'],
  objectives: [{ type: 'collect', target: 'herb', amount: 2 }],
  stars: [1000, 2000, 3000],
};

describe('LevelRunner', () => {
  it('starts with a full, match-free, playable board', () => {
    const r = new LevelRunner(base, rules);
    for (let row = 0; row < 8; row++) for (let col = 0; col < 7; col++) expect(r.board.pieceAt({ col, row })).not.toBeNull();
    expect(r.hint()).toBeDefined();
    expect(r.status).toBe('playing');
    expect(r.movesLeft).toBe(20);
  });

  it('is deterministic for the same seed', () => {
    const a = new LevelRunner(base, rules), b = new LevelRunner(base, rules);
    expect(a.board.toAscii()).toBe(b.board.toAscii());
    const m = a.hint()!;
    const ra = a.tryMove(m)!, rb = b.tryMove(m)!;
    expect(ra.scoreDelta).toBe(rb.scoreDelta);
    expect(a.board.toAscii()).toBe(b.board.toAscii());
  });

  it('illegal move does not consume a move', () => {
    const r = new LevelRunner(base, rules);
    const res = r.tryMove({ from: { col: 0, row: 0 }, to: { col: 5, row: 5 } })!;
    expect(res.events[0]).toMatchObject({ type: 'swap', valid: false });
    expect(r.movesLeft).toBe(20);
  });

  it('ends as lost when moves run out, and emits level_end', () => {
    const r = new LevelRunner({ ...base, moves: 2, objectives: [{ type: 'score', amount: 10_000_000 }] }, rules);
    r.tryMove(r.hint()!);
    const last = r.tryMove(r.hint()!)!;
    expect(r.status).toBe('lost');
    expect(last.events.at(-1)).toMatchObject({ type: 'level_end', won: false, stars: 0 });
    expect(r.tryMove(r.hint() ?? { from: { col: 0, row: 0 }, to: { col: 1, row: 0 } })).toBeNull();
  });

  it('wins when objectives are met and converts leftover moves into score', () => {
    const r = new LevelRunner({ ...base, objectives: [{ type: 'score', amount: 1 }] }, rules);
    const res = r.tryMove(r.hint()!)!;
    expect(r.status).toBe('won');
    const end = res.events.at(-1) as Extract<typeof res.events[number], { type: 'level_end' }>;
    expect(end.won).toBe(true);
    expect(end.stars).toBeGreaterThanOrEqual(1);
    expect(r.score).toBeGreaterThan(res.scoreDelta); // + leftover moves bonus
  });

  it('dynamic mercy biases the base ingredient after 3 losses', () => {
    const r = new LevelRunner(base, rules, 3);
    expect(r.board.spawnBias['seed']).toBeCloseTo(1.08);
    const r2 = new LevelRunner(base, rules, 0);
    expect(r2.board.spawnBias['seed']).toBeUndefined();
  });
});

describe('Balance simulation (smoke)', () => {
  it('greedy bot wins the shipped World-1 levels within the positive-frustration band', () => {
    for (const lv of LEVELS) {
      const s = simulateLevel(lv, rules, 12);
      expect(s.games).toBe(12);
      expect(s.winRate).toBeGreaterThan(0.05); // beatable
      expect(s.avgMovesUsed).toBeLessThanOrEqual(lv.moves);
    }
  }, 60_000);
});
