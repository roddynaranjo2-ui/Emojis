/**
 * Save game + economy. Single source of truth, persisted to localStorage on every mutation.
 * Schema is versioned; migrate() upgrades older saves.
 */
export type BoosterKind = 'hammer' | 'shuffle' | 'rocket' | 'bomb' | 'wild';

export interface Save {
  v: 2;
  /** highest unlocked level number (1-based) */
  unlocked: number;
  stars: Record<string, number>;          // levelId → 0..3
  best: Record<string, number>;           // levelId → best score
  losses: Record<string, number>;         // levelId → consecutive losses (mercy)
  lives: number; livesAt: number;         // livesAt = timestamp when next life regenerates
  coins: number;
  boosters: Record<BoosterKind, number>;
  dex: string[];                          // discovered emoji ids
  echoes: Record<string, number>;         // emoji id → echoes revealed 0..3
  labInventory: Record<string, number>;   // emoji id → pieces collected for the lab
  recipesFound: string[];                 // "a+b" keys
  streak: number;                         // consecutive wins
  lastDaily: string;                      // YYYY-MM-DD of last daily reward
  dailyDay: number;                       // 1..7 streak of daily rewards
  settings: { music: boolean; sfx: boolean; haptics: boolean };
  tutorialsSeen: string[];
  firstRun: boolean;
  /** vault events: eventId → { stages cleared, milestones claimed, week stamp } */
  events: Record<string, { cleared: number; claimed: number; week: number }>;
  achievements: string[];
  /** total stats for achievements */
  stats: { wins: number; bombs: number; rockets: number; wilds: number; combosMax: number; mixes: number };
}

export const MAX_LIVES = 5;
export const LIFE_MS = 20 * 60 * 1000;
export const PRICES = { moves5: 90, life: 60, hammer: 120, shuffle: 80, rocket: 150, bomb: 200, wild: 350 } as const;

const KEY = 'emojiverse.save';

function fresh(): Save {
  return {
    v: 2, unlocked: 1, stars: {}, best: {}, losses: {}, lives: MAX_LIVES, livesAt: 0, coins: 150,
    boosters: { hammer: 2, shuffle: 1, rocket: 1, bomb: 0, wild: 0 }, dex: [], echoes: {}, labInventory: {}, recipesFound: [],
    streak: 0, lastDaily: '', dailyDay: 0, settings: { music: true, sfx: true, haptics: true }, tutorialsSeen: [], firstRun: true, events: {}, achievements: [], stats: { wins: 0, bombs: 0, rockets: 0, wilds: 0, combosMax: 0, mixes: 0 },
  };
}

function migrate(raw: unknown): Save {
  const base = fresh();
  if (!raw || typeof raw !== 'object') return base;
  const r = raw as Partial<Save> & { level?: number; muted?: boolean };
  const out: Save = { ...base, ...r, boosters: { ...base.boosters, ...(r.boosters ?? {}) }, settings: { ...base.settings, ...(r.settings ?? {}) } } as Save;
  // v1 → v2
  if (typeof r.level === 'number') out.unlocked = Math.max(1, r.level + 1);
  if (typeof r.muted === 'boolean') { out.settings.music = !r.muted; out.settings.sfx = !r.muted; }
  out.events = { ...(r.events ?? {}) };
  out.achievements = [...(r.achievements ?? [])];
  out.stats = { ...base.stats, ...(r.stats ?? {}) };
  out.v = 2;
  return out;
}

export class GameState {
  save: Save;
  private listeners = new Set<() => void>();

  constructor() {
    let raw: unknown = null;
    try { raw = JSON.parse(localStorage.getItem(KEY) ?? 'null'); } catch { raw = null; }
    this.save = migrate(raw);
    this.tickLives();
  }

  subscribe(fn: () => void): () => void { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  commit(): void { localStorage.setItem(KEY, JSON.stringify(this.save)); for (const l of this.listeners) l(); }
  reset(): void { this.save = fresh(); this.commit(); }

  // ── Lives ────────────────────────────────────────────────────────────────
  tickLives(): void {
    const s = this.save; if (s.lives >= MAX_LIVES) { s.livesAt = 0; return; }
    const now = Date.now();
    if (!s.livesAt) { s.livesAt = now + LIFE_MS; return; }
    while (s.lives < MAX_LIVES && now >= s.livesAt) { s.lives++; s.livesAt += LIFE_MS; }
    if (s.lives >= MAX_LIVES) s.livesAt = 0;
  }
  /** ms until next life, or 0 */
  nextLifeIn(): number { this.tickLives(); return this.save.livesAt ? Math.max(0, this.save.livesAt - Date.now()) : 0; }
  spendLife(): boolean { this.tickLives(); if (this.save.lives <= 0) return false; if (this.save.lives === MAX_LIVES) this.save.livesAt = Date.now() + LIFE_MS; this.save.lives--; this.commit(); return true; }
  refillLives(): void { this.save.lives = MAX_LIVES; this.save.livesAt = 0; this.commit(); }
  addLife(): void { this.tickLives(); this.save.lives = Math.min(MAX_LIVES, this.save.lives + 1); if (this.save.lives === MAX_LIVES) this.save.livesAt = 0; this.commit(); }

  // ── Coins & boosters ─────────────────────────────────────────────────────
  canAfford(n: number): boolean { return this.save.coins >= n; }
  spend(n: number): boolean { if (!this.canAfford(n)) return false; this.save.coins -= n; this.commit(); return true; }
  earn(n: number): void { this.save.coins += n; this.commit(); }
  addBooster(k: BoosterKind, n = 1): void { this.save.boosters[k] = (this.save.boosters[k] ?? 0) + n; this.commit(); }
  useBooster(k: BoosterKind): boolean { if ((this.save.boosters[k] ?? 0) <= 0) return false; this.save.boosters[k]--; this.commit(); return true; }

  // ── Progress ─────────────────────────────────────────────────────────────
  recordWin(levelId: string, levelNumber: number, stars: number, score: number, reward: { coins: number; booster?: BoosterKind }): { firstClear: boolean; coins: number } {
    const s = this.save;
    const firstClear = !(levelId in s.stars) || s.stars[levelId] === 0;
    s.stars[levelId] = Math.max(s.stars[levelId] ?? 0, stars);
    s.best[levelId] = Math.max(s.best[levelId] ?? 0, score);
    s.losses[levelId] = 0;
    s.streak++; s.stats.wins++;
    let coins = firstClear ? reward.coins : Math.round(reward.coins * 0.25);
    coins += stars * 5 + Math.min(s.streak, 5) * 4;
    s.coins += coins;
    if (firstClear && reward.booster) s.boosters[reward.booster] = (s.boosters[reward.booster] ?? 0) + 1;
    if (levelNumber < 1000 && levelNumber >= s.unlocked) s.unlocked = levelNumber + 1; // event stages (≥1000) never advance the saga
    this.commit();
    return { firstClear, coins };
  }
  recordLoss(levelId: string): void { this.save.losses[levelId] = (this.save.losses[levelId] ?? 0) + 1; this.save.streak = 0; this.commit(); }

  // ── Dex & lab ────────────────────────────────────────────────────────────
  discover(emoji: string): boolean { if (this.save.dex.includes(emoji)) return false; this.save.dex.push(emoji); this.commit(); return true; }
  addToLab(emoji: string, n = 1): void { this.save.labInventory[emoji] = (this.save.labInventory[emoji] ?? 0) + n; this.commit(); }
  takeFromLab(emoji: string, n = 1): boolean {
    const have = this.save.labInventory[emoji] ?? 0; if (have < n) return false;
    if (have - n <= 0) delete this.save.labInventory[emoji]; else this.save.labInventory[emoji] = have - n;
    this.commit(); return true;
  }
  revealEcho(emoji: string): number { this.save.echoes[emoji] = Math.min(3, (this.save.echoes[emoji] ?? 0) + 1); this.commit(); return this.save.echoes[emoji]!; }
  recipeFound(key: string): boolean { if (this.save.recipesFound.includes(key)) return false; this.save.recipesFound.push(key); this.commit(); return true; }

  // ── Daily reward ─────────────────────────────────────────────────────────
  dailyAvailable(): boolean { return this.save.lastDaily !== new Date().toISOString().slice(0, 10); }
  claimDaily(): { day: number; coins: number; booster?: BoosterKind } {
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const s = this.save;
    s.dailyDay = s.lastDaily === yesterday ? (s.dailyDay % 7) + 1 : 1;
    s.lastDaily = today;
    const table: Array<{ coins: number; booster?: BoosterKind }> = [{ coins: 50 }, { coins: 60 }, { coins: 70, booster: 'hammer' }, { coins: 80 }, { coins: 100, booster: 'rocket' }, { coins: 120 }, { coins: 200, booster: 'bomb' }];
    const r = table[s.dailyDay - 1]!;
    s.coins += r.coins; if (r.booster) s.boosters[r.booster] = (s.boosters[r.booster] ?? 0) + 1;
    this.commit();
    return { day: s.dailyDay, ...r };
  }

  // ── Vault events ─────────────────────────────────────────────────────────
  eventProgress(id: string, week: number): { cleared: number; claimed: number; week: number } {
    const cur = this.save.events[id];
    if (!cur || cur.week !== week) { const fresh = { cleared: 0, claimed: 0, week }; this.save.events[id] = fresh; return fresh; }
    return cur;
  }
  recordEventStage(id: string, week: number, stage: number): boolean {
    const p = this.eventProgress(id, week);
    if (stage !== p.cleared + 1) return false;
    p.cleared = stage; this.commit(); return true;
  }
  claimEventMilestone(id: string, week: number, index: number, reward: { coins: number; booster?: BoosterKind }): boolean {
    const p = this.eventProgress(id, week);
    if (index !== p.claimed) return false;
    p.claimed = index + 1; this.save.coins += reward.coins;
    if (reward.booster) this.save.boosters[reward.booster] = (this.save.boosters[reward.booster] ?? 0) + 1;
    this.commit(); return true;
  }

  // ── Achievements ─────────────────────────────────────────────────────────
  /** returns the ids newly unlocked (caller shows toasts) */
  checkAchievements(): string[] {
    const s = this.save; const out: string[] = [];
    const starsTotal = Object.values(s.stars).reduce((a, b) => a + b, 0);
    const has = (id: string) => s.achievements.includes(id);
    const give = (id: string) => { if (!has(id)) { s.achievements.push(id); out.push(id); } };
    if (s.stats.wins >= 1) give('first_win');
    if (s.stats.wins >= 25) give('wins_25');
    if (s.stats.wins >= 100) give('wins_100');
    if (starsTotal >= 30) give('stars_30');
    if (starsTotal >= 150) give('stars_150');
    if (starsTotal >= 420) give('stars_all');
    if (s.dex.length >= 10) give('dex_10');
    if (s.dex.length >= 50) give('dex_50');
    if (s.dex.length >= 96) give('dex_launch');
    if (s.dex.length >= 144) give('dex_all');
    if (s.recipesFound.length >= 1) give('mix_1');
    if (s.recipesFound.length >= 25) give('mix_25');
    if (s.recipesFound.length >= 71) give('mix_all');
    if (s.stats.combosMax >= 5) give('combo_5');
    if (s.stats.combosMax >= 8) give('combo_8');
    if (s.streak >= 5) give('streak_5');
    if (s.dailyDay >= 7) give('daily_7');
    if (out.length) this.commit();
    return out;
  }
  worldStars(world: number, levelIds: string[]): number { return levelIds.reduce((a, id) => a + (this.save.stars[id] ?? 0), 0); }

  seenTutorial(id: string): boolean { return this.save.tutorialsSeen.includes(id); }
  markTutorial(id: string): void { if (!this.seenTutorial(id)) { this.save.tutorialsSeen.push(id); this.commit(); } }
}

export const state = new GameState();
