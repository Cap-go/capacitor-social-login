import { BaseSocialLogin } from './base';
import type {
  AuthorizationCode,
  LoginResult,
  ProviderResponseMap,
  TwitterLoginOptions,
  TwitterLoginResponse,
  TwitterProfile,
} from './definitions';

interface TwitterTokenResponse {
  token_type: 'bearer';
  expires_in: number;
  access_token: string;
  scope: string;
  refresh_token?: string;
}

interface TwitterUserResponse {
  data: {
    id: string;
    name: string;
    username: string;
    profile_image_url?: string;
    verified?: boolean;
  } & { email?: string };
}

interface TwitterPendingLogin {
  codeVerifier: string;
  redirectUri: string;
  scopes: string[];
}

interface TwitterStoredTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  scope: string[];
  tokenType: string;
  userId?: string;
  profile?: TwitterProfile;
}

export class TwitterSocialLogin extends BaseSocialLogin {
  private clientId: string | null = null;
  private redirectUrl: string | null = null;
  private defaultScopes: string[] = ['tweet.read', 'users.read'];
  private forceLogin = false;
  private audience?: string;
  private readonly TOKENS_KEY = 'capgo_social_login_twitter_tokens_v1';
  private readonly STATE_PREFIX = 'capgo_social_login_twitter_state_';

  async initialize(
    clientId: string | null,
    redirectUrl?: string | null,
    defaultScopes?: string[],
    forceLogin?: boolean,
    audience?: string,
  ): Promise<void> {
    this.clientId = clientId;
    this.redirectUrl = redirectUrl ?? null;
    if (defaultScopes?.length) {
      this.defaultScopes = defaultScopes;
    }
    this.forceLogin = forceLogin ?? false;
    this.audience = audience ?? undefined;
  }

  async login<T extends 'twitter'>(
    options: TwitterLoginOptions,
  ): Promise<{ provider: T; result: ProviderResponseMap[T] }> {
    if (!this.clientId) {
      throw new Error('Twitter Client ID not configured. Call initialize() first.');
    }

    const redirectUri = options.redirectUrl ?? this.redirectUrl ?? window.location.origin + window.location.pathname;
    const scopes = options.scopes?.length ? options.scopes : this.defaultScopes;
    const state = options.state ?? this.generateState();
    const codeVerifier = options.codeVerifier ?? this.generateCodeVerifier();
    const codeChallenge = await this.generateCodeChallenge(codeVerifier);

    this.persistPendingLogin(state, {
      codeVerifier,
      redirectUri,
      scopes,
    });

    localStorage.setItem(BaseSocialLogin.OAUTH_STATE_KEY, JSON.stringify({ provider: 'twitter', state }));

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: redirectUri,
      scope: scopes.join(' '),
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });
    if ((options.forceLogin ?? this.forceLogin) === true) {
      params.set('force_login', 'true');
    }
    if (this.audience) {
      params.set('audience', this.audience);
    }

    const authUrl = `https://x.com/i/oauth2/authorize?${params.toString()}`;
    const width = 500;
    const height = 650;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    const popup = window.open(authUrl, 'XLogin', `width=${width},height=${height},left=${left},top=${top},popup=1`);

    return new Promise((resolve, reject) => {
      if (!popup) {
        reject(new Error('Unable to open login window. Please allow popups.'));
        return;
      }

      // Use BroadcastChannel for cross-origin communication (works when postMessage doesn't)
      const channelName = `twitter_oauth_${state}`;
      let broadcastChannel: BroadcastChannel | null = null;

      try {
        broadcastChannel = new BroadcastChannel(channelName);
      } catch {
        // BroadcastChannel not supported, fall back to postMessage only
      }

      // Track if we've encountered a COOP error to avoid repeated checks
      let coopErrorDetected = false;

      const cleanup = (
        messageHandler: (event: MessageEvent) => void,
        timeoutHandle: number,
        intervalHandle: number,
      ) => {
        window.removeEventListener('message', messageHandler);
        clearTimeout(timeoutHandle);
        clearInterval(intervalHandle);
        if (broadcastChannel) {
          broadcastChannel.close();
        }
      };

      const handleOAuthMessage = (data: Record<string, unknown>) => {
        if (data?.type === 'oauth-response') {
          if (data?.provider && data.provider !== 'twitter') {
            return false;
          }
          cleanup(messageHandler, timeoutHandle, popupClosedInterval);
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const {
            provider: _ignoredProvider,
            type: _ignoredType,
            ...payload
          } = data as unknown as TwitterLoginResponse & {
            provider?: string;
            type?: string;
          };
          resolve({
            provider: 'twitter' as T,
            result: payload as ProviderResponseMap[T],
          } as { provider: T; result: ProviderResponseMap[T] });
          return true;
        } else if (data?.type === 'oauth-error') {
          if (data?.provider && data.provider !== 'twitter') {
            return false;
          }
          cleanup(messageHandler, timeoutHandle, popupClosedInterval);
          reject(new Error((data.error as string) || 'Twitter login was cancelled.'));
          return true;
        }
        return false;
      };

      // Listen for BroadcastChannel messages
      if (broadcastChannel) {
        broadcastChannel.onmessage = (event: MessageEvent) => {
          handleOAuthMessage(event.data);
        };
      }

      const messageHandler = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) {
          return;
        }
        handleOAuthMessage(event.data);
      };

      window.addEventListener('message', messageHandler);

      const timeoutHandle = window.setTimeout(() => {
        cleanup(messageHandler, timeoutHandle, popupClosedInterval);
        try {
          popup.close();
        } catch {
          // Ignore cross-origin errors when closing
        }
        reject(new Error('Twitter login timed out.'));
      }, 300000);

      const popupClosedInterval = window.setInterval(() => {
        // Skip checking if we've already detected a COOP error
        if (coopErrorDetected) {
          return;
        }

        try {
          // Check if popup is closed - this may throw cross-origin errors for some providers
          if (popup.closed) {
            cleanup(messageHandler, timeoutHandle, popupClosedInterval);
            reject(new Error('Twitter login window was closed.'));
          }
        } catch {
          // Cross-origin error when checking popup.closed - this happens when the popup
          // navigates to a third-party OAuth provider with strict security settings (COOP).
          // We can't detect if the window was closed, so we rely on timeout and message handlers.
          // The popup will close itself after authentication completes.
          coopErrorDetected = true;
          console.log(
            '[Twitter Login] Cannot check popup.closed due to Cross-Origin-Opener-Policy restrictions. ' +
              'The popup will close automatically after login completes. Relying on BroadcastChannel and timeout.',
          );
        }
      }, 1000);
    });
  }

  async logout(): Promise<void> {
    localStorage.removeItem(this.TOKENS_KEY);
  }

  async isLoggedIn(): Promise<{ isLoggedIn: boolean }> {
    const tokens = this.getStoredTokens();
    if (!tokens) {
      return { isLoggedIn: false };
    }
    const isValid = tokens.expiresAt > Date.now();
    if (!isValid) {
      localStorage.removeItem(this.TOKENS_KEY);
    }
    return { isLoggedIn: isValid };
  }

  async getAuthorizationCode(): Promise<AuthorizationCode> {
    const tokens = this.getStoredTokens();
    if (!tokens) {
      throw new Error('Twitter access token is not available.');
    }
    return {
      accessToken: tokens.accessToken,
    };
  }

  async refresh(): Promise<void> {
    const tokens = this.getStoredTokens();
    if (!tokens?.refreshToken) {
      throw new Error('No Twitter refresh token is available. Include offline.access scope to receive one.');
    }

    await this.refreshWithRefreshToken(tokens.refreshToken);
  }

  async handleOAuthRedirect(url: URL, expectedState?: string): Promise<LoginResult | { error: string } | null> {
    const params = url.searchParams;
    const stateFromUrl = expectedState ?? params.get('state');
    if (!stateFromUrl) {
      return null;
    }

    const pending = this.consumePendingLogin(stateFromUrl);
    if (!pending) {
      localStorage.removeItem(BaseSocialLogin.OAUTH_STATE_KEY);
      return { error: 'Twitter login session expired or state mismatch.' };
    }

    const error = params.get('error');
    if (error) {
      localStorage.removeItem(BaseSocialLogin.OAUTH_STATE_KEY);
      return { error: params.get('error_description') || error };
    }

    const code = params.get('code');
    if (!code) {
      localStorage.removeItem(BaseSocialLogin.OAUTH_STATE_KEY);
      return { error: 'Twitter authorization code missing from redirect.' };
    }

    try {
      const tokens = await this.exchangeAuthorizationCode(code, pending);
      const profile = await this.fetchProfile(tokens.access_token);
      const expiresAt = Date.now() + tokens.expires_in * 1000;
      const scopeArray = tokens.scope.split(' ').filter(Boolean);

      this.persistTokens({
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt,
        scope: scopeArray,
        tokenType: tokens.token_type,
        userId: profile.id,
        profile,
      });

      return {
        provider: 'twitter',
        result: {
          accessToken: {
            token: tokens.access_token,
            tokenType: tokens.token_type,
            expires: new Date(expiresAt).toISOString(),
            userId: profile.id,
          },
          refreshToken: tokens.refresh_token,
          scope: scopeArray,
          tokenType: tokens.token_type,
          expiresIn: tokens.expires_in,
          profile,
        },
      };
    } catch (err) {
      if (err instanceof Error) {
        return { error: err.message };
      }
      return { error: 'Twitter login failed unexpectedly.' };
    } finally {
      localStorage.removeItem(BaseSocialLogin.OAUTH_STATE_KEY);
    }
  }

  private async exchangeAuthorizationCode(code: string, pending: TwitterPendingLogin): Promise<TwitterTokenResponse> {
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: this.clientId ?? '',
      code,
      redirect_uri: pending.redirectUri,
      code_verifier: pending.codeVerifier,
    });

    const response = await fetch('https://api.x.com/2/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Twitter token exchange failed (${response.status}): ${text}`);
    }

    return (await response.json()) as TwitterTokenResponse;
  }

  private async refreshWithRefreshToken(refreshToken: string): Promise<void> {
    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: this.clientId ?? '',
    });

    const response = await fetch('https://api.x.com/2/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Twitter refresh failed (${response.status}): ${text}`);
    }

    const tokens = (await response.json()) as TwitterTokenResponse;
    const profile = await this.fetchProfile(tokens.access_token);
    const expiresAt = Date.now() + tokens.expires_in * 1000;
    const scopeArray = tokens.scope.split(' ').filter(Boolean);

    this.persistTokens({
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token ?? refreshToken,
      expiresAt,
      scope: scopeArray,
      tokenType: tokens.token_type,
      userId: profile.id,
      profile,
    });
  }

  private async fetchProfile(accessToken: string): Promise<TwitterProfile> {
    const fields = ['profile_image_url', 'verified', 'name', 'username'];
    const response = await fetch(`https://api.x.com/2/users/me?user.fields=${fields.join(',')}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Unable to fetch Twitter profile (${response.status}): ${text}`);
    }

    const payload = (await response.json()) as TwitterUserResponse;
    if (!payload.data) {
      throw new Error('Twitter profile payload is missing data.');
    }

    return {
      id: payload.data.id,
      username: payload.data.username,
      name: payload.data.name ?? null,
      profileImageUrl: payload.data.profile_image_url ?? null,
      verified: payload.data.verified ?? false,
      email: (payload.data as { email?: string }).email ?? null,
    };
  }

  private persistTokens(tokens: TwitterStoredTokens): void {
    localStorage.setItem(this.TOKENS_KEY, JSON.stringify(tokens));
  }

  private getStoredTokens(): TwitterStoredTokens | null {
    const raw = localStorage.getItem(this.TOKENS_KEY);
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw) as TwitterStoredTokens;
    } catch (err) {
      console.warn('Failed to parse stored Twitter tokens', err);
      return null;
    }
  }

  private persistPendingLogin(state: string, payload: TwitterPendingLogin): void {
    localStorage.setItem(`${this.STATE_PREFIX}${state}`, JSON.stringify(payload));
  }

  private consumePendingLogin(state: string): TwitterPendingLogin | null {
    const key = `${this.STATE_PREFIX}${state}`;
    const raw = localStorage.getItem(key);
    localStorage.removeItem(key);
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw) as TwitterPendingLogin;
    } catch (err) {
      console.warn('Failed to parse pending Twitter login payload', err);
      return null;
    }
  }

  private generateState(): string {
    return [...crypto.getRandomValues(new Uint8Array(16))].map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  private generateCodeVerifier(): string {
    const array = new Uint8Array(64);
    crypto.getRandomValues(array);
    return Array.from(array)
      .map((b) => 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-._~'[b % 66])
      .join('');
  }

  private async generateCodeChallenge(codeVerifier: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(codeVerifier);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return this.base64UrlEncode(new Uint8Array(digest));
  }

  private base64UrlEncode(buffer: Uint8Array): string {
    let binary = '';
    buffer.forEach((b) => (binary += String.fromCharCode(b)));
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
}
