import type { HudLabels } from '@emojiverse/ui';
import { t, type Key } from './i18n';

/** HUD labels in the current locale (the ui package is locale-agnostic). */
export const hudLabels = (): HudLabels => ({
  lives: t('common.lives'), coins: t('common.coins'), moves: t('common.moves'), score: t('common.score'),
  pause: t('hud.pause'), hint: t('hud.hint'), sound: t('hud.sound'), muted: t('hud.muted'),
  objective: t('sheet.goals'), blockers: t('goal.blockers'), dust: t('goal.dust'), cages: t('goal.cages'),
  combos: [2, 3, 4, 5, 6, 7].map((n) => t(`combo.${n}` as Key)),
});
