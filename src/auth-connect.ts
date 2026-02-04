import type {
  AuthorizationCode,
  AuthorizationCodeOptions,
  InitializeOptions,
  LoginOptions,
  OAuth2LoginOptions,
  OAuth2ProviderConfig,
  ProviderSpecificCall,
  ProviderSpecificCallOptionsMap,
  ProviderSpecificCallResponseMap,
  ProviderResponseMap,
  SocialLoginPlugin,
} from './definitions';
import { SocialLoginBase } from './social-login';

type AuthConnectProviderId = 'auth0' | 'azure' | 'cognito' | 'okta' | 'onelogin';

type AuthConnectLoginOptions =
  | LoginOptions
  | {
      provider: AuthConnectProviderId;
      options?: Omit<OAuth2LoginOptions, 'providerId'>;
    };

type AuthConnectProviderOptions =
  | AuthorizationCodeOptions
  | {
      provider: AuthConnectProviderId;
    };

type AuthConnectInitializeOptions = InitializeOptions & {
  authConnect?: AuthConnectPresets;
};

type AuthConnectPresetBase = {
  clientId: string;
  redirectUrl: string;
  scope?: string;
  responseType?: 'code' | 'token';
  pkceEnabled?: boolean;
  additionalParameters?: Record<string, string>;
  additionalResourceHeaders?: Record<string, string>;
  resourceUrl?: string;
  authorizationBaseUrl?: string;
  accessTokenEndpoint?: string;
  logoutUrl?: string;
  logsEnabled?: boolean;
};

type Auth0Preset = AuthConnectPresetBase & {
  domain: string;
  audience?: string;
};

type AzurePreset = AuthConnectPresetBase & {
  tenantId?: string;
  authorityHost?: string;
};

type CognitoPreset = AuthConnectPresetBase & {
  domain: string;
};

type OktaPreset = AuthConnectPresetBase & {
  issuer: string;
};

type OneLoginPreset = AuthConnectPresetBase & {
  issuer: string;
};

type AuthConnectPresets = {
  auth0?: Auth0Preset;
  azure?: AzurePreset;
  cognito?: CognitoPreset;
  okta?: OktaPreset;
  onelogin?: OneLoginPreset;
};

type AuthConnectProviderResponseMap = ProviderResponseMap & {
  auth0: ProviderResponseMap['oauth2'];
  azure: ProviderResponseMap['oauth2'];
  cognito: ProviderResponseMap['oauth2'];
  okta: ProviderResponseMap['oauth2'];
  onelogin: ProviderResponseMap['oauth2'];
};

const AUTH_CONNECT_PROVIDERS: readonly AuthConnectProviderId[] = ['auth0', 'azure', 'cognito', 'okta', 'onelogin'];

const DEFAULT_SCOPES: Record<AuthConnectProviderId, string> = {
  auth0: 'openid profile email offline_access',
  azure: 'openid profile email',
  cognito: 'openid profile email',
  okta: 'openid profile email offline_access',
  onelogin: 'openid profile email',
};

const DEFAULT_RESOURCE_URLS: Partial<Record<AuthConnectProviderId, string>> = {
  azure: 'https://graph.microsoft.com/v1.0/me',
};

const DEFAULT_AUTHORITY_HOST = 'https://login.microsoftonline.com';

const ensureProtocol = (value: string): string => {
  if (value.startsWith('http://') || value.startsWith('https://')) {
    return value;
  }
  return `https://${value}`;
};

const trimTrailingSlash = (value: string): string => value.replace(/\/+$/, '');

const joinUrl = (base: string, path: string): string => {
  const sanitizedBase = trimTrailingSlash(base);
  const sanitizedPath = path.replace(/^\/+/, '');
  return `${sanitizedBase}/${sanitizedPath}`;
};

const mergeRecords = (
  base?: Record<string, string>,
  overrides?: Record<string, string>,
): Record<string, string> | undefined => {
  if (!base && !overrides) {
    return undefined;
  }
  return { ...(base ?? {}), ...(overrides ?? {}) };
};

const validatePreset = (providerId: AuthConnectProviderId, preset: AuthConnectPresetBase): void => {
  if (!preset.clientId) {
    throw new Error(`[authConnect] ${providerId} requires clientId.`);
  }
  if (!preset.redirectUrl) {
    throw new Error(`[authConnect] ${providerId} requires redirectUrl.`);
  }
};

const buildAuth0Config = (preset: Auth0Preset): OAuth2ProviderConfig => {
  validatePreset('auth0', preset);
  if (!preset.domain) {
    throw new Error('[authConnect] auth0 requires domain.');
  }
  const base = trimTrailingSlash(ensureProtocol(preset.domain));
  return buildConfigFromPreset('auth0', preset, {
    authorizationBaseUrl: joinUrl(base, 'authorize'),
    accessTokenEndpoint: joinUrl(base, 'oauth/token'),
    resourceUrl: joinUrl(base, 'userinfo'),
    logoutUrl: joinUrl(base, 'v2/logout'),
    additionalParameters: preset.audience ? { audience: preset.audience } : undefined,
  });
};

const buildAzureConfig = (preset: AzurePreset): OAuth2ProviderConfig => {
  validatePreset('azure', preset);
  const tenantId = preset.tenantId ?? 'common';
  const authorityHost = trimTrailingSlash(ensureProtocol(preset.authorityHost ?? DEFAULT_AUTHORITY_HOST));
  const base = joinUrl(authorityHost, `${tenantId}/oauth2/v2.0`);
  return buildConfigFromPreset('azure', preset, {
    authorizationBaseUrl: joinUrl(base, 'authorize'),
    accessTokenEndpoint: joinUrl(base, 'token'),
    resourceUrl: DEFAULT_RESOURCE_URLS.azure,
  });
};

const buildCognitoConfig = (preset: CognitoPreset): OAuth2ProviderConfig => {
  validatePreset('cognito', preset);
  if (!preset.domain) {
    throw new Error('[authConnect] cognito requires domain.');
  }
  const base = trimTrailingSlash(ensureProtocol(preset.domain));
  return buildConfigFromPreset('cognito', preset, {
    authorizationBaseUrl: joinUrl(base, 'oauth2/authorize'),
    accessTokenEndpoint: joinUrl(base, 'oauth2/token'),
    resourceUrl: joinUrl(base, 'oauth2/userInfo'),
    logoutUrl: joinUrl(base, 'logout'),
  });
};

const buildOktaConfig = (preset: OktaPreset): OAuth2ProviderConfig => {
  validatePreset('okta', preset);
  if (!preset.issuer) {
    throw new Error('[authConnect] okta requires issuer.');
  }
  const base = trimTrailingSlash(ensureProtocol(preset.issuer));
  return buildConfigFromPreset('okta', preset, {
    authorizationBaseUrl: joinUrl(base, 'v1/authorize'),
    accessTokenEndpoint: joinUrl(base, 'v1/token'),
    resourceUrl: joinUrl(base, 'v1/userinfo'),
    logoutUrl: joinUrl(base, 'v1/logout'),
  });
};

const buildOneLoginConfig = (preset: OneLoginPreset): OAuth2ProviderConfig => {
  validatePreset('onelogin', preset);
  if (!preset.issuer) {
    throw new Error('[authConnect] onelogin requires issuer.');
  }
  const base = trimTrailingSlash(ensureProtocol(preset.issuer));
  return buildConfigFromPreset('onelogin', preset, {
    authorizationBaseUrl: joinUrl(base, 'auth'),
    accessTokenEndpoint: joinUrl(base, 'token'),
    resourceUrl: joinUrl(base, 'me'),
    logoutUrl: joinUrl(base, 'logout'),
  });
};

const buildConfigFromPreset = (
  providerId: AuthConnectProviderId,
  preset: AuthConnectPresetBase,
  defaults: Partial<OAuth2ProviderConfig>,
): OAuth2ProviderConfig => {
  const additionalParameters = mergeRecords(defaults.additionalParameters, preset.additionalParameters);
  const additionalResourceHeaders = mergeRecords(defaults.additionalResourceHeaders, preset.additionalResourceHeaders);

  const config: OAuth2ProviderConfig = {
    appId: preset.clientId,
    authorizationBaseUrl: preset.authorizationBaseUrl ?? defaults.authorizationBaseUrl ?? '',
    accessTokenEndpoint: preset.accessTokenEndpoint ?? defaults.accessTokenEndpoint,
    redirectUrl: preset.redirectUrl,
    resourceUrl: preset.resourceUrl ?? defaults.resourceUrl,
    responseType: preset.responseType ?? defaults.responseType ?? 'code',
    pkceEnabled: preset.pkceEnabled ?? defaults.pkceEnabled ?? true,
    scope: preset.scope ?? defaults.scope ?? DEFAULT_SCOPES[providerId],
    additionalParameters,
    additionalResourceHeaders,
    logoutUrl: preset.logoutUrl ?? defaults.logoutUrl,
    logsEnabled: preset.logsEnabled ?? defaults.logsEnabled,
  };

  if (!config.authorizationBaseUrl) {
    throw new Error(`[authConnect] ${providerId} authorizationBaseUrl is required.`);
  }

  return config;
};

const buildAuthConnectProviders = (presets?: AuthConnectPresets): Record<string, OAuth2ProviderConfig> => {
  if (!presets) {
    return {};
  }
  const providers: Record<string, OAuth2ProviderConfig> = {};

  if (presets.auth0) {
    providers.auth0 = buildAuth0Config(presets.auth0);
  }
  if (presets.azure) {
    providers.azure = buildAzureConfig(presets.azure);
  }
  if (presets.cognito) {
    providers.cognito = buildCognitoConfig(presets.cognito);
  }
  if (presets.okta) {
    providers.okta = buildOktaConfig(presets.okta);
  }
  if (presets.onelogin) {
    providers.onelogin = buildOneLoginConfig(presets.onelogin);
  }

  return providers;
};

const isAuthConnectProvider = (provider: string): provider is AuthConnectProviderId =>
  AUTH_CONNECT_PROVIDERS.includes(provider as AuthConnectProviderId);

const isAuthConnectLoginOptions = (
  options: AuthConnectLoginOptions,
): options is Extract<AuthConnectLoginOptions, { provider: AuthConnectProviderId }> =>
  isAuthConnectProvider(options.provider);

const mapLoginOptions = (options: AuthConnectLoginOptions): LoginOptions => {
  if (isAuthConnectLoginOptions(options)) {
    return {
      provider: 'oauth2',
      options: {
        providerId: options.provider,
        ...(options.options ?? {}),
      },
    };
  }

  return options;
};

const mapProviderOptions = (options: AuthConnectProviderOptions): AuthorizationCodeOptions => {
  if (isAuthConnectProvider(options.provider)) {
    return {
      provider: 'oauth2',
      providerId: options.provider,
    };
  }

  return options;
};

const mapRefreshOptions = (options: AuthConnectLoginOptions): LoginOptions => mapLoginOptions(options);

const mergeOAuth2Configs = (
  presets: Record<string, OAuth2ProviderConfig>,
  oauth2?: Record<string, OAuth2ProviderConfig>,
): Record<string, OAuth2ProviderConfig> | undefined => {
  if (!Object.keys(presets).length && !oauth2) {
    return oauth2;
  }
  return {
    ...presets,
    ...(oauth2 ?? {}),
  };
};

type AuthConnectClient = {
  initialize: (options: AuthConnectInitializeOptions) => Promise<void>;
  login: <T extends AuthConnectLoginOptions['provider']>(
    options: Extract<AuthConnectLoginOptions, { provider: T }>,
  ) => Promise<{ provider: T; result: AuthConnectProviderResponseMap[T] }>;
  logout: (options: AuthConnectProviderOptions) => Promise<void>;
  isLoggedIn: (options: AuthConnectProviderOptions) => Promise<{ isLoggedIn: boolean }>;
  getAuthorizationCode: (options: AuthConnectProviderOptions) => Promise<AuthorizationCode>;
  refresh: (options: AuthConnectLoginOptions) => Promise<void>;
  providerSpecificCall: <T extends ProviderSpecificCall>(options: {
    call: T;
    options: ProviderSpecificCallOptionsMap[T];
  }) => Promise<ProviderSpecificCallResponseMap[T]>;
  getPluginVersion: () => Promise<{ version: string }>;
};

const createAuthConnectClient = (client: SocialLoginPlugin): AuthConnectClient => ({
  initialize: async (options: AuthConnectInitializeOptions): Promise<void> => {
    const { authConnect, oauth2, ...rest } = options;
    const presetProviders = buildAuthConnectProviders(authConnect);
    const mergedOauth2 = mergeOAuth2Configs(presetProviders, oauth2);
    const payload: InitializeOptions = {
      ...rest,
      ...(mergedOauth2 ? { oauth2: mergedOauth2 } : {}),
    };
    return client.initialize(payload);
  },
  login: async <T extends AuthConnectLoginOptions['provider']>(
    options: Extract<AuthConnectLoginOptions, { provider: T }>,
  ): Promise<{ provider: T; result: AuthConnectProviderResponseMap[T] }> => {
    if (isAuthConnectProvider(options.provider)) {
      const mapped = mapLoginOptions(options as AuthConnectLoginOptions);
      const response = await client.login(mapped as LoginOptions);
      return {
        provider: options.provider,
        result: response.result as AuthConnectProviderResponseMap[T],
      };
    }

    return client.login(options as LoginOptions) as Promise<{ provider: T; result: AuthConnectProviderResponseMap[T] }>;
  },
  logout: async (options: AuthConnectProviderOptions): Promise<void> => client.logout(mapProviderOptions(options)),
  isLoggedIn: async (options: AuthConnectProviderOptions): Promise<{ isLoggedIn: boolean }> =>
    client.isLoggedIn(mapProviderOptions(options)),
  getAuthorizationCode: async (options: AuthConnectProviderOptions): Promise<AuthorizationCode> =>
    client.getAuthorizationCode(mapProviderOptions(options)),
  refresh: async (options: AuthConnectLoginOptions): Promise<void> => client.refresh(mapRefreshOptions(options)),
  providerSpecificCall: async <T extends ProviderSpecificCall>(options: {
    call: T;
    options: ProviderSpecificCallOptionsMap[T];
  }): Promise<ProviderSpecificCallResponseMap[T]> => client.providerSpecificCall(options),
  getPluginVersion: async (): Promise<{ version: string }> => client.getPluginVersion(),
});

const SocialLoginAuthConnect = createAuthConnectClient(SocialLoginBase);

export type {
  AuthConnectInitializeOptions,
  AuthConnectLoginOptions,
  AuthConnectProviderId,
  AuthConnectProviderOptions,
  AuthConnectPresets,
};

export { createAuthConnectClient, SocialLoginAuthConnect };
