/**
 * Balance simulator — GreedyBot plays every level N times and reports win rate.
 * Human target band ≈ 35–55 %; GreedyBot is a stronger-than-average player, so the
 * accepted bot band is [0.30, 0.90] for normal levels and [0.15, 0.85] for bosses.
 * Levels 1–3 are allowed to be ~100 % (confidence-building by design).
 *
 *   npm run sim -- [games=40] [world=all]
 *   CI_STRICT_BALANCE=1 fails the run when any level is out of band.
 */
import { simulateLevel, DEFAULT_RULES } from '../packages/core/src/index';
import { LEVELS, NEXT_TIER, EVENT_LEVELS, EVENT_BY_ID, eventNextTier } from '../packages/content/src/index';

const games = Number(process.argv[2] ?? 40);
const worldFilter = process.argv[3] ? Number(process.argv[3]) : undefined;
const rules = { ...DEFAULT_RULES, nextTier: NEXT_TIER };
const levels = [...LEVELS, ...EVENT_LEVELS].filter((l) => worldFilter === undefined || l.world === worldFilter);
const rulesFor = (l: typeof levels[number]) => (l.event ? { ...rules, nextTier: eventNextTier(EVENT_BY_ID[l.event]) } : rules);

let bad = 0;
const out: string[] = [];
const byWorld: Record<number, number[]> = {};
console.log(`🎲 GreedyBot × ${games} games on ${levels.length} levels\n`);
for (const lv of levels) {
  const s = simulateLevel(lv, rulesFor(lv), games);
  const isBoss = lv.difficulty === 'boss';
  const free = lv.number <= 3;
  const [lo, hi] = free ? [0.5, 1.01] : isBoss ? [0.15, 0.85] : [0.3, 0.9];
  const ok = s.winRate >= lo && s.winRate <= hi;
  if (!ok) bad++;
  (byWorld[lv.world] ??= []).push(s.winRate);
  out.push(`${lv.id.padEnd(16)} ${lv.difficulty.padEnd(6)} ${(s.winRate * 100).toFixed(0).padStart(4)}%  score ${String(s.avgScore).padStart(6)}  moves ${String(s.avgMovesUsed).padStart(5)}/${lv.moves}  ${ok ? '✅' : '⚠️'}`);
}
console.log(out.join('\n'));
console.log('\nworld  avg win%');
for (const [w, arr] of Object.entries(byWorld)) console.log(`  ${w}     ${(arr.reduce((a, b) => a + b, 0) / arr.length * 100).toFixed(0)}%`);
if (bad && process.env.CI_STRICT_BALANCE) { console.error(`\n❌ ${bad} level(s) out of balance band`); process.exit(1); }
console.log(bad ? `\n⚠️  ${bad} level(s) out of band` : '\n✅ all levels in band');
