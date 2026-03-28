import React, { useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { IoArrowBack } from 'react-icons/io5';
import { useToast } from '../components/Toast';
import { useAuth } from '../contexts/AuthContext';
import './Auth.css';

const VerificationCode = () => {
  const [codes, setCodes] = useState(['', '', '', '', '', '']);
  const inputRefs = useRef([]);
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const { completeSignup } = useAuth();
  const email = location.state?.email || '';
  const type = location.state?.type || 'reset';
  const tempToken = location.state?.tempToken || '';

  const handleChange = (index, value) => {
    // Only allow single digit (0-9)
    if (value.length > 1) return;
    if (value && !/^[0-9]$/.test(value)) return;

    const newCodes = [...codes];
    newCodes[index] = value;
    setCodes(newCodes);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !codes[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pastedData.length > 0) {
      const newCodes = [...codes];
      for (let i = 0; i < pastedData.length && i < 6; i++) {
        newCodes[i] = pastedData[i];
      }
      setCodes(newCodes);
      // Focus the next empty input or the last one
      const nextIndex = Math.min(pastedData.length, 5);
      inputRefs.current[nextIndex]?.focus();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const code = codes.join('');
    if (code.length !== 6) {
      toast.error('Please enter all 6 digits');
      return;
    }

    if (type === 'signup') {
      if (!tempToken) {
        toast.error('Signup token is missing. Please try signing up again.');
        navigate('/signup');
        return;
      }

      try {
        const result = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8787'}/auth/complete-signup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ tempToken, code }),
        });

        const data = await result.json();

        if (!result.ok || !data?.success) {
          throw new Error(data?.message || 'Verification failed');
        }

        // Email verified - route to sign-in for device verification
        if (data.data?.emailVerified && data.data?.email) {
          toast.success('Email verified! Please sign in to complete device verification.');
          
          // Navigate to login with email and verification token
          navigate('/login', { 
            state: { 
              email: data.data.email,
              fromEmailVerification: true,
              signupVerificationToken: data.data.signupVerificationToken
            }
          });
        } else {
          throw new Error('Email verification incomplete');
        }
      } catch (error) {
        toast.error(error.message || 'Verification failed. Please check your code and try again.');
      }
    } else {
      // Forgot password flow
      if (!email) {
        toast.error('Email is missing. Please try again.');
        navigate('/forgot-password');
        return;
      }

      // Navigate to reset password page with email and code
      navigate('/reset-password', { state: { code, email } });
    }
  };

  const handleResend = () => {
    toast.info('Verification code resent!');
    setCodes(['', '', '', '', '', '']);
    inputRefs.current[0]?.focus();
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
          <h2 className="auth-title">Enter Verification Code</h2>
          <p className="auth-subtitle">
            We&apos;ve sent a 6-digit code to {email}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="verification-code-inputs">
            {codes.map((code, index) => (
              <input
                key={`verification-code-${index}`}
                ref={(el) => (inputRefs.current[index] = el)}
                type="text"
                id={`verification-code-${index}`}
                name={`code-${index}`}
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                value={code}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={handlePaste}
                className="code-input"
                autoFocus={index === 0}
                aria-label={`Verification code digit ${index + 1}`}
              />
            ))}
          </div>

          <button type="submit" className="auth-btn">
            Verify Code
          </button>

          <div className="auth-footer">
            <p className="text-secondary">Didn&apos;t receive the code?</p>
            <button type="button" onClick={handleResend} className="link-btn">
              Resend Code
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default VerificationCode;





