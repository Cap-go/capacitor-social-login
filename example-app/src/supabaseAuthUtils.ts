import { SocialLogin, type GoogleLoginOptions, type GoogleLoginResponseOnline } from '../../src';
import { Capacitor } from '@capacitor/core';
import { supabase } from './supabase';

/**
 * Generate a URL-safe nonce
 */
function getUrlSafeNonce(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Hash a string using SHA-256 and return hex-encoded result
 */
async function sha256Hash(message: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate nonce pair: rawNonce (for Supabase) and nonceDigest (for Google Sign-In)
 * 
 * Flow:
 * 1. Generate rawNonce (URL-safe random string)
 * 2. Hash it with SHA-256 to get nonceDigest
 * 3. Pass nonceDigest to Google Sign-In (Google includes hash in ID token)
 * 4. Pass rawNonce to Supabase (Supabase hashes it and compares with token)
 */
async function getNonce(): Promise<{ rawNonce: string; nonceDigest: string }> {
  // `rawNonce` goes to Supabase's signInWithIdToken()
  // Supabase makes a hash of `rawNonce` and compares it with the `nonceDigest`
  // which is included in the ID token from Google Sign-In
  const rawNonce = getUrlSafeNonce();
  
  // `nonceDigest` (SHA-256 hash, hex-encoded) goes to the `nonce` parameter in Google Sign-In APIs
  const nonceDigest = await sha256Hash(rawNonce);
  
  return { rawNonce, nonceDigest };
}

/**
 * Decode JWT token to extract payload
 */
function decodeJWT(token: string): any {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Error decoding JWT:', error);
    return null;
  }
}

/**
 * Valid Google Client IDs
 */
const VALID_GOOGLE_CLIENT_IDS = [
  '44885413573-57pq0pothq40hh2pulaot47r8e06df64.apps.googleusercontent.com', // iOS client ID
  '44885413573-qt5hdl4vug0g3bh4p1fl80urn09ahasd.apps.googleusercontent.com', // Web client ID
];

/**
 * Sanity check for JWT token
 * Verifies:
 * 1. Audience (aud) matches one of the valid Google Client IDs
 * 2. Nonce matches the expected nonceDigest
 */
function validateJWTToken(idToken: string, expectedNonceDigest: string): { valid: boolean; error?: string } {
  const decodedToken = decodeJWT(idToken);
  
  if (!decodedToken) {
    return { valid: false, error: 'Failed to decode JWT token' };
  }

  // Check audience
  const audience = decodedToken.aud;
  if (!audience || !VALID_GOOGLE_CLIENT_IDS.includes(audience)) {
    return {
      valid: false,
      error: `Invalid audience. Expected one of ${VALID_GOOGLE_CLIENT_IDS.join(' or ')}, got ${audience}`,
    };
  }

  // Check nonce
  const tokenNonce = decodedToken.nonce;
  if (tokenNonce && tokenNonce !== expectedNonceDigest) {
    return {
      valid: false,
      error: `Nonce mismatch. Expected ${expectedNonceDigest}, got ${tokenNonce}`,
    };
  }

  return { valid: true };
}

/**
 * Authenticate with Google using Capacitor Social Login plugin
 * and then sign in to Supabase Auth
 * 
 * @param retry - If false and sanity check fails, will logout and retry once. If true and sanity check fails, will reject immediately.
 */
export const authenticateWithGoogleSupabase = async (retry: boolean = false): Promise<{ success: boolean; error?: string; user?: any }> => {
  try {
    const platform = Capacitor.getPlatform();
    
    // For web, we'll need to handle it differently or use the plugin
    // For now, let's use the plugin for all platforms for consistency
    const isIOS = platform === 'ios';
    
    // Generate nonce pair: rawNonce (for Supabase) and nonceDigest (for Google Sign-In)
    const { rawNonce, nonceDigest } = await getNonce();
    
    // Initialize the Capacitor Social Login plugin
    await SocialLogin.initialize({
      google: {
        webClientId: '44885413573-qt5hdl4vug0g3bh4p1fl80urn09ahasd.apps.googleusercontent.com', // General web client ID
        ...(isIOS && {
          iOSClientId: '44885413573-57pq0pothq40hh2pulaot47r8e06df64.apps.googleusercontent.com', // iOS client ID
        }),
        mode: 'online', // Use online mode to get idToken
      },
    });

    // Login with Google via Capacitor plugin, passing the hashed nonce (nonceDigest)
    const response = await SocialLogin.login({
      provider: 'google',
      options: {
        scopes: ['email', 'profile'],
        nonce: nonceDigest, // Pass the SHA-256 hashed nonce to Google Sign-In
      } as GoogleLoginOptions,
    });

    // Extract idToken from response
    if (response.result.responseType === 'online') {
      const googleResponse = response.result as GoogleLoginResponseOnline;
      
      if (!googleResponse.idToken) {
        return {
          success: false,
          error: 'Failed to get Google ID token',
        };
      }

      // Sanity check: Validate audience and nonce
      const validation = validateJWTToken(googleResponse.idToken, nonceDigest);
      
      if (!validation.valid) {
        console.warn('JWT validation failed:', validation.error);
        
        // If this is not a retry attempt, logout and retry once
        if (!retry) {
          console.log('Logging out from Google and retrying...');
          try {
            await SocialLogin.logout({ provider: 'google' });
          } catch (logoutError) {
            console.error('Error during logout:', logoutError);
          }
          
          // Retry authentication
          return authenticateWithGoogleSupabase(true);
        } else {
          // If this is already a retry, reject immediately
          return {
            success: false,
            error: validation.error || 'JWT validation failed',
          };
        }
      }

      // Decode the ID token to check if it contains a nonce claim
      const decodedToken = decodeJWT(googleResponse.idToken);
      
      // Prepare sign-in options for Supabase
      const signInOptions: { provider: 'google'; token: string; nonce?: string } = {
        provider: 'google',
        token: googleResponse.idToken,
      };

      // If the ID token contains a nonce claim, pass the raw (unhashed) nonce to Supabase
      // Supabase will hash rawNonce and compare it to the nonceDigest in the token
      // Flow: Generate rawNonce → Hash to get nonceDigest → Pass nonceDigest to Google → 
      //       Google includes nonceDigest in token → Pass rawNonce to Supabase → 
      //       Supabase hashes rawNonce → Supabase compares hashes
      if (decodedToken?.nonce) {
        signInOptions.nonce = rawNonce; // Pass the raw (unhashed) nonce to Supabase
      }

      // Sign in to Supabase with the Google ID token
      const { data, error } = await supabase.auth.signInWithIdToken(signInOptions);

      if (error) {
        throw error;
      }

      return {
        success: true,
        user: data.user,
      };
    } else {
      return {
        success: false,
        error: 'Offline mode not supported. Please use online mode.',
      };
    }
  } catch (error: any) {
    console.error('Google authentication error:', error);
    return {
      success: false,
      error: error.message || 'Google authentication failed',
    };
  }
};

/**
 * Authenticate with Apple using Capacitor Social Login plugin
 * and then sign in to Supabase Auth
 */
export const authenticateWithAppleSupabase = async (): Promise<{ success: boolean; error?: string; user?: any }> => {
  return {
    success: false,
    error: 'Apple authentication not yet implemented',
  };
};

/**
 * Authenticate with Facebook using Capacitor Social Login plugin
 * and then sign in to Supabase Auth
 */
export const authenticateWithFacebookSupabase = async (): Promise<{ success: boolean; error?: string; user?: any }> => {
  return {
    success: false,
    error: 'Facebook authentication not yet implemented',
  };
};

/**
 * Authenticate with Twitter using Capacitor Social Login plugin
 * and then sign in to Supabase Auth
 */
export const authenticateWithTwitterSupabase = async (): Promise<{ success: boolean; error?: string; user?: any }> => {
  return {
    success: false,
    error: 'Twitter authentication not yet implemented',
  };
};

