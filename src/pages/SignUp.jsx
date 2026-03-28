import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { IoEyeOutline, IoEyeOffOutline } from 'react-icons/io5';
import { useToast } from '../components/Toast';
import { useTranslation } from 'react-i18next';
import './Auth.css';

const SignUp = ({ onSignup }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({ name: '', email: '', username: '', password: '' });
  const { signup } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const { t } = useTranslation();

  const handleSubmit = async (e) => {
    e.preventDefault();

    const newErrors = { name: '', email: '', username: '', password: '' };
    if (!name.trim()) newErrors.name = t('errors.nameRequired');
    if (!email.trim()) newErrors.email = t('errors.emailRequired');
    if (!username.trim()) {
      newErrors.username = t('errors.usernameRequired') || 'Username is required';
    } else if (!/^[A-Za-z0-9_]{3,30}$/.test(username.trim())) {
      newErrors.username = t('errors.invalidUsername') || 'Username must be 3-30 characters, using only letters, numbers, and underscores';
    }
    if (!password.trim()) newErrors.password = t('errors.passwordRequired');
    else if (password.length < 10) newErrors.password = t('errors.passwordTooShort');

    if (!agreedToTerms) {
      toast.error(t('errors.termsAgree'));
    }

    if (newErrors.name || newErrors.email || newErrors.username || newErrors.password || !agreedToTerms) {
      setErrors(newErrors);
      return;
    }

    setErrors({ name: '', email: '', username: '', password: '' });
    setLoading(true);

    try {
      const signupResult = await signup(name, email, username.trim(), password);

      if (signupResult.requiresEmailVerification) {
        // Navigate to email verification page
        navigate('/verify-email', { state: { type: 'signup', tempToken: signupResult.tempToken, email: signupResult.email } });
        toast.success(signupResult.message || t('success.verificationSent'));
      } else {
        if (onSignup) onSignup();
        toast.success(t('success.signupSuccess'));
        navigate('/');
      }
    } catch (error) {
      toast.error(t('errors.somethingWentWrong'));
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
          <p className="auth-welcome">{t('auth.joinCommunity')}</p>
          <h2 className="auth-title">{t('common.signup')}</h2>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="name">{t('auth.fullName')}</label>
            <input
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('auth.fullName')}
            />
            {errors.name ? <p className="field-error">{errors.name}</p> : null}
          </div>

          <div className="form-group">
            <label htmlFor="signup-email">{t('auth.email')}</label>
            <input
              id="signup-email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('auth.email')}
            />
            {errors.email ? <p className="field-error">{errors.email}</p> : null}
          </div>

          <div className="form-group">
            <label htmlFor="username">{t('auth.username') || 'Username'}</label>
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={t('auth.username') || 'Username'}
            />
            {errors.username ? <p className="field-error">{errors.username}</p> : null}
          </div>

          <div className="form-group">
            <label htmlFor="signup-password">{t('auth.password')}</label>
            <div className="password-input">
              <input
                id="signup-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('auth.password')}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <IoEyeOffOutline /> : <IoEyeOutline />}
              </button>
            </div>
            {errors.password ? <p className="field-error">{errors.password}</p> : null}
          </div>

          <div className="checkbox-group">
            <input
              type="checkbox"
              id="terms"
              name="terms"
              checked={agreedToTerms}
              onChange={(e) => setAgreedToTerms(e.target.checked)}
            />
            <label htmlFor="terms">
              {t('auth.termsAgree')}{' '}
              <Link to="/terms" className="link-text-inline">{t('settings.termsOfService')}</Link>
              {' '}and{' '}
              <Link to="/privacy" className="link-text-inline">{t('settings.privacyPolicy')}</Link>
            </label>
          </div>

          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? t('common.loading') : t('common.signup')}
          </button>

          <div className="auth-divider">{t('common.or')}</div>

          <Link to="/login" className="secondary-btn">
            {t('auth.alreadyHaveAccount')} {t('common.login')}
          </Link>
        </form>
      </div>
    </div>
  );
};

export default SignUp;





