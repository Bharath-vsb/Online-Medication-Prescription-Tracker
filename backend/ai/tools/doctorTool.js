const db = require('../../config/database');

/**
 * Doctor Tool
 *
 * READ-ONLY and WRITE queries scoped strictly to the authenticated doctor.
 *
 * SECURITY rules applied throughout:
 *  - Every write mutates rows only where doctor_id = doctorId (injected from JWT).
 *  - Patient search is limited to patients who have received at least one
 *    prescription from this doctor (no cross-doctor data leakage).
 *  - No inventory sales, pharmacist records, or admin operations are exposed.
 */

// ---------------------------------------------------------------------------
// READ — Doctor profile / summary
// ---------------------------------------------------------------------------

/**
 * Get a doctor's public profile (no password field).
 * @param {number} doctorId
 */
const getDoctorProfile = async (doctorId) => {
    const [rows] = await db.query(
        `SELECT id, full_name, email, mobile, medical_license_number, status, created_at
         FROM users
         WHERE id   = ?
           AND role = 'doctor'`,
        [doctorId]
    );
    return rows[0] || null;
};

/**
 * Get all approved doctors in the system (used by admin context only).
 * @param {string|null} statusFilter
 */
const getAllDoctors = async (statusFilter = 'approved') => {
    const params = [];
    let whereClause = "WHERE role = 'doctor'";
    if (statusFilter) {
        whereClause += ' AND status = ?';
        params.push(statusFilter);
    }
    const [rows] = await db.query(
        `SELECT id, full_name, email, medical_license_number, status, created_at
         FROM users
         ${whereClause}
         ORDER BY full_name ASC`,
        params
    );
    return rows;
};

/**
 * Aggregate prescription counts written by this doctor.
 * @param {number} doctorId
 */
const getDoctorPrescriptionSummary = async (doctorId) => {
    const [[data]] = await db.query(
        `SELECT
            COUNT(*)                                                        AS total,
            SUM(CASE WHEN status = 'active'    THEN 1 ELSE 0 END)          AS active,
            SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END)          AS completed,
            SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END)          AS cancelled
         FROM prescriptions
         WHERE doctor_id = ?`,
        [doctorId]
    );
    return data;
};

/**
 * Distinct patients who received at least one prescription from this doctor.
 * @param {number} doctorId
 */
const getDoctorPatients = async (doctorId) => {
    const [rows] = await db.query(
        `SELECT DISTINCT
            u.id,
            u.full_name,
            u.email,
            u.mobile
         FROM prescriptions p
         JOIN users u ON p.patient_id = u.id
         WHERE p.doctor_id = ?
         ORDER BY u.full_name ASC`,
        [doctorId]
    );
    return rows;
};

/**
 * Overall adherence across all patients whose prescriptions this doctor wrote.
 * @param {number} doctorId
 */
const getDoctorPatientAdherenceOverview = async (doctorId) => {
    const [[data]] = await db.query(
        `SELECT
            COUNT(DISTINCT r.id)  AS total_reminders,
            COUNT(DISTINCT dc.id) AS taken_doses
         FROM prescriptions p
         LEFT JOIN reminders          r  ON r.prescription_id = p.id
         LEFT JOIN dose_confirmations dc ON dc.reminder_id    = r.id
                                        AND dc.status         = 'taken'
         WHERE p.doctor_id = ?`,
        [doctorId]
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

// ---------------------------------------------------------------------------
// READ — New helpers (Phase 3)
// ---------------------------------------------------------------------------

/**
 * Search patients of THIS doctor by partial name match.
 * Only returns patients who have been prescribed at least once by this doctor.
 *
 * @param {number} doctorId
 * @param {string} name - Partial name to search
 */
const searchDoctorPatientByName = async (doctorId, name) => {
    const [rows] = await db.query(
        `SELECT DISTINCT
            u.id,
            u.full_name,
            u.email,
            u.mobile
         FROM prescriptions p
         JOIN users u ON p.patient_id = u.id
         WHERE p.doctor_id  = ?
           AND u.full_name  LIKE CONCAT('%', ?, '%')
         ORDER BY u.full_name ASC`,
        [doctorId, name]
    );
    return rows;
};

/**
 * All prescriptions this doctor has written for a specific patient — full history.
 * Security: enforces both doctor_id AND patient_id so neither can be spoofed.
 *
 * @param {number} doctorId
 * @param {number} patientId
 */
const getPatientHistoryForDoctor = async (doctorId, patientId) => {
    const [rows] = await db.query(
        `SELECT
            p.id,
            p.prescription_group_id,
            m.name       AS medicine_name,
            u.full_name  AS patient_name,
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
         WHERE p.doctor_id  = ?
           AND p.patient_id = ?
         ORDER BY p.created_at DESC`,
        [doctorId, patientId]
    );
    return rows;
};

/**
 * Prescriptions created TODAY by this doctor.
 * @param {number} doctorId
 */
const getTodaysPrescriptionsForDoctor = async (doctorId) => {
    const [rows] = await db.query(
        `SELECT
            p.id,
            p.prescription_group_id,
            m.name       AS medicine_name,
            u.full_name  AS patient_name,
            p.start_date,
            p.end_date,
            p.duration,
            p.frequency,
            p.doses_per_day,
            p.total_quantity,
            p.status,
            p.created_at
         FROM prescriptions p
         JOIN medicines m ON p.medicine_id = m.id
         JOIN users     u ON p.patient_id  = u.id
         WHERE p.doctor_id  = ?
           AND DATE(p.created_at) = CURDATE()
         ORDER BY p.created_at DESC`,
        [doctorId]
    );
    return rows;
};

/**
 * Composite analytics for the doctor:
 * prescription summary + patient adherence overview merged into one object.
 * @param {number} doctorId
 */
const getDoctorAnalytics = async (doctorId) => {
    const summary   = await getDoctorPrescriptionSummary(doctorId);
    const adherence = await getDoctorPatientAdherenceOverview(doctorId);

    // Count distinct patients
    const [[{ patient_count }]] = await db.query(
        `SELECT COUNT(DISTINCT patient_id) AS patient_count
         FROM prescriptions
         WHERE doctor_id = ?`,
        [doctorId]
    );

    return {
        total_prescriptions: summary.total,
        active_prescriptions: summary.active,
        completed_prescriptions: summary.completed,
        cancelled_prescriptions: summary.cancelled,
        total_patients: patient_count,
        total_reminders: adherence.total_reminders,
        taken_doses: adherence.taken_doses,
        adherence_percent: adherence.adherence_percent,
    };
};

/**
 * Completed prescriptions written by this doctor.
 * @param {number} doctorId
 */
const getCompletedPrescriptionsByDoctor = async (doctorId) => {
    const [rows] = await db.query(
        `SELECT
            p.id,
            m.name       AS medicine_name,
            u.full_name  AS patient_name,
            p.start_date,
            p.end_date,
            p.duration,
            p.frequency,
            p.doses_per_day,
            p.total_quantity,
            p.status,
            p.created_at
         FROM prescriptions p
         JOIN medicines m ON p.medicine_id = m.id
         JOIN users     u ON p.patient_id  = u.id
         WHERE p.doctor_id = ?
           AND p.status    = 'completed'
         ORDER BY p.created_at DESC`,
        [doctorId]
    );
    return rows;
};

/**
 * Cancelled prescriptions written by this doctor.
 * @param {number} doctorId
 */
const getCancelledPrescriptionsByDoctor = async (doctorId) => {
    const [rows] = await db.query(
        `SELECT
            p.id,
            m.name       AS medicine_name,
            u.full_name  AS patient_name,
            p.start_date,
            p.end_date,
            p.duration,
            p.frequency,
            p.doses_per_day,
            p.total_quantity,
            p.status,
            p.created_at
         FROM prescriptions p
         JOIN medicines m ON p.medicine_id = m.id
         JOIN users     u ON p.patient_id  = u.id
         WHERE p.doctor_id = ?
           AND p.status    = 'cancelled'
         ORDER BY p.created_at DESC`,
        [doctorId]
    );
    return rows;
};

// ---------------------------------------------------------------------------
// WRITE — Prescription management (doctor-scoped, Phase 3)
// ---------------------------------------------------------------------------

/**
 * Create a new prescription.
 *
 * Security:
 *  - doctorId is always the authenticated user's ID (injected by dispatcher, never from LLM args).
 *  - Verifies that patientId belongs to an approved patient account before inserting.
 *  - Verifies that medicine exists in the medicines table.
 *  - Checks medicine is in stock and warns if unavailable.
 *
 * A prescription_group_id is auto-generated as MAX + 1 so prescriptions written
 * in the same logical "visit" can later be grouped.  The LLM may call this
 * function multiple times per visit; the caller may pass an explicit
 * prescriptionGroupId to group them — omit (null) to auto-assign a new group.
 *
 * @param {number}      doctorId
 * @param {number}      patientId
 * @param {number}      medicineId
 * @param {string}      startDate        – YYYY-MM-DD
 * @param {number}      duration         – days
 * @param {string}      frequency        – e.g. "Twice a day"
 * @param {number}      dosesPerDay
 * @param {number|null} prescriptionGroupId – null → auto-assign
 * @returns {Promise<{success: boolean, prescriptionId: number, stockWarning: string|null}>}
 */
const createPrescription = async (
    doctorId,
    patientId,
    medicineId,
    startDate,
    duration,
    frequency,
    dosesPerDay,
    prescriptionGroupId = null
) => {
    // 1. Verify patient exists and is approved
    const [[patient]] = await db.query(
        `SELECT id, full_name FROM users WHERE id = ? AND role = 'patient' AND status = 'approved' AND enabled = TRUE`,
        [patientId]
    );
    if (!patient) {
        throw new Error(`Patient ID ${patientId} not found or is not an active approved patient.`);
    }

    // 2. Verify medicine exists
    const [[medicine]] = await db.query(
        `SELECT id, name FROM medicines WHERE id = ?`,
        [medicineId]
    );
    if (!medicine) {
        throw new Error(`Medicine ID ${medicineId} not found.`);
    }

    // 3. Check stock availability (warn but do not block)
    const [[stockRow]] = await db.query(
        `SELECT COALESCE(SUM(stock_quantity), 0) AS available
         FROM inventory
         WHERE medicine_id = ?
           AND expiry_date >= CURDATE()
           AND stock_quantity > 0`,
        [medicineId]
    );
    const stockAvailable = stockRow.available > 0;
    const totalQuantity  = duration * dosesPerDay;
    let stockWarning     = null;

    if (!stockAvailable) {
        // Look for any alternative medicine in stock
        const [[alt]] = await db.query(
            `SELECT m.name, i.stock_quantity
             FROM inventory i
             JOIN medicines m ON i.medicine_id = m.id
             WHERE i.expiry_date >= CURDATE()
               AND i.stock_quantity > 0
               AND i.medicine_id  <> ?
             ORDER BY i.stock_quantity DESC
             LIMIT 1`,
            [medicineId]
        );
        stockWarning = alt
            ? `⚠️ ${medicine.name} is currently out of stock. A possible alternative with available stock is ${alt.name} (${alt.stock_quantity} units).`
            : `⚠️ ${medicine.name} is currently out of stock. No alternative was found in inventory at this time.`;
    }

    // 4. Calculate end_date
    const endDateResult = await db.query(
        `SELECT DATE_ADD(?, INTERVAL ? DAY) AS end_date`,
        [startDate, duration - 1]
    );
    const endDate = endDateResult[0][0].end_date;

    // 5. Resolve prescription_group_id
    let groupId = prescriptionGroupId;
    if (!groupId) {
        const [[maxGroup]] = await db.query(
            `SELECT COALESCE(MAX(prescription_group_id), 0) + 1 AS next_group FROM prescriptions`
        );
        groupId = maxGroup.next_group;
    }

    // 6. Insert the prescription
    const [result] = await db.query(
        `INSERT INTO prescriptions
            (prescription_group_id, doctor_id, patient_id, medicine_id,
             start_date, end_date, duration, frequency, doses_per_day,
             total_quantity, status, bought)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', FALSE)`,
        [groupId, doctorId, patientId, medicineId,
         startDate, endDate, duration, frequency, dosesPerDay, totalQuantity]
    );

    return {
        success:           true,
        prescriptionId:    result.insertId,
        prescriptionGroupId: groupId,
        patientName:       patient.full_name,
        medicineName:      medicine.name,
        startDate,
        endDate,
        duration,
        frequency,
        dosesPerDay,
        totalQuantity,
        stockWarning,
    };
};

/**
 * Update a prescription's mutable fields.
 *
 * Security: enforces doctor_id = doctorId so a doctor cannot edit another's prescription.
 * Only mutable fields are exposed: frequency, dosesPerDay, duration (recalculates end_date).
 *
 * @param {number}      doctorId
 * @param {number}      prescriptionId
 * @param {object}      fields          – { frequency?, dosesPerDay?, duration?, startDate? }
 * @returns {Promise<{success: boolean}>}
 */
const updatePrescription = async (doctorId, prescriptionId, fields = {}) => {
    // Fetch current prescription owned by this doctor
    const [[existing]] = await db.query(
        `SELECT id, start_date, duration, frequency, doses_per_day, status
         FROM prescriptions
         WHERE id = ? AND doctor_id = ?`,
        [prescriptionId, doctorId]
    );
    if (!existing) {
        throw new Error(`Prescription ID ${prescriptionId} not found or you do not have permission to edit it.`);
    }
    if (existing.status !== 'active') {
        throw new Error(`Only active prescriptions can be updated. Current status: ${existing.status}.`);
    }

    const frequency   = fields.frequency   ?? existing.frequency;
    const dosesPerDay = fields.dosesPerDay  ?? existing.doses_per_day;
    const duration    = fields.duration     ?? existing.duration;
    const startDate   = fields.startDate    ?? existing.start_date;

    const totalQuantity = duration * dosesPerDay;

    const endDateResult = await db.query(
        `SELECT DATE_ADD(?, INTERVAL ? DAY) AS end_date`,
        [startDate, duration - 1]
    );
    const endDate = endDateResult[0][0].end_date;

    const [{ affectedRows }] = await db.query(
        `UPDATE prescriptions
         SET frequency       = ?,
             doses_per_day   = ?,
             duration        = ?,
             start_date      = ?,
             end_date        = ?,
             total_quantity  = ?
         WHERE id = ? AND doctor_id = ? AND status = 'active'`,
        [frequency, dosesPerDay, duration, startDate, endDate, totalQuantity,
         prescriptionId, doctorId]
    );

    if (!affectedRows) {
        throw new Error('Prescription could not be updated. It may have already changed status.');
    }

    return { success: true, prescriptionId, updatedFields: { frequency, dosesPerDay, duration, startDate, endDate, totalQuantity } };
};

/**
 * Cancel a prescription.
 *
 * Security: enforces doctor_id = doctorId.
 * Only active prescriptions can be cancelled.
 *
 * @param {number} doctorId
 * @param {number} prescriptionId
 * @returns {Promise<{success: boolean}>}
 */
const cancelPrescription = async (doctorId, prescriptionId) => {
    const [[existing]] = await db.query(
        `SELECT id, status FROM prescriptions WHERE id = ? AND doctor_id = ?`,
        [prescriptionId, doctorId]
    );
    if (!existing) {
        throw new Error(`Prescription ID ${prescriptionId} not found or you do not have permission to cancel it.`);
    }
    if (existing.status !== 'active') {
        throw new Error(`Only active prescriptions can be cancelled. Current status: ${existing.status}.`);
    }

    const [{ affectedRows }] = await db.query(
        `UPDATE prescriptions
         SET status = 'cancelled'
         WHERE id = ? AND doctor_id = ? AND status = 'active'`,
        [prescriptionId, doctorId]
    );

    if (!affectedRows) {
        throw new Error('Prescription could not be cancelled. It may have already been changed.');
    }

    return { success: true, prescriptionId };
};

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
    // Read — unchanged
    getDoctorProfile,
    getAllDoctors,
    getDoctorPrescriptionSummary,
    getDoctorPatients,
    getDoctorPatientAdherenceOverview,
    // Read — new Phase 3
    searchDoctorPatientByName,
    getPatientHistoryForDoctor,
    getTodaysPrescriptionsForDoctor,
    getDoctorAnalytics,
    getCompletedPrescriptionsByDoctor,
    getCancelledPrescriptionsByDoctor,
    // Write — Phase 3
    createPrescription,
    updatePrescription,
    cancelPrescription,
};
