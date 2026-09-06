import { em } from '@emojiverse/ui';
import { EMOJI_BY_ID, findRecipe, recipeKey, RECIPES } from '@emojiverse/content';
import { state } from '../state';
import { toast, openModal, closeModal } from '../router';
import { sfx, haptics } from '@emojiverse/game';

/**
 * Laboratory — drag two emojis into the cauldron; recipe → discovery; no recipe → echo hint.
 * Ingredients come from labInventory (pieces collected while playing). A failed mix never
 * consumes ingredients (positive frustration).
 */
export function renderLab(el: HTMLElement, onBack: () => void, onDiscover: (emoji: string) => void): { refresh(): void } {
  let a: string | null = null, b: string | null = null;
  el.innerHTML = `
    <div class="topbar">
      <button class="ebtn round" id="lab-back">${em('ui_back', 28, 'Back')}</button>
      <div class="title">${em('ui_lab', 28)}<span>Laboratory</span></div>
      <div class="glass pill"><span class="num" id="lab-found">0/${RECIPES.length}</span></div>
    </div>
    <div class="body">
      <div class="cauldron" id="cauldron"><div class="slotA" id="slotA"></div><span class="plus">+</span><div class="slotB" id="slotB"></div><div class="pot">⚗️</div></div>
      <div class="row" style="justify-content:center;margin-bottom:12px"><button class="ebtn cta green" id="mix" disabled>🧪<span>Mix</span></button><button class="ebtn cta ghost" id="clear">${em('ui_retry', 28)}<span>Clear</span></button></div>
      <div class="muted" style="margin-bottom:6px">${em('ui_target', 20)} Your ingredients <span id="inv-hint"></span></div>
      <div class="inv" id="inv"></div>
      <div class="muted" style="margin:14px 0 6px">${em('ui_dex', 20)} Recipes found</div>
      <div class="recipe-list" id="found"></div>
    </div>`;
  el.querySelector('#lab-back')!.addEventListener('click', onBack);
  const slotA = el.querySelector('#slotA')!, slotB = el.querySelector('#slotB')!, mix = el.querySelector('#mix') as HTMLButtonElement, inv = el.querySelector('#inv')!, found = el.querySelector('#found')!;

  const paint = () => {
    slotA.innerHTML = a ? em(a, 44) : ''; slotB.innerHTML = b ? em(b, 44) : '';
    slotA.classList.toggle('filled', !!a); slotB.classList.toggle('filled', !!b);
    mix.disabled = !(a && b);
    inv.querySelectorAll<HTMLElement>('.it').forEach((it) => it.classList.toggle('on', it.dataset.id === a || it.dataset.id === b));
  };

  const refresh = () => {
    el.querySelector('#lab-found')!.textContent = `${state.save.recipesFound.length}/${RECIPES.length}`;
    const items = Object.entries(state.save.labInventory).filter(([, n]) => n > 0).sort((x, y) => (EMOJI_BY_ID[x[0]]?.tier ?? 0) - (EMOJI_BY_ID[y[0]]?.tier ?? 0));
    el.querySelector('#inv-hint')!.textContent = items.length ? '' : '— play levels to collect pieces';
    inv.innerHTML = items.map(([id, n]) => `<div class="it" data-id="${id}">${em(id, 44)}<span class="cnt">${n}</span></div>`).join('');
    inv.querySelectorAll<HTMLElement>('.it').forEach((it) => it.addEventListener('click', () => {
      const id = it.dataset.id!; sfx.tap(); haptics.tick();
      if (a === id && b !== id) { a = null; } else if (b === id) { b = null; } else if (!a) a = id; else if (!b) b = id; else { a = b; b = id; }
      paint();
    }));
    found.innerHTML = state.save.recipesFound.length ? state.save.recipesFound.map((k) => { const [x, y] = k.split('+'); const r = findRecipe(x!, y!); return r ? `<div class="glass recipe">${em(r.a, 28)} <span class="eq">+</span> ${em(r.b, 28)} <span class="eq">=</span> ${em(r.result, 28)} <span class="grow"></span><span class="muted">${EMOJI_BY_ID[r.result]?.name}</span></div>` : ''; }).join('') : '<div class="muted">Nothing yet. Mix two ingredients!</div>';
    paint();
  };

  el.querySelector('#clear')!.addEventListener('click', () => { a = b = null; paint(); });
  mix.addEventListener('click', () => {
    if (!a || !b) return;
    const needA = a === b ? 2 : 1;
    if ((state.save.labInventory[a] ?? 0) < needA || (a !== b && (state.save.labInventory[b] ?? 0) < 1)) { toast('Not enough pieces'); return; }
    const r = findRecipe(a, b);
    const c = el.querySelector('#cauldron')!; c.classList.remove('bubble'); void (c as HTMLElement).offsetWidth; c.classList.add('bubble');
    if (!r) {
      sfx.swapBad(); haptics.error();
      // echo: hint toward a recipe that uses one of the ingredients and isn't found yet
      const cand = RECIPES.filter((x) => (x.a === a || x.b === a || x.a === b || x.b === b) && !state.save.recipesFound.includes(recipeKey(x.a, x.b)));
      const hint = cand.length ? cand[Math.floor(Math.random() * cand.length)]! : null;
      toast(hint ? `💨 Nothing… 🔊 <i>${hint.echoes[Math.min(2, state.save.echoes[hint.result] ?? 0)]}</i>` : '💨 Nothing happened. Try another pair.', 2600);
      return;
    }
    state.takeFromLab(a, 1); state.takeFromLab(b, 1);
    const isNewRecipe = state.recipeFound(recipeKey(a, b));
    const isNewEmoji = state.discover(r.result);
    state.addToLab(r.result, 1);
    const def = EMOJI_BY_ID[r.result]!;
    const rarity = (['common', 'rare', 'epic', 'legendary'] as const).indexOf(def.rarity) as 0 | 1 | 2 | 3;
    sfx.discover(rarity); haptics.discover(rarity);
    if (isNewEmoji) onDiscover(r.result);
    const m = openModal(document.getElementById('app')!, `
      <span class="hero" style="animation:pop 500ms both">${em(r.result, 96)}</span>
      <div class="title">${isNewEmoji ? '🆕 ' : ''}${def.name}</div>
      <div class="sub">${em(r.a, 28)} + ${em(r.b, 28)} = ${em(r.result, 28)}${isNewRecipe ? ' · new recipe!' : ''}</div>
      <div class="muted">${{ physical: '🔬 physical', metamorphic: '🦋 metamorphic', psychological: '🧠 psychological' }[r.kind]} · ${def.rarity}</div>
      <div class="row" style="margin-top:14px"><button class="ebtn cta green grow" id="ok">${em('ui_check', 28)}<span>${isNewEmoji ? 'Added to the Dex!' : 'Nice!'}</span></button></div>`, { dismissable: true });
    m.querySelector('#ok')!.addEventListener('click', () => closeModal());
    a = b = null; refresh();
  });
  return { refresh };
}
