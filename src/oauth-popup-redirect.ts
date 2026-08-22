/**
 * Eager OAuth popup redirect handler.
 *
 * Capacitor lazily loads the web plugin implementation, so the popup window may
 * never instantiate SocialLoginWeb after Google redirects back. This module runs
 * immediately when the package is imported and finishes the OAuth redirect in popup
 * windows without waiting for plugin initialization.
 */
import type { LoginResult } from './definitions';
import { inferUserCancelledError } from './errors';
import { GoogleSocialLogin } from './google-provider';
import {
  clearOAuthPopupMarker,
  deliverOAuthResult,
  OAUTH_STATE_KEY,
  shouldAutoFinishOAuthRedirect,
  type OAuthBridgeMessage,
} from './oauth-popup-bridge';
import { OAuth2SocialLogin } from './oauth2-provider';
import { TwitterSocialLogin } from './twitter-provider';

async function parseRedirectResult(): Promise<{
  provider: string | null;
  state?: string;
  nonce?: string;
  result: LoginResult | { error: string } | null;
}> {
  const url = new URL(window.location.href);
  const stateRaw = localStorage.getItem(OAUTH_STATE_KEY);
  let provider: string | null = null;
  let state: string | undefined;
  let nonce: string | undefined;

  if (stateRaw) {
    try {
      const parsed = JSON.parse(stateRaw);
      provider = parsed.provider ?? null;
      state = parsed.state;
      nonce = parsed.nonce;
    } catch {
      provider = stateRaw === 'true' ? 'google' : null;
    }
  }

  const googleProvider = new GoogleSocialLogin();
  const oauth2Provider = new OAuth2SocialLogin();
  const twitterProvider = new TwitterSocialLogin();

  let result: LoginResult | { error: string } | null = null;

  switch (provider) {
    case 'twitter':
      result = await twitterProvider.handleOAuthRedirect(url, state);
      break;
    case 'oauth2':
      result = await oauth2Provider.handleOAuthRedirect(url, state);
      break;
    case 'google':
    default:
      result = googleProvider.handleOAuthRedirect(url);
      break;
  }

  return { provider, state, nonce, result };
}

function buildOAuthMessage(parsed: Awaited<ReturnType<typeof parseRedirectResult>>): OAuthBridgeMessage | null {
  const { result } = parsed;
  if (!result) return null;

  if ('error' in result) {
    const error = inferUserCancelledError(result.error);
    return {
      type: 'oauth-error',
      provider: parsed.provider,
      error: error.message,
      ...(error.code ? { code: error.code } : null),
    };
  }

  return {
    type: 'oauth-response',
    provider: result.provider,
    ...result.result,
  };
}

async function finishOAuthRedirectInPopup(): Promise<void> {
  const parsed = await parseRedirectResult();
  const nonceOrState = parsed.nonce ?? parsed.state;
  const message = buildOAuthMessage(parsed);

  if (!message) {
    // OAuth params may not be ready yet (SPA router). Retry briefly.
    if (shouldAutoFinishOAuthRedirect()) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      const retryParsed = await parseRedirectResult();
      const retryMessage = buildOAuthMessage(retryParsed);
      if (retryMessage) {
        deliverOAuthResult(retryParsed.provider ?? 'google', retryParsed.nonce ?? retryParsed.state, retryMessage);
      } else {
        deliverOAuthResult(parsed.provider ?? 'google', nonceOrState, {
          type: 'oauth-error',
          provider: parsed.provider,
          error: 'OAuth redirect did not contain expected parameters.',
        });
      }
    }
  } else {
    deliverOAuthResult(parsed.provider ?? 'google', nonceOrState, message);
  }

  clearOAuthPopupMarker();

  try {
    window.close();
  } catch {
    // Popup may not be allowed to close itself in some contexts
  }
}

function onHashChange(): void {
  if (!shouldAutoFinishOAuthRedirect()) return;
  void finishOAuthRedirectInPopup();
}

export function initOAuthPopupRedirectHandler(): void {
  if (typeof window === 'undefined') return;

  if (shouldAutoFinishOAuthRedirect()) {
    void finishOAuthRedirectInPopup();
  }

  // SPA routers may apply the OAuth hash after initial load
  window.addEventListener('hashchange', onHashChange);
}

// Auto-run on import so popup windows finish OAuth even before plugin lazy-load
initOAuthPopupRedirectHandler();
