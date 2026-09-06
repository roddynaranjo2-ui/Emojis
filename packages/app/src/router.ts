/** Minimal screen router: one <section class="screen"> per screen; only one active. */
export type ScreenId = 'splash' | 'map' | 'game' | 'dex' | 'lab' | 'shop' | 'settings' | 'event';

export class Router {
  private screens = new Map<ScreenId, HTMLElement>();
  current: ScreenId | null = null;
  private onEnter = new Map<ScreenId, () => void>();

  constructor(private readonly root: HTMLElement) {}

  register(id: ScreenId, el: HTMLElement, onEnter?: () => void): void {
    el.classList.add('screen'); el.id = id; this.root.appendChild(el); this.screens.set(id, el);
    if (onEnter) this.onEnter.set(id, onEnter);
  }
  go(id: ScreenId): void {
    if (this.current === id) { this.onEnter.get(id)?.(); return; }
    for (const [k, el] of this.screens) el.classList.toggle('active', k === id);
    this.current = id;
    this.onEnter.get(id)?.();
  }
  el(id: ScreenId): HTMLElement { return this.screens.get(id)!; }
}

/** Modal helpers shared by all screens. */
export function openModal(root: HTMLElement, html: string, opts: { id?: string; dismissable?: boolean } = {}): HTMLElement {
  const id = opts.id ?? 'modal';
  document.getElementById(id)?.remove();
  const m = document.createElement('div'); m.id = id; m.className = 'modal';
  m.innerHTML = `<div class="glass card">${html}</div>`;
  root.appendChild(m);
  if (opts.dismissable) m.addEventListener('click', (e) => { if (e.target === m) closeModal(id); });
  requestAnimationFrame(() => m.classList.add('open'));
  return m;
}
export function closeModal(id = 'modal'): void {
  const m = document.getElementById(id); if (!m) return;
  m.classList.remove('open'); setTimeout(() => m.remove(), 260);
}
export function openSheet(root: HTMLElement, html: string): { sheet: HTMLElement; close: () => void } {
  document.getElementById('sheet')?.remove(); document.getElementById('scrim')?.remove();
  const scrim = document.createElement('div'); scrim.id = 'scrim'; scrim.className = 'scrim';
  const sheet = document.createElement('div'); sheet.id = 'sheet'; sheet.className = 'glass sheet';
  sheet.innerHTML = `<div class="grab"></div>${html}`;
  root.append(scrim, sheet);
  const close = () => { scrim.classList.remove('open'); sheet.classList.remove('open'); setTimeout(() => { scrim.remove(); sheet.remove(); }, 340); };
  scrim.addEventListener('click', close);
  requestAnimationFrame(() => { scrim.classList.add('open'); sheet.classList.add('open'); });
  return { sheet, close };
}
export function toast(html: string, ms = 1800): void {
  let t = document.getElementById('toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'glass'; document.body.appendChild(t); }
  t.innerHTML = html; t.classList.add('show');
  clearTimeout(Number(t.dataset.timer)); t.dataset.timer = String(setTimeout(() => t!.classList.remove('show'), ms));
}
export const fmtTime = (ms: number): string => { const s = Math.ceil(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
