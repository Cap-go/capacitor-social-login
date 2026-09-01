/**
 * COOP-safe OAuth popup communication bridge.
 *
 * When Cross-Origin-Opener-Policy severs window.opener, postMessage and popup.closed
 * checks fail. This module uses localStorage + storage events and BroadcastChannel
 * as reliable fallbacks that work across same-origin popup windows.
 */

export const OAUTH_STATE_KEY = 'social_login_oauth_pending';
export const OAUTH_POPUP_SESSION_KEY = 'social_login_oauth_popup';
export const OAUTH_RESULT_KEY_PREFIX = 'social_login_oauth_result_';
export const OAUTH_DELIVERED_KEY = 'social_login_oauth_delivered';

export const POPUP_WINDOW_NAMES = new Set([
  'OAuth2Login',
  'XLogin',
  'Google Sign In',
  'Authorization',
  'TelegramLogin',
]);

export type OAuthBridgeMessage = Record<string, unknown> & {
  type: 'oauth-response' | 'oauth-error';
};

export function getOAuthResultKey(nonce: string): string {
  return `${OAUTH_RESULT_KEY_PREFIX}${nonce}`;
}

export function getBroadcastChannelName(provider: string, nonceOrState: string): string {
  if (provider === 'oauth2') return `oauth2_${nonceOrState}`;
  if (provider === 'twitter') return `twitter_oauth_${nonceOrState}`;
  if (provider === 'telegram') return `telegram_oauth_${nonceOrState}`;
  return `google_oauth_${nonceOrState}`;
}

export function markOAuthPopup(nonce: string): void {
  try {
    sessionStorage.removeItem(OAUTH_DELIVERED_KEY);
    sessionStorage.setItem(OAUTH_POPUP_SESSION_KEY, nonce);
  } catch {
    // sessionStorage may be unavailable in some contexts
  }
}

export function clearOAuthPopupMarker(): void {
  try {
    sessionStorage.removeItem(OAUTH_POPUP_SESSION_KEY);
  } catch {
    // ignore
  }
}

export function hasOAuthRedirectParams(): boolean {
  const search = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  return (
    search.has('code') ||
    search.has('error') ||
    (search.has('hash') && search.has('auth_date')) ||
    hash.has('access_token') ||
    hash.has('id_token') ||
    hash.has('error')
  );
}

export function isOAuthPopupContext(): boolean {
  if (typeof window === 'undefined') return false;
  return !!window.opener || POPUP_WINDOW_NAMES.has(window.name) || !!sessionStorage.getItem(OAUTH_POPUP_SESSION_KEY);
}

export function shouldAutoFinishOAuthRedirect(): boolean {
  if (!localStorage.getItem(OAUTH_STATE_KEY)) return false;
  return isOAuthPopupContext() || hasOAuthRedirectParams();
}

/**
 * Deliver OAuth result from popup to opener via all available channels.
 */
export function deliverOAuthResult(
  provider: string,
  nonceOrState: string | undefined,
  message: OAuthBridgeMessage,
): void {
  // Prevent duplicate delivery when both eager handler and plugin constructor run
  try {
    if (sessionStorage.getItem(OAUTH_DELIVERED_KEY)) return;
    sessionStorage.setItem(OAUTH_DELIVERED_KEY, '1');
  } catch {
    // sessionStorage unavailable
  }

  // postMessage when opener reference is still available
  try {
    if (window.opener) {
      window.opener.postMessage(message, window.location.origin);
    }
  } catch {
    // COOP may block opener access
  }

  // BroadcastChannel works across same-origin windows without opener
  if (nonceOrState) {
    try {
      const channel = new BroadcastChannel(getBroadcastChannelName(provider, nonceOrState));
      channel.postMessage(message);
      channel.close();
    } catch {
      // BroadcastChannel not supported
    }
  }

  // localStorage + storage event is the most COOP-resilient fallback
  if (nonceOrState) {
    try {
      localStorage.setItem(getOAuthResultKey(nonceOrState), JSON.stringify({ ...message, _ts: Date.now() }));
    } catch {
      // localStorage may be full or unavailable
    }
  }
}

export interface OAuthResultListener {
  onResponse: (data: Record<string, unknown>) => void;
  onError: (error: string, code?: string) => void;
}

/**
 * Listen for OAuth results from popup via postMessage, BroadcastChannel, and localStorage.
 * Returns a cleanup function.
 */
export function listenForOAuthResult(
  provider: string,
  nonceOrState: string,
  handlers: OAuthResultListener,
): () => void {
  const resultKey = getOAuthResultKey(nonceOrState);
  const channelName = getBroadcastChannelName(provider, nonceOrState);

  let broadcastChannel: BroadcastChannel | null = null;
  try {
    broadcastChannel = new BroadcastChannel(channelName);
  } catch {
    // BroadcastChannel not supported
  }

  const processData = (data: Record<string, unknown>): boolean => {
    if (data?.source && String(data.source).startsWith('angular')) return false;

    if (data?.type === 'oauth-response') {
      handlers.onResponse(data);
      return true;
    }
    if (data?.type === 'oauth-error') {
      handlers.onError((data.error as string) || 'User cancelled the OAuth flow', data.code as string | undefined);
      return true;
    }
    return false;
  };

  const handleMessage = (event: MessageEvent) => {
    if (event.origin !== window.location.origin) return;
    processData(event.data);
  };

  const handleStorage = (event: StorageEvent) => {
    if (event.key !== resultKey || !event.newValue) return;
    try {
      const data = JSON.parse(event.newValue);
      localStorage.removeItem(resultKey);
      processData(data);
    } catch {
      // ignore parse errors
    }
  };

  const handleBroadcast = (event: MessageEvent) => {
    processData(event.data);
  };

  window.addEventListener('message', handleMessage);
  window.addEventListener('storage', handleStorage);
  if (broadcastChannel) {
    broadcastChannel.onmessage = handleBroadcast;
  }

  // Poll localStorage as fallback when storage event is missed (e.g. same-window writes)
  const pollInterval = window.setInterval(() => {
    try {
      const raw = localStorage.getItem(resultKey);
      if (!raw) return;
      localStorage.removeItem(resultKey);
      const data = JSON.parse(raw);
      processData(data);
    } catch {
      // ignore
    }
  }, 300);

  return () => {
    window.removeEventListener('message', handleMessage);
    window.removeEventListener('storage', handleStorage);
    clearInterval(pollInterval);
    if (broadcastChannel) {
      broadcastChannel.close();
    }
    try {
      localStorage.removeItem(resultKey);
    } catch {
      // ignore
    }
  };
}
