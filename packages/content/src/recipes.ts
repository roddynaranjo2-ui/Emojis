/**
 * Cross recipes — Laboratory verb: DISCOVER (A + B = C).
 * Commutative, deterministic, never RNG. Three kinds:
 *  physical (40%) — causal logic, "of course"
 *  metamorphic (30%) — transformation over time
 *  psychological (30%) — the USP; emotional logic that gets screenshotted
 *
 * Phase 0 ships the first 48 recipes covering the 8 launch families.
 */
export type RecipeKind = 'physical' | 'metamorphic' | 'psychological';

export interface Recipe {
  a: string;
  b: string;
  result: string;
  kind: RecipeKind;
  /** Echo hints, revealed progressively (family → ingredient → almost answer) */
  echoes: [string, string, string];
}

const r = (a: string, b: string, result: string, kind: RecipeKind, echoes: [string, string, string]): Recipe =>
  ({ a, b, result, kind, echoes });

export const RECIPES: Recipe[] = [
  // ── PHYSICAL ─────────────────────────────────────────────────────────────
  r('water', 'fire',    'steam',     'physical', ['It is an element', 'It needs 💧', '💧 plus something that burns']),
  r('cloud', 'bolt',    'storm',     'physical', ['It lives in the sky', 'It needs ☁️', '☁️ plus a shock']),
  r('sun', 'rain',      'rainbow',   'physical', ['It lives in the sky', 'It needs 🌧️', '🌧️ plus light']),
  r('water', 'snow',    'ice',       'physical', ['It is an element', 'It needs 💧', '💧 plus cold']),
  r('rock', 'fire',     'volcano',   'physical', ['It is an element', 'It needs 🪨', '🪨 plus heat']),
  r('rock', 'rock',     'mountain',  'physical', ['It is an element', 'It needs 🪨', 'Stack two of them']),
  r('wind', 'wind',     'tornado',   'physical', ['It is an element', 'It needs 🌬️', 'Twice the breeze']),
  r('water', 'wind',    'wave',      'physical', ['It is an element', 'It needs 💧', '💧 pushed by air']),
  r('cloud', 'water',   'rain',      'physical', ['It lives in the sky', 'It needs ☁️', 'A heavy ☁️']),
  r('cloud', 'snow',    'snowcloud', 'physical', ['It lives in the sky', 'It needs ☁️', 'A frozen ☁️']),
  r('cloud', 'sun',     'sun_cloud', 'physical', ['It lives in the sky', 'It needs ☀️', '☀️ hiding a bit']),
  r('steam', 'wind',    'cloud',     'physical', ['It lives in the sky', 'It needs 💨', '💨 carried upward']),
  r('sun', 'moon',      'sunrise',   'physical', ['It lives in the sky', 'It needs 🌙', 'When 🌙 hands over']),
  r('wheat', 'fire',    'bread',     'physical', ['It is food', 'It needs 🌾', '🌾 plus an oven']),
  r('milk', 'snow',     'icecream',  'physical', ['It is food', 'It needs 🥛', '🥛 frozen']),
  r('milk', 'sun',      'cheese',    'physical', ['It is food', 'It needs 🥛', '🥛 left to age']),
  r('bread', 'cheese',  'pizza',     'physical', ['It is food', 'It needs 🍞', '🍞 with something melted']),
  r('water', 'rock',    'coffee',    'physical', ['It is food', 'It needs 💧', 'Hot 💧 over ground beans']),
  r('log', 'rock',      'hammer',    'physical', ['It is a tool', 'It needs 🪵', '🪵 plus a heavy head']),
  r('log', 'hammer',    'house',     'physical', ['It is a place', 'It needs 🪵', '🪵 built with 🔨']),
  r('fire', 'log',      'candle',    'physical', ['It gives light', 'It needs 🔥', 'A tiny tame 🔥']),
  r('bolt', 'box',      'lamp',      'physical', ['It gives light', 'It needs ⚡', '⚡ in a container']),
  r('fire', 'bolt',     'comet',     'physical', ['It is cosmic', 'It needs 🔥', 'A 🔥 falling from the sky']),
  r('star', 'star',     'glowstar',  'physical', ['It is cosmic', 'It needs ⭐', 'Two ⭐ shine brighter']),
  r('rock', 'star',     'planet',    'physical', ['It is cosmic', 'It needs 🪨', 'A 🪨 in orbit']),
  r('planet', 'water',  'earth',     'physical', ['It is cosmic', 'It needs 🪐', 'A 🪐 with oceans']),
  r('fire', 'steam',    'rocket',    'physical', ['It is cosmic', 'It needs 🔥', '🔥 pushing 💨 downward']),

  // ── METAMORPHIC ──────────────────────────────────────────────────────────
  r('seed', 'water',    'herb',      'metamorphic', ['It grows', 'It needs 🌱', 'Water it']),
  r('herb', 'sun',      'tree',      'metamorphic', ['It grows', 'It needs 🌿', 'Give it years of ☀️']),
  r('tree', 'snow',     'forest',    'metamorphic', ['It grows', 'It needs 🌳', 'A 🌳 that survives winter']),
  r('seed', 'sun',      'sunflower', 'metamorphic', ['It grows', 'It needs 🌱', 'A 🌱 that follows ☀️']),
  r('seed', 'love',     'rose',      'metamorphic', ['It grows', 'It needs 🌱', 'Plant it with 🥰']),
  r('seed', 'rock',     'cactus',    'metamorphic', ['It grows', 'It needs 🌱', 'A 🌱 in dry ground']),
  r('log', 'rain',      'mushroom',  'metamorphic', ['It grows', 'It needs 🪵', 'Damp 🪵']),
  r('bug', 'herb',      'butterfly', 'metamorphic', ['It is an animal', 'It needs 🐛', 'A 🐛 after eating leaves']),
  r('egg', 'fire',      'chick',     'metamorphic', ['It is an animal', 'It needs 🥚', 'A warm 🥚']),
  r('chick', 'wind',    'bird',      'metamorphic', ['It is an animal', 'It needs 🐣', 'A 🐣 that learns the air']),
  r('bird', 'mountain', 'eagle',     'metamorphic', ['It is an animal', 'It needs 🐦', 'A 🐦 of the peaks']),
  r('fish', 'wave',     'dolphin',   'metamorphic', ['It is an animal', 'It needs 🐟', 'A 🐟 that jumps 🌊']),
  r('egg', 'water',     'fish',      'metamorphic', ['It is an animal', 'It needs 🥚', 'A 🥚 in 💧']),
  r('egg', 'rain',      'frog',      'metamorphic', ['It is an animal', 'It needs 🥚', 'A 🥚 in a puddle']),
  r('bird', 'moon',     'owl',       'metamorphic', ['It is an animal', 'It needs 🐦', 'A 🐦 that hunts at night']),
  r('sun', 'lion',      'sun_face',  'metamorphic', ['It is cosmic', 'It needs ☀️', 'A ☀️ that roars']),
  r('bread', 'love',    'cake',      'metamorphic', ['It is food', 'It needs 🍞', '🍞 baked with 🥰']),
  r('box', 'love',      'gift',      'metamorphic', ['It is an object', 'It needs 📦', 'A 📦 with 🥰 inside']),

  // ── PSYCHOLOGICAL (USP) ──────────────────────────────────────────────────
  r('sad', 'angry',     'pouty',     'psychological', ['It is a feeling', 'It needs 😢', '😢 that also wants to shout']),
  r('happy', 'sad',     'bittersweet','psychological', ['It is a feeling', 'It needs 😀', 'Smiling through 😢']),
  r('happy', 'fire',    'hot',       'psychological', ['It is a feeling', 'It needs 😀', 'A 😀 too close to 🔥']),
  r('scared', 'snow',   'cold',      'psychological', ['It is a feeling', 'It needs 😱', '😱 frozen in place']),
  r('angry', 'snow',    'cold',      'psychological', ['It is a feeling', 'It needs 😡', 'When 😡 goes icy']),
  r('angry', 'water',   'calm',      'psychological', ['It is a feeling', 'It needs 😡', 'Pour 💧 on 😡']),
  r('happy', 'happy',   'love',      'psychological', ['It is a feeling', 'It needs 😀', 'Two 😀 looking at each other']),
  r('sad', 'sun',       'rainbow',   'psychological', ['It lives in the sky', 'It needs 😢', 'When 😢 meets ☀️']),
  r('sleepy', 'moon',   'night',     'psychological', ['It lives in the sky', 'It needs 😴', '😴 under 🌙']),
  r('neutral', 'neutral','calm',     'psychological', ['It is a feeling', 'It needs 😐', 'Two 😐 make peace']),
  r('scared', 'candle', 'calm',      'psychological', ['It is a feeling', 'It needs 😱', '😱 finds a light']),
  r('sad', 'water',     'wave',      'psychological', ['It is an element', 'It needs 😢', 'Enough 😢 makes a sea']),
  r('love', 'book',     'lamp',      'psychological', ['It is an object', 'It needs 🥰', '🥰 for 📖 sparks it']),
  r('happy', 'star',    'sparkles',  'psychological', ['It is cosmic', 'It needs 😀', 'A 😀 that shines']),
  r('sleepy', 'cloud',  'fog',       'psychological', ['It lives in the sky', 'It needs 😴', 'A 😴 ☁️']),
  r('scared', 'star',   'dizzy',     'psychological', ['It is cosmic', 'It needs 😱', '😱 sees ⭐ spinning']),
  r('angry', 'egg',     'lion',      'psychological', ['It is an animal', 'It needs 😡', 'A 😡 born with a mane']),
  r('sad', 'box',       'lock',      'psychological', ['It is an object', 'It needs 😢', '😢 kept inside a 📦']),
  r('happy', 'lock',    'key',       'psychological', ['It is an object', 'It needs 🔒', 'What 😀 does to a 🔒']),
  r('sleepy', 'book',   'telescope', 'psychological', ['It is cosmic', 'It needs 📖', 'A 📖 read too late at night']),
  r('scared', 'rocket', 'satellite', 'psychological', ['It is cosmic', 'It needs 🚀', 'A 🚀 nobody recognises']),

  // ── METAMORPHIC (continued) ──────────────────────────────────────────────
  r('tree', 'sun',      'palm',      'metamorphic', ['It grows', 'It needs 🌳', 'A 🌳 that loves heat']),
  r('tree', 'wind',     'leaf',      'metamorphic', ['It grows', 'It needs 🌳', 'What 🌬️ steals from a 🌳']),
  r('butterfly', 'sunflower', 'honey','metamorphic', ['It is food', 'It needs 🌻', 'What 🦋 friends make from 🌻']),
  r('bread', 'honey',   'cookie',    'metamorphic', ['It is food', 'It needs 🍞', 'A sweet small 🍞']),
  r('leaf', 'leaf',     'book',      'metamorphic', ['It is an object', 'It needs 🍁', 'Many leaves, pressed']),
];

/** Canonical key so that A+B and B+A resolve identically. */
export const recipeKey = (a: string, b: string): string => (a < b ? `${a}+${b}` : `${b}+${a}`);

export const RECIPE_MAP: ReadonlyMap<string, Recipe> = new Map(RECIPES.map((rc) => [recipeKey(rc.a, rc.b), rc]));

export function findRecipe(a: string, b: string): Recipe | undefined {
  return RECIPE_MAP.get(recipeKey(a, b));
}
