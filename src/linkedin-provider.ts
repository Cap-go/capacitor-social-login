import type {
  LinkedInLoginOptions,
  LinkedInLoginResponse,
  LinkedInProviderConfig,
  LoginResult,
  OAuth2LoginOptions,
  OAuth2LoginResponse,
  OAuth2ProviderConfig,
} from './definitions';

export const LINKEDIN_PROVIDER_ID = 'linkedin';
const LINKEDIN_REDIRECT_PENDING_KEY = 'capgo_social_login_linkedin_redirect';
const LINKEDIN_AUTH_URL = 'https://www.linkedin.com/oauth/v2/authorization';
const LINKEDIN_TOKEN_URL = 'https://www.linkedin.com/oauth/v2/accessToken';
const LINKEDIN_RESOURCE_URL = 'https://api.linkedin.com/v2/userinfo';
const LINKEDIN_DEFAULT_SCOPE = 'openid profile email';

const normalizeScope = (scope?: string | string[]): string => {
  if (!scope) return LINKEDIN_DEFAULT_SCOPE;
  if (Array.isArray(scope)) {
    return scope.filter(Boolean).join(' ');
  }
  return scope;
};

export const buildLinkedInOAuthConfig = (config: LinkedInProviderConfig): OAuth2ProviderConfig => {
  const scope = normalizeScope(config.scope ?? config.scopes);

  return {
    ...config,
    appId: config.appId ?? config.clientId,
    clientSecret: config.clientSecret,
    authorizationBaseUrl: config.authorizationBaseUrl ?? config.authorizationEndpoint ?? LINKEDIN_AUTH_URL,
    accessTokenEndpoint: config.accessTokenEndpoint ?? config.tokenEndpoint ?? LINKEDIN_TOKEN_URL,
    resourceUrl: config.resourceUrl ?? LINKEDIN_RESOURCE_URL,
    responseType: config.responseType ?? 'code',
    pkceEnabled: config.pkceEnabled ?? true,
    scope,
  };
};

export const buildLinkedInLoginOptions = (options: LinkedInLoginOptions = {}): OAuth2LoginOptions => {
  const scope = options.scope ?? options.scopes ?? LINKEDIN_DEFAULT_SCOPE;

  return {
    ...options,
    providerId: LINKEDIN_PROVIDER_ID,
    scope,
  };
};

export const isLinkedInOAuthResult = (
  result: LoginResult,
): result is { provider: 'oauth2'; result: OAuth2LoginResponse } =>
  result.provider === 'oauth2' && result.result.providerId === LINKEDIN_PROVIDER_ID;

export const asLinkedInLoginResult = (result: {
  provider: 'oauth2';
  result: OAuth2LoginResponse;
}): { provider: 'linkedin'; result: LinkedInLoginResponse } => ({
  provider: 'linkedin',
  result: result.result,
});

export const markLinkedInRedirectPending = (): void => {
  try {
    sessionStorage.setItem(LINKEDIN_REDIRECT_PENDING_KEY, '1');
  } catch {
    // sessionStorage may be unavailable
  }
};

export const consumeLinkedInRedirectPending = (): boolean => {
  try {
    const pending = sessionStorage.getItem(LINKEDIN_REDIRECT_PENDING_KEY) === '1';
    sessionStorage.removeItem(LINKEDIN_REDIRECT_PENDING_KEY);
    return pending;
  } catch {
    return false;
  }
};
