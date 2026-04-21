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
import { buildLinkedInLoginOptions, buildLinkedInOAuthConfig, LINKEDIN_PROVIDER_ID } from './linkedin-provider';

const GOOGLE_OFFLINE_REFRESH_MESSAGE =
  "Google refresh() is not available when using offline mode. Offline mode only returns serverAuthCode for backend token exchange. Send serverAuthCode to your backend and refresh tokens there, or switch google.mode to 'online' for client-side refresh.";

const rawSocialLogin = registerPlugin<SocialLoginPlugin>('SocialLogin', {
  web: () => import('./web').then((m) => new m.SocialLoginWeb()),
});

class SocialLoginClient implements SocialLoginPlugin {
  private initializeOptions?: InitializeOptions;

  private normalizeInitializeOptions(options: InitializeOptions): InitializeOptions {
    if (!options.linkedin) {
      return options;
    }

    const { linkedin, oauth2, ...rest } = options;
    const oauth2Configs = { ...(oauth2 ?? {}) };
    oauth2Configs[LINKEDIN_PROVIDER_ID] = buildLinkedInOAuthConfig(linkedin);

    return { ...rest, linkedin, oauth2: oauth2Configs };
  }

  constructor() {
    this.initialize = this.initialize.bind(this);
    this.refresh = this.refresh.bind(this);
  }

  async initialize(options: InitializeOptions): Promise<void> {
    const normalized = this.normalizeInitializeOptions(options);
    await rawSocialLogin.initialize(normalized);
    this.initializeOptions = normalized;
  }

  async login<T extends LoginOptions['provider']>(
    options: Extract<LoginOptions, { provider: T }>,
  ): Promise<{ provider: T; result: ProviderResponseMap[T] }> {
    if (options.provider === 'linkedin') {
      const oauth2Options = buildLinkedInLoginOptions(options.options as any);
      return rawSocialLogin.login({
        provider: 'oauth2',
        options: oauth2Options,
      }) as Promise<{ provider: T; result: ProviderResponseMap[T] }>;
    }
    return rawSocialLogin.login(options);
  }

  async logout(options: {
    provider: 'apple' | 'google' | 'facebook' | 'twitter' | 'oauth2' | 'linkedin';
    providerId?: string;
  }): Promise<void> {
    if (options.provider === 'linkedin') {
      return rawSocialLogin.logout({ provider: 'oauth2', providerId: LINKEDIN_PROVIDER_ID });
    }
    return rawSocialLogin.logout(options);
  }

  async isLoggedIn(options: isLoggedInOptions): Promise<{ isLoggedIn: boolean }> {
    if (options.provider === 'linkedin') {
      return rawSocialLogin.isLoggedIn({ provider: 'oauth2', providerId: LINKEDIN_PROVIDER_ID });
    }
    return rawSocialLogin.isLoggedIn(options);
  }

  async getAuthorizationCode(options: AuthorizationCodeOptions): Promise<AuthorizationCode> {
    if (options.provider === 'linkedin') {
      return rawSocialLogin.getAuthorizationCode({ provider: 'oauth2', providerId: LINKEDIN_PROVIDER_ID });
    }
    return rawSocialLogin.getAuthorizationCode(options);
  }

  async refresh(options: LoginOptions): Promise<void> {
    if (options.provider === 'google' && this.initializeOptions?.google?.mode === 'offline') {
      console.warn(`[SocialLogin] ${GOOGLE_OFFLINE_REFRESH_MESSAGE}`);
    }
    if (options.provider === 'linkedin') {
      const oauth2Options = buildLinkedInLoginOptions(options.options as any);
      return rawSocialLogin.refresh({ provider: 'oauth2', options: oauth2Options });
    }
    return rawSocialLogin.refresh(options);
  }

  async refreshToken(options: {
    provider: 'oauth2' | 'linkedin';
    providerId: string;
    refreshToken?: string;
    additionalParameters?: Record<string, string>;
  }): Promise<OAuth2LoginResponse> {
    if (options.provider === 'linkedin') {
      return rawSocialLogin.refreshToken({
        provider: 'oauth2',
        providerId: LINKEDIN_PROVIDER_ID,
        refreshToken: options.refreshToken,
        additionalParameters: options.additionalParameters,
      });
    }
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
