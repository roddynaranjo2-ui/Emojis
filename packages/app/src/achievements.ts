import { em } from '@emojiverse/ui';
import { state } from './state';
import { toast } from './router';

export interface AchievementDef { id: string; glyph: string; name: string; desc: string; coins: number }

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first_win',  glyph: '🎉', name: 'First Sprout',   desc: 'Win your first level',            coins: 20 },
  { id: 'wins_25',    glyph: '🏅', name: 'Regular',        desc: 'Win 25 levels',                   coins: 60 },
  { id: 'wins_100',   glyph: '🏆', name: 'Veteran',        desc: 'Win 100 levels',                  coins: 200 },
  { id: 'stars_30',   glyph: '⭐', name: 'Stargazer',      desc: 'Earn 30 stars',                   coins: 40 },
  { id: 'stars_150',  glyph: '🌟', name: 'Constellation',  desc: 'Earn 150 stars',                  coins: 120 },
  { id: 'stars_all',  glyph: '🌌', name: 'Perfectionist',  desc: 'Earn all 420 stars',              coins: 500 },
  { id: 'dex_10',     glyph: '📖', name: 'Collector',      desc: 'Discover 10 emojis',              coins: 30 },
  { id: 'dex_50',     glyph: '📚', name: 'Archivist',      desc: 'Discover 50 emojis',              coins: 100 },
  { id: 'dex_launch', glyph: '🗂️', name: 'Encyclopedia',   desc: 'Discover all 96 launch emojis',   coins: 250 },
  { id: 'dex_all',    glyph: '👑', name: 'Emojiverse',     desc: 'Discover every emoji',            coins: 1000 },
  { id: 'mix_1',      glyph: '🧪', name: 'Apprentice',     desc: 'Find your first recipe',          coins: 20 },
  { id: 'mix_25',     glyph: '⚗️', name: 'Alchemist',      desc: 'Find 25 recipes',                 coins: 100 },
  { id: 'mix_all',    glyph: '🔮', name: 'Grand Alchemist', desc: 'Find all 71 recipes',            coins: 400 },
  { id: 'combo_5',    glyph: '🔥', name: 'On Fire',        desc: 'Chain a ×5 combo',                coins: 30 },
  { id: 'combo_8',    glyph: '💥', name: 'Unreal',         desc: 'Chain a ×8 combo',                coins: 80 },
  { id: 'streak_5',   glyph: '🎯', name: 'Unstoppable',    desc: 'Win 5 levels in a row',           coins: 50 },
  { id: 'daily_7',    glyph: '📅', name: 'Loyal',          desc: 'Claim 7 daily gifts in a row',    coins: 100 },
];
export const ACHIEVEMENT_BY_ID: Record<string, AchievementDef> = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a]));

/** Check + reward + toast. Safe to call after any state change. */
export function awardAchievements(): void {
  const fresh = state.checkAchievements();
  for (const id of fresh) {
    const a = ACHIEVEMENT_BY_ID[id]; if (!a) continue;
    state.earn(a.coins);
    toast(`<span style="font-size:22px">${a.glyph}</span> <b>${a.name}</b> · ${a.desc} · ${em('ui_coin', 20)} +${a.coins}`, 3200);
  }
}
