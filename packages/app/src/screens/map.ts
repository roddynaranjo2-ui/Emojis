import { em } from '@emojiverse/ui';
import { LEVELS, WORLDS, type LevelDef } from '@emojiverse/content';
import { state, MAX_LIVES } from '../state';
import { fmtTime } from '../router';

export interface MapHandlers { onLevel(l: LevelDef): void; onDex(): void; onLab(): void; onShop(): void; onSettings(): void; onDaily(): void; onLives(): void }

export function renderMap(el: HTMLElement, h: MapHandlers): { refresh(): void } {
  el.innerHTML = `
    <div class="topbar">
      <div class="glass pill" id="map-lives">${em('ui_heart', 28, 'Lives')}<span class="num">5</span><span class="timer"></span></div>
      <div class="title">${em('ui_map', 28, 'Map')}<span id="map-world">World 1</span></div>
      <div class="glass pill">${em('ui_coin', 28, 'Coins')}<span class="num" id="map-coins">0</span></div>
    </div>
    <div class="body" id="map-body"></div>
    <div id="map-nav">
      <button class="ebtn" id="nav-dex">${em('ui_dex', 28, 'Emoji-dex')}<span>dex</span><b class="badge" id="dex-badge" hidden></b></button>
      <button class="ebtn" id="nav-lab">${em('ui_lab', 28, 'Laboratory')}<span>lab</span></button>
      <button class="ebtn" id="nav-daily">${em('ui_gift', 28, 'Daily gift')}<span>daily</span><b class="badge" id="daily-badge" hidden>!</b></button>
      <button class="ebtn" id="nav-shop">${em('ui_shop', 28, 'Shop')}<span>shop</span></button>
      <button class="ebtn" id="nav-settings">${em('ui_settings', 28, 'Settings')}<span>options</span></button>
    </div>`;
  el.querySelector('#nav-dex')!.addEventListener('click', h.onDex);
  el.querySelector('#nav-lab')!.addEventListener('click', h.onLab);
  el.querySelector('#nav-shop')!.addEventListener('click', h.onShop);
  el.querySelector('#nav-settings')!.addEventListener('click', h.onSettings);
  el.querySelector('#nav-daily')!.addEventListener('click', h.onDaily);
  el.querySelector('#map-lives')!.addEventListener('click', h.onLives);

  const body = el.querySelector('#map-body') as HTMLElement;
  let built = false;

  const build = () => {
    body.innerHTML = WORLDS.map((w) => {
      const lv = LEVELS.filter((l) => l.world === w.id);
      const stars = lv.reduce((a, l) => a + (state.save.stars[l.id] ?? 0), 0);
      const nodes = lv.map((l) => {
        const s = state.save.stars[l.id] ?? 0;
        const cls = l.number < state.save.unlocked ? 'done' : l.number === state.save.unlocked ? 'current' : 'locked';
        const starHtml = [1, 2, 3].map((i) => `<span class="${i <= s ? '' : 'off'}">⭐</span>`).join('');
        const tag = l.difficulty === 'boss' ? `<span class="tag boss">boss</span>` : l.difficulty === 'hard' ? `<span class="tag">hard</span>` : '';
        return `<div class="node ${cls} ${l.difficulty === 'boss' ? 'boss' : ''}" data-id="${l.id}">${tag}<button aria-label="Level ${l.number}">${cls === 'locked' ? '🔒' : l.difficulty === 'boss' ? l.glyph : l.number}</button><div class="stars">${cls === 'locked' ? '' : starHtml}</div><div class="lvl">${l.difficulty === 'boss' ? `Lv ${l.number}` : l.name}</div></div>`;
      }).join('');
      return `<section class="world" data-world="${w.id}" style="background:linear-gradient(180deg, ${w.palette[0]}33, ${w.palette[1]}22)">
        <div class="wtitle"><span class="g">${w.glyph}</span><div><div class="n">World ${w.id} · ${w.name}</div><div class="m">${w.mood}</div></div><div class="grow"></div><div class="muted">⭐ ${stars}/60</div></div>
        <div class="wprog"><i style="width:${Math.round((stars / 60) * 100)}%"></i></div>
        <div class="path">${nodes}</div>
      </section>`;
    }).join('');
    body.querySelectorAll<HTMLElement>('.node').forEach((n) => n.addEventListener('click', () => {
      const l = LEVELS.find((x) => x.id === n.dataset.id)!;
      if (l.number > state.save.unlocked) { n.classList.add('wiggle'); setTimeout(() => n.classList.remove('wiggle'), 400); return; }
      h.onLevel(l);
    }));
    built = true;
  };

  const refresh = () => {
    build();
    state.tickLives();
    const lives = el.querySelector('#map-lives .num')!; lives.textContent = String(state.save.lives);
    const timer = el.querySelector('#map-lives .timer')!; const ms = state.nextLifeIn();
    timer.textContent = state.save.lives < MAX_LIVES && ms ? fmtTime(ms) : '';
    el.querySelector('#map-coins')!.textContent = String(state.save.coins);
    (el.querySelector('#daily-badge') as HTMLElement).hidden = !state.dailyAvailable();
    const cur = LEVELS[Math.min(state.save.unlocked, LEVELS.length) - 1]!;
    el.querySelector('#map-world')!.textContent = `World ${cur.world} · ${WORLDS[cur.world - 1]!.name}`;
    // scroll current node into view
    requestAnimationFrame(() => body.querySelector('.node.current')?.scrollIntoView({ block: 'center', behavior: built ? 'smooth' : 'auto' }));
  };

  // live timer
  setInterval(() => { if (!el.classList.contains('active')) return; state.tickLives(); const ms = state.nextLifeIn(); const t = el.querySelector('#map-lives .timer'); if (t) t.textContent = state.save.lives < MAX_LIVES && ms ? fmtTime(ms) : ''; const n = el.querySelector('#map-lives .num'); if (n) n.textContent = String(state.save.lives); }, 1000);

  return { refresh };
}
