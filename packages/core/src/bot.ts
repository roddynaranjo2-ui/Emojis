import { LevelRunner, type LevelConfig } from './level';
import { Resolver, type RulesConfig } from './resolver';
import { findAllMoves } from './match';
import type { Move } from './types';

/**
 * GreedyBot — plays each move by simulating every legal move on a cloned board
 * and picking the highest score gain. Used by CI to keep every level inside the
 * "positive frustration" band (35–55 % win rate for normal levels).
 */
export class GreedyBot {
  constructor(private readonly rules: RulesConfig) {}

  pick(runner: LevelRunner): Move | undefined {
    const moves = findAllMoves(runner.board);
    if (!moves.length) return undefined;
    let best: Move | undefined; let bestScore = -1;
    for (const m of moves) {
      const clone = runner.board.clone();
      const r = new Resolver(clone, this.rules).applyMove(m);
      // reward objective progress heavily
      let s = r.scoreDelta;
      for (const p of runner.progress) if (p.objective.target && r.collected[p.objective.target]) s += 5000 * r.collected[p.objective.target]!;
      for (const p of runner.progress) {
        if (p.done) continue;
        if (p.objective.type === 'clear_blockers') s += r.blockersCleared * 3000;
        if (p.objective.type === 'clear_dust') s += r.dustCleared * 2500;
        if (p.objective.type === 'break_cages') s += r.cagesBroken * 3000;
      }
      if (s > bestScore) { bestScore = s; best = m; }
    }
    return best;
  }
}

export interface SimSummary { games: number; wins: number; winRate: number; avgScore: number; avgMovesUsed: number; maxCascade: number }

export function simulateLevel(cfg: LevelConfig, rules: RulesConfig, games = 200): SimSummary {
  const bot = new GreedyBot(rules);
  let wins = 0, score = 0, movesUsed = 0, maxCascade = 0;
  for (let g = 0; g < games; g++) {
    const runner = new LevelRunner({ ...cfg, seed: cfg.seed + g * 7919 }, rules);
    while (runner.status === 'playing') {
      const m = bot.pick(runner);
      if (!m) break;
      runner.tryMove(m);
    }
    if (runner.status === 'won') wins++;
    score += runner.score;
    movesUsed += cfg.moves - runner.movesLeft;
    maxCascade = Math.max(maxCascade, runner.maxCascade);
  }
  return { games, wins, winRate: wins / games, avgScore: Math.round(score / games), avgMovesUsed: +(movesUsed / games).toFixed(1), maxCascade };
}
