import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.emojiverse.app',
  appName: 'Emojiverse',
  webDir: 'dist',
  backgroundColor: '#1a1730',
  android: { allowMixedContent: false },
  ios: { contentInset: 'never' },
  plugins: { Haptics: {} },
};

export default config;
