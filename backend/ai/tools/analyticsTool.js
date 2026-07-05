const db = require('../../config/database');

/**
 * Analytics Tool
 *
 * Read-only aggregated queries for system-wide insights.
 * All computations are done in MySQL to minimise data transfer.
 *
 * SECURITY: SELECT queries only. No INSERT, UPDATE, or DELETE.
 */

/**
 * Get high-level system counts: users by role, total prescriptions, low-stock items.
 *
 * @returns {Promise<object>}
 */
const getSystemOverview = async () => {
    const [[userStats]] = await db.query(
        `SELECT
            COUNT(*)                                                       AS total_users,
            SUM(CASE WHEN role = 'doctor'      THEN 1 ELSE 0 END)         AS total_doctors,
            SUM(CASE WHEN role = 'pharmacist'  THEN 1 ELSE 0 END)         AS total_pharmacists,
            SUM(CASE WHEN role = 'patient'     THEN 1 ELSE 0 END)         AS total_patients,
            SUM(CASE WHEN status = 'pending'   THEN 1 ELSE 0 END)         AS pending_approvals
         FROM users`
    );
    const [[prescriptionStats]] = await db.query(
        `SELECT
            COUNT(*)                                                       AS total_prescriptions,
            SUM(CASE WHEN status = 'active'    THEN 1 ELSE 0 END)         AS active_prescriptions,
            SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END)         AS completed_prescriptions
         FROM prescriptions`
    );
    const [[inventoryStats]] = await db.query(
        `SELECT
            COUNT(*)                                                       AS total_inventory_items,
            SUM(CASE WHEN stock_quantity <= 100 THEN 1 ELSE 0 END)        AS low_stock_count,
            SUM(CASE WHEN expiry_date < CURDATE() THEN 1 ELSE 0 END)      AS expired_count
         FROM inventory`
    );

    return { ...userStats, ...prescriptionStats, ...inventoryStats };
};

/**
 * Get daily prescription creation counts for the last N days.
 *
 * @param {number} days
 * @returns {Promise<Array>}
 */
const getPrescriptionTrends = async (days = 7) => {
    const [rows] = await db.query(
        `SELECT
            DATE(created_at)  AS date,
            COUNT(*)          AS count
         FROM prescriptions
         WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
         GROUP BY DATE(created_at)
         ORDER BY date ASC`,
        [days]
    );
    return rows;
};

/**
 * Get overall medication adherence rate across all patients.
 *
 * @returns {Promise<object>}
 */
const getSystemAdherenceRate = async () => {
    const [[data]] = await db.query(
        `SELECT
            COUNT(DISTINCT r.id)  AS total_reminders,
            COUNT(DISTINCT dc.id) AS taken_doses
         FROM reminders r
         LEFT JOIN dose_confirmations dc
               ON dc.reminder_id = r.id
              AND dc.status      = 'taken'`
    );
    const adherence = data.total_reminders > 0
        ? ((data.taken_doses / data.total_reminders) * 100).toFixed(1)
        : '0.0';
    return {
        total_reminders:  data.total_reminders,
        taken_doses:      data.taken_doses,
        adherence_percent: parseFloat(adherence),
    };
};

/**
 * Get monthly dispensing totals for the past N months.
 *
 * @param {number} months
 * @returns {Promise<Array>}
 */
const getMonthlySalesTrends = async (months = 3) => {
    const [rows] = await db.query(
        `SELECT
            DATE_FORMAT(sold_at, '%Y-%m') AS month,
            COUNT(*)                      AS total_sales,
            SUM(quantity)                 AS total_units
         FROM sold_medicines
         WHERE sold_at >= DATE_SUB(NOW(), INTERVAL ? MONTH)
         GROUP BY DATE_FORMAT(sold_at, '%Y-%m')
         ORDER BY month ASC`,
        [months]
    );
    return rows;
};

/**
 * Get daily user registrations for the past N days broken down by role.
 *
 * @param {number} days
 * @returns {Promise<Array>}
 */
const getUserRegistrationTrends = async (days = 7) => {
    const [rows] = await db.query(
        `SELECT
            DATE(created_at) AS date,
            role,
            COUNT(*)         AS count
         FROM users
         WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
           AND role != 'admin'
         GROUP BY DATE(created_at), role
         ORDER BY date ASC, role ASC`,
        [days]
    );
    return rows;
};

module.exports = {
    getSystemOverview,
    getPrescriptionTrends,
    getSystemAdherenceRate,
    getMonthlySalesTrends,
    getUserRegistrationTrends,
};
