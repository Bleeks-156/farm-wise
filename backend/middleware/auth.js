const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    console.error('❌ FATAL: JWT_SECRET environment variable is not set!');
    process.exit(1);
}

/**
 * Authentication middleware - verifies JWT token and attaches user to req
 */
const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required'
            });
        }

        const token = authHeader.split(' ')[1];

        if (!token || token === 'null' || token === 'undefined') {
            return res.status(401).json({
                success: false,
                error: 'Invalid token format'
            });
        }

        // Verify token
        const decoded = jwt.verify(token, JWT_SECRET);

        // Find user and exclude password
        const user = await User.findById(decoded.id).select('-password');
        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'User no longer exists'
            });
        }

        // Check if password was changed after token was issued
        if (user.passwordChangedAt) {
            const changedTimestamp = parseInt(user.passwordChangedAt.getTime() / 1000, 10);
            if (decoded.iat < changedTimestamp) {
                return res.status(401).json({
                    success: false,
                    error: 'Password recently changed. Please log in again.'
                });
            }
        }

        // Attach user and token to request
        req.user = user;
        req.token = token;
        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                error: 'Invalid token'
            });
        }
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                error: 'Token expired. Please log in again.'
            });
        }
        console.error('Auth middleware error:', error);
        return res.status(500).json({
            success: false,
            error: 'Authentication failed'
        });
    }
};

/**
 * Role-based authorization middleware
 * @param  {...string} roles - Allowed roles
 */
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required'
            });
        }
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                error: 'You do not have permission to perform this action'
            });
        }
        next();
    };
};

module.exports = { authenticate, authorize };
