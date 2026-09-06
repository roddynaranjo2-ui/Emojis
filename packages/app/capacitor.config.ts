import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.emojiverse.app',
  appName: 'Emojiverse',
  webDir: 'dist',
  backgroundColor: '#1a1730',
  android: { allowMixedContent: false, backgroundColor: '#1a1730' },
  ios: { contentInset: 'never', backgroundColor: '#1a1730' },
  plugins: {
    Haptics: {},
    SplashScreen: { launchShowDuration: 0, launchAutoHide: false, backgroundColor: '#1a1730', androidScaleType: 'CENTER_CROP', showSpinner: false },
    StatusBar: { style: 'DARK', overlaysWebView: true, backgroundColor: '#00000000' },
  },
};

export default config;
