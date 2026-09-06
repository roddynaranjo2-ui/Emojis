import Phaser from 'phaser';
import { BoardScene, sfx, haptics, music, type HudBridge, type SceneData } from '@emojiverse/game';
import { Hud, em } from '@emojiverse/ui';
import { EMOJI_BY_ID, WORLDS, LEVELS, NEXT_TIER, EVENT_BY_ID, eventNextTier, type LevelDef } from '@emojiverse/content';
import { DEFAULT_RULES, type RulesConfig } from '@emojiverse/core';
import { state, PRICES } from '../state';
import { openModal, closeModal, toast } from '../router';
import { showWin, showLose, showTutorial } from './popups';
import { awardAchievements } from '../achievements';

export interface GameHandlers {
  onExitToMap(): void;
  onRetry(level: LevelDef): void;
  onNext(level: LevelDef): void;
  /** called right after a win is recorded (before the popup) */
  onWin?(level: LevelDef, stars: number): void;
}

type Progress = Array<{ target?: string; type: string; current: number; amount: number; done: boolean }>;
type PreBooster = 'rocket' | 'bomb' | 'wild';

const BASE_RULES: RulesConfig = { ...DEFAULT_RULES, nextTier: NEXT_TIER };

/**
 * GameScreen — owns the Phaser.Game lifecycle for one level attempt, the HUD,
 * the in-game booster bar (hammer / shuffle) and the win / lose / pause flow.
 * All persistence goes through `state`; all board logic stays inside BoardScene.
 */
export class GameScreen {
  private hud: Hud;
  private game: Phaser.Game | null = null;
  private level: LevelDef | null = null;
  private lastProgress: Progress = [];
  private ended = false;
  private hammerOn = false;
  private boosterBar!: HTMLElement;

  constructor(private readonly el: HTMLElement, private readonly h: GameHandlers) {
    this.hud = new Hud(el, {
      onPause: () => this.pause(),
      onMute: () => { state.save.settings.sfx = !state.save.settings.sfx; state.commit(); sfx.setMuted(!state.save.settings.sfx); this.hud.setMuted(!state.save.settings.sfx); haptics.tick(); },
      onHint: () => { const s = this.scene(); if (!s || s.isBusy()) return; const m = s.debugHint(); this.hud.toast(m ? `${em('ui_hint', 20)} a move is glowing on the board` : `${em('ui_hint', 20)} no moves — the board will shuffle`, 1400); },
    });
    this.buildBoosterBar();
  }

  private scene(): BoardScene | undefined {
    const s = this.game?.scene.getScene('board') as BoardScene | undefined;
    return s && s.sys ? s : undefined;
  }

  private buildBoosterBar(): void {
    const board = this.el.querySelector('#board')!;
    this.boosterBar = document.createElement('div');
    this.boosterBar.id = 'boosters';
    board.appendChild(this.boosterBar);
    this.refreshBoosterBar();
    this.boosterBar.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest<HTMLElement>('.bst');
      if (!btn) return;
      const k = btn.dataset.k as 'hammer' | 'shuffle';
      void this.useInGameBooster(k);
    });
  }

  private refreshBoosterBar(): void {
    const b = state.save.boosters;
    const item = (k: 'hammer' | 'shuffle', e: string, title: string) => {
      const n = b[k] ?? 0;
      return `<button class="bst ${k === 'hammer' && this.hammerOn ? 'on' : ''}" data-k="${k}" title="${title}" ${n <= 0 ? 'disabled' : ''}>${em(e, 28, title)}<span class="cnt ${n ? '' : 'zero'}">${n}</span></button>`;
    };
    this.boosterBar.innerHTML = item('hammer', 'hammer', 'Hammer — smash any piece') + item('shuffle', 'ui_retry', 'Shuffle the board');
  }

  private async useInGameBooster(k: 'hammer' | 'shuffle'): Promise<void> {
    const s = this.scene(); if (!s || this.ended) return;
    if (k === 'hammer') {
      if ((state.save.boosters.hammer ?? 0) <= 0) return;
      this.hammerOn = !this.hammerOn; s.setHammerMode(this.hammerOn); this.refreshBoosterBar();
      this.hud.toast(this.hammerOn ? `${em('hammer', 20)} tap a piece to smash it` : `${em('hammer', 20)} hammer put away`, 1300);
      haptics.tick();
      return;
    }
    if (s.isBusy() || (state.save.boosters.shuffle ?? 0) <= 0) return;
    const ok = await s.useBooster('shuffle');
    if (ok) { state.useBooster('shuffle'); this.refreshBoosterBar(); this.hud.toast(`${em('ui_retry', 20)} shuffled — no move spent`, 1300); }
  }

  // ── Lifecycle ───────────────────────────────────────────────────────────
  async start(level: LevelDef, preBoosters: PreBooster[] = []): Promise<void> {
    this.destroyGame();
    this.level = level; this.ended = false; this.hammerOn = false; this.lastProgress = [];
    const ev = level.event ? EVENT_BY_ID[level.event] : undefined;
    const worldGlyph = ev ? ev.glyph : WORLDS[level.world - 1]!.glyph;
    const rules: RulesConfig = ev ? { ...DEFAULT_RULES, nextTier: eventNextTier(ev) } : BASE_RULES;

    this.hud.setLives(state.save.lives); this.hud.setCoins(state.save.coins); this.hud.setMuted(!state.save.settings.sfx);
    this.refreshBoosterBar();
    music.start(ev ? ev.theme : level.world);

    // consume pre-level boosters (already validated by the level sheet)
    const consumed: PreBooster[] = [];
    for (const k of preBoosters) if (state.useBooster(k)) consumed.push(k);
    this.refreshBoosterBar();

    // one mechanic per tutorial card, only the first time it appears
    if (level.introduces && !state.seenTutorial(level.introduces)) {
      await showTutorial(level.introduces);
      state.markTutorial(level.introduces);
    }

    const showHand = level.number === 1 && !state.seenTutorial('hand');
    this.hud.intro(EMOJI_BY_ID[level.spawnPool[2]!]?.glyph ?? level.glyph, `${worldGlyph} ${level.name}`);

    const bridge: HudBridge = {
      onState: (s) => { this.lastProgress = s.progress; this.hud.update(s); },
      onCombo: (c) => { this.hud.showCombo(c); if (c > state.save.stats.combosMax) { state.save.stats.combosMax = c; state.commit(); } },
      onFirstMove: () => { if (showHand) state.markTutorial('hand'); },
      onBoosterUsed: (kind) => { if (kind === 'hammer') { state.useBooster('hammer'); this.hammerOn = false; this.refreshBoosterBar(); } },
      onDiscover: (emoji) => {
        state.addToLab(emoji);
        if (state.discover(emoji)) {
          const def = EMOJI_BY_ID[emoji];
          const rarity = def ? (['common', 'rare', 'epic', 'legendary'] as const).indexOf(def.rarity) : 0;
          sfx.discover(Math.max(0, rarity) as 0 | 1 | 2 | 3); haptics.discover(Math.max(0, rarity));
          this.hud.toast(`${em('ui_new', 20)} ${em(emoji, 28)} <b>${def?.name ?? emoji}</b> discovered · ${em('ui_dex', 20)} ${state.save.dex.length}/144`, 2200);
        }
      },
      onLevelEnd: (won, stars, score, nearMiss) => this.onEnd(won, stars, score, nearMiss),
    };

    const parent = this.el.querySelector<HTMLElement>('#board')!;
    const data: SceneData = { level, rules, hud: bridge, losses: state.save.losses[level.id] ?? 0, preBoosters: consumed, tutorial: showHand };
    this.game = new Phaser.Game({
      type: Phaser.AUTO, parent, transparent: true, backgroundColor: 'rgba(0,0,0,0)',
      scale: { mode: Phaser.Scale.RESIZE, width: parent.clientWidth || 360, height: parent.clientHeight || 520 },
      render: { antialias: true, pixelArt: false, roundPixels: false, powerPreference: 'high-performance' },
      fps: { target: 60, forceSetTimeOut: false },
      input: { activePointers: 1 },
      scene: [],
    });
    this.game.scene.add('board', BoardScene, true, data);
    (window as unknown as { __scene: unknown }).__scene = () => this.scene();
  }

  private onEnd(won: boolean, stars: number, score: number, nearMiss: boolean): void {
    if (this.ended || !this.level) return;
    this.ended = true;
    const level = this.level;
    music.duck(1200);
    if (won) {
      const before = new Set(state.save.dex);
      const { firstClear, coins } = state.recordWin(level.id, level.number, stars, score, level.reward);
      // world secret: all 60 stars of a world unlocks its legendary
      if (!level.event) {
        const world = WORLDS[level.world - 1]!;
        const ids = LEVELS.filter((l) => l.world === level.world).map((l) => l.id);
        if (state.worldStars(level.world, ids) >= 60 && state.discover(world.secret)) { state.addToLab(world.secret); sfx.discover(3); haptics.discover(3); }
      }
      const newEmojis = state.save.dex.filter((e) => !before.has(e));
      this.h.onWin?.(level, stars);
      setTimeout(awardAchievements, 900);
      this.hud.setCoins(state.save.coins);
      showWin(level, stars, score, coins, firstClear, newEmojis,
        () => this.h.onNext(level),
        () => this.h.onExitToMap());
      return;
    }
    showLose(level, nearMiss, this.lastProgress,
      () => { // +5 moves (coins already spent by the popup)
        const s = this.scene(); if (!s) { this.h.onRetry(level); return; }
        this.ended = false; s.addMoves(5); this.hud.setCoins(state.save.coins);
        this.hud.toast(`${em('ui_moves', 20)} +5 moves — make them count!`, 1500);
      },
      () => { if (!nearMiss) state.recordLoss(level.id); this.h.onRetry(level); },
      () => { if (!nearMiss) state.recordLoss(level.id); this.h.onExitToMap(); });
  }

  pause(): void {
    if (!this.game || this.ended || !this.level) return;
    const s = this.scene(); if (s?.isBusy()) return;
    this.game.scene.pause('board'); music.duck(600);
    const level = this.level;
    const m = openModal(this.el, `
      <span class="hero">⏸️</span>
      <div class="title">Paused</div>
      <div class="sub">${level.event ? `Stage ${level.index}` : `Level ${level.number}`} · ${level.name}</div>
      <button class="ebtn cta" id="p-resume" style="width:100%">${em('ui_play', 28)}<span>Resume</span></button>
      <div class="row" style="margin-top:10px">
        <button class="ebtn cta ghost" id="p-map">${em('ui_map', 28, 'Map')}<span>Quit</span></button>
        <button class="ebtn cta ghost grow" id="p-retry">${em('ui_retry', 28, 'Retry')}<span>Restart</span></button>
      </div>`, { id: 'pause', dismissable: false });
    m.querySelector('#p-resume')!.addEventListener('click', () => { closeModal('pause'); this.game?.scene.resume('board'); });
    m.querySelector('#p-retry')!.addEventListener('click', () => { closeModal('pause'); this.ended = true; this.h.onRetry(level); });
    m.querySelector('#p-map')!.addEventListener('click', () => { closeModal('pause'); this.ended = true; toast(`${em('ui_heart', 20)} life kept — see you on the map`); this.h.onExitToMap(); });
  }

  /** Resume a paused board (native back button closes the pause modal). */
  resume(): void { this.game?.scene.resume('board'); }

  /** Called when navigating away; frees the WebGL context. */
  destroy(): void { this.destroyGame(); music.stop(); }

  private destroyGame(): void {
    if (this.game) { try { this.game.destroy(true); } catch { /* ignore */ } this.game = null; }
    (window as unknown as { __scene: unknown }).__scene = () => undefined;
  }

  /** Coins price shown for the +5 moves offer (used by tests). */
  static readonly EXTRA_MOVES_PRICE = PRICES.moves5;
}
