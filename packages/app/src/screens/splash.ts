import { em } from '@emojiverse/ui';

export function renderSplash(el: HTMLElement, onPlay: () => void, onContinueLabel: string): void {
  el.innerHTML = `
    <div class="body center" style="gap:26px">
      <div class="emoji-row"><span>😀</span><span>🔥</span><span>🌱</span><span>💧</span><span>⭐</span></div>
      <div class="logo">EMOJI<b>VERSE</b></div>
      <div class="muted" style="max-width:260px">Match, evolve and discover every emoji.</div>
      <button class="ebtn cta pulse" id="splash-play">${em('ui_play', 28, 'Play')}<span>${onContinueLabel}</span></button>
      <div class="muted" style="font-size:11px">v0.2 · phase 1</div>
    </div>`;
  el.querySelector('#splash-play')!.addEventListener('click', onPlay);
}
