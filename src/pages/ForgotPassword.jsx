import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { IoArrowBack } from 'react-icons/io5';
import { useToast } from '../components/Toast';
import api from '../services/api';
import './Auth.css';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email.trim()) {
      toast.error('Please enter your email address');
      return;
    }

    setLoading(true);

    try {
      await api.forgotPassword(email.trim());
      toast.success('Password reset code sent to your email!');
      navigate('/verify-email', { state: { email: email.trim() } });
    } catch (error) {
      toast.error(error.message || 'Failed to send reset code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <button className="back-btn-auth" onClick={() => navigate('/login')}>
          <IoArrowBack />
        </button>

        <div className="auth-header">
          <h1 className="auth-logo">
            <span className="logo-xora">XoRa </span>
            <span className="logo-social">SociAl</span>
          </h1>
          <h2 className="auth-title">Forgot Password?</h2>
          <p className="auth-subtitle">
            Enter your email address and we&apos;ll send you a link to reset your password.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="forgot-email">Email Address</label>
            <input
              id="forgot-email"
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
            />
          </div>

          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>

          <div className="auth-footer">
            <Link to="/login" className="link-text">Back to Login</Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ForgotPassword;





