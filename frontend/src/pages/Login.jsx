import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import '../styles/login.css';

export default function Login() {
  const { theme } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { login, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && !isLoading) {
      navigate('/', { replace: true });
    }
  }, [user, navigate, isLoading]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    const result = await login({ email: email.trim(), password });
    
    if (result.success) {
      // Show loading screen briefly before navigating
      await new Promise(resolve => setTimeout(resolve, 1500));
      navigate('/', { replace: true });
    } else {
      setError(result.error || 'Login failed. Please try again.');
      setIsLoading(false);
    }
  };

  // Show loading screen when logging in
  if (isLoading) {
    return (
      <div className="login-loading-screen">
        <div className="login-loading-content">
          <img src="/logo.png" alt="FarmWise Logo" className="login-loading-logo" />
          <div className="login-loading-spinner"></div>
          <p className="login-loading-text">Signing you in...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-fade login-page">
      {/* Video Background */}
      <div className="login-video-background">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="login-video"
          key={theme}
        >
          <source src={theme === 'light' ? '/LgNReg-L.mp4' : '/LgNReg-N.mp4'} type="video/mp4" />
        </video>
        <div className="login-video-overlay"></div>
      </div>

      <div className="login-container">
        <div className="login-card">
          <h1 className="login-title">Sign in</h1>
          <p className="login-subtitle">Enter your credentials to access FarmWise.</p>

          {error && <div className="login-error">{error}</div>}

          <form onSubmit={handleSubmit} className="login-form">
            <label className="login-label">
              <span>Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="farmer@example.com"
                className="login-input"
                required
              />
            </label>
            <label className="login-label">
              <span>Password</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="login-input"
                required
              />
            </label>
            <button type="submit" className="login-submit">
              <LogIn size={20} />
              Sign in
            </button>
          </form>

          <p className="login-footer">
            New to FarmWise? <Link to="/register" className="login-register-link">Register as a new user</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
