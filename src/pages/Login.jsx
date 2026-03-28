import React, { useEffect, useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { IoEyeOutline, IoEyeOffOutline } from 'react-icons/io5';
import { useToast } from '../components/Toast';
import { useTranslation } from 'react-i18next';
import DeviceVerificationModal from '../components/DeviceVerificationModal';
import './Auth.css';

const Login = ({ onLogin }) => {
  const location = useLocation();
  const [email, setEmail] = useState(location.state?.email || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({ email: '', password: '' });
  const [showVerification, setShowVerification] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState('');
  const [verificationToken, setVerificationToken] = useState('');
  const [requires2FA, setRequires2FA] = useState(false);
  const [twoFATempToken, setTwoFATempToken] = useState('');
  const [twoFACode, setTwoFACode] = useState('');
  const [useBackupCode, setUseBackupCode] = useState(false);
  const { login, completeTwoFactorLogin } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const { t } = useTranslation();

  useEffect(() => {
    const persistedToken = sessionStorage.getItem('xora_device_verification_temp_token');
    const persistedEmail = sessionStorage.getItem('xora_device_verification_email');
    if (persistedToken) {
      setVerificationToken(persistedToken);
      if (persistedEmail) setVerificationEmail(persistedEmail);
      setShowVerification(true);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (import.meta.env.DEV) {
      console.info('Login form submitted');
    }

    const newErrors = { email: '', password: '' };
    if (!email.trim()) {
      newErrors.email = t('errors.emailRequired');
    }
    if (!password.trim()) {
      newErrors.password = t('errors.passwordRequired');
    } else if (password.length < 8) {
      newErrors.password = t('errors.passwordTooShort');
    }

    if (newErrors.email || newErrors.password) {
      setErrors(newErrors);
      return;
    }

    setErrors({ email: '', password: '' });
    setLoading(true);
    if (import.meta.env.DEV) {
      console.info('Calling login function');
    }
    try {
      const result = await login(email, password);

      // If device verification is required, show modal instead of redirecting
      if (result && result.requiresVerification) {
        const temp = result.tempToken || '';
        setVerificationEmail(email);
        setVerificationToken(temp);
        setShowVerification(true);
        if (temp) {
          sessionStorage.setItem('xora_device_verification_temp_token', temp);
        }
        sessionStorage.setItem('xora_device_verification_email', email);
        return;
      }

      // If 2FA is required, show 2FA step instead of redirecting
      if (result && result.requires2FA) {
        setTwoFATempToken(result.tempToken || '');
        setTwoFACode('');
        setUseBackupCode(false);
        setRequires2FA(true);
        toast.info?.(t('auth.twoFactorRequired') || 'Enter your 2FA code to continue.');
        return;
      }

      if (onLogin) onLogin();
      toast.success(t('success.loginSuccess'));
      navigate('/');
    } catch (error) {
      toast.error(error.message || t('errors.invalidCredentials'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1 className="auth-logo">
            <span className="logo-xora">XoRa </span>
            <span className="logo-social">SociAl</span>
          </h1>
          <p className="auth-welcome">{t('auth.welcomeBack')}</p>
          <h2 className="auth-title">{t('common.login')}</h2>
        </div>

        {/* Step 1: username/password form */}
        {!requires2FA && (
          <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="email">{t('auth.email')}</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('auth.email')}
            />
            {Boolean(errors.email) && <p className="field-error">{errors.email}</p>}
          </div>

          <div className="form-group">
            <label htmlFor="password">{t('auth.password')}</label>
            <div className="password-input">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <IoEyeOffOutline /> : <IoEyeOutline />}
              </button>
            </div>
            {Boolean(errors.password) && <p className="field-error">{errors.password}</p>}
          </div>

          <div className="form-footer">
            <Link to="/terms" className="link-text">{t('settings.termsOfService')}</Link>
            <Link to="/privacy" className="link-text">{t('settings.privacyPolicy')}</Link>
          </div>

          <div className="form-footer" style={{ marginTop: '8px' }}>
            <Link to="/forgot-password" className="link-text">{t('auth.forgotPassword')}</Link>
          </div>

          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? t('common.loading') : t('common.login')}
          </button>

          <div className="auth-divider">{t('common.or')}</div>

          <Link to="/signup" className="secondary-btn">
            {t('common.signup')}
          </Link>
        </form>
        )}

        {/* Step 2: 2FA code / backup code form */}
        {Boolean(requires2FA) && (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!twoFATempToken) {
                toast.error(t('auth.sessionExpired') || '2FA session expired. Please log in again.');
                setRequires2FA(false);
                return;
              }
              if (!twoFACode.trim()) {
                toast.error(t('auth.codeRequired') || 'Please enter your 2FA code or backup code.');
                return;
              }
              try {
                setLoading(true);
                await completeTwoFactorLogin(twoFATempToken, twoFACode.trim(), {
                  isBackupCode: useBackupCode,
                });
                setRequires2FA(false);
                setTwoFATempToken('');
                setTwoFACode('');
                setUseBackupCode(false);
                if (onLogin) onLogin();
                toast.success(t('success.loginSuccess'));
                navigate('/');
              } catch (error) {
                toast.error(error.message || t('auth.invalidCode') || 'Invalid 2FA or backup code.');
              } finally {
                setLoading(false);
              }
            }}
            className="auth-form"
          >
            <div className="form-group">
              <label>
                {useBackupCode
                  ? t('auth.backupCodeLabel') || 'Enter a backup code'
                  : t('auth.twoFactorCodeLabel') || 'Enter 6-digit code from your authenticator app'}
              </label>
              <input
                id="twofa-code"
                name="twoFACode"
                type="text"
                value={twoFACode}
                onChange={(e) => setTwoFACode(e.target.value)}
                placeholder={useBackupCode ? t('auth.backupCodePlaceholder') || 'Backup code' : '123456'}
              />
              <small className="field-helper">
                <button
                  type="button"
                  className="link-button"
                  onClick={() => setUseBackupCode(!useBackupCode)}
                  disabled={loading}
                >
                  {useBackupCode
                    ? t('auth.useAuthenticatorCode') || 'Use authenticator app code instead'
                    : t('auth.useBackupCode') || 'Use a backup code instead'}
                </button>
              </small>
            </div>

            <button type="submit" className="auth-btn" disabled={loading}>
              {loading
                ? t('common.loading')
                : t('auth.verifyAndLogin') || 'Verify & Log in'}
            </button>
          </form>
        )}
      </div>

      {Boolean(showVerification) && (
        <DeviceVerificationModal
          email={verificationEmail}
          tempToken={verificationToken}
          onClose={() => setShowVerification(false)}
          onSuccess={() => {
            setShowVerification(false);
            sessionStorage.removeItem('xora_device_verification_temp_token');
            sessionStorage.removeItem('xora_device_verification_email');
            toast.success(t('success.loginSuccess'));
            navigate('/');
          }}
        />
      )}
    </div>
  );
};

export default Login;





