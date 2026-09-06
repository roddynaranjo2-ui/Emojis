import { em } from '@emojiverse/ui';
import { state } from './state';
import { toast } from './router';
import { t, t2, type Key } from './i18n';

export interface AchievementDef { id: string; glyph: string; coins: number }

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first_win', glyph: '🎉', coins: 20 }, { id: 'wins_25', glyph: '🏅', coins: 60 }, { id: 'wins_100', glyph: '🏆', coins: 200 },
  { id: 'stars_30', glyph: '⭐', coins: 40 }, { id: 'stars_150', glyph: '🌟', coins: 120 }, { id: 'stars_all', glyph: '🌌', coins: 500 },
  { id: 'dex_10', glyph: '📖', coins: 30 }, { id: 'dex_50', glyph: '📚', coins: 100 }, { id: 'dex_launch', glyph: '🗂️', coins: 250 }, { id: 'dex_all', glyph: '👑', coins: 1000 },
  { id: 'mix_1', glyph: '🧪', coins: 20 }, { id: 'mix_25', glyph: '⚗️', coins: 100 }, { id: 'mix_all', glyph: '🔮', coins: 400 },
  { id: 'combo_5', glyph: '🔥', coins: 30 }, { id: 'combo_8', glyph: '💥', coins: 80 }, { id: 'streak_5', glyph: '🎯', coins: 50 }, { id: 'daily_7', glyph: '📅', coins: 100 },
];
export const ACHIEVEMENT_BY_ID: Record<string, AchievementDef> = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a]));

/** Check + reward + toast. Safe to call after any state change. */
export function awardAchievements(): void {
  for (const id of state.checkAchievements()) {
    const a = ACHIEVEMENT_BY_ID[id]; if (!a) continue;
    state.earn(a.coins);
    const [nm, ds] = t2(`ach.${id}` as Key);
    toast(`<span style="font-size:22px">${a.glyph}</span> <b>${nm}</b> · ${ds} · ${em('ui_coin', 20)} +${a.coins}`, 3200);
  }
  void t;
}
