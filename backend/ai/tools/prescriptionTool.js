const db = require('../../config/database');

/**
 * Prescription Tool
 *
 * Read-only queries for prescription data.
 * All functions return structured JSON arrays or objects.
 * Role-based filtering is enforced by the caller (ai.service.js).
 *
 * SECURITY: SELECT queries only. No INSERT, UPDATE, or DELETE.
 */

/**
 * Get all active prescriptions for a specific patient.
 * Includes medicine name, doctor name, and key prescription details.
 *
 * @param {number} patientId
 * @returns {Promise<Array>}
 */
const getActivePrescriptionsByPatient = async (patientId) => {
    const [rows] = await db.query(
        `SELECT
            p.id,
            p.prescription_group_id,
            m.name            AS medicine_name,
            u.full_name       AS doctor_name,
            p.start_date,
            p.end_date,
            p.duration,
            p.frequency,
            p.doses_per_day,
            p.total_quantity,
            p.status,
            p.bought,
            p.created_at
         FROM prescriptions p
         JOIN medicines m ON p.medicine_id = m.id
         JOIN users     u ON p.doctor_id   = u.id
         WHERE p.patient_id = ?
           AND p.status     = 'active'
         ORDER BY p.created_at DESC`,
        [patientId]
    );
    return rows;
};

/**
 * Get prescriptions written by a specific doctor, optionally filtered by status.
 *
 * @param {number} doctorId
 * @param {string|null} status - 'active' | 'completed' | 'cancelled' | null (all)
 * @returns {Promise<Array>}
 */
const getPrescriptionsByDoctor = async (doctorId, status = null) => {
    const params = [doctorId];
    let statusClause = '';
    if (status) {
        statusClause = 'AND p.status = ?';
        params.push(status);
    }

    const [rows] = await db.query(
        `SELECT
            p.id,
            p.prescription_group_id,
            m.name            AS medicine_name,
            u.full_name       AS patient_name,
            u.email           AS patient_email,
            p.start_date,
            p.end_date,
            p.duration,
            p.frequency,
            p.doses_per_day,
            p.total_quantity,
            p.status,
            p.bought,
            p.created_at
         FROM prescriptions p
         JOIN medicines m ON p.medicine_id = m.id
         JOIN users     u ON p.patient_id  = u.id
         WHERE p.doctor_id = ?
           ${statusClause}
         ORDER BY p.created_at DESC`,
        params
    );
    return rows;
};

/**
 * Get a single prescription by its ID.
 *
 * @param {number} prescriptionId
 * @returns {Promise<object|null>}
 */
const getPrescriptionById = async (prescriptionId) => {
    const [rows] = await db.query(
        `SELECT
            p.id,
            p.prescription_group_id,
            m.name            AS medicine_name,
            d.full_name       AS doctor_name,
            pt.full_name      AS patient_name,
            p.start_date,
            p.end_date,
            p.duration,
            p.frequency,
            p.doses_per_day,
            p.total_quantity,
            p.status,
            p.bought,
            p.created_at
         FROM prescriptions p
         JOIN medicines m ON p.medicine_id = m.id
         JOIN users     d ON p.doctor_id   = d.id
         JOIN users    pt ON p.patient_id  = pt.id
         WHERE p.id = ?`,
        [prescriptionId]
    );
    return rows[0] || null;
};

/**
 * Get all prescriptions grouped by prescription_group_id for a patient.
 * Returns groups with their list of medicines in each visit.
 *
 * @param {number} patientId
 * @returns {Promise<Array>}
 */
const getPrescriptionGroupsByPatient = async (patientId) => {
    const [rows] = await db.query(
        `SELECT
            p.prescription_group_id,
            u.full_name       AS doctor_name,
            MIN(p.start_date) AS start_date,
            COUNT(p.id)       AS medicine_count,
            GROUP_CONCAT(m.name ORDER BY m.name SEPARATOR ', ') AS medicines,
            p.status,
            MAX(p.created_at) AS created_at
         FROM prescriptions p
         JOIN medicines m ON p.medicine_id = m.id
         JOIN users     u ON p.doctor_id   = u.id
         WHERE p.patient_id = ?
         GROUP BY p.prescription_group_id, u.full_name, p.status
         ORDER BY created_at DESC`,
        [patientId]
    );
    return rows;
};

/**
 * Get all completed prescriptions for a specific patient.
 * Includes medicine name, doctor name, and key prescription details.
 *
 * @param {number} patientId
 * @returns {Promise<Array>}
 */
const getCompletedPrescriptionsByPatient = async (patientId) => {
    const [rows] = await db.query(
        `SELECT
            p.id,
            p.prescription_group_id,
            m.name            AS medicine_name,
            u.full_name       AS doctor_name,
            p.start_date,
            p.end_date,
            p.duration,
            p.frequency,
            p.doses_per_day,
            p.total_quantity,
            p.status,
            p.bought,
            p.created_at
         FROM prescriptions p
         JOIN medicines m ON p.medicine_id = m.id
         JOIN users     u ON p.doctor_id   = u.id
         WHERE p.patient_id = ?
           AND p.status     = 'completed'
         ORDER BY p.end_date DESC`,
        [patientId]
    );
    return rows;
};

module.exports = {
    getActivePrescriptionsByPatient,
    getPrescriptionsByDoctor,
    getPrescriptionById,
    getPrescriptionGroupsByPatient,
    getCompletedPrescriptionsByPatient,
};
