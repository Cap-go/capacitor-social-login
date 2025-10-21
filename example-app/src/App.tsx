import { useMemo, useState, useEffect } from 'react';
import {
  SocialLogin,
  type AppleProviderOptions,
  type AppleProviderResponse,
  type GoogleLoginOptions,
  type GoogleLoginResponse,
} from '../../src';
import './App.css';

type Provider = 'apple' | 'google' | 'facebook';

const providers: Array<{ id: Provider; label: string; disabled?: boolean }> = [
  { id: 'apple', label: 'Apple' },
  { id: 'google', label: 'Google' },
  { id: 'facebook', label: 'Facebook', disabled: true },
];

interface AppleConfigState {
  clientId: string;
  redirectUrl: string;
  scopes: string;
  useProperTokenExchange: boolean;
  useBroadcastChannel: boolean;
}

interface GoogleConfigState {
  webClientId: string;
  redirectUrl: string;
  scopes: string;
  mode: 'online' | 'offline';
  hostedDomain: string;
}

// Update the values below to pre-fill the form with your own defaults.
const appleConfigDefaults: AppleConfigState = {
  clientId: 'app.capgo.plugin.SocialLogin.service',
  redirectUrl: 'https://social-login-backend.digitalshift-ee.workers.dev/apple/callback',
  scopes: 'name,email',
  useProperTokenExchange: false,
  useBroadcastChannel: false,
};

const googleConfigDefaults: GoogleConfigState = {
  webClientId: '44885413573-qt5hdl4vug0g3bh4p1fl80urn09ahasd.apps.googleusercontent.com',
  redirectUrl: 'https://social-login-backend.digitalshift-ee.workers.dev/google/callback',
  scopes: 'profile,email',
  mode: 'online',
  hostedDomain: '',
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

function App() {
  const [selectedProvider, setSelectedProvider] = useState<Provider>('apple');
  const [appleConfig, setAppleConfig] = useState<AppleConfigState>(appleConfigDefaults);
  const [googleConfig, setGoogleConfig] = useState<GoogleConfigState>(googleConfigDefaults);
  const [busyAction, setBusyAction] = useState<'initialize' | 'login' | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loginResponse, setLoginResponse] = useState<AppleProviderResponse | GoogleLoginResponse | null>(null);

  const parsedAppleScopes = useMemo(
    () =>
      appleConfig.scopes
        .split(',')
        .map((scope) => scope.trim())
        .filter((scope) => scope.length > 0),
    [appleConfig.scopes],
  );

  const parsedGoogleScopes = useMemo(
    () =>
      googleConfig.scopes
        .split(',')
        .map((scope) => scope.trim())
        .filter((scope) => scope.length > 0),
    [googleConfig.scopes],
  );

  // Check Google login status on mount to invoke redirect handling
  // This doesn't serve any functional purpose in the UI but ensures
  // that any pending OAuth redirects are properly processed
  useEffect(() => {
    const checkGoogleLoginStatus = async () => {
      try {
        await SocialLogin.isLoggedIn({ provider: 'google' });
        // We don't use the result, this is just to trigger redirect handling
      } catch (error) {
        // Ignore errors - this is just for redirect handling
        console.log('Google login status check completed (redirect handling)');
      }
    };

    checkGoogleLoginStatus();
  }, []);

  const handleProviderChange = (nextProvider: Provider) => {
    const providerMeta = providers.find((entry) => entry.id === nextProvider);
    if (providerMeta?.disabled) {
      setStatusMessage(`${providerMeta.label} support is coming soon. Apple and Google are the only active providers for now.`);
      setErrorMessage(null);
      return;
    }

    setSelectedProvider(nextProvider);
    setStatusMessage(null);
    setErrorMessage(null);
  };

  const updateAppleConfig = <Key extends keyof AppleConfigState>(key: Key, value: AppleConfigState[Key]) => {
    setAppleConfig((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const updateGoogleConfig = <Key extends keyof GoogleConfigState>(key: Key, value: GoogleConfigState[Key]) => {
    setGoogleConfig((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const ensureProvider = () => {
    if (selectedProvider !== 'apple' && selectedProvider !== 'google') {
      setErrorMessage('Only Apple and Google login are available right now.');
      setStatusMessage(null);
      return false;
    }
    return true;
  };

  const handleInitialize = async () => {
    if (!ensureProvider()) {
      return;
    }

    setBusyAction('initialize');
    setStatusMessage(null);
    setErrorMessage(null);
    setLoginResponse(null);

    try {
      const initOptions: any = {};
      
      if (selectedProvider === 'apple') {
        initOptions.apple = {
          clientId: appleConfig.clientId || undefined,
          redirectUrl: appleConfig.redirectUrl || undefined,
          useProperTokenExchange: appleConfig.useProperTokenExchange || undefined,
          useBroadcastChannel: appleConfig.useBroadcastChannel || undefined,
        };
      } else if (selectedProvider === 'google') {
        initOptions.google = {
          webClientId: googleConfig.webClientId || undefined,
          redirectUrl: googleConfig.redirectUrl || undefined,
          mode: googleConfig.mode || undefined,
          hostedDomain: googleConfig.hostedDomain || undefined,
        };
      }

      await SocialLogin.initialize(initOptions);
      setStatusMessage(`${selectedProvider === 'apple' ? 'Apple' : 'Google'} provider initialized.`);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setBusyAction(null);
    }
  };

  const handleLogin = async () => {
    if (!ensureProvider()) {
      return;
    }

    setBusyAction('login');
    setStatusMessage(null);
    setErrorMessage(null);

    try {
      let options: AppleProviderOptions | GoogleLoginOptions = {};
      let provider: 'apple' | 'google';

      if (selectedProvider === 'apple') {
        provider = 'apple';
        const appleOptions: AppleProviderOptions = {};
        if (parsedAppleScopes.length > 0) {
          appleOptions.scopes = parsedAppleScopes;
        }
        if (appleConfig.useBroadcastChannel) {
          appleOptions.useBroadcastChannel = true;
        }
        options = appleOptions;
      } else if (selectedProvider === 'google') {
        provider = 'google';
        const googleOptions: GoogleLoginOptions = {};
        if (parsedGoogleScopes.length > 0) {
          googleOptions.scopes = parsedGoogleScopes;
        }
        options = googleOptions;
      } else {
        throw new Error('Unsupported provider');
      }

      const { result } = await SocialLogin.login({
        provider,
        options,
      });
      setLoginResponse(result);
      setStatusMessage(`${selectedProvider === 'apple' ? 'Apple' : 'Google'} login succeeded.`);
    } catch (error) {
      setLoginResponse(null);
      setErrorMessage(getErrorMessage(error));
    } finally {
      setBusyAction(null);
    }
  };

  return (
    <div className="app">
      <div className="app-card">
        <header className="app-header">
          <h1>Capacitor Social Login</h1>
          <p>Select a provider and try the initialize/login flow. Apple and Google are available, Facebook is coming soon.</p>
        </header>

        <section className="provider-switch" aria-label="Social login provider">
          <span className="section-title">Provider</span>
          <div className="provider-options">
            {providers.map((provider) => (
              <button
                key={provider.id}
                type="button"
                className={`provider-option${selectedProvider === provider.id ? ' is-active' : ''}`}
                onClick={() => handleProviderChange(provider.id)}
                disabled={provider.disabled}
              >
                {provider.label}
                {provider.disabled ? <span className="provider-badge">Soon</span> : null}
              </button>
            ))}
          </div>
        </section>

        <section className="config">
          <span className="section-title">{selectedProvider === 'apple' ? 'Apple' : 'Google'} configuration</span>

          {selectedProvider === 'apple' ? (
            <div className="field">
              <label htmlFor="clientId">Client ID</label>
              <input
                id="clientId"
                type="text"
                placeholder="com.example.service"
                value={appleConfig.clientId}
                onChange={(event) => updateAppleConfig('clientId', event.target.value)}
                autoComplete="off"
              />
              <p className="hint">Provide the service identifier you configured with Apple.</p>
            </div>
          ) : (
            <div className="field">
              <label htmlFor="webClientId">Web Client ID</label>
              <input
                id="webClientId"
                type="text"
                placeholder="xxxxxx-xxxxxxxxxxxxxxxxxx.apps.googleusercontent.com"
                value={googleConfig.webClientId}
                onChange={(event) => updateGoogleConfig('webClientId', event.target.value)}
                autoComplete="off"
              />
              <p className="hint">Provide the web client ID from Google Developers Console.</p>
            </div>
          )}

          <div className="field">
            <label htmlFor="redirectUrl">Redirect URL</label>
            <input
              id="redirectUrl"
              type="text"
              placeholder="https://your.backend/redirect"
              value={selectedProvider === 'apple' ? appleConfig.redirectUrl : googleConfig.redirectUrl}
              onChange={(event) => {
                if (selectedProvider === 'apple') {
                  updateAppleConfig('redirectUrl', event.target.value);
                } else {
                  updateGoogleConfig('redirectUrl', event.target.value);
                }
              }}
              autoComplete="off"
            />
            <p className="hint">
              {selectedProvider === 'apple' 
                ? 'Leave blank on iOS if you do not need a redirect.' 
                : 'Backend URL configured in Google Developers Console.'}
            </p>
          </div>

          <div className="field">
            <label htmlFor="scopes">Scopes</label>
            <input
              id="scopes"
              type="text"
              placeholder={selectedProvider === 'apple' ? 'name,email' : 'profile,email'}
              value={selectedProvider === 'apple' ? appleConfig.scopes : googleConfig.scopes}
              onChange={(event) => {
                if (selectedProvider === 'apple') {
                  updateAppleConfig('scopes', event.target.value);
                } else {
                  updateGoogleConfig('scopes', event.target.value);
                }
              }}
              autoComplete="off"
            />
            <p className="hint">Comma-separated values sent with the login request.</p>
            {(selectedProvider === 'apple' ? parsedAppleScopes : parsedGoogleScopes).length > 0 ? (
              <div className="scope-chips" aria-live="polite">
                {(selectedProvider === 'apple' ? parsedAppleScopes : parsedGoogleScopes).map((scope) => (
                  <span key={scope} className="scope-chip">
                    {scope}
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          {selectedProvider === 'apple' ? (
            <>
              <div className="field field--toggle">
                <label>
                  <input
                    type="checkbox"
                    checked={appleConfig.useProperTokenExchange}
                    onChange={(event) => updateAppleConfig('useProperTokenExchange', event.target.checked)}
                  />
                  Use proper token exchange
                </label>
                <p className="hint">Enable when your backend handles Apple token exchange.</p>
              </div>

              <div className="field field--toggle">
                <label>
                  <input
                    type="checkbox"
                    checked={appleConfig.useBroadcastChannel}
                    onChange={(event) => updateAppleConfig('useBroadcastChannel', event.target.checked)}
                  />
                  Use Broadcast Channel (Android)
                </label>
                <p className="hint">Skip redirect URLs by opting into the Broadcast Channel flow.</p>
              </div>
            </>
          ) : (
            <>
              <div className="field">
                <label htmlFor="mode">Login Mode</label>
                <select
                  id="mode"
                  value={googleConfig.mode}
                  onChange={(event) => updateGoogleConfig('mode', event.target.value as 'online' | 'offline')}
                >
                  <option value="online">Online (Profile + Tokens)</option>
                  <option value="offline">Offline (Server Auth Code)</option>
                </select>
                <p className="hint">Online returns user profile and tokens, offline returns only server auth code.</p>
              </div>

              <div className="field">
                <label htmlFor="hostedDomain">Hosted Domain (Optional)</label>
                <input
                  id="hostedDomain"
                  type="text"
                  placeholder="example.com"
                  value={googleConfig.hostedDomain}
                  onChange={(event) => updateGoogleConfig('hostedDomain', event.target.value)}
                  autoComplete="off"
                />
                <p className="hint">Filter visible accounts by hosted domain (e.g., G Suite accounts).</p>
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
        </div>

        {statusMessage ? <div className="status status--success">{statusMessage}</div> : null}
        {errorMessage ? <div className="status status--error">{errorMessage}</div> : null}

        {loginResponse ? (
          <section className="response">
            <h2>Last response</h2>
            <pre>{JSON.stringify(loginResponse, null, 2)}</pre>
          </section>
        ) : null}
      </div>
    </div>
  );
}

export default App;
