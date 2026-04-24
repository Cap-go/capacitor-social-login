import type { SocialLoginError, SocialLoginErrorCode } from './definitions';

export const USER_CANCELLED_CODE: SocialLoginErrorCode = 'USER_CANCELLED';

const CANCELLED_PATTERNS = [
  'access_denied',
  'access denied',
  'user_cancelled_authorize',
  'user_cancelled',
  'user cancelled',
  'user canceled',
  'login cancelled',
  'login canceled',
  'popup closed',
  'window was closed',
];

export function createUserCancelledError(message: string): SocialLoginError {
  const error = new Error(message) as SocialLoginError;
  error.code = USER_CANCELLED_CODE;
  return error;
}

/**
 * Detects cancellation-like messages and marks them with USER_CANCELLED.
 * Falls back to a regular Error when the message doesn't look like a user cancellation.
 */
export function inferUserCancelledError(message: string): SocialLoginError {
  const normalized = message.toLowerCase();
  if (CANCELLED_PATTERNS.some((pattern) => normalized.includes(pattern))) {
    return createUserCancelledError(message);
  }
  return new Error(message);
}
