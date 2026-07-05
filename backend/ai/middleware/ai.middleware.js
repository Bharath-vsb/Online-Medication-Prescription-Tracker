const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

/**
 * AI Middleware: authenticateAI
 * Validates the JWT Bearer token and injects userId + userRole into the request context.
 * Kept separate from server.js middlewares to preserve module isolation.
 */
const authenticateAI = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.userId = decoded.userId;
        req.userRole = decoded.role;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
};

/**
 * AI Middleware: validateChatInput
 * Placeholder middleware to sanitize and validate incoming AI chat request bodies.
 * Additional input sanitization or rate-limiting logic can be added here.
 */
const validateChatInput = (req, res, next) => {
    const { message } = req.body;

    if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: 'A valid message string is required' });
    }

    if (message.trim().length === 0) {
        return res.status(400).json({ error: 'Message cannot be empty' });
    }

    if (message.length > 2000) {
        return res.status(400).json({ error: 'Message exceeds maximum length of 2000 characters' });
    }

    // Sanitize: trim whitespace
    req.body.message = message.trim();
    next();
};

module.exports = {
    authenticateAI,
    validateChatInput
};
