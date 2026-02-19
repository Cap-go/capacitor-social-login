import { SocialLoginError, SocialLoginErrorCode } from './definitions';

// Re-export for convenience
export { SocialLoginErrorCode };

/**
 * Create a standardized Social Login error
 */
export function createSocialLoginError(
  code: SocialLoginErrorCode,
  message: string,
  originalError?: any,
): Error {
  const error = new Error(message) as Error & { code: SocialLoginErrorCode; originalError?: any };
  error.code = code;
  if (originalError) {
    error.originalError = originalError;
  }
  return error;
}

/**
 * Check if an error is a user cancellation
 */
export function isUserCancellation(error: any): boolean {
  return error?.code === SocialLoginErrorCode.USER_CANCELLED;
}

/**
 * Extract error information from various error formats
 */
export function extractErrorInfo(error: any): SocialLoginError {
  if (error?.code && Object.values(SocialLoginErrorCode).includes(error.code)) {
    return {
      code: error.code,
      message: error.message || String(error),
      originalError: error.originalError,
    };
  }
  
  return {
    code: SocialLoginErrorCode.UNKNOWN,
    message: error?.message || String(error),
    originalError: error,
  };
}
