/**
 * Vault events — rotating weekly mini-sagas that unlock the 48 vault emojis.
 *
 * Each event owns its own evolution chains (they start from launch base pieces and
 * climb into vault emojis), 8 stages with rising difficulty, and milestone rewards.
 * Exactly one event is live at a time; the schedule is derived from the calendar so
 * every player sees the same event in the same week (no server needed).
 */
import { NEXT_TIER } from './chains';
import { EMOJI_BY_ID, VAULT_EMOJIS } from './emojis';
import type { LevelDef, Objective } from './levels';

export type EventId = 'emotions2' | 'festive' | 'mythic' | 'arcane';

export interface EventDef {
  id: EventId;
  glyph: string;
  name: string;
  tagline: string;
  palette: [string, string];
  /** music theme (world index reused by MusicEngine) */
  theme: number;
  /** event-only evolution chains; the first id of each chain must be a launch base piece */
  chains: string[][];
  /** base pieces that spawn (5 kinds) */
  pool: string[];
  /** milestone rewards by stages cleared */
  milestones: Array<{ stages: number; coins: number; booster?: 'hammer' | 'shuffle' | 'rocket' | 'bomb' | 'wild' }>;
}

export const EVENTS: EventDef[] = [
  {
    id: 'emotions2', glyph: '🎭', name: 'Masquerade', tagline: 'Every face hides another', palette: ['#F7B7FF', '#7C3AED'], theme: 6,
    chains: [
      ['happy', 'cool', 'starstruck', 'party'],
      ['sad', 'heartbroken', 'woozy', 'mindblown'],
      ['scared', 'flushed', 'sick'],
      ['sleepy', 'eyeroll', 'thinking', 'angel'],
      ['angry', 'devil'],
    ],
    pool: ['happy', 'sad', 'scared', 'sleepy', 'angry'],
    milestones: [{ stages: 2, coins: 80 }, { stages: 4, coins: 120, booster: 'rocket' }, { stages: 6, coins: 160, booster: 'bomb' }, { stages: 8, coins: 300, booster: 'wild' }],
  },
  {
    id: 'festive', glyph: '🎃', name: 'Fiesta', tagline: 'Light the lanterns, cut the cake', palette: ['#FFD166', '#EF476F'], theme: 1,
    chains: [
      ['happy', 'balloon', 'confetti', 'birthday', 'trophy'],
      ['box', 'heartgift', 'fireworks'],
      ['seed', 'pumpkin', 'xmastree'],
      ['snow', 'snowman', 'ghost'],
      ['fire', 'sparkler', 'lantern'],
    ],
    pool: ['happy', 'box', 'seed', 'snow', 'fire'],
    milestones: [{ stages: 2, coins: 80 }, { stages: 4, coins: 120, booster: 'hammer' }, { stages: 6, coins: 160, booster: 'rocket' }, { stages: 8, coins: 300, booster: 'wild' }],
  },
  {
    id: 'mythic', glyph: '🐉', name: 'Legends', tagline: 'Old tales wake up hungry', palette: ['#FF8C42', '#6A040F'], theme: 3,
    chains: [
      ['egg', 'elf', 'fairy', 'unicorn', 'phoenix'],
      ['fish', 'mermaid', 'genie'],
      ['rock', 'troll', 'trex', 'dragon'],
      ['sleepy', 'zombie', 'vampire'],
      ['star', 'wizard'],
    ],
    pool: ['egg', 'fish', 'rock', 'sleepy', 'star'],
    milestones: [{ stages: 2, coins: 100 }, { stages: 4, coins: 140, booster: 'bomb' }, { stages: 6, coins: 180, booster: 'bomb' }, { stages: 8, coins: 350, booster: 'wild' }],
  },
  {
    id: 'arcane', glyph: '🔮', name: 'Secrets', tagline: 'What the universe whispers', palette: ['#4CC9F0', '#3A0CA3'], theme: 4,
    chains: [
      ['water', 'alembic', 'crystal', 'infinity'],
      ['log', 'scroll', 'oldkey', 'hourglass'],
      ['rock', 'gem', 'atom', 'eye'],
      ['star', 'nazar', 'yinyang', 'dna'],
      ['bolt', 'storm'],
    ],
    pool: ['water', 'log', 'rock', 'star', 'bolt'],
    milestones: [{ stages: 2, coins: 100 }, { stages: 4, coins: 150, booster: 'rocket' }, { stages: 6, coins: 200, booster: 'bomb' }, { stages: 8, coins: 400, booster: 'wild' }],
  },
];

export const EVENT_BY_ID: Readonly<Record<EventId, EventDef>> = Object.freeze(Object.fromEntries(EVENTS.map((e) => [e.id, e])) as Record<EventId, EventDef>);

/** next-tier map for an event: launch chains + event chains (event chains win on collision). */
export function eventNextTier(ev: EventDef): Record<string, string | undefined> {
  const out: Record<string, string | undefined> = { ...NEXT_TIER };
  for (const chain of ev.chains) for (let i = 0; i < chain.length; i++) out[chain[i]!] = chain[i + 1];
  return out;
}

const STAGE_NAMES: Record<EventId, string[]> = {
  emotions2: ['Warm Up', 'Cool Down', 'Eye Roll', 'Star-struck', 'Heartbreak', 'Devil\'s Deal', 'Halo', 'The Party'],
  festive:   ['Balloons', 'Confetti', 'Sparklers', 'Pumpkin Patch', 'Snow Day', 'Gift Wrap', 'Fireworks', 'The Trophy'],
  mythic:    ['Elf Woods', 'Fairy Ring', 'Troll Bridge', 'Mermaid Cove', 'Graveyard', 'Wizard Tower', 'Unicorn Meadow', 'The Dragon'],
  arcane:    ['Alembic', 'Old Scroll', 'Raw Gem', 'Nazar', 'Crystal Ball', 'Hourglass', 'Atom', 'The Eye'],
};

/** Deterministic layout: a few rocks in the middle; later stages add ice / dust. */
function eventLayout(stage: number, cols: number, rows: number, seed: number): string[] | undefined {
  if (stage <= 2) return undefined;
  let s = seed >>> 0;
  const r = () => { s = (s + 0x6d2b79f5) >>> 0; let t = Math.imul(s ^ (s >>> 15), s | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const g = Array.from({ length: rows }, () => Array.from({ length: cols }, () => '.'));
  const put = (ch: string, n: number) => { let k = 0, guard = 0; while (k < n && guard++ < 300) { const c = 1 + Math.floor(r() * (cols - 2)), rw = 1 + Math.floor(r() * (rows - 2)); if (g[rw]![c] === '.') { g[rw]![c] = ch; k++; } } };
  put('#', Math.min(4, stage - 1));
  if (stage >= 5) put('I', 2);
  if (stage >= 7) put('J', 4);
  return g.map((row) => row.join(''));
}

function makeStage(ev: EventDef, stage: number): LevelDef {
  const seed = 900_000 + EVENTS.indexOf(ev) * 1000 + stage * 131;
  const nt = eventNextTier(ev);
  // target: walk the chains so every vault emoji appears as a goal at least once across 8 stages
  const goals = ev.chains.flatMap((c) => c.slice(1)).filter((id) => EMOJI_BY_ID[id]?.status === 'vault');
  const depthOf = (id: string) => { for (const base of ev.pool) { let cur: string | undefined = base, d = 0; while (cur && d < 6) { if (cur === id) return d; cur = nt[cur]; d++; } } return 1; };
  // order goals shallow → deep; distribute round-robin over the 8 stages so each stage gets 1–2 distinct goals,
  // depth rising with the stage. Boss (8) always carries the deepest goal.
  const ordered = [...goals].sort((a, b) => depthOf(a) - depthOf(b) || a.localeCompare(b));
  const buckets: string[][] = Array.from({ length: 8 }, () => []);
  ordered.forEach((id, i) => buckets[Math.min(7, Math.floor((i / ordered.length) * 8))]!.push(id));
  // pull from neighbours so no stage is empty
  for (let i = 0; i < 8; i++) if (!buckets[i]!.length) { const src = buckets.slice(0, i).reverse().find((b) => b.length > 1) ?? buckets.slice(i + 1).find((b) => b.length > 1); if (src) buckets[i]!.push(src.pop()!); }
  const mine = buckets[stage - 1]!.slice(0, 2);
  const objectives: Objective[] = mine.map((id) => {
    const d = depthOf(id);
    return { type: 'collect', target: id, amount: d <= 1 ? 5 + stage : d === 2 ? (stage >= 6 ? 3 : 2) : 1 };
  });
  if (!objectives.length) objectives.push({ type: 'collect', target: ordered[ordered.length - 1]!, amount: 1 });
  // Spawn pool: late stages spawn evolved pieces directly so deep vault targets are reachable
  // (depth-3 goals need 27 base pieces each otherwise). We pick, per goal, the chain node that
  // leaves the target ≤ 2 evolutions away, and keep 5 kinds total.
  const spawnPool = [...ev.pool];
  for (const o of objectives) {
    const chain = ev.chains.find((c) => c.includes(o.target!));
    if (!chain) continue;
    const ti = chain.indexOf(o.target!);
    const want = chain[Math.max(0, ti - 2)]!;
    if (want !== chain[0] && !spawnPool.includes(want)) { const bi = spawnPool.indexOf(chain[0]!); if (bi >= 0) spawnPool[bi] = want; else spawnPool.push(want); }
  }
  // amounts recomputed against the effective pool depth
  const depthIn = (id: string) => { for (const base of spawnPool) { let cur: string | undefined = base, d = 0; while (cur && d < 6) { if (cur === id) return d; cur = nt[cur]; d++; } } return 1; };
  for (const o of objectives) { const d = depthIn(o.target!); o.amount = d <= 1 ? 5 + stage : d === 2 ? (objectives.length > 1 ? 1 : 2) : 1; }
  const cols = stage === 8 ? 8 : 7, rows = stage === 8 ? 9 : 8;
  const difficulty: LevelDef['difficulty'] = stage === 8 ? 'boss' : stage >= 6 ? 'hard' : stage >= 3 ? 'normal' : 'easy';
  const s1 = 3500 + stage * 500;
  return {
    id: `ev-${ev.id}-${stage}`, world: 0, index: stage, number: 1000 + EVENTS.indexOf(ev) * 10 + stage,
    name: STAGE_NAMES[ev.id][stage - 1]!, glyph: EMOJI_BY_ID[objectives[0]!.target!]?.glyph ?? ev.glyph,
    cols, rows, moves: EVENT_TUNING[`ev-${ev.id}-${stage}`] ?? (26 + stage * 2), spawnPool, seed, objectives,
    stars: [s1, Math.round(s1 * 1.7), Math.round(s1 * 2.6)],
    layout: eventLayout(stage, cols, rows, seed), difficulty,
    reward: { coins: 40 + stage * 10, booster: stage === 4 ? 'shuffle' : stage === 8 ? 'bomb' : undefined },
    event: ev.id,
  };
}

import { EVENT_TUNING } from './tuning';

export const EVENT_LEVELS: LevelDef[] = EVENTS.flatMap((ev) => Array.from({ length: 8 }, (_, i) => makeStage(ev, i + 1)));
export const eventLevels = (id: EventId): LevelDef[] => EVENT_LEVELS.filter((l) => l.event === id);

/** One event per ISO week, rotating through EVENTS. */
export const EVENT_WEEK_MS = 7 * 86_400_000;
export function liveEvent(now = Date.now()): { event: EventDef; endsAt: number } {
  const week = Math.floor(now / EVENT_WEEK_MS);
  const event = EVENTS[week % EVENTS.length]!;
  return { event, endsAt: (week + 1) * EVENT_WEEK_MS };
}
/** The event in which a vault emoji can be earned (for dex hints). */
export function eventForEmoji(id: string): EventDef | undefined { return EVENTS.find((e) => e.chains.some((c) => c.includes(id))); }
/** validator helper */
export const VAULT_IDS_CHECK = (): string[] => VAULT_EMOJIS.map((e) => e.id);
