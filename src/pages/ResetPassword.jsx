import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { IoEyeOutline, IoEyeOffOutline, IoArrowBack } from 'react-icons/io5';
import { useToast } from '../components/Toast';
import api from '../services/api';
import './Auth.css';

const ResetPassword = () => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();

  // Get email and code from location state (passed from VerificationCode)
  const { email, code } = location.state || {};

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email || !code) {
      toast.error('Invalid reset session. Please try again.');
      navigate('/forgot-password');
      return;
    }

    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      await api.resetPassword(email, code, newPassword);
      toast.success('Password reset successfully!');
      navigate('/login');
    } catch (error) {
      toast.error(error.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <button className="back-btn-auth" onClick={() => navigate(-1)}>
          <IoArrowBack />
        </button>

        <div className="auth-header">
          <h1 className="auth-logo">
            <span className="logo-xora">XoRa </span>
            <span className="logo-social">SociAl</span>
          </h1>
          <h2 className="auth-title">Reset Password</h2>
          <p className="auth-subtitle">
            Create a new password for your account
          </p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="new-password">New Password</label>
            <div className="password-input">
              <input
                id="new-password"
                name="newPassword"
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowNewPassword(!showNewPassword)}
              >
                {showNewPassword ? <IoEyeOffOutline /> : <IoEyeOutline />}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="confirm-password">Confirm Password</label>
            <div className="password-input">
              <input
                id="confirm-password"
                name="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? <IoEyeOffOutline /> : <IoEyeOutline />}
              </button>
            </div>
          </div>

          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;





