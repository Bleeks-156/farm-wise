import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { UserPlus, Mail, Lock, User, Phone, MapPin } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import '../styles/register.css';

export default function Register() {
  const { theme } = useTheme();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    location: '',
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { register, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && !isLoading) {
      navigate('/', { replace: true });
    }
  }, [user, navigate, isLoading]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);

    const result = await register({
      name: formData.name.trim(),
      email: formData.email.trim(),
      password: formData.password,
      phone: formData.phone.trim(),
      location: formData.location.trim(),
    });

    if (result.success) {
      navigate('/', { replace: true });
    } else {
      setError(result.error || 'Registration failed. Please try again.');
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="register-loading-screen">
        <div className="register-loading-content">
          <img src="/logo.png" alt="FarmWise Logo" className="register-loading-logo" />
          <div className="register-loading-spinner"></div>
          <p className="register-loading-text">Creating your account...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-fade register-page">
      {/* Video Background */}
      <div className="register-video-background">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="register-video"
          key={theme}
        >
          <source src={theme === 'light' ? '/LgNReg-L.mp4' : '/LgNReg-N.mp4'} type="video/mp4" />
        </video>
        <div className="register-video-overlay"></div>
      </div>

      <div className="register-container">
        <div className="register-card">
          <h1 className="register-title">Create Account</h1>
          <p className="register-subtitle">Join FarmWise and start your journey.</p>

          {error && (
            <div className="register-error">
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="register-form">
            <label className="register-label">
              <span>Full Name</span>
              <div className="register-input-wrapper">
                <User size={18} className="register-input-icon" />
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="John Doe"
                  className="register-input"
                  required
                />
              </div>
            </label>

            <label className="register-label">
              <span>Email</span>
              <div className="register-input-wrapper">
                <Mail size={18} className="register-input-icon" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="farmer@example.com"
                  className="register-input"
                  required
                />
              </div>
            </label>

            <label className="register-label">
              <span>Phone Number</span>
              <div className="register-input-wrapper">
                <Phone size={18} className="register-input-icon" />
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+1 234 567 8900"
                  className="register-input"
                  required
                />
              </div>
            </label>

            <label className="register-label">
              <span>Location</span>
              <div className="register-input-wrapper">
                <MapPin size={18} className="register-input-icon" />
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  placeholder="City, State"
                  className="register-input"
                  required
                />
              </div>
            </label>

            <label className="register-label">
              <span>Password</span>
              <div className="register-input-wrapper">
                <Lock size={18} className="register-input-icon" />
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="register-input"
                  required
                />
              </div>
            </label>

            <label className="register-label">
              <span>Confirm Password</span>
              <div className="register-input-wrapper">
                <Lock size={18} className="register-input-icon" />
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="register-input"
                  required
                />
              </div>
            </label>

            <button type="submit" className="register-submit">
              <UserPlus size={20} />
              Create Account
            </button>
          </form>

          <p className="register-footer">
            Already have an account? <Link to="/login" className="register-login-link">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
