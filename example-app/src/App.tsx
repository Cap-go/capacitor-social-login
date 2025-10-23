import { useMemo, useState, useEffect } from 'react';
import {
  SocialLogin,
  type AppleProviderOptions,
  type AppleProviderResponse,
  type GoogleLoginOptions,
  type GoogleLoginResponse,
} from '../../src';
import { Capacitor } from '@capacitor/core';
import './App.css';

// Import all Capgo plugins
// import { BackgroundGeolocation } from '@capgo/background-geolocation';
// import { CameraPreview } from '@capgo/camera-preview';
// import { CapgoAlarm } from '@capgo/capacitor-alarm';
// import { AndroidInlineInstall } from '@capgo/capacitor-android-inline-install';
// import { CapacitorUsageStatsManager } from '@capgo/capacitor-android-usagestatsmanager';
// import { CapacitorCrisp } from '@capgo/capacitor-crisp';
// import { CapgoCapacitorDataStorageSqlite } from '@capgo/capacitor-data-storage-sqlite';
// import { CapacitorDownloader } from '@capgo/capacitor-downloader';
// import { Env } from '@capgo/capacitor-env';
// import { InAppBrowser } from '@capgo/inappbrowser';
// import { CapacitorFlash } from '@capgo/capacitor-flash';
// import { IsRoot } from '@capgo/capacitor-is-root';
// import { JwPlayer } from '@capgo/capacitor-jw-player';
// import { LaunchNavigator } from '@capgo/capacitor-launch-navigator';
// import { CapgoLLM } from '@capgo/capacitor-llm';
// import { Mute } from '@capgo/capacitor-mute';
// import { MuxPlayer } from '@capgo/capacitor-mux-player';
// import { Health } from '@capgo/capacitor-health';
// import { NavigationBar } from '@capgo/capacitor-navigation-bar';
// import { CapacitorPersistentAccount } from '@capgo/capacitor-persistent-account';
// import { PhotoLibrary } from '@capgo/capacitor-photo-library';
// import { ScreenRecorder } from '@capgo/capacitor-screen-recorder';
// import { CapacitorShake } from '@capgo/capacitor-shake';
// import { StreamCall } from '@capgo/capacitor-stream-call';
// import { TextInteraction } from '@capgo/capacitor-textinteraction';
// import { CapacitorTwilioVoice } from '@capgo/capacitor-twilio-voice';
// import { CapacitorUpdater } from '@capgo/capacitor-updater';
// import { SocialLogin as CapgoSocialLogin } from '@capgo/capacitor-social-login';
// import { NativeAudio } from '@capgo/native-audio';
// import { NativeGeocoder } from '@capgo/nativegeocoder';
import { NativeMarket } from '@capgo/native-market';
// import { NativePurchases } from '@capgo/native-purchases';
// import { Ricoh360Camera } from '@capgo/ricoh360';

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
  iOSClientId: string;
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
  iOSClientId: '44885413573-57pq0pothq40hh2pulaot47r8e06df64.apps.googleusercontent.com',
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
  const [isIOSMode, setIsIOSMode] = useState<boolean>(false);
  const [pluginResults, setPluginResults] = useState<Array<{ name: string; success: boolean; response: any; error?: string }>>([]);
  const [isTestingPlugins, setIsTestingPlugins] = useState(false);

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
        if (isIOSMode) {
          initOptions.google = {
            iOSClientId: googleConfig.iOSClientId || undefined,
          };
        } else {
          initOptions.google = {
            webClientId: googleConfig.webClientId || undefined,
            redirectUrl: googleConfig.redirectUrl || undefined,
            mode: googleConfig.mode || undefined,
            hostedDomain: googleConfig.hostedDomain || undefined,
          };
        }
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

  const handleTestAllPlugins = async () => {
    setIsTestingPlugins(true);
    setPluginResults([]);
    
    const results: Array<{ name: string; success: boolean; response: any; error?: string }> = [];

    // Test Background Geolocation
    // try {
    //   const response = await BackgroundGeolocation.openSettings();
    //   results.push({ name: 'Background Geolocation', success: true, response });
    // } catch (error: any) {
    //   results.push({ name: 'Background Geolocation', success: false, response: null, error: error.message });
    // }

    // // Test Capacitor Alarm
    // try {
    //   const response = await CapgoAlarm.getOSInfo();
    //   results.push({ name: 'Capacitor Alarm', success: true, response });
    // } catch (error: any) {
    //   results.push({ name: 'Capacitor Alarm', success: false, response: null, error: error.message });
    // }

    // // Test Capacitor Env
    // try {
    //   const response = await Env.getKey({ key: 'test' });
    //   results.push({ name: 'Capacitor Env', success: true, response });
    // } catch (error: any) {
    //   results.push({ name: 'Capacitor Env', success: false, response: null, error: error.message });
    // }

    // // Test Capacitor Flash
    // try {
    //   const response = await CapacitorFlash.isAvailable();
    //   results.push({ name: 'Capacitor Flash', success: true, response });
    // } catch (error: any) {
    //   results.push({ name: 'Capacitor Flash', success: false, response: null, error: error.message });
    // }

    // // Test Capacitor Is Root
    // try {
    //   const response = await IsRoot.isRooted();
    //   results.push({ name: 'Capacitor Is Root', success: true, response });
    // } catch (error: any) {
    //   results.push({ name: 'Capacitor Is Root', success: false, response: null, error: error.message });
    // }

    // // Test Capacitor Mute
    // try {
    //   const response = await Mute.isMuted();
    //   results.push({ name: 'Capacitor Mute', success: true, response });
    // } catch (error: any) {
    //   results.push({ name: 'Capacitor Mute', success: false, response: null, error: error.message });
    // }

    // // Test Health
    // try {
    //   const response = await Health.isAvailable();
    //   results.push({ name: 'Health', success: true, response });
    // } catch (error: any) {
    //   results.push({ name: 'Health', success: false, response: null, error: error.message });
    // }

    // // Test Navigation Bar
    // try {
    //   const response = await NavigationBar.getNavigationBarColor();
    //   results.push({ name: 'Navigation Bar', success: true, response });
    // } catch (error: any) {
    //   results.push({ name: 'Navigation Bar', success: false, response: null, error: error.message });
    // }

    // // Test Persistent Account
    // try {
    //   const response = await CapacitorPersistentAccount.readAccount();
    //   results.push({ name: 'Persistent Account', success: true, response });
    // } catch (error: any) {
    //   results.push({ name: 'Persistent Account', success: false, response: null, error: error.message });
    // }

    // // Test Social Login
    // try {
    //   const response = await SocialLogin.isLoggedIn({ provider: 'google' });
    //   results.push({ name: 'Social Login', success: true, response });
    // } catch (error: any) {
    //   results.push({ name: 'Social Login', success: false, response: null, error: error.message });
    // }

    // // Test Capgo Social Login (from npm)
    // try {
    //   const response = await CapgoSocialLogin.isLoggedIn({ provider: 'google' });
    //   results.push({ name: 'Capgo Social Login', success: true, response });
    // } catch (error: any) {
    //   results.push({ name: 'Capgo Social Login', success: false, response: null, error: error.message });
    // }

    // // Test Capacitor Crisp
    // try {
    //   await CapacitorCrisp.openMessenger();
    //   results.push({ name: 'Capacitor Crisp', success: true, response: 'Messenger opened' });
    // } catch (error: any) {
    //   results.push({ name: 'Capacitor Crisp', success: false, response: null, error: error.message });
    // }

    // // Test InAppBrowser
    // try {
    //   await InAppBrowser.open({ url: 'https://capacitorjs.com' });
    //   results.push({ name: 'InAppBrowser', success: true, response: 'Browser opened' });
    // } catch (error: any) {
    //   results.push({ name: 'InAppBrowser', success: false, response: null, error: error.message });
    // }

    // // Test Native Market
    try {
      await NativeMarket.openStoreListing({ appId: 'com.hulu.plus' });
      results.push({ name: 'Native Market', success: true, response: 'Store opened' });
    } catch (error: any) {
      results.push({ name: 'Native Market', success: false, response: null, error: error.message });
    }

    // // Test Native Geocoder - using reverse geocode with sample coordinates
    // try {
    //   const response = await NativeGeocoder.reverseGeocode({
    //     latitude: 37.4219983,
    //     longitude: -122.084,
    //   });
    //   results.push({ name: 'Native Geocoder', success: true, response });
    // } catch (error: any) {
    //   results.push({ name: 'Native Geocoder', success: false, response: null, error: error.message });
    // }

    // // Test Photo Library
    // try {
    //   const response = await PhotoLibrary.checkAuthorization();
    //   results.push({ name: 'Photo Library', success: true, response });
    // } catch (error: any) {
    //   results.push({ name: 'Photo Library', success: false, response: null, error: error.message });
    // }

    // // Test Capacitor Data Storage Sqlite
    // try {
    //   const response = await CapgoCapacitorDataStorageSqlite.openStore({ database: 'test_db', table: 'test_table' });
    //   results.push({ name: 'Data Storage Sqlite', success: true, response });
    // } catch (error: any) {
    //   results.push({ name: 'Data Storage Sqlite', success: false, response: null, error: error.message });
    // }

    // // Test Capacitor Downloader
    // try {
    //   const response = await CapacitorDownloader.checkStatus('test');
    //   results.push({ name: 'Downloader', success: true, response });
    // } catch (error: any) {
    //   results.push({ name: 'Downloader', success: false, response: null, error: error.message });
    // }

    // // Test Capacitor Screen Recorder
    // try {
    //   await ScreenRecorder.stop();
    //   results.push({ name: 'Screen Recorder', success: true, response: 'Stop called' });
    // } catch (error: any) {
    //   results.push({ name: 'Screen Recorder', success: false, response: null, error: error.message });
    // }

    // // Test Capacitor Updater
    // try {
    //   const response = await CapacitorUpdater.getLatest();
    //   results.push({ name: 'Updater', success: true, response });
    // } catch (error: any) {
    //   results.push({ name: 'Updater', success: false, response: null, error: error.message });
    // }

    // // Test Uploader
    // // try {
    // //   const response = await Uploader.startUpload({ filePath: 'test', serverUrl: 'http://test', headers: {} });
    // //   results.push({ name: 'Uploader', success: true, response });
    // // } catch (error: any) {
    // //   results.push({ name: 'Uploader', success: false, response: null, error: error.message });
    // // }

    // // Test Native Audio
    // try {
    //   const response = await NativeAudio.preload({ assetId: 'test', assetPath: 'test.mp3' });
    //   results.push({ name: 'Native Audio', success: true, response });
    // } catch (error: any) {
    //   results.push({ name: 'Native Audio', success: false, response: null, error: error.message });
    // }

    // // Test Native Purchases
    // try {
    //   const response = await NativePurchases.getPurchases();
    //   results.push({ name: 'Native Purchases', success: true, response });
    // } catch (error: any) {
    //   results.push({ name: 'Native Purchases', success: false, response: null, error: error.message });
    // }

    // // Test Text Interaction
    // try {
    //   const response = await TextInteraction.toggle({ enabled: true });
    //   results.push({ name: 'Text Interaction', success: true, response });
    // } catch (error: any) {
    //   results.push({ name: 'Text Interaction', success: false, response: null, error: error.message });
    // }

    // // Test Camera Preview
    // try {
    //   const response = await CameraPreview.stop();
    //   results.push({ name: 'Camera Preview', success: true, response });
    // } catch (error: any) {
    //   results.push({ name: 'Camera Preview', success: false, response: null, error: error.message });
    // }

    // // Test Capacitor Shake - add listener
    // try {
    //   const listener = await CapacitorShake.addListener('shake', () => {});
    //   await listener.remove();
    //   results.push({ name: 'Shake', success: true, response: 'Listener added and removed' });
    // } catch (error: any) {
    //   results.push({ name: 'Shake', success: false, response: null, error: error.message });
    // }

    // // Test Capacitor Stream Call
    // try {
    //   const response = await StreamCall.getCallStatus();
    //   results.push({ name: 'Stream Call', success: true, response });
    // } catch (error: any) {
    //   results.push({ name: 'Stream Call', success: false, response: null, error: error.message });
    // }

    // // Test Ricoh360
    // try {
    //   const response = await Ricoh360Camera.listFiles();
    //   results.push({ name: 'Ricoh360', success: true, response });
    // } catch (error: any) {
    //   results.push({ name: 'Ricoh360', success: false, response: null, error: error.message });
    // }

    // // Test Android Inline Install
    // try {
    //   const response = await AndroidInlineInstall.startInlineInstall({ id: 'com.test.app' });
    //   results.push({ name: 'Android Inline Install', success: true, response });
    // } catch (error: any) {
    //   results.push({ name: 'Android Inline Install', success: false, response: null, error: error.message });
    // }

    // // Test Android Usage Stats Manager
    // try {
    //   const response = await CapacitorUsageStatsManager.isUsageStatsPermissionGranted();
    //   results.push({ name: 'Android Usage Stats', success: true, response });
    // } catch (error: any) {
    //   results.push({ name: 'Android Usage Stats', success: false, response: null, error: error.message });
    // }

    // // Test JW Player
    // try {
    //   const response = await JwPlayer.stop();
    //   results.push({ name: 'JW Player', success: true, response });
    // } catch (error: any) {
    //   results.push({ name: 'JW Player', success: false, response: null, error: error.message });
    // }

    // // Test Launch Navigator
    // try {
    //   const response = await LaunchNavigator.getAvailableApps();
    //   results.push({ name: 'Launch Navigator', success: true, response });
    // } catch (error: any) {
    //   results.push({ name: 'Launch Navigator', success: false, response: null, error: error.message });
    // }

    // // Test LLM
    // try {
    //   const response = await CapgoLLM.getReadiness();
    //   results.push({ name: 'LLM', success: true, response });
    // } catch (error: any) {
    //   results.push({ name: 'LLM', success: false, response: null, error: error.message });
    // }

    // // Test Mux Player
    // try {
    //   const response = await MuxPlayer.isActive();
    //   results.push({ name: 'Mux Player', success: true, response });
    // } catch (error: any) {
    //   results.push({ name: 'Mux Player', success: false, response: null, error: error.message });
    // }

    // Test Twilio Voice
    // try {
    //   const response = await CapacitorTwilioVoice.getCallStatus();
    //   results.push({ name: 'Twilio Voice', success: true, response });
    // } catch (error: any) {
    //   results.push({ name: 'Twilio Voice', success: false, response: null, error: error.message });
    // }

    setPluginResults(results);
    setIsTestingPlugins(false);
  };

  return (
    <div className="app">
      <div className="app-card">
        <header className="app-header">
          <h1>Capacitor Social Login</h1>
          <p>Select a provider and try the initialize/login flow. Apple and Google are available, Facebook is coming soon.</p>
        </header>

        {/* Giga Button Section */}
        <section className="giga-button-section">
          <h2>🧪 Test All Capgo Plugins</h2>
          <button 
            type="button" 
            onClick={handleTestAllPlugins} 
            disabled={isTestingPlugins}
            className="giga-button"
          >
            {isTestingPlugins ? 'Testing all plugins...' : '🚀 Test All Plugins (Giga Button)'}
          </button>
          
          {pluginResults.length > 0 && (
            <div className="plugin-results">
              <h3>Plugin Test Results:</h3>
              <div className="results-list">
                {pluginResults.map((result, index) => (
                  <div key={index} className={`result-item ${result.success ? 'success' : 'error'}`}>
                    <div className="result-header">
                      <span className="result-name">{result.name}</span>
                      <span className={`result-status ${result.success ? 'success' : 'error'}`}>
                        {result.success ? '✅' : '❌'}
                      </span>
                    </div>
                    {result.success ? (
                      <pre className="result-content">{JSON.stringify(result.response, null, 2)}</pre>
                    ) : (
                      <div className="result-error">{result.error}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

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

          {!(selectedProvider === 'google' && isIOSMode) && (
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

          {!(selectedProvider === 'google' && isIOSMode) && (
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
          ) : (
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
