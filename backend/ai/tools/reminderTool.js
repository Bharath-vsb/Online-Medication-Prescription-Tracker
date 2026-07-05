const db = require('../../config/database');

/**
 * Reminder Tool
 *
 * Read and Write queries for patient medication reminders and dose confirmations.
 * All functions return structured JSON arrays or objects.
 *
 * SECURITY: Write operations enforce patientId matching to prevent tampering.
 */

/**
 * Get today's pending reminders for a patient with medication details.
 *
 * @param {number} patientId
 * @returns {Promise<Array>}
 */
const getTodaysReminders = async (patientId) => {
    const [rows] = await db.query(
        `SELECT
            r.id,
            r.reminder_time,
            r.status,
            m.name       AS medicine_name,
            p.frequency,
            p.doses_per_day,
            p.id         AS prescription_id
         FROM reminders r
         JOIN prescriptions p ON r.prescription_id = p.id
         JOIN medicines     m ON p.medicine_id     = m.id
         WHERE r.patient_id   = ?
           AND DATE(r.reminder_time) = CURDATE()
           AND r.status       = 'pending'
           AND p.status       = 'active'
           AND p.bought       = TRUE
         ORDER BY r.reminder_time ASC`,
        [patientId]
    );
    return rows;
};

/**
 * Get upcoming reminders for a patient (today + tomorrow).
 *
 * @param {number} patientId
 * @returns {Promise<Array>}
 */
const getUpcomingReminders = async (patientId) => {
    const [rows] = await db.query(
        `SELECT
            r.id,
            r.reminder_time,
            r.status,
            m.name       AS medicine_name,
            p.frequency,
            p.doses_per_day,
            p.id         AS prescription_id
         FROM reminders r
         JOIN prescriptions p ON r.prescription_id = p.id
         JOIN medicines     m ON p.medicine_id     = m.id
         WHERE r.patient_id   = ?
           AND DATE(r.reminder_time) IN (CURDATE(), DATE_ADD(CURDATE(), INTERVAL 1 DAY))
           AND r.status       = 'pending'
           AND p.status       = 'active'
           AND p.bought       = TRUE
         ORDER BY r.reminder_time ASC`,
        [patientId]
    );
    return rows;
};

/**
 * Get missed reminders for a patient within a date range.
 *
 * @param {number} patientId
 * @param {string} fromDate - ISO date string (YYYY-MM-DD)
 * @param {string} toDate   - ISO date string (YYYY-MM-DD)
 * @returns {Promise<Array>}
 */
const getMissedReminders = async (patientId, fromDate, toDate) => {
    const [rows] = await db.query(
        `SELECT
            r.id,
            r.reminder_time,
            r.status,
            m.name       AS medicine_name,
            p.frequency,
            p.id         AS prescription_id
         FROM reminders r
         JOIN prescriptions p ON r.prescription_id = p.id
         JOIN medicines     m ON p.medicine_id     = m.id
         WHERE r.patient_id   = ?
           AND r.status       = 'missed'
           AND DATE(r.reminder_time) BETWEEN ? AND ?
         ORDER BY r.reminder_time DESC`,
        [patientId, fromDate, toDate]
    );
    return rows;
};

/**
 * Get the full reminder history for a specific prescription.
 *
 * @param {number} prescriptionId
 * @returns {Promise<Array>}
 */
const getRemindersByPrescription = async (prescriptionId) => {
    const [rows] = await db.query(
        `SELECT
            r.id,
            r.reminder_time,
            r.status,
            dc.status    AS confirmed_status,
            dc.confirmed_at
         FROM reminders r
         LEFT JOIN dose_confirmations dc ON dc.reminder_id = r.id
         WHERE r.prescription_id = ?
         ORDER BY r.reminder_time ASC`,
        [prescriptionId]
    );
    return rows;
};

// ---------------------------------------------------------------------------
// WRITE — Patient Reminder Actions
// ---------------------------------------------------------------------------

/**
 * Update the time of a pending reminder (must be same day to prevent dose boundary crossing).
 *
 * @param {number} patientId
 * @param {number} reminderId
 * @param {string} newTime - ISO string (YYYY-MM-DD HH:mm:ss)
 * @returns {Promise<object>}
 */
const updateReminderTime = async (patientId, reminderId, newTime) => {
    // Ensure the reminder belongs to the patient and is pending
    const [rows] = await db.query(
        `SELECT id, reminder_time FROM reminders WHERE id = ? AND patient_id = ? AND status = 'pending'`,
        [reminderId, patientId]
    );
    if (rows.length === 0) {
        return { success: false, message: 'Reminder not found or not pending.' };
    }

    // Optional: enforce same-day constraint
    const oldDate = new Date(rows[0].reminder_time).toISOString().split('T')[0];
    const newDate = new Date(newTime).toISOString().split('T')[0];
    if (oldDate !== newDate) {
        return { success: false, message: 'You can only reschedule a reminder to another time on the same day.' };
    }

    await db.query(
        `UPDATE reminders SET reminder_time = ? WHERE id = ?`,
        [new Date(newTime), reminderId]
    );

    return { success: true, message: 'Reminder time updated successfully.', new_time: newTime };
};

/**
 * Mark a medicine as taken by creating a dose_confirmation and updating the reminder status.
 *
 * @param {number} patientId
 * @param {number} reminderId
 * @returns {Promise<object>}
 */
const markMedicineTaken = async (patientId, reminderId) => {
    // Verify ownership and status
    const [rows] = await db.query(
        `SELECT id, prescription_id, status FROM reminders WHERE id = ? AND patient_id = ? AND status = 'pending'`,
        [reminderId, patientId]
    );
    if (rows.length === 0) {
        return { success: false, message: 'Reminder not found or already completed/missed.' };
    }

    const prescriptionId = rows[0].prescription_id;

    // Use a transaction for safety
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // Update reminder status
        await connection.query(
            `UPDATE reminders SET status = 'completed' WHERE id = ?`,
            [reminderId]
        );

        // Insert dose confirmation
        await connection.query(
            `INSERT INTO dose_confirmations (reminder_id, prescription_id, patient_id, status, confirmed_at)
             VALUES (?, ?, ?, 'taken', NOW())`,
            [reminderId, prescriptionId, patientId]
        );

        await connection.commit();
        return { success: true, message: 'Medicine marked as taken successfully.' };
    } catch (err) {
        await connection.rollback();
        console.error('Error marking medicine taken:', err);
        return { success: false, message: 'Failed to mark medicine as taken.' };
    } finally {
        connection.release();
    }
};

module.exports = {
    getTodaysReminders,
    getUpcomingReminders,
    getMissedReminders,
    getRemindersByPrescription,
    updateReminderTime,
    markMedicineTaken,
};
