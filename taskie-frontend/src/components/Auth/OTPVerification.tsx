import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { authService } from '../../services/authService';
import './Auth.css';

const OTPVerification: React.FC = () => {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  
  const { verifyOTP } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get email from location state or query params
  const email = location.state?.email || new URLSearchParams(location.search).get('email') || '';

  // Start cooldown timer
  React.useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      setError('Email is required. Please go back to login.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await verifyOTP(email, otp);
      // Navigation is handled in the context
    } catch (err: any) {
      setError(err.message || 'OTP verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (!email) {
      setError('Email is required to resend OTP');
      return;
    }

    setResendLoading(true);
    setError(null);

    try {
      await authService.resendOTP(email);
      setResendCooldown(30); // 30 second cooldown
      alert('OTP has been resent to your email');
    } catch (err: any) {
      setError(err.message || 'Failed to resend OTP');
    } finally {
      setResendLoading(false);
    }
  };

  const handleOtpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setOtp(value);
    
    // Clear error when user starts typing
    if (error) {
      setError(null);
    }
  };

  if (!email) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <h2>Email Required</h2>
          <p>Please go back to login to receive an OTP.</p>
          <button 
            type="button" 
            className="btn btn-primary"
            onClick={() => navigate('/login')}
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Verify OTP</h2>
        <p>We've sent a 6-digit code to <strong>{email}</strong></p>
        
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="otp">Enter 6-digit OTP</label>
            <input
              type="text"
              id="otp"
              value={otp}
              onChange={handleOtpChange}
              maxLength={6}
              pattern="[0-9]{6}"
              placeholder="000000"
              className="otp-input"
              required
              autoComplete="one-time-code"
            />
            <small>Enter the 6-digit code sent to your email</small>
          </div>
          
          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={loading || otp.length !== 6}
          >
            {loading ? 'Verifying...' : 'Verify OTP'}
          </button>
        </form>
        
        <div className="auth-links">
          <p>
            Didn't receive the code? {' '}
            <button 
              type="button" 
              className="link-button" 
              onClick={handleResendOTP}
              disabled={resendLoading || resendCooldown > 0}
            >
              {resendLoading 
                ? 'Sending...' 
                : resendCooldown > 0 
                  ? `Resend in ${resendCooldown}s`
                  : 'Resend OTP'
              }
            </button>
          </p>
          <p>
            <button 
              type="button" 
              className="link-button" 
              onClick={() => navigate('/login')}
            >
              Back to Login
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default OTPVerification;