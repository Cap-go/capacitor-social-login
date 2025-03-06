import { WebPlugin } from '@capacitor/core';

export class BaseSocialLogin extends WebPlugin {
  protected static readonly OAUTH_STATE_KEY = 'social_login_oauth_pending';

  constructor() {
    super();
  }

  protected parseJwt(token: string): any {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        })
        .join(''),
    );
    return JSON.parse(jsonPayload);
  }

  protected async loadScript(src: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.onload = () => {
        resolve();
      };
      script.onerror = reject;
      document.body.appendChild(script);
    });
  }
} 
