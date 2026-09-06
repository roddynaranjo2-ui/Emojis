/**
 * Auto-tuner — adjusts each level's move budget until GreedyBot's win-rate lands in
 * the target band, then writes packages/content/src/tuning.ts.
 *
 * Target bands (bot is stronger than a typical human, so its band sits above the human 35–55 %):
 *   levels 1–3        : ≥ 0.8  (confidence levels)
 *   easy              : 0.65–0.85
 *   normal            : 0.5–0.7
 *   hard              : 0.35–0.55
 *   boss              : 0.3–0.5
 *
 *   npm run tune -- [games=24]
 */
import { writeFileSync } from 'node:fs';
import { simulateLevel, DEFAULT_RULES } from '../packages/core/src/index';
import { LEVELS, NEXT_TIER, EVENT_LEVELS, EVENT_BY_ID, eventNextTier } from '../packages/content/src/index';
import { TUNING, EVENT_TUNING } from '../packages/content/src/tuning';

const games = Number(process.argv[2] ?? 24);
const only = process.argv[3]; // 'events' | 'levels' | undefined (both)
const rules = { ...DEFAULT_RULES, nextTier: NEXT_TIER };
const band = (lv: typeof LEVELS[number]): [number, number] =>
  lv.number <= 3 ? [0.8, 1.01] : lv.difficulty === 'easy' ? [0.65, 0.85] : lv.difficulty === 'normal' ? [0.5, 0.7] : lv.difficulty === 'hard' ? [0.35, 0.55] : [0.3, 0.5];

const tuning: Record<string, number> = { ...TUNING };
const evTuning: Record<string, number> = { ...EVENT_TUNING };
let unsolved = 0;
const todo = [...(only === 'events' ? [] : LEVELS), ...(only === 'levels' ? [] : EVENT_LEVELS)];
for (const lv of todo) {
  const r = lv.event ? { ...rules, nextTier: eventNextTier(EVENT_BY_ID[lv.event]) } : rules;
  const [lo, hi] = band(lv);
  let moves = lv.moves; let best = { moves, dist: Infinity, rate: 0 };
  for (let iter = 0; iter < 10; iter++) {
    const s = simulateLevel({ ...lv, moves }, r, games);
    const dist = s.winRate < lo ? lo - s.winRate : s.winRate > hi ? s.winRate - hi : 0;
    if (dist < best.dist) best = { moves, dist, rate: s.winRate };
    if (dist === 0) break;
    // step size proportional to distance; never below 12 or above 50 moves
    const step = Math.max(1, Math.round(dist * 12));
    moves = Math.min(50, Math.max(12, s.winRate < lo ? moves + step : moves - step));
    if (moves === best.moves && iter > 0) moves += s.winRate < lo ? 1 : -1;
  }
  (lv.event ? evTuning : tuning)[lv.id] = best.moves;
  if (best.dist > 0) unsolved++;
  console.log(`${lv.id.padEnd(16)} ${lv.difficulty.padEnd(6)} moves ${String(lv.moves).padStart(2)} → ${String(best.moves).padStart(2)}   win ${(best.rate * 100).toFixed(0).padStart(3)}%  ${best.dist === 0 ? '✅' : '≈'}`);
}
const src = `/** Per-level move budgets produced by tools/tune.ts (GreedyBot × ${games}). Do not edit by hand — run \`npm run tune\`. */\nexport const TUNING: Record<string, number> = ${JSON.stringify(tuning, null, 2)};\n\n/** Move budgets for vault-event stages (written by tools/tune.ts). */\nexport const EVENT_TUNING: Record<string, number> = ${JSON.stringify(evTuning, null, 2)};\n`;
writeFileSync(new URL('../packages/content/src/tuning.ts', import.meta.url), src);
console.log(`\n📝 wrote tuning.ts — ${todo.length - unsolved}/${todo.length} exactly in band, ${unsolved} nearest`);
