import { em } from '@emojiverse/ui';
import { state } from '../state';
import { ACHIEVEMENTS } from '../achievements';
import { sfx, music, setHapticsEnabled, haptics } from '@emojiverse/game';
import { openModal, closeModal, toast } from '../router';
import { t, t2, locale, setLocale, LOCALES, type Key } from '../i18n';
import { APP_VERSION } from '../version';
import { exportSave, importSave, shareSave, downloadSave } from '../backup';

export function applySettings(): void {
  sfx.setMuted(!state.save.settings.sfx);
  music.setEnabled(state.save.settings.music);
  setHapticsEnabled(state.save.settings.haptics);
}

export interface SettingsHandlers { onBack(): void; onReset(): void; onLocale(): void }

export function renderSettings(el: HTMLElement, h: SettingsHandlers): { refresh(): void } {
  let deferred: (Event & { prompt(): Promise<void> }) | null = null;
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e as Event & { prompt(): Promise<void> }; el.querySelector<HTMLElement>('#install-row')?.removeAttribute('hidden'); });
  window.addEventListener('appinstalled', () => { deferred = null; el.querySelector<HTMLElement>('#install-row')?.setAttribute('hidden', ''); });

  const build = () => {
    el.innerHTML = `
    <div class="topbar">
      <button class="ebtn round" id="set-back">${em('ui_back', 28, t('common.back'))}</button>
      <div class="title">${em('ui_settings', 28)}<span>${t('set.title')}</span></div><span style="width:44px"></span>
    </div>
    <div class="body stack">
      <div class="glass toggle"><span>${em('ui_sound', 28)} ${t('set.music')}</span><button class="sw" data-k="music"></button></div>
      <div class="glass toggle"><span>🔔 ${t('set.sfx')}</span><button class="sw" data-k="sfx"></button></div>
      <div class="glass toggle"><span>📳 ${t('set.haptics')}</span><button class="sw" data-k="haptics"></button></div>
      <div class="glass toggle" style="flex-wrap:wrap;gap:8px"><span>🌐 ${t('set.language')}</span><div class="lang-row">${LOCALES.map((l) => `<button class="ebtn lang ${l.id === locale() ? 'on' : ''}" data-l="${l.id}" title="${l.name}"><span style="font-size:22px">${l.flag}</span><span>${l.id}</span></button>`).join('')}</div></div>
      <div class="glass toggle"><span>${em('ui_dex', 28)} ${t('set.progress')}</span><span class="muted" id="set-prog"></span></div>
      <div class="glass toggle" id="install-row" ${deferred ? '' : 'hidden'}><span>📲 ${t('set.install')}</span><button class="ebtn cta green" id="set-install" style="padding:8px 14px !important">${em('ui_play', 20)}<span>${t('set.installBtn')}</span></button></div>
      <div class="muted" style="margin:14px 0 6px">💾 ${t('set.backup')}</div>
      <div class="row" style="gap:8px;flex-wrap:wrap">
        <button class="ebtn cta ghost grow" id="bk-copy">${em('ui_share', 28)}<span>${t('set.export')}</span></button>
        <button class="ebtn cta ghost grow" id="bk-file">📄<span>${t('set.download')}</span></button>
        <button class="ebtn cta ghost grow" id="bk-import">📥<span>${t('set.import')}</span></button>
      </div>
      <div class="muted" style="margin:14px 0 6px">🏅 ${t('set.achievements')} <span id="ach-count"></span></div>
      <div class="ach-grid" id="ach-grid"></div>
      <div class="glass toggle" style="margin-top:14px"><span>🧹 ${t('set.reset')}</span><button class="ebtn round" id="set-reset">${em('ui_err', 28, t('set.resetBtn'))}</button></div>
      <div class="muted center" style="margin-top:20px">${t('set.credits', { v: APP_VERSION })}</div>
    </div>`;
    el.querySelector('#set-back')!.addEventListener('click', h.onBack);
    el.querySelector('#set-install')!.addEventListener('click', () => { void deferred?.prompt(); });
    el.querySelectorAll<HTMLElement>('.sw').forEach((s) => s.addEventListener('click', () => {
      const k = s.dataset.k as 'music' | 'sfx' | 'haptics'; state.save.settings[k] = !state.save.settings[k]; state.commit(); applySettings(); refresh(); sfx.tap(); haptics.tick();
    }));
    el.querySelectorAll<HTMLElement>('.lang').forEach((b) => b.addEventListener('click', () => { setLocale(b.dataset.l as 'en'); sfx.tap(); h.onLocale(); refresh(); }));
    el.querySelector('#bk-copy')!.addEventListener('click', async () => { const r = await shareSave(); toast(r === 'failed' ? `${em('ui_err', 20)} ${t('set.importBad')}` : `${em('ui_check', 20)} ${t('set.exported')}`); });
    el.querySelector('#bk-file')!.addEventListener('click', () => void downloadSave());
    el.querySelector('#bk-import')!.addEventListener('click', () => {
      const m = openModal(document.getElementById('app')!, `<span class="hero">📥</span><div class="title">${t('set.importTitle')}</div><div class="sub">${t('set.importSub')}</div>
        <textarea id="bk-text" class="glass" style="width:100%;min-height:90px;border-radius:14px;padding:10px;color:#fff;background:rgba(0,0,0,.25);font-family:var(--mono);font-size:11px" placeholder="EMV1.…"></textarea>
        <div class="row" style="margin-top:10px"><button class="ebtn cta ghost grow" id="bk-no">${em('ui_back', 28)}<span>${t('common.cancel')}</span></button><button class="ebtn cta green grow" id="bk-yes">${em('ui_check', 28)}<span>${t('set.import')}</span></button></div>`, { dismissable: true });
      m.querySelector('#bk-no')!.addEventListener('click', () => closeModal());
      m.querySelector('#bk-yes')!.addEventListener('click', async () => {
        const ok = await importSave((m.querySelector('#bk-text') as HTMLTextAreaElement).value);
        if (!ok) { toast(`${em('ui_err', 20)} ${t('set.importBad')}`); return; }
        closeModal(); toast(`${em('ui_check', 20)} ${t('set.imported')}`); setTimeout(() => location.reload(), 600);
      });
    });
    el.querySelector('#set-reset')!.addEventListener('click', () => {
      const m = openModal(document.getElementById('app')!, `<span class="hero">⚠️</span><div class="title">${t('set.resetTitle')}</div><div class="sub">${t('set.resetSub')}</div><div class="row"><button class="ebtn cta ghost grow" id="r-no">${em('ui_back', 28)}<span>${t('common.cancel')}</span></button><button class="ebtn cta grow" id="r-yes">${em('ui_err', 28)}<span>${t('set.resetBtn')}</span></button></div>`, { dismissable: true });
      m.querySelector('#r-no')!.addEventListener('click', () => closeModal());
      m.querySelector('#r-yes')!.addEventListener('click', () => { closeModal(); state.reset(); h.onReset(); });
    });
  };

  const refresh = () => {
    build();
    const got = new Set(state.save.achievements);
    el.querySelector('#ach-count')!.textContent = `${got.size}/${ACHIEVEMENTS.length}`;
    el.querySelector('#ach-grid')!.innerHTML = ACHIEVEMENTS.map((a) => { const [nm, ds] = t2(`ach.${a.id}` as Key); return `<div class="glass ach ${got.has(a.id) ? 'got' : ''}" title="${ds}"><span class="g">${a.glyph}</span><b>${nm}</b><small>${ds}</small></div>`; }).join('');
    el.querySelectorAll<HTMLElement>('.sw').forEach((s) => s.classList.toggle('on', state.save.settings[s.dataset.k as 'music' | 'sfx' | 'haptics']));
    el.querySelector('#set-prog')!.textContent = t('set.progressValue', { lv: state.save.unlocked, dex: state.save.dex.length, coins: state.save.coins });
  };
  refresh();
  void exportSave; // keep export referenced for tree-shaking clarity
  return { refresh };
}
