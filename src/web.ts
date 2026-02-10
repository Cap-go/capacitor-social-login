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
} from './definitions';
import { FacebookSocialLogin } from './facebook-provider';
import { GoogleSocialLogin } from './google-provider';
import { OAuth2SocialLogin } from './oauth2-provider';
import { TwitterSocialLogin } from './twitter-provider';

export class SocialLoginWeb extends WebPlugin implements SocialLoginPlugin {
  private static readonly OAUTH_STATE_KEY = 'social_login_oauth_pending';
  private static readonly POPUP_WINDOW_NAMES = new Set(['OAuth2Login', 'XLogin', 'Google Sign In', 'Authorization']);

  private googleProvider: GoogleSocialLogin;
  private appleProvider: AppleSocialLogin;
  private facebookProvider: FacebookSocialLogin;
  private twitterProvider: TwitterSocialLogin;
  private oauth2Provider: OAuth2SocialLogin;

  constructor() {
    super();

    this.googleProvider = new GoogleSocialLogin();
    this.appleProvider = new AppleSocialLogin();
    this.facebookProvider = new FacebookSocialLogin();
    this.twitterProvider = new TwitterSocialLogin();
    this.oauth2Provider = new OAuth2SocialLogin();

    // Auto-finish OAuth redirects only when running inside a popup window.
    // For redirect-based flows (full page navigation), the app should call `handleRedirectCallback()` explicitly.
    const hasPending = !!localStorage.getItem(SocialLoginWeb.OAUTH_STATE_KEY);
    const isPopup = !!window.opener || SocialLoginWeb.POPUP_WINDOW_NAMES.has(window.name);
    if (hasPending && isPopup) {
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
    const result = parsed.result;
    if (!result) return;

    // Build the message to send
    let message: Record<string, unknown>;
    if ('error' in result) {
      const resolvedProvider = parsed.provider ?? null;
      message = {
        type: 'oauth-error',
        provider: resolvedProvider,
        error: result.error,
      };
    } else {
      message = {
        type: 'oauth-response',
        provider: result.provider,
        ...result.result,
      };
    }

    // Try postMessage first (works when window.opener is accessible)
    try {
      if (window.opener) {
        window.opener.postMessage(message, window.location.origin);
      }
    } catch {
      // Cross-origin error - window.opener may not be accessible
      console.log('postMessage to opener failed, using BroadcastChannel');
    }

    // Also use BroadcastChannel as a fallback (works across same-origin windows
    // even when window.opener is not accessible due to cross-origin navigation)
    try {
      // Determine the channel name based on provider and state/nonce
      let channelName: string | null = null;
      if (parsed.provider === 'oauth2' && parsed.state) {
        channelName = `oauth2_${parsed.state}`;
      } else if (parsed.provider === 'twitter' && parsed.state) {
        channelName = `twitter_oauth_${parsed.state}`;
      } else if (parsed.provider === 'google' && parsed.nonce) {
        channelName = `google_oauth_${parsed.nonce}`;
      }

      if (channelName) {
        const channel = new BroadcastChannel(channelName);
        channel.postMessage(message);
        channel.close();
      }
    } catch {
      // BroadcastChannel not supported or other error
      console.log('BroadcastChannel not available');
    }

    window.close();
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
    provider: 'apple' | 'google' | 'facebook' | 'twitter' | 'oauth2';
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
    throw new Error(`Provider specific call for ${options.call} is not implemented`);
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
      throw new Error(result.error);
    }
    return result;
  }

  async decodeIdToken(options: { idToken: string }): Promise<{ claims: Record<string, any> }> {
    const claims = this.oauth2Provider.decodeIdToken(options.idToken);
    return { claims };
  }

  async getAccessTokenExpirationDate(options: {
    provider: 'oauth2';
    providerId: string;
  }): Promise<{ expirationDate: string | null }> {
    if (options.provider !== 'oauth2') {
      throw new Error('getAccessTokenExpirationDate is only implemented for oauth2 on web');
    }
    return this.oauth2Provider.getAccessTokenExpirationDate(options.providerId);
  }

  async isAccessTokenAvailable(options: { provider: 'oauth2'; providerId: string }): Promise<{ isAvailable: boolean }> {
    if (options.provider !== 'oauth2') {
      throw new Error('isAccessTokenAvailable is only implemented for oauth2 on web');
    }
    return this.oauth2Provider.isAccessTokenAvailable(options.providerId);
  }

  async isAccessTokenExpired(options: { provider: 'oauth2'; providerId: string }): Promise<{ isExpired: boolean }> {
    if (options.provider !== 'oauth2') {
      throw new Error('isAccessTokenExpired is only implemented for oauth2 on web');
    }
    return this.oauth2Provider.isAccessTokenExpired(options.providerId);
  }

  async isRefreshTokenAvailable(options: {
    provider: 'oauth2';
    providerId: string;
  }): Promise<{ isAvailable: boolean }> {
    if (options.provider !== 'oauth2') {
      throw new Error('isRefreshTokenAvailable is only implemented for oauth2 on web');
    }
    return this.oauth2Provider.isRefreshTokenAvailable(options.providerId);
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
