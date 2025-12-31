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
} from './definitions';
import { FacebookSocialLogin } from './facebook-provider';
import { GoogleSocialLogin } from './google-provider';
import { OAuth2SocialLogin } from './oauth2-provider';
import { TwitterSocialLogin } from './twitter-provider';

export class SocialLoginWeb extends WebPlugin implements SocialLoginPlugin {
  private static readonly OAUTH_STATE_KEY = 'social_login_oauth_pending';

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

    // Set up listener for OAuth redirects if we have a pending OAuth flow
    if (localStorage.getItem(SocialLoginWeb.OAUTH_STATE_KEY)) {
      console.log('OAUTH_STATE_KEY found');
      this.handleOAuthRedirect().catch((error) => {
        console.error('Failed to finish OAuth redirect', error);
        window.close();
      });
    }
  }

  private async handleOAuthRedirect(): Promise<void> {
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

    if (!result) {
      return;
    }

    // Build the message to send
    let message: Record<string, unknown>;
    if ('error' in result) {
      const resolvedProvider = provider ?? null;
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
      if (provider === 'oauth2' && state) {
        channelName = `oauth2_${state}`;
      } else if (provider === 'twitter' && state) {
        channelName = `twitter_oauth_${state}`;
      } else if (provider === 'google' && nonce) {
        channelName = `google_oauth_${nonce}`;
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

  async getPluginVersion(): Promise<{ version: string }> {
    return { version: 'web' };
  }
}
