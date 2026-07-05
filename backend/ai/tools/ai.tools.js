/**
 * AI Tools Index
 * Central registry of all domain-specific tools available to the AI Agent.
 * Each tool module exposes read-only database query functions.
 *
 * This file is used by ai.service.js to enumerate available tools
 * and by the LLM function-calling layer to dispatch tool executions.
 */

const prescriptionTool  = require('./prescriptionTool');
const reminderTool      = require('./reminderTool');
const inventoryTool     = require('./inventoryTool');
const medicineTool      = require('./medicineTool');
const analyticsTool     = require('./analyticsTool');
const patientTool       = require('./patientTool');
const doctorTool        = require('./doctorTool');
const pharmacistTool    = require('./pharmacistTool');
const adminTool         = require('./adminTool');

module.exports = {
    prescriptionTool,
    reminderTool,
    inventoryTool,
    medicineTool,
    analyticsTool,
    patientTool,
    doctorTool,
    pharmacistTool,
    adminTool
};
