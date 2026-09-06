/**
 * HUD — HTML/CSS layer above the Phaser canvas. Pure DOM, framework-free.
 * Every control is an emoji (from the Noto atlas via CSS sprites), never text-only.
 */
import { EMOJI_BY_ID } from '@emojiverse/content';

/** Renders an atlas emoji at one of the 4 allowed sizes. Falls back to text glyph. */
export function em(id: string, size: 20 | 28 | 44 | 96 = 28, title?: string): string {
  const glyph = EMOJI_BY_ID[id]?.glyph ?? '';
  const t = title ?? EMOJI_BY_ID[id]?.name ?? id;
  return `<span class="emw s${size}" role="img" aria-label="${t}" title="${t}"><i class="em em-${id} s${size}" data-glyph="${glyph}"></i></span>`;
}

export function pill(inner: string, id?: string): string {
  return `<div class="glass pill"${id ? ` id="${id}"` : ''}>${inner}</div>`;
}

export function ebtn(emoji: string, label: string, id: string, extra = ''): string {
  return `<button class="ebtn ${extra}" id="${id}" aria-label="${label}">${em(emoji, 28, label)}<span>${label}</span></button>`;
}

export interface HudState {
  movesLeft: number; score: number;
  progress: Array<{ target?: string; type: string; current: number; amount: number; done: boolean }>;
}

export class Hud {
  private top: HTMLElement; private bottom: HTMLElement; private combo: HTMLElement; private toastEl: HTMLElement;
  private comboTimer: number | undefined;
  private lastMoves = -1;

  constructor(root: HTMLElement, handlers: { onPause(): void; onMute(): void; onHint(): void }) {
    root.innerHTML = `
      <div id="hud-top">
        ${pill(`${em('ui_heart', 28, 'Lives')}<span class="num" id="lives">5</span>`)}
        <div id="objectives" style="display:flex;gap:8px"></div>
        ${pill(`${em('ui_coin', 28, 'Coins')}<span class="num" id="coins">0</span>`)}
      </div>
      <div id="board"><div id="combo"></div><div id="intro"></div></div>
      <div id="hud-bottom">
        ${ebtn('ui_pause', 'pause', 'btn-pause')}
        ${pill(`${em('ui_moves', 28, 'Moves')}<span class="num" id="moves">0</span>`)}
        ${pill(`${em('ui_star', 28, 'Score')}<span class="num" id="score">0</span>`)}
        ${ebtn('ui_hint', 'hint', 'btn-hint')}
        ${ebtn('ui_sound', 'sound', 'btn-mute')}
      </div>
      <div id="toast" class="glass"></div>`;
    this.top = root.querySelector('#hud-top')!;
    this.bottom = root.querySelector('#hud-bottom')!;
    this.combo = root.querySelector('#combo')!;
    this.toastEl = root.querySelector('#toast')!;
    root.querySelector('#btn-pause')!.addEventListener('click', handlers.onPause);
    root.querySelector('#btn-hint')!.addEventListener('click', handlers.onHint);
    root.querySelector('#btn-mute')!.addEventListener('click', () => { handlers.onMute(); });
  }

  setMuted(m: boolean): void {
    const b = document.getElementById('btn-mute')!;
    b.innerHTML = `${em(m ? 'ui_mute' : 'ui_sound', 28, 'sound')}<span>${m ? 'muted' : 'sound'}</span>`;
  }

  setLives(n: number): void { this.top.querySelector('#lives')!.textContent = String(n); }
  setCoins(n: number): void { this.top.querySelector('#coins')!.textContent = String(n); }

  update(s: HudState): void {
    const moves = this.bottom.querySelector('#moves')!;
    moves.textContent = String(s.movesLeft);
    if (this.lastMoves !== -1 && s.movesLeft < this.lastMoves) { moves.parentElement!.classList.remove('wiggle'); void (moves.parentElement as HTMLElement).offsetWidth; moves.parentElement!.classList.add('wiggle'); }
    if (s.movesLeft <= 5) (moves as HTMLElement).style.color = '#ffb4b4'; else (moves as HTMLElement).style.color = '';
    this.lastMoves = s.movesLeft;
    this.countTo(this.bottom.querySelector('#score')!, s.score);

    const box = this.top.querySelector('#objectives')!;
    box.innerHTML = s.progress.map((p) => {
      const icon = p.type === 'collect' || p.type === 'reach_tier' ? em(p.target!, 28) : p.type === 'score' ? em('ui_star', 28, 'Score') : p.type === 'clear_dust' ? '<span class="gl" title="Dust">🟪</span>' : p.type === 'break_cages' ? '<span class="gl" title="Cages">🔗</span>' : em('bl_rock', 28, 'Blockers');
      const pct = Math.min(100, Math.round((p.current / p.amount) * 100));
      return `<div class="glass pill objective ${p.done ? 'done' : ''}">${em('ui_target', 20, 'Objective')}${icon}<span class="num">${p.done ? '✅' : `${Math.min(p.current, p.amount)}/${p.amount}`}</span><div class="bar"><i style="width:${pct}%"></i></div></div>`;
    }).join('');
  }

  private countTo(el: Element, target: number): void {
    const from = Number((el as HTMLElement).dataset.v ?? '0');
    if (from === target) return;
    (el as HTMLElement).dataset.v = String(target);
    const start = performance.now(); const dur = 380;
    const tick = (t: number) => { const k = Math.min(1, (t - start) / dur); el.textContent = String(Math.round(from + (target - from) * (1 - Math.pow(1 - k, 3)))); if (k < 1) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  }

  showCombo(combo: number): void {
    if (combo < 2) return;
    const words = ['', '', 'NICE', 'GREAT', 'AMAZING', 'WOW', 'UNREAL', 'LEGENDARY'];
    const emojis = ['', '', '👍', '🔥', '🤩', '💥', '🚀', '🌌'];
    const i = Math.min(combo, words.length - 1);
    this.combo.innerHTML = `${emojis[i]} ${words[i]} ×${combo}`;
    this.combo.style.fontSize = `${30 + Math.min(combo, 8) * 3}px`;
    this.combo.classList.add('show');
    clearTimeout(this.comboTimer);
    this.comboTimer = window.setTimeout(() => this.combo.classList.remove('show'), 700);
  }

  intro(glyphHtml: string, name: string): void {
    const el = document.getElementById('intro')!;
    el.innerHTML = `<div class="glyph">${glyphHtml}</div><div class="name">${name}</div>`;
    setTimeout(() => (el.innerHTML = ''), 1600);
  }

  toast(html: string, ms = 1600): void {
    this.toastEl.innerHTML = html; this.toastEl.classList.add('show');
    setTimeout(() => this.toastEl.classList.remove('show'), ms);
  }
}

export interface EndModalOpts { won: boolean; stars: number; score: number; nearMiss: boolean; onNext(): void; onRetry(): void; onExtra?(): void }

export function showEndModal(root: HTMLElement, o: EndModalOpts): void {
  let m = document.getElementById('modal');
  if (!m) { m = document.createElement('div'); m.id = 'modal'; m.className = 'modal'; root.appendChild(m); }
  const stars = [1, 2, 3].map((i) => `<span class="${i <= o.stars ? '' : 'off'}">⭐</span>`).join('');
  const hero = o.won ? (o.stars >= 3 ? '🤩' : o.stars === 2 ? '😄' : '🙂') : o.nearMiss ? '🥺' : '😢';
  const title = o.won ? 'Level complete!' : o.nearMiss ? 'So close…' : 'Out of moves';
  const sub = o.won ? `${em('ui_star', 20)} ${o.score.toLocaleString()}` : o.nearMiss ? 'One more push?' : 'Try again — every failure teaches';
  m.innerHTML = `<div class="glass card">
      <span class="hero">${hero}</span>
      <div class="title">${title}</div>
      <div class="sub">${sub}</div>
      ${o.won ? `<div class="stars">${stars}</div>` : ''}
      <div class="row">
        ${o.won ? ebtn('ui_play', 'next', 'm-next', 'primary') : ''}
        ${!o.won && o.nearMiss ? `<button class="ebtn primary" id="m-extra">${em('ui_moves', 28)}<span>+3 moves · ${em('ui_coin', 20)} 50</span></button>` : ''}
        ${ebtn('ui_retry', 'retry', 'm-retry')}
      </div>
    </div>`;
  requestAnimationFrame(() => m!.classList.add('open'));
  const close = () => m!.classList.remove('open');
  m.querySelector('#m-next')?.addEventListener('click', () => { close(); o.onNext(); });
  m.querySelector('#m-retry')?.addEventListener('click', () => { close(); o.onRetry(); });
  m.querySelector('#m-extra')?.addEventListener('click', () => { close(); o.onExtra?.(); });
}
