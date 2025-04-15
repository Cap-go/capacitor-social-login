import { BaseSocialLogin } from './base';
import type { GoogleLoginOptions, LoginResult, ProviderResponseMap, AuthorizationCode } from './definitions';

export class GoogleSocialLogin extends BaseSocialLogin {
  private clientId: string | null = null;
  private hostedDomain?: string;
  private loginType: 'online' | 'offline' = 'online';
  private redirectUrl?: string;
  private GOOGLE_TOKEN_REQUEST_URL = 'https://www.googleapis.com/oauth2/v3/tokeninfo';
  private readonly GOOGLE_STATE_KEY = 'capgo_social_login_google_state';

  async initialize(
    clientId: string | null,
    mode?: 'online' | 'offline',
    hostedDomain?: string | null,
    redirectUrl?: string,
  ): Promise<void> {
    this.clientId = clientId;
    if (mode) {
      this.loginType = mode;
    }
    this.hostedDomain = hostedDomain as string | undefined;
    this.redirectUrl = redirectUrl;
  }

  async login<T extends 'google'>(
    options: GoogleLoginOptions,
  ): Promise<{ provider: T; result: ProviderResponseMap[T] }> {
    if (!this.clientId) {
      throw new Error('Google Client ID not set. Call initialize() first.');
    }

    let scopes = options.scopes || [];

    if (scopes.length > 0) {
      // If scopes are provided, directly use the traditional OAuth flow
      if (!scopes.includes('https://www.googleapis.com/auth/userinfo.email')) {
        scopes.push('https://www.googleapis.com/auth/userinfo.email');
      }
      if (!scopes.includes('https://www.googleapis.com/auth/userinfo.profile')) {
        scopes.push('https://www.googleapis.com/auth/userinfo.profile');
      }
      if (!scopes.includes('openid')) {
        scopes.push('openid');
      }
    } else {
      scopes = [
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile',
        'openid',
      ];
    }

    const nonce = options.nonce || Math.random().toString(36).substring(2);

    // If scopes are provided, directly use the traditional OAuth flow
    return this.traditionalOAuth({
      scopes,
      nonce,
      hostedDomain: this.hostedDomain,
    });
  }

  async logout(): Promise<void> {
    if (this.loginType === 'offline') {
      return Promise.reject("Offline login doesn't store tokens. logout is not available");
    }
    // eslint-disable-next-line
    const state = this.getGoogleState();
    if (!state) return;
    await this.rawLogoutGoogle(state.accessToken);
  }

  async isLoggedIn(): Promise<{ isLoggedIn: boolean }> {
    if (this.loginType === 'offline') {
      return Promise.reject("Offline login doesn't store tokens. isLoggedIn is not available");
    }
    // eslint-disable-next-line
    const state = this.getGoogleState();
    if (!state) return { isLoggedIn: false };

    try {
      const isValidAccessToken = await this.accessTokenIsValid(state.accessToken);
      const isValidIdToken = this.idTokenValid(state.idToken);
      if (isValidAccessToken && isValidIdToken) {
        return { isLoggedIn: true };
      } else {
        try {
          await this.rawLogoutGoogle(state.accessToken, false);
        } catch (e) {
          console.error('Access token is not valid, but cannot logout', e);
        }
        return { isLoggedIn: false };
      }
    } catch (e) {
      return Promise.reject(e);
    }
  }

  async getAuthorizationCode(): Promise<AuthorizationCode> {
    if (this.loginType === 'offline') {
      return Promise.reject("Offline login doesn't store tokens. getAuthorizationCode is not available");
    }
    // eslint-disable-next-line
    const state = this.getGoogleState();
    if (!state) throw new Error('No Google authorization code available');

    try {
      const isValidAccessToken = await this.accessTokenIsValid(state.accessToken);
      const isValidIdToken = this.idTokenValid(state.idToken);
      if (isValidAccessToken && isValidIdToken) {
        return { accessToken: state.accessToken, jwt: state.idToken };
      } else {
        try {
          await this.rawLogoutGoogle(state.accessToken, false);
        } catch (e) {
          console.error('Access token is not valid, but cannot logout', e);
        }
        throw new Error('No Google authorization code available');
      }
    } catch (e) {
      return Promise.reject(e);
    }
  }

  async refresh(): Promise<void> {
    // For Google, we can prompt for re-authentication
    return Promise.reject('Not implemented');
  }

  handleOAuthRedirect(url: URL): LoginResult | null {
    const paramsRaw = url.searchParams;
    const code = paramsRaw.get('code');

    if (code && paramsRaw.has('scope')) {
      return {
        provider: 'google',
        result: {
          serverAuthCode: code,
          responseType: 'offline',
        },
      };
    }

    const hash = url.hash.substring(1);
    console.log('handleOAuthRedirect', url.hash);
    if (!hash) return null;
    console.log('handleOAuthRedirect ok');

    const params = new URLSearchParams(hash);
    const accessToken = params.get('access_token');
    const idToken = params.get('id_token');

    if (accessToken && idToken) {
      localStorage.removeItem(BaseSocialLogin.OAUTH_STATE_KEY);
      const profile = this.parseJwt(idToken);
      return {
        provider: 'google',
        result: {
          accessToken: {
            token: accessToken,
          },
          idToken,
          profile: {
            email: profile.email || null,
            familyName: profile.family_name || null,
            givenName: profile.given_name || null,
            id: profile.sub || null,
            name: profile.name || null,
            imageUrl: profile.picture || null,
          },
          responseType: 'online',
        },
      };
    }
    return null;
  }

  private async accessTokenIsValid(accessToken: string): Promise<boolean> {
    const url = `${this.GOOGLE_TOKEN_REQUEST_URL}?access_token=${encodeURIComponent(accessToken)}`;

    try {
      // Make the GET request using fetch
      const response = await fetch(url);

      // Check if the response is successful
      if (!response.ok) {
        console.log(
          `Invalid response from ${this.GOOGLE_TOKEN_REQUEST_URL}. Response not successful. Status code: ${response.status}. Assuming that the token is not valid`,
        );
        return false;
      }

      // Get the response body as text
      const responseBody = await response.text();

      if (!responseBody) {
        console.error(`Invalid response from ${this.GOOGLE_TOKEN_REQUEST_URL}. Response body is null`);
        throw new Error(`Invalid response from ${this.GOOGLE_TOKEN_REQUEST_URL}. Response body is null`);
      }

      // Parse the response body as JSON
      let jsonObject: any;
      try {
        jsonObject = JSON.parse(responseBody);
      } catch (e) {
        console.error(
          `Invalid response from ${this.GOOGLE_TOKEN_REQUEST_URL}. Response body is not valid JSON. Error: ${e}`,
        );
        throw new Error(
          `Invalid response from ${this.GOOGLE_TOKEN_REQUEST_URL}. Response body is not valid JSON. Error: ${e}`,
        );
      }

      // Extract the 'expires_in' field
      const expiresInStr = jsonObject['expires_in'];

      if (expiresInStr === undefined || expiresInStr === null) {
        console.error(
          `Invalid response from ${this.GOOGLE_TOKEN_REQUEST_URL}. Response JSON does not include 'expires_in'.`,
        );
        throw new Error(
          `Invalid response from ${this.GOOGLE_TOKEN_REQUEST_URL}. Response JSON does not include 'expires_in'.`,
        );
      }

      // Parse 'expires_in' as an integer
      let expiresInInt: number;
      try {
        expiresInInt = parseInt(expiresInStr, 10);
        if (isNaN(expiresInInt)) {
          throw new Error(`'expires_in' is not a valid integer`);
        }
      } catch (e) {
        console.error(
          `Invalid response from ${this.GOOGLE_TOKEN_REQUEST_URL}. 'expires_in': ${expiresInStr} is not a valid integer. Error: ${e}`,
        );
        throw new Error(
          `Invalid response from ${this.GOOGLE_TOKEN_REQUEST_URL}. 'expires_in': ${expiresInStr} is not a valid integer. Error: ${e}`,
        );
      }

      // Determine if the access token is valid based on 'expires_in'
      return expiresInInt > 5;
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  private idTokenValid(idToken: string): boolean {
    try {
      const parsed = this.parseJwt(idToken);
      const currentTime = Math.ceil(Date.now() / 1000) + 5; // Convert current time to seconds since epoch
      return parsed.exp && currentTime < parsed.exp;
    } catch (e) {
      return false;
    }
  }

  private async rawLogoutGoogle(accessToken: string, tokenValid: boolean | null = null) {
    if (tokenValid === null) {
      tokenValid = await this.accessTokenIsValid(accessToken);
    }

    if (tokenValid === true) {
      try {
        await fetch(`https://accounts.google.com/o/oauth2/revoke?token=${encodeURIComponent(accessToken)}`);
        this.clearStateGoogle();
      } catch (e) {
        // ignore
      }
      return;
    } else {
      this.clearStateGoogle();
      return;
    }
  }

  private persistStateGoogle(accessToken: string, idToken: string) {
    try {
      window.localStorage.setItem(this.GOOGLE_STATE_KEY, JSON.stringify({ accessToken, idToken }));
    } catch (e) {
      console.error('Cannot persist state google', e);
    }
  }

  private clearStateGoogle() {
    try {
      window.localStorage.removeItem(this.GOOGLE_STATE_KEY);
    } catch (e) {
      console.error('Cannot clear state google', e);
    }
  }

  private getGoogleState(): { accessToken: string; idToken: string } | null {
    try {
      const state = window.localStorage.getItem(this.GOOGLE_STATE_KEY);
      if (!state) return null;
      const { accessToken, idToken } = JSON.parse(state);
      return { accessToken, idToken };
    } catch (e) {
      console.error('Cannot get state google', e);
      return null;
    }
  }

  private async traditionalOAuth<T extends 'google'>({
    scopes,
    hostedDomain,
    nonce,
  }: GoogleLoginOptions & { hostedDomain?: string }): Promise<{ provider: T; result: ProviderResponseMap[T] }> {
    const uniqueScopes = [...new Set([...(scopes || []), 'openid'])];

    const params = new URLSearchParams({
      client_id: this.clientId!,
      redirect_uri: this.redirectUrl || window.location.origin + window.location.pathname,
      response_type: this.loginType === 'offline' ? 'code' : 'token id_token',
      scope: uniqueScopes.join(' '),
      ...(nonce && { nonce }),
      include_granted_scopes: 'true',
      state: 'popup',
    });
    if (hostedDomain !== undefined) {
      params.append('hd', hostedDomain);
    }

    const url = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    const width = 500;
    const height = 600;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    localStorage.setItem(BaseSocialLogin.OAUTH_STATE_KEY, 'true');
    const popup = window.open(url, 'Google Sign In', `width=${width},height=${height},left=${left},top=${top},popup=1`);

    // This may never return...
    return new Promise((resolve, reject) => {
      if (!popup) {
        reject(new Error('Failed to open popup'));
        return;
      }

      const handleMessage = (event: MessageEvent) => {
        if (event.origin !== window.location.origin || event.data?.source?.startsWith('angular')) return;

        if (event.data?.type === 'oauth-response') {
          window.removeEventListener('message', handleMessage);

          if (this.loginType === 'online') {
            const { accessToken, idToken } = event.data;
            if (accessToken && idToken) {
              const profile = this.parseJwt(idToken);
              this.persistStateGoogle(accessToken.token, idToken);
              resolve({
                provider: 'google' as T,
                result: {
                  accessToken: {
                    token: accessToken.token,
                  },
                  idToken,
                  profile: {
                    email: profile.email || null,
                    familyName: profile.family_name || null,
                    givenName: profile.given_name || null,
                    id: profile.sub || null,
                    name: profile.name || null,
                    imageUrl: profile.picture || null,
                  },
                  responseType: 'online',
                },
              });
            }
          } else {
            const { serverAuthCode } = event.data as {
              serverAuthCode: string;
            };
            resolve({
              provider: 'google' as T,
              result: {
                responseType: 'offline',
                serverAuthCode,
              },
            });
          }
        }
        // Don't reject for non-OAuth messages, just ignore them
      };

      window.addEventListener('message', handleMessage);

      // Timeout after 5 minutes
      setTimeout(() => {
        window.removeEventListener('message', handleMessage);
        popup.close();
        reject(new Error('OAuth timeout'));
      }, 300000);
    });
  }
}
