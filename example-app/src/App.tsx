import { useMemo, useState } from 'react';
import {
  SocialLogin,
  type AppleProviderOptions,
  type AppleProviderResponse,
} from '../../src';
import './App.css';

type Provider = 'apple' | 'google' | 'facebook';

const providers: Array<{ id: Provider; label: string; disabled?: boolean }> = [
  { id: 'apple', label: 'Apple' },
  { id: 'google', label: 'Google', disabled: true },
  { id: 'facebook', label: 'Facebook', disabled: true },
];

interface AppleConfigState {
  clientId: string;
  redirectUrl: string;
  scopes: string;
  useProperTokenExchange: boolean;
  useBroadcastChannel: boolean;
}

// Update the values below to pre-fill the form with your own defaults.
const appleConfigDefaults: AppleConfigState = {
  clientId: 'app.capgo.plugin.SocialLogin.service',
  redirectUrl: 'https://social-login-backend.digitalshift-ee.workers.dev/apple/callback',
  scopes: 'name,email',
  useProperTokenExchange: false,
  useBroadcastChannel: false,
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
  const [busyAction, setBusyAction] = useState<'initialize' | 'login' | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loginResponse, setLoginResponse] = useState<AppleProviderResponse | null>(null);

  const parsedScopes = useMemo(
    () =>
      appleConfig.scopes
        .split(',')
        .map((scope) => scope.trim())
        .filter((scope) => scope.length > 0),
    [appleConfig.scopes],
  );

  const handleProviderChange = (nextProvider: Provider) => {
    const providerMeta = providers.find((entry) => entry.id === nextProvider);
    if (providerMeta?.disabled) {
      setStatusMessage(`${providerMeta.label} support is coming soon. Apple is the only active provider for now.`);
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

  const ensureApple = () => {
    if (selectedProvider !== 'apple') {
      setErrorMessage('Only Apple login is available right now.');
      setStatusMessage(null);
      return false;
    }
    return true;
  };

  const handleInitialize = async () => {
    if (!ensureApple()) {
      return;
    }

    setBusyAction('initialize');
    setStatusMessage(null);
    setErrorMessage(null);
    setLoginResponse(null);

    try {
      await SocialLogin.initialize({
        apple: {
          clientId: appleConfig.clientId || undefined,
          redirectUrl: appleConfig.redirectUrl || undefined,
          useProperTokenExchange: appleConfig.useProperTokenExchange || undefined,
          useBroadcastChannel: appleConfig.useBroadcastChannel || undefined,
        },
      });
      setStatusMessage('Apple provider initialized.');
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setBusyAction(null);
    }
  };

  const handleLogin = async () => {
    if (!ensureApple()) {
      return;
    }

    setBusyAction('login');
    setStatusMessage(null);
    setErrorMessage(null);

    try {
      const options: AppleProviderOptions = {};

      if (parsedScopes.length > 0) {
        options.scopes = parsedScopes;
      }

      if (appleConfig.useBroadcastChannel) {
        options.useBroadcastChannel = true;
      }

      const { result } = await SocialLogin.login({
        provider: 'apple',
        options,
      });
      setLoginResponse(result);
      setStatusMessage('Apple login succeeded.');
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
          <p>Select a provider and try the initialize/login flow. Google and Facebook are placeholders for now.</p>
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
          <span className="section-title">Apple configuration</span>

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

          <div className="field">
            <label htmlFor="redirectUrl">Redirect URL</label>
            <input
              id="redirectUrl"
              type="text"
              placeholder="https://your.backend/redirect"
              value={appleConfig.redirectUrl}
              onChange={(event) => updateAppleConfig('redirectUrl', event.target.value)}
              autoComplete="off"
            />
            <p className="hint">Leave blank on iOS if you do not need a redirect.</p>
          </div>

          <div className="field">
            <label htmlFor="scopes">Scopes</label>
            <input
              id="scopes"
              type="text"
              placeholder="name,email"
              value={appleConfig.scopes}
              onChange={(event) => updateAppleConfig('scopes', event.target.value)}
              autoComplete="off"
            />
            <p className="hint">Comma-separated values sent with the login request.</p>
            {parsedScopes.length > 0 ? (
              <div className="scope-chips" aria-live="polite">
                {parsedScopes.map((scope) => (
                  <span key={scope} className="scope-chip">
                    {scope}
                  </span>
                ))}
              </div>
            ) : null}
          </div>

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
