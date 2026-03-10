const { body, validationResult } = require('express-validator');

/**
 * Middleware to check validation results and return errors
 */
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const messages = errors.array().map(err => err.msg);
        return res.status(400).json({
            success: false,
            error: messages[0], // Return the first error for clean UX
            errors: messages     // Also provide all errors
        });
    }
    next();
};

/**
 * Sanitize string fields to prevent NoSQL injection
 * Strips any object/array values from string fields
 */
const sanitizeInput = (req, res, next) => {
    if (req.body) {
        for (const key of Object.keys(req.body)) {
            // Prevent NoSQL injection: reject objects where strings are expected
            if (typeof req.body[key] === 'object' && req.body[key] !== null) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid input format'
                });
            }
            // Trim all string values
            if (typeof req.body[key] === 'string') {
                req.body[key] = req.body[key].trim();
            }
        }
    }
    next();
};

/**
 * Validation rules for user registration
 */
const validateRegistration = [
    body('name')
        .notEmpty().withMessage('Name is required')
        .isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters')
        .matches(/^[a-zA-Z\s.'-]+$/).withMessage('Name contains invalid characters')
        .escape(),

    body('email')
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Please enter a valid email address')
        .normalizeEmail({ gmail_remove_dots: false }),

    body('password')
        .notEmpty().withMessage('Password is required')
        .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
        .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')
        .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
        .matches(/\d/).withMessage('Password must contain at least one number')
        .matches(/[!@#$%^&*(),.?":{}|<>]/).withMessage('Password must contain at least one special character'),

    body('phone')
        .optional({ values: 'falsy' })
        .matches(/^[+]?[\d\s()-]{7,20}$/).withMessage('Please enter a valid phone number'),

    body('location')
        .optional({ values: 'falsy' })
        .isLength({ max: 100 }).withMessage('Location must be under 100 characters')
        .escape(),

    handleValidationErrors
];

/**
 * Validation rules for user login
 */
const validateLogin = [
    body('email')
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Please enter a valid email address')
        .normalizeEmail({ gmail_remove_dots: false }),

    body('password')
        .notEmpty().withMessage('Password is required'),

    handleValidationErrors
];

/**
 * Validation rules for profile update
 */
const validateProfileUpdate = [
    body('name')
        .optional()
        .isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters')
        .matches(/^[a-zA-Z\s.'-]+$/).withMessage('Name contains invalid characters')
        .escape(),

    body('phone')
        .optional({ values: 'falsy' })
        .matches(/^[+]?[\d\s()-]{7,20}$/).withMessage('Please enter a valid phone number'),

    body('location')
        .optional({ values: 'falsy' })
        .isLength({ max: 100 }).withMessage('Location must be under 100 characters')
        .escape(),

    handleValidationErrors
];

module.exports = {
    sanitizeInput,
    validateRegistration,
    validateLogin,
    validateProfileUpdate,
    handleValidationErrors
};
