import { describe, it, expect } from 'vitest';
import { en } from './en';
import { es } from './es';
import { pt } from './pt';
import { fr } from './fr';
import { NAMES_ES, NAMES_PT, NAMES_FR } from './names';
import { EMOJIS } from '@emojiverse/content';

const locales = { es, pt, fr } as const;
const vars = (s: string) => (s.match(/\{[a-z]+\}/g) ?? []).sort().join(',');

describe('i18n dictionaries', () => {
  for (const [id, dict] of Object.entries(locales)) {
    it(`${id} has every key, no empty strings, same placeholders as EN`, () => {
      for (const k of Object.keys(en) as Array<keyof typeof en>) {
        expect(dict[k], k).toBeTypeOf('string');
        expect(dict[k].length, k).toBeGreaterThan(0);
        expect(vars(dict[k]), k).toBe(vars(en[k]));
        if (en[k].includes('|')) expect(dict[k].split('|').length, k).toBe(2);
      }
      expect(Object.keys(dict).length).toBe(Object.keys(en).length);
    });
  }
  it('emoji names cover all 144 emojis in every locale', () => {
    for (const table of [NAMES_ES, NAMES_PT, NAMES_FR]) for (const e of EMOJIS) expect(table[e.id], e.id).toBeTypeOf('string');
  });
});
