import { em } from '@emojiverse/ui';
import { WORLDS, EVENT_BY_ID, type LevelDef, type Mechanic } from '@emojiverse/content';
import { state, PRICES, MAX_LIVES, type BoosterKind } from '../state';
import { openModal, closeModal, openSheet, fmtTime } from '../router';
import { t, type Key } from '../i18n';
import { emojiName, levelName } from '../names';

const root = () => document.getElementById('app')!;

export function objectiveHtml(o: { type: string; target?: string; amount: number }, current?: number): string {
  const icon = o.type === 'collect' || o.type === 'reach_tier' ? em(o.target!, 44) : o.type === 'score' ? em('ui_star', 44, 'Score') : o.type === 'clear_dust' ? '<span style="font-size:36px">🟪</span>' : o.type === 'break_cages' ? '<span style="font-size:36px">🔗</span>' : em('bl_rock', 44, 'Blockers');
  const label = o.type === 'collect' ? emojiName(o.target!) : o.type === 'score' ? t('goal.points') : o.type === 'clear_dust' ? t('goal.dust') : o.type === 'break_cages' ? t('goal.cages') : t('goal.blockers');
  const n = current === undefined ? `${o.amount}` : `${Math.min(current, o.amount)}/${o.amount}`;
  return `<div class="glass goal">${icon}<div class="n">${n}</div><div class="t">${label}</div></div>`;
}

/** Pre-level sheet: goals, moves, difficulty, booster selection. Resolves with chosen boosters or null. */
export function showLevelSheet(level: LevelDef): Promise<Array<'rocket' | 'bomb' | 'wild'> | null> {
  return new Promise((resolve) => {
    const ev = level.event ? EVENT_BY_ID[level.event] : undefined;
    const w = ev ? { glyph: ev.glyph } : WORLDS[level.world - 1]!;
    const diffTag = level.difficulty === 'boss' ? `<span class="tag boss" style="position:static">${t('sheet.boss')}</span>` : level.difficulty === 'hard' ? `<span class="tag" style="position:static">${t('sheet.hard')}</span>` : '';
    const boosters: Array<{ k: 'rocket' | 'bomb' | 'wild'; e: string }> = [{ k: 'rocket', e: 'sp_rocket' }, { k: 'bomb', e: 'sp_bomb' }, { k: 'wild', e: 'sp_wild' }];
    const chosen = new Set<'rocket' | 'bomb' | 'wild'>();
    const { sheet, close } = openSheet(root(), `
      <div class="center" style="gap:6px">
        <div class="row" style="justify-content:center;gap:8px"><span style="font-size:34px">${w.glyph}</span><div><div class="h2">${ev ? `${t(`ev.${ev.id}.name` as Key)} · ${t('common.stage')} ${level.index}` : `${t('common.level')} ${level.number}`}</div><div class="muted">${levelName(level)} ${diffTag}</div></div></div>
        <div class="muted" style="margin-top:8px">${em('ui_target', 20)} ${t('sheet.goals')}</div>
        <div class="goal-list">${level.objectives.map((o) => objectiveHtml(o)).join('')}</div>
        <div class="row" style="justify-content:center;margin-top:6px">${em('ui_moves', 20, t('common.moves'))}<b>${t('sheet.moves', { n: level.moves })}</b></div>
        <div class="muted" style="margin-top:10px">${t('sheet.booster')}</div>
        <div class="booster-row">${boosters.map((b) => { const n = state.save.boosters[b.k] ?? 0; return `<button class="bst" data-k="${b.k}" ${n <= 0 ? 'disabled' : ''}>${em(b.e, 44)}<span class="cnt ${n ? '' : 'zero'}">${n}</span></button>`; }).join('')}</div>
        <div class="row" style="justify-content:center;margin-top:12px;gap:12px">
          <button class="ebtn cta ghost" id="ls-back">${em('ui_back', 28, t('common.back'))}<span>${t('common.back')}</span></button>
          <button class="ebtn cta green" id="ls-play">${em('ui_play', 28, t('common.play'))}<span>${t('sheet.play')} ${em('ui_heart', 20)} −1</span></button>
        </div>
      </div>`);
    sheet.querySelectorAll<HTMLButtonElement>('.bst').forEach((b) => b.addEventListener('click', () => {
      const k = b.dataset.k as 'rocket' | 'bomb' | 'wild';
      if (chosen.has(k)) { chosen.delete(k); b.classList.remove('on'); } else { chosen.add(k); b.classList.add('on'); }
    }));
    sheet.querySelector('#ls-back')!.addEventListener('click', () => { close(); resolve(null); });
    sheet.querySelector('#ls-play')!.addEventListener('click', () => { close(); resolve([...chosen]); });
    document.getElementById('scrim')!.addEventListener('click', () => resolve(null), { once: true });
  });
}

export function showWin(level: LevelDef, stars: number, score: number, coins: number, firstClear: boolean, newEmojis: string[], onNext: () => void, onMap: () => void): void {
  const starsHtml = [1, 2, 3].map((i) => `<span class="${i <= stars ? '' : 'off'}" style="display:inline-block;animation:${i <= stars ? `pop 400ms ${i * 180}ms both` : 'none'}">⭐</span>`).join('');
  const booster = firstClear && level.reward.booster ? `<div class="glass pill">${em(level.reward.booster === 'hammer' ? 'hammer' : level.reward.booster === 'shuffle' ? 'ui_retry' : `sp_${level.reward.booster}`, 28)}<span class="num">+1 ${t(`shop.${level.reward.booster}` as Key)}</span></div>` : '';
  const news = newEmojis.length ? `<div class="muted" style="margin-top:6px">${em('ui_new', 20)} ${t('win.discovered')}</div><div class="row" style="justify-content:center;gap:6px;flex-wrap:wrap">${newEmojis.map((e) => em(e, 44)).join('')}</div>` : '';
  const m = openModal(root(), `
    <span class="hero">${stars >= 3 ? '🤩' : stars === 2 ? '😄' : '🙂'}</span>
    <div class="title">${level.event ? t('win.stageTitle', { n: level.index }) : t('win.title', { n: level.number })}</div>
    <div class="stars">${starsHtml}</div>
    <div class="sub">${em('ui_star', 20)} ${score.toLocaleString()} ${level.difficulty === 'boss' ? t('win.boss') : ''}</div>
    <div class="row" style="justify-content:center;gap:8px;flex-wrap:wrap"><div class="glass pill">${em('ui_coin', 28)}<span class="num">+${coins}</span></div>${booster}</div>
    ${news}
    <div class="row" style="margin-top:14px">
      <button class="ebtn cta ghost" id="w-map">${em('ui_map', 28, t('common.map'))}<span>${level.event ? t('common.event') : t('common.map')}</span></button>
      <button class="ebtn cta green grow" id="w-next">${em('ui_play', 28)}<span>${level.event ? (level.index < 8 ? t('win.nextStage') : t('win.rewards')) : t('win.next')}</span></button>
    </div>`);
  m.querySelector('#w-next')!.addEventListener('click', () => { closeModal(); onNext(); });
  m.querySelector('#w-map')!.addEventListener('click', () => { closeModal(); onMap(); });
}

export function showLose(level: LevelDef, nearMiss: boolean, progress: Array<{ type: string; target?: string; current: number; amount: number; done: boolean }>, onExtra: () => void, onRetry: () => void, onMap: () => void): void {
  const can = state.canAfford(PRICES.moves5);
  const m = openModal(root(), `
    <span class="hero">${nearMiss ? '🥺' : '😢'}</span>
    <div class="title">${nearMiss ? t('lose.soClose') : t('lose.out')}</div>
    <div class="sub">${nearMiss ? t('lose.soCloseSub') : t('lose.outSub')}</div>
    <div class="goal-list" style="margin-bottom:12px">${progress.map((p) => objectiveHtml(p, p.current)).join('')}</div>
    <button class="ebtn cta ${can ? '' : 'ghost'}" id="l-extra" style="width:100%" ${can ? '' : 'disabled'}>${em('ui_moves', 28)}<span>${t('lose.extra')} · ${em('ui_coin', 20)} ${PRICES.moves5}</span></button>
    <div class="row" style="margin-top:10px">
      <button class="ebtn cta ghost" id="l-map">${em('ui_map', 28, t('common.map'))}<span>${level.event ? t('common.event') : t('common.map')}</span></button>
      <button class="ebtn cta ghost grow" id="l-retry">${em('ui_retry', 28)}<span>${t('lose.retry')} ${nearMiss ? '' : `${em('ui_heart', 20)} −1`}</span></button>
    </div>`);
  m.querySelector('#l-extra')!.addEventListener('click', () => { if (state.spend(PRICES.moves5)) { closeModal(); onExtra(); } });
  m.querySelector('#l-retry')!.addEventListener('click', () => { closeModal(); onRetry(); });
  m.querySelector('#l-map')!.addEventListener('click', () => { closeModal(); onMap(); });
}

export function showNoLives(onRefill: () => void, onWait: () => void): void {
  const can = state.canAfford(PRICES.life * 3);
  const m = openModal(root(), `
    <span class="hero">💔</span>
    <div class="title">${t('lives.title')}</div>
    <div class="sub">${t('lives.next')} <b class="timer" id="nl-timer">${fmtTime(state.nextLifeIn())}</b></div>
    <button class="ebtn cta ${can ? '' : 'ghost'}" id="nl-refill" style="width:100%" ${can ? '' : 'disabled'}>${em('ui_heart', 28)}<span>${t('lives.refill', { n: MAX_LIVES })} · ${em('ui_coin', 20)} ${PRICES.life * 3}</span></button>
    <div class="row" style="margin-top:10px"><button class="ebtn cta ghost grow" id="nl-wait">${em('ui_back', 28)}<span>${t('lives.wait')}</span></button></div>`);
  const iv = setInterval(() => { const t = m.querySelector('#nl-timer'); if (!t) { clearInterval(iv); return; } t.textContent = fmtTime(state.nextLifeIn()); if (state.save.lives > 0) { clearInterval(iv); closeModal(); onWait(); } }, 1000);
  m.querySelector('#nl-refill')!.addEventListener('click', () => { if (state.spend(PRICES.life * 3)) { state.refillLives(); clearInterval(iv); closeModal(); onRefill(); } });
  m.querySelector('#nl-wait')!.addEventListener('click', () => { clearInterval(iv); closeModal(); onWait(); });
}

const TUT_DEMO: Record<Mechanic, string> = {
  swap: '🌱 🌱 <b>🌱</b>', rocket: '⭐⭐⭐<b>⭐</b>', bomb: '🔥🔥<b>🔥</b><br>🔥<br>🔥', rock: '🪨', ice: '🧊', dust: '🟪', cage: '🔗', wild: '⭐⭐⭐⭐<b>⭐</b>', synergy: '💣 + 🚀', holes: '⬛',
};

export function showTutorial(m: Mechanic): Promise<void> {
  return new Promise((resolve) => {
    const el = openModal(root(), `<div class="tut"><div class="h2">${em('ui_hint', 28)} ${t(`tut.${m}.title` as Key)}</div><div class="demo">${TUT_DEMO[m]}</div><p>${t(`tut.${m}.text` as Key)}</p><button class="ebtn cta green" id="tut-ok" style="width:100%">${em('ui_check', 28)}<span>${t('tut.gotIt')}</span></button></div>`, { id: 'tutorial' });
    el.querySelector('#tut-ok')!.addEventListener('click', () => { closeModal('tutorial'); resolve(); });
  });
}

export function showDaily(): void {
  const table = ['50', '60', '70 🔨', '80', '100 🚀', '120', '200 💣'];
  const day = state.save.lastDaily === new Date(Date.now() - 86400000).toISOString().slice(0, 10) ? (state.save.dailyDay % 7) + 1 : state.dailyAvailable() ? 1 : state.save.dailyDay;
  const avail = state.dailyAvailable();
  const m = openModal(root(), `
    <span class="hero">🎁</span><div class="title">${t('daily.title')}</div><div class="sub">${avail ? t('daily.sub') : t('daily.claimedSub')}</div>
    <div class="daily-grid">${table.map((r, i) => `<div class="day ${i + 1 < day ? 'got' : ''} ${i + 1 === day && avail ? 'today' : ''}"><span class="r">${i === 6 ? '🎉' : '🪙'}</span>${t('daily.day', { n: i + 1 })}<b>${r}</b></div>`).join('')}</div>
    <div class="row" style="margin-top:14px"><button class="ebtn cta ${avail ? 'green' : 'ghost'} grow" id="d-claim" ${avail ? '' : 'disabled'}>${em('ui_check', 28)}<span>${avail ? t('daily.claim') : t('daily.claimed')}</span></button></div>`, { dismissable: true });
  m.querySelector('#d-claim')!.addEventListener('click', () => { const r = state.claimDaily(); closeModal(); openModal(root(), `<span class="hero">🎉</span><div class="title">${t('daily.day', { n: r.day })}</div><div class="row" style="justify-content:center;gap:8px"><div class="glass pill">${em('ui_coin', 28)}<span class="num">+${r.coins}</span></div>${r.booster ? `<div class="glass pill">${em(r.booster === 'hammer' ? 'hammer' : `sp_${r.booster}`, 28)}<span class="num">+1</span></div>` : ''}</div><div class="row" style="margin-top:14px"><button class="ebtn cta green grow" onclick="document.getElementById('modal').classList.remove('open')">${em('ui_check', 28)}<span>${t('lab.nice')}</span></button></div>`, { dismissable: true }); });
}

export function boosterEmoji(k: BoosterKind): string { return k === 'hammer' ? 'hammer' : k === 'shuffle' ? 'ui_retry' : `sp_${k}`; }
