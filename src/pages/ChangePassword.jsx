import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IoArrowBack, IoEyeOutline, IoEyeOffOutline, IoCheckmarkCircle, IoCloseCircle } from 'react-icons/io5';
import './ChangePassword.css';
import { extractError, getCsrfToken } from '../services/api';

// In development, use '/api' to proxy through Vite (same-origin for cookies)
// In production, use the actual API URL
const API_URL = import.meta.env.PROD
  ? 'https://xora-workers-api-production.xorasocial.workers.dev'
  : '/api';

const ChangePassword = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Password strength criteria
  const passwordCriteria = {
    length: formData.newPassword.length >= 8,
    uppercase: /[A-Z]/.test(formData.newPassword),
    lowercase: /[a-z]/.test(formData.newPassword),
    number: /[0-9]/.test(formData.newPassword),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(formData.newPassword)
  };

  const passwordStrength = Object.values(passwordCriteria).filter(Boolean).length;

  const getStrengthColor = () => {
    if (passwordStrength <= 2) return 'var(--error)';
    if (passwordStrength <= 3) return '#FFA500';
    if (passwordStrength <= 4) return '#FFD700';
    return 'var(--success)';
  };

  const getStrengthText = () => {
    if (passwordStrength <= 2) return 'Weak';
    if (passwordStrength <= 3) return 'Fair';
    if (passwordStrength <= 4) return 'Good';
    return 'Strong';
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear errors for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const togglePassword = (field) => {
    setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.currentPassword) {
      newErrors.currentPassword = 'Current password is required';
    }

    if (!formData.newPassword) {
      newErrors.newPassword = 'New password is required';
    } else if (formData.newPassword.length < 8) {
      newErrors.newPassword = 'Password must be at least 8 characters';
    } else if (passwordStrength < 3) {
      newErrors.newPassword = 'Password is too weak';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (formData.currentPassword === formData.newPassword) {
      newErrors.newPassword = 'New password must be different from current password';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) return;

    setLoading(true);

    try {
      const csrfToken = getCsrfToken();
      const response = await fetch(`${API_URL}/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data?.success) {
        const message = extractError(data, response.status, `Failed to change password: ${response.status}`);
        throw new Error(message);
      }

      setSuccess(true);
      setFormData({ currentPassword: '', newPassword: '', confirmPassword: '' });

      setTimeout(() => {
        navigate('/settings');
      }, 2000);
    } catch (err) {
      setErrors((prev) => ({
        ...prev,
        currentPassword: err.message || 'Failed to change password',
      }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="change-password-page">
      {/* Header */}
      <div className="change-password-header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <IoArrowBack />
        </button>
        <h1 className="change-password-title">Change Password</h1>
      </div>

      {/* Info Box */}
      <div className="info-box">
        <p>Choose a strong password that you don&apos;t use for other accounts.</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="change-password-form">
        {/* Current Password */}
        <div className="form-group">
          <label htmlFor="current-password" className="form-label">Current Password</label>
          <div className="password-input-wrapper">
            <input
              id="current-password"
              type={showPasswords.current ? 'text' : 'password'}
              name="currentPassword"
              value={formData.currentPassword}
              onChange={handleChange}
              className={`form-input ${errors.currentPassword ? 'error' : ''}`}
              placeholder="Enter current password"
            />
            <button
              type="button"
              className="toggle-password-btn"
              onClick={() => togglePassword('current')}
            >
              {showPasswords.current ? <IoEyeOffOutline /> : <IoEyeOutline />}
            </button>
          </div>
          {Boolean(errors.currentPassword) && (
            <span className="error-message">{errors.currentPassword}</span>
          )}
        </div>

        {/* New Password */}
        <div className="form-group">
          <label htmlFor="new-password" className="form-label">New Password</label>
          <div className="password-input-wrapper">
            <input
              id="new-password"
              type={showPasswords.new ? 'text' : 'password'}
              name="newPassword"
              value={formData.newPassword}
              onChange={handleChange}
              className={`form-input ${errors.newPassword ? 'error' : ''}`}
              placeholder="Enter new password"
            />
            <button
              type="button"
              className="toggle-password-btn"
              onClick={() => togglePassword('new')}
            >
              {showPasswords.new ? <IoEyeOffOutline /> : <IoEyeOutline />}
            </button>
          </div>
          {Boolean(errors.newPassword) && (
            <span className="error-message">{errors.newPassword}</span>
          )}

          {/* Password Strength Indicator */}
          {Boolean(formData.newPassword) && (
            <div className="password-strength">
              <div className="strength-bars">
                {[1, 2, 3, 4, 5].map((bar) => (
                  <div
                    key={bar}
                    className={`strength-bar ${bar <= passwordStrength ? 'active' : ''}`}
                    style={{
                      backgroundColor: bar <= passwordStrength ? getStrengthColor() : 'var(--border)'
                    }}
                  />
                ))}
              </div>
              <span className="strength-text" style={{ color: getStrengthColor() }}>
                {getStrengthText()}
              </span>
            </div>
          )}

          {/* Password Criteria */}
          {Boolean(formData.newPassword) && (
            <div className="password-criteria">
              <div className={`criteria-item ${passwordCriteria.length ? 'met' : ''}`}>
                {passwordCriteria.length ? <IoCheckmarkCircle /> : <IoCloseCircle />}
                <span>At least 8 characters</span>
              </div>
              <div className={`criteria-item ${passwordCriteria.uppercase ? 'met' : ''}`}>
                {passwordCriteria.uppercase ? <IoCheckmarkCircle /> : <IoCloseCircle />}
                <span>One uppercase letter</span>
              </div>
              <div className={`criteria-item ${passwordCriteria.lowercase ? 'met' : ''}`}>
                {passwordCriteria.lowercase ? <IoCheckmarkCircle /> : <IoCloseCircle />}
                <span>One lowercase letter</span>
              </div>
              <div className={`criteria-item ${passwordCriteria.number ? 'met' : ''}`}>
                {passwordCriteria.number ? <IoCheckmarkCircle /> : <IoCloseCircle />}
                <span>One number</span>
              </div>
              <div className={`criteria-item ${passwordCriteria.special ? 'met' : ''}`}>
                {passwordCriteria.special ? <IoCheckmarkCircle /> : <IoCloseCircle />}
                <span>One special character</span>
              </div>
            </div>
          )}
        </div>

        {/* Confirm Password */}
        <div className="form-group">
          <label htmlFor="confirm-password" className="form-label">Confirm New Password</label>
          <div className="password-input-wrapper">
            <input
              id="confirm-password"
              type={showPasswords.confirm ? 'text' : 'password'}
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              className={`form-input ${errors.confirmPassword ? 'error' : ''}`}
              placeholder="Re-enter new password"
            />
            <button
              type="button"
              className="toggle-password-btn"
              onClick={() => togglePassword('confirm')}
            >
              {showPasswords.confirm ? <IoEyeOffOutline /> : <IoEyeOutline />}
            </button>
          </div>
          {Boolean(errors.confirmPassword) && (
            <span className="error-message">{errors.confirmPassword}</span>
          )}
          {Boolean(formData.confirmPassword && formData.newPassword === formData.confirmPassword) && (
            <span className="success-message">
              <IoCheckmarkCircle /> Passwords match
            </span>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          className="submit-btn"
          disabled={loading || success}
        >
          {loading ? (
            <div className="spinner-small"></div>
          ) : success ? (
            <>
              <IoCheckmarkCircle /> Password Changed
            </>
          ) : (
            'Change Password'
          )}
        </button>
      </form>

      {/* Success Message */}
      {Boolean(success) && (
        <div className="success-banner">
          <IoCheckmarkCircle />
          <span>Password changed successfully! You remain logged in.</span>
        </div>
      )}
    </div>
  );
};

export default ChangePassword;





