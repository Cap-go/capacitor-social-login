import { WebPlugin } from '@capacitor/core';

import { AppleSocialLogin } from './apple-provider';
import type {
  SocialLoginPlugin,
  InitializeOptions,
  LoginOptions,
  AuthorizationCode,
  AuthorizationCodeOptions,
  isLoggedInOptions,
  ProviderResponseMap,
  FacebookLoginOptions,
  ProviderSpecificCall,
  ProviderSpecificCallOptionsMap,
  ProviderSpecificCallResponseMap,
  LoginResult,
  OAuth2LoginOptions,
  OAuth2LoginResponse,
  OpenSecureWindowOptions,
  OpenSecureWindowResponse,
  FacebookGetProfileOptions,
  TelegramLoginOptions,
} from './definitions';
import { inferUserCancelledError } from './errors';
import { FacebookSocialLogin } from './facebook-provider';
import { GoogleSocialLogin } from './google-provider';
import {
  clearOAuthPopupMarker,
  deliverOAuthResult,
  OAUTH_STATE_KEY,
  shouldAutoFinishOAuthRedirect,
  type OAuthBridgeMessage,
} from './oauth-popup-bridge';
import { OAuth2SocialLogin } from './oauth2-provider';
import { TelegramSocialLogin } from './telegram-provider';
import { TwitterSocialLogin } from './twitter-provider';

export class SocialLoginWeb extends WebPlugin implements SocialLoginPlugin {
  private static readonly OAUTH_STATE_KEY = OAUTH_STATE_KEY;

  private googleProvider: GoogleSocialLogin;
  private appleProvider: AppleSocialLogin;
  private facebookProvider: FacebookSocialLogin;
  private twitterProvider: TwitterSocialLogin;
  private telegramProvider: TelegramSocialLogin;
  private oauth2Provider: OAuth2SocialLogin;

  constructor() {
    super();

    this.googleProvider = new GoogleSocialLogin();
    this.appleProvider = new AppleSocialLogin();
    this.facebookProvider = new FacebookSocialLogin();
    this.twitterProvider = new TwitterSocialLogin();
    this.telegramProvider = new TelegramSocialLogin();
    this.oauth2Provider = new OAuth2SocialLogin();

    // Auto-finish OAuth redirects only when running inside a popup window.
    // For redirect-based flows (full page navigation), the app should call `handleRedirectCallback()` explicitly.
    // Note: oauth-popup-redirect.ts also handles this eagerly on package import for COOP-safe popup completion.
    if (shouldAutoFinishOAuthRedirect()) {
      this.finishOAuthRedirectInPopup().catch((error) => {
        console.error('Failed to finish OAuth redirect', error);
        try {
          window.close();
        } catch {
          // ignore
        }
      });
    }
  }

  private async parseRedirectResult(): Promise<{
    provider: string | null;
    state?: string;
    nonce?: string;
    result: LoginResult | { error: string } | null;
  }> {
    const url = new URL(window.location.href);
    const stateRaw = localStorage.getItem(SocialLoginWeb.OAUTH_STATE_KEY);
    let provider: string | null = null;
    let state: string | undefined;
    let nonce: string | undefined;

    if (stateRaw) {
      try {
        const parsed = JSON.parse(stateRaw);
        provider = parsed.provider ?? null;
        state = parsed.state;
        nonce = parsed.nonce;
      } catch {
        provider = stateRaw === 'true' ? 'google' : null;
      }
    }

    let result: LoginResult | { error: string } | null = null;

    switch (provider) {
      case 'twitter':
        result = await this.twitterProvider.handleOAuthRedirect(url, state);
        break;
      case 'telegram':
        result = await this.telegramProvider.handleOAuthRedirect(url, state);
        break;
      case 'oauth2':
        result = await this.oauth2Provider.handleOAuthRedirect(url, state);
        break;
      case 'google':
      default:
        result = this.googleProvider.handleOAuthRedirect(url);
        break;
    }

    return { provider, state, nonce, result };
  }

  private async finishOAuthRedirectInPopup(): Promise<void> {
    const parsed = await this.parseRedirectResult();
    const nonceOrState = parsed.nonce ?? parsed.state;
    let message: OAuthBridgeMessage;

    if (!parsed.result) {
      message = {
        type: 'oauth-error',
        provider: parsed.provider,
        error: 'OAuth redirect did not contain expected parameters.',
      };
    } else if ('error' in parsed.result) {
      const resolvedProvider = parsed.provider ?? null;
      const error = inferUserCancelledError(parsed.result.error);
      message = {
        type: 'oauth-error',
        provider: resolvedProvider,
        error: error.message,
        ...(error.code ? { code: error.code } : null),
      };
    } else {
      message = {
        type: 'oauth-response',
        provider: parsed.result.provider,
        ...parsed.result.result,
      };
    }

    deliverOAuthResult(parsed.provider ?? 'google', nonceOrState, message);
    clearOAuthPopupMarker();

    try {
      window.close();
    } catch {
      // Popup may not be allowed to close itself in some contexts
    }
  }

  async initialize(options: InitializeOptions): Promise<void> {
    const initPromises: Promise<void>[] = [];

    if (options.google?.webClientId) {
      initPromises.push(
        this.googleProvider.initialize(
          options.google.webClientId,
          options.google.mode,
          options.google.hostedDomain,
          options.google.redirectUrl,
        ),
      );
    }

    if (options.apple?.clientId) {
      initPromises.push(
        this.appleProvider.initialize(
          options.apple.clientId,
          options.apple.redirectUrl,
          options.apple.useProperTokenExchange,
        ),
      );
    }

    if (options.facebook?.appId) {
      initPromises.push(this.facebookProvider.initialize(options.facebook.appId, options.facebook.locale));
    }

    if (options.twitter?.clientId) {
      initPromises.push(
        this.twitterProvider.initialize(
          options.twitter.clientId,
          options.twitter.redirectUrl,
          options.twitter.defaultScopes,
          options.twitter.forceLogin,
          options.twitter.audience,
        ),
      );
    }

    if (options.telegram?.botId) {
      this.telegramProvider.initialize(
        options.telegram.botId,
        options.telegram.requestAccess,
        options.telegram.redirectUrl,
        options.telegram.origin,
        options.telegram.languageCode,
      );
    }

    if (options.oauth2 && Object.keys(options.oauth2).length > 0) {
      initPromises.push(this.oauth2Provider.initializeProviders(options.oauth2));
    }

    await Promise.all(initPromises);
  }

  async login<T extends LoginOptions['provider']>(
    options: Extract<LoginOptions, { provider: T }>,
  ): Promise<{ provider: T; result: ProviderResponseMap[T] }> {
    switch (options.provider) {
      case 'google':
        return this.googleProvider.login(options.options as any) as Promise<{
          provider: T;
          result: ProviderResponseMap[T];
        }>;
      case 'apple':
        return this.appleProvider.login(options.options as any) as Promise<{
          provider: T;
          result: ProviderResponseMap[T];
        }>;
      case 'facebook':
        return this.facebookProvider.login(options.options as FacebookLoginOptions) as Promise<{
          provider: T;
          result: ProviderResponseMap[T];
        }>;
      case 'twitter':
        return this.twitterProvider.login(options.options as any) as Promise<{
          provider: T;
          result: ProviderResponseMap[T];
        }>;
      case 'telegram':
        return this.telegramProvider.login(options.options as TelegramLoginOptions) as Promise<{
          provider: T;
          result: ProviderResponseMap[T];
        }>;
      case 'oauth2':
        return this.oauth2Provider.login(options.options as OAuth2LoginOptions) as Promise<{
          provider: T;
          result: ProviderResponseMap[T];
        }>;
      default:
        throw new Error(`Login for ${options.provider} is not implemented on web`);
    }
  }

  async logout(options: {
    provider: 'apple' | 'google' | 'facebook' | 'twitter' | 'telegram' | 'oauth2';
    providerId?: string;
  }): Promise<void> {
    switch (options.provider) {
      case 'google':
        return this.googleProvider.logout();
      case 'apple':
        return this.appleProvider.logout();
      case 'facebook':
        return this.facebookProvider.logout();
      case 'twitter':
        return this.twitterProvider.logout();
      case 'telegram':
        return this.telegramProvider.logout();
      case 'oauth2':
        if (!options.providerId) {
          throw new Error('providerId is required for oauth2 logout');
        }
        return this.oauth2Provider.logout(options.providerId);
      default:
        throw new Error(`Logout for ${options.provider} is not implemented`);
    }
  }

  async isLoggedIn(options: isLoggedInOptions): Promise<{ isLoggedIn: boolean }> {
    switch (options.provider) {
      case 'google':
        return this.googleProvider.isLoggedIn();
      case 'apple':
        return this.appleProvider.isLoggedIn();
      case 'facebook':
        return this.facebookProvider.isLoggedIn();
      case 'twitter':
        return this.twitterProvider.isLoggedIn();
      case 'telegram':
        return this.telegramProvider.isLoggedIn();
      case 'oauth2':
        if (!options.providerId) {
          throw new Error('providerId is required for oauth2 isLoggedIn');
        }
        return this.oauth2Provider.isLoggedIn(options.providerId);
      default:
        throw new Error(`isLoggedIn for ${options.provider} is not implemented`);
    }
  }

  async getAuthorizationCode(options: AuthorizationCodeOptions): Promise<AuthorizationCode> {
    switch (options.provider) {
      case 'google':
        return this.googleProvider.getAuthorizationCode();
      case 'apple':
        return this.appleProvider.getAuthorizationCode();
      case 'facebook':
        return this.facebookProvider.getAuthorizationCode();
      case 'twitter':
        return this.twitterProvider.getAuthorizationCode();
      case 'oauth2':
        if (!options.providerId) {
          throw new Error('providerId is required for oauth2 getAuthorizationCode');
        }
        return this.oauth2Provider.getAuthorizationCode(options.providerId);
      default:
        throw new Error(`getAuthorizationCode for ${options.provider} is not implemented`);
    }
  }

  async refresh(options: LoginOptions): Promise<void> {
    switch (options.provider) {
      case 'google':
        return this.googleProvider.refresh();
      case 'apple':
        return this.appleProvider.refresh();
      case 'facebook':
        return this.facebookProvider.refresh(options.options as FacebookLoginOptions);
      case 'twitter':
        return this.twitterProvider.refresh();
      case 'telegram':
        return this.telegramProvider.refresh();
      case 'oauth2': {
        const oauth2Options = options.options as OAuth2LoginOptions;
        if (!oauth2Options?.providerId) {
          throw new Error('providerId is required for oauth2 refresh');
        }
        return this.oauth2Provider.refresh(oauth2Options.providerId);
      }
      default:
        throw new Error(`Refresh for ${(options as any).provider} is not implemented`);
    }
  }

  async providerSpecificCall<T extends ProviderSpecificCall>(options: {
    call: T;
    options: ProviderSpecificCallOptionsMap[T];
  }): Promise<ProviderSpecificCallResponseMap[T]> {
    switch (options.call) {
      case 'facebook#getProfile': {
        const fields = (options.options as FacebookGetProfileOptions | undefined)?.fields;
        return this.facebookProvider.getProfile(fields) as Promise<ProviderSpecificCallResponseMap[T]>;
      }
      case 'facebook#requestTracking':
        return this.facebookProvider.requestTracking() as Promise<ProviderSpecificCallResponseMap[T]>;
      case 'google#createRestoreCredential':
      case 'google#getRestoreCredential':
      case 'google#clearRestoreCredential':
        throw new Error(`${options.call} is only available on Android`);
      default:
        throw new Error(`Provider specific call for ${options.call} is not implemented`);
    }
  }

  async refreshToken(options: {
    provider: 'oauth2';
    providerId: string;
    refreshToken?: string;
    additionalParameters?: Record<string, string>;
  }): Promise<OAuth2LoginResponse> {
    if (options.provider !== 'oauth2') {
      throw new Error('refreshToken is only implemented for oauth2 on web');
    }
    return this.oauth2Provider.refreshToken(options.providerId, options.refreshToken, options.additionalParameters);
  }

  async handleRedirectCallback(): Promise<LoginResult | null> {
    const parsed = await this.parseRedirectResult();
    const result = parsed.result;
    if (!result) return null;
    if ('error' in result) {
      throw inferUserCancelledError(result.error);
    }
    return result;
  }

  async decodeIdToken(options: { idToken?: string; token?: string }): Promise<{ claims: Record<string, any> }> {
    const token = options?.idToken ?? options?.token;
    if (!token) {
      throw new Error('idToken (or token) is required');
    }
    const claims = this.oauth2Provider.decodeIdToken(token);
    return { claims };
  }

  async getAccessTokenExpirationDate(options: { accessTokenExpirationDate: number }): Promise<{ date: string }> {
    if (typeof options?.accessTokenExpirationDate !== 'number') {
      throw new Error('accessTokenExpirationDate is required');
    }
    return { date: new Date(options.accessTokenExpirationDate).toISOString() };
  }

  async isAccessTokenAvailable(options: { accessToken: string | null }): Promise<{ isAvailable: boolean }> {
    const token = options?.accessToken ?? null;
    return { isAvailable: typeof token === 'string' && token.length > 0 };
  }

  async isAccessTokenExpired(options: { accessTokenExpirationDate: number }): Promise<{ isExpired: boolean }> {
    if (typeof options?.accessTokenExpirationDate !== 'number') {
      throw new Error('accessTokenExpirationDate is required');
    }
    return { isExpired: options.accessTokenExpirationDate <= Date.now() };
  }

  async isRefreshTokenAvailable(options: { refreshToken: string | null }): Promise<{ isAvailable: boolean }> {
    const token = options?.refreshToken ?? null;
    return { isAvailable: typeof token === 'string' && token.length > 0 };
  }

  async getPluginVersion(): Promise<{ version: string }> {
    return { version: 'web' };
  }

  async openSecureWindow(options: OpenSecureWindowOptions): Promise<OpenSecureWindowResponse> {
    const w = 600;
    const h = 550;
    const settings = [
      ['width', w],
      ['height', h],
      ['left', screen.width / 2 - w / 2],
      ['top', screen.height / 2 - h / 2],
    ]
      .map((x) => x.join('='))
      .join(',');

    const popup = window.open(options.authEndpoint, 'Authorization', settings)!;
    if (typeof popup.focus === 'function') {
      popup.focus();
    }
    return new Promise((resolve, reject) => {
      const bc = new BroadcastChannel(options.broadcastChannelName || 'oauth-channel');
      bc.addEventListener('message', (event) => {
        if (event.data.startsWith(options.redirectUri)) {
          bc.close();
          resolve({ redirectedUri: event.data });
        } else {
          bc.close();
          reject(new Error('Redirect URI does not match, expected ' + options.redirectUri + ' but got ' + event.data));
        }
      });
      setTimeout(() => {
        bc.close();
        reject(new Error('The sign-in flow timed out'));
      }, 5 * 60000);
    });
  }
}
