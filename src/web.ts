import { WebPlugin } from '@capacitor/core';

import type { SocialLoginPlugin } from './definitions';

export class SocialLoginWeb extends WebPlugin implements SocialLoginPlugin {
  async echo(options: { value: string }): Promise<{ value: string }> {
    console.log('ECHO', options);
    return options;
  }
}
