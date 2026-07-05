const express = require('express');
const router = express.Router();

const aiController = require('../controllers/ai.controller');
const { authenticateAI, validateChatInput } = require('../middleware/ai.middleware');

/**
 * AI Routes
 * All routes are mounted under /api/ai (registered in backend/server.js).
 */

// ---- Public ----------------------------------------------------------------

// GET /api/ai/health — Module status and version check (no auth required)
router.get('/health', aiController.healthCheck);

// ---- Protected (JWT required) ----------------------------------------------

// POST /api/ai/chat — Send a message to the AI assistant
// Body: { message: string, sessionId: string }
router.post('/chat', authenticateAI, validateChatInput, aiController.handleChat);

// GET /api/ai/history — Retrieve conversation history for a session
// Query: ?sessionId=<uuid>
router.get('/history', authenticateAI, aiController.getHistory);

// DELETE /api/ai/history — Clear conversation history for a session
// Query: ?sessionId=<uuid>
router.delete('/history', authenticateAI, aiController.clearHistory);

module.exports = router;
