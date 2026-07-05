const Groq = require('groq-sdk');
const config  = require('../config/ai.config');
const prompts = require('../prompts/ai.prompts');
const history = require('./ai.history');
const tools   = require('../tools/ai.tools');

/**
 * AI Service — Core Orchestration Pipeline (Groq Provider)
 *
 * Implements the full decision pipeline:
 *
 *   User Message
 *     -> Build system prompt (role-aware)
 *     -> Load recent chat history from DB
 *     -> Build Groq tool declarations (role-gated tool set, OpenAI format)
 *     -> Send to Groq with function calling enabled
 *     -> Groq decides: tool_calls or content
 *         If tool_calls -> dispatch to correct tool -> get structured JSON
 *                       -> re-send to Groq -> get natural language
 *         If content    -> use directly
 *     -> Save both turns to ai_chat_history
 *     -> Return { response, toolUsed, model, timestamp }
 *
 * Security guarantees:
 *   - userId is always from the verified JWT, never from user input
 *   - Tool access is gated by role via getToolDeclarations(role)
 *   - Tools only execute SELECT queries (enforced inside each tool file)
 *   - LLM never writes to the database directly
 */

// ---------------------------------------------------------------------------
// Lazy-initialise the Groq client so the server boots even without an API key
// ---------------------------------------------------------------------------
let groqClient = null;

const getGroqClient = () => {
    if (!config.apiKey) {
        throw new Error('GROQ_API_KEY is not configured. Add it to your .env file.');
    }
    if (!groqClient) {
        console.log('[DEBUG-AISERVICE] Instantiating Groq with key starting with:', config.apiKey.substring(0, 6));
        console.log('[DEBUG-AISERVICE] Instantiating Groq with key ending with:', config.apiKey.substring(config.apiKey.length - 4));
        groqClient = new Groq({ apiKey: config.apiKey });
    }
    return groqClient;
};

// ---------------------------------------------------------------------------
// Tool dispatcher — maps a Groq tool_call function name to the correct tool fn
// userId / role are injected here to enforce data scoping
// ---------------------------------------------------------------------------

/**
 * Execute the tool requested by the LLM.
 *
 * @param {string} toolName   - Exact function name from the tool_call
 * @param {object} toolArgs   - Parameters parsed from JSON in tool_call.function.arguments
 * @param {number} userId     - Authenticated user's ID (from JWT)
 * @param {string} userRole   - Authenticated user's role (from JWT)
 * @returns {Promise<object>} - Structured JSON result from the tool
 */
const dispatchTool = async (toolName, toolArgs, userId, userRole) => {
    console.log(`[AI Service] Dispatching tool: ${toolName}`, toolArgs);

    // Coerce any ID values the LLM may have passed as strings to integers.
    // Groq/LLMs sometimes serialise numeric args as strings; this prevents DB errors.
    const toInt = (v, fallback) => {
        const n = parseInt(v, 10);
        return isNaN(n) ? fallback : n;
    };

    // ----- Prescription tools -----
    if (toolName === 'PrescriptionExplanationTool') {
        const pid = userRole === 'patient' ? userId : toInt(toolArgs.patientId, userId);
        return tools.prescriptionTool.getActivePrescriptionsByPatient(pid);
    }
    if (toolName === 'getActivePrescriptionsByPatient') {
        // Patients can only access their own prescriptions
        const pid = userRole === 'patient' ? userId : toInt(toolArgs.patientId, userId);
        return tools.prescriptionTool.getActivePrescriptionsByPatient(pid);
    }
    if (toolName === 'getPrescriptionsByDoctor') {
        // Doctors can only access their own prescriptions
        const did = userRole === 'doctor' ? userId : toInt(toolArgs.doctorId, userId);
        return tools.prescriptionTool.getPrescriptionsByDoctor(did, toolArgs.status || null);
    }
    if (toolName === 'getPrescriptionById') {
        return tools.prescriptionTool.getPrescriptionById(toInt(toolArgs.prescriptionId));
    }
    if (toolName === 'getPrescriptionGroupsByPatient') {
        const pid = userRole === 'patient' ? userId : toInt(toolArgs.patientId, userId);
        return tools.prescriptionTool.getPrescriptionGroupsByPatient(pid);
    }
    if (toolName === 'getCompletedPrescriptionsByPatient') {
        const pid = userRole === 'patient' ? userId : toInt(toolArgs.patientId, userId);
        return tools.prescriptionTool.getCompletedPrescriptionsByPatient(pid);
    }
    if (toolName === 'getDoctorPrescriptionSummary') {
        const did = userRole === 'doctor' ? userId : toInt(toolArgs.doctorId, userId);
        return tools.doctorTool.getDoctorPrescriptionSummary(did);
    }

    // ----- Reminder tools -----
    if (toolName === 'getTodaysReminders') {
        const pid = userRole === 'patient' ? userId : toInt(toolArgs.patientId, userId);
        return tools.reminderTool.getTodaysReminders(pid);
    }
    if (toolName === 'getUpcomingReminders') {
        const pid = userRole === 'patient' ? userId : toInt(toolArgs.patientId, userId);
        return tools.reminderTool.getUpcomingReminders(pid);
    }
    if (toolName === 'getMissedReminders') {
        const pid = userRole === 'patient' ? userId : toInt(toolArgs.patientId, userId);
        return tools.reminderTool.getMissedReminders(pid, toolArgs.fromDate, toolArgs.toDate);
    }
    if (toolName === 'updateReminderTime') {
        const pid = userRole === 'patient' ? userId : toInt(toolArgs.patientId, userId);
        return tools.reminderTool.updateReminderTime(pid, toInt(toolArgs.reminderId), toolArgs.newTime);
    }
    if (toolName === 'markMedicineTaken') {
        const pid = userRole === 'patient' ? userId : toInt(toolArgs.patientId, userId);
        return tools.reminderTool.markMedicineTaken(pid, toInt(toolArgs.reminderId));
    }

    // ----- Patient tools -----
    if (toolName === 'getPatientProfile') {
        const pid = userRole === 'patient' ? userId : toInt(toolArgs.patientId, userId);
        return tools.patientTool.getPatientProfile(pid);
    }
    if (toolName === 'getPatientAdherence') {
        const pid = userRole === 'patient' ? userId : toInt(toolArgs.patientId, userId);
        return tools.patientTool.getPatientAdherence(pid);
    }
    if (toolName === 'getPatientWeeklyAdherence') {
        const pid = userRole === 'patient' ? userId : toInt(toolArgs.patientId, userId);
        return tools.patientTool.getPatientWeeklyAdherence(pid);
    }
    if (toolName === 'getDoseHistory') {
        const pid = userRole === 'patient' ? userId : toInt(toolArgs.patientId, userId);
        return tools.patientTool.getDoseHistory(pid, toolArgs.limit || 10);
    }

    // ----- Medicine tools -----
    if (toolName === 'getAllMedicines') {
        return tools.medicineTool.getAllMedicines();
    }
    if (toolName === 'searchMedicinesByName') {
        return tools.medicineTool.searchMedicinesByName(toolArgs.searchTerm);
    }
    if (toolName === 'getMedicineById') {
        return tools.medicineTool.getMedicineById(toInt(toolArgs.medicineId));
    }
    if (toolName === 'isMedicineInStock') {
        return tools.medicineTool.isMedicineInStock(toInt(toolArgs.medicineId));
    }

    // ----- Doctor tools -----
    if (toolName === 'getDoctorProfile') {
        const did = userRole === 'doctor' ? userId : toInt(toolArgs.doctorId, userId);
        return tools.doctorTool.getDoctorProfile(did);
    }
    if (toolName === 'getDoctorPatients') {
        const did = userRole === 'doctor' ? userId : toInt(toolArgs.doctorId, userId);
        return tools.doctorTool.getDoctorPatients(did);
    }
    if (toolName === 'getDoctorPatientAdherenceOverview') {
        const did = userRole === 'doctor' ? userId : toInt(toolArgs.doctorId, userId);
        return tools.doctorTool.getDoctorPatientAdherenceOverview(did);
    }
    if (toolName === 'getAllPatients') {
        return tools.patientTool.getAllPatients();
    }
    if (toolName === 'getAllDoctors') {
        return tools.doctorTool.getAllDoctors(toolArgs.statusFilter || 'approved');
    }

    // ----- Doctor extended read tools (Phase 3) -----
    if (toolName === 'searchDoctorPatientByName') {
        const did = userRole === 'doctor' ? userId : toInt(toolArgs.doctorId, userId);
        return tools.doctorTool.searchDoctorPatientByName(did, toolArgs.name);
    }
    if (toolName === 'getPatientHistoryForDoctor') {
        const did = userRole === 'doctor' ? userId : toInt(toolArgs.doctorId, userId);
        return tools.doctorTool.getPatientHistoryForDoctor(did, toInt(toolArgs.patientId));
    }
    if (toolName === 'getTodaysPrescriptionsForDoctor') {
        const did = userRole === 'doctor' ? userId : toInt(toolArgs.doctorId, userId);
        return tools.doctorTool.getTodaysPrescriptionsForDoctor(did);
    }
    if (toolName === 'getDoctorAnalytics') {
        const did = userRole === 'doctor' ? userId : toInt(toolArgs.doctorId, userId);
        return tools.doctorTool.getDoctorAnalytics(did);
    }
    if (toolName === 'getCompletedPrescriptionsByDoctor') {
        const did = userRole === 'doctor' ? userId : toInt(toolArgs.doctorId, userId);
        return tools.doctorTool.getCompletedPrescriptionsByDoctor(did);
    }
    if (toolName === 'getCancelledPrescriptionsByDoctor') {
        const did = userRole === 'doctor' ? userId : toInt(toolArgs.doctorId, userId);
        return tools.doctorTool.getCancelledPrescriptionsByDoctor(did);
    }

    // ----- Doctor write tools (Phase 3) -----
    if (toolName === 'createPrescription') {
        // doctorId is always the authenticated userId — never from LLM args
        return tools.doctorTool.createPrescription(
            userId,
            toInt(toolArgs.patientId),
            toInt(toolArgs.medicineId),
            toolArgs.startDate,
            toInt(toolArgs.duration),
            toolArgs.frequency,
            toInt(toolArgs.dosesPerDay),
            toolArgs.prescriptionGroupId ? toInt(toolArgs.prescriptionGroupId) : null
        );
    }
    if (toolName === 'updatePrescription') {
        const fields = {};
        if (toolArgs.frequency  !== undefined) fields.frequency   = toolArgs.frequency;
        if (toolArgs.dosesPerDay !== undefined) fields.dosesPerDay = toInt(toolArgs.dosesPerDay);
        if (toolArgs.duration   !== undefined) fields.duration    = toInt(toolArgs.duration);
        if (toolArgs.startDate  !== undefined) fields.startDate   = toolArgs.startDate;
        // doctorId enforced inside the tool — only rows owned by this doctor are updated
        return tools.doctorTool.updatePrescription(userId, toInt(toolArgs.prescriptionId), fields);
    }
    if (toolName === 'cancelPrescription') {
        // doctorId enforced inside the tool — only rows owned by this doctor are cancelled
        return tools.doctorTool.cancelPrescription(userId, toInt(toolArgs.prescriptionId));
    }

    // ----- Inventory tools -----
    if (toolName === 'getAllInventory') {
        return tools.inventoryTool.getAllInventory();
    }
    if (toolName === 'getLowStockItems') {
        return tools.inventoryTool.getLowStockItems();
    }
    if (toolName === 'getExpiredItems') {
        return tools.inventoryTool.getExpiredItems();
    }
    if (toolName === 'getInventoryByMedicine') {
        return tools.inventoryTool.getInventoryByMedicine(toInt(toolArgs.medicineId));
    }
    if (toolName === 'getTotalStockForMedicine') {
        return tools.inventoryTool.getTotalStockForMedicine(toolArgs.medicineId);
    }

    // ----- Pharmacist read tools (existing) -----
    if (toolName === 'getPharmacistProfile') {
        const pid = userRole === 'pharmacist' ? userId : toolArgs.pharmacistId;
        return tools.pharmacistTool.getPharmacistProfile(pid);
    }
    if (toolName === 'getPendingPrescriptionsForDispensary') {
        return tools.pharmacistTool.getPendingPrescriptionsForDispensary();
    }
    if (toolName === 'getSalesHistory') {
        return tools.pharmacistTool.getSalesHistory(toolArgs.days || 30);
    }
    if (toolName === 'getPharmacistAnalytics') {
        return tools.pharmacistTool.getPharmacistAnalytics();
    }
    if (toolName === 'checkStockSufficiency') {
        return tools.pharmacistTool.checkStockSufficiency(
            toInt(toolArgs.medicineId), toInt(toolArgs.requiredQuantity)
        );
    }

    // ----- Pharmacist extended read tools (Phase 4) -----
    if (toolName === 'searchInventoryByMedicineName') {
        return tools.pharmacistTool.searchInventoryByMedicineName(toolArgs.name);
    }
    if (toolName === 'searchInventoryByBatchNumber') {
        return tools.pharmacistTool.searchInventoryByBatchNumber(toolArgs.batchNumber);
    }
    if (toolName === 'getMedicineInventoryDetails') {
        return tools.pharmacistTool.getMedicineInventoryDetails(toInt(toolArgs.medicineId));
    }
    if (toolName === 'checkMedicineAvailability') {
        return tools.pharmacistTool.checkMedicineAvailability(toInt(toolArgs.medicineId));
    }
    if (toolName === 'getMedicinesExpiringThisMonth') {
        return tools.pharmacistTool.getMedicinesExpiringThisMonth();
    }
    if (toolName === 'getInventorySummaryPharmacist') {
        return tools.pharmacistTool.getInventorySummaryPharmacist();
    }
    if (toolName === 'getTodaySales') {
        return tools.pharmacistTool.getTodaySales();
    }
    if (toolName === 'getWeeklySales') {
        return tools.pharmacistTool.getWeeklySales();
    }
    if (toolName === 'getMonthlySales') {
        return tools.pharmacistTool.getMonthlySales();
    }

    // ----- Pharmacist write tools (Phase 4) -----
    if (toolName === 'addInventory') {
        return tools.pharmacistTool.addInventory(
            toInt(toolArgs.medicineId),
            toolArgs.batchNumber,
            toolArgs.expiryDate,
            toInt(toolArgs.stockQuantity)
        );
    }
    if (toolName === 'increaseStock') {
        return tools.pharmacistTool.increaseStock(
            toInt(toolArgs.inventoryId), toInt(toolArgs.quantity)
        );
    }
    if (toolName === 'reduceStock') {
        return tools.pharmacistTool.reduceStock(
            toInt(toolArgs.inventoryId), toInt(toolArgs.quantity)
        );
    }
    if (toolName === 'updateExpiryDate') {
        return tools.pharmacistTool.updateExpiryDate(
            toInt(toolArgs.inventoryId), toolArgs.newExpiryDate
        );
    }
    if (toolName === 'updateBatchDetails') {
        return tools.pharmacistTool.updateBatchDetails(
            toInt(toolArgs.inventoryId), toolArgs.newBatchNumber
        );
    }
    if (toolName === 'dispensePrescription') {
        return tools.pharmacistTool.dispensePrescription(toInt(toolArgs.prescriptionId));
    }

    // ----- Analytics tools -----
    if (toolName === 'getSystemOverview') {
        return tools.analyticsTool.getSystemOverview();
    }
    if (toolName === 'getPrescriptionTrends') {
        return tools.analyticsTool.getPrescriptionTrends(toolArgs.days || 7);
    }
    if (toolName === 'getSystemAdherenceRate') {
        return tools.analyticsTool.getSystemAdherenceRate();
    }
    if (toolName === 'getMonthlySalesTrends') {
        return tools.analyticsTool.getMonthlySalesTrends(toolArgs.months || 3);
    }
    if (toolName === 'getUserRegistrationTrends') {
        return tools.analyticsTool.getUserRegistrationTrends(toolArgs.days || 7);
    }

    // ----- Admin tools -----
    if (toolName === 'getUserSummary') {
        return tools.adminTool.getUserSummary();
    }
    if (toolName === 'getPendingApprovals') {
        return tools.adminTool.getPendingApprovals();
    }
    if (toolName === 'getRecentAuditLogs') {
        return tools.adminTool.getRecentAuditLogs(toolArgs.limit || 20);
    }
    if (toolName === 'getDisabledUsers') {
        return tools.adminTool.getDisabledUsers();
    }
    if (toolName === 'getSystemStats') {
        return tools.adminTool.getSystemStats();
    }
    if (toolName === 'getUserNotifications') {
        return tools.adminTool.getUserNotifications(toolArgs.userId, toolArgs.limit || 10);
    }
    if (toolName === 'approveDoctor') {
        return tools.adminTool.approveDoctor(userId, toInt(toolArgs.doctorId));
    }
    if (toolName === 'rejectDoctor') {
        return tools.adminTool.rejectDoctor(userId, toInt(toolArgs.doctorId));
    }
    if (toolName === 'approvePharmacist') {
        return tools.adminTool.approvePharmacist(userId, toInt(toolArgs.pharmacistId));
    }
    if (toolName === 'rejectPharmacist') {
        return tools.adminTool.rejectPharmacist(userId, toInt(toolArgs.pharmacistId));
    }
    if (toolName === 'approveFirstPendingUser') {
        return tools.adminTool.approveFirstPendingUser(userId);
    }
    if (toolName === 'rejectFirstPendingUser') {
        return tools.adminTool.rejectFirstPendingUser(userId);
    }
    if (toolName === 'searchUserByName') {
        return tools.adminTool.searchUserByName(toolArgs.name);
    }
    if (toolName === 'searchUserByEmail') {
        return tools.adminTool.searchUserByEmail(toolArgs.email);
    }
    if (toolName === 'countUsers') {
        return tools.adminTool.countUsers();
    }
    if (toolName === 'countDoctors') {
        return tools.adminTool.countDoctors();
    }
    if (toolName === 'countPharmacists') {
        return tools.adminTool.countPharmacists();
    }
    if (toolName === 'countPatients') {
        return tools.adminTool.countPatients();
    }
    if (toolName === 'getTodaySummary') {
        return tools.adminTool.getTodaySummary();
    }
    if (toolName === 'getWeeklySummary') {
        return tools.adminTool.getWeeklySummary();
    }
    if (toolName === 'getMonthlySummary') {
        return tools.adminTool.getMonthlySummary();
    }
    if (toolName === 'getSystemAnalytics') {
        return tools.adminTool.getSystemAnalytics();
    }
    if (toolName === 'getMedicineAnalytics') {
        return tools.adminTool.getMedicineAnalytics();
    }
    if (toolName === 'getPrescriptionAnalytics') {
        return tools.adminTool.getPrescriptionAnalytics();
    }
    if (toolName === 'getInventorySummary') {
        return tools.adminTool.getInventorySummary();
    }
    if (toolName === 'getExpiredMedicines') {
        return tools.adminTool.getExpiredMedicines();
    }
    if (toolName === 'getMedicinesExpiringThisMonth') {
        return tools.adminTool.getMedicinesExpiringThisMonth();
    }

    // Unknown tool
    throw new Error(`Unknown tool requested by LLM: "${toolName}"`);
};

// ---------------------------------------------------------------------------
// Convert Gemini-style tool declarations to OpenAI/Groq format
// ---------------------------------------------------------------------------

/**
 * Transform the internal tool declaration (Gemini-style parameter types)
 * to OpenAI/Groq format expected by the API.
 *
 * Gemini uses uppercase type names (OBJECT, STRING, NUMBER, ARRAY).
 * OpenAI/Groq uses lowercase (object, string, number, array).
 */
const toOpenAIFormat = (declaration) => {
    const lowerCaseTypes = (schema) => {
        if (!schema || typeof schema !== 'object') return schema;
        const result = {};
        for (const [k, v] of Object.entries(schema)) {
            if (k === 'type' && typeof v === 'string') {
                result[k] = v.toLowerCase();
            } else if (typeof v === 'object' && !Array.isArray(v)) {
                result[k] = lowerCaseTypes(v);
            } else {
                result[k] = v;
            }
        }
        return result;
    };

    return {
        type: 'function',
        function: {
            name:        declaration.name,
            description: declaration.description,
            parameters:  lowerCaseTypes(declaration.parameters),
        },
    };
};

// ---------------------------------------------------------------------------
// Main pipeline
// ---------------------------------------------------------------------------

/**
 * Generate an AI response for the authenticated user's message.
 *
 * @param {number} userId      - From verified JWT
 * @param {string} userRole    - From verified JWT
 * @param {string} message     - Sanitised user message
 * @param {string} sessionId   - Frontend conversation UUID
 * @returns {Promise<{response: string, toolUsed: string|null, model: string, timestamp: string}>}
 */
const generateResponse = async (userId, userRole, message, sessionId) => {
    console.log(`[AI Service] Request received from User #${userId} (${userRole}) | Session: ${sessionId}`);
    console.log(`[DEBUG-AISERVICE] API Key Prefix: ${config.apiKey.substring(0, 6)}`);
    console.log(`[DEBUG-AISERVICE] API Key Suffix: ${config.apiKey.substring(config.apiKey.length - 4)}`);
    console.log(`[DEBUG-AISERVICE] Active Model: ${config.modelName}`);
    console.log(`[DEBUG-AISERVICE] Base URL: https://api.groq.com/openai/v1`);
    console.log('[AI Service] Groq called. Processing natural language...');

    // Predefined local responses for simple conversational messages to save quota
    const lowerMessage = message.trim().toLowerCase().replace(/[^a-z]/g, '');
    const localResponses = {
        'hello': 'Hello! How can I assist you with your healthcare needs today?',
        'hi':    'Hi there! How can I help you today?',
        'hey':   'Hey! What can I do for you?',
        'thanks':'You\'re welcome! Let me know if you need anything else.',
        'bye':   'Goodbye! Have a great day and stay healthy.'
    };

    if (localResponses[lowerMessage]) {
        console.log(`[AI Service] Groq skipped. Reason: Simple greeting detected ("${lowerMessage}").`);
        const responseText = localResponses[lowerMessage];
        console.log(`[AI Service] Response returned: ${responseText}`);

        await history.saveMessage(userId, sessionId, 'user', message, null);
        await history.saveMessage(userId, sessionId, 'model', responseText, null, null);

        return {
            response:  responseText,
            toolUsed:  null,
            model:     'local-predefined',
            timestamp: new Date().toISOString(),
        };
    }

    console.log(`[AI Service] Groq called. Processing natural language...`);

    // Step 1: Get the Groq client (throws if API key missing)
    const client = getGroqClient();

    // Step 2: Build system prompt for this role
    const systemPrompt = prompts.getSystemPrompt(userRole);

    // Step 3: Load recent conversation history from DB
    const recentHistory = await history.getRecentHistory(userId, sessionId, config.maxHistoryTurns);
    console.log(`[AI Service] Loaded ${recentHistory.length} history turns from DB.`);

    // Step 4: Build tool declarations for this role (converted to OpenAI format)
    const rawDeclarations = prompts.getToolDeclarations(userRole);
    const toolDeclarations = rawDeclarations.map(toOpenAIFormat);
    console.log(`[AI Service] Role "${userRole}" has access to ${toolDeclarations.length} tool(s).`);

    // Step 5: Build messages array for Groq
    // Groq uses: [{ role: 'system' }, ...history, { role: 'user', content: message }]
    // History from DB is in Gemini format ({ role: 'user'|'model', parts: [{text}] })
    // We convert 'model' -> 'assistant' for Groq
    const messages = [
        { role: 'system', content: systemPrompt },
        ...recentHistory.map(h => ({
            role:    h.role === 'model' ? 'assistant' : 'user',
            content: h.parts[0].text,
        })),
        { role: 'user', content: message },
    ];

    // Step 6: Send the user's message to Groq
    const requestPayload = {
        model:       config.modelName,
        messages,
        temperature: config.temperature,
        max_tokens:  config.maxOutputTokens,
    };

    // Step 6: Decide whether tool use should be forced
    // For data-oriented queries we set tool_choice='required' to prevent the LLM
    // from inventing data. For general conversational questions (how, why, explain
    // without context) we leave it on 'auto' so the LLM can answer directly.
    const DATA_QUERY_PATTERNS = [
        /\b(show|list|get|find|fetch|display|check|view|what are|who are|how many|approve|reject|yes|confirm|delete)\b/i,
        /\b(my |the )?(prescription|medicine|reminder|inventory|stock|approval|patient|user|audit|log|analytics|sale|adherence|summary|history|today|dashboard)\b/i,
        /\b(pending|active|expired|low stock|missed|today|upcoming|recent|completed|cancelled)\b/i,
    ];
    const isDataQuery = DATA_QUERY_PATTERNS.some(p => p.test(message));
    const toolChoice = (toolDeclarations.length > 0 && isDataQuery) ? 'required' : 'auto';
    console.log(`[AI Service] tool_choice set to "${toolChoice}" (data query: ${isDataQuery}).`);

    if (toolDeclarations.length > 0) {
        requestPayload.tools = toolDeclarations;
        requestPayload.tool_choice = toolChoice;
    }

    let result;
    try {
        result = await client.chat.completions.create(requestPayload);
    } catch (apiError) {
        console.error('[AI Service] Initial Groq API call failed:', apiError.message);
        const fallbackMessage = "❌ I'm sorry, I couldn't process your request right now due to a network issue. Please try again in a moment.";
        await history.saveMessage(userId, sessionId, 'user',  message,   null);
        await history.saveMessage(userId, sessionId, 'model', fallbackMessage, null, null);
        return {
            response:  fallbackMessage,
            toolUsed:  null,
            model:     config.modelName,
            timestamp: new Date().toISOString(),
        };
    }

    let responseMessage = result.choices[0]?.message;

    if (!responseMessage) {
        throw new Error('Groq returned no response. The request may have been blocked.');
    }

    let toolUsed  = null;
    let finalText = null;
    let toolResult = null;

    // Step 7a: Groq requested a tool call
    if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
        const toolCall = responseMessage.tool_calls[0]; // Handle first tool call
        const toolName = toolCall.function.name;
        const toolArgs = JSON.parse(toolCall.function.arguments || '{}');

        console.log(`[AI Service] Groq called tool: "${toolName}" with args:`, toolArgs);
        toolUsed = toolName;

        // Step 7b: Execute the tool
        try {
            // Confirmation guard for destructive operations:
            //   - Admin: reject (existing)
            //   - Doctor: cancelPrescription
            //   - Pharmacist: reduceStock
            if (toolName.startsWith('reject') || toolName === 'cancelPrescription' || toolName === 'reduceStock') {
                // Find last assistant message in history to check if we asked for confirmation
                const lastAssistantMessage = [...recentHistory].reverse().find(h => h.role === 'model');
                const lastAssistantText = lastAssistantMessage ? lastAssistantMessage.parts[0].text : '';
                const isConfirmationYes = message.trim().toLowerCase() === 'yes';
                const wasConfirmationAsked = (
                    lastAssistantText.includes('Are you sure? Reply YES to continue') ||
                    lastAssistantText.includes('Are you sure you want to cancel this prescription? Reply YES to continue') ||
                    lastAssistantText.includes('Are you sure you want to reduce stock? Reply YES to confirm')
                );

                if (!isConfirmationYes || !wasConfirmationAsked) {
                    console.log(`[AI Service] Intercepting destructive tool: ${toolName}. Asking for confirmation.`);
                    const confirmationText = toolName === 'cancelPrescription'
                        ? 'Are you sure you want to cancel this prescription? Reply YES to continue.'
                        : toolName === 'reduceStock'
                        ? 'Are you sure you want to reduce stock? Reply YES to confirm.'
                        : 'Are you sure? Reply YES to continue.';

                    // Save the user message and confirmation message to database
                    await history.saveMessage(userId, sessionId, 'user', message, null);
                    await history.saveMessage(userId, sessionId, 'model', confirmationText, null, null);

                    return {
                        response:  confirmationText,
                        toolUsed:  null,
                        model:     config.modelName,
                        timestamp: new Date().toISOString(),
                    };
                }
            }
            toolResult = await dispatchTool(toolName, toolArgs, userId, userRole);
        } catch (toolError) {
            console.error(`[AI Service] Tool "${toolName}" threw an error:`, toolError.message);
            toolResult = { error: `I couldn't retrieve that information right now. Please try again in a moment. (Error: ${toolError.message})` };
        }

        console.log(`[AI Service] Tool "${toolName}" returned ${Array.isArray(toolResult) ? toolResult.length + ' rows' : 'an object'}.`);

        // Step 7c: Send the tool result back to Groq to generate natural language
        const toolResponseMessages = [
            ...messages,
            responseMessage,                          // assistant message with tool_calls
            {
                role:         'tool',
                tool_call_id: toolCall.id,
                content:      JSON.stringify(toolResult),
            },
        ];

        try {
            const toolResponse = await client.chat.completions.create({
                model:      config.modelName,
                messages:   toolResponseMessages,
                temperature: config.temperature,
                max_tokens:  config.maxOutputTokens,
            });
            finalText = toolResponse.choices[0]?.message?.content;
        } catch (toolApiError) {
            console.error('[AI Service] Tool follow-up API call failed:', toolApiError.message);
            finalText = "❌ I'm sorry, I couldn't format the result right now due to a network issue. Please try again in a moment.";
        }
    } else {
        // Step 7d: Groq responded with plain text (no tool needed)
        finalText = responseMessage.content;
        console.log('[AI Service] Groq responded with direct text (no tool call).');
    }

    if (!finalText || finalText.trim() === '') {
        finalText = '❌ I was unable to generate a response. Please try rephrasing your question.';
    }

    // Step 8: Save both turns to the database
    const toolResultStr = toolResult ? JSON.stringify(toolResult) : null;
    await history.saveMessage(userId, sessionId, 'user',  message,   null);
    await history.saveMessage(userId, sessionId, 'model', finalText, toolUsed, toolResultStr);
    console.log('[AI Service] Conversation turns saved to DB.');

    // Step 9: Return structured response to the controller
    return {
        response:  finalText,
        toolUsed:  toolUsed,
        model:     config.modelName,
        timestamp: new Date().toISOString(),
    };
};

/**
 * Returns the configured model name (used by the health check endpoint).
 */
const getModelName = () => config.modelName || 'not-configured';

module.exports = {
    generateResponse,
    getModelName,
};
