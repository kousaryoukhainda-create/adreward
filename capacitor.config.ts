// capacitor.config.ts
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId:    'com.adreward.app',
  appName:  'AdReward',
  webDir:   'build',
  server:   { androidScheme: 'https' },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#0a0a0f',
      androidSplashResourceName: 'splash',
    },
    // AppLovin MAX native plugin (Android)
    // Install: npm install @capacitor-community/applovin-max
    // Then: npx cap sync android
  },
};

export default config;
