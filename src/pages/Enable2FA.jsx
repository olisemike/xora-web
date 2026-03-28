import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IoArrowBack, IoShieldCheckmark } from 'react-icons/io5';
import { useToast } from '../components/Toast';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import './Auth.css';

const Enable2FA = () => {
  const { isAuthenticated } = useAuth();
  const [step, setStep] = useState(1); // 1: Scan & verify, 2: Success
  const [codes, setCodes] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [qrUri, setQrUri] = useState('');
  const [secret, setSecret] = useState('');
  const navigate = useNavigate();
  const toast = useToast();
  const inputRefs = React.useRef([]);

  useEffect(() => {
    if (!isAuthenticated) {
      toast.error('You need to be logged in to enable 2FA');
      navigate('/login');
      return;
    }

    const startSetup = async () => {
      setLoading(true);
      try {
        const { otpauthUrl, secret } = await api.enable2FA();
        if (!otpauthUrl && !secret) {
          toast.error('Failed to start 2FA setup');
          navigate('/settings');
          return;
        }
        setQrUri(otpauthUrl || '');
        setSecret(secret || '');
      } catch (error) {
        toast.error(error.message || 'Failed to start 2FA setup');
        navigate('/settings');
      } finally {
        setLoading(false);
      }
    };

    startSetup();
  }, [toast, navigate, isAuthenticated]);

  const handleCodeChange = (index, value) => {
    if (value.length > 1) return;

    const cleaned = value.replace(/\D/g, '');
    const newCodes = [...codes];
    newCodes[index] = cleaned;
    setCodes(newCodes);

    if (cleaned && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    
    const code = codes.join('');
    if (code.length !== 6) {
      toast.error('Please enter the 6-digit code');
      return;
    }

    if (!isAuthenticated) {
      toast.error('Session expired. Please log in again.');
      navigate('/login');
      return;
    }

    setLoading(true);

    try {
      await api.verify2FASetup(code);
      toast.success('2FA enabled successfully!');
      setStep(2);
    } catch (error) {
      toast.error(error.message || 'Failed to verify code');
    } finally {
      setLoading(false);
    }
  };

  if (step === 2) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <div className="success-icon-large success-animated">
              <IoShieldCheckmark />
            </div>
            <h2 className="auth-title">2FA Enabled!</h2>
            <p className="auth-subtitle">
              Your account is now protected with two-factor authentication
            </p>
            <p className="auth-description">
              You&apos;ll receive a code via email whenever you log in from a new device.
            </p>
          </div>

          <button className="auth-btn" onClick={() => navigate('/settings')}>
            Back to Settings
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <button className="back-btn-auth" onClick={() => step === 1 ? navigate(-1) : setStep(1)}>
          <IoArrowBack />
        </button>

        <div className="auth-header">
          <div className="icon-large">
            <IoShieldCheckmark />
          </div>
          <h2 className="auth-title">Enable 2FA</h2>
          <p className="auth-subtitle">
            Protect your account with an authenticator app
          </p>
        </div>

        <form onSubmit={handleVerifyCode} className="auth-form">
          <div className="info-box">
            <p>
              1. Scan this QR code in Google Authenticator, 1Password, or any TOTP app.
            </p>
          </div>

          {qrUri ? (
            <div className="qr-wrapper">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
                  qrUri,
                )}`}
                alt="2FA QR Code"
                className="qr-image"
              />
            </div>
          ) : (
            <p className="auth-description">Preparing your 2FA QR code...</p>
          )}

          {secret ? <div className="info-box">
              <p>
                Or enter this code manually in your app:
                <br />
                <strong>{secret}</strong>
              </p>
            </div> : null}

          <div className="form-group">
            <label>Enter 6-digit code from your app</label>
            <div className="verification-code-inputs">
              {codes.map((code, index) => (
                <input
                  key={index}
                  ref={(el) => (inputRefs.current[index] = el)}
                  id={`enable-2fa-code-${index}`}
                  name={`code-${index}`}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={code}
                  onChange={(e) => handleCodeChange(index, e.target.value)}
                  className="code-input"
                  autoFocus={index === 0}
                  disabled={loading}
                  aria-label={`2FA code digit ${index + 1}`}
                />
              ))}
            </div>
          </div>

          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? 'Verifying...' : 'Verify & Enable 2FA'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Enable2FA;





