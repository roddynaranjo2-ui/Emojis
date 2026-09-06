import type { Board } from './board';
import type { Pos, SpecialKind, ResolveEvent } from './types';

/**
 * Special pieces & synergies — decoupled from rendering. Each function returns
 * the set of affected cells + an event describing the effect so the renderer
 * can play the right VFX/SFX/shake.
 *
 *   💣 bomb        : 3×3 area
 *   🚀 rocket      : full row (rocket_h) or full column (rocket_v)
 *   🌟 wild        : swapped with X → clears every X on the board
 *
 * Synergies (swap special ↔ special):
 *   💣 + 🚀  → MEGA CROSS: rocket carries bomb to board center, 5×5 blast + full row & column sweep (3 wide)
 *   💣 + 💣  → 5×5 blast at swap point
 *   🚀 + 🚀  → row + column cross at swap point
 *   🌟 + 💣  → every piece of the most common emoji becomes a bomb and detonates
 *   🌟 + 🚀  → every piece of the most common emoji becomes a rocket and fires
 *   🌟 + 🌟  → board wipe
 */

export interface SpecialEffect {
  area: Pos[];
  events: ResolveEvent[];
  /** 0..1 shake magnitude hint for the renderer */
  magnitude: number;
}

const k = (p: Pos) => `${p.col},${p.row}`;

function uniq(cells: Pos[]): Pos[] {
  const seen = new Set<string>(); const out: Pos[] = [];
  for (const c of cells) { const kk = k(c); if (!seen.has(kk)) { seen.add(kk); out.push(c); } }
  return out;
}

export function areaBomb(board: Board, at: Pos, radius = 1): Pos[] {
  const out: Pos[] = [];
  for (let r = at.row - radius; r <= at.row + radius; r++)
    for (let c = at.col - radius; c <= at.col + radius; c++)
      if (board.inBounds({ col: c, row: r })) out.push({ col: c, row: r });
  return out;
}

export function areaRow(board: Board, row: number): Pos[] {
  return Array.from({ length: board.cols }, (_, col) => ({ col, row })).filter((p) => board.inBounds(p));
}
export function areaCol(board: Board, col: number): Pos[] {
  return Array.from({ length: board.rows }, (_, row) => ({ col, row })).filter((p) => board.inBounds(p));
}

export function areaOf(board: Board, kind: SpecialKind, at: Pos): Pos[] {
  switch (kind) {
    case 'bomb': return areaBomb(board, at, 1);
    case 'rocket_h': return areaRow(board, at.row);
    case 'rocket_v': return areaCol(board, at.col);
    case 'wild': return [at];
  }
}

/** Fire a single special (no synergy). */
export function fireSpecial(board: Board, kind: SpecialKind, at: Pos, cascade: number, wildTarget?: string): SpecialEffect {
  if (kind === 'wild') {
    // Wild alone (e.g. destroyed by a blast) sweeps the most common emoji.
    const target = wildTarget ?? mostCommonEmoji(board);
    const area = target ? allOf(board, target) : [];
    area.push(at);
    const u = uniq(area);
    return { area: u, magnitude: 0.5, events: [{ type: 'special_fire', kind: 'wild_sweep', at, area: u, cascade, magnitude: 0.5 }] };
  }
  const area = areaOf(board, kind, at);
  const magnitude = kind === 'bomb' ? 0.35 : 0.3;
  return { area, magnitude, events: [{ type: 'special_fire', kind, at, area, cascade, magnitude }] };
}

/** Resolve a special ↔ special swap. `a` is the dragged piece, `b` the target. */
export function fireSynergy(board: Board, a: Pos, b: Pos, ka: SpecialKind, kb: SpecialKind, cascade: number): SpecialEffect {
  const kinds = [ka, kb].sort() as [SpecialKind, SpecialKind];
  const isRocket = (x: SpecialKind) => x === 'rocket_h' || x === 'rocket_v';
  const center: Pos = { col: Math.floor(board.cols / 2), row: Math.floor(board.rows / 2) };

  // 💣 + 🚀 → MEGA CROSS at board center (the rocket "carries" the bomb)
  if ((ka === 'bomb' && isRocket(kb)) || (kb === 'bomb' && isRocket(ka))) {
    const area = uniq([
      ...areaBomb(board, center, 2),                      // 5×5
      ...areaRow(board, center.row - 1), ...areaRow(board, center.row), ...areaRow(board, center.row + 1),
      ...areaCol(board, center.col - 1), ...areaCol(board, center.col), ...areaCol(board, center.col + 1),
    ]);
    return {
      area, magnitude: 1,
      events: [
        { type: 'synergy', kind: 'bomb_rocket', a, b, center, cascade },
        { type: 'special_fire', kind: 'mega_cross', at: center, area, cascade, magnitude: 1 },
      ],
    };
  }
  if (kinds[0] === 'bomb' && kinds[1] === 'bomb') {
    const area = areaBomb(board, b, 2);
    return { area, magnitude: 0.7, events: [
      { type: 'synergy', kind: 'bomb_bomb', a, b, center: b, cascade },
      { type: 'special_fire', kind: 'double_bomb', at: b, area, cascade, magnitude: 0.7 },
    ] };
  }
  if (isRocket(ka) && isRocket(kb)) {
    const area = uniq([...areaRow(board, b.row), ...areaCol(board, b.col)]);
    return { area, magnitude: 0.6, events: [
      { type: 'synergy', kind: 'rocket_rocket', a, b, center: b, cascade },
      { type: 'special_fire', kind: 'double_rocket', at: b, area, cascade, magnitude: 0.6 },
    ] };
  }
  if (kinds.includes('wild')) {
    const other = ka === 'wild' ? kb : ka;
    if (other === 'wild') {
      const area: Pos[] = [];
      for (let r = 0; r < board.rows; r++) for (let c = 0; c < board.cols; c++) area.push({ col: c, row: r });
      return { area, magnitude: 1, events: [
        { type: 'synergy', kind: 'wild_wild', a, b, center: b, cascade },
        { type: 'special_fire', kind: 'wild_sweep', at: b, area, cascade, magnitude: 1 },
      ] };
    }
    // wild + bomb / wild + rocket: every piece of the most common emoji fires as that special
    const target = mostCommonEmoji(board);
    const seeds = target ? allOf(board, target) : [];
    const area = uniq(seeds.flatMap((p) => areaOf(board, other === 'bomb' ? 'bomb' : (p.col % 2 ? 'rocket_h' : 'rocket_v'), p)).concat([a, b]));
    const kind = other === 'bomb' ? 'wild_bomb' : 'wild_rocket';
    return { area, magnitude: 0.9, events: [
      { type: 'synergy', kind, a, b, center: b, cascade },
      { type: 'special_fire', kind: other === 'bomb' ? 'bomb' : 'rocket_h', at: b, area, cascade, magnitude: 0.9 },
    ] };
  }
  // fallback (should be unreachable)
  return fireSpecial(board, ka, a, cascade);
}

export function allOf(board: Board, emoji: string): Pos[] {
  const out: Pos[] = [];
  for (let r = 0; r < board.rows; r++) for (let c = 0; c < board.cols; c++) {
    const p = board.pieceAt({ col: c, row: r });
    if (p && !p.special && p.emoji === emoji) out.push({ col: c, row: r });
  }
  return out;
}

export function mostCommonEmoji(board: Board): string | undefined {
  const counts = new Map<string, number>();
  for (let r = 0; r < board.rows; r++) for (let c = 0; c < board.cols; c++) {
    const p = board.pieceAt({ col: c, row: r });
    if (p && !p.special) counts.set(p.emoji, (counts.get(p.emoji) ?? 0) + 1);
  }
  let best: string | undefined; let n = 0;
  for (const [e, c] of counts) if (c > n) { best = e; n = c; }
  return best;
}
