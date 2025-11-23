import { useMemo, useState, useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import {
  SocialLogin,
  type AppleProviderOptions,
  type AppleProviderResponse,
  type GoogleLoginOptions,
  type GoogleLoginResponse,
  type FacebookLoginOptions,
  type FacebookLoginResponse,
  type FacebookRequestTrackingResponse,
  type AuthorizationCode,
} from '../../src';
import { Capacitor } from '@capacitor/core';
import { PrivacyScreen } from '@capacitor/privacy-screen';
import FirebasePage from './FirebasePage';
import CreateAccountPage from './CreateAccountPage';
import DashboardPage from './DashboardPage';
import './App.css';

type Provider = 'apple' | 'google' | 'facebook';

const providers: Array<{ id: Provider; label: string; disabled?: boolean }> = [
  { id: 'apple', label: 'Apple' },
  { id: 'google', label: 'Google' },
  { id: 'facebook', label: 'Facebook' },
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
  iOSClientId: string;
  redirectUrl: string;
  scopes: string;
  mode: 'online' | 'offline';
  hostedDomain: string;
  forceRefreshToken: boolean;
}

interface FacebookConfigState {
  appId: string;
  clientToken: string;
  permissions: string;
  limitedLogin: boolean;
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
  iOSClientId: '44885413573-57pq0pothq40hh2pulaot47r8e06df64.apps.googleusercontent.com',
  redirectUrl: 'https://social-login-backend.digitalshift-ee.workers.dev/google/callback',
  scopes: 'profile,email',
  mode: 'online',
  hostedDomain: '',
  forceRefreshToken: false,
};

const facebookConfigDefaults: FacebookConfigState = {
  appId: '1640177526775785',
  clientToken: '621ef94157c7a8e58a0343918e9b6615',
  permissions: 'email,public_profile',
  limitedLogin: false,
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

function HomePage() {
  const navigate = useNavigate();
  const [selectedProvider, setSelectedProvider] = useState<Provider>('apple');
  const [appleConfig, setAppleConfig] = useState<AppleConfigState>(appleConfigDefaults);
  const [googleConfig, setGoogleConfig] = useState<GoogleConfigState>(googleConfigDefaults);
  const [facebookConfig, setFacebookConfig] = useState<FacebookConfigState>(facebookConfigDefaults);
  const [busyAction, setBusyAction] = useState<'initialize' | 'login' | 'logout' | 'getAuthorizationCode' | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loginResponse, setLoginResponse] = useState<AppleProviderResponse | GoogleLoginResponse | FacebookLoginResponse | null>(null);
  const [authorizationCode, setAuthorizationCode] = useState<AuthorizationCode | null>(null);
  const [isIOSMode, setIsIOSMode] = useState<boolean>(false);
  const [trackingStatus, setTrackingStatus] = useState<FacebookRequestTrackingResponse['status'] | null>(null);
  const [calendarResponse, setCalendarResponse] = useState<any>(null);
  const [privacyScreenEnabled, setPrivacyScreenEnabled] = useState<boolean>(false);

  // Check if running on iOS
  const isIOS = Capacitor.getPlatform() === 'ios';

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

  const parsedFacebookPermissions = useMemo(
    () =>
      facebookConfig.permissions
        .split(',')
        .map((permission) => permission.trim())
        .filter((permission) => permission.length > 0),
    [facebookConfig.permissions],
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

  // Check privacy screen status on mount
  useEffect(() => {
    const checkPrivacyScreenStatus = async () => {
      try {
        const { enabled } = await PrivacyScreen.isEnabled();
        setPrivacyScreenEnabled(enabled);
      } catch (error) {
        // Ignore errors - privacy screen might not be available on web
        console.log('Privacy screen status check completed');
      }
    };

    checkPrivacyScreenStatus();
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

  const updateFacebookConfig = <Key extends keyof FacebookConfigState>(key: Key, value: FacebookConfigState[Key]) => {
    setFacebookConfig((current) => ({
      ...current,
      [key]: value,
    }));
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
        if (isIOS || isIOSMode) {
          initOptions.google = {
            iOSClientId: googleConfig.iOSClientId || undefined,
            iOSServerClientId: googleConfig.webClientId || undefined,
            mode: googleConfig.mode || undefined,
            hostedDomain: googleConfig.hostedDomain || undefined,
          };
        } else {
          initOptions.google = {
            webClientId: googleConfig.webClientId || undefined,
            redirectUrl: googleConfig.redirectUrl || undefined,
            mode: googleConfig.mode || undefined,
            hostedDomain: googleConfig.hostedDomain || undefined,
          };
        }
      } else if (selectedProvider === 'facebook') {
        initOptions.facebook = {
          appId: facebookConfig.appId || undefined,
          clientToken: facebookConfig.clientToken || undefined,
        };
      }

      await SocialLogin.initialize(initOptions);
      const providerNames: Record<Provider, string> = {
        apple: 'Apple',
        google: 'Google',
        facebook: 'Facebook',
      };
      setStatusMessage(`${providerNames[selectedProvider]} provider initialized.`);
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
      let options: AppleProviderOptions | GoogleLoginOptions | FacebookLoginOptions = {};
      let provider: 'apple' | 'google' | 'facebook';

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
        if (googleConfig.forceRefreshToken) {
          googleOptions.forceRefreshToken = true;
        }
        options = googleOptions;
      } else if (selectedProvider === 'facebook') {
        provider = 'facebook';
        const facebookOptions: FacebookLoginOptions = {
          permissions: parsedFacebookPermissions.length > 0 ? parsedFacebookPermissions : ['email', 'public_profile'],
          limitedLogin: facebookConfig.limitedLogin,
        };
        options = facebookOptions;
      } else {
        throw new Error('Unsupported provider');
      }

      let result: AppleProviderResponse | GoogleLoginResponse | FacebookLoginResponse;
      
      if (provider === 'apple') {
        const response = await SocialLogin.login({
          provider: 'apple',
          options: options as AppleProviderOptions,
        });
        result = response.result;
      } else if (provider === 'google') {
        const response = await SocialLogin.login({
          provider: 'google',
          options: options as GoogleLoginOptions,
        });
        result = response.result;
      } else {
        const response = await SocialLogin.login({
          provider: 'facebook',
          options: options as FacebookLoginOptions,
        });
        result = response.result;
      }
      
      setLoginResponse(result);
      const providerNames: Record<Provider, string> = {
        apple: 'Apple',
        google: 'Google',
        facebook: 'Facebook',
      };
      setStatusMessage(`${providerNames[selectedProvider]} login succeeded.`);
    } catch (error) {
      setLoginResponse(null);
      setErrorMessage(getErrorMessage(error));
    } finally {
      setBusyAction(null);
    }
  };

  const handleRequestTracking = async () => {
    if (selectedProvider !== 'facebook') {
      return;
    }

    setStatusMessage(null);
    setErrorMessage(null);

    try {
      const response = await SocialLogin.providerSpecificCall({
        call: 'facebook#requestTracking',
        options: {},
      });
      const trackingResponse = response as FacebookRequestTrackingResponse;
      setTrackingStatus(trackingResponse.status);
      
      const statusMessages: Record<FacebookRequestTrackingResponse['status'], string> = {
        authorized: 'Tracking permission granted ✅',
        denied: 'Tracking permission denied ❌',
        notDetermined: 'Tracking permission not determined',
        restricted: 'Tracking permission restricted',
      };
      setStatusMessage(statusMessages[trackingResponse.status]);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  };

  const handleLogout = async () => {
    if (!ensureProvider()) {
      return;
    }

    setBusyAction('logout');
    setStatusMessage(null);
    setErrorMessage(null);

    try {
      await SocialLogin.logout({ provider: selectedProvider });
      setLoginResponse(null);
      setAuthorizationCode(null);
      const providerNames: Record<Provider, string> = {
        apple: 'Apple',
        google: 'Google',
        facebook: 'Facebook',
      };
      setStatusMessage(`${providerNames[selectedProvider]} logout succeeded.`);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setBusyAction(null);
    }
  };

  const handleGetAuthorizationCode = async () => {
    if (!ensureProvider()) {
      return;
    }

    setBusyAction('getAuthorizationCode');
    setStatusMessage(null);
    setErrorMessage(null);

    try {
      const code = await SocialLogin.getAuthorizationCode({ provider: selectedProvider });
      setAuthorizationCode(code);
      const providerNames: Record<Provider, string> = {
        apple: 'Apple',
        google: 'Google',
        facebook: 'Facebook',
      };
      setStatusMessage(`${providerNames[selectedProvider]} authorization code retrieved.`);
    } catch (error) {
      setAuthorizationCode(null);
      setErrorMessage(getErrorMessage(error));
    } finally {
      setBusyAction(null);
    }
  };

  const handleAddCalendarScope = () => {
    if (selectedProvider !== 'google') {
      setErrorMessage('Calendar scope can only be added for Google provider');
      return;
    }

    const calendarScope = 'https://www.googleapis.com/auth/calendar.readonly';
    const currentScopes = googleConfig.scopes.split(',').map((s) => s.trim()).filter((s) => s.length > 0);
    
    if (!currentScopes.includes(calendarScope)) {
      const newScopes = [...currentScopes, calendarScope].join(',');
      updateGoogleConfig('scopes', newScopes);
      setStatusMessage(`Added calendar scope: ${calendarScope}`);
      setErrorMessage(null);
    } else {
      setStatusMessage('Calendar scope already added');
      setErrorMessage(null);
    }
  };

  const handleTestCalendarAPI = async () => {
    if (selectedProvider !== 'google') {
      setErrorMessage('Calendar API test is only available for Google provider');
      return;
    }

    setStatusMessage(null);
    setErrorMessage(null);
    setCalendarResponse(null);

    try {
      // Get access token from login response or authorization code
      let accessToken: string | null = null;

      if (loginResponse && 'responseType' in loginResponse && loginResponse.responseType === 'online') {
        // GoogleLoginResponseOnline
        if (loginResponse.accessToken?.token) {
          accessToken = loginResponse.accessToken.token;
        }
      }

      if (!accessToken && authorizationCode?.accessToken) {
        accessToken = authorizationCode.accessToken;
      }

      if (!accessToken) {
        // Try to get authorization code
        try {
          const code = await SocialLogin.getAuthorizationCode({ provider: 'google' });
          accessToken = code.accessToken || null;
        } catch (error) {
          setErrorMessage('No access token available. Please login first.');
          return;
        }
      }

      if (!accessToken) {
        setErrorMessage('No access token available. Please login first.');
        return;
      }

      // Test calendar API
      const response = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorDetails: any;
        try {
          errorDetails = JSON.parse(errorText);
        } catch {
          errorDetails = { raw: errorText };
        }

        setErrorMessage(
          `Calendar API request failed:\nStatus: ${response.status} ${response.statusText}\n${JSON.stringify(errorDetails, null, 2)}`
        );
        setCalendarResponse({ error: errorDetails, status: response.status, statusText: response.statusText });
        return;
      }

      const calendarData = await response.json();
      setCalendarResponse(calendarData);
      setStatusMessage('Calendar API test successful!');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      setErrorMessage(
        `Error testing Calendar API:\n${errorMessage}${errorStack ? `\n\nStack:\n${errorStack}` : ''}`
      );
      setCalendarResponse({ error: errorMessage, stack: errorStack });
    }
  };

  const handleTogglePrivacyScreen = async () => {
    if (selectedProvider !== 'google') {
      return;
    }

    setStatusMessage(null);
    setErrorMessage(null);

    try {
      if (privacyScreenEnabled) {
        await PrivacyScreen.disable();
        setPrivacyScreenEnabled(false);
        setStatusMessage('Privacy screen disabled');
      } else {
        await PrivacyScreen.enable({
          ios: {
            blurEffect: 'light',
          },
        });
        setPrivacyScreenEnabled(true);
        setStatusMessage('Privacy screen enabled (blurEffect: light)');
      }
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  };

  return (
    <div className="app">
      <div className="app-card">
        <header className="app-header">
          <div className="app-header-title">
            <h1>Capacitor Social Login</h1>
            <button
              type="button"
              className="firebase-button"
              onClick={() => navigate('/firebase')}
              aria-label="Open Firebase page"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 600 600" fill="none">
                <path fill="#FF9100" d="M213.918 560.499c23.248 9.357 48.469 14.909 74.952 15.834 35.84 1.252 69.922-6.158 100.391-20.234-36.537-14.355-69.627-35.348-97.869-61.448-18.306 29.31-45.382 52.462-77.474 65.848Z"/>
                <path fill="#FFC400" d="M291.389 494.66c-64.466-59.622-103.574-145.917-100.269-240.568.108-3.073.27-6.145.46-9.216a166.993 166.993 0 0 0-36.004-5.241 167.001 167.001 0 0 0-51.183 6.153c-17.21 30.145-27.594 64.733-28.888 101.781-3.339 95.611 54.522 179.154 138.409 212.939 32.093-13.387 59.168-36.51 77.475-65.848Z"/>
                <path fill="#FF9100" d="M291.39 494.657c14.988-23.986 24.075-52.106 25.133-82.403 2.783-79.695-50.792-148.251-124.942-167.381-.19 3.071-.352 6.143-.46 9.216-3.305 94.651 35.803 180.946 100.269 240.568Z"/>
                <path fill="#DD2C00" d="M308.231 20.858C266 54.691 232.652 99.302 212.475 150.693c-11.551 29.436-18.81 61.055-20.929 94.2 74.15 19.13 127.726 87.686 124.943 167.38-1.058 30.297-10.172 58.39-25.134 82.404 28.24 26.127 61.331 47.093 97.868 61.447 73.337-33.9 125.37-106.846 128.383-193.127 1.952-55.901-19.526-105.724-49.875-147.778-32.051-44.477-159.5-194.36-159.5-194.36Z"/>
              </svg>
            </button>
          </div>
          <p>Select a provider and try the initialize/login flow. Apple, Google, and Facebook are all available.</p>
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

        {isIOS && selectedProvider === 'google' && (
          <section className="config">
            <span className="section-title">iOS Mode</span>
            <div className="field field--toggle">
              <label>
                <input
                  type="checkbox"
                  checked={isIOSMode}
                  onChange={(event) => setIsIOSMode(event.target.checked)}
                />
                iOS-only mode (pass only iOSClientId)
              </label>
              <p className="hint">When enabled, only iOSClientId will be passed to initialize() instead of webClientId and other options.</p>
            </div>
          </section>
        )}

        <section className="config">
          <span className="section-title">
            {selectedProvider === 'apple' ? 'Apple' : selectedProvider === 'google' ? 'Google' : 'Facebook'} configuration
          </span>

          {selectedProvider === 'facebook' ? (
            <>
              <div className="field">
                <label htmlFor="facebookAppId">App ID</label>
                <input
                  id="facebookAppId"
                  type="text"
                  placeholder="1234567890123456"
                  value={facebookConfig.appId}
                  onChange={(event) => updateFacebookConfig('appId', event.target.value)}
                  autoComplete="off"
                />
                <p className="hint">Facebook App ID from Facebook Developer Console.</p>
              </div>

              <div className="field">
                <label htmlFor="facebookClientToken">Client Token</label>
                <input
                  id="facebookClientToken"
                  type="text"
                  placeholder="your-client-token"
                  value={facebookConfig.clientToken}
                  onChange={(event) => updateFacebookConfig('clientToken', event.target.value)}
                  autoComplete="off"
                />
                <p className="hint">Facebook Client Token from Facebook Developer Console.</p>
              </div>

              <div className="field">
                <label htmlFor="facebookPermissions">Permissions</label>
                <input
                  id="facebookPermissions"
                  type="text"
                  placeholder="email,public_profile"
                  value={facebookConfig.permissions}
                  onChange={(event) => updateFacebookConfig('permissions', event.target.value)}
                  autoComplete="off"
                />
                <p className="hint">Comma-separated permissions (e.g., email, public_profile).</p>
                {parsedFacebookPermissions.length > 0 ? (
                  <div className="scope-chips" aria-live="polite">
                    {parsedFacebookPermissions.map((permission) => (
                      <span key={permission} className="scope-chip">
                        {permission}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>

              {isIOS && (
                <>
                  <div className="field field--toggle">
                    <label>
                      <input
                        type="checkbox"
                        checked={facebookConfig.limitedLogin}
                        onChange={(event) => updateFacebookConfig('limitedLogin', event.target.checked)}
                      />
                      Limited Login (iOS only)
                    </label>
                    <p className="hint">Use limited login for Facebook iOS. Note: This is iOS-only and doesn't affect Android.</p>
                  </div>

                  <div className="field">
                    <label>App Tracking Transparency (iOS only)</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <button
                        type="button"
                        onClick={handleRequestTracking}
                        style={{
                          padding: '0.65rem 0.85rem',
                          borderRadius: '0.85rem',
                          border: 'none',
                          fontSize: '0.9rem',
                          fontWeight: 600,
                          background: 'var(--app-accent)',
                          color: '#ffffff',
                          cursor: 'pointer',
                          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.transform = 'translateY(-1px)';
                          e.currentTarget.style.boxShadow = '0 8px 16px rgba(59, 89, 182, 0.3)';
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      >
                        Request Tracking Permission
                      </button>
                      {trackingStatus && (
                        <div className={`status ${trackingStatus === 'authorized' ? 'status--success' : trackingStatus === 'denied' ? 'status--error' : ''}`} style={{ margin: 0 }}>
                          Status: <strong>{trackingStatus}</strong>
                        </div>
                      )}
                    </div>
                    <p className="hint">
                      Request App Tracking Transparency permission. This affects whether Facebook login returns access tokens (authorized) or JWT tokens (denied/notDetermined).
                    </p>
                  </div>
                </>
              )}
            </>
          ) : selectedProvider === 'apple' ? (
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
              <label htmlFor={isIOSMode ? "iOSClientId" : "webClientId"}>
                {isIOSMode ? "iOS Client ID" : "Web Client ID"}
              </label>
              <input
                id={isIOSMode ? "iOSClientId" : "webClientId"}
                type="text"
                placeholder="xxxxxx-xxxxxxxxxxxxxxxxxx.apps.googleusercontent.com"
                value={isIOSMode ? googleConfig.iOSClientId : googleConfig.webClientId}
                onChange={(event) => updateGoogleConfig(isIOSMode ? 'iOSClientId' : 'webClientId', event.target.value)}
                autoComplete="off"
              />
              <p className="hint">
                {isIOSMode 
                  ? "Provide the iOS client ID from Google Developers Console." 
                  : "Provide the web client ID from Google Developers Console."}
              </p>
            </div>
          )}

          {selectedProvider !== 'facebook' && !(selectedProvider === 'google' && isIOSMode) && (
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
          )}

          {selectedProvider !== 'facebook' && !(selectedProvider === 'google' && isIOSMode) && (
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
          )}

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
          ) : selectedProvider === 'google' ? (
            <>
              {!isIOSMode && (
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
              )}

              {!isIOSMode && (
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
              )}

              {!isIOSMode && (
                <div className="field field--toggle">
                  <label>
                    <input
                      type="checkbox"
                      checked={googleConfig.forceRefreshToken}
                      onChange={(event) => updateGoogleConfig('forceRefreshToken', event.target.checked)}
                    />
                    Force Refresh Token (Android only)
                  </label>
                  <p className="hint">Force refresh the access token even if cached tokens are available. This option is primarily used in offline mode to request a new server auth code.</p>
                </div>
              )}
            </>
          ) : null}
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
          {selectedProvider === 'facebook' && (
            <button type="button" onClick={handleGetAuthorizationCode} disabled={busyAction !== null}>
              {busyAction === 'getAuthorizationCode' ? 'getting code...' : 'getAuthorizationCode()'}
            </button>
          )}
          {selectedProvider === 'google' && (
            <>
              <button type="button" onClick={handleTogglePrivacyScreen} disabled={busyAction !== null}>
                {privacyScreenEnabled ? 'Disable Privacy Screen' : 'Enable Privacy Screen'}
              </button>
              <button type="button" onClick={handleAddCalendarScope} disabled={busyAction !== null}>
                Add Calendar Scope
              </button>
              <button type="button" onClick={handleTestCalendarAPI} disabled={busyAction !== null}>
                Test Calendar API
              </button>
            </>
          )}
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

        {calendarResponse ? (
          <section className="response">
            <h2>Calendar API Response</h2>
            <pre>{JSON.stringify(calendarResponse, null, 2)}</pre>
          </section>
        ) : null}
      </div>
    </div>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/firebase" element={<FirebasePage />} />
      <Route path="/firebase/create-account" element={<CreateAccountPage />} />
      <Route path="/firebase/dashboard" element={<DashboardPage />} />
    </Routes>
  );
}

export default App;
