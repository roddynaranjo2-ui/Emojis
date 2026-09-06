import type { Cell, Piece, Pos, Blocker, BlockerKind, SpecialKind } from './types';
import { Rng } from './rng';

export interface BoardConfig {
  cols: number;
  rows: number;
  spawnPool: string[];
  seed: number;
  blockers?: Array<{ col: number; row: number; kind: BlockerKind }>;
  /** cells covered in dust (1 or 2 layers) */
  dust?: Array<{ col: number; row: number; layers: 1 | 2 }>;
  /** caged cells (piece spawns inside a cage) */
  cages?: Array<{ col: number; row: number }>;
  /** holes: cells that do not exist */
  holes?: Array<{ col: number; row: number }>;
  /** optional row-string layout: '.' normal, '#' rock, 'I' ice, 'J' dust1, 'K' dust2, 'C' cage, 'X' hole */
  layout?: string[];
}

const BLOCKER_HP: Record<BlockerKind, number> = { rock: 1, ice: 2 };

/**
 * Board = grid + deterministic spawner. Row 0 is the TOP (pieces fall towards higher rows).
 * Pure data structure; all rule logic lives in resolver.ts.
 */
export class Board {
  readonly cols: number;
  readonly rows: number;
  readonly cells: Cell[][]; // cells[row][col]
  readonly rng: Rng;
  spawnPool: string[];
  private nextUid = 1;
  /** dynamic mercy: emoji id → extra weight multiplier (1 = neutral) */
  spawnBias: Record<string, number> = {};

  constructor(cfg: BoardConfig) {
    this.cols = cfg.cols;
    this.rows = cfg.rows;
    this.rng = new Rng(cfg.seed);
    this.spawnPool = [...cfg.spawnPool];
    this.cells = Array.from({ length: cfg.rows }, () =>
      Array.from({ length: cfg.cols }, (): Cell => ({ piece: null, blocker: null, dust: 0, caged: false, hole: false })),
    );
    for (const b of cfg.blockers ?? []) this.cells[b.row]![b.col]!.blocker = { kind: b.kind, hp: BLOCKER_HP[b.kind] };
    for (const d of cfg.dust ?? []) this.cells[d.row]![d.col]!.dust = d.layers;
    for (const c of cfg.cages ?? []) this.cells[c.row]![c.col]!.caged = true;
    for (const h of cfg.holes ?? []) this.cells[h.row]![h.col]!.hole = true;
    if (cfg.layout) {
      cfg.layout.forEach((line, row) => [...line].forEach((ch, col) => {
        if (row >= cfg.rows || col >= cfg.cols) return;
        const cell = this.cells[row]![col]!;
        switch (ch) {
          case '#': cell.blocker = { kind: 'rock', hp: 1 }; break;
          case 'I': cell.blocker = { kind: 'ice', hp: 2 }; break;
          case 'J': cell.dust = 1; break;
          case 'K': cell.dust = 2; break;
          case 'C': cell.caged = true; break;
          case 'X': cell.hole = true; break;
        }
      }));
    }
  }

  /** counts for objectives */
  countDust(): number { let n = 0; for (const r of this.cells) for (const c of r) n += c.dust; return n; }
  countCages(): number { let n = 0; for (const r of this.cells) for (const c of r) if (c.caged) n++; return n; }
  countBlockers(): number { let n = 0; for (const r of this.cells) for (const c of r) if (c.blocker) n++; return n; }

  inBounds(p: Pos): boolean { return p.col >= 0 && p.col < this.cols && p.row >= 0 && p.row < this.rows; }
  cell(p: Pos): Cell { return this.cells[p.row]![p.col]!; }
  pieceAt(p: Pos): Piece | null { return this.inBounds(p) ? this.cell(p).piece : null; }
  blockerAt(p: Pos): Blocker | null { return this.inBounds(p) ? this.cell(p).blocker : null; }
  setPiece(p: Pos, piece: Piece | null): void { this.cell(p).piece = piece; }

  /** A cell that a piece can occupy: in bounds, not a hole, not a blocker. */
  isOpen(p: Pos): boolean { return this.inBounds(p) && !this.cell(p).hole && !this.cell(p).blocker; }
  /** Can the piece here be moved by the player? (not caged) */
  isMovable(p: Pos): boolean { return this.isOpen(p) && !this.cell(p).caged && !!this.cell(p).piece; }

  makePiece(emoji: string, special?: SpecialKind): Piece {
    const piece: Piece = { uid: this.nextUid++, emoji };
    if (special) piece.special = special;
    return piece;
  }

  spawnRandom(exclude: string[] = []): Piece {
    const pool = this.spawnPool.filter((e) => !exclude.includes(e));
    const src = pool.length ? pool : this.spawnPool;
    const weights = src.map((e) => this.spawnBias[e] ?? 1);
    return this.makePiece(this.rng.weighted(src, weights));
  }

  /**
   * Fill all empty open cells without creating an initial match
   * (Candy Crush rule: the opening board must have zero matches, but ≥1 valid move).
   */
  fillNoMatches(): void {
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        const p = { col, row };
        if (!this.isOpen(p) || this.cell(p).piece) continue;
        const exclude: string[] = [];
        const l1 = this.pieceAt({ col: col - 1, row }), l2 = this.pieceAt({ col: col - 2, row });
        if (l1 && l2 && l1.emoji === l2.emoji && !l1.special) exclude.push(l1.emoji);
        const u1 = this.pieceAt({ col, row: row - 1 }), u2 = this.pieceAt({ col, row: row - 2 });
        if (u1 && u2 && u1.emoji === u2.emoji && !u1.special) exclude.push(u1.emoji);
        this.setPiece(p, this.spawnRandom(exclude));
      }
    }
  }

  /** Snapshot of emoji ids for tests/debug: '.' = empty, '#' = blocker */
  toAscii(map?: (p: Piece) => string): string {
    return this.cells.map((row) => row.map((c) => {
      if (c.hole) return ' ';
      if (c.blocker) return c.blocker.kind === 'ice' ? '❄' : '#';
      if (!c.piece) return '.';
      return map ? map(c.piece) : c.piece.special ? c.piece.special[0]!.toUpperCase() : c.piece.emoji[0]!;
    }).join('')).join('\n');
  }

  /** Test helper: load a grid from letters. Each letter is an emoji id (single char ids). */
  static fromAscii(rows: string[], seed = 1, pool?: string[], legend?: Record<string, string>): Board {
    const b = new Board({ cols: rows[0]!.length, rows: rows.length, spawnPool: pool ?? ['a', 'b', 'c', 'd', 'e'], seed });
    rows.forEach((line, row) => {
      [...line].forEach((ch, col) => {
        if (ch === '.') return;
        if (ch === '#') { b.cells[row]![col]!.blocker = { kind: 'rock', hp: 1 }; return; }
        if (ch === '❄') { b.cells[row]![col]!.blocker = { kind: 'ice', hp: 2 }; return; }
        if (ch === ' ') { b.cells[row]![col]!.hole = true; return; }
        if (ch === 'B') { b.setPiece({ col, row }, b.makePiece('sp_bomb', 'bomb')); return; }
        if (ch === 'H') { b.setPiece({ col, row }, b.makePiece('sp_rocket', 'rocket_h')); return; }
        if (ch === 'V') { b.setPiece({ col, row }, b.makePiece('sp_rocket', 'rocket_v')); return; }
        if (ch === 'W') { b.setPiece({ col, row }, b.makePiece('sp_wild', 'wild')); return; }
        b.setPiece({ col, row }, b.makePiece(legend?.[ch] ?? ch));
      });
    });
    return b;
  }

  clone(): Board {
    const b = new Board({ cols: this.cols, rows: this.rows, spawnPool: this.spawnPool, seed: 0 });
    for (let r = 0; r < this.rows; r++) for (let c = 0; c < this.cols; c++) {
      const src = this.cells[r]![c]!;
      b.cells[r]![c] = { piece: src.piece ? { ...src.piece } : null, blocker: src.blocker ? { ...src.blocker } : null, dust: src.dust, caged: src.caged, hole: src.hole };
    }
    b.nextUid = this.nextUid;
    b.spawnBias = { ...this.spawnBias };
    // copy rng state by re-seeding is not possible; clone is for hypothetical move checks only
    return b;
  }
}
