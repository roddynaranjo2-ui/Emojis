/**
 * Level catalog — 7 emotional worlds × 20 levels = 140 levels.
 *
 * Levels are produced by a deterministic generator (same input → same level) so the
 * whole campaign is reviewable in code and simulated in CI. Design follows the
 * rhythm used by the top switchers (Royal Match / Candy Crush):
 *
 *   • difficulty is NOT linear — pattern per 5 levels: easy · easy · medium · hard · breather
 *   • every 5th level is an "echo" level (teaches / rewards a specific evolution)
 *   • level 10 = mid-boss, level 20 = world boss (bigger board, 2 objectives)
 *   • ONE new mechanic per world, introduced on its first level with a tutorial flag
 *   • first 3 levels of the game are practically impossible to lose (confidence first)
 */
export type ObjectiveType = 'collect' | 'score' | 'clear_blockers' | 'reach_tier' | 'clear_dust' | 'break_cages';

export interface Objective { type: ObjectiveType; target?: string; amount: number }

export type Mechanic = 'swap' | 'rocket' | 'bomb' | 'rock' | 'ice' | 'dust' | 'cage' | 'wild' | 'synergy' | 'holes';

export interface LevelDef {
  id: string;
  world: number;
  index: number;          // 1..20 within the world
  number: number;         // 1..140 global
  name: string;
  glyph: string;
  cols: number;
  rows: number;
  moves: number;
  spawnPool: string[];
  seed: number;
  objectives: Objective[];
  stars: [number, number, number];
  layout?: string[];      // '.', '#', 'I', 'J', 'K', 'C', 'X'
  /** difficulty tag shown on the map (Royal Match style) */
  difficulty: 'easy' | 'normal' | 'hard' | 'boss';
  /** mechanic introduced on this level → triggers a tutorial card */
  introduces?: Mechanic;
  /** rewards on first clear */
  reward: { coins: number; booster?: 'hammer' | 'shuffle' | 'rocket' | 'bomb' | 'wild' };
}

export interface WorldDef {
  id: number; glyph: string; name: string; mood: string; palette: [string, string];
  /** emoji families that spawn in this world (base pieces) */
  pool: string[];
  /** objective evolution targets available in this world */
  targets: string[];
  mechanic: Mechanic;
  bossGlyph: string;
}

export const WORLDS: WorldDef[] = [
  { id: 1, glyph: '😀', name: 'Joy',        mood: 'Everything begins with a smile', palette: ['#FFE29A', '#FFB86B'], pool: ['water', 'fire', 'seed', 'happy', 'star'],        targets: ['herb', 'wave', 'love'],           mechanic: 'rocket',  bossGlyph: '🌞' },
  { id: 2, glyph: '😢', name: 'Melancholy', mood: 'Rain makes the garden grow',     palette: ['#B8C6FF', '#8FA3E6'], pool: ['water', 'sad', 'seed', 'cloud', 'egg', 'star'],  targets: ['rain', 'pouty', 'herb'],          mechanic: 'rock',    bossGlyph: '⛈️' },
  { id: 3, glyph: '😡', name: 'Fury',       mood: 'Heat forges everything',         palette: ['#FF9A6B', '#E0523A'], pool: ['fire', 'angry', 'rock', 'wheat', 'egg', 'star'], targets: ['volcano', 'hot', 'bread'],        mechanic: 'ice',     bossGlyph: '🌋' },
  { id: 4, glyph: '😴', name: 'Dream',      mood: 'Night is full of stars',         palette: ['#6C63FF', '#2B2A5A'], pool: ['sleepy', 'star', 'moon', 'milk', 'bug', 'snow'], targets: ['glowstar', 'night', 'cheese'],    mechanic: 'dust',    bossGlyph: '🌕' },
  { id: 5, glyph: '😱', name: 'Fear',       mood: 'What hides in the fog?',         palette: ['#5E3A8C', '#1F1233'], pool: ['scared', 'snow', 'log', 'box', 'bolt', 'fish'],  targets: ['cold', 'hammer', 'ice'],          mechanic: 'cage',    bossGlyph: '👻' },
  { id: 6, glyph: '🥰', name: 'Love',       mood: 'Two smiles make a heart',        palette: ['#FFC0CB', '#FF7DA0'], pool: ['happy', 'bug', 'milk', 'egg', 'seed', 'water'],  targets: ['love', 'butterfly', 'cheese'],  mechanic: 'wild',    bossGlyph: '💝' },
  { id: 7, glyph: '🤯', name: 'Wonder',     mood: 'Everything connects',            palette: ['#8EF6E4', '#B388FF'], pool: ['star', 'fire', 'water', 'rock', 'bolt', 'wind'], targets: ['glowstar', 'planet', 'storm'],    mechanic: 'synergy', bossGlyph: '🌌' },
];

const NAMES: Record<number, string[]> = {
  1: ['First Sprout', 'Warm Up', 'Little Waves', 'Sunny Side', 'Echo: Herb', 'Grin & Grow', 'Bright Idea', 'Sparklers', 'Two by Two', 'Sun Face Rising', 'Petals', 'Fresh Air', 'Rising Tide', 'Kindling', 'Echo: Love', 'Big Smile', 'Golden Hour', 'Twinkle', 'Last Laugh', 'The Sun Itself'],
  2: ['Drizzle', 'Puddles', 'Grey Sky', 'Teardrop', 'Echo: Rain', 'Stone Path', 'Cold Nest', 'Rainy Day', 'Deep Blue', 'Rolling Thunder', 'Soft Sobs', 'Rock Garden', 'Long Night', 'Overcast', 'Echo: Pleading', 'Downpour', 'Boulders', 'Blue Hour', 'Heavy Heart', 'The Storm'],
  3: ['Spark', 'Embers', 'Hot Head', 'Frozen Fury', 'Echo: Volcano', 'Forge', 'Baker\'s Rage', 'Ice Wall', 'Boiling', 'Magma Chamber', 'Steam Vent', 'Flash Point', 'Cold Snap', 'Furnace', 'Echo: Bread', 'Eruption', 'Glacier', 'Wildfire', 'Meltdown', 'The Volcano'],
  4: ['Lullaby', 'Night Light', 'Dusty Attic', 'Moth Wings', 'Echo: Glow', 'Sweet Dreams', 'Milk & Moon', 'Cobwebs', 'Deep Sleep', 'Full Moon Rising', 'Hush', 'Starfall', 'Old Books', 'Snowy Night', 'Echo: Night', 'Dreamcatcher', 'Silver Dust', 'Nocturne', 'Midnight', 'The Full Moon'],
  5: ['Creak', 'Shiver', 'Locked Door', 'Frostbite', 'Echo: Cold', 'Cellar', 'Hammer Time', 'Cage Match', 'Boo', 'Haunted Hall', 'Cold Sweat', 'Padlocks', 'Thunderclap', 'Fish Bones', 'Echo: Hammer', 'Nightmare', 'Iron Bars', 'Lightning Strike', 'Panic', 'The Ghost'],
  6: ['Blush', 'First Date', 'Butterflies', 'Sweet Tooth', 'Echo: Love', 'Warm Hearts', 'Nest Egg', 'Soft Serve', 'Two Smiles', 'Heart Gift', 'Petal Rain', 'Honeymoon', 'Cuddles', 'Cocoa', 'Echo: Butterfly', 'Love Letter', 'Slow Dance', 'Milkshake', 'Forever', 'The Heart'],
  7: ['Spark of Genius', 'Orbit', 'Tempest', 'Bedrock', 'Echo: Planet', 'Supernova', 'Windstorm', 'Big Bang', 'Constellation', 'Event Horizon', 'Gravity', 'Nebula', 'Lightning Field', 'Meteor', 'Echo: Storm', 'Quasar', 'Solar Wind', 'Black Hole', 'Cosmos', 'The Galaxy'],
};

// difficulty rhythm per 5-level block: easy easy medium hard breather (5th = echo, lighter)
const RHYTHM: Array<'easy' | 'normal' | 'hard' | 'boss'> = ['easy', 'easy', 'normal', 'hard', 'easy'];

function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => { s = (s + 0x6d2b79f5) >>> 0; let t = Math.imul(s ^ (s >>> 15), s | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

function layoutFor(world: WorldDef, index: number, cols: number, rows: number, diff: LevelDef['difficulty'], r: () => number): string[] | undefined {
  const rowsArr: string[][] = Array.from({ length: rows }, () => Array.from({ length: cols }, () => '.'));
  const put = (ch: string, count: number, region: (c: number, rw: number) => boolean) => {
    let placed = 0, guard = 0;
    while (placed < count && guard++ < 500) {
      const c = Math.floor(r() * cols), rw = Math.floor(r() * rows);
      if (rowsArr[rw]![c] === '.' && region(c, rw)) { rowsArr[rw]![c] = ch; placed++; }
    }
  };
  const mid = (c: number, rw: number) => rw >= 1 && rw <= rows - 2 && c >= 1 && c <= cols - 2;
  const any = () => true;
  const intensity = diff === 'easy' ? 0.5 : diff === 'normal' ? 1 : diff === 'hard' ? 1.3 : 1.2;
  const unlocked = (m: string) => WORLDS.findIndex((w) => w.mechanic === m) < world.id - 1 || (world.mechanic === m && index >= 1);
  let used = false;

  if (unlocked('rock') && world.id >= 2) { put('#', Math.round(3 * intensity), mid); used = true; }
  if (unlocked('ice') && world.id >= 3 && index % 2 === 0) { put('I', Math.round(3 * intensity), mid); used = true; }
  if (unlocked('dust') && world.id >= 4) { put(index % 3 === 0 ? 'K' : 'J', Math.round(5 * intensity), any); used = true; }
  if (unlocked('cage') && world.id >= 5 && index % 2 === 1) { put('C', Math.round(3 * intensity), mid); used = true; }
  if (world.id >= 3 && index >= 8 && index % 4 === 0) {
    // corner holes → irregular board
    for (const [c, rw] of [[0, 0], [cols - 1, 0], [0, rows - 1], [cols - 1, rows - 1]] as Array<[number, number]>) rowsArr[rw]![c] = 'X';
    used = true;
  }
  if (diff === 'boss') { put('#', 2, mid); if (world.id >= 3) put('I', 2, mid); used = true; }
  return used ? rowsArr.map((row) => row.join('')) : undefined;
}

import { NEXT_TIER, CHAINS } from './chains';
import { TUNING } from './tuning';

/** How many tier steps separate `target` from the nearest spawn-pool piece (1 = direct 3-match). */
function tierDepth(target: string, pool: string[]): number {
  let best = 99;
  for (const base of pool) {
    let cur: string | undefined = base; let d = 0;
    while (cur && d < 6) { if (cur === target) { best = Math.min(best, d); break; } cur = NEXT_TIER[cur]; d++; }
  }
  return best === 99 ? 1 : best;
}
void CHAINS;

/** Objective amount that is fair for the depth: each depth multiplies pieces needed ×3. */
function fairAmount(target: string, pool: string[], scale: number, progression = 1): number {
  const depth = tierDepth(target, pool);
  // deep-tier targets (2+ evolutions away) are rare events: keep them small and do not let progression inflate them
  if (depth >= 3) return 1;
  if (depth === 2) return Math.max(1, Math.min(3, Math.round(2 * Math.min(scale, 1.2))));
  return Math.max(1, Math.round(8 * scale * progression));
}

function makeLevel(world: WorldDef, index: number): LevelDef {
  const number = (world.id - 1) * 20 + index;
  const seed = 700_000 + number * 7919;
  const r = rng(seed);
  const isBoss = index === 20, isMidBoss = index === 10, isEcho = index % 5 === 0 && !isBoss && !isMidBoss;
  const diff: LevelDef['difficulty'] = isBoss || isMidBoss ? 'boss' : RHYTHM[(index - 1) % 5]!;
  const firstThree = world.id === 1 && index <= 3;

  const cols = isBoss ? 8 : 7;
  const rows = isBoss ? 9 : 8;
  // fewer emoji kinds = easier (more matches). 4 kinds in the first levels, 5–6 later.
  const kinds = firstThree ? 4 : diff === 'boss' ? 6 : 5; // 6 kinds only on bosses — hard levels get pressure from layouts & amounts, not from match scarcity
  const spawnPool = world.pool.slice(0, Math.min(kinds, world.pool.length));

  const baseMoves = diff === 'easy' ? 26 : diff === 'normal' ? 25 : diff === 'hard' ? 24 : 32;
  const moves = TUNING[`w${world.id}-l${index}`] ?? (firstThree ? 30 : baseMoves - Math.min(2, Math.floor(world.id / 3)));

  const target = world.targets[(index - 1) % world.targets.length]!;
  const objectives: Objective[] = [];
  const scale = firstThree ? 0.5 : diff === 'easy' ? 0.8 : diff === 'normal' ? 1 : diff === 'hard' ? 1.2 : 1.3;

  const layout = firstThree ? undefined : layoutFor(world, index, cols, rows, diff, r);
  const count = (ch: string) => (layout ?? []).join('').split(ch).length - 1;
  const dustTotal = count('J') + count('K') * 2, cages = count('C'), blockers = count('#') + count('I');

  // objectives grow gently within a world so late "easy" levels are not trivial (progression factor 1.0 → 1.6)
  const progression = firstThree ? 1 : 1 + (index - 1) / 32;
  const collectAmt = (t: string, k = 1) => fairAmount(t, spawnPool, scale * k, progression);
  if (isEcho) objectives.push({ type: 'collect', target, amount: collectAmt(target, 0.8) });
  else {
    // primary: collect target; secondary: the world's mechanic obstacle when present
    objectives.push({ type: 'collect', target, amount: collectAmt(target) });
    if (dustTotal > 0 && world.id >= 4) objectives.push({ type: 'clear_dust', amount: Math.max(1, Math.ceil(dustTotal * 0.7)) });
    else if (cages > 0 && world.id >= 5) objectives.push({ type: 'break_cages', amount: cages });
    else if (blockers > 0 && world.id >= 2 && world.id <= 3) objectives.push({ type: 'clear_blockers', amount: Math.max(1, Math.ceil(blockers * 0.6)) });
  }
  if (isBoss || isMidBoss) {
    const second = world.targets[index % world.targets.length]!;
    objectives.push({ type: 'collect', target: second, amount: collectAmt(second, world.id >= 6 ? 0.45 : 0.6) });
  }

  const s1 = Math.round((3000 + world.id * 600) * scale);
  const stars: [number, number, number] = [s1, Math.round(s1 * 1.7), Math.round(s1 * 2.6)];

  let introduces: Mechanic | undefined;
  if (world.id === 1 && index === 1) introduces = 'swap';
  else if (world.id === 1 && index === 2) introduces = 'rocket';
  else if (world.id === 1 && index === 4) introduces = 'bomb';
  else if (index === 1 && world.id > 1) introduces = world.mechanic;
  else if (world.id === 3 && index === 8) introduces = 'holes';

  const reward: LevelDef['reward'] = { coins: isBoss ? 200 : isMidBoss ? 120 : diff === 'hard' ? 60 : 40 };
  if (isBoss) reward.booster = 'wild'; else if (isMidBoss) reward.booster = 'bomb'; else if (isEcho) reward.booster = 'hammer'; else if (index % 7 === 0) reward.booster = 'rocket';

  return {
    id: `w${world.id}-l${index}`, world: world.id, index, number,
    name: NAMES[world.id]![index - 1]!, glyph: isBoss ? world.bossGlyph : isEcho ? '🔊' : world.glyph,
    cols, rows, moves, spawnPool, seed, objectives, stars, layout, difficulty: diff, introduces, reward,
  };
}

export const LEVELS: LevelDef[] = WORLDS.flatMap((w) => Array.from({ length: 20 }, (_, i) => makeLevel(w, i + 1)));

export const LEVEL_BY_ID: Readonly<Record<string, LevelDef>> = Object.freeze(Object.fromEntries(LEVELS.map((l) => [l.id, l])));
export const levelByNumber = (n: number): LevelDef | undefined => LEVELS[n - 1];
