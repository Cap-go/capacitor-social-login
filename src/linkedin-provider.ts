import type {
  LinkedInLoginOptions,
  LinkedInProviderConfig,
  OAuth2LoginOptions,
  OAuth2ProviderConfig,
} from './definitions';

export const LINKEDIN_PROVIDER_ID = 'linkedin';
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
  const additionalTokenParameters = {
    ...(config.additionalTokenParameters ?? {}),
    ...(config.clientSecret ? { client_secret: config.clientSecret } : {}),
  };

  return {
    ...config,
    appId: config.appId ?? config.clientId,
    clientSecret: config.clientSecret,
    authorizationBaseUrl: config.authorizationBaseUrl ?? config.authorizationEndpoint ?? LINKEDIN_AUTH_URL,
    accessTokenEndpoint: config.accessTokenEndpoint ?? config.tokenEndpoint ?? LINKEDIN_TOKEN_URL,
    resourceUrl: config.resourceUrl ?? LINKEDIN_RESOURCE_URL,
    responseType: config.responseType ?? 'code',
    pkceEnabled: config.pkceEnabled ?? false,
    scope,
    additionalTokenParameters,
  };
};

export const buildLinkedInLoginOptions = (options: LinkedInLoginOptions): OAuth2LoginOptions => {
  const scope = options.scope ?? options.scopes ?? LINKEDIN_DEFAULT_SCOPE;

  return {
    ...options,
    providerId: LINKEDIN_PROVIDER_ID,
    scope,
  };
};
