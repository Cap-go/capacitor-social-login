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
} from './definitions';
import { FacebookSocialLogin } from './facebook-provider';
import { GoogleSocialLogin } from './google-provider';

export class SocialLoginWeb extends WebPlugin implements SocialLoginPlugin {
  private static readonly OAUTH_STATE_KEY = 'social_login_oauth_pending';

  private googleProvider: GoogleSocialLogin;
  private appleProvider: AppleSocialLogin;
  private facebookProvider: FacebookSocialLogin;

  constructor() {
    super();

    this.googleProvider = new GoogleSocialLogin();
    this.appleProvider = new AppleSocialLogin();
    this.facebookProvider = new FacebookSocialLogin();

    // Set up listener for OAuth redirects if we have a pending OAuth flow
    if (localStorage.getItem(SocialLoginWeb.OAUTH_STATE_KEY)) {
      console.log('OAUTH_STATE_KEY found');
      const result = this.handleOAuthRedirect();
      if (result) {
        window.opener?.postMessage(
          {
            type: 'oauth-response',
            ...result.result,
          },
          window.location.origin,
        );
        window.close();
      }
    }
  }

  private handleOAuthRedirect() {
    const url = new URL(window.location.href);
    return this.googleProvider.handleOAuthRedirect(url);
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

    await Promise.all(initPromises);
  }

  async login<T extends LoginOptions['provider']>(
    options: Extract<LoginOptions, { provider: T }>,
  ): Promise<{ provider: T; result: ProviderResponseMap[T] }> {
    switch (options.provider) {
      case 'google':
        return this.googleProvider.login(options.options) as Promise<{ provider: T; result: ProviderResponseMap[T] }>;
      case 'apple':
        return this.appleProvider.login(options.options) as Promise<{ provider: T; result: ProviderResponseMap[T] }>;
      case 'facebook':
        return this.facebookProvider.login(options.options as FacebookLoginOptions) as Promise<{
          provider: T;
          result: ProviderResponseMap[T];
        }>;
      default:
        throw new Error(`Login for ${options.provider} is not implemented on web`);
    }
  }

  async logout(options: { provider: 'apple' | 'google' | 'facebook' }): Promise<void> {
    switch (options.provider) {
      case 'google':
        return this.googleProvider.logout();
      case 'apple':
        return this.appleProvider.logout();
      case 'facebook':
        return this.facebookProvider.logout();
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
