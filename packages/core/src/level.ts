import { Board } from './board';
import { Resolver, type RulesConfig } from './resolver';
import { findMatches, findAllMoves } from './match';
import type { Move, Pos, ResolveEvent, ResolveResult } from './types';

export interface LevelObjective { type: 'collect' | 'score' | 'clear_blockers' | 'reach_tier' | 'clear_dust' | 'break_cages'; target?: string; amount: number }

export interface LevelConfig {
  id: string;
  cols: number; rows: number; moves: number;
  spawnPool: string[]; seed: number;
  objectives: LevelObjective[];
  stars: [number, number, number];
  blockers?: Array<{ col: number; row: number; kind: 'rock' | 'ice' }>;
  layout?: string[];
  /** dynamic mercy: after N consecutive losses, bias objective emoji spawn by this factor */
  mercy?: { losses: number; bias: number };
}

export interface ObjectiveProgress { objective: LevelObjective; current: number; done: boolean }

export type LevelStatus = 'playing' | 'won' | 'lost';

/**
 * LevelRunner — one playable level: board + resolver + objectives + move budget.
 * Renderer calls `tryMove`, gets back the event log, replays it.
 */
export class LevelRunner {
  readonly board: Board;
  readonly resolver: Resolver;
  movesLeft: number;
  score = 0;
  status: LevelStatus = 'playing';
  readonly progress: ObjectiveProgress[];
  private readonly collected: Record<string, number> = {};
  private blockersCleared = 0;
  private dustCleared = 0;
  private cagesBroken = 0;
  maxCascade = 0;

  constructor(readonly cfg: LevelConfig, rules: RulesConfig, consecutiveLosses = 0) {
    this.board = new Board({ cols: cfg.cols, rows: cfg.rows, spawnPool: cfg.spawnPool, seed: cfg.seed, blockers: cfg.blockers, layout: cfg.layout });
    // Dynamic mercy (invisible): bias the base ingredient of the objective chain
    const mercy = cfg.mercy ?? { losses: 3, bias: 1.08 };
    if (consecutiveLosses >= mercy.losses) {
      for (const o of cfg.objectives) if (o.target) {
        const base = this.findBaseFor(o.target, rules);
        if (base) this.board.spawnBias[base] = Math.pow(mercy.bias, consecutiveLosses - mercy.losses + 1);
      }
    }
    this.board.fillNoMatches();
    this.ensurePlayable();
    this.resolver = new Resolver(this.board, rules);
    this.movesLeft = cfg.moves;
    this.progress = cfg.objectives.map((objective) => ({ objective, current: 0, done: false }));
  }

  private findBaseFor(target: string, rules: RulesConfig): string | undefined {
    for (const e of this.cfg.spawnPool) {
      let cur: string | undefined = e; let guard = 0;
      while (cur && guard++ < 8) { if (cur === target) return e; cur = rules.nextTier[cur]; }
    }
    return undefined;
  }

  private ensurePlayable(): void {
    let guard = 0;
    while ((findMatches(this.board).length > 0 || findAllMoves(this.board).length === 0) && guard++ < 100) {
      for (let r = 0; r < this.board.rows; r++) for (let c = 0; c < this.board.cols; c++) {
        if (this.board.isOpen({ col: c, row: r })) this.board.setPiece({ col: c, row: r }, null);
      }
      this.board.fillNoMatches();
    }
  }

  tryMove(move: Move): ResolveResult | null {
    if (this.status !== 'playing') return null;
    if (!this.resolver.isLegal(move)) return { events: [{ type: 'swap', a: move.from, b: move.to, valid: false }], scoreDelta: 0, cascades: 0, collected: {}, blockersCleared: 0, dustCleared: 0, cagesBroken: 0 };
    const res = this.resolver.applyMove(move);
    this.movesLeft--;
    this.absorb(res);
    return res;
  }

  /** Tap a bomb/rocket to fire it in place (consumes a move). */
  tapSpecial(at: Pos): ResolveResult | null {
    if (this.status !== 'playing') return null;
    const res = this.resolver.tapSpecial(at);
    if (!res) return null;
    this.movesLeft--;
    this.absorb(res);
    return res;
  }

  /** Boosters never consume a move. */
  useBooster(kind: 'hammer' | 'shuffle' | 'rocket_h' | 'rocket_v' | 'bomb' | 'wild', at?: Pos): ResolveResult | null {
    if (this.status !== 'playing') return null;
    const res = this.resolver.applyBooster(kind, at);
    this.absorb(res, false);
    return res;
  }

  /** Out-of-moves purchase: +N moves, level continues. */
  addMoves(n: number): void {
    if (this.status !== 'lost') return;
    this.movesLeft += n;
    this.status = 'playing';
  }

  private absorb(res: ResolveResult, checkEnd = true): void {
    this.score += res.scoreDelta;
    this.maxCascade = Math.max(this.maxCascade, res.cascades);
    for (const [e, n] of Object.entries(res.collected)) this.collected[e] = (this.collected[e] ?? 0) + n;
    this.blockersCleared += res.blockersCleared;
    this.dustCleared += res.dustCleared;
    this.cagesBroken += res.cagesBroken;
    this.updateProgress();
    const allDone = this.progress.every((p) => p.done);
    if (allDone) this.finish(true, res.events);
    else if (checkEnd && this.movesLeft <= 0) this.finish(false, res.events);
  }

  private updateProgress(): void {
    for (const p of this.progress) {
      const o = p.objective;
      switch (o.type) {
        case 'collect': case 'reach_tier': p.current = this.collected[o.target!] ?? 0; break;
        case 'score': p.current = this.score; break;
        case 'clear_blockers': p.current = this.blockersCleared; break;
        case 'clear_dust': p.current = this.dustCleared; break;
        case 'break_cages': p.current = this.cagesBroken; break;
      }
      p.done = p.current >= o.amount;
    }
  }

  stars(): 0 | 1 | 2 | 3 {
    const [s1, s2, s3] = this.cfg.stars;
    return this.score >= s3 ? 3 : this.score >= s2 ? 2 : this.score >= s1 ? 1 : 0;
  }

  private finish(won: boolean, events: ResolveEvent[]): void {
    this.status = won ? 'won' : 'lost';
    // bonus: leftover moves convert to score on win (Candy Crush "sugar crush")
    if (won) this.score += this.movesLeft * 100;
    events.push({ type: 'level_end', won, stars: won ? Math.max(1, this.stars()) as 1 | 2 | 3 : 0, score: this.score });
  }

  /** Is the player one move away from losing with an objective nearly complete? (offer +3 moves) */
  isNearMiss(): boolean {
    if (this.status !== 'lost') return false;
    return this.progress.every((p) => p.done || p.current / p.objective.amount >= 0.7);
  }

  /** Deterministic hint (does NOT consume the board RNG, so replays stay identical). */
  hint(): Move | undefined {
    const moves = findAllMoves(this.board);
    if (!moves.length) return undefined;
    const k = Math.abs(this.cfg.moves - this.movesLeft) % moves.length; // abs: movesLeft may exceed cfg.moves after addMoves()
    return moves[k];
  }
}
