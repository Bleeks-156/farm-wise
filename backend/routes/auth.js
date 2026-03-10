const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');
const { sanitizeInput, validateRegistration, validateLogin, validateProfileUpdate } = require('../middleware/validate');
const { authLimiter, loginLimiter } = require('../middleware/rateLimiter');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = '7d';

if (!JWT_SECRET) {
  console.error('❌ FATAL: JWT_SECRET environment variable is not set!');
  process.exit(1);
}

// Generate JWT Token with additional claims
const generateToken = (userId) => {
  return jwt.sign(
    { id: userId, iat: Math.floor(Date.now() / 1000) },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
};

// ──────────────────────────────────────────────
// POST /api/auth/register
// ──────────────────────────────────────────────
router.post('/register',
  authLimiter,         // Rate limit registration attempts
  sanitizeInput,       // Prevent NoSQL injection
  validateRegistration, // Validate & sanitize fields
  async (req, res) => {
    try {
      const { name, email, password, phone, location } = req.body;

      // Check if user already exists (use generic message to prevent email enumeration)
      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          error: 'An account with this email already exists'
        });
      }

      // Create new user (always as 'user' role — admin cannot be created via registration)
      const user = new User({
        name,
        email: email.toLowerCase(),
        password,
        phone: phone || '',
        location: location || '',
        role: 'user'
      });

      await user.save();

      // Generate token
      const token = generateToken(user._id);

      res.status(201).json({
        success: true,
        message: 'Registration successful',
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone,
          location: user.location,
          profilePhoto: user.profilePhoto || ''
        }
      });

    } catch (error) {
      console.error('Registration error:', error);

      // Handle mongoose validation errors
      if (error.name === 'ValidationError') {
        const messages = Object.values(error.errors).map(err => err.message);
        return res.status(400).json({
          success: false,
          error: messages.join(', ')
        });
      }

      // Handle duplicate key error (race condition on unique email)
      if (error.code === 11000) {
        return res.status(400).json({
          success: false,
          error: 'An account with this email already exists'
        });
      }

      res.status(500).json({
        success: false,
        error: 'Registration failed. Please try again.'
      });
    }
  }
);

// ──────────────────────────────────────────────
// POST /api/auth/login
// ──────────────────────────────────────────────
router.post('/login',
  loginLimiter,   // Strict rate limit: 5 failed attempts per 15 min
  sanitizeInput,  // Prevent NoSQL injection
  validateLogin,  // Validate email/password presence
  async (req, res) => {
    try {
      const { email, password } = req.body;

      // Find user by email (include loginAttempts & lockUntil for lockout check)
      const user = await User.findOne({ email: email.toLowerCase() })
        .select('+password +loginAttempts +lockUntil');

      if (!user) {
        // Use generic message to prevent email enumeration
        return res.status(401).json({
          success: false,
          error: 'Invalid email or password'
        });
      }

      // Check if account is locked
      if (user.isLocked) {
        const remainingMs = user.lockUntil - Date.now();
        const remainingMin = Math.ceil(remainingMs / 60000);
        return res.status(423).json({
          success: false,
          error: `Account temporarily locked due to too many failed attempts. Please try again in ${remainingMin} minute(s).`
        });
      }

      // Check password
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        // Increment failed login attempts
        await user.incLoginAttempts();

        const attemptsLeft = 5 - (user.loginAttempts + 1);
        let errorMsg = 'Invalid email or password';
        if (attemptsLeft > 0 && attemptsLeft <= 2) {
          errorMsg += `. ${attemptsLeft} attempt(s) remaining before account lockout.`;
        }

        return res.status(401).json({
          success: false,
          error: errorMsg
        });
      }

      // Successful login — reset failed attempts
      await user.resetLoginAttempts();

      // Generate token
      const token = generateToken(user._id);

      res.json({
        success: true,
        message: 'Login successful',
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone,
          location: user.location,
          profilePhoto: user.profilePhoto || ''
        }
      });

    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        error: 'Login failed. Please try again.'
      });
    }
  }
);

// ──────────────────────────────────────────────
// GET /api/auth/me — Get current user (protected)
// ──────────────────────────────────────────────
router.get('/me', authenticate, async (req, res) => {
  try {
    res.json({
      success: true,
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        phone: req.user.phone,
        location: req.user.location,
        profilePhoto: req.user.profilePhoto || ''
      }
    });
  } catch (error) {
    console.error('Auth check error:', error);
    res.status(500).json({
      success: false,
      error: 'Authentication failed'
    });
  }
});

// ──────────────────────────────────────────────
// PUT /api/auth/profile — Update user profile (protected)
// ──────────────────────────────────────────────
router.put('/profile',
  authenticate,
  sanitizeInput,
  validateProfileUpdate,
  async (req, res) => {
    try {
      const user = await User.findById(req.user._id);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      const { name, phone, location } = req.body;

      // Update fields if provided
      if (name) user.name = name;
      if (phone !== undefined) user.phone = phone;
      if (location !== undefined) user.location = location;

      await user.save();

      res.json({
        success: true,
        message: 'Profile updated successfully',
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone,
          location: user.location,
          profilePhoto: user.profilePhoto || '',
          createdAt: user.createdAt
        }
      });

    } catch (error) {
      console.error('Profile update error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update profile'
      });
    }
  }
);

module.exports = router;
