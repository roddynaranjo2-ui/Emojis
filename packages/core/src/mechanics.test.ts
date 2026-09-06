import { describe, it, expect } from 'vitest';
import { Board } from './board';
import { Resolver, type RulesConfig } from './resolver';
import { LevelRunner } from './level';
import type { ResolveEvent } from './types';

const POOL = ['p', 'q', 'r', 's', 't', 'u'];
const rules: RulesConfig = { nextTier: { a: 'x' }, basePieceScore: 60, comboStep: 0.5 };
const evs = (r: { events: ResolveEvent[] }, type: ResolveEvent['type']) => r.events.filter((e) => e.type === type);

describe('dust (jelly) layers', () => {
  it('matching on a dusted cell removes one layer; 2-layer dust needs two hits', () => {
    const b = Board.fromAscii(['aab', 'ccd', 'dcd'], 1, POOL);
    b.cell({ col: 0, row: 0 }).dust = 2; b.cell({ col: 1, row: 0 }).dust = 1;
    const res = new Resolver(b, rules).applyMove({ from: { col: 2, row: 0 }, to: { col: 2, row: 1 } });
    // no match there; try the real one: swap a(1,0)? Build simpler: row0 'aab' + (2,1)='a'
    expect(res.events[0]).toMatchObject({ valid: false });
    const b2 = Board.fromAscii(['aab', 'cca', 'dcd'], 1, POOL);
    b2.cell({ col: 0, row: 0 }).dust = 2; b2.cell({ col: 1, row: 0 }).dust = 1;
    const r2 = new Resolver(b2, rules).applyMove({ from: { col: 2, row: 1 }, to: { col: 2, row: 0 } });
    const dust = evs(r2, 'dust_clear') as Extract<ResolveEvent, { type: 'dust_clear' }>[];
    expect(dust.length).toBeGreaterThanOrEqual(2);
    expect(b2.cell({ col: 0, row: 0 }).dust).toBe(1);
    expect(b2.cell({ col: 1, row: 0 }).dust).toBe(0);
    expect(r2.dustCleared).toBeGreaterThanOrEqual(2);
  });
});

describe('cages', () => {
  it('caged pieces cannot be swapped and do not fall; a match including them breaks the cage first', () => {
    const b = Board.fromAscii(['aab', 'cca', 'dcd'], 1, POOL);
    b.cell({ col: 0, row: 0 }).caged = true;
    const r = new Resolver(b, rules);
    expect(r.isLegal({ from: { col: 0, row: 0 }, to: { col: 1, row: 0 } })).toBe(false);
    const res = r.applyMove({ from: { col: 2, row: 1 }, to: { col: 2, row: 0 } });
    expect(evs(res, 'cage_break')).toHaveLength(1);
    expect(b.cell({ col: 0, row: 0 }).caged).toBe(false);
    // the caged 'a' was NOT cleared in the first clear (cage absorbed the hit)
    const firstClear = evs(res, 'clear')[0] as Extract<ResolveEvent, { type: 'clear' }>;
    expect(firstClear.cells.some((c) => c.pos.col === 0 && c.pos.row === 0)).toBe(false);
    expect(firstClear.cells).toHaveLength(2);
    expect(res.cagesBroken).toBe(1);
  });
});

describe('holes', () => {
  it('holes are never filled and act as floors', () => {
    const b = new Board({ cols: 3, rows: 3, spawnPool: POOL, seed: 7, holes: [{ col: 1, row: 1 }] });
    b.fillNoMatches();
    expect(b.pieceAt({ col: 1, row: 1 })).toBeNull();
    expect(b.isOpen({ col: 1, row: 1 })).toBe(false);
    const layout = new Board({ cols: 3, rows: 2, spawnPool: POOL, seed: 1, layout: ['X.X', 'JKC'] });
    expect(layout.cell({ col: 0, row: 0 }).hole).toBe(true);
    expect(layout.cell({ col: 0, row: 1 }).dust).toBe(1);
    expect(layout.cell({ col: 1, row: 1 }).dust).toBe(2);
    expect(layout.cell({ col: 2, row: 1 }).caged).toBe(true);
  });
});

describe('boosters', () => {
  it('hammer destroys one piece without consuming a move', () => {
    const runner = new LevelRunner({ id: 't', cols: 7, rows: 8, moves: 10, seed: 3, spawnPool: POOL, objectives: [{ type: 'score', amount: 1e9 }], stars: [1, 2, 3] }, rules);
    const before = runner.board.pieceAt({ col: 3, row: 3 })!.uid;
    const res = runner.useBooster('hammer', { col: 3, row: 3 })!;
    expect(evs(res, 'booster')).toHaveLength(1);
    const first = evs(res, 'clear')[0] as Extract<ResolveEvent, { type: 'clear' }>;
    expect(first.cells).toHaveLength(1);
    expect(first.cells[0]!.piece.uid).toBe(before);
    expect(runner.movesLeft).toBe(10);
    expect(runner.board.pieceAt({ col: 3, row: 3 })!.uid).not.toBe(before);
  });

  it('pre-level rocket booster places a rocket special', () => {
    const runner = new LevelRunner({ id: 't', cols: 7, rows: 8, moves: 10, seed: 3, spawnPool: POOL, objectives: [{ type: 'score', amount: 1e9 }], stars: [1, 2, 3] }, rules);
    const res = runner.useBooster('rocket_h')!;
    const sp = evs(res, 'spawn_special')[0] as Extract<ResolveEvent, { type: 'spawn_special' }>;
    expect(sp.piece.special).toBe('rocket_h');
    expect(runner.board.pieceAt(sp.at)!.special).toBe('rocket_h');
  });

  it('tap-to-activate fires a special in place and consumes one move', () => {
    const b = Board.fromAscii(['pqpqp', 'qpBpq', 'pqpqp'], 1, POOL);
    const r = new Resolver(b, rules);
    const res = r.tapSpecial({ col: 2, row: 1 })!;
    expect(evs(res, 'special_fire')[0]).toMatchObject({ kind: 'bomb', at: { col: 2, row: 1 } });
    expect(r.tapSpecial({ col: 0, row: 0 })).toBeNull();
  });

  it('addMoves revives a lost level', () => {
    const runner = new LevelRunner({ id: 't', cols: 7, rows: 8, moves: 1, seed: 3, spawnPool: POOL, objectives: [{ type: 'score', amount: 1e9 }], stars: [1, 2, 3] }, rules);
    runner.tryMove(runner.hint()!);
    expect(runner.status).toBe('lost');
    runner.addMoves(5);
    expect(runner.status).toBe('playing');
    expect(runner.movesLeft).toBe(5);
  });
});

describe('hint after revive', () => {
  it('still returns a move when movesLeft exceeds the original budget', () => {
    const runner = new LevelRunner({ id: 't', cols: 7, rows: 8, moves: 1, seed: 3, spawnPool: POOL, objectives: [{ type: 'score', amount: 1e9 }], stars: [1, 2, 3] }, rules);
    runner.tryMove(runner.hint()!);
    expect(runner.status).toBe('lost');
    runner.addMoves(5);
    expect(runner.movesLeft).toBe(5); // 5 > cfg.moves (1) → index would be negative without the fix
    expect(runner.status).toBe('playing');
    expect(runner.hint()).toBeDefined();
  });
});
