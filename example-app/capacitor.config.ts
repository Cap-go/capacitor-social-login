import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.capgo.plugin.SocialLogin',
  appName: 'a',
  webDir: 'dist',
  plugins: {
    SocialLogin: {
      providers: {
        google: true,      // compileOnly (not bundled)
        facebook: true,    // compileOnly (not bundled)
        apple: true,        // implementation (bundled)
        twitter: true       // implementation (bundled)
      }
    }
  }
};

export default config;
