import { registerPlugin } from '@capacitor/core';

import type { SocialLoginPlugin } from './definitions';

export const SocialLoginBase = registerPlugin<SocialLoginPlugin>('SocialLogin', {
  web: () => import('./web').then((m) => new m.SocialLoginWeb()),
});
