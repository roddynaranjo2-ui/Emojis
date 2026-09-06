import { describe, it, expect } from 'vitest';
import { Board } from './board';
import { findMatches, findAllMoves, swapCreatesMatch } from './match';

describe('findMatches — shape classification', () => {
  it('detects a horizontal line3', () => {
    const b = Board.fromAscii(['aaab', 'bcdc', 'cdab']);
    const g = findMatches(b);
    expect(g).toHaveLength(1);
    expect(g[0]!.shape).toBe('line3');
    expect(g[0]!.emoji).toBe('a');
    expect(g[0]!.horizontal).toBe(true);
  });

  it('detects a vertical line4 and line5', () => {
    const b = Board.fromAscii(['ab', 'ab', 'ab', 'ab', 'cb']);
    const g = findMatches(b);
    const a = g.find((x) => x.emoji === 'a')!, bb = g.find((x) => x.emoji === 'b')!;
    expect(a.shape).toBe('line4');
    expect(bb.shape).toBe('line5');
    expect(a.horizontal).toBe(false);
  });

  it('classifies L shape (intersection at both ends)', () => {
    const b = Board.fromAscii([
      'abcd',
      'abcd',
      'aaac',
    ]);
    const g = findMatches(b);
    expect(g).toHaveLength(1);
    expect(g[0]!.shape).toBe('L');
    expect(g[0]!.cells).toHaveLength(5);
    expect(g[0]!.origin).toEqual({ col: 0, row: 2 });
  });

  it('classifies T shape (intersection at one end only)', () => {
    const b = Board.fromAscii([
      'aaab',
      'bacd',
      'bacd',
    ]);
    const g = findMatches(b);
    expect(g).toHaveLength(1);
    expect(g[0]!.shape).toBe('T');
    expect(g[0]!.origin).toEqual({ col: 1, row: 0 });
  });

  it('classifies cross shape (intersection in the middle of both)', () => {
    const b = Board.fromAscii([
      'bacb',
      'aaad',
      'bacb',
    ]);
    const g = findMatches(b);
    expect(g).toHaveLength(1);
    expect(g[0]!.shape).toBe('cross');
    expect(g[0]!.origin).toEqual({ col: 1, row: 1 });
  });

  it('ignores special pieces when matching', () => {
    const b = Board.fromAscii(['aBa', 'bcd', 'dcb']);
    expect(findMatches(b)).toHaveLength(0);
  });

  it('prefers the swapped-in cell as origin', () => {
    const b = Board.fromAscii(['aaa', 'bcd']);
    const g = findMatches(b, { col: 2, row: 0 });
    expect(g[0]!.origin).toEqual({ col: 2, row: 0 });
  });
});

describe('moves', () => {
  it('swapCreatesMatch is side-effect free', () => {
    const b = Board.fromAscii(['aab', 'ccd', 'ddc']);
    const before = b.toAscii();
    expect(swapCreatesMatch(b, { col: 2, row: 0 }, { col: 2, row: 1 })).toBe(false);
    expect(swapCreatesMatch(b, { col: 1, row: 1 }, { col: 2, row: 1 })).toBe(false);
    expect(b.toAscii()).toBe(before);
  });

  it('findAllMoves lists legal swaps incl. specials', () => {
    const b = Board.fromAscii(['aba', 'ccd', 'ddc']);
    const moves = findAllMoves(b);
    // swapping b(1,0) with c(1,1) → 'aca'? no. swapping b(1,0) with c... a-b-a row: swap (1,0)↔(1,1) puts c at top → no.
    // Actually a moveable: (1,0)b ↔ (1,1)c gives row0 'aca' no match; col1 'b c d' no. Let's ensure a special always counts.
    const withSpecial = Board.fromAscii(['aBa', 'ccd', 'ddc']);
    expect(findAllMoves(withSpecial).length).toBeGreaterThan(moves.length);
  });
});

describe('Board.fillNoMatches', () => {
  it('produces a board with zero initial matches for many seeds', () => {
    for (let seed = 1; seed < 40; seed++) {
      const b = new Board({ cols: 7, rows: 8, spawnPool: ['a', 'b', 'c', 'd', 'e'], seed });
      b.fillNoMatches();
      expect(findMatches(b), `seed ${seed}`).toHaveLength(0);
    }
  });

  it('respects blockers (no piece placed on them)', () => {
    const b = new Board({ cols: 4, rows: 4, spawnPool: ['a', 'b', 'c', 'd'], seed: 3, blockers: [{ col: 1, row: 1, kind: 'ice' }] });
    b.fillNoMatches();
    expect(b.pieceAt({ col: 1, row: 1 })).toBeNull();
    expect(b.blockerAt({ col: 1, row: 1 })).toEqual({ kind: 'ice', hp: 2 });
  });
});
