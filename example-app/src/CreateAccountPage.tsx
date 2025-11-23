import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from './firebase';
import { authenticateWithGoogle, authenticateWithApple, authenticateWithFacebook, authenticateWithTwitter } from './authUtils';
import './App.css';

function CreateAccountPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSocialLoading, setIsSocialLoading] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setStatusMessage(null);

    if (!email || !password || !confirmPassword) {
      setErrorMessage('Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long');
      return;
    }

    setIsLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      setStatusMessage(`Account created successfully! Signed in as ${userCredential.user.email}`);
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      // Navigate to dashboard after successful account creation
      setTimeout(() => {
        navigate('/firebase/dashboard');
      }, 1000);
    } catch (error: any) {
      let errorMsg = 'Account creation failed';
      if (error.code === 'auth/email-already-in-use') {
        errorMsg = 'An account with this email already exists';
      } else if (error.code === 'auth/invalid-email') {
        errorMsg = 'Invalid email address';
      } else if (error.code === 'auth/operation-not-allowed') {
        errorMsg = 'Email/password accounts are not enabled';
      } else if (error.code === 'auth/weak-password') {
        errorMsg = 'Password is too weak';
      } else if (error.message) {
        errorMsg = error.message;
      }
      setErrorMessage(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialAuth = async (provider: 'google' | 'apple' | 'facebook' | 'twitter') => {
    setIsSocialLoading(provider);
    setStatusMessage(null);
    setErrorMessage(null);

    try {
      let result;
      switch (provider) {
        case 'google':
          result = await authenticateWithGoogle();
          break;
        case 'apple':
          result = await authenticateWithApple();
          break;
        case 'facebook':
          result = await authenticateWithFacebook();
          break;
        case 'twitter':
          result = await authenticateWithTwitter();
          break;
        default:
          result = { success: false, error: 'Unknown provider' };
      }

      if (result.success && result.user) {
        setStatusMessage(`Successfully signed in with ${provider} as ${result.user.email}`);
        setTimeout(() => {
          navigate('/firebase/dashboard');
        }, 1000);
      } else {
        setErrorMessage(result.error || `${provider} authentication failed`);
      }
    } catch (error: any) {
      setErrorMessage(error.message || `${provider} authentication failed`);
    } finally {
      setIsSocialLoading(null);
    }
  };

  return (
    <div className="app">
      <div className="app-card">
        <header className="app-header">
          <div className="app-header-title">
            <h1>Create Account</h1>
            <button
              type="button"
              className="back-button"
              onClick={() => navigate('/firebase')}
              aria-label="Back to login"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 19l-7-7 7-7"/>
              </svg>
            </button>
          </div>
          <p>Create a new account to get started.</p>
        </header>

        <form onSubmit={handleCreateAccount} className="firebase-form">
          <div className="field">
            <label htmlFor="create-email">Email</label>
            <input
              id="create-email"
              type="email"
              placeholder="your.email@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              disabled={isLoading}
            />
          </div>

          <div className="field">
            <label htmlFor="create-password">Password</label>
            <input
              id="create-password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              disabled={isLoading}
            />
            <p className="hint">Password must be at least 6 characters long.</p>
          </div>

          <div className="field">
            <label htmlFor="confirm-password">Confirm Password</label>
            <input
              id="confirm-password"
              type="password"
              placeholder="Confirm your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              disabled={isLoading}
            />
          </div>

          {statusMessage ? <div className="status status--success">{statusMessage}</div> : null}
          {errorMessage ? <div className="status status--error">{errorMessage}</div> : null}

          <div className="actions">
            <button type="submit" disabled={isLoading || isSocialLoading !== null}>
              {isLoading ? 'Creating account...' : 'Create Account'}
            </button>
          </div>

          <div className="social-auth-section">
            <div className="social-auth-divider">
              <span>OR</span>
            </div>
            <div className="social-auth-buttons">
              <button
                type="button"
                className="social-auth-button social-auth-button--google"
                onClick={() => handleSocialAuth('google')}
                disabled={isLoading || isSocialLoading !== null}
              >
                {isSocialLoading === 'google' ? (
                  'Signing in...'
                ) : (
                  <>
                    <svg width="18" height="18" viewBox="0 0 18 18">
                      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
                      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
                      <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.348 6.175 0 7.55 0 9s.348 2.825.957 4.039l3.007-2.332z"/>
                      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z"/>
                    </svg>
                    Google
                  </>
                )}
              </button>
              <button
                type="button"
                className="social-auth-button social-auth-button--apple"
                onClick={() => handleSocialAuth('apple')}
                disabled={isLoading || isSocialLoading !== null}
              >
                {isSocialLoading === 'apple' ? (
                  'Signing in...'
                ) : (
                  <>
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
                      <path d="M13.65 2.35C13.1 1.8 12.3 1.5 11.4 1.5c-.9 0-1.7.3-2.25.85-.55.55-.85 1.35-.85 2.25 0 .9.3 1.7.85 2.25.55.55 1.35.85 2.25.85.9 0 1.7-.3 2.25-.85.55-.55.85-1.35.85-2.25 0-.9-.3-1.7-.85-2.25zm-1.4 12.3c-.55.55-1.35.85-2.25.85-.9 0-1.7-.3-2.25-.85-.55-.55-.85-1.35-.85-2.25 0-.9.3-1.7.85-2.25.55-.55 1.35-.85 2.25-.85.9 0 1.7.3 2.25.85.55.55.85 1.35.85 2.25 0 .9-.3 1.7-.85 2.25z"/>
                    </svg>
                    Apple
                  </>
                )}
              </button>
              <button
                type="button"
                className="social-auth-button social-auth-button--facebook"
                onClick={() => handleSocialAuth('facebook')}
                disabled={isLoading || isSocialLoading !== null}
              >
                {isSocialLoading === 'facebook' ? (
                  'Signing in...'
                ) : (
                  <>
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
                      <path d="M9 0C4.03 0 0 4.03 0 9c0 4.5 3.3 8.22 7.61 8.9v-6.3H5.31V9h2.3V7.02c0-2.27 1.35-3.52 3.42-3.52.99 0 2.03.18 2.03.18v2.23h-1.14c-1.13 0-1.48.7-1.48 1.42V9h2.51l-.4 2.6h-2.11V17.9C14.7 17.22 18 13.5 18 9c0-4.97-4.03-9-9-9z"/>
                    </svg>
                    Facebook
                  </>
                )}
              </button>
              <button
                type="button"
                className="social-auth-button social-auth-button--twitter"
                onClick={() => handleSocialAuth('twitter')}
                disabled={isLoading || isSocialLoading !== null}
              >
                {isSocialLoading === 'twitter' ? (
                  'Signing in...'
                ) : (
                  <>
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
                      <path d="M15.97 5.43c.01.15.01.3.01.45 0 4.56-3.47 9.82-9.82 9.82-1.95 0-3.76-.57-5.29-1.55.27.03.54.05.82.05a6.94 6.94 0 0 0 4.3-1.48 3.47 3.47 0 0 1-3.24-2.4c.21.04.43.06.65.06.31 0 .62-.04.91-.12a3.46 3.46 0 0 1-2.78-3.4v-.04c.47.26 1 .42 1.57.44a3.45 3.45 0 0 1-1.54-2.88c0-.64.17-1.24.47-1.76a9.84 9.84 0 0 0 7.14 3.62c-.15-.64-.23-1.31-.23-2 0-2.4 1.95-4.35 4.35-4.35 1.25 0 2.38.53 3.17 1.38a6.83 6.83 0 0 0 2.2-.84 3.46 3.46 0 0 1-1.52 1.91c.7-.08 1.36-.27 1.98-.51a7.4 7.4 0 0 1-1.73 1.79z"/>
                    </svg>
                    Twitter
                  </>
                )}
              </button>
            </div>
          </div>

          <p className="create-account-text">
            Already have an account? <button type="button" className="create-account-link" onClick={() => navigate('/firebase')} disabled={isLoading || isSocialLoading !== null}>Sign in</button>
          </p>
        </form>
      </div>
    </div>
  );
}

export default CreateAccountPage;

