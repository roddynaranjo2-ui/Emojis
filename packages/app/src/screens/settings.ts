import { em } from '@emojiverse/ui';
import { state } from '../state';
import { ACHIEVEMENTS } from '../achievements';
import { sfx, music, setHapticsEnabled, haptics } from '@emojiverse/game';
import { openModal, closeModal } from '../router';

export function applySettings(): void {
  sfx.setMuted(!state.save.settings.sfx);
  music.setEnabled(state.save.settings.music);
  setHapticsEnabled(state.save.settings.haptics);
}

export function renderSettings(el: HTMLElement, onBack: () => void, onReset: () => void): { refresh(): void } {
  el.innerHTML = `
    <div class="topbar">
      <button class="ebtn round" id="set-back">${em('ui_back', 28, 'Back')}</button>
      <div class="title">${em('ui_settings', 28)}<span>Options</span></div><span style="width:44px"></span>
    </div>
    <div class="body stack">
      <div class="glass toggle"><span>${em('ui_sound', 28)} Music</span><button class="sw" data-k="music"></button></div>
      <div class="glass toggle"><span>🔔 Sound effects</span><button class="sw" data-k="sfx"></button></div>
      <div class="glass toggle"><span>📳 Vibration</span><button class="sw" data-k="haptics"></button></div>
      <div class="glass toggle"><span>${em('ui_dex', 28)} Progress</span><span class="muted" id="set-prog"></span></div>
      <div class="glass toggle" id="install-row" hidden><span>📲 Install app</span><button class="ebtn cta green" id="set-install" style="padding:8px 14px !important">${em('ui_play', 20)}<span>Install</span></button></div>
      <div class="muted" style="margin:14px 0 6px">🏅 Achievements <span id="ach-count"></span></div>
      <div class="ach-grid" id="ach-grid"></div>
      <div class="glass toggle" style="margin-top:14px"><span>🧹 Reset game</span><button class="ebtn round" id="set-reset">${em('ui_err', 28, 'Reset')}</button></div>
      <div class="muted center" style="margin-top:20px">Emojiverse v0.2 · Noto Emoji © Google (Apache 2.0)</div>
    </div>`;
  el.querySelector('#set-back')!.addEventListener('click', onBack);
  // PWA install prompt (Chrome/Edge/Android). iOS Safari has no prompt → hidden.
  let deferred: (Event & { prompt(): Promise<void> }) | null = null;
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e as Event & { prompt(): Promise<void> }; el.querySelector<HTMLElement>('#install-row')!.hidden = false; });
  window.addEventListener('appinstalled', () => { el.querySelector<HTMLElement>('#install-row')!.hidden = true; });
  el.querySelector('#set-install')!.addEventListener('click', () => { void deferred?.prompt(); });

  const refresh = () => {
    const got = new Set(state.save.achievements);
    el.querySelector('#ach-count')!.textContent = `${got.size}/${ACHIEVEMENTS.length}`;
    el.querySelector('#ach-grid')!.innerHTML = ACHIEVEMENTS.map((a) => `<div class="glass ach ${got.has(a.id) ? 'got' : ''}" title="${a.desc}"><span class="g">${a.glyph}</span><b>${a.name}</b><small>${a.desc}</small></div>`).join('');
    el.querySelectorAll<HTMLElement>('.sw').forEach((s) => s.classList.toggle('on', state.save.settings[s.dataset.k as 'music' | 'sfx' | 'haptics']));
    el.querySelector('#set-prog')!.textContent = `Lv ${state.save.unlocked} · ${state.save.dex.length}/144 emojis · ${state.save.coins} 🪙`;
  };
  el.querySelectorAll<HTMLElement>('.sw').forEach((s) => s.addEventListener('click', () => {
    const k = s.dataset.k as 'music' | 'sfx' | 'haptics'; state.save.settings[k] = !state.save.settings[k]; state.commit(); applySettings(); refresh(); sfx.tap(); haptics.tick();
  }));
  el.querySelector('#set-reset')!.addEventListener('click', () => {
    const m = openModal(document.getElementById('app')!, `<span class="hero">⚠️</span><div class="title">Reset everything?</div><div class="sub">Levels, stars, coins and the Emoji-dex will be erased.</div><div class="row"><button class="ebtn cta ghost grow" id="r-no">${em('ui_back', 28)}<span>Cancel</span></button><button class="ebtn cta grow" id="r-yes">${em('ui_err', 28)}<span>Reset</span></button></div>`, { dismissable: true });
    m.querySelector('#r-no')!.addEventListener('click', () => closeModal());
    m.querySelector('#r-yes')!.addEventListener('click', () => { closeModal(); state.reset(); onReset(); });
  });
  return { refresh };
}
