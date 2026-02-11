import { BaseSocialLogin } from './base';
import type {
  AuthorizationCode,
  LoginResult,
  OAuth2LoginOptions,
  OAuth2LoginResponse,
  OAuth2ProviderConfig,
  ProviderResponseMap,
} from './definitions';

interface OAuth2TokenResponse {
  token_type: string;
  expires_in?: number;
  access_token: string;
  scope?: string;
  refresh_token?: string;
  id_token?: string;
}

interface OAuth2PendingLogin {
  providerId: string;
  codeVerifier: string;
  redirectUri: string;
  scope: string;
}

interface OAuth2StoredTokens {
  accessToken: string;
  refreshToken?: string;
  idToken?: string;
  expiresAt: number;
  scope: string[];
  tokenType: string;
}

interface OAuth2ConfigInternal {
  appId: string;
  issuerUrl?: string;
  authorizationBaseUrl?: string;
  accessTokenEndpoint?: string;
  redirectUrl: string;
  resourceUrl?: string;
  responseType: 'code' | 'token';
  pkceEnabled: boolean;
  scope: string;
  additionalParameters?: Record<string, string>;
  loginHint?: string;
  prompt?: string;
  additionalTokenParameters?: Record<string, string>;
  additionalResourceHeaders?: Record<string, string>;
  logoutUrl?: string;
  postLogoutRedirectUrl?: string;
  additionalLogoutParameters?: Record<string, string>;
  logsEnabled: boolean;
}

/**
 * OAuth2 Social Login Manager
 * Supports multiple OAuth2 provider configurations
 */
export class OAuth2SocialLogin extends BaseSocialLogin {
  private providers: Map<string, OAuth2ConfigInternal> = new Map();
  private readonly TOKENS_KEY_PREFIX = 'capgo_social_login_oauth2_tokens_';
  private readonly STATE_PREFIX = 'capgo_social_login_oauth2_state_';

  private normalizeScopeValue(scope: unknown): string {
    if (!scope) return '';
    if (typeof scope === 'string') return scope;
    if (Array.isArray(scope)) return scope.filter(Boolean).join(' ');
    return '';
  }

  private normalizeConfig(providerId: string, config: OAuth2ProviderConfig): OAuth2ConfigInternal {
    const appId = config.appId ?? config.clientId;
    const authorizationBaseUrl = config.authorizationBaseUrl ?? config.authorizationEndpoint;
    const accessTokenEndpoint = config.accessTokenEndpoint ?? config.tokenEndpoint;
    const logoutUrl = config.logoutUrl ?? config.endSessionEndpoint;
    const scopeSource = config.scope ?? config.scopes;

    if (!appId) {
      throw new Error(`OAuth2 provider '${providerId}' requires appId (or clientId).`);
    }
    if (!config.redirectUrl) {
      throw new Error(`OAuth2 provider '${providerId}' requires redirectUrl.`);
    }
    if (!authorizationBaseUrl && !config.issuerUrl) {
      throw new Error(
        `OAuth2 provider '${providerId}' requires authorizationBaseUrl (or authorizationEndpoint) or issuerUrl.`,
      );
    }

    return {
      appId,
      issuerUrl: config.issuerUrl,
      authorizationBaseUrl,
      accessTokenEndpoint,
      redirectUrl: config.redirectUrl,
      resourceUrl: config.resourceUrl,
      responseType: (config.responseType ?? 'code') as 'code' | 'token',
      pkceEnabled: config.pkceEnabled ?? true,
      scope: this.normalizeScopeValue(scopeSource),
      additionalParameters: config.additionalParameters,
      loginHint: config.loginHint,
      prompt: config.prompt,
      additionalTokenParameters: config.additionalTokenParameters,
      additionalResourceHeaders: config.additionalResourceHeaders,
      logoutUrl,
      postLogoutRedirectUrl: config.postLogoutRedirectUrl,
      additionalLogoutParameters: config.additionalLogoutParameters,
      logsEnabled: config.logsEnabled ?? false,
    };
  }

  private async ensureDiscovered(providerId: string): Promise<void> {
    const config = this.providers.get(providerId);
    if (!config?.issuerUrl) return;

    // Resolve endpoints lazily.
    if (config.authorizationBaseUrl && config.accessTokenEndpoint) return;

    const issuer = config.issuerUrl.replace(/\/+$/, '');
    const discoveryUrl = `${issuer}/.well-known/openid-configuration`;
    const resp = await fetch(discoveryUrl);
    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      throw new Error(`OAuth2 discovery failed (${resp.status}): ${text || discoveryUrl}`);
    }
    const payload = (await resp.json()) as Record<string, unknown>;

    const authorizationEndpoint = payload['authorization_endpoint'];
    const tokenEndpoint = payload['token_endpoint'];
    const endSessionEndpoint = payload['end_session_endpoint'];

    if (!config.authorizationBaseUrl && typeof authorizationEndpoint === 'string') {
      config.authorizationBaseUrl = authorizationEndpoint;
    }
    if (!config.accessTokenEndpoint && typeof tokenEndpoint === 'string') {
      config.accessTokenEndpoint = tokenEndpoint;
    }
    if (!config.logoutUrl && typeof endSessionEndpoint === 'string') {
      config.logoutUrl = endSessionEndpoint;
    }

    if (config.logsEnabled) {
      console.log(`[OAuth2:${providerId}] Discovery resolved`, {
        authorizationBaseUrl: config.authorizationBaseUrl,
        accessTokenEndpoint: config.accessTokenEndpoint,
        logoutUrl: config.logoutUrl,
      });
    }
  }

  /**
   * Initialize multiple OAuth2 providers
   */
  async initializeProviders(configs: Record<string, OAuth2ProviderConfig>): Promise<void> {
    for (const [providerId, config] of Object.entries(configs)) {
      const internalConfig = this.normalizeConfig(providerId, config);
      this.providers.set(providerId, internalConfig);

      if (internalConfig.logsEnabled) {
        console.log(`[OAuth2:${providerId}] Initialized with config:`, {
          appId: internalConfig.appId,
          issuerUrl: internalConfig.issuerUrl,
          authorizationBaseUrl: internalConfig.authorizationBaseUrl,
          redirectUrl: internalConfig.redirectUrl,
          responseType: internalConfig.responseType,
          pkceEnabled: internalConfig.pkceEnabled,
        });
      }

      // Pre-resolve discovery on web if issuerUrl is provided.
      await this.ensureDiscovered(providerId);
    }
  }

  private getProvider(providerId: string): OAuth2ConfigInternal {
    const config = this.providers.get(providerId);
    if (!config) {
      throw new Error(`OAuth2 provider '${providerId}' not configured. Call initialize() first.`);
    }
    return config;
  }

  private getTokensKey(providerId: string): string {
    return `${this.TOKENS_KEY_PREFIX}${providerId}`;
  }

  async login<T extends 'oauth2'>(
    options: OAuth2LoginOptions,
  ): Promise<{ provider: T; result: ProviderResponseMap[T] }> {
    const { providerId } = options;
    const config = this.getProvider(providerId);
    await this.ensureDiscovered(providerId);

    const redirectUri = options.redirectUrl ?? config.redirectUrl;
    const scope = this.normalizeScopeValue(options.scope ?? options.scopes ?? config.scope);
    const state = options.state ?? this.generateState();
    const codeVerifier = options.codeVerifier ?? this.generateCodeVerifier();

    // Build authorization URL
    const params = new URLSearchParams({
      response_type: config.responseType,
      client_id: config.appId,
      redirect_uri: redirectUri,
      state,
    });

    if (scope) {
      params.set('scope', scope);
    }

    // Convenience OIDC options
    const mergedAdditionalParams: Record<string, string> = {
      ...(config.additionalParameters ?? {}),
      ...(options.additionalParameters ?? {}),
    };
    const loginHint = options.loginHint ?? config.loginHint;
    const prompt = options.prompt ?? config.prompt;
    if (loginHint && !('login_hint' in mergedAdditionalParams)) {
      mergedAdditionalParams.login_hint = loginHint;
    }
    if (prompt && !('prompt' in mergedAdditionalParams)) {
      mergedAdditionalParams.prompt = prompt;
    }

    // Add PKCE for code flow
    if (config.responseType === 'code' && config.pkceEnabled) {
      const codeChallenge = await this.generateCodeChallenge(codeVerifier);
      params.set('code_challenge', codeChallenge);
      params.set('code_challenge_method', 'S256');
    }

    // Add merged additional parameters
    for (const [key, value] of Object.entries(mergedAdditionalParams)) {
      if (value !== undefined) {
        params.set(key, value);
      }
    }

    // Store pending login state
    this.persistPendingLogin(state, {
      providerId,
      codeVerifier,
      redirectUri,
      scope,
    });

    localStorage.setItem(BaseSocialLogin.OAUTH_STATE_KEY, JSON.stringify({ provider: 'oauth2', providerId, state }));

    if (!config.authorizationBaseUrl) {
      throw new Error(`OAuth2 provider '${providerId}' is missing authorizationBaseUrl (discovery may have failed).`);
    }
    const authUrl = `${config.authorizationBaseUrl}?${params.toString()}`;

    if (config.logsEnabled) {
      console.log(`[OAuth2:${providerId}] Opening authorization URL:`, authUrl);
    }

    if (options.flow === 'redirect') {
      // Trigger a full-page redirect. The promise will not resolve because the page navigates away.
      window.location.assign(authUrl);
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      return new Promise(() => {}) as any;
    }

    // Open popup window
    const width = 500;
    const height = 650;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    const popup = window.open(
      authUrl,
      'OAuth2Login',
      `width=${width},height=${height},left=${left},top=${top},popup=1`,
    );

    return new Promise((resolve, reject) => {
      if (!popup) {
        reject(new Error('Unable to open login window. Please allow popups.'));
        return;
      }

      // Use BroadcastChannel for cross-origin communication (works when postMessage doesn't)
      const channelName = `oauth2_${state}`;
      let broadcastChannel: BroadcastChannel | null = null;

      try {
        broadcastChannel = new BroadcastChannel(channelName);
      } catch {
        // BroadcastChannel not supported, fall back to postMessage only
        if (config.logsEnabled) {
          console.log(`[OAuth2:${providerId}] BroadcastChannel not supported, using postMessage only`);
        }
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
          if (data?.provider && data.provider !== 'oauth2') {
            return false;
          }
          // Check providerId matches if present
          if (data?.providerId && data.providerId !== providerId) {
            return false;
          }
          cleanup(messageHandler, timeoutHandle, popupClosedInterval);
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const {
            provider: _ignoredProvider,
            type: _ignoredType,
            ...payload
          } = data as unknown as OAuth2LoginResponse & {
            provider?: string;
            type?: string;
          };
          resolve({
            provider: 'oauth2' as T,
            result: payload as ProviderResponseMap[T],
          } as { provider: T; result: ProviderResponseMap[T] });
          return true;
        } else if (data?.type === 'oauth-error') {
          if (data?.provider && data.provider !== 'oauth2') {
            return false;
          }
          cleanup(messageHandler, timeoutHandle, popupClosedInterval);
          reject(new Error((data.error as string) || 'OAuth2 login was cancelled.'));
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
        reject(new Error('OAuth2 login timed out.'));
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
            reject(new Error('OAuth2 login window was closed.'));
          }
        } catch {
          // Cross-origin error when checking popup.closed - this happens when the popup
          // navigates to a third-party OAuth provider with strict security settings (COOP).
          // We can't detect if the window was closed, so we just rely on the timeout
          // and message handlers. The popup will close itself after authentication completes.
          coopErrorDetected = true;
          if (config.logsEnabled) {
            console.log(
              `[OAuth2:${providerId}] Cannot check popup.closed due to Cross-Origin-Opener-Policy restrictions. ` +
                'The popup will close automatically after login completes. Relying on BroadcastChannel and timeout.',
            );
          }
        }
      }, 1000);
    });
  }

  async logout(providerId: string): Promise<void> {
    await this.ensureDiscovered(providerId);
    const config = this.providers.get(providerId);
    const stored = this.getStoredTokens(providerId);
    localStorage.removeItem(this.getTokensKey(providerId));

    // If logout URL is configured, build an end-session URL (OIDC) when possible.
    if (config?.logoutUrl) {
      try {
        const url = new URL(config.logoutUrl);
        if (stored?.idToken) {
          url.searchParams.set('id_token_hint', stored.idToken);
        }
        const postLogout = config.postLogoutRedirectUrl;
        if (postLogout) {
          url.searchParams.set('post_logout_redirect_uri', postLogout);
        }
        if (config.additionalLogoutParameters) {
          for (const [k, v] of Object.entries(config.additionalLogoutParameters)) {
            url.searchParams.set(k, v);
          }
        }
        window.open(url.toString(), '_blank');
      } catch {
        window.open(config.logoutUrl, '_blank');
      }
    }
  }

  async isLoggedIn(providerId: string): Promise<{ isLoggedIn: boolean }> {
    const tokens = this.getStoredTokens(providerId);
    if (!tokens) {
      return { isLoggedIn: false };
    }
    const isValid = tokens.expiresAt > Date.now();
    if (!isValid) {
      localStorage.removeItem(this.getTokensKey(providerId));
    }
    return { isLoggedIn: isValid };
  }

  async getAuthorizationCode(providerId: string): Promise<AuthorizationCode> {
    const tokens = this.getStoredTokens(providerId);
    if (!tokens) {
      throw new Error(`OAuth2 access token is not available for provider '${providerId}'.`);
    }
    return {
      accessToken: tokens.accessToken,
      jwt: tokens.idToken,
    };
  }

  async refresh(providerId: string): Promise<void> {
    await this.refreshToken(providerId);
  }

  async refreshToken(
    providerId: string,
    refreshToken?: string,
    additionalParameters?: Record<string, string>,
  ): Promise<OAuth2LoginResponse> {
    await this.ensureDiscovered(providerId);
    const config = this.getProvider(providerId);

    const stored = this.getStoredTokens(providerId);
    const effectiveRefreshToken = refreshToken ?? stored?.refreshToken;
    if (!effectiveRefreshToken) {
      throw new Error(
        `No OAuth2 refresh token is available for provider '${providerId}'. Include offline_access scope to receive one.`,
      );
    }
    if (!config.accessTokenEndpoint) {
      throw new Error(`No accessTokenEndpoint configured for provider '${providerId}'.`);
    }

    const tokenResponse = await this.refreshWithRefreshToken(providerId, effectiveRefreshToken, additionalParameters);

    const expiresAt = tokenResponse.expires_in ? Date.now() + tokenResponse.expires_in * 1000 : Date.now() + 3600000;
    const scopeArray = tokenResponse.scope?.split(' ').filter(Boolean) ?? stored?.scope ?? [];

    // Fetch resource data if configured
    let resourceData: Record<string, unknown> | null = null;
    if (config.resourceUrl) {
      resourceData = await this.fetchResource(providerId, tokenResponse.access_token);
    }

    const nextRefreshToken = tokenResponse.refresh_token ?? effectiveRefreshToken;
    this.persistTokens(providerId, {
      accessToken: tokenResponse.access_token,
      refreshToken: nextRefreshToken,
      idToken: tokenResponse.id_token,
      expiresAt,
      scope: scopeArray,
      tokenType: tokenResponse.token_type,
    });

    return {
      providerId,
      accessToken: {
        token: tokenResponse.access_token,
        tokenType: tokenResponse.token_type,
        expires: new Date(expiresAt).toISOString(),
        refreshToken: nextRefreshToken,
      },
      idToken: tokenResponse.id_token ?? null,
      refreshToken: nextRefreshToken ?? null,
      resourceData,
      scope: scopeArray,
      tokenType: tokenResponse.token_type,
      expiresIn: tokenResponse.expires_in ?? null,
    };
  }

  async handleOAuthRedirect(url: URL, expectedState?: string): Promise<LoginResult | { error: string } | null> {
    // Check both query params and hash fragment
    const params = new URLSearchParams(url.search);
    const hashParams = new URLSearchParams(url.hash.slice(1));

    // Merge params, hash takes priority (for implicit flow)
    hashParams.forEach((value, key) => {
      params.set(key, value);
    });

    const stateFromUrl = expectedState ?? params.get('state');
    if (!stateFromUrl) {
      return null;
    }

    const pending = this.consumePendingLogin(stateFromUrl);
    if (!pending) {
      localStorage.removeItem(BaseSocialLogin.OAUTH_STATE_KEY);
      return { error: 'OAuth2 login session expired or state mismatch.' };
    }

    const { providerId } = pending;
    await this.ensureDiscovered(providerId);
    const config = this.providers.get(providerId);
    if (!config) {
      localStorage.removeItem(BaseSocialLogin.OAUTH_STATE_KEY);
      return { error: `OAuth2 provider '${providerId}' configuration not found.` };
    }

    const error = params.get('error');
    if (error) {
      localStorage.removeItem(BaseSocialLogin.OAUTH_STATE_KEY);
      return { error: params.get('error_description') || error };
    }

    try {
      let tokenResponse: OAuth2TokenResponse;

      // Check response type
      if (params.has('code')) {
        // Authorization code flow
        const code = params.get('code');
        if (!code) {
          localStorage.removeItem(BaseSocialLogin.OAUTH_STATE_KEY);
          return { error: 'OAuth2 authorization code missing from redirect.' };
        }
        tokenResponse = await this.exchangeAuthorizationCode(providerId, code, pending);
      } else if (params.has('access_token')) {
        // Implicit flow
        tokenResponse = {
          access_token: params.get('access_token')!,
          token_type: params.get('token_type') || 'bearer',
          expires_in: params.has('expires_in') ? parseInt(params.get('expires_in')!, 10) : undefined,
          scope: params.get('scope') || undefined,
          id_token: params.get('id_token') || undefined,
        };
      } else {
        localStorage.removeItem(BaseSocialLogin.OAUTH_STATE_KEY);
        return { error: 'No authorization code or access token in redirect.' };
      }

      const expiresAt = tokenResponse.expires_in ? Date.now() + tokenResponse.expires_in * 1000 : Date.now() + 3600000;
      const scopeArray = tokenResponse.scope?.split(' ').filter(Boolean) ?? [];

      // Fetch resource data if configured
      let resourceData: Record<string, unknown> | null = null;
      if (config.resourceUrl) {
        resourceData = await this.fetchResource(providerId, tokenResponse.access_token);
      }

      this.persistTokens(providerId, {
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token,
        idToken: tokenResponse.id_token,
        expiresAt,
        scope: scopeArray,
        tokenType: tokenResponse.token_type,
      });

      return {
        provider: 'oauth2',
        result: {
          providerId,
          accessToken: {
            token: tokenResponse.access_token,
            tokenType: tokenResponse.token_type,
            expires: new Date(expiresAt).toISOString(),
            refreshToken: tokenResponse.refresh_token,
          },
          idToken: tokenResponse.id_token ?? null,
          refreshToken: tokenResponse.refresh_token ?? null,
          resourceData,
          scope: scopeArray,
          tokenType: tokenResponse.token_type,
          expiresIn: tokenResponse.expires_in ?? null,
        },
      };
    } catch (err) {
      if (err instanceof Error) {
        return { error: err.message };
      }
      return { error: 'OAuth2 login failed unexpectedly.' };
    } finally {
      localStorage.removeItem(BaseSocialLogin.OAUTH_STATE_KEY);
    }
  }

  private async exchangeAuthorizationCode(
    providerId: string,
    code: string,
    pending: OAuth2PendingLogin,
  ): Promise<OAuth2TokenResponse> {
    const config = this.getProvider(providerId);
    if (!config.accessTokenEndpoint) {
      throw new Error(`No accessTokenEndpoint configured for provider '${providerId}'.`);
    }

    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: config.appId,
      code,
      redirect_uri: pending.redirectUri,
    });

    if (config.pkceEnabled) {
      params.set('code_verifier', pending.codeVerifier);
    }

    if (config.additionalTokenParameters) {
      for (const [k, v] of Object.entries(config.additionalTokenParameters)) {
        params.set(k, v);
      }
    }

    if (config.logsEnabled) {
      console.log(`[OAuth2:${providerId}] Exchanging code at:`, config.accessTokenEndpoint);
    }

    const response = await fetch(config.accessTokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`OAuth2 token exchange failed (${response.status}): ${text}`);
    }

    return (await response.json()) as OAuth2TokenResponse;
  }

  private async refreshWithRefreshToken(
    providerId: string,
    refreshToken: string,
    additionalParameters?: Record<string, string>,
  ): Promise<OAuth2TokenResponse> {
    const config = this.getProvider(providerId);
    if (!config.accessTokenEndpoint) {
      throw new Error(`No accessTokenEndpoint configured for provider '${providerId}'.`);
    }

    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: config.appId,
    });

    if (config.additionalTokenParameters) {
      for (const [k, v] of Object.entries(config.additionalTokenParameters)) {
        params.set(k, v);
      }
    }
    if (additionalParameters) {
      for (const [k, v] of Object.entries(additionalParameters)) {
        params.set(k, v);
      }
    }

    const response = await fetch(config.accessTokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`OAuth2 refresh failed (${response.status}): ${text}`);
    }

    return (await response.json()) as OAuth2TokenResponse;
  }

  private async fetchResource(providerId: string, accessToken: string): Promise<Record<string, unknown>> {
    const config = this.getProvider(providerId);
    if (!config.resourceUrl) {
      throw new Error(`No resourceUrl configured for provider '${providerId}'.`);
    }

    const headers: Record<string, string> = {
      Authorization: `Bearer ${accessToken}`,
    };

    if (config.additionalResourceHeaders) {
      Object.assign(headers, config.additionalResourceHeaders);
    }

    const response = await fetch(config.resourceUrl, {
      headers,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Unable to fetch OAuth2 resource (${response.status}): ${text}`);
    }

    return (await response.json()) as Record<string, unknown>;
  }

  private persistTokens(providerId: string, tokens: OAuth2StoredTokens): void {
    localStorage.setItem(this.getTokensKey(providerId), JSON.stringify(tokens));
  }

  private getStoredTokens(providerId: string): OAuth2StoredTokens | null {
    const raw = localStorage.getItem(this.getTokensKey(providerId));
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw) as OAuth2StoredTokens;
    } catch (err) {
      console.warn(`Failed to parse stored OAuth2 tokens for provider '${providerId}'`, err);
      return null;
    }
  }

  private persistPendingLogin(state: string, payload: OAuth2PendingLogin): void {
    localStorage.setItem(`${this.STATE_PREFIX}${state}`, JSON.stringify(payload));
  }

  private consumePendingLogin(state: string): OAuth2PendingLogin | null {
    const key = `${this.STATE_PREFIX}${state}`;
    const raw = localStorage.getItem(key);
    localStorage.removeItem(key);
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw) as OAuth2PendingLogin;
    } catch (err) {
      console.warn('Failed to parse pending OAuth2 login payload', err);
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

  decodeIdToken(idToken: string): Record<string, any> {
    const parts = idToken.split('.');
    if (parts.length < 2) {
      throw new Error('Invalid JWT: missing parts');
    }
    const payload = parts[1];
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
    const json = atob(padded);
    return JSON.parse(json) as Record<string, any>;
  }

  getAccessTokenExpirationDate(providerId: string): { expirationDate: string | null } {
    const tokens = this.getStoredTokens(providerId);
    if (!tokens?.expiresAt) return { expirationDate: null };
    return { expirationDate: new Date(tokens.expiresAt).toISOString() };
  }

  isAccessTokenAvailable(providerId: string): { isAvailable: boolean } {
    const tokens = this.getStoredTokens(providerId);
    return { isAvailable: !!tokens?.accessToken };
  }

  isAccessTokenExpired(providerId: string): { isExpired: boolean } {
    const tokens = this.getStoredTokens(providerId);
    if (!tokens?.expiresAt) return { isExpired: true };
    return { isExpired: tokens.expiresAt <= Date.now() };
  }

  isRefreshTokenAvailable(providerId: string): { isAvailable: boolean } {
    const tokens = this.getStoredTokens(providerId);
    return { isAvailable: !!tokens?.refreshToken };
  }
}
