import { BaseSocialLogin } from './base';
import type { FacebookLoginOptions, FacebookLoginResponse, AuthorizationCode, LoginResult } from './definitions';

declare const FB: {
  init(options: any): void;
  login(
    callback: (response: { status: string; authResponse: { accessToken: string; userID: string } }) => void,
    options?: { scope: string },
  ): void;
  logout(callback: () => void): void;
  api(path: string, params: { fields: string }, callback: (response: any) => void): void;
  getLoginStatus(callback: (response: { status: string; authResponse?: { accessToken: string } }) => void): void;
};

export class FacebookSocialLogin extends BaseSocialLogin {
  private appId: string | null = null;
  private scriptLoaded = false;
  private locale = 'en_US';

  async initialize(appId: string | null, locale?: string): Promise<void> {
    this.appId = appId;
    if (locale) {
      this.locale = locale;
    }

    if (appId) {
      // Load with the specified locale or default
      await this.loadFacebookScript(this.locale);
      FB.init({
        appId: this.appId,
        version: 'v17.0',
        xfbml: true,
        cookie: true,
      });
    }
  }

  async login(options: FacebookLoginOptions): Promise<LoginResult> {
    if (!this.appId) {
      throw new Error('Facebook App ID not set. Call initialize() first.');
    }

    return new Promise((resolve, reject) => {
      FB.login(
        (response) => {
          if (response.status === 'connected') {
            this.handleConnectedResponse(response, resolve);
          } else {
            // Handle non-connected status - could be cancelled, not authorized, or verification pending
            // In some cases (e.g., 2FA/verification flow), the callback fires before the user completes
            // external verification. We'll poll the status to check if verification completes.
            this.pollLoginStatus(response.status, resolve, reject);
          }
        },
        { scope: options.permissions.join(',') },
      );
    });
  }

  private pollLoginStatus(
    initialStatus: string,
    resolve: (value: LoginResult) => void,
    reject: (reason: Error) => void,
  ): void {
    // Poll up to 5 times with 2-second intervals (10 seconds total)
    // This handles cases where user is verifying login on another device
    let attempts = 0;
    const maxAttempts = 5;
    const pollInterval = 2000; // 2 seconds

    const checkStatus = () => {
      attempts++;
      FB.getLoginStatus((statusResponse) => {
        if (statusResponse.status === 'connected' && statusResponse.authResponse) {
          // User completed verification externally
          this.handleConnectedResponse(statusResponse as any, resolve);
        } else if (attempts >= maxAttempts) {
          // Max attempts reached, reject with appropriate error
          const errorMessage =
            initialStatus === 'not_authorized' ? 'User denied app authorization' : 'Facebook login cancelled or failed';
          reject(new Error(errorMessage));
        } else {
          // Continue polling
          setTimeout(checkStatus, pollInterval);
        }
      });
    };

    // Start first check after initial delay
    setTimeout(checkStatus, pollInterval);
  }

  private handleConnectedResponse(
    response: { authResponse: { accessToken: string; userID: string } },
    resolve: (value: LoginResult) => void,
  ): void {
    FB.api('/me', { fields: 'id,name,email,picture' }, (userInfo: any) => {
      const result: FacebookLoginResponse = {
        accessToken: {
          token: response.authResponse.accessToken,
          userId: response.authResponse.userID,
        },
        profile: {
          userID: userInfo.id,
          name: userInfo.name,
          email: userInfo.email || null,
          imageURL: userInfo.picture?.data?.url || null,
          friendIDs: [],
          birthday: null,
          ageRange: null,
          gender: null,
          location: null,
          hometown: null,
          profileURL: null,
        },
        idToken: null,
      };
      resolve({ provider: 'facebook', result });
    });
  }

  async logout(): Promise<void> {
    return new Promise<void>((resolve) => {
      FB.logout(() => resolve());
    });
  }

  async isLoggedIn(): Promise<{ isLoggedIn: boolean }> {
    return new Promise((resolve) => {
      FB.getLoginStatus((response) => {
        resolve({ isLoggedIn: response.status === 'connected' });
      });
    });
  }

  async getAuthorizationCode(): Promise<AuthorizationCode> {
    return new Promise((resolve, reject) => {
      FB.getLoginStatus((response) => {
        if (response.status === 'connected') {
          resolve({ accessToken: response.authResponse?.accessToken || '' });
        } else {
          reject(new Error('No Facebook authorization code available'));
        }
      });
    });
  }

  async refresh(options: FacebookLoginOptions): Promise<void> {
    await this.login(options);
  }

  private async loadFacebookScript(locale: string): Promise<void> {
    if (this.scriptLoaded) return;

    // Remove any existing Facebook SDK script
    const existingScript = document.querySelector('script[src*="connect.facebook.net"]');
    if (existingScript) {
      existingScript.remove();
    }

    return this.loadScript(`https://connect.facebook.net/${locale}/sdk.js`).then(() => {
      this.scriptLoaded = true;
    });
  }
}
