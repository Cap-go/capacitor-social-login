import { BaseSocialLogin } from './base';
import type { AppleProviderOptions, AppleProviderResponse, AuthorizationCode, LoginResult } from './definitions';

declare const AppleID: any;

export class AppleSocialLogin extends BaseSocialLogin {
  private clientId: string | null = null;
  private redirectUrl: string | null = null;
  private scriptLoaded = false;
  private scriptUrl = 'https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js';
  private useProperTokenExchange = false;

  async initialize(
    clientId: string | null,
    redirectUrl: string | null | undefined,
    useProperTokenExchange = false,
  ): Promise<void> {
    this.clientId = clientId;
    this.redirectUrl = redirectUrl || null;
    this.useProperTokenExchange = useProperTokenExchange;

    if (clientId) {
      await this.loadAppleScript();
    }
  }

  async login(options: AppleProviderOptions): Promise<LoginResult> {
    if (!this.clientId) {
      throw new Error('Apple Client ID not set. Call initialize() first.');
    }

    if (!this.scriptLoaded) {
      throw new Error('Apple Sign-In script not loaded.');
    }

    return new Promise((resolve, reject) => {
      AppleID.auth.init({
        clientId: this.clientId ?? '',
        scope: options.scopes?.join(' ') || 'name email',
        redirectURI: this.redirectUrl || window.location.href,
        state: options.state,
        nonce: options.nonce,
        usePopup: true,
      });

      AppleID.auth
        .signIn()
        .then((res: any) => {
          let accessToken: { token: string } | null = null;

          if (this.useProperTokenExchange) {
            // When using proper token exchange, the authorization code should be exchanged
            // for a proper access token on the backend. For now, we set accessToken to null
            // and provide the authorization code in a separate field for backend processing.
            accessToken = null;
          } else {
            // Legacy behavior: use authorization code as access token for backward compatibility
            accessToken = {
              token: res.authorization.code || '',
            };
          }

          const result: AppleProviderResponse = {
            profile: {
              user: res.user || '',
              email: res.user?.email || null,
              givenName: res.user?.name?.firstName || null,
              familyName: res.user?.name?.lastName || null,
            },
            accessToken: accessToken,
            idToken: res.authorization.id_token || null,
            // Add authorization code for proper token exchange when flag is enabled
            ...(this.useProperTokenExchange && { authorizationCode: res.authorization.code }),
          };
          resolve({ provider: 'apple', result });
        })
        .catch((error: any) => {
          reject(error);
        });
    });
  }

  async logout(): Promise<void> {
    // Apple doesn't provide a logout method for web
    console.log('Apple logout: Session should be managed on the client side');
  }

  async isLoggedIn(): Promise<{ isLoggedIn: boolean }> {
    // Apple doesn't provide a method to check login status on web
    console.log('Apple login status should be managed on the client side');
    return { isLoggedIn: false };
  }

  async getAuthorizationCode(): Promise<AuthorizationCode> {
    // Apple authorization code should be obtained during login
    console.log('Apple authorization code should be stored during login');
    throw new Error('Apple authorization code not available');
  }

  async refresh(): Promise<void> {
    // Apple doesn't provide a refresh method for web
    console.log('Apple refresh not available on web');
  }

  private async loadAppleScript(): Promise<void> {
    if (this.scriptLoaded) return;

    return this.loadScript(this.scriptUrl).then(() => {
      this.scriptLoaded = true;
    });
  }
}
