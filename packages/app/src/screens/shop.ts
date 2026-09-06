import { em } from '@emojiverse/ui';
import { sfx, haptics } from '@emojiverse/game';
import { state, PRICES, MAX_LIVES, type BoosterKind } from '../state';
import { toast } from '../router';
import { t, type Key } from '../i18n';

const ITEMS: Array<{ k: BoosterKind | 'life'; e: string; price: number }> = [
  { k: 'hammer', e: 'hammer', price: PRICES.hammer }, { k: 'shuffle', e: 'ui_retry', price: PRICES.shuffle },
  { k: 'rocket', e: 'sp_rocket', price: PRICES.rocket }, { k: 'bomb', e: 'sp_bomb', price: PRICES.bomb },
  { k: 'wild', e: 'sp_wild', price: PRICES.wild }, { k: 'life', e: 'ui_heart', price: PRICES.life },
];

export function renderShop(el: HTMLElement, onBack: () => void): { refresh(): void } {
  const build = () => {
    el.innerHTML = `
    <div class="topbar">
      <button class="ebtn round" id="shop-back">${em('ui_back', 28, t('common.back'))}</button>
      <div class="title">${em('ui_shop', 28)}<span>${t('shop.title')}</span></div>
      <div class="glass pill">${em('ui_coin', 28)}<span class="num" id="shop-coins">0</span></div>
    </div>
    <div class="body">
      <div class="muted" style="margin-bottom:10px">${t('shop.intro')}</div>
      <div class="shop-grid" id="shop-grid"></div>
    </div>`;
    el.querySelector('#shop-back')!.addEventListener('click', onBack);
  };
  build();
  const refresh = () => {
    build();
    const grid = el.querySelector('#shop-grid')!;
    el.querySelector('#shop-coins')!.textContent = String(state.save.coins);
    grid.innerHTML = ITEMS.map((it) => {
      const have = it.k === 'life' ? state.save.lives : state.save.boosters[it.k];
      const dis = !state.canAfford(it.price) || (it.k === 'life' && state.save.lives >= MAX_LIVES);
      return `<div class="glass item"><span>${em(it.e, 44)}</span><div class="nm">${t(`shop.${it.k}` as Key)} <span class="muted">×${have}</span></div><div class="ds">${t(`shop.${it.k}.ds` as Key)}</div><button class="price" data-k="${it.k}" ${dis ? 'disabled' : ''}>${em('ui_coin', 20)} ${it.price}</button></div>`;
    }).join('');
    grid.querySelectorAll<HTMLButtonElement>('.price').forEach((b) => b.addEventListener('click', () => {
      const it = ITEMS.find((x) => x.k === b.dataset.k)!;
      if (!state.spend(it.price)) { toast(`${em('ui_coin', 20)} ${t('common.notEnoughCoins')}`); return; }
      if (it.k === 'life') state.addLife(); else state.addBooster(it.k);
      sfx.spawnSpecial(); haptics.success(); toast(`${em('ui_check', 20)} ${t('shop.purchased', { name: t(`shop.${it.k}` as Key) })}`); refresh();
    }));
  };
  return { refresh };
}
