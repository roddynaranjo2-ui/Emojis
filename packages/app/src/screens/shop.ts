import { em } from '@emojiverse/ui';
import { state, PRICES, MAX_LIVES, type BoosterKind } from '../state';
import { toast } from '../router';
import { sfx, haptics } from '@emojiverse/game';

const ITEMS: Array<{ k: BoosterKind | 'life'; e: string; nm: string; ds: string; price: number }> = [
  { k: 'hammer', e: 'hammer', nm: 'Hammer', ds: 'Destroy any single piece or obstacle', price: PRICES.hammer },
  { k: 'shuffle', e: 'ui_retry', nm: 'Shuffle', ds: 'Reshuffle the whole board', price: PRICES.shuffle },
  { k: 'rocket', e: 'sp_rocket', nm: 'Rocket', ds: 'Start the level with a 🚀', price: PRICES.rocket },
  { k: 'bomb', e: 'sp_bomb', nm: 'Bomb', ds: 'Start the level with a 💣', price: PRICES.bomb },
  { k: 'wild', e: 'sp_wild', nm: 'Wild star', ds: 'Start the level with a 🌟', price: PRICES.wild },
  { k: 'life', e: 'ui_heart', nm: 'Life', ds: 'One extra life right now', price: PRICES.life },
];

export function renderShop(el: HTMLElement, onBack: () => void): { refresh(): void } {
  el.innerHTML = `
    <div class="topbar">
      <button class="ebtn round" id="shop-back">${em('ui_back', 28, 'Back')}</button>
      <div class="title">${em('ui_shop', 28)}<span>Shop</span></div>
      <div class="glass pill">${em('ui_coin', 28)}<span class="num" id="shop-coins">0</span></div>
    </div>
    <div class="body">
      <div class="muted" style="margin-bottom:10px">Earn 🪙 by winning levels, daily gifts and 3-star runs. Boosters never cost moves.</div>
      <div class="shop-grid" id="shop-grid"></div>
    </div>`;
  el.querySelector('#shop-back')!.addEventListener('click', onBack);
  const grid = el.querySelector('#shop-grid')!;
  const refresh = () => {
    el.querySelector('#shop-coins')!.textContent = String(state.save.coins);
    grid.innerHTML = ITEMS.map((it) => { const have = it.k === 'life' ? state.save.lives : state.save.boosters[it.k]; const dis = !state.canAfford(it.price) || (it.k === 'life' && state.save.lives >= MAX_LIVES); return `<div class="glass item"><span>${em(it.e, 44)}</span><div class="nm">${it.nm} <span class="muted">×${have}</span></div><div class="ds">${it.ds}</div><button class="price" data-k="${it.k}" ${dis ? 'disabled' : ''}>${em('ui_coin', 20)} ${it.price}</button></div>`; }).join('');
    grid.querySelectorAll<HTMLButtonElement>('.price').forEach((b) => b.addEventListener('click', () => {
      const it = ITEMS.find((x) => x.k === b.dataset.k)!;
      if (!state.spend(it.price)) { toast(`${em('ui_coin', 20)} not enough coins`); return; }
      if (it.k === 'life') state.addLife(); else state.addBooster(it.k);
      sfx.spawnSpecial(); haptics.success(); toast(`${em('ui_check', 20)} ${it.nm} purchased`); refresh();
    }));
  };
  return { refresh };
}
