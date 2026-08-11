import { BaseSocialLogin } from './base';
import type {
  LoginResult,
  ProviderResponseMap,
  TelegramLoginOptions,
  TelegramLoginResponse,
  TelegramProfile,
} from './definitions';

interface TelegramPendingLogin {
  redirectUri: string;
  requestAccess: 'read' | 'write';
}

interface TelegramStoredSession extends TelegramLoginResponse {
  expiresAt: number;
}

export class TelegramSocialLogin extends BaseSocialLogin {
  private botId: string | null = null;
  private redirectUrl: string | null = null;
  private origin: string | null = null;
  private requestAccess: 'read' | 'write' = 'write';
  private languageCode: string | null = null;
  private readonly TOKENS_KEY = 'capgo_social_login_telegram_session_v1';
  private readonly STATE_PREFIX = 'capgo_social_login_telegram_state_';
  private readonly SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24h session window based on Telegram auth_date

  initialize(
    botId: string,
    requestAccess?: 'read' | 'write',
    redirectUrl?: string | null,
    origin?: string | null,
    languageCode?: string | null,
  ): void {
    this.botId = botId;
    this.requestAccess = requestAccess ?? 'write';
    this.redirectUrl = redirectUrl ?? null;
    this.origin = origin ?? null;
    this.languageCode = languageCode ?? null;
  }

  async login<T extends 'telegram'>(
    options: TelegramLoginOptions,
  ): Promise<{ provider: T; result: ProviderResponseMap[T] }> {
    if (!this.botId) {
      throw new Error('Telegram botId is not configured. Call initialize() first.');
    }

    const redirectUri = options.redirectUrl ?? this.redirectUrl ?? window.location.origin + window.location.pathname;
    const state = options.state ?? this.generateState();
    const requestAccess = options.requestAccess ?? this.requestAccess;
    const origin = this.origin ?? this.getOriginFromRedirect(redirectUri);
    const returnTo = this.appendStateToRedirect(redirectUri, state);

    this.persistPendingLogin(state, {
      redirectUri,
      requestAccess,
    });

    localStorage.setItem(BaseSocialLogin.OAUTH_STATE_KEY, JSON.stringify({ provider: 'telegram', state }));

    const authUrl = this.buildAuthUrl(origin, requestAccess, returnTo);
    const popup = this.openPopup(authUrl);

    return new Promise((resolve, reject) => {
      if (!popup) {
        reject(new Error('Unable to open login window. Please allow popups.'));
        return;
      }

      const channelName = `telegram_oauth_${state}`;
      let broadcastChannel: BroadcastChannel | null = null;
      try {
        broadcastChannel = new BroadcastChannel(channelName);
      } catch {
        // BroadcastChannel might be unavailable; postMessage fallback handles same-origin cases
      }

      const cleanup = (
        messageHandler: (event: MessageEvent) => void,
        timeoutHandle: number,
        intervalHandle: number,
      ) => {
        window.removeEventListener('message', messageHandler);
        clearTimeout(timeoutHandle);
        clearInterval(intervalHandle);
        if (broadcastChannel) {
          broadcastChannel.close();
        }
      };

      const handleOAuthMessage = (data: Record<string, unknown>) => {
        if (data?.type === 'oauth-response') {
          if (data?.provider && data.provider !== 'telegram') {
            return false;
          }
          cleanup(messageHandler, timeoutHandle, popupClosedInterval);
          const {
            provider: _ignoredProvider,
            type: _ignoredType,
            ...payload
          } = data as unknown as TelegramLoginResponse & { provider?: string; type?: string };
          resolve({
            provider: 'telegram' as T,
            result: payload as ProviderResponseMap[T],
          } as { provider: T; result: ProviderResponseMap[T] });
          return true;
        } else if (data?.type === 'oauth-error') {
          if (data?.provider && data.provider !== 'telegram') {
            return false;
          }
          cleanup(messageHandler, timeoutHandle, popupClosedInterval);
          reject(new Error((data.error as string) || 'Telegram login was cancelled.'));
          return true;
        }
        return false;
      };

      if (broadcastChannel) {
        broadcastChannel.onmessage = (event: MessageEvent) => {
          handleOAuthMessage(event.data);
        };
      }

      const messageHandler = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) {
          return;
        }
        handleOAuthMessage(event.data);
      };

      window.addEventListener('message', messageHandler);

      const timeoutHandle = window.setTimeout(() => {
        cleanup(messageHandler, timeoutHandle, popupClosedInterval);
        try {
          popup.close();
        } catch {
          // ignore if already closed
        }
        reject(new Error('Telegram login timed out.'));
      }, 300000); // 5 minutes

      const popupClosedInterval = window.setInterval(() => {
        try {
          if (popup.closed) {
            cleanup(messageHandler, timeoutHandle, popupClosedInterval);
            reject(new Error('Telegram login window was closed.'));
          }
        } catch {
          clearInterval(popupClosedInterval);
        }
      }, 1000);
    });
  }

  async logout(): Promise<void> {
    localStorage.removeItem(this.TOKENS_KEY);
  }

  async isLoggedIn(): Promise<{ isLoggedIn: boolean }> {
    const session = this.getStoredSession();
    if (!session) {
      return { isLoggedIn: false };
    }
    const isValid = session.expiresAt > Date.now();
    if (!isValid) {
      localStorage.removeItem(this.TOKENS_KEY);
    }
    return { isLoggedIn: isValid };
  }

  async getAuthorizationCode(): Promise<never> {
    throw new Error('getAuthorizationCode is not available for Telegram.');
  }

  async refresh(): Promise<void> {
    throw new Error('Telegram refresh is not supported. Call login() again.');
  }

  async handleOAuthRedirect(url: URL, expectedState?: string): Promise<LoginResult | { error: string } | null> {
    const params = url.searchParams;
    const stateFromUrl = params.get('state');
    const resolvedState = expectedState ?? stateFromUrl ?? undefined;
    if (!resolvedState) {
      return null;
    }

    const pending = this.consumePendingLogin(resolvedState);
    if (!pending) {
      localStorage.removeItem(BaseSocialLogin.OAUTH_STATE_KEY);
      return { error: 'Telegram login session expired or state mismatch.' };
    }

    const error = params.get('error');
    if (error) {
      localStorage.removeItem(BaseSocialLogin.OAUTH_STATE_KEY);
      return { error: params.get('error_description') || error };
    }

    const id = params.get('id');
    const authDateRaw = params.get('auth_date');
    const hash = params.get('hash');

    if (!id || !authDateRaw || !hash) {
      localStorage.removeItem(BaseSocialLogin.OAUTH_STATE_KEY);
      return { error: 'Telegram login payload is incomplete.' };
    }

    const profile: TelegramProfile = {
      id,
      firstName: params.get('first_name') ?? '',
      lastName: params.get('last_name'),
      username: params.get('username'),
      photoUrl: params.get('photo_url'),
    };

    const authDate = Number.parseInt(authDateRaw, 10);
    const result: TelegramLoginResponse = {
      profile,
      authDate: Number.isFinite(authDate) ? authDate : Math.floor(Date.now() / 1000),
      hash,
      requestAccess: pending.requestAccess,
    };

    this.persistSession({
      ...result,
      expiresAt: (Number.isFinite(authDate) ? authDate * 1000 : Date.now()) + this.SESSION_TTL_MS,
    });

    localStorage.removeItem(BaseSocialLogin.OAUTH_STATE_KEY);
    return {
      provider: 'telegram',
      result,
    };
  }

  private buildAuthUrl(origin: string, requestAccess: 'read' | 'write', returnTo: string): string {
    const params = new URLSearchParams({
      bot_id: this.botId ?? '',
      origin,
      request_access: requestAccess,
      return_to: returnTo,
      embed: '1',
      mobile: '1',
    });

    if (this.languageCode) {
      params.set('lang', this.languageCode);
    }

    return `https://oauth.telegram.org/auth?${params.toString()}`;
  }

  private openPopup(authUrl: string) {
    const width = 500;
    const height = 650;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    return window.open(authUrl, 'TelegramLogin', `width=${width},height=${height},left=${left},top=${top},popup=1`);
  }

  private appendStateToRedirect(redirectUri: string, state: string): string {
    try {
      const redirect = new URL(redirectUri);
      if (!redirect.searchParams.has('state')) {
        redirect.searchParams.set('state', state);
      }
      return redirect.toString();
    } catch {
      return redirectUri;
    }
  }

  private getOriginFromRedirect(redirectUri: string): string {
    try {
      return new URL(redirectUri).origin;
    } catch {
      return window.location.origin;
    }
  }

  private persistSession(session: TelegramStoredSession): void {
    localStorage.setItem(this.TOKENS_KEY, JSON.stringify(session));
  }

  private getStoredSession(): TelegramStoredSession | null {
    const raw = localStorage.getItem(this.TOKENS_KEY);
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw) as TelegramStoredSession;
    } catch (err) {
      console.warn('Failed to parse stored Telegram session', err);
      return null;
    }
  }

  private persistPendingLogin(state: string, payload: TelegramPendingLogin): void {
    localStorage.setItem(`${this.STATE_PREFIX}${state}`, JSON.stringify(payload));
  }

  private consumePendingLogin(state: string): TelegramPendingLogin | null {
    const key = `${this.STATE_PREFIX}${state}`;
    const raw = localStorage.getItem(key);
    localStorage.removeItem(key);
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw) as TelegramPendingLogin;
    } catch (err) {
      console.warn('Failed to parse pending Telegram login payload', err);
      return null;
    }
  }

  private generateState(): string {
    return [...crypto.getRandomValues(new Uint8Array(16))].map((b) => b.toString(16).padStart(2, '0')).join('');
  }
}
