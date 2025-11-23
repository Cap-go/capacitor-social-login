import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from './firebase';
import './App.css';

function FirebasePage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setStatusMessage(null);

    if (!email || !password) {
      setErrorMessage('Please enter both email and password');
      return;
    }

    setIsLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      setStatusMessage(`Successfully signed in as ${userCredential.user.email}`);
      setEmail('');
      setPassword('');
      // Navigate to dashboard after successful login
      setTimeout(() => {
        navigate('/firebase/dashboard');
      }, 1000);
    } catch (error: any) {
      let errorMsg = 'Login failed';
      if (error.code === 'auth/invalid-email') {
        errorMsg = 'Invalid email address';
      } else if (error.code === 'auth/user-disabled') {
        errorMsg = 'This account has been disabled';
      } else if (error.code === 'auth/user-not-found') {
        errorMsg = 'No account found with this email';
      } else if (error.code === 'auth/wrong-password') {
        errorMsg = 'Incorrect password';
      } else if (error.code === 'auth/invalid-credential') {
        errorMsg = 'Invalid email or password';
      } else if (error.message) {
        errorMsg = error.message;
      }
      setErrorMessage(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateAccount = () => {
    navigate('/firebase/create-account');
  };

  return (
    <div className="app">
      <div className="app-card">
        <header className="app-header">
          <div className="app-header-title">
            <h1>Firebase Authentication</h1>
            <button
              type="button"
              className="back-button"
              onClick={() => navigate('/')}
              aria-label="Back to home"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 19l-7-7 7-7"/>
              </svg>
            </button>
          </div>
          <p>Sign in with your email and password to continue.</p>
        </header>

        <form onSubmit={handleLogin} className="firebase-form">
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              placeholder="your.email@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              disabled={isLoading}
            />
          </div>

          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              disabled={isLoading}
            />
          </div>

          {statusMessage ? <div className="status status--success">{statusMessage}</div> : null}
          {errorMessage ? <div className="status status--error">{errorMessage}</div> : null}

          <div className="actions">
            <button type="submit" disabled={isLoading}>
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </div>

          <p className="create-account-text">
            Don't have an account? <button type="button" className="create-account-link" onClick={handleCreateAccount} disabled={isLoading}>Create account</button>
          </p>
        </form>
      </div>
    </div>
  );
}

export default FirebasePage;

