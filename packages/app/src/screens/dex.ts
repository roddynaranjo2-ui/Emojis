import { em } from '@emojiverse/ui';
import { EMOJIS, FAMILIES, RECIPES, EMOJI_BY_ID, type FamilyId } from '@emojiverse/content';
import { state, PRICES } from '../state';
import { openModal, closeModal, toast } from '../router';

const ECHO_PRICE = 40;

export function renderDex(el: HTMLElement, onBack: () => void): { refresh(): void } {
  let fam: FamilyId = 'elements';
  const seen = new Set<string>();
  el.innerHTML = `
    <div class="topbar">
      <button class="ebtn round" id="dex-back">${em('ui_back', 28, 'Back')}</button>
      <div class="title">${em('ui_dex', 28)}<span>Emoji-dex</span></div>
      <div class="glass pill"><span class="num" id="dex-count">0/144</span></div>
    </div>
    <div class="body">
      <div class="dex-tabs" id="dex-tabs"></div>
      <div class="fam-bar" id="fam-bar"></div>
      <div class="dex-grid" id="dex-grid"></div>
    </div>`;
  el.querySelector('#dex-back')!.addEventListener('click', onBack);

  const tabs = el.querySelector('#dex-tabs')!, grid = el.querySelector('#dex-grid')!, bar = el.querySelector('#fam-bar')!;

  const refresh = () => {
    const dex = new Set(state.save.dex);
    el.querySelector('#dex-count')!.textContent = `${dex.size}/144`;
    tabs.innerHTML = FAMILIES.map((f) => { const n = EMOJIS.filter((e) => e.family === f.id && dex.has(e.id)).length; return `<button class="dex-tab ${f.id === fam ? 'on' : ''}" data-f="${f.id}">${f.glyph} <span>${f.name}</span><span class="c">${n}/12</span></button>`; }).join('');
    tabs.querySelectorAll<HTMLElement>('.dex-tab').forEach((t) => t.addEventListener('click', () => { fam = t.dataset.f as FamilyId; refresh(); }));
    const list = EMOJIS.filter((e) => e.family === fam);
    const f = FAMILIES.find((x) => x.id === fam)!;
    bar.innerHTML = list.map((e) => `<i class="${dex.has(e.id) ? 'on' : ''}"></i>`).join('');
    grid.innerHTML = list.map((e) => {
      const st = f.status === 'vault' ? 'locked' : dex.has(e.id) ? '' : 'hidden';
      const isNew = dex.has(e.id) && !seen.has(e.id) && !state.save.tutorialsSeen.includes(`seen:${e.id}`);
      return `<div class="slot ${st} ${e.rarity} ${isNew ? 'new' : ''}" data-id="${e.id}"><span class="g">${em(e.id, 44, e.name)}</span><span class="nm">${st ? (f.status === 'vault' ? 'vault' : '???') : e.name}</span></div>`;
    }).join('');
    grid.querySelectorAll<HTMLElement>('.slot').forEach((s) => s.addEventListener('click', () => { const id = s.dataset.id!; seen.add(id); state.markTutorial(`seen:${id}`); openDetail(id, refresh); }));
    // tab into view
    tabs.querySelector('.on')?.scrollIntoView({ inline: 'center', block: 'nearest' });
  };
  return { refresh };
}

function openDetail(id: string, refresh: () => void): void {
  const e = EMOJI_BY_ID[id]!; const f = FAMILIES.find((x) => x.id === e.family)!;
  const known = state.save.dex.includes(id);
  const recipes = RECIPES.filter((r) => r.result === id);
  const echoLevel = state.save.echoes[id] ?? 0;
  const rarityLabel = { common: '⚪ Common', rare: '🟢 Rare', epic: '🟣 Epic', legendary: '🟡 Legendary' }[e.rarity];
  let body = '';
  if (f.status === 'vault') body = `<div class="sub">🔒 This family arrives in a future event.</div>`;
  else if (known) {
    body = `<div class="sub">${rarityLabel} · ${f.name}</div>` + (recipes.length ? `<div class="muted" style="margin:8px 0 4px">Recipes</div><div class="recipe-list">${recipes.map((r) => `<div class="glass recipe">${em(r.a, 28)} <span class="eq">+</span> ${em(r.b, 28)} <span class="eq">=</span> ${em(r.result, 28)}</div>`).join('')}</div>` : `<div class="muted">Evolves on the board by matching 3.</div>`);
  } else {
    const echoes = recipes[0]?.echoes ?? ['It exists…', 'Keep evolving pieces on the board', 'Reach a higher tier of its family'];
    const shown = echoes.slice(0, echoLevel).map((t, i) => `<div class="glass recipe">🔊 <span>${t}</span>${i === 2 ? '' : ''}</div>`).join('');
    const can = echoLevel < 3 && state.canAfford(ECHO_PRICE);
    body = `<div class="sub">${rarityLabel} · ${f.name}</div>
      <div class="recipe-list" style="margin:8px 0">${shown || '<div class="muted">No echoes revealed yet.</div>'}</div>
      ${echoLevel < 3 ? `<button class="ebtn cta ${can ? '' : 'ghost'}" id="echo-buy" style="width:100%" ${can ? '' : 'disabled'}>🔊<span>Reveal echo ${echoLevel + 1}/3 · ${em('ui_coin', 20)} ${ECHO_PRICE}</span></button>` : ''}`;
  }
  const m = openModal(document.getElementById('app')!, `
    <span class="hero ${known ? '' : 'slot hidden'}" style="display:grid;place-items:center;border:none;background:none;box-shadow:none;width:auto;aspect-ratio:auto"><span class="g">${em(id, 96)}</span></span>
    <div class="title">${known ? e.name : '???'}</div>
    ${body}
    <div class="row" style="margin-top:14px"><button class="ebtn cta ghost grow" id="dd-close">${em('ui_back', 28)}<span>Close</span></button></div>`, { dismissable: true });
  m.querySelector('#dd-close')!.addEventListener('click', () => closeModal());
  m.querySelector('#echo-buy')?.addEventListener('click', () => { if (state.spend(ECHO_PRICE)) { state.revealEcho(id); closeModal(); setTimeout(() => openDetail(id, refresh), 280); refresh(); } else toast(`${em('ui_coin', 20)} not enough coins`); });
  void PRICES;
}
