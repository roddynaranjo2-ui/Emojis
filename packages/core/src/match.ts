import type { Board } from './board';
import type { MatchGroup, MatchShape, Pos } from './types';

const key = (p: Pos) => `${p.col},${p.row}`;

/**
 * Finds every match on the board and classifies its shape.
 *
 * Shape → reward (see resolver):
 *   line3        → evolve to next tier
 *   line4        → evolve + 🚀 rocket (oriented perpendicular to the line)
 *   line5        → 🌟 wild
 *   L / T / cross→ evolve + 💣 bomb
 *
 * `preferOrigin` (the cell the player swapped into) wins as spawn location
 * so the special appears "in the hand" — this is what Candy Crush does and
 * it is what makes the reward feel earned.
 */
export function findMatches(board: Board, preferOrigin?: Pos): MatchGroup[] {
  const runsH: Pos[][] = [];
  const runsV: Pos[][] = [];

  const same = (a: Pos, b: Pos) => {
    const pa = board.pieceAt(a), pb = board.pieceAt(b);
    return !!pa && !!pb && !pa.special && !pb.special && pa.emoji === pb.emoji;
  };

  // horizontal runs
  for (let row = 0; row < board.rows; row++) {
    let col = 0;
    while (col < board.cols) {
      const start = { col, row };
      if (!board.pieceAt(start) || board.pieceAt(start)!.special) { col++; continue; }
      let end = col;
      while (end + 1 < board.cols && same(start, { col: end + 1, row })) end++;
      if (end - col + 1 >= 3) runsH.push(Array.from({ length: end - col + 1 }, (_, i) => ({ col: col + i, row })));
      col = end + 1;
    }
  }
  // vertical runs
  for (let col = 0; col < board.cols; col++) {
    let row = 0;
    while (row < board.rows) {
      const start = { col, row };
      if (!board.pieceAt(start) || board.pieceAt(start)!.special) { row++; continue; }
      let end = row;
      while (end + 1 < board.rows && same(start, { col, row: end + 1 })) end++;
      if (end - row + 1 >= 3) runsV.push(Array.from({ length: end - row + 1 }, (_, i) => ({ col, row: row + i })));
      row = end + 1;
    }
  }

  // Merge intersecting H/V runs into L / T / cross groups.
  const groups: MatchGroup[] = [];
  const usedV = new Set<number>();

  for (const h of runsH) {
    const hKeys = new Set(h.map(key));
    const merged: Pos[] = [...h];
    let intersect: Pos | null = null;
    let touchedV: Pos[] | null = null;
    runsV.forEach((v, vi) => {
      if (usedV.has(vi)) return;
      const cross = v.find((p) => hKeys.has(key(p)));
      if (cross) {
        usedV.add(vi);
        intersect = cross;
        touchedV = v;
        for (const p of v) if (!hKeys.has(key(p))) merged.push(p);
      }
    });
    const emoji = board.pieceAt(h[0]!)!.emoji;
    if (intersect && touchedV) {
      const shape = classifyIntersection(h, touchedV, intersect);
      groups.push({ cells: merged, emoji, shape, origin: intersect, horizontal: true });
    } else {
      groups.push({ cells: merged, emoji, shape: lineShape(h.length), origin: pickOrigin(h, preferOrigin), horizontal: true });
    }
  }
  runsV.forEach((v, vi) => {
    if (usedV.has(vi)) return;
    const emoji = board.pieceAt(v[0]!)!.emoji;
    groups.push({ cells: v, emoji, shape: lineShape(v.length), origin: pickOrigin(v, preferOrigin), horizontal: false });
  });

  return groups;
}

function lineShape(n: number): MatchShape { return n >= 5 ? 'line5' : n === 4 ? 'line4' : 'line3'; }

function classifyIntersection(h: Pos[], v: Pos[], x: Pos): MatchShape {
  const hEnd = x.col === h[0]!.col || x.col === h[h.length - 1]!.col;
  const vEnd = x.row === v[0]!.row || x.row === v[v.length - 1]!.row;
  if (hEnd && vEnd) return 'L';
  if (hEnd || vEnd) return 'T';
  return 'cross';
}

function pickOrigin(run: Pos[], prefer?: Pos): Pos {
  if (prefer) { const hit = run.find((p) => p.col === prefer.col && p.row === prefer.row); if (hit) return hit; }
  return run[Math.floor(run.length / 2)]!;
}

/** Does swapping a↔b create at least one match? (used for move validation + hint finder) */
export function swapCreatesMatch(board: Board, a: Pos, b: Pos): boolean {
  const pa = board.pieceAt(a), pb = board.pieceAt(b);
  if (!pa || !pb) return false;
  board.setPiece(a, pb); board.setPiece(b, pa);
  const has = hasMatchAt(board, a) || hasMatchAt(board, b);
  board.setPiece(a, pa); board.setPiece(b, pb);
  return has;
}

function hasMatchAt(board: Board, p: Pos): boolean {
  const piece = board.pieceAt(p);
  if (!piece || piece.special) return false;
  const count = (dc: number, dr: number) => {
    let n = 0; let q = { col: p.col + dc, row: p.row + dr };
    while (board.inBounds(q)) { const o = board.pieceAt(q); if (!o || o.special || o.emoji !== piece.emoji) break; n++; q = { col: q.col + dc, row: q.row + dr }; }
    return n;
  };
  return 1 + count(1, 0) + count(-1, 0) >= 3 || 1 + count(0, 1) + count(0, -1) >= 3;
}

/** Enumerate all legal moves: adjacent swaps that create a match, or any swap involving a special. */
export function findAllMoves(board: Board): Array<{ from: Pos; to: Pos }> {
  const out: Array<{ from: Pos; to: Pos }> = [];
  for (let row = 0; row < board.rows; row++) for (let col = 0; col < board.cols; col++) {
    const a = { col, row };
    if (!board.isMovable(a)) continue;
    for (const b of [{ col: col + 1, row }, { col, row: row + 1 }]) {
      if (!board.isMovable(b)) continue;
      if (board.pieceAt(a)!.special || board.pieceAt(b)!.special || swapCreatesMatch(board, a, b)) out.push({ from: a, to: b });
    }
  }
  return out;
}
