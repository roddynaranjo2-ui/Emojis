import '../../ui/src/tokens.css';
import { sfx, music, initHaptics, haptics } from '@emojiverse/game';
import { em } from '@emojiverse/ui';
import { LEVELS, WORLDS, type LevelDef } from '@emojiverse/content';
import { state } from './state';
import { Router, toast } from './router';
import { renderSplash } from './screens/splash';
import { renderMap } from './screens/map';
import { renderDex } from './screens/dex';
import { renderLab } from './screens/lab';
import { renderShop } from './screens/shop';
import { renderSettings, applySettings } from './screens/settings';
import { showLevelSheet, showNoLives, showDaily } from './screens/popups';
import { GameScreen } from './screens/game';

// ── Boot ─────────────────────────────────────────────────────────────────────
const root = document.getElementById('app')!;
const router = new Router(root);
const mk = () => document.createElement('section');

applySettings();
void initHaptics();
sfx.onUnlock = (ctx) => { music.attach(ctx); if (router.current === 'game' && currentLevel) music.start(currentLevel.world); };

function applyWorldPalette(world: number): void {
  const w = WORLDS[world - 1] ?? WORLDS[0]!;
  document.documentElement.style.setProperty('--w1a', w.palette[0]);
  document.documentElement.style.setProperty('--w1b', w.palette[1]);
  document.querySelector('meta[name=theme-color]')?.setAttribute('content', w.palette[1]);
}

// ── Screens ──────────────────────────────────────────────────────────────────
const splashEl = mk(), mapEl = mk(), gameEl = mk(), dexEl = mk(), labEl = mk(), shopEl = mk(), settingsEl = mk();
let currentLevel: LevelDef | null = null;

const nextLevelDef = (): LevelDef => LEVELS[Math.min(LEVELS.length, state.save.unlocked) - 1]!;
renderSplash(splashEl, () => { sfx.unlock(); haptics.tick(); if (state.save.firstRun) { state.save.firstRun = false; state.commit(); } router.go('map'); },
  state.save.unlocked > 1 ? `Continue · Level ${state.save.unlocked}` : 'Play');

const map = renderMap(mapEl, {
  onLevel: (l) => void openLevel(l),
  onDex: () => router.go('dex'),
  onLab: () => router.go('lab'),
  onShop: () => router.go('shop'),
  onSettings: () => router.go('settings'),
  onDaily: () => { sfx.unlock(); showDaily(); },
  onLives: () => { if (state.save.lives < 5) showNoLives(() => map.refresh(), () => undefined); else toast(`${em('ui_heart', 20)} lives are full`); },
});
const dex = renderDex(dexEl, () => router.go('map'));
const lab = renderLab(labEl, () => router.go('map'), (emoji) => { dex.refresh(); toast(`${em('ui_new', 20)} ${em(emoji, 28)} added to your Emoji-dex`); });
const shop = renderShop(shopEl, () => router.go('map'));
const settings = renderSettings(settingsEl, () => router.go('map'), () => { state.reset(); applySettings(); router.go('splash'); location.reload(); });

const game = new GameScreen(gameEl, {
  onExitToMap: () => router.go('map'),
  onRetry: (l) => void openLevel(l, true),
  onNext: (l) => { const n = LEVELS[l.number]; if (n) void openLevel(n); else { toast(`${em('ui_star', 20)} You finished every level — more worlds coming!`, 2600); router.go('map'); } },
});

router.register('splash', splashEl);
router.register('map', mapEl, () => { applyWorldPalette(currentWorldForMap()); map.refresh(); game.destroy(); });
router.register('game', gameEl);
router.register('dex', dexEl, () => dex.refresh());
router.register('lab', labEl, () => lab.refresh());
router.register('shop', shopEl, () => shop.refresh());
router.register('settings', settingsEl, () => settings.refresh());

function currentWorldForMap(): number { return nextLevelDef().world; }

// ── Level flow: lives → sheet → boosters → play ─────────────────────────────
let opening = false;
async function openLevel(level: LevelDef, skipSheet = false): Promise<void> {
  if (opening) return; opening = true;
  try {
    sfx.unlock();
    state.tickLives();
    if (state.save.lives <= 0) { showNoLives(() => void openLevel(level, skipSheet), () => undefined); return; }
    let boosters: Array<'rocket' | 'bomb' | 'wild'> | null = [];
    if (!skipSheet) { router.go(router.current === 'game' ? 'game' : 'map'); boosters = await showLevelSheet(level); }
    if (boosters === null) { if (router.current === 'game') router.go('map'); return; } // cancelled
    if (!state.spendLife()) { showNoLives(() => void openLevel(level, skipSheet), () => undefined); return; }
    currentLevel = level;
    applyWorldPalette(level.world);
    router.go('game');
    await game.start(level, boosters);
  } finally { opening = false; }
}

// ── Entry ────────────────────────────────────────────────────────────────────
const q = new URLSearchParams(location.search);
const forced = q.get('level');
if (forced) {
  const idx = Math.max(0, Math.min(LEVELS.length - 1, Number(forced) - 1));
  const l = LEVELS[idx]!;
  if (l.number > state.save.unlocked) { state.save.unlocked = l.number; state.commit(); }
  router.go('map');
  void openLevel(l, q.get('sheet') !== '1');
} else if (q.get('screen')) {
  router.go((q.get('screen') as 'map') ?? 'map');
} else {
  applyWorldPalette(currentWorldForMap());
  router.go('splash');
}

// Debug / E2E hooks
(window as unknown as { __app: unknown }).__app = { state, router, LEVELS, openLevel, game };
