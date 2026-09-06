import Phaser from 'phaser';
import { LevelRunner, type LevelConfig, type RulesConfig, type ResolveEvent, type Pos, type Piece } from '@emojiverse/core';
import { EMOJI_BY_ID, FAMILIES } from '@emojiverse/content';
import { Vfx, type ParticleTheme } from './vfx';
import { sfx } from './audio';
import { haptics } from './haptics';

export const ATLAS = 'emojis';

/* Timings (ms) — "fast switcher" standard (Royal Match / Toon Blast). */
export const T = {
  swap: 120, swapBad: 90, clear: 110, clearSpecial: 90, fallPerRow: 38, fallMin: 70,
  evolvePop: 160, specialPop: 190, matchPulse: 60, hintDelay: 3500, bombPause: 90, rocketPause: 110, megaPause: 220,
};

export interface HudBridge {
  onState(s: { movesLeft: number; score: number; progress: Array<{ target?: string; type: string; current: number; amount: number; done: boolean }> }): void;
  onCombo(combo: number): void;
  onLevelEnd(won: boolean, stars: number, score: number, nearMiss: boolean): void;
  onDiscover?(emoji: string): void;
  onBoosterUsed?(kind: string): void;
  onFirstMove?(): void;
}

export interface SceneData {
  level: LevelConfig; rules: RulesConfig; hud: HudBridge; losses?: number;
  preBoosters?: Array<'rocket' | 'bomb' | 'wild'>;
  tutorial?: boolean;
}

const SPECIAL_FRAME: Record<string, string> = { bomb: 'sp_bomb', rocket_h: 'sp_rocket', rocket_v: 'sp_rocket', wild: 'sp_wild' };
const FAMILY_THEME: Record<string, ParticleTheme> = Object.fromEntries(FAMILIES.map((f) => [f.id, f.particle]));

/**
 * BoardScene v2 — replays the core event log. Input model = genre standard:
 *  short SWIPE swaps immediately · TAP select + TAP neighbour swaps · TAP a bomb/rocket fires it · hammer mode.
 */
export class BoardScene extends Phaser.Scene {
  private runner!: LevelRunner;
  private hud!: HudBridge;
  private vfx!: Vfx;
  private sceneData!: SceneData;

  private cell = 56; private ox = 0; private oy = 0; private frameSize = 64;
  private sprites = new Map<number, Phaser.GameObjects.Image>();
  private cages = new Map<string, Phaser.GameObjects.Image>();
  private blockers = new Map<string, Phaser.GameObjects.Image>();
  private dustG!: Phaser.GameObjects.Graphics;
  private bg!: Phaser.GameObjects.Graphics;
  private idle = new Map<number, Phaser.Tweens.Tween>();
  private busy = false;
  private pressed: Pos | null = null; private pressXY = { x: 0, y: 0 }; private pressSprite: Phaser.GameObjects.Image | null = null;
  private selected: Pos | null = null; private selectRing?: Phaser.GameObjects.Image;
  private hintTimer?: Phaser.Time.TimerEvent; private hintTweens: Phaser.Tweens.Tween[] = [];
  private hammerMode = false;
  private tutorialHand?: Phaser.GameObjects.Text;
  private movesMade = 0;

  constructor() { super('board'); }

  init(data: SceneData): void {
    this.sceneData = data; this.hud = data.hud;
    this.runner = new LevelRunner(data.level, data.rules, data.losses ?? 0);
  }

  preload(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const suffix = dpr > 1.3 ? '@2x' : '@1x';
    if (!this.textures.exists(ATLAS)) this.load.atlas(ATLAS, `atlas/emojis${suffix}.png`, `atlas/emojis${suffix}.json`);
  }

  create(): void {
    this.frameSize = this.textures.get(ATLAS).get('water')?.width ?? 64;
    Vfx.generateTextures(this);
    this.makeTextures();
    this.vfx = new Vfx(this, ATLAS, 64 / this.frameSize);
    this.layout();
    this.bg = this.add.graphics().setDepth(0);
    this.dustG = this.add.graphics().setDepth(1);
    this.drawBoard();
    this.vfx.create();
    this.spawnAll();
    this.setupInput();
    this.pushHud();
    this.scale.on('resize', () => { this.layout(); this.drawBoard(); this.relayoutAll(); });
    this.cameras.main.fadeIn(250, 255, 255, 255);
    this.time.delayedCall(450, () => void this.applyPreBoosters());
  }

  // ── Public API ───────────────────────────────────────────────────────────
  setHammerMode(on: boolean): void { this.hammerMode = on; this.clearSelection(); if (on) this.cancelHint(); else this.scheduleHint(); }
  isBusy(): boolean { return this.busy; }
  async useBooster(kind: 'shuffle' | 'rocket' | 'bomb' | 'wild'): Promise<boolean> {
    if (this.busy || this.runner.status !== 'playing') return false;
    this.busy = true;
    const res = this.runner.useBooster(kind === 'rocket' ? (Math.random() < 0.5 ? 'rocket_h' : 'rocket_v') : kind);
    if (res) await this.replay(res.events);
    this.busy = false; this.pushHud(); this.checkEnd();
    return !!res;
  }
  addMoves(n: number): void { this.runner.addMoves(n); this.pushHud(); this.scheduleHint(); }
  get status() { return this.runner.status; }
  debugHint() { const m = this.runner.hint(); return m ? { ...m, fromXY: this.xy(m.from), toXY: this.xy(m.to) } : undefined; }
  debugState() { return { moves: this.runner.movesLeft, score: this.runner.score, status: this.runner.status, board: this.runner.board.toAscii() }; }
  async debugPlayHint(): Promise<boolean> { const m = this.runner.hint(); if (!m || this.busy) return false; await this.doMove(m.from, m.to); return true; }

  private async applyPreBoosters(): Promise<void> {
    for (const b of this.sceneData.preBoosters ?? []) await this.useBooster(b);
    if (this.sceneData.tutorial) this.showTutorialHand(); else this.scheduleHint();
  }

  // ── Layout ───────────────────────────────────────────────────────────────
  private layout(): void {
    const { width, height } = this.scale; const b = this.runner.board;
    const reserve = 84; // bottom strip for the in-game booster bar
    this.cell = Math.floor(Math.min((width - 24) / b.cols, (height - 20 - reserve) / b.rows));
    this.ox = Math.round((width - this.cell * b.cols) / 2);
    this.oy = Math.round((height - reserve - this.cell * b.rows) / 2);
  }
  private xy(p: Pos) { return { x: this.ox + p.col * this.cell + this.cell / 2, y: this.oy + p.row * this.cell + this.cell / 2 }; }
  private posFromXY(x: number, y: number): Pos | null {
    const p = { col: Math.floor((x - this.ox) / this.cell), row: Math.floor((y - this.oy) / this.cell) };
    return this.runner.board.inBounds(p) && !this.runner.board.cell(p).hole ? p : null;
  }
  private pieceScale(): number { return (this.cell * 0.8) / this.frameSize; }

  private makeTextures(): void {
    if (this.textures.exists('sel_ring')) return;
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    g.lineStyle(6, 0xffffff, 1); g.strokeRoundedRect(3, 3, 122, 122, 28); g.generateTexture('sel_ring', 128, 128);
    g.clear(); g.lineStyle(7, 0xcbd5e1, 1); g.strokeRoundedRect(6, 6, 116, 116, 22);
    for (let i = 1; i < 4; i++) { g.lineStyle(5, 0xcbd5e1, 0.95); g.lineBetween(6 + i * 29, 8, 6 + i * 29, 120); }
    g.lineStyle(5, 0x94a3b8, 1); g.lineBetween(8, 64, 120, 64); g.generateTexture('cage_tex', 128, 128);
    g.destroy();
  }

  private drawBoard(): void {
    const g = this.bg; g.clear();
    const b = this.runner.board; const w = this.cell * b.cols, h = this.cell * b.rows;
    g.fillStyle(0x140f2b, 0.55); g.fillRoundedRect(this.ox - 10, this.oy - 10, w + 20, h + 20, 24);
    g.lineStyle(2, 0xffffff, 0.14); g.strokeRoundedRect(this.ox - 10, this.oy - 10, w + 20, h + 20, 24);
    for (let r = 0; r < b.rows; r++) for (let c = 0; c < b.cols; c++) {
      if (b.cell({ col: c, row: r }).hole) continue;
      g.fillStyle(0xffffff, (r + c) % 2 === 0 ? 0.09 : 0.05);
      g.fillRoundedRect(this.ox + c * this.cell + 2, this.oy + r * this.cell + 2, this.cell - 4, this.cell - 4, 12);
    }
    this.drawDust();
  }

  private drawDust(): void {
    const g = this.dustG; g.clear(); const b = this.runner.board;
    for (let r = 0; r < b.rows; r++) for (let c = 0; c < b.cols; c++) {
      const d = b.cell({ col: c, row: r }).dust; if (!d) continue;
      const x = this.ox + c * this.cell + 3, y = this.oy + r * this.cell + 3, s = this.cell - 6;
      g.fillStyle(d === 2 ? 0x7c3aed : 0xa78bfa, d === 2 ? 0.6 : 0.42); g.fillRoundedRect(x, y, s, s, 12);
      g.lineStyle(2, 0xffffff, 0.4); g.strokeRoundedRect(x, y, s, s, 12);
      if (d === 2) { g.lineStyle(2, 0xffffff, 0.3); g.strokeRoundedRect(x + 6, y + 6, s - 12, s - 12, 8); }
    }
  }

  private relayoutAll(): void {
    const b = this.runner.board;
    for (let r = 0; r < b.rows; r++) for (let c = 0; c < b.cols; c++) {
      const p = { col: c, row: r }; const { x, y } = this.xy(p);
      const pc = b.pieceAt(p); if (pc) this.sprites.get(pc.uid)?.setPosition(x, y).setScale(this.pieceScale());
      this.blockers.get(`${c},${r}`)?.setPosition(x, y).setScale(this.pieceScale() * 0.95);
      this.cages.get(`${c},${r}`)?.setPosition(x, y).setScale((this.cell * 0.96) / 128);
    }
  }

  // ── Sprites ──────────────────────────────────────────────────────────────
  private frameFor(piece: Piece): string { return piece.special ? SPECIAL_FRAME[piece.special]! : piece.emoji; }
  private baseAngle(piece: Piece): number { return piece.special === 'rocket_v' ? -45 : piece.special === 'rocket_h' ? 45 : 0; }

  private makeSprite(piece: Piece, p: Pos): Phaser.GameObjects.Image {
    const { x, y } = this.xy(p);
    const s = this.add.image(x, y, ATLAS, this.frameFor(piece)).setScale(this.pieceScale()).setDepth(10).setAngle(this.baseAngle(piece));
    s.setData('uid', piece.uid); this.sprites.set(piece.uid, s);
    return s;
  }

  private startIdle(s: Phaser.GameObjects.Image, piece: Piece): void {
    this.stopIdle(piece.uid);
    if (!s.active) return;
    const base = this.pieceScale(); s.setScale(base); s.setAngle(this.baseAngle(piece));
    if (piece.special) { this.idle.set(piece.uid, this.tweens.add({ targets: s, scale: base * 1.1, duration: 480, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' })); return; }
    const t = this.tweens.add({
      targets: s, scaleX: base * 1.035, scaleY: base * 0.975, angle: Phaser.Math.Between(-3, 3), duration: 900 + Math.random() * 500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: Math.random() * 900,
      onRepeat: () => { if (Math.random() < 0.1 && !this.busy && s.active) this.tweens.add({ targets: s, scaleY: base * 0.84, scaleX: base * 1.1, duration: 60, yoyo: true }); },
    });
    this.idle.set(piece.uid, t);
  }
  private stopIdle(uid: number): void { this.idle.get(uid)?.stop(); this.idle.delete(uid); }

  private spawnAll(): void {
    const b = this.runner.board;
    for (let r = 0; r < b.rows; r++) for (let c = 0; c < b.cols; c++) {
      const p = { col: c, row: r }; const cell = b.cell(p);
      if (cell.hole) continue;
      if (cell.piece) { const piece = cell.piece; const s = this.makeSprite(piece, p); s.setScale(0); this.tweens.add({ targets: s, scale: this.pieceScale(), duration: 220, ease: 'Back.easeOut', delay: (r * b.cols + c) * 9, onComplete: () => this.startIdle(s, piece) }); }
      if (cell.blocker) this.makeBlocker(p, cell.blocker.kind);
      if (cell.caged) this.makeCage(p);
    }
  }
  private makeBlocker(p: Pos, kind: 'rock' | 'ice'): void {
    const { x, y } = this.xy(p);
    this.blockers.set(`${p.col},${p.row}`, this.add.image(x, y, ATLAS, kind === 'rock' ? 'bl_rock' : 'bl_ice').setScale(this.pieceScale() * 0.95).setDepth(9));
  }
  private makeCage(p: Pos): void {
    const { x, y } = this.xy(p);
    this.cages.set(`${p.col},${p.row}`, this.add.image(x, y, 'cage_tex').setScale((this.cell * 0.96) / 128).setDepth(15));
  }

  // ── Input ────────────────────────────────────────────────────────────────
  private setupInput(): void {
    this.input.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
      sfx.unlock();
      if (this.busy || this.runner.status !== 'playing') return;
      const p = this.posFromXY(ptr.x, ptr.y); if (!p) { this.clearSelection(); return; }
      this.cancelHint();
      if (this.hammerMode) { void this.doHammer(p); return; }
      const piece = this.runner.board.pieceAt(p); if (!piece) return;
      if (this.selected && this.isAdjacent(this.selected, p)) { const from = this.selected; this.clearSelection(); void this.doMove(from, p); return; }
      this.pressed = p; this.pressXY = { x: ptr.x, y: ptr.y };
      this.pressSprite = this.sprites.get(piece.uid) ?? null;
      if (this.pressSprite && this.runner.board.isMovable(p)) {
        this.stopIdle(piece.uid); this.pressSprite.setDepth(20);
        this.tweens.add({ targets: this.pressSprite, scale: this.pieceScale() * 1.15, duration: 80, ease: 'Back.easeOut' });
      }
      sfx.tap(); haptics.tick();
    });

    this.input.on('pointermove', (ptr: Phaser.Input.Pointer) => {
      if (!this.pressed || !this.pressSprite || this.busy) return;
      const dx = ptr.x - this.pressXY.x, dy = ptr.y - this.pressXY.y; const dist = Math.hypot(dx, dy);
      const k = Math.min(dist, this.cell * 0.4) / (this.cell * 0.4);
      const home = this.xy(this.pressed); const horizontal = Math.abs(dx) > Math.abs(dy);
      if (this.runner.board.isMovable(this.pressed)) {
        this.pressSprite.setPosition(home.x + (dx / (dist || 1)) * k * this.cell * 0.22, home.y + (dy / (dist || 1)) * k * this.cell * 0.22);
        const base = this.pieceScale() * 1.15, stretch = 1 + k * 0.28, squash = 1 - k * 0.2;
        this.pressSprite.setScale(base * (horizontal ? stretch : squash), base * (horizontal ? squash : stretch)).setAngle(Phaser.Math.Clamp(dx * 0.2, -12, 12));
      }
      if (dist > this.cell * 0.22) {
        const dir = horizontal ? { col: Math.sign(dx), row: 0 } : { col: 0, row: Math.sign(dy) };
        const from = this.pressed, to = { col: from.col + dir.col, row: from.row + dir.row };
        this.pressed = null; this.pressSprite = null; this.clearSelection();
        if (this.runner.board.inBounds(to) && this.runner.board.pieceAt(to)) { sfx.drag(); void this.doMove(from, to); } else this.snapBack(from);
      }
    });

    const up = (ptr: Phaser.Input.Pointer) => {
      if (!this.pressed) return;
      const p = this.pressed; this.pressed = null; this.pressSprite = null;
      const piece = this.runner.board.pieceAt(p);
      const moved = Math.hypot(ptr.x - this.pressXY.x, ptr.y - this.pressXY.y);
      if (piece?.special && piece.special !== 'wild' && moved < 8 && !this.selected) { void this.doTapSpecial(p); return; }
      this.snapBack(p);
      if (moved < 8 && this.runner.board.isMovable(p)) {
        if (this.selected && this.selected.col === p.col && this.selected.row === p.row) this.clearSelection(); else this.select(p);
      }
    };
    this.input.on('pointerup', up); this.input.on('pointerupoutside', up);
  }

  private isAdjacent(a: Pos, b: Pos) { return Math.abs(a.col - b.col) + Math.abs(a.row - b.row) === 1; }
  private select(p: Pos): void {
    this.selected = p; const { x, y } = this.xy(p);
    this.selectRing?.destroy();
    this.selectRing = this.add.image(x, y, 'sel_ring').setScale(this.cell / 128).setDepth(8).setAlpha(0.9);
    this.tweens.add({ targets: this.selectRing, alpha: 0.5, scale: (this.cell * 1.06) / 128, duration: 420, yoyo: true, repeat: -1 });
  }
  private clearSelection(): void { this.selected = null; this.selectRing?.destroy(); this.selectRing = undefined; }

  private snapBack(p: Pos): void {
    const piece = this.runner.board.pieceAt(p); if (!piece) return;
    const s = this.sprites.get(piece.uid); if (!s) return;
    const { x, y } = this.xy(p); s.setDepth(10);
    this.tweens.add({ targets: s, x, y, angle: this.baseAngle(piece), scaleX: this.pieceScale(), scaleY: this.pieceScale(), duration: 150, ease: 'Back.easeOut', onComplete: () => this.startIdle(s, piece) });
    this.scheduleHint();
  }

  // ── Actions ──────────────────────────────────────────────────────────────
  private async doMove(from: Pos, to: Pos): Promise<void> {
    this.busy = true; this.hideTutorialHand();
    const res = this.runner.tryMove({ from, to });
    if (res) { if (res.events[0]?.type === 'swap' && res.events[0].valid && this.movesMade++ === 0) this.hud.onFirstMove?.(); await this.replay(res.events); }
    this.busy = false; this.pushHud(); this.checkEnd();
  }
  private async doTapSpecial(p: Pos): Promise<void> {
    this.busy = true;
    const res = this.runner.tapSpecial(p);
    if (res) { haptics.impact('medium'); await this.replay(res.events); }
    this.busy = false; this.pushHud(); this.checkEnd();
  }
  private async doHammer(p: Pos): Promise<void> {
    this.busy = true; this.hammerMode = false;
    const { x, y } = this.xy(p);
    const hammer = this.add.image(x + 30, y - 60, ATLAS, 'hammer').setScale(this.pieceScale() * 1.2).setDepth(60).setAngle(-40);
    await this.tweenP({ targets: hammer, angle: 30, x: x + 8, y: y - 10, duration: 160, ease: 'Quad.easeIn' });
    hammer.destroy(); this.vfx.shockwave(x, y, 0xffffff); this.vfx.burst('smoke', x, y, 10); this.vfx.shake(0.25); sfx.blockerHit(true); haptics.impact('heavy');
    const res = this.runner.useBooster('hammer', p);
    if (res) await this.replay(res.events);
    this.hud.onBoosterUsed?.('hammer');
    this.busy = false; this.pushHud(); this.checkEnd();
  }

  private checkEnd(): void {
    if (this.runner.status === 'playing') { this.scheduleHint(); return; }
    const won = this.runner.status === 'won';
    if (won) { sfx.win(); haptics.success(); this.celebrate(); } else { sfx.lose(); haptics.error(); }
    this.time.delayedCall(won ? 1300 : 500, () => this.hud.onLevelEnd(won, this.runner.stars(), this.runner.score, this.runner.isNearMiss()));
  }

  private wait(ms: number) { return new Promise<void>((r) => this.time.delayedCall(ms, r)); }
  private tweenP(cfg: Phaser.Types.Tweens.TweenBuilderConfig) { return new Promise<void>((resolve) => this.tweens.add({ ...cfg, onComplete: () => { (cfg.onComplete as (() => void) | undefined)?.(); resolve(); } })); }

  // ── Replay ───────────────────────────────────────────────────────────────
  private async replay(events: ResolveEvent[]): Promise<void> {
    let comboShown = 0;
    for (const ev of events) {
      switch (ev.type) {
        case 'swap': await this.animSwap(ev.a, ev.b, ev.valid); break;
        case 'match': {
          sfx.match(ev.cascade, ev.group.cells.length); haptics.match(ev.cascade);
          if (ev.cascade + 1 > comboShown) { comboShown = ev.cascade + 1; this.hud.onCombo(comboShown); }
          for (const c of ev.group.cells) { const s = this.spriteAt(c); if (s) this.tweens.add({ targets: s, scale: this.pieceScale() * 1.22, duration: T.matchPulse, yoyo: true }); }
          break;
        }
        case 'synergy': await this.animSynergy(ev); break;
        case 'special_fire': await this.animSpecialFire(ev); break;
        case 'apex_burst': { sfx.apex(); haptics.special(0.5); const { x, y } = this.xy(ev.at); this.vfx.shockwave(x, y, 0xffd166); this.vfx.burst(this.themeFor(ev.emoji), x, y, 28); this.vfx.shake(0.4); await this.wait(70); break; }
        case 'blocker_hit': {
          const key = `${ev.at.col},${ev.at.row}`; const s = this.blockers.get(key); sfx.blockerHit(ev.remaining <= 0);
          if (s) {
            if (ev.remaining <= 0) { const { x, y } = this.xy(ev.at); this.vfx.burst(ev.kind === 'ice' ? 'water' : 'smoke', x, y, 14); this.blockers.delete(key); this.tweens.add({ targets: s, scale: 0, angle: 90, duration: 160, ease: 'Back.easeIn', onComplete: () => s.destroy() }); }
            else { this.tweens.add({ targets: s, x: s.x + 3, duration: 35, yoyo: true, repeat: 3 }); s.setAlpha(0.7); }
          }
          break;
        }
        case 'dust_clear': { const { x, y } = this.xy(ev.at); this.vfx.burst('sparkle', x, y, 8); this.drawDust(); break; }
        case 'cage_break': {
          const key = `${ev.at.col},${ev.at.row}`; const c = this.cages.get(key);
          if (c) { this.cages.delete(key); const { x, y } = this.xy(ev.at); this.vfx.burst('smoke', x, y, 8); sfx.blockerHit(true); this.tweens.add({ targets: c, scale: c.scale * 1.3, alpha: 0, angle: 15, duration: 180, onComplete: () => c.destroy() }); }
          break;
        }
        case 'clear': await this.animClear(ev); break;
        case 'score': {
          if (ev.delta > 0) {
            const combo = ev.combo; const color = combo >= 4 ? '#ff5cf0' : combo >= 3 ? '#ffb020' : combo >= 2 ? '#7cf' : '#fff';
            const cx = this.ox + (this.cell * this.runner.board.cols) / 2;
            this.vfx.floatText(cx + Phaser.Math.Between(-30, 30), this.oy + this.cell * 1.6, `+${ev.delta}${combo > 1 ? `  ×${combo}` : ''}`, color, combo > 1 ? 24 + combo * 2 : 20);
          }
          break;
        }
        case 'evolve': {
          sfx.evolve(ev.cascade); haptics.evolve();
          const { x, y } = this.xy(ev.at); const s = this.makeSprite(ev.piece, ev.at); s.setScale(0).setDepth(30);
          this.vfx.burst(this.themeFor(ev.to), x, y, 16); this.vfx.shockwave(x, y, 0xffffff);
          await this.tweenP({ targets: s, scale: this.pieceScale() * 1.3, duration: T.evolvePop, ease: 'Back.easeOut' });
          this.tweens.add({ targets: s, scale: this.pieceScale(), duration: 120, onComplete: () => { s.setDepth(10); this.startIdle(s, ev.piece); } });
          this.hud.onDiscover?.(ev.to);
          break;
        }
        case 'spawn_special': {
          sfx.spawnSpecial(); const { x, y } = this.xy(ev.at);
          const s = this.makeSprite(ev.piece, ev.at); s.setScale(0).setDepth(30); this.vfx.burst('sparkle', x, y, 18);
          await this.tweenP({ targets: s, scale: this.pieceScale() * 1.35, angle: this.baseAngle(ev.piece) + 360, duration: T.specialPop, ease: 'Back.easeOut' });
          this.tweens.add({ targets: s, scale: this.pieceScale(), angle: this.baseAngle(ev.piece), duration: 100, onComplete: () => { s.setDepth(10); this.startIdle(s, ev.piece); } });
          break;
        }
        case 'gravity': await this.animGravity(ev.falls); break;
        case 'refill': await this.animRefill(ev.spawns); break;
        case 'shuffle': await this.animShuffle(); break;
        case 'booster': case 'collect': case 'level_end': break;
      }
    }
  }

  private spriteAt(p: Pos): Phaser.GameObjects.Image | undefined {
    const { x, y } = this.xy(p);
    for (const s of this.sprites.values()) if (Math.abs(s.x - x) < 3 && Math.abs(s.y - y) < 3) return s;
    return undefined;
  }
  private themeFor(emoji: string): ParticleTheme { const d = EMOJI_BY_ID[emoji]; return d ? FAMILY_THEME[d.family] ?? 'sparkle' : 'sparkle'; }

  private async animSwap(a: Pos, b: Pos, valid: boolean): Promise<void> {
    const pa = this.spriteAt(a), pb = this.spriteAt(b); if (!pa || !pb) return;
    const A = this.xy(a), B = this.xy(b); pa.setDepth(20); pb.setDepth(10);
    const pieceA = this.runner.board.pieceAt(valid ? b : a), pieceB = this.runner.board.pieceAt(valid ? a : b);
    if (!valid) {
      sfx.swapBad(); haptics.error();
      await Promise.all([
        this.tweenP({ targets: pa, x: B.x, y: B.y, duration: T.swapBad, yoyo: true, ease: 'Quad.easeInOut' }),
        this.tweenP({ targets: pb, x: A.x, y: A.y, duration: T.swapBad, yoyo: true, ease: 'Quad.easeInOut' }),
      ]);
      pa.setDepth(10); if (pieceA) this.startIdle(pa, pieceA); if (pieceB) this.startIdle(pb, pieceB);
      return;
    }
    await Promise.all([
      this.tweenP({ targets: pa, x: B.x, y: B.y, angle: pieceA ? this.baseAngle(pieceA) : 0, scaleX: this.pieceScale(), scaleY: this.pieceScale(), duration: T.swap, ease: 'Quad.easeOut' }),
      this.tweenP({ targets: pb, x: A.x, y: A.y, duration: T.swap, ease: 'Quad.easeOut' }),
    ]);
    pa.setDepth(10);
  }

  private async animSynergy(ev: Extract<ResolveEvent, { type: 'synergy' }>): Promise<void> {
    const sa = this.spriteAt(ev.a), sb = this.spriteAt(ev.b); const C = this.xy(ev.center);
    const targets = [sa, sb].filter(Boolean) as Phaser.GameObjects.Image[];
    for (const s of targets) { this.stopIdle(s.getData('uid')); s.setDepth(40); }
    if (ev.kind === 'bomb_rocket') {
      haptics.impact('medium');
      this.time.addEvent({ delay: 30, repeat: 10, callback: () => { for (const s of targets) this.vfx.burst('fire', s.x, s.y + 10, 3); } });
      await Promise.all(targets.map((s) => this.tweenP({ targets: s, x: C.x, y: C.y, angle: s.angle + 720, scale: this.pieceScale() * 1.6, duration: 360, ease: 'Cubic.easeIn' })));
    } else {
      await Promise.all(targets.map((s) => this.tweenP({ targets: s, x: C.x, y: C.y, scale: this.pieceScale() * 1.5, duration: 140, ease: 'Back.easeIn' })));
    }
    for (const s of targets) { this.sprites.delete(s.getData('uid')); s.destroy(); }
  }

  private async animSpecialFire(ev: Extract<ResolveEvent, { type: 'special_fire' }>): Promise<void> {
    const { x, y } = this.xy(ev.at);
    switch (ev.kind) {
      case 'mega_cross':
        sfx.mega(); haptics.mega(); this.vfx.flashScreen(0.8, 240);
        this.vfx.shockwave(x, y, 0xffffff); this.time.delayedCall(70, () => this.vfx.shockwave(x, y, 0xff9f1c));
        this.vfx.burst('fire', x, y, 80); this.vfx.burst('sparkle', x, y, 50); this.vfx.burst('star', x, y, 36);
        this.laser(ev.at.row, true); this.laser(ev.at.col, false); this.vfx.shake(1);
        await this.wait(T.megaPause); break;
      case 'bomb': case 'double_bomb':
        if (ev.area.length > 1) { sfx.bomb(ev.magnitude); haptics.special(ev.magnitude); this.vfx.shockwave(x, y, 0xff9f1c); this.vfx.burst('fire', x, y, ev.kind === 'double_bomb' ? 50 : 28); this.vfx.burst('smoke', x, y, 8); this.vfx.shake(ev.magnitude); await this.wait(T.bombPause); }
        break;
      case 'rocket_h': case 'rocket_v': case 'double_rocket':
        sfx.rocket(); haptics.special(ev.magnitude);
        if (ev.kind !== 'rocket_v') this.laser(ev.at.row, true);
        if (ev.kind !== 'rocket_h') this.laser(ev.at.col, false);
        this.vfx.shake(ev.magnitude); await this.wait(T.rocketPause); break;
      case 'wild_sweep':
        sfx.wild(); haptics.special(ev.magnitude);
        for (const p of ev.area) { const q = this.xy(p); this.time.delayedCall(Math.random() * 100, () => this.vfx.burst('star', q.x, q.y, 5)); }
        this.vfx.shake(ev.magnitude * 0.7); await this.wait(160); break;
      default: this.vfx.shake(ev.magnitude); await this.wait(60);
    }
  }

  private laser(index: number, horizontal: boolean): void {
    const b = this.runner.board; const len = horizontal ? this.cell * b.cols : this.cell * b.rows;
    const cx = horizontal ? this.ox + len / 2 : this.ox + index * this.cell + this.cell / 2;
    const cy = horizontal ? this.oy + index * this.cell + this.cell / 2 : this.oy + len / 2;
    const r = this.add.rectangle(cx, cy, horizontal ? 4 : this.cell * 0.75, horizontal ? this.cell * 0.75 : 4, 0xffffff, 0.95).setDepth(60).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: r, [horizontal ? 'scaleX' : 'scaleY']: len / 4, alpha: 0, duration: 200, ease: 'Quad.easeOut', onComplete: () => r.destroy() });
    for (let i = 0; i < (horizontal ? b.cols : b.rows); i++) { const q = this.xy(horizontal ? { col: i, row: index } : { col: index, row: i }); this.time.delayedCall(i * 12, () => this.vfx.burst('sparkle', q.x, q.y, 3)); }
  }

  private async animClear(ev: Extract<ResolveEvent, { type: 'clear' }>): Promise<void> {
    const ps: Promise<void>[] = [];
    for (const { pos, piece } of ev.cells) {
      const s = this.sprites.get(piece.uid); if (!s) continue;
      this.stopIdle(piece.uid); this.sprites.delete(piece.uid);
      const { x, y } = this.xy(pos); this.vfx.burst(this.themeFor(piece.emoji), x, y, ev.source === 'special' ? 4 : 7);
      ps.push(this.tweenP({ targets: s, scale: this.pieceScale() * 1.25, alpha: 0, duration: ev.source === 'special' ? T.clearSpecial : T.clear, ease: 'Back.easeIn', onComplete: () => s.destroy() }));
    }
    await Promise.all(ps);
  }

  private async animGravity(falls: Array<{ from: Pos; to: Pos; uid: number }>): Promise<void> {
    if (!falls.length) return;
    sfx.fall();
    await Promise.all(falls.map((f) => {
      const s = this.sprites.get(f.uid); if (!s) return Promise.resolve();
      this.stopIdle(f.uid); const { x, y } = this.xy(f.to); const dist = f.to.row - f.from.row;
      return this.tweenP({ targets: s, x, y, duration: T.fallMin + dist * T.fallPerRow, ease: 'Quad.easeIn' }).then(() => {
        this.tweens.add({ targets: s, scaleY: this.pieceScale() * 0.86, scaleX: this.pieceScale() * 1.1, duration: 50, yoyo: true, onComplete: () => { const piece = this.runner.board.pieceAt(f.to); if (piece) this.startIdle(s, piece); } });
      });
    }));
  }

  private async animRefill(spawns: Array<{ at: Pos; piece: Piece; fromRow: number }>): Promise<void> {
    await Promise.all(spawns.map((sp) => {
      const s = this.makeSprite(sp.piece, { col: sp.at.col, row: sp.fromRow }); s.setAlpha(0.3);
      const { x, y } = this.xy(sp.at); const dist = sp.at.row - sp.fromRow;
      return this.tweenP({ targets: s, x, y, alpha: 1, duration: T.fallMin + dist * T.fallPerRow, ease: 'Quad.easeIn' }).then(() => {
        this.tweens.add({ targets: s, scaleY: this.pieceScale() * 0.86, scaleX: this.pieceScale() * 1.1, duration: 50, yoyo: true, onComplete: () => this.startIdle(s, sp.piece) });
      });
    }));
  }

  private async animShuffle(): Promise<void> {
    this.vfx.floatText(this.scale.width / 2, this.scale.height / 2, 'shuffle 🔀', '#fff', 26);
    const all = [...this.sprites.values()];
    await Promise.all(all.map((s) => this.tweenP({ targets: s, scale: 0, duration: 140 })));
    for (const s of all) s.destroy(); this.sprites.clear(); this.idle.clear();
    for (const c of this.cages.values()) c.destroy(); this.cages.clear();
    for (const bl of this.blockers.values()) bl.destroy(); this.blockers.clear();
    this.spawnAll(); await this.wait(350);
  }

  private celebrate(): void {
    const cx = this.scale.width / 2;
    for (let i = 0; i < 4; i++) this.time.delayedCall(i * 200, () => { this.vfx.confetti(cx + Phaser.Math.Between(-120, 120), this.scale.height * 0.35, 26); this.vfx.burst('sparkle', cx, this.scale.height * 0.4, 26); });
    this.vfx.shake(0.3);
  }

  // ── Hints & tutorial ─────────────────────────────────────────────────────
  private scheduleHint(): void {
    this.cancelHint();
    this.hintTimer = this.time.delayedCall(T.hintDelay, () => {
      if (this.busy || this.runner.status !== 'playing' || this.hammerMode) return;
      const m = this.runner.hint(); if (!m) return;
      const targets = [this.spriteAt(m.from), this.spriteAt(m.to)].filter(Boolean) as Phaser.GameObjects.Image[];
      for (const s of targets) this.stopIdle(s.getData('uid'));
      this.hintTweens.push(this.tweens.add({ targets, scale: this.pieceScale() * 1.2, duration: 360, yoyo: true, repeat: 4, ease: 'Sine.easeInOut', onComplete: () => { for (const s of targets) { const pc = this.pieceByUid(s.getData('uid')); if (pc) this.startIdle(s, pc); } } }));
    });
  }
  private cancelHint(): void { this.hintTimer?.remove(); for (const t of this.hintTweens) t.stop(); this.hintTweens = []; }
  private pieceByUid(uid: number): Piece | undefined {
    const b = this.runner.board; for (let r = 0; r < b.rows; r++) for (let c = 0; c < b.cols; c++) { const p = b.pieceAt({ col: c, row: r }); if (p?.uid === uid) return p; } return undefined;
  }

  private showTutorialHand(): void {
    const m = this.runner.hint(); if (!m) return;
    const A = this.xy(m.from), B = this.xy(m.to);
    const targets = [this.spriteAt(m.from), this.spriteAt(m.to)].filter(Boolean) as Phaser.GameObjects.Image[];
    for (const s of targets) { this.stopIdle(s.getData('uid')); s.setDepth(25); }
    const dim = this.add.rectangle(0, 0, this.scale.width * 2, this.scale.height * 2, 0x000000, 0.45).setDepth(22);
    this.tutorialHand = this.add.text(A.x, A.y + 16, '👆', { fontSize: `${Math.round(this.cell * 0.9)}px` }).setOrigin(0.5, 0).setDepth(70);
    this.tutorialHand.setData('dim', dim);
    this.hintTweens.push(this.tweens.add({ targets: this.tutorialHand, x: B.x, y: B.y + 16, duration: 700, ease: 'Sine.easeInOut', yoyo: true, repeat: -1, hold: 200, repeatDelay: 250 }));
    this.hintTweens.push(this.tweens.add({ targets, scale: this.pieceScale() * 1.18, duration: 380, yoyo: true, repeat: -1 }));
  }
  private hideTutorialHand(): void {
    if (!this.tutorialHand) return;
    (this.tutorialHand.getData('dim') as Phaser.GameObjects.Rectangle | undefined)?.destroy();
    this.tutorialHand.destroy(); this.tutorialHand = undefined; this.cancelHint();
    for (const s of this.sprites.values()) s.setDepth(10);
  }

  private pushHud(): void {
    this.hud.onState({ movesLeft: this.runner.movesLeft, score: this.runner.score, progress: this.runner.progress.map((p) => ({ target: p.objective.target, type: p.objective.type, current: p.current, amount: p.objective.amount, done: p.done })) });
  }
}
