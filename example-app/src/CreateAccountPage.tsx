import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from './firebase';
import './App.css';

function CreateAccountPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
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
            <button type="submit" disabled={isLoading}>
              {isLoading ? 'Creating account...' : 'Create Account'}
            </button>
          </div>

          <p className="create-account-text">
            Already have an account? <button type="button" className="create-account-link" onClick={() => navigate('/firebase')} disabled={isLoading}>Sign in</button>
          </p>
        </form>
      </div>
    </div>
  );
}

export default CreateAccountPage;

