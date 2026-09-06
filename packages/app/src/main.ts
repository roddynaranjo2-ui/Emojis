import '../../ui/src/tokens.css';
import { sfx, music, initHaptics, haptics } from '@emojiverse/game';
import { em } from '@emojiverse/ui';
import { LEVELS, WORLDS, liveEvent, eventLevels, EVENT_BY_ID, EVENT_WEEK_MS, type LevelDef } from '@emojiverse/content';
import { state } from './state';
import { Router, toast, closeModal } from './router';
import { renderSplash } from './screens/splash';
import { renderMap } from './screens/map';
import { renderDex } from './screens/dex';
import { renderLab } from './screens/lab';
import { renderShop } from './screens/shop';
import { renderSettings, applySettings } from './screens/settings';
import { showLevelSheet, showNoLives, showDaily } from './screens/popups';
import { GameScreen } from './screens/game';
import { renderEvent } from './screens/event';
import { initNative } from './native';

// ── Boot ─────────────────────────────────────────────────────────────────────
const root = document.getElementById('app')!;
const router = new Router(root);
const mk = () => document.createElement('section');

applySettings();
void initHaptics();
sfx.onUnlock = (ctx) => { music.attach(ctx); if (router.current === 'game' && currentLevel) music.start(currentLevel.world); };

function applyPalette(p: [string, string]): void {
  document.documentElement.style.setProperty('--w1a', p[0]);
  document.documentElement.style.setProperty('--w1b', p[1]);
  document.querySelector('meta[name=theme-color]')?.setAttribute('content', p[1]);
}
function applyWorldPalette(world: number): void { applyPalette((WORLDS[world - 1] ?? WORLDS[0]!).palette); }

// ── Screens ──────────────────────────────────────────────────────────────────
const splashEl = mk(), mapEl = mk(), gameEl = mk(), dexEl = mk(), labEl = mk(), shopEl = mk(), settingsEl = mk(), eventEl = mk();
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
  onEvent: () => router.go('event'),
  onLives: () => { if (state.save.lives < 5) showNoLives(() => map.refresh(), () => undefined); else toast(`${em('ui_heart', 20)} lives are full`); },
});
const dex = renderDex(dexEl, () => router.go('map'));
const eventScreen = renderEvent(eventEl, { onBack: () => router.go('map'), onStage: (l) => void openLevel(l) });
const lab = renderLab(labEl, () => router.go('map'), (emoji) => { dex.refresh(); toast(`${em('ui_new', 20)} ${em(emoji, 28)} added to your Emoji-dex`); });
const shop = renderShop(shopEl, () => router.go('map'));
const settings = renderSettings(settingsEl, () => router.go('map'), () => { state.reset(); applySettings(); router.go('splash'); location.reload(); });

const game = new GameScreen(gameEl, {
  onExitToMap: () => router.go(currentLevel?.event ? 'event' : 'map'),
  onRetry: (l) => void openLevel(l, true),
  onNext: (l) => {
    if (l.event) { const n = eventLevels(l.event)[l.index]; if (n) void openLevel(n); else router.go('event'); return; }
    const n = LEVELS[l.number]; if (n) void openLevel(n); else { toast(`${em('ui_star', 20)} You finished every level — more worlds coming!`, 2600); router.go('map'); }
  },
  onWin: (l) => { if (l.event) state.recordEventStage(l.event, Math.floor(Date.now() / EVENT_WEEK_MS), l.index); },
});

router.register('splash', splashEl);
router.register('map', mapEl, () => { applyWorldPalette(currentWorldForMap()); map.refresh(); game.destroy(); });
router.register('game', gameEl);
router.register('dex', dexEl, () => dex.refresh());
router.register('lab', labEl, () => lab.refresh());
router.register('shop', shopEl, () => shop.refresh());
router.register('settings', settingsEl, () => settings.refresh());
router.register('event', eventEl, () => { const { event } = liveEvent(); applyPalette(event.palette); eventScreen.refresh(); game.destroy(); });

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
    const home: 'map' | 'event' = level.event ? 'event' : 'map';
    if (!skipSheet) { router.go(router.current === 'game' ? 'game' : home); boosters = await showLevelSheet(level); }
    if (boosters === null) { if (router.current === 'game') router.go(home); return; } // cancelled
    if (!state.spendLife()) { showNoLives(() => void openLevel(level, skipSheet), () => undefined); return; }
    currentLevel = level;
    if (level.event) applyPalette(EVENT_BY_ID[level.event].palette); else applyWorldPalette(level.world);
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
} else if (q.get('event')) {
  const st = Number(q.get('event')); state.save.unlocked = Math.max(state.save.unlocked, 6); state.commit();
  router.go('event'); const l = eventLevels(liveEvent().event.id)[Math.max(0, Math.min(7, st - 1))]!; void openLevel(l, true);
} else if (q.get('screen')) {
  router.go((q.get('screen') as 'map') ?? 'map');
} else {
  applyWorldPalette(currentWorldForMap());
  router.go('splash');
}

// ── Native shell (Android back button, status bar, background audio) ────────
void initNative({
  onBack: () => {
    const modal = document.querySelector<HTMLElement>('.modal');
    if (modal) {
      if (modal.id === 'tutorial') return true;            // must tap "Got it"
      if (modal.id === 'pause') { closeModal('pause'); game.resume(); return true; }
      closeModal(modal.id || 'modal'); return true;
    }
    const scrim = document.getElementById('scrim'); if (scrim) { scrim.click(); return true; }
    if (router.current === 'game') { game.pause(); return true; }
    if (router.current && router.current !== 'map' && router.current !== 'splash') { router.go('map'); return true; }
    return false; // map / splash → OS minimises the app
  },
  onPause: () => { music.stop(); if (router.current === 'game') game.pause(); },
  onResume: () => { if (router.current === 'game' && currentLevel) music.start(currentLevel.event ? EVENT_BY_ID[currentLevel.event].theme : currentLevel.world); },
});

// Debug / E2E hooks
(window as unknown as { __app: unknown }).__app = { state, router, LEVELS, openLevel, game };
