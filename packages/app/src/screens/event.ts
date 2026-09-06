import { em } from '@emojiverse/ui';
import { EMOJI_BY_ID, liveEvent, eventLevels, EVENT_WEEK_MS, type LevelDef } from '@emojiverse/content';
import { state } from '../state';
import { fmtTime, toast } from '../router';
import { boosterEmoji } from './popups';

export interface EventHandlers { onBack(): void; onStage(l: LevelDef): void }

/** Countdown that reads "2d 05:12:33" for long spans, "05:12:33" under a day. */
export function fmtCountdown(ms: number): string {
  const d = Math.floor(ms / 86_400_000); const rest = ms - d * 86_400_000;
  const h = Math.floor(rest / 3_600_000);
  return d > 0 ? `${d}d ${String(h).padStart(2, '0')}h` : `${String(h).padStart(2, '0')}:${fmtTime(rest - h * 3_600_000)}`;
}

/**
 * Vault event screen — a compact 8-stage trail with a milestone ladder.
 * Progress is per event and resets when the event rotates (weekly); emojis discovered stay in the dex forever.
 */
export function renderEvent(el: HTMLElement, h: EventHandlers): { refresh(): void } {
  el.innerHTML = `
    <div class="topbar">
      <button class="ebtn round" id="ev-back">${em('ui_back', 28, 'Back')}</button>
      <div class="title" id="ev-title"></div>
      <div class="glass pill">${em('ui_coin', 28, 'Coins')}<span class="num" id="ev-coins">0</span></div>
    </div>
    <div class="body" id="ev-body"></div>`;
  el.querySelector('#ev-back')!.addEventListener('click', h.onBack);
  const body = el.querySelector('#ev-body') as HTMLElement;
  let timer: number | undefined;

  const refresh = () => {
    const { event, endsAt } = liveEvent();
    const week = Math.floor(Date.now() / EVENT_WEEK_MS);
    const prog = state.eventProgress(event.id, week);
    const stages = eventLevels(event.id);
    el.querySelector('#ev-title')!.innerHTML = `<span style="font-size:26px">${event.glyph}</span> ${event.name}`;
    el.querySelector('#ev-coins')!.textContent = String(state.save.coins);
    el.style.setProperty('--ev-a', event.palette[0]); el.style.setProperty('--ev-b', event.palette[1]);

    const vault = event.chains.flatMap((c) => c.slice(1)).filter((id) => EMOJI_BY_ID[id]?.status === 'vault');
    const owned = vault.filter((id) => state.save.dex.includes(id)).length;

    const nodes = stages.map((l) => {
      const cls = l.index <= prog.cleared ? 'done' : l.index === prog.cleared + 1 ? 'current' : 'locked';
      const s = state.save.stars[l.id] ?? 0;
      const starHtml = [1, 2, 3].map((i) => `<span class="${i <= s ? '' : 'off'}">⭐</span>`).join('');
      const goals = l.objectives.map((o) => `<span class="emw s20">${em(o.target!, 20)}</span>`).join('');
      return `<div class="node ${cls} ${l.difficulty === 'boss' ? 'boss' : ''}" data-id="${l.id}">${l.difficulty === 'boss' ? '<span class="tag boss">boss</span>' : ''}<button aria-label="Stage ${l.index}">${cls === 'locked' ? '🔒' : cls === 'done' ? '✅' : l.index}</button><div class="stars">${starHtml}</div><div class="nm">${l.name}</div><div class="goals">${goals}</div></div>`;
    }).join('');

    const ladder = event.milestones.map((m, i) => {
      const reached = prog.cleared >= m.stages, claimed = i < prog.claimed;
      return `<div class="glass ms ${reached ? 'ok' : ''} ${claimed ? 'claimed' : ''}" data-i="${i}">
        <div class="k">${m.stages}/8</div>
        <div class="r">${em('ui_coin', 20)} ${m.coins}${m.booster ? ` · ${em(boosterEmoji(m.booster), 20)}` : ''}</div>
        <button class="ebtn ${reached && !claimed ? 'cta green' : 'ghost'}" ${reached && !claimed ? '' : 'disabled'}>${claimed ? '✅' : reached ? em('ui_gift', 20) : em('ui_lock', 20)}<span>${claimed ? 'claimed' : reached ? 'claim' : 'locked'}</span></button>
      </div>`;
    }).join('');

    body.innerHTML = `
      <section class="world event" style="background:linear-gradient(180deg, ${event.palette[0]}44, ${event.palette[1]}33)">
        <div class="wtitle"><span class="g">${event.glyph}</span><div><div class="n">${event.name}</div><div class="m">${event.tagline}</div></div><div class="grow"></div><div class="glass pill timer" id="ev-timer">⏳ ${fmtCountdown(endsAt - Date.now())}</div></div>
        <div class="row" style="gap:10px;margin:6px 0 10px;flex-wrap:wrap">
          <div class="glass pill">${em('ui_dex', 20)} <b>${owned}/${vault.length}</b> vault emojis</div>
          <div class="glass pill">${em('ui_check', 20)} <b>${prog.cleared}/8</b> stages</div>
        </div>
        <div class="wprog"><i style="width:${Math.round((prog.cleared / 8) * 100)}%"></i></div>
        <div class="muted" style="margin:10px 0 4px">${em('ui_target', 20)} Evolution paths this week</div>
        <div class="chains">${event.chains.map((c) => `<div class="glass chain">${c.map((id, i) => `${i ? '<span class="arr">›</span>' : ''}<span class="${state.save.dex.includes(id) || EMOJI_BY_ID[id]?.status === 'launch' ? '' : 'dim'}">${em(id, 28, EMOJI_BY_ID[id]?.name)}</span>`).join('')}</div>`).join('')}</div>
        <div class="path">${nodes}</div>
        <div class="muted" style="margin:14px 0 6px">${em('ui_gift', 20)} Milestone rewards</div>
        <div class="ladder">${ladder}</div>
        <p class="muted" style="font-size:12px;margin-top:12px">Stages reset when the event rotates. Everything you discover stays in your Emoji‑dex forever.</p>
      </section>`;

    body.querySelectorAll<HTMLElement>('.node').forEach((n) => n.addEventListener('click', () => {
      const l = stages.find((x) => x.id === n.dataset.id)!;
      if (l.index > prog.cleared + 1) { n.classList.add('wiggle'); setTimeout(() => n.classList.remove('wiggle'), 400); return; }
      h.onStage(l);
    }));
    body.querySelectorAll<HTMLElement>('.ms button:not([disabled])').forEach((b) => b.addEventListener('click', () => {
      const i = Number(b.parentElement!.dataset.i);
      const m = event.milestones[i]!;
      if (state.claimEventMilestone(event.id, week, i, m)) { toast(`${em('ui_gift', 20)} +${m.coins} ${em('ui_coin', 20)}${m.booster ? ` +1 ${em(boosterEmoji(m.booster), 20)}` : ''}`); refresh(); }
    }));

    clearInterval(timer);
    timer = window.setInterval(() => { const t = el.querySelector('#ev-timer'); if (!t) { clearInterval(timer); return; } t.textContent = `⏳ ${fmtCountdown(Math.max(0, endsAt - Date.now()))}`; if (Date.now() >= endsAt) refresh(); }, 1000);
  };
  return { refresh };
}
