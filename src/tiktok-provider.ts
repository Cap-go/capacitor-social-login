import type {
  LoginResult,
  OAuth2LoginOptions,
  OAuth2LoginResponse,
  OAuth2ProviderConfig,
  TikTokLoginOptions,
  TikTokLoginResponse,
  TikTokProviderConfig,
} from './definitions';

export const TIKTOK_PROVIDER_ID = 'tiktok';
const TIKTOK_AUTH_URL = 'https://www.tiktok.com/v2/auth/authorize/';
const TIKTOK_TOKEN_URL = 'https://open.tiktokapis.com/v2/oauth/token/';
const TIKTOK_DEFAULT_SCOPE = 'user.info.basic';

// TikTok Login Kit expects comma-separated scopes, not space-separated.
const serializeTikTokScope = (scope?: string | string[]): string | undefined => {
  if (scope === undefined || scope === null || scope === '') {
    return undefined;
  }
  if (Array.isArray(scope)) {
    return scope.filter(Boolean).join(',');
  }
  return scope;
};

export const buildTikTokOAuthConfig = (config: TikTokProviderConfig): OAuth2ProviderConfig => ({
  appId: config.clientKey,
  clientSecret: config.clientSecret,
  authorizationBaseUrl: TIKTOK_AUTH_URL,
  accessTokenEndpoint: TIKTOK_TOKEN_URL,
  redirectUrl: config.redirectUrl,
  responseType: 'code',
  pkceEnabled: config.pkceEnabled ?? true,
  scope: serializeTikTokScope(config.scope ?? config.scopes) ?? TIKTOK_DEFAULT_SCOPE,
  clientIdParamName: 'client_key',
  clientSecretParamName: 'client_secret',
  logsEnabled: config.logsEnabled ?? false,
});

export const buildTikTokLoginOptions = (options: TikTokLoginOptions = {}): OAuth2LoginOptions => {
  const scope = serializeTikTokScope(options.scope ?? options.scopes);
  return {
    providerId: TIKTOK_PROVIDER_ID,
    ...(scope === undefined ? {} : { scope }),
    state: options.state,
    codeVerifier: options.codeVerifier,
    redirectUrl: options.redirectUrl,
  };
};

export const isTikTokOAuthResult = (
  result: LoginResult,
): result is { provider: 'oauth2'; result: OAuth2LoginResponse } =>
  result.provider === 'oauth2' && result.result.providerId === TIKTOK_PROVIDER_ID;

export const asTikTokLoginResult = (result: {
  provider: 'oauth2';
  result: OAuth2LoginResponse;
}): { provider: 'tiktok'; result: TikTokLoginResponse } => ({
  provider: 'tiktok',
  result: result.result,
});
