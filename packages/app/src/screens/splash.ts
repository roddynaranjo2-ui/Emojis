import { em } from '@emojiverse/ui';
import { t } from '../i18n';
import { APP_VERSION } from '../version';

export function renderSplash(el: HTMLElement, onPlay: () => void, unlocked: number): void {
  el.innerHTML = `
    <div class="body center" style="gap:26px">
      <div class="emoji-row"><span>😀</span><span>🔥</span><span>🌱</span><span>💧</span><span>⭐</span></div>
      <div class="logo">EMOJI<b>VERSE</b></div>
      <div class="muted" style="max-width:260px">${t('splash.tagline')}</div>
      <button class="ebtn cta pulse" id="splash-play">${em('ui_play', 28, t('common.play'))}<span>${unlocked > 1 ? t('splash.continue', { n: unlocked }) : t('common.play')}</span></button>
      <div class="muted" style="font-size:11px">v${APP_VERSION}</div>
    </div>`;
  el.querySelector('#splash-play')!.addEventListener('click', onPlay);
}
