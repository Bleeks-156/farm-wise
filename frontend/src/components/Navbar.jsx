import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, Sun, Moon, User, LogOut, ShoppingCart } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import API_BASE from '../config/api';
import LanguageSelector from './LanguageSelector';
import '../styles/navbar.css';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();
  const [cartCount, setCartCount] = useState(0);

  // Fetch cart count
  useEffect(() => {
    if (!token) { setCartCount(0); return; }
    const fetchCount = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/cart/count`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success) setCartCount(data.count);
      } catch { }
    };
    fetchCount();
    const interval = setInterval(fetchCount, 10000);
    return () => clearInterval(interval);
  }, [token]);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const onDocClick = (e) => {
      if (!e.target.closest?.('.navbar-profile-wrap')) setProfileOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const handleLogout = () => {
    logout();
    setProfileOpen(false);
    setIsOpen(false);
    navigate('/');
  };

  return (
    <nav className={`navbar ${scrolled ? 'scrolled' : ''}`}>
      <div className="navbar-container">
        <Link to="/" className="navbar-logo" onClick={() => setIsOpen(false)}>
          <img src="/logo.png" alt="FarmWise Logo" className="navbar-logo-img" />
          <span className="navbar-logo-text">FARMWISE</span>
        </Link>

        {/* Desktop Links */}
        <div className="navbar-desktop-menu">
          <Link to="/" className="navbar-link" onClick={() => setIsOpen(false)}>Home</Link>
          <Link to="/advisory" className="navbar-link" onClick={() => setIsOpen(false)}>AI Advisory</Link>
          <Link to="/marketplace" className="navbar-link" onClick={() => setIsOpen(false)}>Marketplace</Link>
          <Link to="/disease-scan" className="navbar-link" onClick={() => setIsOpen(false)}>Disease Scan</Link>
          <Link to="/weather" className="navbar-link" onClick={() => setIsOpen(false)}>Weather</Link>

          {user && (
            <Link to="/cart" className="navbar-cart-btn" onClick={() => setIsOpen(false)}>
              <ShoppingCart size={20} />
              {cartCount > 0 && <span className="navbar-cart-badge">{cartCount}</span>}
            </Link>
          )}

          <button
            type="button"
            className="navbar-theme-btn"
            onClick={toggleTheme}
            aria-label={theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'}
          >
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>

          <LanguageSelector />

          {user ? (
            <div className="navbar-profile-wrap">
              <button
                type="button"
                className="navbar-profile-avatar-btn"
                onClick={() => setProfileOpen((v) => !v)}
                aria-label="Profile menu"
              >
                {user.profilePhoto ? (
                  <img src={user.profilePhoto} alt="Profile" className="navbar-profile-avatar" />
                ) : (
                  <div className="navbar-profile-avatar-placeholder">
                    <User size={20} />
                  </div>
                )}
              </button>
              {profileOpen && (
                <div className="navbar-profile-dropdown">
                  <div className="navbar-profile-header">
                    {user.profilePhoto ? (
                      <img src={user.profilePhoto} alt="Profile" className="navbar-dropdown-avatar" />
                    ) : (
                      <div className="navbar-dropdown-avatar-placeholder">
                        <User size={24} />
                      </div>
                    )}
                    <div className="navbar-profile-info">
                      <span className="navbar-profile-name">{user.name}</span>
                      <span className="navbar-profile-email">{user.email}</span>
                    </div>
                  </div>
                  <div className="navbar-profile-divider"></div>
                  <Link
                    to="/profile"
                    className="navbar-profile-option"
                    onClick={() => { setProfileOpen(false); setIsOpen(false); }}
                  >
                    <User size={18} />
                    View Profile
                  </Link>
                  <button
                    type="button"
                    className="navbar-profile-option navbar-profile-logout"
                    onClick={handleLogout}
                  >
                    <LogOut size={18} />
                    Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link to="/login" className="navbar-login-link" onClick={() => setIsOpen(false)}>
              Log in
            </Link>
          )}
        </div>

        <div className="navbar-mobile-right">
          {user && (
            <Link to="/cart" className="navbar-cart-btn" onClick={() => setIsOpen(false)}>
              <ShoppingCart size={20} />
              {cartCount > 0 && <span className="navbar-cart-badge">{cartCount}</span>}
            </Link>
          )}
          <button
            type="button"
            className="navbar-theme-btn"
            onClick={toggleTheme}
            aria-label={theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'}
          >
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>
          <LanguageSelector />
          {user ? (
            <div className="navbar-profile-wrap navbar-profile-mobile">
              <button
                type="button"
                className="navbar-profile-avatar-btn"
                onClick={() => setProfileOpen((v) => !v)}
              >
                {user.profilePhoto ? (
                  <img src={user.profilePhoto} alt="Profile" className="navbar-profile-avatar" />
                ) : (
                  <div className="navbar-profile-avatar-placeholder">
                    <User size={20} />
                  </div>
                )}
              </button>
              {profileOpen && (
                <div className="navbar-profile-dropdown">
                  <div className="navbar-profile-header">
                    {user.profilePhoto ? (
                      <img src={user.profilePhoto} alt="Profile" className="navbar-dropdown-avatar" />
                    ) : (
                      <div className="navbar-dropdown-avatar-placeholder">
                        <User size={24} />
                      </div>
                    )}
                    <div className="navbar-profile-info">
                      <span className="navbar-profile-name">{user.name}</span>
                      <span className="navbar-profile-email">{user.email}</span>
                    </div>
                  </div>
                  <div className="navbar-profile-divider"></div>
                  <Link
                    to="/profile"
                    className="navbar-profile-option"
                    onClick={() => { setProfileOpen(false); setIsOpen(false); }}
                  >
                    <User size={18} />
                    View Profile
                  </Link>
                  <button
                    type="button"
                    className="navbar-profile-option navbar-profile-logout"
                    onClick={handleLogout}
                  >
                    <LogOut size={18} />
                    Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link to="/login" className="navbar-login-link" onClick={() => setIsOpen(false)}>
              Log in
            </Link>
          )}

          <button
            onClick={() => setIsOpen(!isOpen)}
            className="navbar-mobile-toggle"
            aria-label="Toggle menu"
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown */}
      <div className={`navbar-mobile-menu ${isOpen ? 'navbar-mobile-menu-open' : ''}`}>
        <Link to="/" className="navbar-mobile-link" onClick={() => setIsOpen(false)}>Home</Link>
        <Link to="/advisory" className="navbar-mobile-link" onClick={() => setIsOpen(false)}>AI Advisory</Link>
        <Link to="/marketplace" className="navbar-mobile-link" onClick={() => setIsOpen(false)}>Marketplace</Link>
        <Link to="/disease-scan" className="navbar-mobile-link" onClick={() => setIsOpen(false)}>Disease Scan</Link>
        <Link to="/weather" className="navbar-mobile-link" onClick={() => setIsOpen(false)}>Weather</Link>
        {user ? (
          <>
            <Link to="/profile" className="navbar-mobile-link" onClick={() => setIsOpen(false)}>Profile</Link>
            <button type="button" className="navbar-mobile-link navbar-mobile-logout" onClick={handleLogout}>
              Logout
            </button>
          </>
        ) : (
          <Link to="/login" className="navbar-mobile-link" onClick={() => setIsOpen(false)}>Log in</Link>
        )}
      </div>
    </nav>
  );
}
