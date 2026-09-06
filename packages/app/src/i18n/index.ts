import { en, type Key } from './en';
import { es } from './es';
import { pt } from './pt';
import { fr } from './fr';

export type Locale = 'en' | 'es' | 'pt' | 'fr';
export const LOCALES: Array<{ id: Locale; flag: string; name: string }> = [
  { id: 'en', flag: '🇬🇧', name: 'English' }, { id: 'es', flag: '🇪🇸', name: 'Español' }, { id: 'pt', flag: '🇧🇷', name: 'Português' }, { id: 'fr', flag: '🇫🇷', name: 'Français' },
];
const DICT: Record<Locale, Record<Key, string>> = { en, es, pt, fr };
const KEY = 'emojiverse.locale';

let current: Locale = detect();

function detect(): Locale {
  const saved = localStorage.getItem(KEY) as Locale | null;
  if (saved && saved in DICT) return saved;
  const nav = (navigator.language || 'en').slice(0, 2).toLowerCase();
  return (nav in DICT ? nav : 'en') as Locale;
}

export const locale = (): Locale => current;
export function setLocale(l: Locale): void { current = l; localStorage.setItem(KEY, l); document.documentElement.lang = l; }

/** Translate. `{var}` placeholders are replaced from `vars`. Falls back to English, then to the key. */
export function t(key: Key, vars?: Record<string, string | number>): string {
  let s = DICT[current][key] ?? en[key] ?? key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v));
  return s;
}
/** "Name|Description" pairs used for achievements & worlds. */
export function t2(key: Key): [string, string] { const [a, b] = t(key).split('|'); return [a ?? '', b ?? '']; }
export type { Key };
export { en };
