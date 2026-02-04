import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  SocialLoginAuthConnect,
  type AuthConnectProviderId,
  type OAuth2LoginResponse,
  type AuthorizationCode,
} from '../../src';
import './App.css';

type Provider = AuthConnectProviderId;

type BusyAction = 'initialize' | 'login' | 'logout' | 'getAuthorizationCode' | null;

const providers: Array<{ id: Provider; label: string }> = [
  { id: 'auth0', label: 'Auth0' },
  { id: 'azure', label: 'Azure AD' },
  { id: 'cognito', label: 'Cognito' },
  { id: 'okta', label: 'Okta' },
  { id: 'onelogin', label: 'OneLogin' },
];

interface Auth0ConfigState {
  domain: string;
  clientId: string;
  redirectUrl: string;
  audience: string;
  scope: string;
}

interface AzureConfigState {
  tenantId: string;
  authorityHost: string;
  clientId: string;
  redirectUrl: string;
  scope: string;
}

interface CognitoConfigState {
  domain: string;
  clientId: string;
  redirectUrl: string;
  scope: string;
}

interface OktaConfigState {
  issuer: string;
  clientId: string;
  redirectUrl: string;
  scope: string;
}

interface OneLoginConfigState {
  issuer: string;
  clientId: string;
  redirectUrl: string;
  scope: string;
}

const auth0Defaults: Auth0ConfigState = {
  domain: 'https://your-tenant.auth0.com',
  clientId: '',
  redirectUrl: 'myapp://oauth/auth0',
  audience: '',
  scope: 'openid profile email offline_access',
};

const azureDefaults: AzureConfigState = {
  tenantId: 'common',
  authorityHost: 'https://login.microsoftonline.com',
  clientId: '',
  redirectUrl: 'myapp://oauth/azure',
  scope: 'openid profile email',
};

const cognitoDefaults: CognitoConfigState = {
  domain: 'https://your-domain.auth.region.amazoncognito.com',
  clientId: '',
  redirectUrl: 'myapp://oauth/cognito',
  scope: 'openid profile email',
};

const oktaDefaults: OktaConfigState = {
  issuer: 'https://dev-12345.okta.com/oauth2/default',
  clientId: '',
  redirectUrl: 'myapp://oauth/okta',
  scope: 'openid profile email offline_access',
};

const oneloginDefaults: OneLoginConfigState = {
  issuer: 'https://your-tenant.onelogin.com/oidc/2',
  clientId: '',
  redirectUrl: 'myapp://oauth/onelogin',
  scope: 'openid profile email',
};

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  try {
    return JSON.stringify(error);
  } catch {
    return 'Unknown error';
  }
};

function AuthConnectPage() {
  const navigate = useNavigate();
  const [selectedProvider, setSelectedProvider] = useState<Provider>('auth0');
  const [auth0Config, setAuth0Config] = useState<Auth0ConfigState>(auth0Defaults);
  const [azureConfig, setAzureConfig] = useState<AzureConfigState>(azureDefaults);
  const [cognitoConfig, setCognitoConfig] = useState<CognitoConfigState>(cognitoDefaults);
  const [oktaConfig, setOktaConfig] = useState<OktaConfigState>(oktaDefaults);
  const [oneloginConfig, setOneLoginConfig] = useState<OneLoginConfigState>(oneloginDefaults);
  const [busyAction, setBusyAction] = useState<BusyAction>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loginResponse, setLoginResponse] = useState<OAuth2LoginResponse | null>(null);
  const [authorizationCode, setAuthorizationCode] = useState<AuthorizationCode | null>(null);

  const updateAuth0Config = <Key extends keyof Auth0ConfigState>(key: Key, value: Auth0ConfigState[Key]) => {
    setAuth0Config((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const updateAzureConfig = <Key extends keyof AzureConfigState>(key: Key, value: AzureConfigState[Key]) => {
    setAzureConfig((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const updateCognitoConfig = <Key extends keyof CognitoConfigState>(key: Key, value: CognitoConfigState[Key]) => {
    setCognitoConfig((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const updateOktaConfig = <Key extends keyof OktaConfigState>(key: Key, value: OktaConfigState[Key]) => {
    setOktaConfig((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const updateOneLoginConfig = <Key extends keyof OneLoginConfigState>(key: Key, value: OneLoginConfigState[Key]) => {
    setOneLoginConfig((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const buildAuthConnectConfig = () => {
    switch (selectedProvider) {
      case 'auth0':
        return {
          auth0: {
            domain: auth0Config.domain,
            clientId: auth0Config.clientId,
            redirectUrl: auth0Config.redirectUrl,
            scope: auth0Config.scope || undefined,
            audience: auth0Config.audience || undefined,
          },
        };
      case 'azure':
        return {
          azure: {
            tenantId: azureConfig.tenantId || undefined,
            authorityHost: azureConfig.authorityHost || undefined,
            clientId: azureConfig.clientId,
            redirectUrl: azureConfig.redirectUrl,
            scope: azureConfig.scope || undefined,
          },
        };
      case 'cognito':
        return {
          cognito: {
            domain: cognitoConfig.domain,
            clientId: cognitoConfig.clientId,
            redirectUrl: cognitoConfig.redirectUrl,
            scope: cognitoConfig.scope || undefined,
          },
        };
      case 'okta':
        return {
          okta: {
            issuer: oktaConfig.issuer,
            clientId: oktaConfig.clientId,
            redirectUrl: oktaConfig.redirectUrl,
            scope: oktaConfig.scope || undefined,
          },
        };
      case 'onelogin':
        return {
          onelogin: {
            issuer: oneloginConfig.issuer,
            clientId: oneloginConfig.clientId,
            redirectUrl: oneloginConfig.redirectUrl,
            scope: oneloginConfig.scope || undefined,
          },
        };
      default:
        return {};
    }
  };

  const handleInitialize = async () => {
    setBusyAction('initialize');
    setStatusMessage(null);
    setErrorMessage(null);

    try {
      await SocialLoginAuthConnect.initialize({
        authConnect: buildAuthConnectConfig(),
      });
      const providerName = providers.find((provider) => provider.id === selectedProvider)?.label ?? selectedProvider;
      setStatusMessage(`${providerName} preset initialized.`);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setBusyAction(null);
    }
  };

  const handleLogin = async () => {
    setBusyAction('login');
    setStatusMessage(null);
    setErrorMessage(null);

    try {
      let scope: string | undefined;

      switch (selectedProvider) {
        case 'auth0':
          scope = auth0Config.scope || undefined;
          break;
        case 'azure':
          scope = azureConfig.scope || undefined;
          break;
        case 'cognito':
          scope = cognitoConfig.scope || undefined;
          break;
        case 'okta':
          scope = oktaConfig.scope || undefined;
          break;
        case 'onelogin':
          scope = oneloginConfig.scope || undefined;
          break;
        default:
          scope = undefined;
      }

      const response = await SocialLoginAuthConnect.login({
        provider: selectedProvider,
        options: scope ? { scope } : undefined,
      });

      setLoginResponse(response.result as OAuth2LoginResponse);
      const providerName = providers.find((provider) => provider.id === selectedProvider)?.label ?? selectedProvider;
      setStatusMessage(`${providerName} login succeeded.`);
    } catch (error) {
      setLoginResponse(null);
      setErrorMessage(getErrorMessage(error));
    } finally {
      setBusyAction(null);
    }
  };

  const handleLogout = async () => {
    setBusyAction('logout');
    setStatusMessage(null);
    setErrorMessage(null);

    try {
      await SocialLoginAuthConnect.logout({ provider: selectedProvider });
      setLoginResponse(null);
      setAuthorizationCode(null);
      const providerName = providers.find((provider) => provider.id === selectedProvider)?.label ?? selectedProvider;
      setStatusMessage(`${providerName} logout succeeded.`);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setBusyAction(null);
    }
  };

  const handleGetAuthorizationCode = async () => {
    setBusyAction('getAuthorizationCode');
    setStatusMessage(null);
    setErrorMessage(null);

    try {
      const code = await SocialLoginAuthConnect.getAuthorizationCode({ provider: selectedProvider });
      setAuthorizationCode(code);
      const providerName = providers.find((provider) => provider.id === selectedProvider)?.label ?? selectedProvider;
      setStatusMessage(`${providerName} authorization code retrieved.`);
    } catch (error) {
      setAuthorizationCode(null);
      setErrorMessage(getErrorMessage(error));
    } finally {
      setBusyAction(null);
    }
  };

  const providerName = providers.find((provider) => provider.id === selectedProvider)?.label ?? selectedProvider;

  return (
    <div className="app">
      <div className="app-card">
        <header className="app-header">
          <div className="app-header-title">
            <h1>Auth Connect Presets</h1>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                className="firebase-button"
                onClick={() => navigate('/')}
                aria-label="Back to Social Login"
              >
                Back
              </button>
            </div>
          </div>
          <p>Test Auth0, Azure AD, Cognito, Okta, and OneLogin presets (mapped to OAuth2).</p>
        </header>

        <section className="provider-switch" aria-label="Auth Connect provider">
          <span className="section-title">Provider</span>
          <div className="provider-options">
            {providers.map((provider) => (
              <button
                key={provider.id}
                type="button"
                className={`provider-option${selectedProvider === provider.id ? ' is-active' : ''}`}
                onClick={() => setSelectedProvider(provider.id)}
              >
                {provider.label}
              </button>
            ))}
          </div>
        </section>

        <section className="config">
          <span className="section-title">{providerName} configuration</span>

          {selectedProvider === 'auth0' && (
            <>
              <div className="field">
                <label htmlFor="auth0Domain">Domain</label>
                <input
                  id="auth0Domain"
                  type="text"
                  placeholder="https://your-tenant.auth0.com"
                  value={auth0Config.domain}
                  onChange={(event) => updateAuth0Config('domain', event.target.value)}
                />
                <p className="hint">Auth0 domain (with https://).</p>
              </div>
              <div className="field">
                <label htmlFor="auth0ClientId">Client ID</label>
                <input
                  id="auth0ClientId"
                  type="text"
                  placeholder="your-auth0-client-id"
                  value={auth0Config.clientId}
                  onChange={(event) => updateAuth0Config('clientId', event.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="auth0RedirectUrl">Redirect URL</label>
                <input
                  id="auth0RedirectUrl"
                  type="text"
                  placeholder="myapp://oauth/auth0"
                  value={auth0Config.redirectUrl}
                  onChange={(event) => updateAuth0Config('redirectUrl', event.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="auth0Audience">Audience (optional)</label>
                <input
                  id="auth0Audience"
                  type="text"
                  placeholder="https://your-api.example.com"
                  value={auth0Config.audience}
                  onChange={(event) => updateAuth0Config('audience', event.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="auth0Scope">Scopes</label>
                <input
                  id="auth0Scope"
                  type="text"
                  placeholder="openid profile email offline_access"
                  value={auth0Config.scope}
                  onChange={(event) => updateAuth0Config('scope', event.target.value)}
                />
              </div>
            </>
          )}

          {selectedProvider === 'azure' && (
            <>
              <div className="field">
                <label htmlFor="azureTenantId">Tenant ID</label>
                <input
                  id="azureTenantId"
                  type="text"
                  placeholder="common"
                  value={azureConfig.tenantId}
                  onChange={(event) => updateAzureConfig('tenantId', event.target.value)}
                />
                <p className="hint">Use "common" for multi-tenant apps.</p>
              </div>
              <div className="field">
                <label htmlFor="azureAuthority">Authority Host</label>
                <input
                  id="azureAuthority"
                  type="text"
                  placeholder="https://login.microsoftonline.com"
                  value={azureConfig.authorityHost}
                  onChange={(event) => updateAzureConfig('authorityHost', event.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="azureClientId">Client ID</label>
                <input
                  id="azureClientId"
                  type="text"
                  placeholder="your-azure-client-id"
                  value={azureConfig.clientId}
                  onChange={(event) => updateAzureConfig('clientId', event.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="azureRedirectUrl">Redirect URL</label>
                <input
                  id="azureRedirectUrl"
                  type="text"
                  placeholder="myapp://oauth/azure"
                  value={azureConfig.redirectUrl}
                  onChange={(event) => updateAzureConfig('redirectUrl', event.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="azureScope">Scopes</label>
                <input
                  id="azureScope"
                  type="text"
                  placeholder="openid profile email"
                  value={azureConfig.scope}
                  onChange={(event) => updateAzureConfig('scope', event.target.value)}
                />
              </div>
            </>
          )}

          {selectedProvider === 'cognito' && (
            <>
              <div className="field">
                <label htmlFor="cognitoDomain">Domain</label>
                <input
                  id="cognitoDomain"
                  type="text"
                  placeholder="https://your-domain.auth.region.amazoncognito.com"
                  value={cognitoConfig.domain}
                  onChange={(event) => updateCognitoConfig('domain', event.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="cognitoClientId">Client ID</label>
                <input
                  id="cognitoClientId"
                  type="text"
                  placeholder="your-cognito-client-id"
                  value={cognitoConfig.clientId}
                  onChange={(event) => updateCognitoConfig('clientId', event.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="cognitoRedirect">Redirect URL</label>
                <input
                  id="cognitoRedirect"
                  type="text"
                  placeholder="myapp://oauth/cognito"
                  value={cognitoConfig.redirectUrl}
                  onChange={(event) => updateCognitoConfig('redirectUrl', event.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="cognitoScope">Scopes</label>
                <input
                  id="cognitoScope"
                  type="text"
                  placeholder="openid profile email"
                  value={cognitoConfig.scope}
                  onChange={(event) => updateCognitoConfig('scope', event.target.value)}
                />
              </div>
            </>
          )}

          {selectedProvider === 'okta' && (
            <>
              <div className="field">
                <label htmlFor="oktaIssuer">Issuer</label>
                <input
                  id="oktaIssuer"
                  type="text"
                  placeholder="https://dev-12345.okta.com/oauth2/default"
                  value={oktaConfig.issuer}
                  onChange={(event) => updateOktaConfig('issuer', event.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="oktaClientId">Client ID</label>
                <input
                  id="oktaClientId"
                  type="text"
                  placeholder="your-okta-client-id"
                  value={oktaConfig.clientId}
                  onChange={(event) => updateOktaConfig('clientId', event.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="oktaRedirect">Redirect URL</label>
                <input
                  id="oktaRedirect"
                  type="text"
                  placeholder="myapp://oauth/okta"
                  value={oktaConfig.redirectUrl}
                  onChange={(event) => updateOktaConfig('redirectUrl', event.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="oktaScope">Scopes</label>
                <input
                  id="oktaScope"
                  type="text"
                  placeholder="openid profile email offline_access"
                  value={oktaConfig.scope}
                  onChange={(event) => updateOktaConfig('scope', event.target.value)}
                />
              </div>
            </>
          )}

          {selectedProvider === 'onelogin' && (
            <>
              <div className="field">
                <label htmlFor="oneloginIssuer">Issuer</label>
                <input
                  id="oneloginIssuer"
                  type="text"
                  placeholder="https://your-tenant.onelogin.com/oidc/2"
                  value={oneloginConfig.issuer}
                  onChange={(event) => updateOneLoginConfig('issuer', event.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="oneloginClientId">Client ID</label>
                <input
                  id="oneloginClientId"
                  type="text"
                  placeholder="your-onelogin-client-id"
                  value={oneloginConfig.clientId}
                  onChange={(event) => updateOneLoginConfig('clientId', event.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="oneloginRedirect">Redirect URL</label>
                <input
                  id="oneloginRedirect"
                  type="text"
                  placeholder="myapp://oauth/onelogin"
                  value={oneloginConfig.redirectUrl}
                  onChange={(event) => updateOneLoginConfig('redirectUrl', event.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="oneloginScope">Scopes</label>
                <input
                  id="oneloginScope"
                  type="text"
                  placeholder="openid profile email"
                  value={oneloginConfig.scope}
                  onChange={(event) => updateOneLoginConfig('scope', event.target.value)}
                />
              </div>
            </>
          )}
        </section>

        <div className="actions">
          <button type="button" onClick={handleInitialize} disabled={busyAction !== null}>
            {busyAction === 'initialize' ? 'initializing...' : 'initialize()'}
          </button>
          <button type="button" onClick={handleLogin} disabled={busyAction !== null}>
            {busyAction === 'login' ? 'logging in...' : 'login()'}
          </button>
          <button type="button" onClick={handleLogout} disabled={busyAction !== null}>
            {busyAction === 'logout' ? 'logging out...' : 'logout()'}
          </button>
          <button type="button" onClick={handleGetAuthorizationCode} disabled={busyAction !== null}>
            {busyAction === 'getAuthorizationCode' ? 'getting code...' : 'getAuthorizationCode()'}
          </button>
        </div>

        {statusMessage ? <div className="status status--success">{statusMessage}</div> : null}
        {errorMessage ? <div className="status status--error">{errorMessage}</div> : null}

        {loginResponse ? (
          <section className="response">
            <h2>Last login response</h2>
            <pre>{JSON.stringify(loginResponse, null, 2)}</pre>
          </section>
        ) : null}

        {authorizationCode ? (
          <section className="response">
            <h2>Authorization Code</h2>
            <pre>{JSON.stringify(authorizationCode, null, 2)}</pre>
          </section>
        ) : null}
      </div>
    </div>
  );
}

export default AuthConnectPage;
