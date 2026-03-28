import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Login.css';

/**
 * Login Component
 * Features:
 * - IP pinning support
 * - Device verification support
 * - 2FA support
 */
export default function Login() {
  const { login, verifyDevice, completeTwoFactorLogin } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [requires2FA, setRequires2FA] = useState(false);
  const [tempToken, setTempToken] = useState('');
  const [code2FA, setCode2FA] = useState('');
  const [requiresDeviceVerification, setRequiresDeviceVerification] = useState(false);
  const [deviceCode, setDeviceCode] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login(email, password);
      if (result?.requires2FA) {
        setRequires2FA(true);
        setTempToken(result.tempToken || '');
        setError(result.message || 'Enter your 2FA code.');
        setLoading(false);
        return;
      }

      // Check if device verification is required
      if (result?.requiresVerification) {
        setRequiresDeviceVerification(true);
        setTempToken(result.tempToken || '');
        setError(result.message || 'Device verification required. Check your email.');
        setLoading(false);
        return;
      }

      // Redirect to home
      window.location.href = '/';
    } catch (err) {
      setError(err?.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle 2FA verification
   */
  const handle2FAVerification = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await completeTwoFactorLogin(tempToken, code2FA);
      // Redirect to home
      window.location.href = '/';
    } catch (err) {
      setError(err?.message || '2FA verification failed');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle device verification
   */
  const handleDeviceVerification = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await verifyDevice(deviceCode, tempToken);
      if (!result?.success) {
        setError(result?.error || 'Device verification failed');
        setLoading(false);
        return;
      }
      // Redirect to home
      window.location.href = '/';
    } catch (err) {
      setError(err?.message || 'Device verification failed');
    } finally {
      setLoading(false);
    }
  };

  // Show 2FA form
  if (requires2FA) {
    return (
      <div className="login-container">
        <div className="login-form">
          <h2>Two-Factor Authentication</h2>
          <p>Enter the 6-digit code from your authenticator app:</p>
          {error ? <div className="error-message">{error}</div> : null}
          <form onSubmit={handle2FAVerification}>
            <input
              id="login-2fa-code"
              name="code2FA"
              type="text"
              placeholder="000000"
              value={code2FA}
              onChange={(e) => setCode2FA(e.target.value)}
              maxLength="6"
              pattern="[0-9]{6}"
              required
            />
            <button type="submit" disabled={loading}>
              {loading ? 'Verifying...' : 'Verify'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Show device verification prompt
  if (requiresDeviceVerification) {
    return (
      <div className="login-container">
        <div className="login-form">
          <h2>Device Verification Required</h2>
          <p>A verification code has been sent to your email. Check your email and enter the code below:</p>
          {error ? <div className="error-message">{error}</div> : null}
          <form onSubmit={handleDeviceVerification}>
            <input
              id="login-device-code"
              name="deviceCode"
              type="text"
              placeholder="Enter verification code"
              value={deviceCode}
              onChange={(e) => setDeviceCode(e.target.value)}
              required
            />
            <button type="submit" disabled={loading}>
              {loading ? 'Verifying...' : 'Verify Device'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Show login form
  return (
    <div className="login-container">
      <div className="login-form">
        <h2>Login to Xora</h2>
        {error ? <div className="error-message">{error}</div> : null}

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label htmlFor="email">Email or Username</label>
            <input
              id="email"
              name="email"
              type="text"
              placeholder="user@example.com or username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className="login-links">
          <Link to="/forgot-password">Forgot password?</Link>
          <span> • </span>
          <Link to="/signup">Don't have an account? Sign up</Link>
        </div>
      </div>
    </div>
  );
}





