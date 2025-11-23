import { GoogleAuthProvider, signInWithCredential, signInWithPopup } from 'firebase/auth';
import { SocialLogin, type GoogleLoginOptions, type GoogleLoginResponseOnline } from '../../src';
import { Capacitor } from '@capacitor/core';
import { auth } from './firebase';

/**
 * Authenticate with Google using Capacitor Social Login plugin
 * and then sign in to Firebase Auth
 */
export const authenticateWithGoogle = async (): Promise<{ success: boolean; error?: string; user?: any }> => {
  try {
    const platform = Capacitor.getPlatform();
    
    // For web, use Firebase's built-in Google Sign-In
    if (platform === 'web') {
      const provider = new GoogleAuthProvider();
      provider.addScope('email');
      provider.addScope('profile');
      
      const userCredential = await signInWithPopup(auth, provider);
      return {
        success: true,
        user: userCredential.user,
      };
    }
    
    // For Android/iOS, use Capacitor Social Login plugin
    // Step 1: Initialize the Capacitor Social Login plugin
    const isIOS = platform === 'ios';
    await SocialLogin.initialize({
      google: {
        webClientId: '206085278104-407onla0fd8o48lalc5nu6ecagbd0fg4.apps.googleusercontent.com', // Android/web client ID
        ...(isIOS && {
          iOSClientId: '206085278104-qh1i4e2vp949mjihpk2gju73qp4dhksk.apps.googleusercontent.com', // iOS client ID
          iOSServerClientId: '206085278104-407onla0fd8o48lalc5nu6ecagbd0fg4.apps.googleusercontent.com', // Required for Firebase Auth token verification
        }),
        mode: 'online', // Use online mode to get idToken
      },
    });

    // Step 2: Login with Google via Capacitor plugin
    const response = await SocialLogin.login({
      provider: 'google',
      options: {
        scopes: ['email', 'profile'],
      } as GoogleLoginOptions,
    });

    // Step 3: Extract idToken from response
    if (response.result.responseType === 'online') {
      const googleResponse = response.result as GoogleLoginResponseOnline;
      
      if (!googleResponse.idToken) {
        return {
          success: false,
          error: 'Failed to get Google ID token',
        };
      }

      // Step 4: Decode and verify idToken (for debugging)
      let tokenAudience: string | null = null;
      try {
        const tokenParts = googleResponse.idToken.split('.');
        if (tokenParts.length === 3) {
          const payload = JSON.parse(atob(tokenParts[1]));
          tokenAudience = payload.aud;
          console.log('idToken payload:', {
            aud: payload.aud,
            iss: payload.iss,
            email: payload.email,
            exp: new Date(payload.exp * 1000).toISOString(),
          });
          
          // Check if token audience matches expected Firebase client ID
          const expectedAudience = '206085278104-407onla0fd8o48lalc5nu6ecagbd0fg4.apps.googleusercontent.com';
          if (payload.aud !== expectedAudience) {
            console.warn(`Token audience mismatch! Expected: ${expectedAudience}, Got: ${payload.aud}`);
            console.warn('This might cause Firebase sign-in to hang. The token should be issued for the web client ID.');
          }
        }
      } catch (e) {
        console.warn('Could not decode idToken:', e);
      }

      // Step 5: Create Firebase credential from Google idToken
      console.log('Creating Firebase credential with idToken:', googleResponse.idToken?.substring(0, 50) + '...');
      const credential = GoogleAuthProvider.credential(googleResponse.idToken);
      console.log('Credential created, signing in to Firebase...');
      console.log('Auth current user before sign-in:', auth.currentUser?.email || 'null');
      console.log('Firebase app name:', auth.app.name);
      console.log('Firebase project ID:', auth.app.options.projectId);

      // Step 6: Sign in to Firebase with the credential
      try {
        console.log('Calling signInWithCredential...');
        
        // Use a more aggressive timeout and better error handling
        const signInPromise = signInWithCredential(auth, credential);
        
        // Add timeout with detailed error
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => {
            console.error('Firebase sign-in timeout!');
            console.error('Token audience was:', tokenAudience);
            console.error('Expected audience:', '206085278104-407onla0fd8o48lalc5nu6ecagbd0fg4.apps.googleusercontent.com');
            reject(new Error('Firebase sign-in timeout after 30 seconds. Check token audience matches Firebase web client ID.'));
          }, 30000)
        );

        const userCredential = await Promise.race([signInPromise, timeoutPromise]) as any;
        console.log('Firebase sign-in successful:', userCredential.user?.email);
        console.log('Auth current user after sign-in:', auth.currentUser?.email);
        
        return {
          success: true,
          user: userCredential.user,
        };
      } catch (firebaseError: any) {
        console.error('Firebase signInWithCredential error:', firebaseError);
        console.error('Error code:', firebaseError.code);
        console.error('Error message:', firebaseError.message);
        console.error('Error stack:', firebaseError.stack);
        throw firebaseError;
      }
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
 * Authenticate with Apple (placeholder for future implementation)
 */
export const authenticateWithApple = async (): Promise<{ success: boolean; error?: string; user?: any }> => {
  return {
    success: false,
    error: 'Apple authentication not yet implemented',
  };
};

/**
 * Authenticate with Facebook (placeholder for future implementation)
 */
export const authenticateWithFacebook = async (): Promise<{ success: boolean; error?: string; user?: any }> => {
  return {
    success: false,
    error: 'Facebook authentication not yet implemented',
  };
};

/**
 * Authenticate with Twitter (placeholder for future implementation)
 */
export const authenticateWithTwitter = async (): Promise<{ success: boolean; error?: string; user?: any }> => {
  return {
    success: false,
    error: 'Twitter authentication not yet implemented',
  };
};

