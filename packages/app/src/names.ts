import { EMOJI_BY_ID } from '@emojiverse/content';
import { locale } from './i18n';
import { NAMES_ES, NAMES_PT, NAMES_FR } from './i18n/names';
import { LEVEL_NAMES_ES, STAGE_NAMES_ES } from './i18n/levelNames';
import type { LevelDef } from '@emojiverse/content';

/** Localised emoji display name (falls back to the English content name). */
export function emojiName(id: string): string {
  const l = locale();
  const table = l === 'es' ? NAMES_ES : l === 'pt' ? NAMES_PT : l === 'fr' ? NAMES_FR : undefined;
  return table?.[id] ?? EMOJI_BY_ID[id]?.name ?? id;
}

/** Localised level / stage title (ES translated; other locales use the English title). */
export function levelName(l: LevelDef): string {
  if (locale() !== 'es') return l.name;
  return (l.event ? STAGE_NAMES_ES[l.event]?.[l.index - 1] : LEVEL_NAMES_ES[l.world]?.[l.index - 1]) ?? l.name;
}
