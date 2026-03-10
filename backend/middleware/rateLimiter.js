const rateLimit = require('express-rate-limit');

/**
 * General API rate limiter — 100 requests per 15 minutes per IP
 */
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    message: {
        success: false,
        error: 'Too many requests. Please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * Strict auth rate limiter — 10 attempts per 15 minutes per IP
 * Protects login/register from brute force
 */
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10,
    message: {
        success: false,
        error: 'Too many authentication attempts. Please try again after 15 minutes.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false,
});

/**
 * Very strict login rate limiter — 5 failed attempts per 15 minutes
 * Only counts failed login attempts
 */
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5,
    message: {
        success: false,
        error: 'Too many failed login attempts. Your account has been temporarily locked. Please try again after 15 minutes.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true, // Only count failed attempts
});

module.exports = { generalLimiter, authLimiter, loginLimiter };
