import { WebPlugin } from "@capacitor/core";

import type {
  SocialLoginPlugin,
  InitializeOptions,
  LoginOptions,
  LoginResult,
  AuthorizationCode,
  GoogleLoginResponse,
  isLoggedInOptions,
} from "./definitions";

// Add this declaration at the top of the file
declare const google: {
  accounts: {
    id: {
      initialize(config: { client_id: string; callback: (response: any) => void }): void;
      prompt(callback: (notification: any) => void): void;
    };
  };
};

export class SocialLoginWeb extends WebPlugin implements SocialLoginPlugin {
  private googleClientId: string | null = null;
  private googleScriptLoaded = false;

  async initialize(options: InitializeOptions): Promise<void> {
    if (options.google?.webClientId) {
      this.googleClientId = options.google.webClientId;
      await this.loadGoogleScript();
    }
    // Implement initialization for other providers if needed
  }

  async login(options: LoginOptions): Promise<LoginResult> {
    if (options.provider === 'google') {
      return this.loginWithGoogle(options.options);
    }
    // Implement login for other providers
    throw new Error(`Login for ${options.provider} is not implemented on web`);
  }

  async logout(options: { provider: 'apple' | 'google' | 'facebook' }): Promise<void> {
    if (options.provider === 'google') {
      // Implement Google logout
    }
    // Implement logout for other providers
  }

  async isLoggedIn(options: isLoggedInOptions): Promise<{ isLoggedIn: boolean }> {
    console.log("isLoggedIn", options);
    // Implement isLoggedIn check for each provider
    return { isLoggedIn: false };
  }

  async getAuthorizationCode(): Promise<AuthorizationCode> {
    throw new Error('Method not implemented.');
  }

  async refresh(options: LoginOptions): Promise<void> {
    console.log("REFRESH", options);
    throw new Error('Method not implemented.');
  }

  private async loginWithGoogle(options: any): Promise<LoginResult> {
    console.log("isLoggedIn", options);
    if (!this.googleClientId) {
      throw new Error('Google Client ID not set. Call initialize() first.');
    }

    return new Promise((resolve, reject) => {
      google.accounts.id.initialize({
        client_id: this.googleClientId!,
        callback: (response) => {
          console.log("google.accounts.id.initialize callback", response);
          if (response.error) {
            reject(response.error);
          } else {
            const payload = this.parseJwt(response.credential);
            const result: GoogleLoginResponse = {
              accessToken: null,
              idToken: response.credential,
              profile: {
                email: payload.email || null,
                familyName: payload.family_name || null,
                givenName: payload.given_name || null,
                id: payload.sub || null,
                name: payload.name || null,
                imageUrl: payload.picture || null,
              }
            };
            resolve({ provider: 'google', result });
          }
        },
      });

      google.accounts.id.prompt((notification) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          console.log("OneTap is not displayed or skipped");
        }
        console.log("OneTap is displayed");
      });
    });
  }

  private parseJwt(token: string) {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map((c) => {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  }

  private async loadGoogleScript(): Promise<void> {
    if (this.googleScriptLoaded) return;

    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.onload = () => {
        this.googleScriptLoaded = true;
        resolve();
      };
      script.onerror = reject;
      document.body.appendChild(script);
    });
  }
}
