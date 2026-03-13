/**
 * Example: Handling User Cancellations vs Errors
 * 
 * This example demonstrates how to use the new error codes to distinguish
 * between user cancellations and actual errors during social login.
 */

import { SocialLogin, SocialLoginErrorCode, isUserCancellation } from '@capgo/capacitor-social-login';

// Example 1: Simple user cancellation detection
async function loginWithCancellationHandling() {
  try {
    const result = await SocialLogin.login({
      provider: 'google',
      options: { scopes: ['email', 'profile'] }
    });
    
    console.log('Login successful:', result);
    // Store tokens, navigate to app, etc.
    
  } catch (error) {
    if (isUserCancellation(error)) {
      // User closed the login dialog - this is expected behavior
      console.log('User cancelled the login');
      // Don't show an error message - user chose not to log in
    } else {
      // This is an actual error
      console.error('Login failed:', error.message);
      alert(`Login failed: ${error.message}`);
    }
  }
}

// Example 2: Detailed error code handling
async function loginWithDetailedErrorHandling() {
  try {
    const result = await SocialLogin.login({
      provider: 'facebook',
      options: { permissions: ['email', 'public_profile'] }
    });
    
    console.log('Login successful:', result);
    
  } catch (error: any) {
    switch (error.code) {
      case SocialLoginErrorCode.USER_CANCELLED:
        // User closed the dialog - no action needed
        console.log('Login cancelled by user');
        break;
        
      case SocialLoginErrorCode.NOT_INITIALIZED:
        // Provider not initialized
        console.error('Provider not initialized. Call SocialLogin.initialize() first.');
        alert('Configuration error. Please contact support.');
        break;
        
      case SocialLoginErrorCode.NETWORK_ERROR:
        // Network issue
        console.error('Network error during login');
        alert('Network error. Please check your connection and try again.');
        break;
        
      case SocialLoginErrorCode.AUTHENTICATION_FAILED:
        // Auth failed
        console.error('Authentication failed');
        alert('Login failed. Please try again.');
        break;
        
      default:
        // Unknown error
        console.error('Unexpected error:', error);
        alert('An unexpected error occurred. Please try again.');
    }
  }
}

// Example 3: Retry logic with cancellation awareness
async function loginWithRetry(provider: 'google' | 'facebook', maxRetries = 3) {
  let attempts = 0;
  
  while (attempts < maxRetries) {
    try {
      const result = await SocialLogin.login({
        provider,
        options: provider === 'google' 
          ? { scopes: ['email', 'profile'] }
          : { permissions: ['email', 'public_profile'] }
      });
      
      console.log('Login successful:', result);
      return result;
      
    } catch (error) {
      attempts++;
      
      // Don't retry if user cancelled
      if (isUserCancellation(error)) {
        console.log('User cancelled login');
        throw error; // Re-throw to let caller know user cancelled
      }
      
      // Don't retry configuration errors
      if (error.code === SocialLoginErrorCode.NOT_INITIALIZED || 
          error.code === SocialLoginErrorCode.INVALID_CONFIGURATION) {
        console.error('Configuration error:', error.message);
        throw error;
      }
      
      // Retry network and auth errors
      if (attempts < maxRetries) {
        console.log(`Login attempt ${attempts} failed. Retrying...`);
        await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
      } else {
        console.error(`Login failed after ${maxRetries} attempts`);
        throw error;
      }
    }
  }
}

// Example 4: UI integration with loading states
class LoginUI {
  private isLoading = false;
  
  async handleGoogleLogin() {
    if (this.isLoading) return;
    
    this.showLoading();
    
    try {
      const result = await SocialLogin.login({
        provider: 'google',
        options: { scopes: ['email', 'profile'] }
      });
      
      this.hideLoading();
      this.onLoginSuccess(result);
      
    } catch (error) {
      this.hideLoading();
      
      if (isUserCancellation(error)) {
        // User cancelled - just hide loading, no error message
        return;
      }
      
      // Show error to user
      this.showError(error.message || 'Login failed. Please try again.');
    }
  }
  
  private showLoading() {
    this.isLoading = true;
    // Show loading spinner
  }
  
  private hideLoading() {
    this.isLoading = false;
    // Hide loading spinner
  }
  
  private onLoginSuccess(result: any) {
    // Navigate to app, store tokens, etc.
    console.log('Login successful:', result);
  }
  
  private showError(message: string) {
    // Show error message to user
    alert(message);
  }
}

// Export examples
export {
  loginWithCancellationHandling,
  loginWithDetailedErrorHandling,
  loginWithRetry,
  LoginUI
};
