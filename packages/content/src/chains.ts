/**
 * Evolution chains — what a 3-match of identical pieces turns into.
 * Board verb: EVOLVE (identical → next tier). Kept short (max 5 tiers) so a
 * whole chain is reachable inside a single 25-move level.
 *
 * Each chain is an ordered list of emoji ids. Matching 3× chain[i] yields chain[i+1].
 * Matching 3× the LAST element triggers a 3×3 "apex burst" instead (handled by core).
 */
export const CHAINS: Record<string, string[]> = {
  water:  ['water', 'wave', 'rain', 'storm', 'rainbow'],
  fire:   ['fire', 'volcano', 'comet', 'sun_face'],
  wind:   ['wind', 'steam', 'cloud', 'tornado'],
  rock:   ['rock', 'mountain', 'planet', 'earth'],
  bolt:   ['bolt', 'storm', 'glowstar', 'galaxy'],
  snow:   ['snow', 'ice', 'snowcloud', 'fullmoon'],
  seed:   ['seed', 'herb', 'tree', 'forest', 'clover'],
  egg:    ['egg', 'chick', 'bird', 'eagle'],
  bug:    ['bug', 'butterfly', 'blossom', 'rose'],
  fish:   ['fish', 'dolphin', 'whale'],
  wheat:  ['wheat', 'bread', 'pizza', 'cake'],
  milk:   ['milk', 'cheese', 'icecream', 'sushi'],
  happy:  ['happy', 'love', 'bittersweet', 'calm'],
  sad:    ['sad', 'pouty', 'calm'],
  angry:  ['angry', 'hot', 'volcano'],
  scared: ['scared', 'cold', 'ice'],
  sleepy: ['sleepy', 'moon', 'night', 'fullmoon'],
  log:    ['log', 'hammer', 'house', 'castle'],
  box:    ['box', 'gift', 'crown'],
  star:   ['star', 'glowstar', 'planet', 'galaxy'],
};

/** Map emoji id → next tier id (or undefined if apex). */
export const NEXT_TIER: Readonly<Record<string, string | undefined>> = (() => {
  const out: Record<string, string | undefined> = {};
  for (const chain of Object.values(CHAINS)) {
    for (let i = 0; i < chain.length; i++) {
      const cur = chain[i]!;
      // first chain that defines a successor wins (chains may share tail nodes)
      if (!(cur in out)) out[cur] = chain[i + 1];
    }
  }
  return Object.freeze(out);
})();
