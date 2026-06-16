import type { CapacitorConfig } from '@capacitor/cli';
import pkg from './package.json';

const config: CapacitorConfig = {
  appId: 'app.capgo.plugin.SocialLogin',
  appName: 'a',
  webDir: 'dist',
  plugins: {
    SplashScreen: {
      launchAutoHide: false,
    },
    CapacitorUpdater: {
      autoUpdate: true,
      autoSplashscreen: true,
      directUpdate: 'always',
      version: pkg.version,
    },

    SocialLogin: {
      providers: {
        google: true, // enabled (bundled)
        facebook: true, // enabled (bundled)
        apple: true, // enabled (bundled)
        twitter: true, // enabled (bundled)
      },
    },
  },
};

export default config;
