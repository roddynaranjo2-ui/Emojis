/**
 * build-atlas.ts — turns the curated catalog into a Phaser texture atlas built
 * from Google Noto Color Emoji PNGs (Apache-2.0, googlefonts/noto-emoji).
 *
 * Why: emojis as text render differently on every OS. Pre-rasterising Noto
 * guarantees identical glyphs on iOS/Android/web and enables GPU batching.
 *
 * Output → packages/app/public/atlas/
 *   emojis@1x.png / emojis@2x.png   (64px & 128px cells)
 *   emojis.json                      (Phaser JSONHash atlas format, per scale)
 *   emojis.css                       (CSS sprite classes for the HTML/CSS UI layer)
 *
 * Downloads are cached in .noto-cache/ so CI reruns are fast.
 */
import { mkdir, readFile, writeFile, access } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { EMOJIS, FAMILIES } from '../packages/content/src/emojis';

const ROOT = path.resolve(import.meta.dirname ?? '.', '..');
const CACHE = path.join(ROOT, '.noto-cache');
const OUT = path.join(ROOT, 'packages/app/public/atlas');
const NOTO_BASE = 'https://raw.githubusercontent.com/googlefonts/noto-emoji/main/png/128';

/** Convert an emoji string to Noto's file name: emoji_u1f4a7.png, emoji_u2601.png (VS16 stripped), ZWJ joined with _ */
export function notoFileName(glyph: string): string {
  const cps = Array.from(glyph)
    .map((c) => c.codePointAt(0)!)
    .filter((cp) => cp !== 0xfe0f) // strip variation selector-16
    .map((cp) => cp.toString(16).padStart(4, '0'));
  return `emoji_u${cps.join('_')}.png`;
}

async function exists(p: string) { try { await access(p); return true; } catch { return false; } }

async function fetchNoto(glyph: string): Promise<Buffer> {
  const file = notoFileName(glyph);
  const cached = path.join(CACHE, file);
  if (await exists(cached)) return readFile(cached);
  const url = `${NOTO_BASE}/${file}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Noto glyph missing for ${glyph} (${file}) → HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(cached, buf);
  return buf;
}

// UI-only glyphs that are not part of the 144 catalog but the interface needs.
const UI_GLYPHS: Array<[string, string]> = [
  ['ui_heart', '❤️'], ['ui_coin', '🪙'], ['ui_gem', '💎'], ['ui_settings', '⚙️'],
  ['ui_pause', '⏸️'], ['ui_play', '▶️'], ['ui_back', '◀️'], ['ui_target', '🎯'],
  ['ui_moves', '👣'], ['ui_star', '⭐'], ['ui_lock', '🔒'], ['ui_check', '✅'],
  ['ui_warn', '⚠️'], ['ui_err', '❌'], ['ui_hint', '💡'], ['ui_dex', '📖'],
  ['ui_lab', '🧪'], ['ui_cauldron', '⚗️'], ['ui_map', '🗺️'], ['ui_retry', '🔄'],
  ['ui_home', '🏠'], ['ui_sound', '🔊'], ['ui_mute', '🔇'], ['ui_trophy', '🏆'],
  ['ui_question', '❓'], ['ui_new', '🆕'], ['ui_shop', '🛒'], ['ui_share', '📤'],
  ['ui_gift', '🎁'], ['ui_music', '🎵'], ['ui_hammer', '🔨'], ['ui_fire', '🔥'], ['ui_crown', '👑'],
  // special board pieces
  ['sp_bomb', '💣'], ['sp_rocket', '🚀'], ['sp_wild', '🌟'], ['sp_spark', '✨'],
  ['sp_boom', '💥'],
  // blockers
  ['bl_rock', '🪨'], ['bl_ice', '🧊'],
];

interface Frame { name: string; glyph: string; buf: Buffer }

async function buildScale(frames: Frame[], aliases: Record<string, string>, cell: number, pad: number, suffix: string) {
  const cols = Math.ceil(Math.sqrt(frames.length));
  const rows = Math.ceil(frames.length / cols);
  const step = cell + pad * 2;
  const W = cols * step, H = rows * step;

  const composites: sharp.OverlayOptions[] = [];
  const json: Record<string, unknown> = {};
  const framesJson: Record<string, unknown> = {};

  for (let i = 0; i < frames.length; i++) {
    const f = frames[i]!;
    const x = (i % cols) * step + pad;
    const y = Math.floor(i / cols) * step + pad;
    const resized = await sharp(f.buf).resize(cell, cell, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
    composites.push({ input: resized, left: x, top: y });
    framesJson[f.name] = {
      frame: { x, y, w: cell, h: cell },
      rotated: false, trimmed: false,
      spriteSourceSize: { x: 0, y: 0, w: cell, h: cell },
      sourceSize: { w: cell, h: cell },
    };
  }

  const png = await sharp({ create: { width: W, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(composites).png({ compressionLevel: 9 }).toBuffer();

  // aliases: same rect under another name (e.g. bl_rock → rock) so Phaser can address every id
  for (const [alias, canon] of Object.entries(aliases)) if (framesJson[canon]) framesJson[alias] = framesJson[canon];
  json.frames = framesJson;
  json.meta = { app: 'emojiverse/build-atlas', version: '1.0', image: `emojis${suffix}.png`, format: 'RGBA8888', size: { w: W, h: H }, scale: '1' };

  await writeFile(path.join(OUT, `emojis${suffix}.png`), png);
  await writeFile(path.join(OUT, `emojis${suffix}.json`), JSON.stringify(json));
  return { W, H, cols, step, pad, cell };
}

async function main() {
  await mkdir(CACHE, { recursive: true });
  await mkdir(OUT, { recursive: true });

  const all: Array<[string, string]> = [
    ...EMOJIS.map((e): [string, string] => [e.id, e.glyph]),
    ...FAMILIES.map((f): [string, string] => [`fam_${f.id}`, f.glyph]),
    ...UI_GLYPHS,
  ];
  // de-dupe by glyph → name (first name wins), but keep aliases in JSON via css map
  const frames: Frame[] = [];
  const seen = new Map<string, string>();
  const aliases: Record<string, string> = {};
  let downloaded = 0;
  for (const [name, glyph] of all) {
    const canon = seen.get(glyph);
    if (canon) { aliases[name] = canon; continue; }
    const buf = await fetchNoto(glyph);
    downloaded++;
    seen.set(glyph, name);
    frames.push({ name, glyph, buf });
  }

  const s1 = await buildScale(frames, aliases, 64, 2, '@1x');
  const s2 = await buildScale(frames, aliases, 128, 4, '@2x');

  // CSS sprite classes (2x sheet, displayed at 1x via background-size) for the HTML UI layer.
  let css = `/* generated by tools/build-atlas.ts — do not edit */\n.em{display:inline-block;width:1em;height:1em;background:url(./emojis@2x.png) no-repeat;background-size:${s2.W / 2}px ${s2.H / 2}px;vertical-align:-0.15em;image-rendering:auto}\n`;
  frames.forEach((f, i) => {
    const x = (i % s2.cols) * s2.step + s2.pad, y = Math.floor(i / s2.cols) * s2.step + s2.pad;
    css += `.em-${f.name}{background-position:-${x / 2}px -${y / 2}px}\n`;
  });
  for (const [alias, canon] of Object.entries(aliases)) {
    const i = frames.findIndex((f) => f.name === canon);
    const x = (i % s2.cols) * s2.step + s2.pad, y = Math.floor(i / s2.cols) * s2.step + s2.pad;
    css += `.em-${alias}{background-position:-${x / 2}px -${y / 2}px}\n`;
  }
  // CSS uses 1em sizing; the 2x sheet is drawn at cell/2 = 64px per em → scale via font-size.
  css = css.replace('width:1em;height:1em', 'width:64px;height:64px');
  await writeFile(path.join(OUT, 'emojis.css'), css);
  await writeFile(path.join(OUT, 'aliases.json'), JSON.stringify(aliases));

  console.log(`🧩 atlas: ${frames.length} unique glyphs (${downloaded} fetched/cached, ${Object.keys(aliases).length} aliases)`);
  console.log(`   @1x ${s1.W}×${s1.H}  ·  @2x ${s2.W}×${s2.H}  →  ${path.relative(ROOT, OUT)}/`);
}

main().catch((err) => { console.error('❌ atlas build failed:', err.message); process.exit(1); });
