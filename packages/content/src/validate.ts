/**
 * Content validator — runs in CI (`npm run validate:content`).
 * Guarantees the catalog invariants promised in the GDD:
 *  - exactly 144 emojis, 12 per family, unique ids & glyphs
 *  - 96 launch / 48 vault
 *  - every chain/recipe/level references an existing emoji
 *  - no recipe produces a vault emoji from launch-only ingredients... (allowed but flagged)
 *  - every launch non-base emoji is reachable (chain or recipe) from base pieces
 */
import { EMOJIS, EMOJI_BY_ID, FAMILIES } from './emojis';
import { CHAINS, NEXT_TIER } from './chains';
import { RECIPES, recipeKey } from './recipes';
import { LEVELS } from './levels';

const errors: string[] = [];
const warnings: string[] = [];
const warn = (m: string) => warnings.push(m);
const fail = (m: string) => errors.push(m);

// 1. counts
if (EMOJIS.length !== 144) fail(`Expected 144 emojis, got ${EMOJIS.length}`);
for (const f of FAMILIES) {
  const n = EMOJIS.filter((e) => e.family === f.id).length;
  if (n !== 12) fail(`Family ${f.id} has ${n} emojis, expected 12`);
}
const launch = EMOJIS.filter((e) => e.status === 'launch').length;
if (launch !== 96) fail(`Expected 96 launch emojis, got ${launch}`);

// 2. uniqueness
const ids = new Set<string>(); const glyphs = new Set<string>();
for (const e of EMOJIS) {
  if (ids.has(e.id)) fail(`Duplicate id ${e.id}`); ids.add(e.id);
  if (glyphs.has(e.glyph)) fail(`Duplicate glyph ${e.glyph} (${e.id})`); glyphs.add(e.glyph);
}

// 3. references
const ref = (id: string, where: string) => { if (!EMOJI_BY_ID[id]) fail(`${where}: unknown emoji '${id}'`); };
for (const [k, chain] of Object.entries(CHAINS)) {
  chain.forEach((id) => ref(id, `chain ${k}`));
  if (chain.length > 5) fail(`chain ${k} longer than 5 tiers`);
}
const seenRecipe = new Set<string>();
for (const rc of RECIPES) {
  ref(rc.a, 'recipe'); ref(rc.b, 'recipe'); ref(rc.result, 'recipe');
  const k = recipeKey(rc.a, rc.b);
  if (seenRecipe.has(k)) fail(`Duplicate recipe ${k}`); seenRecipe.add(k);
  const av = EMOJI_BY_ID[rc.a]?.status === 'vault', bv = EMOJI_BY_ID[rc.b]?.status === 'vault';
  if (EMOJI_BY_ID[rc.result]?.status === 'vault' && !av && !bv) warn(`Recipe ${k} yields vault emoji ${rc.result} from launch ingredients`);
}
for (const lv of LEVELS) {
  lv.spawnPool.forEach((id) => ref(id, `level ${lv.id} spawnPool`));
  if (lv.spawnPool.length < 4 || lv.spawnPool.length > 7) fail(`level ${lv.id}: spawnPool size ${lv.spawnPool.length} out of [4,7]`);
  for (const o of lv.objectives) {
    if (o.target) ref(o.target, `level ${lv.id} objective`);
    if (o.amount <= 0) fail(`level ${lv.id}: objective amount must be > 0`);
    // a collect target must be reachable from the spawn pool by evolution
    if (o.type === 'collect' && o.target) {
      const reach = new Set(lv.spawnPool); let grew = true;
      while (grew) { grew = false; for (const e of [...reach]) { const n = NEXT_TIER[e]; if (n && !reach.has(n)) { reach.add(n); grew = true; } } }
      if (!reach.has(o.target)) fail(`level ${lv.id}: target '${o.target}' not reachable from spawnPool by evolution`);
    }
  }
  if (lv.layout) {
    if (lv.layout.length !== lv.rows || lv.layout.some((l) => l.length !== lv.cols)) fail(`level ${lv.id}: layout dimensions mismatch`);
    const open = lv.layout.join('').split('').filter((c) => c === '.' || c === 'J' || c === 'K' || c === 'C').length;
    if (open < lv.cols * lv.rows * 0.6) fail(`level ${lv.id}: too few playable cells (${open})`);
  }
}

// 4. reachability of launch emojis from tier-0 launch pieces
const reachable = new Set(EMOJIS.filter((e) => e.tier === 0 && e.status === 'launch').map((e) => e.id));
let grew = true;
while (grew) {
  grew = false;
  for (const chain of Object.values(CHAINS)) for (let i = 0; i < chain.length - 1; i++) {
    if (reachable.has(chain[i]!) && !reachable.has(chain[i + 1]!)) { reachable.add(chain[i + 1]!); grew = true; }
  }
  for (const rc of RECIPES) if (reachable.has(rc.a) && reachable.has(rc.b) && !reachable.has(rc.result)) { reachable.add(rc.result); grew = true; }
}
for (const e of EMOJIS) if (e.status === 'launch' && !reachable.has(e.id)) fail(`Launch emoji '${e.id}' ${e.glyph} is unreachable from base pieces`);

// 5. recipe kind ratio sanity (40/30/30 ± 10)
const total = RECIPES.length;
const pct = (k: string) => Math.round((RECIPES.filter((r) => r.kind === k).length / total) * 100);
const ratio = { physical: pct('physical'), metamorphic: pct('metamorphic'), psychological: pct('psychological') };
if (Math.abs(ratio.physical - 40) > 12 || Math.abs(ratio.metamorphic - 30) > 12 || Math.abs(ratio.psychological - 30) > 12)
  warn(`Recipe ratio drift: ${JSON.stringify(ratio)} (target 40/30/30)`);

console.log(`📦 content: ${EMOJIS.length} emojis · ${Object.keys(CHAINS).length} chains · ${RECIPES.length} recipes · ${LEVELS.length} levels`);
console.log(`🔬 recipe mix: ${JSON.stringify(ratio)}`);
for (const w of warnings) console.warn(`⚠️  ${w}`);
if (errors.length) { for (const e of errors) console.error(`❌ ${e}`); process.exit(1); }
console.log('✅ content valid');
