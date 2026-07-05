const db = require('../../config/database');

/**
 * Patient Tool
 *
 * Read-only queries scoped to patient data.
 * Patients may only access data tied to their own user_id — this is enforced
 * by always requiring patientId as a parameter and never exposing a "get all"
 * function to non-admin callers.
 *
 * SECURITY: SELECT queries only. No INSERT, UPDATE, or DELETE.
 */

/**
 * Get a patient's public profile (no password, no sensitive fields).
 *
 * @param {number} patientId
 * @returns {Promise<object|null>}
 */
const getPatientProfile = async (patientId) => {
    const [rows] = await db.query(
        `SELECT id, full_name, email, mobile, created_at
         FROM users
         WHERE id   = ?
           AND role = 'patient'`,
        [patientId]
    );
    return rows[0] || null;
};

/**
 * Get all patients in the system — intended for doctor context only.
 * Returns minimal fields (no sensitive data).
 *
 * @returns {Promise<Array>}
 */
const getAllPatients = async () => {
    const [rows] = await db.query(
        `SELECT id, full_name, email, mobile
         FROM users
         WHERE role = 'patient'
           AND enabled = TRUE
           AND status  = 'approved'
         ORDER BY full_name ASC`
    );
    return rows;
};

/**
 * Get overall adherence statistics for a patient.
 *
 * @param {number} patientId
 * @returns {Promise<object>}
 */
const getPatientAdherence = async (patientId) => {
    const [[data]] = await db.query(
        `SELECT
            COUNT(DISTINCT r.id)  AS total_reminders,
            COUNT(DISTINCT dc.id) AS taken_doses
         FROM prescriptions p
         LEFT JOIN reminders          r  ON r.prescription_id = p.id
         LEFT JOIN dose_confirmations dc ON dc.reminder_id    = r.id
                                        AND dc.status         = 'taken'
         WHERE p.patient_id = ?`,
        [patientId]
    );
    const adherence = data.total_reminders > 0
        ? ((data.taken_doses / data.total_reminders) * 100).toFixed(1)
        : '0.0';
    return {
        total_reminders:   data.total_reminders,
        taken_doses:       data.taken_doses,
        adherence_percent: parseFloat(adherence),
    };
};

/**
 * Get a patient's daily adherence rate for the last 14 days.
 *
 * @param {number} patientId
 * @returns {Promise<Array>}
 */
const getPatientWeeklyAdherence = async (patientId) => {
    const [rows] = await db.query(
        `SELECT
            DATE(r.reminder_time)                             AS date,
            COUNT(r.id)                                       AS total_reminders,
            COUNT(CASE WHEN dc.status = 'taken' THEN 1 END)  AS taken_doses,
            ROUND(
                COUNT(CASE WHEN dc.status = 'taken' THEN 1 END)
                / NULLIF(COUNT(r.id), 0) * 100, 1
            )                                                 AS adherence_percent
         FROM reminders r
         LEFT JOIN dose_confirmations dc ON dc.reminder_id = r.id
         WHERE r.patient_id    = ?
           AND r.reminder_time >= DATE_SUB(NOW(), INTERVAL 14 DAY)
         GROUP BY DATE(r.reminder_time)
         ORDER BY date ASC`,
        [patientId]
    );
    return rows;
};

/**
 * Get the most recent dose confirmation records for a patient.
 *
 * @param {number} patientId
 * @param {number} limit
 * @returns {Promise<Array>}
 */
const getDoseHistory = async (patientId, limit = 10) => {
    const [rows] = await db.query(
        `SELECT
            dc.id,
            dc.status         AS confirmation_status,
            dc.confirmed_at,
            m.name            AS medicine_name,
            r.reminder_time
         FROM dose_confirmations dc
         JOIN reminders     r  ON dc.reminder_id     = r.id
         JOIN prescriptions p  ON dc.prescription_id = p.id
         JOIN medicines     m  ON p.medicine_id      = m.id
         WHERE dc.patient_id = ?
         ORDER BY dc.confirmed_at DESC
         LIMIT ?`,
        [patientId, limit]
    );
    return rows;
};

module.exports = {
    getPatientProfile,
    getAllPatients,
    getPatientAdherence,
    getPatientWeeklyAdherence,
    getDoseHistory,
};
