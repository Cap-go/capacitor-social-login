import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.capgo.plugin.SocialLogin',
  appName: 'a',
  webDir: 'dist',
  plugins: {
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
