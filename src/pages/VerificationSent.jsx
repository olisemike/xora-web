import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { IoMailOutline } from 'react-icons/io5';
import './Auth.css';

const VerificationSent = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email || 'your email';

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="success-icon-large">
            <IoMailOutline />
          </div>
          <h2 className="auth-title">Check Your Email</h2>
          <p className="auth-subtitle">
            We&apos;ve sent a password reset link to <strong>{email}</strong>
          </p>
          <p className="auth-description">
            Click the link in the email to reset your password. If you don&apos;t see it, check your spam folder.
          </p>
        </div>

        <div className="auth-actions">
          <button className="auth-btn" onClick={() => navigate('/login')}>
            Back to Login
          </button>
          <button className="secondary-btn" onClick={() => navigate('/forgot-password')}>
            Resend Email
          </button>
        </div>
      </div>
    </div>
  );
};

export default VerificationSent;





