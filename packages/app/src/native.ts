/**
 * Native shell integration (Capacitor). Everything here is a no-op on the plain web build:
 * plugins are imported lazily only when `Capacitor.isNativePlatform()` is true, so the PWA
 * bundle never pays for them.
 *
 * - Android hardware back: close modal → pause board → back to map → minimise app
 * - Status bar: dark icons over our own gradient (overlay mode)
 * - Splash screen: hidden once our own splash is painted
 * - Background: pause music/board when the app is hidden, resume on foreground
 */
export interface NativeHooks {
  /** return true if the back press was consumed */
  onBack(): boolean;
  onPause(): void;
  onResume(): void;
}

const w = window as unknown as { Capacitor?: { isNativePlatform?: () => boolean; getPlatform?: () => string } };
export const isNative = (): boolean => !!w.Capacitor?.isNativePlatform?.();
export const platform = (): 'android' | 'ios' | 'web' => (w.Capacitor?.getPlatform?.() as 'android' | 'ios' | undefined) ?? 'web';

export async function initNative(h: NativeHooks): Promise<void> {
  document.documentElement.dataset.platform = platform();
  document.addEventListener('visibilitychange', () => (document.hidden ? h.onPause() : h.onResume()));
  if (!isNative()) return;
  try {
    const [{ App }, { StatusBar, Style }, { SplashScreen }] = await Promise.all([
      import('@capacitor/app'), import('@capacitor/status-bar'), import('@capacitor/splash-screen'),
    ]);
    await App.addListener('backButton', () => { if (!h.onBack()) void App.minimizeApp(); });
    await App.addListener('appStateChange', ({ isActive }) => (isActive ? h.onResume() : h.onPause()));
    try { await StatusBar.setStyle({ style: Style.Dark }); await StatusBar.setOverlaysWebView({ overlay: true }); } catch { /* iOS rejects overlay */ }
    await SplashScreen.hide({ fadeOutDuration: 250 });
  } catch (err) {
    console.warn('[native] plugin init failed', err);
  }
}
