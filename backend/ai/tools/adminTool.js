// backend/ai/tools/adminTool.js – extended for admin write actions, audit logging, analytics, inventory, search, and count utilities
const db = require('../../config/database');

/** Helper: Record an admin action in audit_logs */
const logAdminAction = async (adminId, action, targetUserId = null, status = 'SUCCESS') => {
    const actionWithStatus = `${action} [${status}]`;
    await db.query(
        `INSERT INTO audit_logs (admin_id, action, target_user_id) VALUES (?, ?, ?);`,
        [adminId, actionWithStatus, targetUserId]
    );
};

/** ------------------- READ‑ONLY FUNCTIONS (unchanged) ------------------- */
const getUserSummary = async () => {
    const [[data]] = await db.query(`SELECT
        COUNT(*) AS total_users,
        SUM(CASE WHEN role='doctor' THEN 1 ELSE 0 END) AS total_doctors,
        SUM(CASE WHEN role='pharmacist' THEN 1 ELSE 0 END) AS total_pharmacists,
        SUM(CASE WHEN role='patient' THEN 1 ELSE 0 END) AS total_patients,
        SUM(CASE WHEN status='pending' THEN 1 ELSE 0 END) AS pending_approvals,
        SUM(CASE WHEN status='rejected' THEN 1 ELSE 0 END) AS rejected_users,
        SUM(CASE WHEN enabled=FALSE THEN 1 ELSE 0 END) AS disabled_users
        FROM users`);
    return data;
};

const getPendingApprovals = async () => {
    const [rows] = await db.query(`SELECT id, full_name, email, role, medical_license_number, created_at FROM users WHERE status='pending' ORDER BY created_at ASC`);
    return rows;
};

const getRecentAuditLogs = async (limit = 20) => {
    const [rows] = await db.query(`SELECT al.id, u.full_name AS admin_name, al.action, al.target_user_id, al.timestamp FROM audit_logs al JOIN users u ON al.admin_id = u.id ORDER BY al.timestamp DESC LIMIT ?`, [limit]);
    return rows;
};

const getDisabledUsers = async () => {
    const [rows] = await db.query(`SELECT id, full_name, email, role, status, created_at FROM users WHERE enabled=FALSE ORDER BY full_name ASC`);
    return rows;
};

const getSystemStats = async () => {
    const [[prescStats]] = await db.query(`SELECT COUNT(*) AS total_prescriptions,
        SUM(CASE WHEN status='active' THEN 1 ELSE 0 END) AS active_prescriptions,
        SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END) AS completed_prescriptions FROM prescriptions`);
    const [[invStats]] = await db.query(`SELECT COUNT(DISTINCT medicine_id) AS total_medicines,
        SUM(CASE WHEN stock_quantity <= 100 THEN 1 ELSE 0 END) AS low_stock_items,
        SUM(CASE WHEN expiry_date < CURDATE() THEN 1 ELSE 0 END) AS expired_items FROM inventory`);
    const [[salesStats]] = await db.query(`SELECT COUNT(*) AS monthly_sales FROM sold_medicines WHERE sold_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)`);
    return { ...prescStats, ...invStats, ...salesStats };
};

/** ------------------- WRITE OPERATIONS (admin actions) ------------------- */
const approveDoctor = async (adminId, doctorId) => {
    const [{ affectedRows }] = await db.query(`UPDATE users SET status='approved' WHERE id=? AND role='doctor' AND status='pending'`, [doctorId]);
    const status = affectedRows ? 'SUCCESS' : 'FAILED';
    await logAdminAction(adminId, 'approveDoctor', doctorId, status);
    if (!affectedRows) throw new Error('Doctor not found or already approved.');
    return { success: true };
};

const rejectDoctor = async (adminId, doctorId) => {
    const [{ affectedRows }] = await db.query(`UPDATE users SET status='rejected' WHERE id=? AND role='doctor' AND status='pending'`, [doctorId]);
    const status = affectedRows ? 'SUCCESS' : 'FAILED';
    await logAdminAction(adminId, 'rejectDoctor', doctorId, status);
    if (!affectedRows) throw new Error('Doctor not found or not pending.');
    return { success: true };
};

const approvePharmacist = async (adminId, pharmacistId) => {
    const [{ affectedRows }] = await db.query(`UPDATE users SET status='approved' WHERE id=? AND role='pharmacist' AND status='pending'`, [pharmacistId]);
    const status = affectedRows ? 'SUCCESS' : 'FAILED';
    await logAdminAction(adminId, 'approvePharmacist', pharmacistId, status);
    if (!affectedRows) throw new Error('Pharmacist not found or already approved.');
    return { success: true };
};

const rejectPharmacist = async (adminId, pharmacistId) => {
    const [{ affectedRows }] = await db.query(`UPDATE users SET status='rejected' WHERE id=? AND role='pharmacist' AND status='pending'`, [pharmacistId]);
    const status = affectedRows ? 'SUCCESS' : 'FAILED';
    await logAdminAction(adminId, 'rejectPharmacist', pharmacistId, status);
    if (!affectedRows) throw new Error('Pharmacist not found or not pending.');
    return { success: true };
};

const approveFirstPendingUser = async (adminId) => {
    const pending = await getPendingApprovals();
    if (!pending.length) {
        await logAdminAction(adminId, 'approveFirstPendingUser', null, 'FAILED');
        throw new Error('No pending approvals available.');
    }
    const user = pending[0];
    const [{ affectedRows }] = await db.query(`UPDATE users SET status='approved' WHERE id=?`, [user.id]);
    const status = affectedRows ? 'SUCCESS' : 'FAILED';
    await logAdminAction(adminId, 'approveFirstPendingUser', user.id, status);
    return { success: true, userId: user.id };
};

const rejectFirstPendingUser = async (adminId) => {
    const pending = await getPendingApprovals();
    if (!pending.length) {
        await logAdminAction(adminId, 'rejectFirstPendingUser', null, 'FAILED');
        throw new Error('No pending approvals available.');
    }
    const user = pending[0];
    const [{ affectedRows }] = await db.query(`UPDATE users SET status='rejected' WHERE id=?`, [user.id]);
    const status = affectedRows ? 'SUCCESS' : 'FAILED';
    await logAdminAction(adminId, 'rejectFirstPendingUser', user.id, status);
    return { success: true, userId: user.id };
};

/** ------------------- SEARCH & COUNT HELPERS ------------------- */
const searchUserByName = async (name) => {
    const [rows] = await db.query(`SELECT id, full_name, email, role, status FROM users WHERE full_name LIKE ?`, [`%${name}%`]);
    return rows;
};

const searchUserByEmail = async (email) => {
    const [rows] = await db.query(`SELECT id, full_name, email, role, status FROM users WHERE email LIKE ?`, [`%${email}%`]);
    return rows;
};

const countUsers = async () => {
    const [[{ total }]] = await db.query(`SELECT COUNT(*) AS total FROM users`);
    return { total };
};
const countDoctors = async () => {
    const [[{ total }]] = await db.query(`SELECT COUNT(*) AS total FROM users WHERE role='doctor'`);
    return { total };
};
const countPharmacists = async () => {
    const [[{ total }]] = await db.query(`SELECT COUNT(*) AS total FROM users WHERE role='pharmacist'`);
    return { total };
};
const countPatients = async () => {
    const [[{ total }]] = await db.query(`SELECT COUNT(*) AS total FROM users WHERE role='patient'`);
    return { total };
};

/** ------------------- ANALYTICS ------------------- */
const getTodaySummary = async () => {
    const [[summary]] = await db.query(`SELECT COUNT(*) AS users_today FROM users WHERE DATE(created_at) = CURDATE()`);
    return summary;
};

const getWeeklySummary = async () => {
    const [[summary]] = await db.query(`SELECT COUNT(*) AS users_this_week FROM users WHERE YEARWEEK(created_at, 1) = YEARWEEK(CURDATE(), 1)`);
    return summary;
};

const getMonthlySummary = async () => {
    const [[summary]] = await db.query(`SELECT COUNT(*) AS users_this_month FROM users WHERE YEAR(created_at)=YEAR(CURDATE()) AND MONTH(created_at)=MONTH(CURDATE())`);
    return summary;
};

const getSystemAnalytics = async () => {
    const users = await getUserSummary();
    const sys = await getSystemStats();
    return { ...users, ...sys };
};

const getMedicineAnalytics = async () => {
    const [[stats]] = await db.query(`SELECT COUNT(*) AS total_medicines, SUM(stock_quantity) AS total_stock FROM inventory`);
    return stats;
};

const getPrescriptionAnalytics = async () => {
    const [[stats]] = await db.query(`SELECT COUNT(*) AS total_prescriptions, SUM(CASE WHEN status='active' THEN 1 ELSE 0 END) AS active FROM prescriptions`);
    return stats;
};

/** ------------------- INVENTORY ------------------- */
const getInventorySummary = async () => {
    const [[summary]] = await db.query(`SELECT COUNT(*) AS total_items, SUM(stock_quantity) AS total_stock FROM inventory`);
    return summary;
};

const getLowStockItems = async () => {
    const [rows] = await db.query(`SELECT * FROM inventory WHERE stock_quantity <= 100`);
    return rows;
};

const getExpiredItems = async () => {
    const [rows] = await db.query(`SELECT * FROM inventory WHERE expiry_date < CURDATE()`);
    return rows;
};

const getExpiredMedicines = async () => {
    const [rows] = await db.query(`SELECT * FROM inventory WHERE expiry_date < CURDATE()`);
    return rows;
};

const getMedicinesExpiringThisMonth = async () => {
    const [rows] = await db.query(`SELECT * FROM inventory WHERE YEAR(expiry_date)=YEAR(CURDATE()) AND MONTH(expiry_date)=MONTH(CURDATE())`);
    return rows;
};

/** ------------------- EXPORTS ------------------- */
module.exports = {
    // read‑only
    getUserSummary,
    getPendingApprovals,
    getRecentAuditLogs,
    getDisabledUsers,
    getSystemStats,
    getUserNotifications: async (userId, limit = 10) => {
        const [rows] = await db.query(`SELECT id, message, type, is_read, created_at FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ?`, [userId, limit]);
        return rows;
    },
    // admin write actions
    approveDoctor,
    rejectDoctor,
    approvePharmacist,
    rejectPharmacist,
    approveFirstPendingUser,
    rejectFirstPendingUser,
    // search / count
    searchUserByName,
    searchUserByEmail,
    countUsers,
    countDoctors,
    countPharmacists,
    countPatients,
    // analytics
    getTodaySummary,
    getWeeklySummary,
    getMonthlySummary,
    getSystemAnalytics,
    getMedicineAnalytics,
    getPrescriptionAnalytics,
    // inventory
    getInventorySummary,
    getLowStockItems,
    getExpiredItems,
    getExpiredMedicines,
    getMedicinesExpiringThisMonth,
    // helper
    logAdminAction,
};
