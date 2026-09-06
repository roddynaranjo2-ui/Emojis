import type { Board } from './board';
import type { Move, Pos, Piece, ResolveEvent, ResolveResult, SpecialKind, MatchGroup } from './types';
import { findMatches, findAllMoves, swapCreatesMatch } from './match';
import { fireSpecial, fireSynergy, areaBomb } from './specials';

export interface RulesConfig {
  /** emoji id → next-tier emoji id (undefined = apex) */
  nextTier: Readonly<Record<string, string | undefined>>;
  /** score per cleared piece at cascade 0 */
  basePieceScore: number;
  /** multiplier per cascade depth (1 + depth*comboStep) */
  comboStep: number;
}

const k = (p: Pos) => `${p.col},${p.row}`;
const eq = (a: Pos, b: Pos) => a.col === b.col && a.row === b.row;
const adjacent = (a: Pos, b: Pos) => Math.abs(a.col - b.col) + Math.abs(a.row - b.row) === 1;

/**
 * The resolver applies one player move and runs the full cascade to rest.
 * Pure: mutates only the given Board, emits an ordered event log.
 */
export class Resolver {
  constructor(private readonly board: Board, private readonly rules: RulesConfig) {}

  /** Is this swap legal? adjacency + (creates match OR involves a special) */
  isLegal(move: Move): boolean {
    const { from, to } = move;
    if (!adjacent(from, to)) return false;
    const a = this.board.pieceAt(from), b = this.board.pieceAt(to);
    if (!a || !b) return false;
    if (!this.board.isMovable(from) || !this.board.isMovable(to)) return false;
    if (a.special || b.special) return true;
    return swapCreatesMatch(this.board, from, to);
  }

  private newResult(events: ResolveEvent[]): ResolveResult {
    return { events, scoreDelta: 0, cascades: 0, collected: {}, blockersCleared: 0, dustCleared: 0, cagesBroken: 0 };
  }

  applyMove(move: Move): ResolveResult {
    const events: ResolveEvent[] = [];
    const res = this.newResult(events);
    const { from, to } = move;

    if (!this.isLegal(move)) {
      events.push({ type: 'swap', a: from, b: to, valid: false });
      return res;
    }

    const a = this.board.pieceAt(from)!, b = this.board.pieceAt(to)!;
    this.board.setPiece(from, b); this.board.setPiece(to, a);
    events.push({ type: 'swap', a: from, b: to, valid: true });

    const cascade = 0;
    const pendingClear = new Map<string, Pos>();
    let pendingSource: 'match' | 'special' | 'apex' = 'match';

    // ── Special interactions on the swap itself ─────────────────────────────
    if (a.special && b.special) {
      const fx = fireSynergy(this.board, to, from, a.special, b.special, cascade);
      events.push(...fx.events);
      // Remove the two specials themselves before the blast so they don't re-trigger
      this.board.setPiece(from, null); this.board.setPiece(to, null);
      for (const p of fx.area) pendingClear.set(k(p), p);
      pendingSource = 'special';
    } else if (a.special === 'wild' || b.special === 'wild') {
      const wildPos = a.special === 'wild' ? to : from;
      const otherPiece = a.special === 'wild' ? b : a;
      const fx = fireSpecial(this.board, 'wild', wildPos, cascade, otherPiece.emoji);
      events.push(...fx.events);
      this.board.setPiece(wildPos, null);
      for (const p of fx.area) pendingClear.set(k(p), p);
      pendingSource = 'special';
    } else if (a.special || b.special) {
      // single special swapped with a normal piece → fires at its new location
      const sp = a.special ? to : from;
      const kind = (a.special ?? b.special)!;
      const fx = fireSpecial(this.board, kind, sp, cascade);
      events.push(...fx.events);
      this.board.setPiece(sp, null);
      for (const p of fx.area) pendingClear.set(k(p), p);
      pendingSource = 'special';
      // the other half of the swap might also form a match — include it
      this.collectMatches(findMatches(this.board, a.special ? from : to), cascade, events, pendingClear, res);
    } else {
      // normal swap: at least one match exists (isLegal guaranteed it)
      const groups = findMatches(this.board, to).length ? findMatches(this.board, to) : findMatches(this.board, from);
      this.collectMatches(groups, cascade, events, pendingClear, res);
    }

    this.runCascade(pendingClear, pendingSource, cascade, events, res);
    return res;
  }

  /**
   * Boosters — out-of-band actions that do not consume a move.
   *  hammer  : destroy one cell (piece, or 1 hit on blocker / dust / cage)
   *  shuffle : reshuffle normal pieces
   *  rocket/bomb/wild : place a special on a random normal piece (pre-level boosters)
   */
  applyBooster(kind: 'hammer' | 'shuffle' | 'rocket_h' | 'rocket_v' | 'bomb' | 'wild', at?: Pos): ResolveResult {
    const events: ResolveEvent[] = [];
    const res = this.newResult(events);
    events.push({ type: 'booster', kind, at });
    if (kind === 'shuffle') { this.shuffle(); events.push({ type: 'shuffle', reason: 'no_moves' }); return res; }
    if (kind === 'hammer') {
      if (!at || !this.board.inBounds(at) || this.board.cell(at).hole) return res;
      const pending = new Map<string, Pos>([[k(at), at]]);
      events.push({ type: 'special_fire', kind: 'bomb', at, area: [at], cascade: 0, magnitude: 0.25 });
      this.runCascade(pending, 'special', 0, events, res);
      return res;
    }
    // place a special on a random normal, movable piece
    const spots: Pos[] = [];
    for (let r = 0; r < this.board.rows; r++) for (let c = 0; c < this.board.cols; c++) {
      const p = { col: c, row: r }; const pc = this.board.pieceAt(p);
      if (pc && !pc.special && this.board.isMovable(p)) spots.push(p);
    }
    if (!spots.length) return res;
    const spot = this.board.rng.pick(spots);
    const piece = this.board.makePiece(kind === 'bomb' ? 'sp_bomb' : kind === 'wild' ? 'sp_wild' : 'sp_rocket', kind);
    this.board.setPiece(spot, piece);
    events.push({ type: 'spawn_special', at: spot, piece, cascade: 0 });
    return res;
  }

  /** Fire a special already on the board by tapping it (tap-to-activate, Royal Match style). Consumes a move. */
  tapSpecial(at: Pos): ResolveResult | null {
    const piece = this.board.pieceAt(at);
    if (!piece?.special || piece.special === 'wild') return null;
    const events: ResolveEvent[] = [];
    const res = this.newResult(events);
    const fx = fireSpecial(this.board, piece.special, at, 0);
    events.push(...fx.events);
    this.board.setPiece(at, null);
    const pending = new Map<string, Pos>();
    for (const p of fx.area) pending.set(k(p), p);
    this.runCascade(pending, 'special', 0, events, res);
    return res;
  }

  private runCascade(pendingClear: Map<string, Pos>, pendingSource: 'match' | 'special' | 'apex', cascade: number, events: ResolveEvent[], res: ResolveResult): void {
    while (pendingClear.size > 0) {
      // Chain reaction: any special inside the clear set detonates too
      this.chainSpecials(pendingClear, cascade, events);

      // Matches damage blockers ADJACENT to matched cells (Candy Crush frosting rule);
      // specials damage blockers INSIDE their area (already in pendingClear).
      if (pendingSource === 'match') {
        for (const p of [...pendingClear.values()]) {
          for (const n of [{ col: p.col + 1, row: p.row }, { col: p.col - 1, row: p.row }, { col: p.col, row: p.row + 1 }, { col: p.col, row: p.row - 1 }]) {
            if (this.board.inBounds(n) && this.board.cell(n).blocker && !pendingClear.has(k(n))) pendingClear.set(k(n), n);
          }
        }
      }

      // Clear pieces, hit blockers, break cages, clear dust
      const cleared: Array<{ pos: Pos; piece: Piece }> = [];
      for (const p of pendingClear.values()) {
        const cell = this.board.cell(p);
        if (cell.hole) continue;
        if (cell.blocker) {
          cell.blocker.hp -= 1;
          events.push({ type: 'blocker_hit', at: p, kind: cell.blocker.kind, remaining: cell.blocker.hp, cascade });
          if (cell.blocker.hp <= 0) { cell.blocker = null; res.blockersCleared++; }
          continue;
        }
        if (cell.caged) {
          // cage absorbs the hit; the piece inside survives
          cell.caged = false; res.cagesBroken++;
          events.push({ type: 'cage_break', at: p, cascade });
          continue;
        }
        if (cell.dust > 0) {
          cell.dust -= 1; res.dustCleared++;
          events.push({ type: 'dust_clear', at: p, remaining: cell.dust, cascade });
        }
        if (cell.piece) {
          cleared.push({ pos: p, piece: cell.piece });
          res.collected[cell.piece.emoji] = (res.collected[cell.piece.emoji] ?? 0) + 1;
          cell.piece = null;
        }
      }
      if (cleared.length) events.push({ type: 'clear', cells: cleared, cascade, source: pendingSource });

      // Score
      const combo = 1 + cascade * this.rules.comboStep;
      const delta = Math.round(cleared.length * this.rules.basePieceScore * combo);
      res.scoreDelta += delta;
      if (delta > 0) events.push({ type: 'score', delta, total: res.scoreDelta, combo: cascade + 1, cascade });

      // Place evolutions / specials queued by collectMatches
      this.placeQueued(events, cascade);

      // Gravity + refill
      this.gravity(cascade, events);
      this.refill(cascade, events);

      // Next cascade
      cascade++;
      pendingClear = new Map();
      pendingSource = 'match';
      this.collectMatches(findMatches(this.board), cascade, events, pendingClear, res);
    }

    res.cascades = cascade;
    for (const [emoji, n] of Object.entries(res.collected)) events.push({ type: 'collect', emoji, count: n, cascade });

    // Dead board → shuffle
    if (findAllMoves(this.board).length === 0) {
      this.shuffle();
      events.push({ type: 'shuffle', reason: 'no_moves' });
    }
  }

  // Queue of pieces to place after clearing (so they're not wiped by the same clear)
  private queued: Array<{ at: Pos; piece: Piece; kind: 'evolve' | 'special'; from: string }> = [];

  private collectMatches(groups: MatchGroup[], cascade: number, events: ResolveEvent[], pending: Map<string, Pos>, res: ResolveResult): void {
    for (const g of groups) {
      events.push({ type: 'match', group: g, cascade });
      for (const p of g.cells) pending.set(k(p), p);

      const next = this.rules.nextTier[g.emoji];
      // 1. Evolution (all shapes except line5 evolve; apex → burst)
      if (g.shape !== 'line5') {
        if (next) {
          const piece = this.board.makePiece(next);
          this.queued.push({ at: g.origin, piece, kind: 'evolve', from: g.emoji });
          res.collected[next] = (res.collected[next] ?? 0) + 1; // evolving INTO an emoji counts as collecting it
        } else {
          const area = areaBomb(this.board, g.origin, 1);
          events.push({ type: 'apex_burst', at: g.origin, emoji: g.emoji, area, cascade });
          for (const p of area) pending.set(k(p), p);
        }
      }
      // 2. Specials
      let special: SpecialKind | undefined;
      if (g.shape === 'line4') special = g.horizontal ? 'rocket_v' : 'rocket_h';
      else if (g.shape === 'line5') special = 'wild';
      else if (g.shape === 'L' || g.shape === 'T' || g.shape === 'cross') special = 'bomb';
      if (special) {
        // special goes to an adjacent cell of the origin inside the group so evolution + special can coexist
        const spot = g.shape === 'line5' || !next ? g.origin : (g.cells.find((c) => !eq(c, g.origin)) ?? g.origin);
        const piece = this.board.makePiece(special === 'bomb' ? 'sp_bomb' : special === 'wild' ? 'sp_wild' : 'sp_rocket', special);
        this.queued.push({ at: spot, piece, kind: 'special', from: g.emoji });
      }
    }
  }

  private placeQueued(events: ResolveEvent[], cascade: number): void {
    for (const q of this.queued) {
      if (!this.board.isOpen(q.at)) continue;
      this.board.setPiece(q.at, q.piece);
      if (q.kind === 'evolve') events.push({ type: 'evolve', at: q.at, from: q.from, to: q.piece.emoji, piece: q.piece, cascade });
      else events.push({ type: 'spawn_special', at: q.at, piece: q.piece, cascade });
    }
    this.queued = [];
  }

  /** Specials caught inside a blast detonate recursively (Candy Crush chain). */
  private chainSpecials(pending: Map<string, Pos>, cascade: number, events: ResolveEvent[]): void {
    let grew = true;
    const fired = new Set<string>();
    while (grew) {
      grew = false;
      for (const p of [...pending.values()]) {
        const piece = this.board.pieceAt(p);
        if (!piece?.special || fired.has(k(p))) continue;
        fired.add(k(p));
        const fx = fireSpecial(this.board, piece.special, p, cascade);
        events.push(...fx.events);
        for (const q of fx.area) if (!pending.has(k(q))) { pending.set(k(q), q); grew = true; }
      }
    }
  }

  private gravity(cascade: number, events: ResolveEvent[]): void {
    const falls: Array<{ from: Pos; to: Pos; uid: number }> = [];
    for (let col = 0; col < this.board.cols; col++) {
      // process from bottom up; blockers, holes and cages act as floors
      let write = this.board.rows - 1;
      for (let row = this.board.rows - 1; row >= 0; row--) {
        const p = { col, row };
        const cell = this.board.cell(p);
        if (cell.blocker || cell.hole || cell.caged) { write = row - 1; continue; }
        const piece = cell.piece;
        if (!piece) continue;
        if (write !== row) {
          this.board.setPiece({ col, row: write }, piece);
          this.board.setPiece(p, null);
          falls.push({ from: p, to: { col, row: write }, uid: piece.uid });
        }
        write--;
      }
    }
    if (falls.length) events.push({ type: 'gravity', falls, cascade });
  }

  private refill(cascade: number, events: ResolveEvent[]): void {
    const spawns: Array<{ at: Pos; piece: Piece; fromRow: number }> = [];
    for (let col = 0; col < this.board.cols; col++) {
      let above = 0;
      for (let row = 0; row < this.board.rows; row++) {
        const p = { col, row };
        const cell = this.board.cell(p);
        if (cell.blocker || cell.hole || cell.caged) { above = 0; continue; }
        if (cell.piece) continue;
        const piece = this.board.spawnRandom();
        this.board.setPiece(p, piece);
        spawns.push({ at: p, piece, fromRow: -1 - above });
        above++;
      }
    }
    if (spawns.length) events.push({ type: 'refill', spawns, cascade });
  }

  private shuffle(): void {
    // reshuffle normal pieces until a move exists and no immediate match (max 50 tries)
    const pieces: Piece[] = []; const spots: Pos[] = [];
    for (let r = 0; r < this.board.rows; r++) for (let c = 0; c < this.board.cols; c++) {
      const p = { col: c, row: r }; const piece = this.board.pieceAt(p);
      if (piece && !piece.special && this.board.isMovable(p)) { pieces.push(piece); spots.push(p); }
    }
    for (let i = 0; i < 50; i++) {
      this.board.rng.shuffle(pieces);
      spots.forEach((s, idx) => this.board.setPiece(s, pieces[idx]!));
      if (findMatches(this.board).length === 0 && findAllMoves(this.board).length > 0) return;
    }
  }
}
