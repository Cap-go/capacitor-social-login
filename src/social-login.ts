import { registerPlugin } from '@capacitor/core';

import type {
  AuthorizationCode,
  AuthorizationCodeOptions,
  InitializeOptions,
  LoginOptions,
  OpenSecureWindowOptions,
  OpenSecureWindowResponse,
  OAuth2LoginResponse,
  ProviderResponseMap,
  ProviderSpecificCall,
  ProviderSpecificCallOptionsMap,
  ProviderSpecificCallResponseMap,
  SocialLoginPlugin,
  isLoggedInOptions,
} from './definitions';

const GOOGLE_OFFLINE_REFRESH_MESSAGE =
  "Google refresh() is not available when using offline mode. Offline mode only returns serverAuthCode for backend token exchange. Send serverAuthCode to your backend and refresh tokens there, or switch google.mode to 'online' for client-side refresh.";

const rawSocialLogin = registerPlugin<SocialLoginPlugin>('SocialLogin', {
  web: () => import('./web').then((m) => new m.SocialLoginWeb()),
});

class SocialLoginClient implements SocialLoginPlugin {
  private initializeOptions?: InitializeOptions;

  constructor() {
    this.initialize = this.initialize.bind(this);
    this.refresh = this.refresh.bind(this);
  }

  async initialize(options: InitializeOptions): Promise<void> {
    await rawSocialLogin.initialize(options);
    this.initializeOptions = options;
  }

  async login<T extends LoginOptions['provider']>(
    options: Extract<LoginOptions, { provider: T }>,
  ): Promise<{ provider: T; result: ProviderResponseMap[T] }> {
    return rawSocialLogin.login(options);
  }

  async logout(options: {
    provider: 'apple' | 'google' | 'facebook' | 'twitter' | 'telegram' | 'oauth2';
    providerId?: string;
  }): Promise<void> {
    return rawSocialLogin.logout(options);
  }

  async isLoggedIn(options: isLoggedInOptions): Promise<{ isLoggedIn: boolean }> {
    return rawSocialLogin.isLoggedIn(options);
  }

  async getAuthorizationCode(options: AuthorizationCodeOptions): Promise<AuthorizationCode> {
    return rawSocialLogin.getAuthorizationCode(options);
  }

  async refresh(options: LoginOptions): Promise<void> {
    if (options.provider === 'google' && this.initializeOptions?.google?.mode === 'offline') {
      console.warn(`[SocialLogin] ${GOOGLE_OFFLINE_REFRESH_MESSAGE}`);
    }
    return rawSocialLogin.refresh(options);
  }

  async refreshToken(options: {
    provider: 'oauth2';
    providerId: string;
    refreshToken?: string;
    additionalParameters?: Record<string, string>;
  }): Promise<OAuth2LoginResponse> {
    return rawSocialLogin.refreshToken(options);
  }

  async handleRedirectCallback() {
    return rawSocialLogin.handleRedirectCallback();
  }

  async decodeIdToken(options: { idToken?: string; token?: string }): Promise<{ claims: Record<string, any> }> {
    return rawSocialLogin.decodeIdToken(options);
  }

  async getAccessTokenExpirationDate(options: { accessTokenExpirationDate: number }): Promise<{ date: string }> {
    return rawSocialLogin.getAccessTokenExpirationDate(options);
  }

  async isAccessTokenAvailable(options: { accessToken: string | null }): Promise<{ isAvailable: boolean }> {
    return rawSocialLogin.isAccessTokenAvailable(options);
  }

  async isAccessTokenExpired(options: { accessTokenExpirationDate: number }): Promise<{ isExpired: boolean }> {
    return rawSocialLogin.isAccessTokenExpired(options);
  }

  async isRefreshTokenAvailable(options: { refreshToken: string | null }): Promise<{ isAvailable: boolean }> {
    return rawSocialLogin.isRefreshTokenAvailable(options);
  }

  async providerSpecificCall<T extends ProviderSpecificCall>(options: {
    call: T;
    options: ProviderSpecificCallOptionsMap[T];
  }): Promise<ProviderSpecificCallResponseMap[T]> {
    return rawSocialLogin.providerSpecificCall(options);
  }

  async getPluginVersion(): Promise<{ version: string }> {
    return rawSocialLogin.getPluginVersion();
  }

  async openSecureWindow(options: OpenSecureWindowOptions): Promise<OpenSecureWindowResponse> {
    return rawSocialLogin.openSecureWindow(options);
  }
}

export const SocialLoginBase = rawSocialLogin;
export const SocialLogin = new SocialLoginClient();
