/**
 * AI Utils
 * General utility helper functions shared across the AI module.
 */

/**
 * Trims and normalizes whitespace from a user input string.
 * @param {string} text
 * @returns {string}
 */
const cleanInput = (text) => {
    if (!text || typeof text !== 'string') return '';
    return text.trim().replace(/\s+/g, ' ');
};

/**
 * Estimates the approximate token count for a given text.
 * Uses a rough heuristic: ~4 characters per token (OpenAI/Google standard).
 * @param {string} text
 * @returns {number} Estimated token count
 */
const estimateTokenCount = (text) => {
    if (!text) return 0;
    return Math.ceil(text.length / 4);
};

/**
 * Formats conversation history into a readable debug string.
 * Useful for server-side logging during development.
 * @param {Array} history - Array of { role, parts } turn objects
 * @returns {string}
 */
const formatHistoryForLog = (history) => {
    if (!Array.isArray(history) || history.length === 0) return '[No history]';
    return history
        .map((turn, i) => `[${i + 1}] ${turn.role}: ${String(turn.parts).substring(0, 80)}...`)
        .join('\n');
};

/**
 * Truncates a string to a max length and appends an ellipsis.
 * @param {string} text
 * @param {number} maxLength
 * @returns {string}
 */
const truncate = (text, maxLength = 200) => {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
};

module.exports = {
    cleanInput,
    estimateTokenCount,
    formatHistoryForLog,
    truncate
};
