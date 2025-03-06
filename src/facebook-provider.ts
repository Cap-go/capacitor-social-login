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

  async initialize(appId: string | null): Promise<void> {
    this.appId = appId;

    if (appId) {
      await this.loadFacebookScript();
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
          } else {
            reject(new Error('Facebook login failed'));
          }
        },
        { scope: options.permissions.join(',') },
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
          resolve({ jwt: response.authResponse?.accessToken || '' });
        } else {
          reject(new Error('No Facebook authorization code available'));
        }
      });
    });
  }

  async refresh(options: FacebookLoginOptions): Promise<void> {
    await this.login(options);
  }

  private async loadFacebookScript(): Promise<void> {
    if (this.scriptLoaded) return;

    return this.loadScript('https://connect.facebook.net/en_US/sdk.js').then(() => {
      this.scriptLoaded = true;
    });
  }
}
