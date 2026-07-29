require('dotenv').config();

/**
 * AI Module Configuration — Groq Provider
 *
 * All AI-specific settings are defined here and read from environment variables.
 * The server will start without a valid API key but the AI module will return
 * a descriptive error rather than crashing.
 */

const config = {
    // -------------------------------------------------------------------------
    // Groq API
    // -------------------------------------------------------------------------

    /** Groq API key — set GROQ_API_KEY in your .env file */
    apiKey: process.env.GROQ_API_KEY || null,

    /** Model to use for generation.
     *  llama-3.3-70b-versatile  — fast, supports function calling
     *  llama-3.1-8b-instant     — lighter, faster, lower context
     *  mixtral-8x7b-32768       — Mixtral MoE model
     */
    modelName: process.env.GROQ_MODEL || 'openai/gpt-oss-120b',

    // -------------------------------------------------------------------------
    // Generation parameters
    // -------------------------------------------------------------------------

    /** Sampling temperature: 0 = deterministic, 1 = creative.
     *  Keep low for factual healthcare data responses. */
    temperature: parseFloat(process.env.AI_TEMPERATURE || '0.2'),

    /** Maximum tokens in a single AI response */
    maxOutputTokens: parseInt(process.env.AI_MAX_TOKENS || '1024', 10),

    // -------------------------------------------------------------------------
    // Conversation history
    // -------------------------------------------------------------------------

    /** Number of previous conversation turns to inject into each request.
     *  Higher = more context, higher token usage.
     *  Range: 2-20. Default: 10 (5 user + 5 model turns). */
    maxHistoryTurns: parseInt(process.env.AI_MAX_HISTORY_TURNS || '10', 10),

    // -------------------------------------------------------------------------
    // Module control
    // -------------------------------------------------------------------------

    /** Set to 'false' in .env to disable the AI module without removing code */
    enabled: process.env.AI_ENABLED !== 'false',
};

// Warn at startup if the API key is missing
if (!config.apiKey) {
    console.warn('[AI Config] GROQ_API_KEY is not set in .env -- AI module will return errors until configured.');
}

module.exports = config;
