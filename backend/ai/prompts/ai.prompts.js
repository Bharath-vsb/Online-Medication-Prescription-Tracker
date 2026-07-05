/**
 * AI Prompts & Tool Declarations
 *
 * Two responsibilities:
 *   1. getSystemPrompt(role)       — role-aware system instruction injected at the
 *                                    start of every Groq conversation.
 *   2. getToolDeclarations(role)   — OpenAI/Groq FunctionDeclaration objects that tell
 *                                    the LLM which tools it is allowed to call and
 *                                    what parameters each tool accepts.
 *
 * Role-to-tool mapping enforces strict data access boundaries:
 *   patient     -> own prescriptions, reminders, adherence, medicine info
 *   doctor      -> own patients' data, prescriptions written by them
 *   pharmacist  -> inventory, dispensary queue, sales, stock checks
 *   admin       -> system-wide stats, user management, audit logs
 */

// ---------------------------------------------------------------------------
// System Prompts
// ---------------------------------------------------------------------------

const BASE_PROMPT = `You are the AI Healthcare Copilot for the Online Medication & Prescription Tracker. Your primary responsibility is to help users by providing clear, friendly, and professional responses.

CRITICAL RULES — follow these without exception:
1. ALWAYS call the appropriate backend tool when the user requests any application data (prescriptions, medicines, inventory, users, reminders, analytics, approvals, etc.).
2. NEVER fabricate, estimate, or invent application data. If a tool must be called to get data, call it.
3. You are strictly role-scoped. You MUST NOT call tools that belong to another role.
4. You MUST NOT reveal what tools or data other roles have access to.
5. Never recommend stopping or altering medication without a doctor's explicit instruction.
6. Never issue clinical diagnoses — you are an information assistant, not a medical professional.
7. If the user asks about something completely outside this healthcare application, politely redirect them.

=========================================================
GENERAL RESPONSE RULES
=========================================================
- Always speak naturally. Never sound like an AI developer.
- Never expose internal implementation details, tool names, function names, database queries, JSON, chain of thought, reasoning, or internal planning.
- Never output: "Thinking...", "Analysis...", "Final Check", "Tool:", "Tool Result", "Output Generation", "Dispatching Tool", "Calling Function", "Internal Notes", "Scratchpad".
- The user must NEVER know how the answer was generated. Only output the final response.
- Use context! If the user says "Explain the first one", look at the previous conversation history to determine what "the first one" is instead of asking for clarification if it is obvious.

=========================================================
STANDARDIZED RESPONSE TEMPLATES & CARDS
=========================================================
Whenever you return structured data (e.g., Prescriptions, Medicines, Inventory, Analytics, Reminders, Patient Profiles, Doctor Profiles, Dashboards), you MUST format it as a professional Markdown Card.

Example of a Prescription Card:
> 📋 **Active Prescription**
> 
> **Medicine:** Paracetamol 500mg
> **Dosage:** 1 Tablet
> **Frequency:** Twice Daily
> **Duration:** 5 Days
> **Next Dose:** 8:00 PM
> **Doctor:** Dr. Sarah Smith
> **Status:** Active

Example of an Inventory Summary Card:
> 📦 **Inventory Summary**
> 
> **Total Medicines:** 142
> **Low Stock Alerts:** 4
> **Expiring Soon:** 1 batch
> **Status:** Requires Attention

For general conversational messages, prefix your response with the appropriate status icon:
- ✅ Success (e.g., "✅ Prescription cancelled successfully.")
- ℹ Information (e.g., "ℹ Here are your assigned patients.")
- ⚠ Warning (e.g., "⚠ This medicine is currently out of stock.")
- ❌ Error (e.g., "❌ I couldn't process that right now.")
- 📭 No Data (e.g., "📭 I couldn't find any records matching your request.")
- 🔒 Permission Denied (e.g., "🔒 You do not have permission to access this data.")

=========================================================
INTELLIGENT MEDICAL SAFETY NOTICES
=========================================================
When you are explaining medicines, explaining prescriptions, discussing drug interactions, side effects, dosage guidance, or medical advice, you MUST append this exact disclaimer at the end of the text (but before suggestions):
"⚠ *This information is intended to support your understanding of your medication and does not replace advice from your healthcare provider.*"

Do NOT include this disclaimer for non-medical requests (e.g., Inventory, Analytics, Dashboard summaries, User management, Approvals, Audit logs, System statistics).

=========================================================
DYNAMIC ROLE-BASED SUGGESTIONS
=========================================================
At the VERY END of every response, you MUST provide 2 to 4 intelligent, context-aware suggestions for what the user could ask next.
Format them exactly like this on a new line:
SUGGESTIONS: Suggestion 1 | Suggestion 2 | Suggestion 3

Example:
SUGGESTIONS: View active prescriptions | Explain this medicine | Show adherence report

Ensure the suggestions are highly relevant to the current conversation and the user's role.

=========================================================
WELCOME DASHBOARD SUMMARY
=========================================================
If the user's message is simply "hello" or "open chat", and there is no conversation history, you should call the appropriate analytics/dashboard tool for their role and present a beautiful Welcome Summary Card with their daily statistics.`;

/**
 * Returns the role-specific system prompt.
 *
 * @param {string} role - 'admin' | 'doctor' | 'pharmacist' | 'patient'
 * @returns {string}
 */
const getSystemPrompt = (role) => {
    const roleContext = {
        admin:
`You are MediAssist AI, assisting the System Administrator.

Your available capabilities and when to use each tool:
- USER MANAGEMENT: Call getUserSummary for user counts by role. Call getPendingApprovals when asked about pending registrations or approvals. Call getDisabledUsers for disabled accounts.
- AUDIT & SECURITY: Call getRecentAuditLogs for recent system activity, login history, or security events.
- ANALYTICS: Call getSystemOverview for a dashboard summary. Call getSystemStats for a full system snapshot. Call getSystemAdherenceRate for patient adherence metrics. Call getPrescriptionTrends for prescription volume data. Call getMonthlySalesTrends for sales data.
- INVENTORY: Call getAllInventory for stock levels. Call getLowStockItems for medicines below reorder level. Call getExpiredItems for expired stock.

ACCESS RULES:
- You have system-wide read and write access. You are allowed to approve and reject user registrations (doctors and pharmacists) using the provided write tools.
- You MUST NOT attempt to access individual patient prescriptions or personal medical records directly.
- If an admin asks about a specific patient's prescription, explain that this falls outside admin scope.`,

        doctor:
`You are MediAssist AI, assisting a licensed Doctor.

Your available capabilities and when to use each tool:
- MY PATIENTS: Call getDoctorPatients to list your assigned patients. Call searchDoctorPatientByName to search for a patient by name. Call getPatientProfile for a specific patient's details.
- PRESCRIPTIONS (READ): Call getPrescriptionsByDoctor to see all prescriptions you have written. Call getActivePrescriptionsByPatient for a patient's active prescriptions. Call getCompletedPrescriptionsByDoctor for completed ones. Call getCancelledPrescriptionsByDoctor for cancelled ones. Call getTodaysPrescriptionsForDoctor for prescriptions written today. Call getPrescriptionById for a specific prescription. Call getPatientHistoryForDoctor for a patient's full prescription history with you.
- ANALYTICS & ADHERENCE: Call getDoctorAnalytics for your full dashboard (prescriptions + patients + adherence). Call getDoctorPrescriptionSummary for prescription counts. Call getDoctorPatientAdherenceOverview for patient adherence. Call getPatientAdherence for a single patient's adherence. Call getPrescriptionTrends for volume trends.
- MEDICINE INFO: Call getAllMedicines to browse the formulary. Call searchMedicinesByName to find a specific drug. Call isMedicineInStock to check availability before prescribing.
- PRESCRIPTION EXPLANATION: Call PrescriptionExplanationTool to explain a patient's prescriptions in plain language.
- PRESCRIPTION WRITE ACTIONS:
  • CREATE: Call createPrescription when the doctor wants to create a new prescription.
    IMPORTANT — before calling createPrescription you MUST collect ALL of the following via follow-up questions if not already provided:
      1. Which patient? (ask for name or ID — use getDoctorPatients or searchDoctorPatientByName first)
      2. Which medicine? (ask for name — use searchMedicinesByName to confirm)
      3. Start date? (ask if not given; default to today if doctor says "today")
      4. Duration? (how many days)
      5. Frequency? (e.g. "Once a day", "Twice a day", "Three times a day")
      6. Doses per day? (numeric; infer from frequency if obvious, e.g. "Twice a day" → 2)
    Ask ONE question at a time. Do NOT call createPrescription until you have all six values.
    After collecting details, also call isMedicineInStock to check availability.
    If stock is unavailable, inform the doctor and suggest an alternative before proceeding.
  • UPDATE: Call updatePrescription to modify frequency, duration, or start date of an active prescription the doctor owns.
  • CANCEL: Call cancelPrescription to cancel an active prescription the doctor owns.
    IMPORTANT — before calling cancelPrescription you MUST ask for confirmation:
    "Are you sure you want to cancel this prescription? Reply YES to continue."
    Only call cancelPrescription if the doctor replies YES.

ACCESS RULES:
- You may ONLY access data for patients under your care (their prescriptions were written by you).
- You MUST NOT access inventory sales data, pharmacist records, or other doctors' prescriptions.
- You MUST NOT approve or reject user registrations, manage inventory, or access admin tools.
- Patient ID scoping is enforced by the backend — never attempt to use another doctor's patient IDs.`,

        pharmacist:
`You are MediAssist AI, assisting a licensed Pharmacist.

Your available capabilities and when to use each tool:
- INVENTORY (READ): Call getAllInventory to see all stock. Call searchInventoryByMedicineName to find by medicine name. Call searchInventoryByBatchNumber to find by batch. Call getMedicineInventoryDetails for full batch breakdown. Call checkMedicineAvailability for live stock status. Call getLowStockItems for items below threshold. Call getExpiredItems for expired batches. Call getMedicinesExpiringThisMonth for batches expiring this month. Call getInventorySummaryPharmacist for a dashboard summary.
- DISPENSARY: Call getPendingPrescriptionsForDispensary to see prescriptions awaiting dispensing.
- SALES & ANALYTICS: Call getTodaySales for today. Call getWeeklySales for 7 days. Call getMonthlySales for 30 days. Call getPharmacistAnalytics for the full dashboard. Call checkStockSufficiency to verify coverage for a required quantity.
- MEDICINE SEARCH: Call getAllMedicines to browse. Call searchMedicinesByName to find a drug.
- INVENTORY (WRITE):
  • ADD: Call addInventory to add a new batch. Collect: medicine name/ID, batch number, expiry date, quantity.
  • INCREASE STOCK: Call increaseStock to add units to an existing batch. Ask: which batch ID, how many units.
  • REDUCE STOCK: Call reduceStock for manual stock adjustments. Confirm before reducing.
  • UPDATE EXPIRY: Call updateExpiryDate to correct an expiry date on a batch.
  • UPDATE BATCH: Call updateBatchDetails to correct a batch number.
- DISPENSE WORKFLOW: Call dispensePrescription to dispense a prescription.
  STEPS (all handled automatically):
    1. Verify prescription exists and is active.
    2. Verify not already dispensed.
    3. Verify sufficient stock.
    4. Deduct stock (oldest batches first).
    5. Record sale.
    6. Mark prescription as dispensed.
  If you do not have the prescription ID, ask: "Which prescription ID would you like to dispense?"

DESTRUCTIVE ACTIONS — ask for confirmation before:
  - reduceStock: "Are you sure you want to reduce stock? Reply YES to confirm."
  - Any batch deletion or stock correction that removes units.

ACCESS RULES:
- You MUST NOT access individual patient personal records, doctor private data, or admin user management.
- You MUST NOT modify prescriptions (doctor-owned).
- You MUST NOT approve or reject user registrations.
- You may view prescription details only to process dispensing.`,

        patient:
`You are MediAssist AI, assisting a Patient.

Your available capabilities and when to use each tool:
- MY PRESCRIPTIONS: Call getActivePrescriptionsByPatient to see your current active prescriptions. Call getCompletedPrescriptionsByPatient to see your finished prescriptions. Call getPrescriptionGroupsByPatient to see your full prescription history grouped by visit. Call PrescriptionExplanationTool to explain your medicines in simple, patient-friendly language including purpose, dosage, side effects, and precautions.
- MY REMINDERS: Call getTodaysReminders to see what medicines you need to take today. Call getUpcomingReminders for today and tomorrow's schedule. Call getMissedReminders to check any missed doses.
- MANAGE REMINDERS: Call markMedicineTaken when you have taken a medicine and want to mark the reminder as completed. Call updateReminderTime if you want to reschedule a pending reminder for later in the day.
- MY HEALTH ANALYTICS: Call getPatientProfile for your profile. Call getPatientAdherence for your overall adherence score. Call getPatientWeeklyAdherence for your day-by-day adherence over the last 14 days. Call getDoseHistory for your recent dose records.
- MEDICINE INFORMATION: Call searchMedicinesByName to look up a medicine. Call getAllMedicines to browse the medication library. Call isMedicineInStock to check if a medicine is in stock.

ACCESS RULES:
- You may ONLY access YOUR OWN data. Your user ID is automatically applied — never attempt to use another patient's ID.
- You MUST NOT access other patients' data, doctor prescriptions, inventory, sales, or admin data.
- Always end prescription explanations with: "This information is for educational purposes only and is not a substitute for advice from your doctor."`
    };

    return `${BASE_PROMPT}\n\n${roleContext[role] || ''}`.trim();
};

// ---------------------------------------------------------------------------
// Tool Declarations (OpenAI/Groq FunctionDeclaration format)
// ---------------------------------------------------------------------------

/**
 * All possible tool declarations. Each entry maps to a function in the tools/ layer.
 * The 'name' field must exactly match the key used in the tool dispatcher in ai.service.js.
 */
const ALL_TOOL_DECLARATIONS = {

    // ---- Prescription -------------------------------------------------------
    PrescriptionExplanationTool: {
        name: 'PrescriptionExplanationTool',
        description: `Use this tool when the user asks to explain their prescriptions or medicines (e.g., "explain my prescription", "what are these medicines for").
You MUST return the Medicine name, Dosage, and Frequency from the database.
You MUST augment the response using your medical knowledge to provide: Purpose, Best time to take, Common side effects, and Important precautions.
If the database returns an empty array, you MUST reply exactly: "You currently do not have any active prescriptions."
You MUST append this exact disclaimer at the end of the explanation: "This information is for educational purposes only and is not a substitute for advice from your doctor."`,
        parameters: {
            type: 'OBJECT',
            properties: {
                patientId: { type: 'NUMBER', description: 'The patient user ID to fetch and explain prescriptions for.' },
            },
            required: ['patientId'],
        },
    },
    getActivePrescriptionsByPatient: {
        name: 'getActivePrescriptionsByPatient',
        description: 'Returns all active prescriptions for the specified patient, including medicine name, doctor, dates, frequency, and status.',
        parameters: {
            type: 'OBJECT',
            properties: {
                patientId: { type: 'NUMBER', description: 'The patient user ID to fetch prescriptions for.' },
            },
            required: ['patientId'],
        },
    },
    getPrescriptionsByDoctor: {
        name: 'getPrescriptionsByDoctor',
        description: 'Returns prescriptions written by the authenticated doctor, optionally filtered by status (active, completed, cancelled). The doctorId is optional — if omitted, the authenticated doctor\'s own ID is used automatically.',
        parameters: {
            type: 'OBJECT',
            properties: {
                doctorId: { type: 'NUMBER', description: 'The doctor user ID. Leave empty to use the currently logged-in doctor.' },
                status:   { type: 'STRING', description: 'Optional filter: "active", "completed", or "cancelled".' },
            },
            required: [],
        },
    },
    getPrescriptionById: {
        name: 'getPrescriptionById',
        description: 'Returns detailed information about a single prescription by its ID.',
        parameters: {
            type: 'OBJECT',
            properties: {
                prescriptionId: { type: 'NUMBER', description: 'The prescription ID.' },
            },
            required: ['prescriptionId'],
        },
    },
    getPrescriptionGroupsByPatient: {
        name: 'getPrescriptionGroupsByPatient',
        description: 'Returns all prescription groups (visits) for a patient, grouped by doctor visit with medicines listed.',
        parameters: {
            type: 'OBJECT',
            properties: {
                patientId: { type: 'NUMBER', description: 'The patient user ID.' },
            },
            required: ['patientId'],
        },
    },
    getCompletedPrescriptionsByPatient: {
        name: 'getCompletedPrescriptionsByPatient',
        description: 'Returns all completed prescriptions for the specified patient, including medicine name, doctor, dates, frequency, and status.',
        parameters: {
            type: 'OBJECT',
            properties: {
                patientId: { type: 'NUMBER', description: 'The patient user ID to fetch completed prescriptions for.' },
            },
            required: ['patientId'],
        },
    },

    // ---- Reminder -----------------------------------------------------------
    getTodaysReminders: {
        name: 'getTodaysReminders',
        description: "Returns today's pending medication reminders for the patient with medicine names and scheduled times.",
        parameters: {
            type: 'OBJECT',
            properties: {
                patientId: { type: 'NUMBER', description: 'The patient user ID.' },
            },
            required: ['patientId'],
        },
    },
    getUpcomingReminders: {
        name: 'getUpcomingReminders',
        description: "Returns today's and tomorrow's pending medication reminders for the patient.",
        parameters: {
            type: 'OBJECT',
            properties: {
                patientId: { type: 'NUMBER', description: 'The patient user ID.' },
            },
            required: ['patientId'],
        },
    },
    getMissedReminders: {
        name: 'getMissedReminders',
        description: 'Returns missed medication reminders for the patient within a specified date range.',
        parameters: {
            type: 'OBJECT',
            properties: {
                patientId: { type: 'NUMBER', description: 'The patient user ID.' },
                fromDate:  { type: 'STRING', description: 'Start date in YYYY-MM-DD format.' },
                toDate:    { type: 'STRING', description: 'End date in YYYY-MM-DD format.' },
            },
            required: ['patientId', 'fromDate', 'toDate'],
        },
    },
    updateReminderTime: {
        name: 'updateReminderTime',
        description: 'Updates the scheduled time for a pending reminder. The new time must be on the same date as the original reminder.',
        parameters: {
            type: 'OBJECT',
            properties: {
                patientId:  { type: 'NUMBER', description: 'The patient user ID.' },
                reminderId: { type: 'NUMBER', description: 'The ID of the reminder to update.' },
                newTime:    { type: 'STRING', description: 'The new reminder time in ISO format (YYYY-MM-DD HH:mm:ss).' },
            },
            required: ['patientId', 'reminderId', 'newTime'],
        },
    },
    markMedicineTaken: {
        name: 'markMedicineTaken',
        description: 'Marks a pending reminder as taken (completed) and logs the dose confirmation.',
        parameters: {
            type: 'OBJECT',
            properties: {
                patientId:  { type: 'NUMBER', description: 'The patient user ID.' },
                reminderId: { type: 'NUMBER', description: 'The ID of the reminder to mark as taken.' },
            },
            required: ['patientId', 'reminderId'],
        },
    },

    // ---- Patient ------------------------------------------------------------
    getPatientProfile: {
        name: 'getPatientProfile',
        description: 'Returns the profile (name, email, mobile) of a patient by their user ID.',
        parameters: {
            type: 'OBJECT',
            properties: {
                patientId: { type: 'NUMBER', description: 'The patient user ID.' },
            },
            required: ['patientId'],
        },
    },
    getPatientAdherence: {
        name: 'getPatientAdherence',
        description: 'Returns overall medication adherence statistics (total reminders, doses taken, adherence percentage) for a patient.',
        parameters: {
            type: 'OBJECT',
            properties: {
                patientId: { type: 'NUMBER', description: 'The patient user ID.' },
            },
            required: ['patientId'],
        },
    },
    getPatientWeeklyAdherence: {
        name: 'getPatientWeeklyAdherence',
        description: 'Returns day-by-day adherence data for the past 14 days for a patient.',
        parameters: {
            type: 'OBJECT',
            properties: {
                patientId: { type: 'NUMBER', description: 'The patient user ID.' },
            },
            required: ['patientId'],
        },
    },
    getDoseHistory: {
        name: 'getDoseHistory',
        description: 'Returns the most recent dose confirmation records (taken or missed) for a patient.',
        parameters: {
            type: 'OBJECT',
            properties: {
                patientId: { type: 'NUMBER', description: 'The patient user ID.' },
                limit:     { type: 'NUMBER', description: 'Maximum number of records to return (default 10).' },
            },
            required: ['patientId'],
        },
    },

    // ---- Medicine -----------------------------------------------------------
    getAllMedicines: {
        name: 'getAllMedicines',
        description: 'Returns the complete list of medicines in the system.',
        parameters: { type: 'OBJECT', properties: {}, required: [] },
    },
    searchMedicinesByName: {
        name: 'searchMedicinesByName',
        description: 'Searches for medicines by partial name match and returns matching results.',
        parameters: {
            type: 'OBJECT',
            properties: {
                searchTerm: { type: 'STRING', description: 'Partial medicine name to search for.' },
            },
            required: ['searchTerm'],
        },
    },
    isMedicineInStock: {
        name: 'isMedicineInStock',
        description: 'Checks whether a medicine has non-expired stock available and returns the available quantity.',
        parameters: {
            type: 'OBJECT',
            properties: {
                medicineId: { type: 'NUMBER', description: 'The medicine ID.' },
            },
            required: ['medicineId'],
        },
    },

    // ---- Doctor -------------------------------------------------------------
    getDoctorPrescriptionSummary: {
        name: 'getDoctorPrescriptionSummary',
        description: 'Returns aggregate prescription counts (total, active, completed, cancelled) for the authenticated doctor. The doctorId is optional — if omitted, the authenticated doctor\'s own ID is used automatically.',
        parameters: {
            type: 'OBJECT',
            properties: {
                doctorId: { type: 'NUMBER', description: 'The doctor user ID. Leave empty to use the currently logged-in doctor.' },
            },
            required: [],
        },
    },
    getDoctorPatients: {
        name: 'getDoctorPatients',
        description: 'Returns the list of patients who have received at least one prescription from the authenticated doctor. The doctorId is optional — if omitted, the authenticated doctor\'s own ID is used automatically.',
        parameters: {
            type: 'OBJECT',
            properties: {
                doctorId: { type: 'NUMBER', description: 'The doctor user ID. Leave empty to use the currently logged-in doctor.' },
            },
            required: [],
        },
    },
    getDoctorPatientAdherenceOverview: {
        name: 'getDoctorPatientAdherenceOverview',
        description: "Returns overall adherence statistics across all of the doctor's patients. The doctorId is optional — if omitted, the authenticated doctor's own ID is used automatically.",
        parameters: {
            type: 'OBJECT',
            properties: {
                doctorId: { type: 'NUMBER', description: 'The doctor user ID. Leave empty to use the currently logged-in doctor.' },
            },
            required: [],
        },
    },
    getAllPatients: {
        name: 'getAllPatients',
        description: 'Returns a list of all approved patients in the system. For use by doctors when selecting a patient.',
        parameters: { type: 'OBJECT', properties: {}, required: [] },
    },

    // ---- Doctor Write & Extended Read (Phase 3) ----------------------------
    searchDoctorPatientByName: {
        name: 'searchDoctorPatientByName',
        description: "Searches for patients who have received at least one prescription from the authenticated doctor, filtered by partial name match. Use this before createPrescription to confirm the patient's ID.",
        parameters: {
            type: 'OBJECT',
            properties: {
                name: { type: 'STRING', description: 'Partial patient name to search for.' },
            },
            required: ['name'],
        },
    },
    getPatientHistoryForDoctor: {
        name: 'getPatientHistoryForDoctor',
        description: "Returns the full prescription history that the authenticated doctor has written for a specific patient (all statuses). Security-scoped to this doctor's prescriptions only.",
        parameters: {
            type: 'OBJECT',
            properties: {
                patientId: { type: 'NUMBER', description: 'The patient user ID.' },
            },
            required: ['patientId'],
        },
    },
    getTodaysPrescriptionsForDoctor: {
        name: 'getTodaysPrescriptionsForDoctor',
        description: "Returns prescriptions that the authenticated doctor created today.",
        parameters: { type: 'OBJECT', properties: {}, required: [] },
    },
    getDoctorAnalytics: {
        name: 'getDoctorAnalytics',
        description: "Returns a composite analytics dashboard for the authenticated doctor: total/active/completed/cancelled prescriptions, total distinct patients, and overall patient adherence rate.",
        parameters: { type: 'OBJECT', properties: {}, required: [] },
    },
    getCompletedPrescriptionsByDoctor: {
        name: 'getCompletedPrescriptionsByDoctor',
        description: 'Returns all completed (status=completed) prescriptions written by the authenticated doctor.',
        parameters: { type: 'OBJECT', properties: {}, required: [] },
    },
    getCancelledPrescriptionsByDoctor: {
        name: 'getCancelledPrescriptionsByDoctor',
        description: 'Returns all cancelled prescriptions written by the authenticated doctor.',
        parameters: { type: 'OBJECT', properties: {}, required: [] },
    },
    createPrescription: {
        name: 'createPrescription',
        description: 'Creates a new prescription for a patient. Call this ONLY after you have collected all required information from the doctor via follow-up questions: patientId, medicineId, startDate, duration (days), frequency (text), and dosesPerDay (number). Before calling, also verify medicine stock with isMedicineInStock.',
        parameters: {
            type: 'OBJECT',
            properties: {
                patientId:    { type: 'NUMBER', description: 'The patient user ID.' },
                medicineId:   { type: 'NUMBER', description: 'The medicine ID from the medicines table.' },
                startDate:    { type: 'STRING', description: 'Prescription start date in YYYY-MM-DD format.' },
                duration:     { type: 'NUMBER', description: 'Duration in days (e.g. 7, 14, 30).' },
                frequency:    { type: 'STRING', description: 'Dosage frequency text (e.g. "Once a day", "Twice a day", "Three times a day").' },
                dosesPerDay:  { type: 'NUMBER', description: 'Number of doses per day (e.g. 1, 2, 3).' },
                prescriptionGroupId: { type: 'NUMBER', description: 'Optional group ID to link multiple medicines in one visit. Omit to auto-generate.' },
            },
            required: ['patientId', 'medicineId', 'startDate', 'duration', 'frequency', 'dosesPerDay'],
        },
    },
    updatePrescription: {
        name: 'updatePrescription',
        description: 'Updates mutable fields (frequency, dosesPerDay, duration, startDate) of an active prescription that this doctor wrote. Security-enforced: only the owning doctor can update.',
        parameters: {
            type: 'OBJECT',
            properties: {
                prescriptionId: { type: 'NUMBER', description: 'The prescription ID to update.' },
                frequency:      { type: 'STRING', description: 'New frequency text (optional).' },
                dosesPerDay:    { type: 'NUMBER', description: 'New doses per day (optional).' },
                duration:       { type: 'NUMBER', description: 'New duration in days (optional).' },
                startDate:      { type: 'STRING', description: 'New start date YYYY-MM-DD (optional).' },
            },
            required: ['prescriptionId'],
        },
    },
    cancelPrescription: {
        name: 'cancelPrescription',
        description: 'Cancels an active prescription that this doctor wrote. Call this ONLY after the doctor has confirmed with YES. Security-enforced: only the owning doctor can cancel.',
        parameters: {
            type: 'OBJECT',
            properties: {
                prescriptionId: { type: 'NUMBER', description: 'The prescription ID to cancel.' },
            },
            required: ['prescriptionId'],
        },
    },

    // ---- Inventory ----------------------------------------------------------
    getAllInventory: {
        name: 'getAllInventory',
        description: 'Returns the complete inventory list with stock levels, expiry dates, and low-stock/expired flags.',
        parameters: { type: 'OBJECT', properties: {}, required: [] },
    },
    getLowStockItems: {
        name: 'getLowStockItems',
        description: 'Returns inventory items where stock quantity is at or below 100 units.',
        parameters: { type: 'OBJECT', properties: {}, required: [] },
    },
    getExpiredItems: {
        name: 'getExpiredItems',
        description: 'Returns inventory items whose expiry date has passed.',
        parameters: { type: 'OBJECT', properties: {}, required: [] },
    },

    // ---- Pharmacist ---------------------------------------------------------
    getPendingPrescriptionsForDispensary: {
        name: 'getPendingPrescriptionsForDispensary',
        description: 'Returns active prescriptions that have not yet been dispensed (bought = false), sorted oldest first.',
        parameters: { type: 'OBJECT', properties: {}, required: [] },
    },
    getSalesHistory: {
        name: 'getSalesHistory',
        description: 'Returns dispensing (sold medicines) history for the past N days.',
        parameters: {
            type: 'OBJECT',
            properties: {
                days: { type: 'NUMBER', description: 'Number of past days to include (default 30).' },
            },
            required: [],
        },
    },
    getPharmacistAnalytics: {
        name: 'getPharmacistAnalytics',
        description: 'Returns pharmacist dashboard analytics: total inventory items, low-stock count, expired count, and monthly sales.',
        parameters: { type: 'OBJECT', properties: {}, required: [] },
    },
    checkStockSufficiency: {
        name: 'checkStockSufficiency',
        description: 'Checks if there is sufficient non-expired stock to fulfil a required quantity for a specific medicine.',
        parameters: {
            type: 'OBJECT',
            properties: {
                medicineId:       { type: 'NUMBER', description: 'The medicine ID.' },
                requiredQuantity: { type: 'NUMBER', description: 'The quantity needed.' },
            },
            required: ['medicineId', 'requiredQuantity'],
        },
    },

    // ---- Pharmacist Write & Extended Read (Phase 4) -----------------------
    searchInventoryByMedicineName: {
        name: 'searchInventoryByMedicineName',
        description: 'Searches inventory batches by partial medicine name match.',
        parameters: {
            type: 'OBJECT',
            properties: {
                name: { type: 'STRING', description: 'Partial medicine name to search for.' },
            },
            required: ['name'],
        },
    },
    searchInventoryByBatchNumber: {
        name: 'searchInventoryByBatchNumber',
        description: 'Searches inventory batches by partial or full batch number.',
        parameters: {
            type: 'OBJECT',
            properties: {
                batchNumber: { type: 'STRING', description: 'Batch number or partial batch number.' },
            },
            required: ['batchNumber'],
        },
    },
    getMedicineInventoryDetails: {
        name: 'getMedicineInventoryDetails',
        description: 'Returns all inventory batches for a specific medicine along with total valid (non-expired) stock.',
        parameters: {
            type: 'OBJECT',
            properties: {
                medicineId: { type: 'NUMBER', description: 'The medicine ID.' },
            },
            required: ['medicineId'],
        },
    },
    checkMedicineAvailability: {
        name: 'checkMedicineAvailability',
        description: 'Returns live stock availability for a medicine: in_stock flag, available quantity, and valid batch count.',
        parameters: {
            type: 'OBJECT',
            properties: {
                medicineId: { type: 'NUMBER', description: 'The medicine ID.' },
            },
            required: ['medicineId'],
        },
    },
    getMedicinesExpiringThisMonth: {
        name: 'getMedicinesExpiringThisMonth',
        description: 'Returns inventory batches expiring within the current calendar month (not yet expired).',
        parameters: { type: 'OBJECT', properties: {}, required: [] },
    },
    getInventorySummaryPharmacist: {
        name: 'getInventorySummaryPharmacist',
        description: 'Returns a pharmacist dashboard summary: total batches, total medicines, total units, low-stock count, expired count, and expiring-this-month count.',
        parameters: { type: 'OBJECT', properties: {}, required: [] },
    },
    getTodaySales: {
        name: 'getTodaySales',
        description: "Returns today's dispensing sales records.",
        parameters: { type: 'OBJECT', properties: {}, required: [] },
    },
    getWeeklySales: {
        name: 'getWeeklySales',
        description: 'Returns dispensing sales records for the past 7 days.',
        parameters: { type: 'OBJECT', properties: {}, required: [] },
    },
    getMonthlySales: {
        name: 'getMonthlySales',
        description: 'Returns dispensing sales records for the past 30 days.',
        parameters: { type: 'OBJECT', properties: {}, required: [] },
    },
    addInventory: {
        name: 'addInventory',
        description: 'Adds a new inventory batch for a medicine. Collect all required info before calling: medicineId, batchNumber, expiryDate (YYYY-MM-DD), stockQuantity.',
        parameters: {
            type: 'OBJECT',
            properties: {
                medicineId:    { type: 'NUMBER', description: 'The medicine ID.' },
                batchNumber:   { type: 'STRING', description: 'Unique batch number for this stock.' },
                expiryDate:    { type: 'STRING', description: 'Expiry date in YYYY-MM-DD format.' },
                stockQuantity: { type: 'NUMBER', description: 'Number of units to add.' },
            },
            required: ['medicineId', 'batchNumber', 'expiryDate', 'stockQuantity'],
        },
    },
    increaseStock: {
        name: 'increaseStock',
        description: 'Increases the stock quantity of an existing inventory batch. Ask which batch ID and how many units to add.',
        parameters: {
            type: 'OBJECT',
            properties: {
                inventoryId: { type: 'NUMBER', description: 'The inventory batch ID to update.' },
                quantity:    { type: 'NUMBER', description: 'Number of units to add to this batch.' },
            },
            required: ['inventoryId', 'quantity'],
        },
    },
    reduceStock: {
        name: 'reduceStock',
        description: 'Reduces stock of an inventory batch by a given quantity (manual adjustment). Call only after confirmation.',
        parameters: {
            type: 'OBJECT',
            properties: {
                inventoryId: { type: 'NUMBER', description: 'The inventory batch ID.' },
                quantity:    { type: 'NUMBER', description: 'Number of units to remove.' },
            },
            required: ['inventoryId', 'quantity'],
        },
    },
    updateExpiryDate: {
        name: 'updateExpiryDate',
        description: 'Updates the expiry date of an inventory batch.',
        parameters: {
            type: 'OBJECT',
            properties: {
                inventoryId:   { type: 'NUMBER', description: 'The inventory batch ID.' },
                newExpiryDate: { type: 'STRING', description: 'New expiry date in YYYY-MM-DD format.' },
            },
            required: ['inventoryId', 'newExpiryDate'],
        },
    },
    updateBatchDetails: {
        name: 'updateBatchDetails',
        description: 'Updates the batch number of an inventory batch.',
        parameters: {
            type: 'OBJECT',
            properties: {
                inventoryId:    { type: 'NUMBER', description: 'The inventory batch ID.' },
                newBatchNumber: { type: 'STRING', description: 'New batch number to assign.' },
            },
            required: ['inventoryId', 'newBatchNumber'],
        },
    },
    dispensePrescription: {
        name: 'dispensePrescription',
        description: 'Executes the full dispense workflow for a prescription: verifies it is active and not already dispensed, checks stock, deducts stock FIFO, records the sale, and marks the prescription as dispensed. Ask for the prescription ID if not provided.',
        parameters: {
            type: 'OBJECT',
            properties: {
                prescriptionId: { type: 'NUMBER', description: 'The prescription ID to dispense.' },
            },
            required: ['prescriptionId'],
        },
    },

    // ---- Analytics ----------------------------------------------------------
    getSystemOverview: {
        name: 'getSystemOverview',
        description: 'Returns a system-wide snapshot: total users by role, prescription counts, inventory health.',
        parameters: { type: 'OBJECT', properties: {}, required: [] },
    },
    getPrescriptionTrends: {
        name: 'getPrescriptionTrends',
        description: 'Returns daily prescription creation counts for the past N days.',
        parameters: {
            type: 'OBJECT',
            properties: {
                days: { type: 'NUMBER', description: 'Number of past days to include (default 7).' },
            },
            required: [],
        },
    },
    getSystemAdherenceRate: {
        name: 'getSystemAdherenceRate',
        description: 'Returns overall system-wide medication adherence rate across all patients.',
        parameters: { type: 'OBJECT', properties: {}, required: [] },
    },
    getMonthlySalesTrends: {
        name: 'getMonthlySalesTrends',
        description: 'Returns monthly dispensing totals for the past N months.',
        parameters: {
            type: 'OBJECT',
            properties: {
                months: { type: 'NUMBER', description: 'Number of past months (default 3).' },
            },
            required: [],
        },
    },

    // ---- Admin --------------------------------------------------------------
    getUserSummary: {
        name: 'getUserSummary',
        description: 'Returns a breakdown of all users by role and status (pending, disabled, etc.).',
        parameters: { type: 'OBJECT', properties: {}, required: [] },
    },
    getPendingApprovals: {
        name: 'getPendingApprovals',
        description: 'Returns all user accounts currently awaiting admin approval.',
        parameters: { type: 'OBJECT', properties: {}, required: [] },
    },
    getRecentAuditLogs: {
        name: 'getRecentAuditLogs',
        description: 'Returns the most recent admin action audit log entries.',
        parameters: {
            type: 'OBJECT',
            properties: {
                limit: { type: 'NUMBER', description: 'Maximum number of entries to return (default 20).' },
            },
            required: [],
        },
    },
    getDisabledUsers: {
        name: 'getDisabledUsers',
        description: 'Returns all user accounts that are currently disabled.',
        parameters: { type: 'OBJECT', properties: {}, required: [] },
    },
    getSystemStats: {
        name: 'getSystemStats',
        description: 'Returns a consolidated system statistics snapshot including prescriptions, inventory, and sales.',
        parameters: { type: 'OBJECT', properties: {}, required: [] },
    },
    approveDoctor: {
        name: 'approveDoctor',
        description: 'Approves a pending doctor registration in the system.',
        parameters: {
            type: 'OBJECT',
            properties: {
                doctorId: { type: 'NUMBER', description: 'The ID of the doctor user to approve.' }
            },
            required: ['doctorId']
        }
    },
    rejectDoctor: {
        name: 'rejectDoctor',
        description: 'Rejects a pending doctor registration in the system.',
        parameters: {
            type: 'OBJECT',
            properties: {
                doctorId: { type: 'NUMBER', description: 'The ID of the doctor user to reject.' }
            },
            required: ['doctorId']
        }
    },
    approvePharmacist: {
        name: 'approvePharmacist',
        description: 'Approves a pending pharmacist registration in the system.',
        parameters: {
            type: 'OBJECT',
            properties: {
                pharmacistId: { type: 'NUMBER', description: 'The ID of the pharmacist user to approve.' }
            },
            required: ['pharmacistId']
        }
    },
    rejectPharmacist: {
        name: 'rejectPharmacist',
        description: 'Rejects a pending pharmacist registration in the system.',
        parameters: {
            type: 'OBJECT',
            properties: {
                pharmacistId: { type: 'NUMBER', description: 'The ID of the pharmacist user to reject.' }
            },
            required: ['pharmacistId']
        }
    },
    approveFirstPendingUser: {
        name: 'approveFirstPendingUser',
        description: 'Approves the oldest/first user registration currently pending approval in the system.',
        parameters: { type: 'OBJECT', properties: {}, required: [] }
    },
    rejectFirstPendingUser: {
        name: 'rejectFirstPendingUser',
        description: 'Rejects the oldest/first user registration currently pending approval in the system.',
        parameters: { type: 'OBJECT', properties: {}, required: [] }
    },
    searchUserByName: {
        name: 'searchUserByName',
        description: 'Searches for system users by their full name (partial match).',
        parameters: {
            type: 'OBJECT',
            properties: {
                name: { type: 'STRING', description: 'The full name or part of the name to search for.' }
            },
            required: ['name']
        }
    },
    searchUserByEmail: {
        name: 'searchUserByEmail',
        description: 'Searches for system users by their email address (partial match).',
        parameters: {
            type: 'OBJECT',
            properties: {
                email: { type: 'STRING', description: 'The email or part of the email to search for.' }
            },
            required: ['email']
        }
    },
    countUsers: {
        name: 'countUsers',
        description: 'Returns the total count of all registered users in the system.',
        parameters: { type: 'OBJECT', properties: {}, required: [] }
    },
    countDoctors: {
        name: 'countDoctors',
        description: 'Returns the total count of registered doctors in the system.',
        parameters: { type: 'OBJECT', properties: {}, required: [] }
    },
    countPharmacists: {
        name: 'countPharmacists',
        description: 'Returns the total count of registered pharmacists in the system.',
        parameters: { type: 'OBJECT', properties: {}, required: [] }
    },
    countPatients: {
        name: 'countPatients',
        description: 'Returns the total count of registered patients in the system.',
        parameters: { type: 'OBJECT', properties: {}, required: [] }
    },
    getTodaySummary: {
        name: 'getTodaySummary',
        description: 'Returns a summary of new user registrations for today.',
        parameters: { type: 'OBJECT', properties: {}, required: [] }
    },
    getWeeklySummary: {
        name: 'getWeeklySummary',
        description: 'Returns a summary of new user registrations for the current week.',
        parameters: { type: 'OBJECT', properties: {}, required: [] }
    },
    getMonthlySummary: {
        name: 'getMonthlySummary',
        description: 'Returns a summary of new user registrations for the current month.',
        parameters: { type: 'OBJECT', properties: {}, required: [] }
    },
    getSystemAnalytics: {
        name: 'getSystemAnalytics',
        description: 'Returns consolidated system-wide analytics (user summaries and statistics).',
        parameters: { type: 'OBJECT', properties: {}, required: [] }
    },
    getMedicineAnalytics: {
        name: 'getMedicineAnalytics',
        description: 'Returns medicine/stock metrics from the database.',
        parameters: { type: 'OBJECT', properties: {}, required: [] }
    },
    getPrescriptionAnalytics: {
        name: 'getPrescriptionAnalytics',
        description: 'Returns prescription statistics from the database.',
        parameters: { type: 'OBJECT', properties: {}, required: [] }
    },
    getInventorySummary: {
        name: 'getInventorySummary',
        description: 'Returns a summary of total inventory items and stock levels.',
        parameters: { type: 'OBJECT', properties: {}, required: [] }
    },
    getExpiredMedicines: {
        name: 'getExpiredMedicines',
        description: 'Returns inventory items that are currently expired.',
        parameters: { type: 'OBJECT', properties: {}, required: [] }
    },
    getMedicinesExpiringThisMonth: {
        name: 'getMedicinesExpiringThisMonth',
        description: 'Returns inventory items that will expire during the current calendar month.',
        parameters: { type: 'OBJECT', properties: {}, required: [] }
    }
};

// ---------------------------------------------------------------------------
// Role → Allowed Tool Names
// ---------------------------------------------------------------------------

const ROLE_TOOLS = {
    patient: [
        'PrescriptionExplanationTool',
        'getActivePrescriptionsByPatient',
        'getCompletedPrescriptionsByPatient',
        'getPrescriptionGroupsByPatient',
        'getTodaysReminders',
        'getUpcomingReminders',
        'getMissedReminders',
        'updateReminderTime',
        'markMedicineTaken',
        'getPatientProfile',
        'getPatientAdherence',
        'getPatientWeeklyAdherence',
        'getDoseHistory',
        'getAllMedicines',
        'searchMedicinesByName',
        'isMedicineInStock',
    ],
    doctor: [
        // ---- READ: prescriptions ----
        'PrescriptionExplanationTool',
        'getPrescriptionsByDoctor',
        'getPrescriptionById',
        'getPrescriptionGroupsByPatient',
        'getActivePrescriptionsByPatient',
        'getCompletedPrescriptionsByDoctor',
        'getCancelledPrescriptionsByDoctor',
        'getTodaysPrescriptionsForDoctor',
        'getDoctorPrescriptionSummary',
        // ---- READ: patients ----
        'getDoctorPatients',
        'searchDoctorPatientByName',
        'getPatientHistoryForDoctor',
        'getPatientAdherence',
        'getPatientProfile',
        'getAllPatients',
        // ---- READ: analytics ----
        'getDoctorAnalytics',
        'getDoctorPatientAdherenceOverview',
        'getPrescriptionTrends',
        // ---- READ: medicine ----
        'getAllMedicines',
        'searchMedicinesByName',
        'isMedicineInStock',
        // ---- WRITE: prescriptions ----
        'createPrescription',
        'updatePrescription',
        'cancelPrescription',
    ],
    pharmacist: [
        // ---- READ: inventory ----
        'getAllInventory',
        'searchInventoryByMedicineName',
        'searchInventoryByBatchNumber',
        'getMedicineInventoryDetails',
        'checkMedicineAvailability',
        'getLowStockItems',
        'getExpiredItems',
        'getMedicinesExpiringThisMonth',
        'getInventorySummaryPharmacist',
        // ---- READ: dispensary ----
        'getPendingPrescriptionsForDispensary',
        // ---- READ: sales & analytics ----
        'getTodaySales',
        'getWeeklySales',
        'getMonthlySales',
        'getSalesHistory',
        'getPharmacistAnalytics',
        'checkStockSufficiency',
        'getMonthlySalesTrends',
        // ---- READ: medicine ----
        'getAllMedicines',
        'searchMedicinesByName',
        // ---- WRITE: inventory ----
        'addInventory',
        'increaseStock',
        'reduceStock',
        'updateExpiryDate',
        'updateBatchDetails',
        // ---- WRITE: dispense ----
        'dispensePrescription',
    ],
    admin: [
        'getUserSummary',
        'getPendingApprovals',
        'getRecentAuditLogs',
        'getDisabledUsers',
        'getSystemStats',
        'getSystemOverview',
        'getPrescriptionTrends',
        'getSystemAdherenceRate',
        'getMonthlySalesTrends',
        'getAllInventory',
        'getLowStockItems',
        'getExpiredItems',
        'getSalesHistory',
        'getPharmacistAnalytics',
        'checkStockSufficiency',
        'getAllMedicines',
        'searchMedicinesByName',
        'approveDoctor',
        'rejectDoctor',
        'approvePharmacist',
        'rejectPharmacist',
        'approveFirstPendingUser',
        'rejectFirstPendingUser',
        'searchUserByName',
        'searchUserByEmail',
        'countUsers',
        'countDoctors',
        'countPharmacists',
        'countPatients',
        'getTodaySummary',
        'getWeeklySummary',
        'getMonthlySummary',
        'getSystemAnalytics',
        'getMedicineAnalytics',
        'getPrescriptionAnalytics',
        'getInventorySummary',
        'getExpiredMedicines',
        'getMedicinesExpiringThisMonth',
    ],
};

/**
 * Returns Groq/OpenAI-compatible FunctionDeclaration array for the given role.
 * Only tools allowed for that role are returned.
 *
 * @param {string} role
 * @returns {Array<object>}
 */
const getToolDeclarations = (role) => {
    const allowed = ROLE_TOOLS[role] || [];
    return allowed
        .filter(name => ALL_TOOL_DECLARATIONS[name])
        .map(name => ALL_TOOL_DECLARATIONS[name]);
};

module.exports = {
    getSystemPrompt,
    getToolDeclarations,
    ROLE_TOOLS,
    BASE_PROMPT,
};
