import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { IoCheckmarkCircle } from 'react-icons/io5';
import './Auth.css';

const VerificationSuccess = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Auto-redirect after 3 seconds
    const timer = setTimeout(() => {
      navigate('/login');
    }, 3000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="success-icon-large success-animated">
            <IoCheckmarkCircle />
          </div>
          <h2 className="auth-title">Success!</h2>
          <p className="auth-subtitle">
            Your password has been reset successfully
          </p>
          <p className="auth-description">
            You will be redirected to login in 3 seconds...
          </p>
        </div>

        <button className="auth-btn" onClick={() => navigate('/login')}>
          Go to Login
        </button>
      </div>
    </div>
  );
};

export default VerificationSuccess;





