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
  getLoginStatus(
    callback: (response: { status: string; authResponse?: { accessToken: string; userID?: string } }) => void,
  ): void;
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
      let settled = false;
      let waitingForStatus = false;

      const resolveWithProfile = (authResponse: { accessToken?: string; userID?: string } | undefined) => {
        if (settled) return;
        if (!authResponse?.accessToken || !authResponse.userID) {
          settled = true;
          reject(new Error('Facebook login failed'));
          return;
        }

        const accessToken = authResponse.accessToken;
        const userId = authResponse.userID;

        FB.api('/me', { fields: 'id,name,email,picture' }, (userInfo: any) => {
          settled = true;
          const result: FacebookLoginResponse = {
            accessToken: {
              token: accessToken,
              userId,
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
      };

      const waitForConnected = () => {
        if (settled || waitingForStatus) return;
        waitingForStatus = true;
        this.waitForConnection()
          .then((statusResponse) => resolveWithProfile(statusResponse.authResponse))
          .catch((error) => {
            if (settled) return;
            settled = true;
            reject(error);
          });
      };

      FB.login(
        (response) => {
          if (response.status === 'connected') {
            resolveWithProfile(response.authResponse);
          } else if (response.status === 'not_authorized' || response.status === 'unknown') {
            reject(new Error('Facebook login was cancelled.'));
          } else {
            waitForConnected();
          }
        },
        options.permissions?.length ? { scope: options.permissions.join(',') } : undefined,
      );
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

  private waitForConnection(
    timeoutMs = 120000,
    pollIntervalMs = 500,
  ): Promise<{ status: string; authResponse?: { accessToken: string; userID?: string } }> {
    const start = Date.now();
    return new Promise((resolve, reject) => {
      let finished = false;

      const pollStatus = () => {
        if (finished) return;

        FB.getLoginStatus((response) => {
          if (finished) return;

          if (response.status === 'connected' && response.authResponse?.accessToken) {
            finished = true;
            resolve(response);
            return;
          }

          if (response.status === 'not_authorized' || response.status === 'unknown') {
            finished = true;
            reject(new Error('Facebook login was cancelled.'));
            return;
          }

          if (Date.now() - start >= timeoutMs) {
            finished = true;
            reject(new Error('Facebook login failed or timed out'));
            return;
          }

          setTimeout(pollStatus, pollIntervalMs);
        });
      };

      pollStatus();
    });
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
