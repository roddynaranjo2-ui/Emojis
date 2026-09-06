/**
 * EMOJIVERSE — Curated catalog: 12 families × 12 emojis = 144.
 * All glyphs are single code points (no ZWJ, no skin tones, no flags) so they
 * stay legible at 44px and map 1:1 to a Noto Color Emoji PNG.
 *
 * `status`: 'launch' (96, visible from day one) | 'vault' (48, locked for events).
 * `rarity`: common | rare | epic | legendary — drives dex frame color + haptics.
 * `tier`  : position inside the family evolution chain (0 = base piece).
 */

export type FamilyId =
  | 'elements' | 'sky' | 'flora' | 'fauna' | 'food' | 'emotions1'
  | 'objects' | 'cosmic' | 'emotions2' | 'festive' | 'mythic' | 'arcane';

export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';
export type ReleaseStatus = 'launch' | 'vault';

export interface EmojiDef {
  id: string;          // stable slug used in code & save files
  glyph: string;       // the actual emoji character
  name: string;        // english display name
  family: FamilyId;
  tier: number;        // 0..5 within evolution chain (or -1 if recipe-only)
  rarity: Rarity;
  status: ReleaseStatus;
}

export interface FamilyDef {
  id: FamilyId;
  glyph: string;       // representative emoji for UI tabs
  name: string;
  status: ReleaseStatus;
  /** particle theme used by VFX layer: fire | water | sparkle | leaf | heart | star | smoke */
  particle: 'fire' | 'water' | 'sparkle' | 'leaf' | 'heart' | 'star' | 'smoke' | 'petal';
  /** base pitch (Hz) for family SFX — pentatonic ladder climbs from here */
  basePitch: number;
}

export const FAMILIES: FamilyDef[] = [
  { id: 'elements',  glyph: '🌱', name: 'Elements',     status: 'launch', particle: 'water',   basePitch: 261.63 },
  { id: 'sky',       glyph: '☁️', name: 'Sky & Weather', status: 'launch', particle: 'sparkle', basePitch: 293.66 },
  { id: 'flora',     glyph: '🌿', name: 'Flora',        status: 'launch', particle: 'leaf',    basePitch: 329.63 },
  { id: 'fauna',     glyph: '🐾', name: 'Fauna',        status: 'launch', particle: 'petal',   basePitch: 392.00 },
  { id: 'food',      glyph: '🍎', name: 'Food',         status: 'launch', particle: 'sparkle', basePitch: 440.00 },
  { id: 'emotions1', glyph: '😀', name: 'Emotions I',   status: 'launch', particle: 'heart',   basePitch: 523.25 },
  { id: 'objects',   glyph: '🏠', name: 'Objects',      status: 'launch', particle: 'smoke',   basePitch: 587.33 },
  { id: 'cosmic',    glyph: '✨', name: 'Cosmic',       status: 'launch', particle: 'star',    basePitch: 659.25 },
  { id: 'emotions2', glyph: '🎭', name: 'Emotions II',  status: 'vault',  particle: 'heart',   basePitch: 783.99 },
  { id: 'festive',   glyph: '🎃', name: 'Festive',      status: 'vault',  particle: 'sparkle', basePitch: 880.00 },
  { id: 'mythic',    glyph: '🐉', name: 'Mythic',       status: 'vault',  particle: 'fire',    basePitch: 987.77 },
  { id: 'arcane',    glyph: '🔮', name: 'Arcane',       status: 'vault',  particle: 'star',    basePitch: 1046.5 },
];

// Helper to keep the table compact.
const e = (
  id: string, glyph: string, name: string, family: FamilyId, tier: number,
  rarity: Rarity, status: ReleaseStatus = 'launch',
): EmojiDef => ({ id, glyph, name, family, tier, rarity, status });

export const EMOJIS: EmojiDef[] = [
  // ── 1. ELEMENTS (base pieces of the board) ───────────────────────────────
  e('water',     '💧', 'Water',      'elements', 0, 'common'),
  e('fire',      '🔥', 'Fire',       'elements', 0, 'common'),
  e('wind',      '🌬️', 'Wind',       'elements', 0, 'common'),
  e('rock',      '🪨', 'Rock',       'elements', 0, 'common'),
  e('bolt',      '⚡', 'Lightning',  'elements', 0, 'common'),
  e('snow',      '❄️', 'Snow',       'elements', 0, 'common'),
  e('wave',      '🌊', 'Wave',       'elements', 1, 'common'),
  e('steam',     '💨', 'Steam',      'elements', 1, 'common'),
  e('ice',       '🧊', 'Ice',        'elements', 1, 'rare'),
  e('volcano',   '🌋', 'Volcano',    'elements', 2, 'rare'),
  e('mountain',  '⛰️', 'Mountain',   'elements', 2, 'rare'),
  e('tornado',   '🌪️', 'Tornado',    'elements', 3, 'epic'),

  // ── 2. SKY & WEATHER ─────────────────────────────────────────────────────
  e('cloud',     '☁️', 'Cloud',      'sky', 0, 'common'),
  e('sun',       '☀️', 'Sun',        'sky', 0, 'common'),
  e('moon',      '🌙', 'Moon',       'sky', 0, 'common'),
  e('rain',      '🌧️', 'Rain',       'sky', 1, 'common'),
  e('sun_cloud', '⛅', 'Partly Sunny','sky', 1, 'common'),
  e('storm',     '⛈️', 'Storm',      'sky', 2, 'rare'),
  e('snowcloud', '🌨️', 'Snow Cloud', 'sky', 2, 'rare'),
  e('rainbow',   '🌈', 'Rainbow',    'sky', 3, 'epic'),
  e('fog',       '🌫️', 'Fog',        'sky', 1, 'common'),
  e('sunrise',   '🌅', 'Sunrise',    'sky', 3, 'rare'),
  e('night',     '🌃', 'Night City', 'sky', 3, 'rare'),
  e('fullmoon',  '🌕', 'Full Moon',  'sky', 4, 'epic'),

  // ── 3. FLORA ─────────────────────────────────────────────────────────────
  e('seed',      '🌱', 'Seedling',   'flora', 0, 'common'),
  e('herb',      '🌿', 'Herb',       'flora', 1, 'common'),
  e('tree',      '🌳', 'Tree',       'flora', 2, 'common'),
  e('forest',    '🌲', 'Evergreen',  'flora', 3, 'rare'),
  e('blossom',   '🌸', 'Blossom',    'flora', 2, 'rare'),
  e('sunflower', '🌻', 'Sunflower',  'flora', 2, 'rare'),
  e('rose',      '🌹', 'Rose',       'flora', 3, 'epic'),
  e('mushroom',  '🍄', 'Mushroom',   'flora', 1, 'common'),
  e('cactus',    '🌵', 'Cactus',     'flora', 2, 'rare'),
  e('palm',      '🌴', 'Palm',       'flora', 3, 'rare'),
  e('clover',    '🍀', 'Four Leaf',  'flora', 4, 'epic'),
  e('leaf',      '🍁', 'Maple Leaf', 'flora', 1, 'common'),

  // ── 4. FAUNA ─────────────────────────────────────────────────────────────
  e('egg',       '🥚', 'Egg',        'fauna', 0, 'common'),
  e('chick',     '🐣', 'Chick',      'fauna', 1, 'common'),
  e('bird',      '🐦', 'Bird',       'fauna', 2, 'common'),
  e('eagle',     '🦅', 'Eagle',      'fauna', 3, 'rare'),
  e('bug',       '🐛', 'Caterpillar','fauna', 0, 'common'),
  e('butterfly', '🦋', 'Butterfly',  'fauna', 1, 'rare'),
  e('fish',      '🐟', 'Fish',       'fauna', 1, 'common'),
  e('dolphin',   '🐬', 'Dolphin',    'fauna', 2, 'rare'),
  e('whale',     '🐋', 'Whale',      'fauna', 3, 'epic'),
  e('frog',      '🐸', 'Frog',       'fauna', 1, 'common'),
  e('lion',      '🦁', 'Lion',       'fauna', 3, 'epic'),
  e('owl',       '🦉', 'Owl',        'fauna', 2, 'rare'),

  // ── 5. FOOD ──────────────────────────────────────────────────────────────
  e('wheat',     '🌾', 'Wheat',      'food', 0, 'common'),
  e('bread',     '🍞', 'Bread',      'food', 1, 'common'),
  e('apple',     '🍎', 'Apple',      'food', 0, 'common'),
  e('milk',      '🥛', 'Milk',       'food', 0, 'common'),
  e('cheese',    '🧀', 'Cheese',     'food', 1, 'common'),
  e('icecream',  '🍦', 'Ice Cream',  'food', 2, 'rare'),
  e('pizza',     '🍕', 'Pizza',      'food', 2, 'rare'),
  e('cake',      '🍰', 'Cake',       'food', 3, 'epic'),
  e('coffee',    '☕', 'Coffee',     'food', 1, 'common'),
  e('honey',     '🍯', 'Honey',      'food', 2, 'rare'),
  e('cookie',    '🍪', 'Cookie',     'food', 2, 'rare'),
  e('sushi',     '🍣', 'Sushi',      'food', 3, 'epic'),

  // ── 6. EMOTIONS I (the USP) ──────────────────────────────────────────────
  e('happy',     '😀', 'Happy',      'emotions1', 0, 'common'),
  e('sad',       '😢', 'Sad',        'emotions1', 0, 'common'),
  e('angry',     '😡', 'Angry',      'emotions1', 0, 'common'),
  e('scared',    '😱', 'Scared',     'emotions1', 0, 'common'),
  e('sleepy',    '😴', 'Sleepy',     'emotions1', 0, 'common'),
  e('love',      '🥰', 'In Love',    'emotions1', 1, 'common'),
  e('neutral',   '😐', 'Neutral',    'emotions1', 0, 'common'),
  e('pouty',     '🥺', 'Pleading',   'emotions1', 2, 'rare'),
  e('bittersweet','🥲','Bittersweet','emotions1', 2, 'rare'),
  e('hot',       '🥵', 'Hot',        'emotions1', 1, 'rare'),
  e('cold',      '🥶', 'Cold',       'emotions1', 1, 'rare'),
  e('calm',      '😌', 'Relieved',   'emotions1', 3, 'epic'),

  // ── 7. OBJECTS (board obstacles & tools) ────────────────────────────────
  e('log',       '🪵', 'Log',        'objects', 0, 'common'),
  e('hammer',    '🔨', 'Hammer',     'objects', 1, 'common'),
  e('house',     '🏠', 'House',      'objects', 2, 'rare'),
  e('key',       '🔑', 'Key',        'objects', 1, 'common'),
  e('lock',      '🔒', 'Lock',       'objects', 1, 'common'),
  e('candle',    '🕯️', 'Candle',     'objects', 1, 'common'),
  e('box',       '📦', 'Box',        'objects', 0, 'common'),
  e('gift',      '🎁', 'Gift',       'objects', 2, 'rare'),
  e('lamp',      '💡', 'Idea',       'objects', 2, 'rare'),
  e('book',      '📖', 'Book',       'objects', 2, 'rare'),
  e('crown',     '👑', 'Crown',      'objects', 3, 'epic'),
  e('castle',    '🏰', 'Castle',     'objects', 4, 'epic'),

  // ── 8. COSMIC (top tier reward) ──────────────────────────────────────────
  e('star',      '⭐', 'Star',       'cosmic', 0, 'common'),
  e('glowstar',  '🌟', 'Glowing Star','cosmic', 1, 'rare'),
  e('dizzy',     '💫', 'Dizzy',      'cosmic', 1, 'rare'),
  e('sparkles',  '✨', 'Sparkles',   'cosmic', 0, 'common'),
  e('comet',     '☄️', 'Comet',      'cosmic', 2, 'rare'),
  e('planet',    '🪐', 'Planet',     'cosmic', 2, 'epic'),
  e('earth',     '🌍', 'Earth',      'cosmic', 3, 'epic'),
  e('galaxy',    '🌌', 'Galaxy',     'cosmic', 4, 'legendary'),
  e('rocket',    '🚀', 'Rocket',     'cosmic', 1, 'rare'),
  e('satellite', '🛸', 'UFO',        'cosmic', 2, 'epic'),
  e('telescope', '🔭', 'Telescope',  'cosmic', 1, 'common'),
  e('sun_face',  '🌞', 'Sun Face',   'cosmic', 3, 'legendary'),

  // ── 9. EMOTIONS II (vault: event 1) ──────────────────────────────────────
  e('mindblown', '🤯', 'Mind Blown', 'emotions2', 2, 'epic', 'vault'),
  e('starstruck','🤩', 'Star-struck','emotions2', 2, 'rare', 'vault'),
  e('devil',     '😈', 'Devil',      'emotions2', 3, 'epic', 'vault'),
  e('angel',     '😇', 'Angel',      'emotions2', 3, 'epic', 'vault'),
  e('woozy',     '😵‍💫','Woozy',     'emotions2', 2, 'rare', 'vault'),
  e('flushed',   '😳', 'Flushed',    'emotions2', 1, 'rare', 'vault'),
  e('eyeroll',   '🙄', 'Eye Roll',   'emotions2', 1, 'common', 'vault'),
  e('thinking',  '🤔', 'Thinking',   'emotions2', 1, 'common', 'vault'),
  e('party',     '🥳', 'Party',      'emotions2', 3, 'epic', 'vault'),
  e('sick',      '🤢', 'Sick',       'emotions2', 1, 'rare', 'vault'),
  e('cool',      '😎', 'Cool',       'emotions2', 2, 'rare', 'vault'),
  e('heartbroken','💔','Heartbroken','emotions2', 2, 'rare', 'vault'),

  // ── 10. FESTIVE (vault: seasonal) ────────────────────────────────────────
  e('pumpkin',   '🎃', 'Pumpkin',    'festive', 1, 'rare', 'vault'),
  e('xmastree',  '🎄', 'Xmas Tree',  'festive', 2, 'rare', 'vault'),
  e('fireworks', '🎆', 'Fireworks',  'festive', 2, 'epic', 'vault'),
  e('heartgift', '💝', 'Heart Gift', 'festive', 2, 'rare', 'vault'),
  e('birthday',  '🎂', 'Birthday',   'festive', 2, 'rare', 'vault'),
  e('balloon',   '🎈', 'Balloon',    'festive', 0, 'common', 'vault'),
  e('confetti',  '🎉', 'Confetti',   'festive', 1, 'common', 'vault'),
  e('snowman',   '⛄', 'Snowman',    'festive', 2, 'rare', 'vault'),
  e('lantern',   '🏮', 'Lantern',    'festive', 1, 'common', 'vault'),
  e('ghost',     '👻', 'Ghost',      'festive', 2, 'rare', 'vault'),
  e('sparkler',  '🎇', 'Sparkler',   'festive', 1, 'common', 'vault'),
  e('trophy',    '🏆', 'Trophy',     'festive', 3, 'epic', 'vault'),

  // ── 11. MYTHIC (vault: event 2) ──────────────────────────────────────────
  e('dragon',    '🐉', 'Dragon',     'mythic', 4, 'legendary', 'vault'),
  e('unicorn',   '🦄', 'Unicorn',    'mythic', 3, 'epic', 'vault'),
  e('fairy',     '🧚', 'Fairy',      'mythic', 2, 'rare', 'vault'),
  e('genie',     '🧞', 'Genie',      'mythic', 3, 'epic', 'vault'),
  e('mermaid',   '🧜', 'Mermaid',    'mythic', 3, 'epic', 'vault'),
  e('wizard',    '🧙', 'Wizard',     'mythic', 3, 'epic', 'vault'),
  e('vampire',   '🧛', 'Vampire',    'mythic', 3, 'epic', 'vault'),
  e('phoenix',   '🐦‍🔥','Phoenix',   'mythic', 4, 'legendary', 'vault'),
  e('troll',     '🧌', 'Troll',      'mythic', 2, 'rare', 'vault'),
  e('elf',       '🧝', 'Elf',        'mythic', 2, 'rare', 'vault'),
  e('zombie',    '🧟', 'Zombie',     'mythic', 2, 'rare', 'vault'),
  e('trex',      '🦖', 'T-Rex',      'mythic', 3, 'epic', 'vault'),

  // ── 12. ARCANE (vault: end-game) ─────────────────────────────────────────
  e('crystal',   '🔮', 'Crystal Ball','arcane', 2, 'epic', 'vault'),
  e('infinity',  '♾️', 'Infinity',   'arcane', 4, 'legendary', 'vault'),
  e('yinyang',   '☯️', 'Yin Yang',   'arcane', 3, 'epic', 'vault'),
  e('nazar',     '🧿', 'Nazar',      'arcane', 2, 'rare', 'vault'),
  e('alembic',   '⚗️', 'Alembic',    'arcane', 1, 'rare', 'vault'),
  e('oldkey',    '🗝️', 'Old Key',    'arcane', 2, 'rare', 'vault'),
  e('scroll',    '📜', 'Scroll',     'arcane', 1, 'common', 'vault'),
  e('hourglass', '⏳', 'Hourglass',  'arcane', 2, 'rare', 'vault'),
  e('gem',       '💎', 'Gem',        'arcane', 3, 'epic', 'vault'),
  e('dna',       '🧬', 'DNA',        'arcane', 3, 'epic', 'vault'),
  e('atom',      '⚛️', 'Atom',       'arcane', 3, 'epic', 'vault'),
  e('eye',       '👁️', 'All-Seeing', 'arcane', 4, 'legendary', 'vault'),
];

export const EMOJI_BY_ID: Readonly<Record<string, EmojiDef>> = Object.freeze(
  Object.fromEntries(EMOJIS.map((d) => [d.id, d])),
);

export const LAUNCH_EMOJIS = EMOJIS.filter((d) => d.status === 'launch');
export const VAULT_EMOJIS = EMOJIS.filter((d) => d.status === 'vault');
