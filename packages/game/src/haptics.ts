/**
 * Haptics adapter — Capacitor Haptics on native, navigator.vibrate on Android web,
 * silent no-op on iOS Safari. Patterns are tuned per event so the *hand* learns
 * the difference between a match, an evolution and a mega blast.
 */
type Impact = 'light' | 'medium' | 'heavy';

interface CapHaptics {
  impact(o: { style: 'LIGHT' | 'MEDIUM' | 'HEAVY' }): Promise<void>;
  notification(o: { type: 'SUCCESS' | 'WARNING' | 'ERROR' }): Promise<void>;
  vibrate(o: { duration: number }): Promise<void>;
}

let cap: CapHaptics | null = null;
let enabled = true;

export async function initHaptics(): Promise<void> {
  try {
    const w = window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } };
    if (w.Capacitor?.isNativePlatform?.()) {
      const mod = await import('@capacitor/haptics');
      cap = mod.Haptics as unknown as CapHaptics;
    }
  } catch { cap = null; }
}

export function setHapticsEnabled(v: boolean): void { enabled = v; }

function vib(pattern: number | number[]): void {
  if (!enabled) return;
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) { try { navigator.vibrate(pattern); } catch { /* ignore */ } }
}

export const haptics = {
  impact(style: Impact = 'light'): void {
    if (!enabled) return;
    if (cap) { void cap.impact({ style: style.toUpperCase() as 'LIGHT' | 'MEDIUM' | 'HEAVY' }); return; }
    vib(style === 'light' ? 8 : style === 'medium' ? 18 : 35);
  },
  /** dragging a piece: tiny tick */
  tick(): void { this.impact('light'); },
  match(combo: number): void { if (cap) this.impact(combo > 1 ? 'medium' : 'light'); else vib(10 + Math.min(combo, 5) * 6); },
  evolve(): void { if (cap) { void cap.impact({ style: 'MEDIUM' }); setTimeout(() => void cap!.impact({ style: 'LIGHT' }), 70); } else vib([18, 40, 10]); },
  special(magnitude: number): void {
    if (cap) { void cap.impact({ style: magnitude > 0.6 ? 'HEAVY' : 'MEDIUM' }); return; }
    vib(Math.round(25 + magnitude * 60));
  },
  mega(): void {
    if (cap) { void cap.impact({ style: 'HEAVY' }); setTimeout(() => void cap!.impact({ style: 'HEAVY' }), 120); setTimeout(() => void cap!.notification({ type: 'SUCCESS' }), 300); return; }
    vib([60, 40, 60, 40, 120]);
  },
  success(): void { if (cap) void cap.notification({ type: 'SUCCESS' }); else vib([20, 60, 20, 60, 40]); },
  error(): void { if (cap) void cap.notification({ type: 'ERROR' }); else vib([30, 30, 30]); },
  discover(rarity: number): void {
    if (cap) { void cap.notification({ type: 'SUCCESS' }); if (rarity >= 2) setTimeout(() => void cap!.impact({ style: 'HEAVY' }), 200); return; }
    vib(rarity >= 3 ? [30, 40, 30, 40, 30, 40, 90] : rarity >= 2 ? [30, 50, 30, 50, 60] : [25, 50, 40]);
  },
};
