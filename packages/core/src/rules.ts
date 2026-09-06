import type { RulesConfig } from './resolver';

/** Default scoring. Content-specific `nextTier` is injected by the app from @emojiverse/content. */
export const DEFAULT_RULES: Omit<RulesConfig, 'nextTier'> = {
  basePieceScore: 60,
  comboStep: 0.5, // cascade 1 = ×1.5, cascade 2 = ×2.0 ...
};
