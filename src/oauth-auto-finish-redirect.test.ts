import { afterEach, describe, expect, test } from 'bun:test';

import { OAUTH_STATE_KEY, shouldAutoFinishOAuthRedirect } from './oauth-popup-bridge';
import { OAuth2SocialLogin } from './oauth2-provider';

function createMemoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear() {
      map.clear();
    },
    getItem(key: string) {
      return map.has(key) ? map.get(key)! : null;
    },
    key(index: number) {
      return [...map.keys()][index] ?? null;
    },
    removeItem(key: string) {
      map.delete(key);
    },
    setItem(key: string, value: string) {
      map.set(key, String(value));
    },
  };
}

type LocationStub = {
  href: string;
  assign: (url: string) => void;
};

function installBrowserStubs(options?: { opener?: object | null }): {
  localStorage: Storage;
  sessionStorage: Storage;
  location: LocationStub;
} {
  const localStorage = createMemoryStorage();
  const sessionStorage = createMemoryStorage();
  const location: LocationStub = {
    href: 'http://localhost/',
    assign: () => {},
  };
  const win = {
    opener: options?.opener ?? null,
    name: '',
    location,
    screenX: 0,
    screenY: 0,
    outerWidth: 1000,
    outerHeight: 800,
    open: () => null,
    addEventListener: () => {},
    removeEventListener: () => {},
    localStorage,
    sessionStorage,
  };
  (win as { window?: typeof win }).window = win;
  Object.assign(globalThis, { window: win, localStorage, sessionStorage });
  return { localStorage, sessionStorage, location };
}

function uninstallBrowserStubs(): void {
  delete (globalThis as { window?: unknown }).window;
  delete (globalThis as { localStorage?: unknown }).localStorage;
  delete (globalThis as { sessionStorage?: unknown }).sessionStorage;
}

function pendingState(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    provider: 'oauth2',
    providerId: 'azure',
    state: 's',
    ...overrides,
  });
}

describe('shouldAutoFinishOAuthRedirect', () => {
  afterEach(() => {
    uninstallBrowserStubs();
  });

  test('returns false for redirect flow when window.opener is set', () => {
    const { localStorage } = installBrowserStubs({ opener: {} });
    localStorage.setItem(OAUTH_STATE_KEY, pendingState({ flow: 'redirect' }));
    expect(shouldAutoFinishOAuthRedirect()).toBe(false);
  });

  test('returns true for popup flow when window.opener is set', () => {
    const { localStorage } = installBrowserStubs({ opener: {} });
    localStorage.setItem(OAUTH_STATE_KEY, pendingState({ flow: 'popup' }));
    expect(shouldAutoFinishOAuthRedirect()).toBe(true);
  });

  test('returns true for legacy pending state without flow when window.opener is set', () => {
    const { localStorage } = installBrowserStubs({ opener: {} });
    localStorage.setItem(OAUTH_STATE_KEY, pendingState());
    expect(shouldAutoFinishOAuthRedirect()).toBe(true);
  });

  test('returns false when there is no pending state', () => {
    installBrowserStubs({ opener: {} });
    expect(shouldAutoFinishOAuthRedirect()).toBe(false);
  });
});

describe('OAuth2SocialLogin pending flow marker', () => {
  afterEach(() => {
    uninstallBrowserStubs();
  });

  async function readyProvider(): Promise<{
    oauth: OAuth2SocialLogin;
    localStorage: Storage;
    location: LocationStub;
  }> {
    const stubs = installBrowserStubs();
    const oauth = new OAuth2SocialLogin();
    await oauth.initializeProviders({
      azure: {
        appId: 'client',
        authorizationBaseUrl: 'https://example.com/authorize',
        accessTokenEndpoint: 'https://example.com/token',
        redirectUrl: 'https://app.example.com/callback',
        pkceEnabled: false,
      },
    });
    return { oauth, localStorage: stubs.localStorage, location: stubs.location };
  }

  test('writes flow redirect into the pending state', async () => {
    const { oauth, localStorage, location } = await readyProvider();
    let storedAtNavigation: string | null = null;
    const assigned = new Promise<void>((resolve) => {
      location.assign = () => {
        storedAtNavigation = localStorage.getItem(OAUTH_STATE_KEY);
        resolve();
      };
    });
    const loginPromise = oauth.login({ providerId: 'azure', state: 'redir-state', flow: 'redirect' });
    await Promise.race([
      assigned,
      loginPromise.then(
        () => {
          throw new Error('login resolved before navigation');
        },
        (err: unknown) => {
          throw err;
        },
      ),
    ]);
    expect(JSON.parse(storedAtNavigation as string)).toEqual({
      provider: 'oauth2',
      providerId: 'azure',
      state: 'redir-state',
      flow: 'redirect',
    });
  });

  test('writes flow popup by default into the pending state', async () => {
    const { oauth, localStorage } = await readyProvider();
    await expect(oauth.login({ providerId: 'azure', state: 'popup-state' })).rejects.toThrow(
      'Unable to open login window. Please allow popups.',
    );
    expect(JSON.parse(localStorage.getItem(OAUTH_STATE_KEY) as string)).toEqual({
      provider: 'oauth2',
      providerId: 'azure',
      state: 'popup-state',
      flow: 'popup',
    });
  });
});
